"""In-memory analytical read model backed by generated prediction artifacts."""

from __future__ import annotations

import json
import math
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

from app.database import retention_overrides
from app.ml_pipeline import save_training_result, train_and_score
from app.synthetic import generate_synthetic_customers

DATASET_NOTICE_AR = "بيانات اصطناعية تجريبية — لا تمثل بيانات أو أداء عملاء LTT الحقيقيين"
DATASET_NOTICE_EN = "Synthetic demonstration data — not actual LTT customer or performance data"


@dataclass
class CustomerFilters:
    region: str | None = None
    service_type: str | None = None
    segment: str | None = None
    risk_level: str | None = None
    revenue_band: str | None = None
    tenure_min: int | None = None
    tenure_max: int | None = None
    query: str | None = None


class AnalyticsStore:
    def __init__(self, predictions_path: Path, metadata_path: Path, records: int = 12_000):
        self.predictions_path = predictions_path
        self.metadata_path = metadata_path
        self.records = records
        self.data = pd.DataFrame()
        self.metadata: dict[str, Any] = {}

    def load(self) -> None:
        if not self.predictions_path.exists() or not self.metadata_path.exists():
            customers = generate_synthetic_customers(records=self.records, seed=42)
            result = train_and_score(customers, seed=42)
            save_training_result(result, self.metadata_path.parent)
        self.data = pd.read_csv(self.predictions_path)
        self.metadata = json.loads(self.metadata_path.read_text(encoding="utf-8"))

    def apply_overrides(self) -> None:
        for customer_id, (status, result) in retention_overrides().items():
            matches = self.data["customer_id"] == customer_id
            self.data.loc[matches, "campaign_status"] = status
            self.data.loc[matches, "retention_result"] = result

    def filtered(self, filters: CustomerFilters) -> pd.DataFrame:
        frame = self.data
        if filters.region:
            frame = frame[frame["region"] == filters.region]
        if filters.service_type:
            frame = frame[frame["service_type"] == filters.service_type]
        if filters.segment:
            frame = frame[frame["customer_segment"] == filters.segment]
        if filters.risk_level:
            frame = frame[frame["risk_category"] == filters.risk_level]
        if filters.revenue_band:
            bands = {
                "LOW": (0, 60),
                "MEDIUM": (60, 150),
                "HIGH": (150, float("inf")),
            }
            lower, upper = bands[filters.revenue_band]
            frame = frame[(frame["monthly_revenue"] >= lower) & (frame["monthly_revenue"] < upper)]
        if filters.tenure_min is not None:
            frame = frame[frame["tenure_months"] >= filters.tenure_min]
        if filters.tenure_max is not None:
            frame = frame[frame["tenure_months"] <= filters.tenure_max]
        if filters.query:
            query = filters.query.strip().upper()
            frame = frame[frame["customer_id"].str.contains(query, regex=False)]
        return frame

    @staticmethod
    def mask_customer_id(customer_id: str) -> str:
        return f"LTT-***{customer_id[-3:]}"

    @staticmethod
    def _reasons(raw: str) -> list[dict[str, Any]]:
        return json.loads(raw) if raw else []

    def serialize_customer(self, row: pd.Series, can_view_id: bool) -> dict[str, Any]:
        return {
            "customerId": row["customer_id"]
            if can_view_id
            else self.mask_customer_id(row["customer_id"]),
            "region": row["region"],
            "serviceType": row["service_type"],
            "customerSegment": row["customer_segment"],
            "currentPackage": row["current_package"],
            "tenureMonths": int(row["tenure_months"]),
            "monthlyRevenue": round(float(row["monthly_revenue"]), 2),
            "monthlyDataUsageGb": round(float(row["monthly_data_usage_gb"]), 1),
            "usageChange30dPct": round(float(row["usage_change_30d_pct"]), 1),
            "usageChange90dPct": round(float(row["usage_change_90d_pct"]), 1),
            "averageSpeedMbps": round(float(row["average_speed_mbps"]), 1),
            "serviceOutages30d": int(row["service_outages_30d"]),
            "totalOutageMinutes30d": int(row["total_outage_minutes_30d"]),
            "supportTickets30d": int(row["support_tickets_30d"]),
            "supportTickets90d": int(row["support_tickets_90d"]),
            "complaints90d": int(row["complaints_90d"]),
            "averageResolutionTimeHours": round(float(row["average_resolution_time_hours"]), 1),
            "paymentDelayDays": int(row["payment_delay_days"]),
            "failedPayments90d": int(row["failed_payments_90d"]),
            "daysSinceLastRecharge": int(row["days_since_last_recharge"]),
            "customerSatisfactionScore": round(float(row["customer_satisfaction_score"]), 1),
            "npsScore": int(row["nps_score"]),
            "churnProbability30d": round(float(row["churn_probability_30d"]), 4),
            "churnProbability60d": round(float(row["churn_probability_60d"]), 4),
            "churnProbability90d": round(float(row["churn_probability_90d"]), 4),
            "riskScore": round(float(row["churn_risk_score"]), 1),
            "riskCategory": row["risk_category"],
            "revenueAtRisk": round(float(row["revenue_at_risk"]), 2),
            "retentionProbability": round(float(row["estimated_retention_probability"]), 3),
            "retentionPriorityScore": round(float(row["retention_priority_score"]), 2),
            "reasons": self._reasons(row["reason_codes"]),
            "recommendedAction": row["recommended_action"],
            "recommendedActionCode": row["recommended_action_code"],
            "actionOwner": row["action_owner"],
            "campaignStatus": row["campaign_status"],
            "retentionResult": row["retention_result"],
        }

    def overview(self, filters: CustomerFilters) -> dict[str, Any]:
        frame = self.filtered(filters)
        high = frame[frame["risk_category"].isin(["HIGH", "CRITICAL"])]
        saved = frame[frame["retention_result"] == "SAVED"]
        return {
            "datasetType": "SYNTHETIC",
            "datasetNoticeAr": DATASET_NOTICE_AR,
            "datasetNoticeEn": DATASET_NOTICE_EN,
            "totalActiveCustomers": int(len(frame)),
            "predictedChurnRate": round(float(frame["churn_probability_30d"].mean()), 4)
            if len(frame)
            else 0,
            "highRiskCustomers": int((frame["risk_category"] == "HIGH").sum()),
            "criticalRiskCustomers": int((frame["risk_category"] == "CRITICAL").sum()),
            "monthlyRevenueAtRisk": round(float(high["revenue_at_risk"].sum()), 2),
            "customersSaved": int(len(saved)),
            "estimatedRevenueProtected": round(float(saved["monthly_revenue"].sum()), 2),
            "population": int(len(frame)),
            "lastScoredAt": self.metadata["trainedAt"],
        }

    @staticmethod
    def _breakdown(frame: pd.DataFrame, column: str) -> list[dict[str, Any]]:
        grouped = frame.groupby(column, observed=True).agg(
            customers=("customer_id", "count"),
            churn_probability=("churn_probability_30d", "mean"),
            revenue_at_risk=("revenue_at_risk", "sum"),
        )
        return [
            {
                "name": str(name),
                "customers": int(row["customers"]),
                "churnProbability": round(float(row["churn_probability"]), 4),
                "revenueAtRisk": round(float(row["revenue_at_risk"]), 2),
            }
            for name, row in grouped.sort_values("churn_probability", ascending=False).iterrows()
        ]

    def risk_analysis(self, filters: CustomerFilters) -> dict[str, Any]:
        frame = self.filtered(filters)
        counts, edges = np.histogram(frame["churn_risk_score"], bins=np.arange(0, 110, 10))
        distribution = [
            {"range": f"{int(edges[index])}–{int(edges[index + 1] - 1)}", "customers": int(value)}
            for index, value in enumerate(counts)
        ]
        trend = []
        base = float(frame["churn_probability_30d"].mean()) if len(frame) else 0
        for month in range(12):
            seasonal = math.sin((month + 1) / 12 * math.pi * 2) * 0.008
            trend.append(
                {
                    "month": f"2025-{month + 9:02d}" if month < 4 else f"2026-{month - 3:02d}",
                    "churnProbability": round(max(0, base - 0.014 + month * 0.002 + seasonal), 4),
                }
            )
        heatmap = (
            frame.groupby(["region", "service_type"], observed=True)["churn_probability_30d"]
            .mean()
            .reset_index()
        )
        return {
            "distribution": distribution,
            "byRegion": self._breakdown(frame, "region"),
            "byService": self._breakdown(frame, "service_type"),
            "bySegment": self._breakdown(frame, "customer_segment"),
            "trend": trend,
            "trendIsSimulated": True,
            "heatmap": [
                {
                    "region": row["region"],
                    "serviceType": row["service_type"],
                    "churnProbability": round(float(row["churn_probability_30d"]), 4),
                }
                for _, row in heatmap.iterrows()
            ],
        }

    def drivers(self, filters: CustomerFilters) -> dict[str, Any]:
        frame = self.filtered(filters).copy()
        analyses: dict[str, list[dict[str, Any]]] = {}
        definitions = {
            "outageImpact": ("service_outages_30d", [-1, 0, 1, 3, 20], ["0", "1", "2–3", "4+"]),
            "supportImpact": ("support_tickets_90d", [-1, 0, 2, 4, 30], ["0", "1–2", "3–4", "5+"]),
            "usageDeclineImpact": (
                "usage_change_30d_pct",
                [-100, -40, -20, 0, 100],
                ["≤ -40%", "-39% إلى -20%", "-19% إلى 0%", "> 0%"],
            ),
            "paymentImpact": (
                "payment_delay_days",
                [-1, 0, 7, 14, 100],
                ["0", "1–7", "8–14", "15+"],
            ),
            "satisfactionImpact": (
                "customer_satisfaction_score",
                [0, 2, 3, 4, 5.1],
                ["1–2", "2.1–3", "3.1–4", "4.1–5"],
            ),
        }
        for key, (column, bins, labels) in definitions.items():
            frame["_bucket"] = pd.cut(frame[column], bins=bins, labels=labels, include_lowest=True)
            grouped = frame.groupby("_bucket", observed=False)["churn_probability_30d"].mean()
            analyses[key] = [
                {"bucket": str(bucket), "churnProbability": round(float(value), 4)}
                for bucket, value in grouped.items()
                if not np.isnan(value)
            ]
        return {
            "featureImportance": self.metadata["featureImportance"],
            "explainabilityMethod": self.metadata.get("explainabilityMethod", "SHAP"),
            **analyses,
        }

    def geography(self, filters: CustomerFilters) -> list[dict[str, Any]]:
        coordinates = {
            "Tripoli": (32.8872, 13.1913),
            "Benghazi": (32.1194, 20.0868),
            "Misrata": (32.3754, 15.0925),
            "Zawiya": (32.7522, 12.7278),
            "Sabha": (27.0377, 14.4283),
            "Other": (29.1, 17.3),
        }
        frame = self.filtered(filters)
        result = []
        for region, group in frame.groupby("region", observed=True):
            high_risk = group["risk_category"].isin(["HIGH", "CRITICAL"])
            latitude, longitude = coordinates[str(region)]
            result.append(
                {
                    "region": str(region),
                    "latitude": latitude,
                    "longitude": longitude,
                    "customers": int(len(group)),
                    "churnProbability": round(float(group["churn_probability_30d"].mean()), 4),
                    "highRiskCustomers": int(high_risk.sum()),
                    "averageOutages": round(float(group["service_outages_30d"].mean()), 2),
                    "averageSpeedMbps": round(float(group["average_speed_mbps"].mean()), 1),
                    "revenueAtRisk": round(float(group["revenue_at_risk"].sum()), 2),
                }
            )
        return sorted(result, key=lambda item: item["churnProbability"], reverse=True)

    def model_performance(self) -> dict[str, Any]:
        return {
            "modelVersion": self.metadata["modelVersion"],
            "selectedModel": self.metadata["selectedModel"],
            "trainedAt": self.metadata["trainedAt"],
            "threshold": self.metadata["threshold"],
            "datasetType": self.metadata["datasetType"],
            "recordCount": self.metadata["recordCount"],
            "metrics": self.metadata["metrics"],
            "featureImportance": self.metadata["featureImportance"],
            "explainabilityMethod": self.metadata.get("explainabilityMethod", "SHAP"),
        }

    def options(self) -> dict[str, list[str]]:
        return {
            "regions": sorted(self.data["region"].unique().tolist()),
            "serviceTypes": sorted(self.data["service_type"].unique().tolist()),
            "segments": sorted(self.data["customer_segment"].unique().tolist()),
            "riskLevels": ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
            "revenueBands": ["LOW", "MEDIUM", "HIGH"],
        }
