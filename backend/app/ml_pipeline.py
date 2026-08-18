"""Model training, comparison, explainability, and customer scoring pipeline."""

from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    f1_score,
    precision_recall_curve,
    precision_score,
    recall_score,
    roc_auc_score,
    roc_curve,
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from xgboost import XGBClassifier

from app.scoring import (
    calculate_priority_score,
    derive_reason_codes,
    recommend_retention_action,
    risk_category,
)

CATEGORICAL_FEATURES = ["region", "service_type", "customer_segment"]
NUMERIC_FEATURES = [
    "tenure_months",
    "monthly_revenue",
    "monthly_data_usage_gb",
    "usage_change_30d_pct",
    "usage_change_90d_pct",
    "average_speed_mbps",
    "service_outages_30d",
    "total_outage_minutes_30d",
    "support_tickets_30d",
    "support_tickets_90d",
    "complaints_90d",
    "average_resolution_time_hours",
    "payment_delay_days",
    "failed_payments_90d",
    "package_changes_90d",
    "days_since_last_recharge",
    "customer_satisfaction_score",
    "nps_score",
]
MODEL_FEATURES = CATEGORICAL_FEATURES + NUMERIC_FEATURES


@dataclass
class TrainingResult:
    model: Pipeline
    selected_model: str
    threshold: float
    metrics: dict[str, dict[str, Any]]
    feature_importance: list[dict[str, Any]]
    explainability_method: str
    scored_customers: pd.DataFrame
    trained_at: str


def select_best_model(metrics: dict[str, dict[str, float]]) -> str:
    """Select by churn-relevant metrics; accuracy is deliberately not used."""
    return max(
        metrics,
        key=lambda model_name: (
            metrics[model_name]["rocAuc"] * 0.40
            + metrics[model_name]["recall"] * 0.30
            + metrics[model_name]["precision"] * 0.20
            + metrics[model_name]["f1"] * 0.10
        ),
    )


def _preprocessor() -> ColumnTransformer:
    numeric = Pipeline([("imputer", SimpleImputer(strategy="median")), ("scale", StandardScaler())])
    categorical = Pipeline(
        [
            ("imputer", SimpleImputer(strategy="most_frequent")),
            ("onehot", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
        ]
    )
    return ColumnTransformer(
        [("numeric", numeric, NUMERIC_FEATURES), ("categorical", categorical, CATEGORICAL_FEATURES)]
    )


def _candidate_models(positive_weight: float, seed: int, fast: bool) -> dict[str, Any]:
    trees = 70 if fast else 220
    boosts = 80 if fast else 260
    return {
        "Logistic Regression": LogisticRegression(
            class_weight="balanced", max_iter=700, random_state=seed
        ),
        "Random Forest": RandomForestClassifier(
            n_estimators=trees,
            max_depth=11,
            min_samples_leaf=5,
            class_weight="balanced_subsample",
            n_jobs=-1,
            random_state=seed,
        ),
        "XGBoost": XGBClassifier(
            n_estimators=boosts,
            max_depth=4,
            learning_rate=0.055,
            subsample=0.86,
            colsample_bytree=0.88,
            scale_pos_weight=positive_weight,
            eval_metric="logloss",
            n_jobs=4,
            random_state=seed,
        ),
    }


def _best_threshold(y_true: pd.Series, probabilities: np.ndarray) -> float:
    candidates = np.linspace(0.25, 0.78, 54)
    best_score = -1.0
    selected = 0.5
    minimum_precision = max(0.30, float(y_true.mean()) * 1.65)
    for threshold in candidates:
        predicted = (probabilities >= threshold).astype(int)
        precision = precision_score(y_true, predicted, zero_division=0)
        recall = recall_score(y_true, predicted, zero_division=0)
        f1 = f1_score(y_true, predicted, zero_division=0)
        if precision < minimum_precision:
            continue
        score = recall * 0.55 + precision * 0.20 + f1 * 0.25
        if score > best_score:
            best_score = score
            selected = float(threshold)
    return round(selected, 2)


def _curve_points(
    x_values: np.ndarray, y_values: np.ndarray, limit: int = 70
) -> list[dict[str, float]]:
    if len(x_values) <= limit:
        indices = np.arange(len(x_values))
    else:
        indices = np.unique(np.linspace(0, len(x_values) - 1, limit).astype(int))
    return [
        {"x": round(float(x_values[index]), 5), "y": round(float(y_values[index]), 5)}
        for index in indices
    ]


def _evaluate(y_true: pd.Series, probabilities: np.ndarray, threshold: float) -> dict[str, Any]:
    predicted = (probabilities >= threshold).astype(int)
    true_negative, false_positive, false_negative, true_positive = confusion_matrix(
        y_true, predicted, labels=[0, 1]
    ).ravel()
    false_positive_rate, true_positive_rate, _ = roc_curve(y_true, probabilities)
    precision_curve, recall_curve, _ = precision_recall_curve(y_true, probabilities)
    return {
        "rocAuc": round(float(roc_auc_score(y_true, probabilities)), 4),
        "precision": round(float(precision_score(y_true, predicted, zero_division=0)), 4),
        "recall": round(float(recall_score(y_true, predicted, zero_division=0)), 4),
        "f1": round(float(f1_score(y_true, predicted, zero_division=0)), 4),
        "accuracy": round(float(accuracy_score(y_true, predicted)), 4),
        "threshold": threshold,
        "confusionMatrix": {
            "trueNegative": int(true_negative),
            "falsePositive": int(false_positive),
            "falseNegative": int(false_negative),
            "truePositive": int(true_positive),
        },
        "rocCurve": _curve_points(false_positive_rate, true_positive_rate),
        "precisionRecallCurve": _curve_points(recall_curve[::-1], precision_curve[::-1]),
    }


def _group_feature_values(feature_names: np.ndarray, values: np.ndarray) -> list[dict[str, Any]]:
    grouped: dict[str, float] = {}
    for feature_name, value in zip(feature_names, values, strict=True):
        cleaned = feature_name.split("__", 1)[-1]
        raw_name = next(
            (category for category in CATEGORICAL_FEATURES if cleaned.startswith(f"{category}_")),
            cleaned,
        )
        grouped[raw_name] = grouped.get(raw_name, 0.0) + float(abs(value))

    total = sum(grouped.values()) or 1
    labels_ar = {
        "usage_change_30d_pct": "تغير الاستخدام خلال 30 يومًا",
        "customer_satisfaction_score": "رضا العميل",
        "service_outages_30d": "انقطاعات الخدمة",
        "complaints_90d": "الشكاوى خلال 90 يومًا",
        "payment_delay_days": "تأخر الدفع",
        "support_tickets_90d": "تذاكر الدعم",
        "days_since_last_recharge": "الأيام منذ آخر تجديد",
        "nps_score": "صافي نقاط الترويج NPS",
        "average_resolution_time_hours": "زمن حل المشكلة",
        "tenure_months": "مدة الاشتراك",
        "region": "المنطقة",
        "service_type": "نوع الخدمة",
        "customer_segment": "شريحة العميل",
    }
    ordered = sorted(grouped.items(), key=lambda item: item[1], reverse=True)
    return [
        {
            "feature": name,
            "labelAr": labels_ar.get(name, name.replace("_", " ")),
            "importance": round(value / total, 5),
        }
        for name, value in ordered
    ]


def _feature_importance(model: Pipeline) -> list[dict[str, Any]]:
    feature_names = model.named_steps["preprocess"].get_feature_names_out()
    estimator = model.named_steps["model"]
    if hasattr(estimator, "feature_importances_"):
        values = np.asarray(estimator.feature_importances_, dtype=float)
    else:
        values = np.abs(np.asarray(estimator.coef_[0], dtype=float))
    return _group_feature_values(feature_names, values)


def _explain_model(model: Pipeline, sample: pd.DataFrame) -> tuple[list[dict[str, Any]], str]:
    """Compute global mean absolute SHAP values, with a deterministic fallback."""
    try:
        import shap

        transformed = model.named_steps["preprocess"].transform(sample[MODEL_FEATURES])
        feature_names = model.named_steps["preprocess"].get_feature_names_out()
        background = transformed[: min(100, len(transformed))]
        explained = transformed[: min(240, len(transformed))]
        estimator = model.named_steps["model"]
        if hasattr(estimator, "feature_importances_"):
            explainer = shap.TreeExplainer(estimator)
            raw_values = np.asarray(explainer.shap_values(explained))
            if raw_values.ndim == 3:
                raw_values = raw_values[:, :, -1]
        else:
            explainer = shap.LinearExplainer(estimator, background)
            raw_values = np.asarray(explainer.shap_values(explained))
        mean_values = np.abs(raw_values).mean(axis=0)
        return _group_feature_values(feature_names, mean_values), "SHAP"
    except Exception:
        return _feature_importance(model), "NATIVE_FEATURE_IMPORTANCE_FALLBACK"


def _retention_probability(customer: pd.Series) -> float:
    value = (
        0.76
        - max(0, float(customer["payment_delay_days"]) - 10) * 0.006
        - max(0, float(customer["complaints_90d"]) - 2) * 0.035
        + max(0, float(customer["customer_satisfaction_score"]) - 2.5) * 0.035
    )
    return round(float(np.clip(value, 0.28, 0.86)), 3)


def _score_customers(customers: pd.DataFrame, model: Pipeline) -> pd.DataFrame:
    scored = customers.copy()
    probability_30d = model.predict_proba(scored[MODEL_FEATURES])[:, 1]
    scored["churn_probability_30d"] = np.round(probability_30d, 5)
    scored["churn_probability_60d"] = np.round(1 - (1 - probability_30d) ** 1.55, 5)
    scored["churn_probability_90d"] = np.round(1 - (1 - probability_30d) ** 2.10, 5)
    scored["churn_risk_score"] = np.round(probability_30d * 100, 1)
    scored["risk_category"] = scored["churn_risk_score"].map(risk_category)
    scored["revenue_at_risk"] = np.round(scored["monthly_revenue"] * probability_30d, 2)
    scored["estimated_retention_probability"] = scored.apply(_retention_probability, axis=1)
    scored["retention_priority_score"] = scored.apply(
        lambda row: calculate_priority_score(
            row["churn_probability_30d"],
            row["monthly_revenue"],
            row["estimated_retention_probability"],
        ),
        axis=1,
    )

    reason_codes: list[str] = []
    actions: list[str] = []
    action_codes: list[str] = []
    action_owners: list[str] = []
    for _, customer in scored.iterrows():
        reasons = derive_reason_codes(customer)
        action = recommend_retention_action(customer, reasons)
        reason_codes.append(json.dumps(reasons, ensure_ascii=False))
        actions.append(action["labelAr"])
        action_codes.append(action["code"])
        action_owners.append(action["owner"])
    scored["reason_codes"] = reason_codes
    scored["recommended_action"] = actions
    scored["recommended_action_code"] = action_codes
    scored["action_owner"] = action_owners
    scored["campaign_status"] = "NOT_STARTED"
    scored["retention_result"] = "PENDING"
    return scored


def train_and_score(customers: pd.DataFrame, seed: int = 42, fast: bool = False) -> TrainingResult:
    """Train the candidate set, select the best model, and score all customers."""
    missing = set(MODEL_FEATURES + ["churn"]) - set(customers.columns)
    if missing:
        raise ValueError(f"Missing training features: {sorted(missing)}")

    features = customers[MODEL_FEATURES]
    target = customers["churn"].astype(int)
    train_x, test_x, train_y, test_y = train_test_split(
        features, target, test_size=0.24, stratify=target, random_state=seed
    )
    positives = max(int(train_y.sum()), 1)
    positive_weight = float((len(train_y) - positives) / positives)

    fitted_models: dict[str, Pipeline] = {}
    metrics: dict[str, dict[str, Any]] = {}
    for name, estimator in _candidate_models(positive_weight, seed, fast).items():
        pipeline = Pipeline([("preprocess", _preprocessor()), ("model", estimator)])
        pipeline.fit(train_x, train_y)
        probabilities = pipeline.predict_proba(test_x)[:, 1]
        threshold = _best_threshold(test_y, probabilities)
        fitted_models[name] = pipeline
        metrics[name] = _evaluate(test_y, probabilities, threshold)

    selected_model = select_best_model(metrics)
    best_model = fitted_models[selected_model]
    threshold = float(metrics[selected_model]["threshold"])
    scored = _score_customers(customers, best_model)
    trained_at = datetime.now(UTC).replace(microsecond=0).isoformat()
    feature_importance, explainability_method = _explain_model(best_model, test_x)
    return TrainingResult(
        model=best_model,
        selected_model=selected_model,
        threshold=threshold,
        metrics=metrics,
        feature_importance=feature_importance,
        explainability_method=explainability_method,
        scored_customers=scored,
        trained_at=trained_at,
    )


def save_training_result(result: TrainingResult, output_dir: Path) -> None:
    """Persist reproducible model artifacts and dashboard-ready scored records."""
    output_dir.mkdir(parents=True, exist_ok=True)
    data_dir = output_dir.parent / "data"
    data_dir.mkdir(parents=True, exist_ok=True)
    joblib.dump(result.model, output_dir / "churn_model.joblib")
    result.scored_customers.to_csv(data_dir / "customer_predictions.csv", index=False)
    metadata = {
        "modelVersion": "churn-model-1.0.0",
        "selectedModel": result.selected_model,
        "threshold": result.threshold,
        "trainedAt": result.trained_at,
        "datasetType": "SYNTHETIC",
        "recordCount": len(result.scored_customers),
        "metrics": result.metrics,
        "featureImportance": result.feature_importance,
        "explainabilityMethod": result.explainability_method,
    }
    (output_dir / "model_metadata.json").write_text(
        json.dumps(metadata, ensure_ascii=False, indent=2), encoding="utf-8"
    )
