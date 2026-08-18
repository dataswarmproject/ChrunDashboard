import numpy as np

from app.ml_pipeline import select_best_model, train_and_score
from app.synthetic import generate_synthetic_customers


def test_model_selection_balances_auc_recall_and_precision():
    candidates = {
        "accuracy_only": {
            "rocAuc": 0.72,
            "recall": 0.22,
            "precision": 0.90,
            "f1": 0.35,
        },
        "balanced": {"rocAuc": 0.84, "recall": 0.75, "precision": 0.66, "f1": 0.70},
    }

    assert select_best_model(candidates) == "balanced"


def test_training_compares_required_models_and_scores_each_customer():
    customers = generate_synthetic_customers(records=1_200, seed=11)
    result = train_and_score(customers, seed=11, fast=True)

    assert set(result.metrics) == {"Logistic Regression", "Random Forest", "XGBoost"}
    assert result.selected_model in result.metrics
    assert len(result.scored_customers) == 1_200
    assert result.scored_customers["churn_probability_30d"].between(0, 1).all()
    assert result.scored_customers["churn_risk_score"].between(0, 100).all()
    assert set(result.scored_customers["risk_category"]).issubset(
        {"LOW", "MEDIUM", "HIGH", "CRITICAL"}
    )
    assert np.isfinite(result.scored_customers["retention_priority_score"]).all()
    assert len(result.feature_importance) >= 10
