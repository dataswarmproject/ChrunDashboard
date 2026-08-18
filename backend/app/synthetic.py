"""Deterministic synthetic telecom dataset generator.

The generated records emulate plausible operational relationships but do not
represent LTT customers, operations, or performance.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

REQUIRED_FIELDS = [
    "customer_id",
    "region",
    "service_type",
    "customer_segment",
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
    "churn",
]


def _sigmoid(value: np.ndarray) -> np.ndarray:
    return 1 / (1 + np.exp(-np.clip(value, -25, 25)))


def generate_synthetic_customers(records: int = 12_000, seed: int = 42) -> pd.DataFrame:
    """Create a reproducible LTT-like synthetic customer-level dataset."""
    if records < 100:
        raise ValueError("records must be at least 100")

    rng = np.random.default_rng(seed)
    regions = rng.choice(
        ["Tripoli", "Benghazi", "Misrata", "Zawiya", "Sabha", "Other"],
        records,
        p=[0.38, 0.22, 0.13, 0.09, 0.07, 0.11],
    )
    services = rng.choice(
        ["4G", "ADSL", "Fiber", "Business Internet", "Other"],
        records,
        p=[0.43, 0.27, 0.15, 0.10, 0.05],
    )
    segments = rng.choice(["Residential", "SME", "Enterprise"], records, p=[0.78, 0.17, 0.05])

    service_speed = {"4G": 28, "ADSL": 12, "Fiber": 110, "Business Internet": 72, "Other": 18}
    service_usage = {"4G": 80, "ADSL": 105, "Fiber": 255, "Business Internet": 420, "Other": 55}
    service_price = {"4G": 52, "ADSL": 45, "Fiber": 125, "Business Internet": 310, "Other": 38}
    region_quality = {
        "Tripoli": 0.1,
        "Benghazi": 0.2,
        "Misrata": 0.0,
        "Zawiya": 0.35,
        "Sabha": 0.65,
        "Other": 0.45,
    }

    tenure = np.clip(rng.gamma(2.4, 16, records).round(), 1, 144).astype(int)
    enterprise_multiplier = np.where(
        segments == "Enterprise", 2.8, np.where(segments == "SME", 1.45, 1.0)
    )
    base_revenue = np.array([service_price[item] for item in services]) * enterprise_multiplier
    revenue = np.clip(base_revenue * rng.lognormal(0, 0.18, records), 15, 2_500).round(2)

    quality_factor = np.array([region_quality[item] for item in regions])
    outage_rate = 0.55 + quality_factor + np.where(services == "ADSL", 0.45, 0)
    outages = np.clip(rng.poisson(outage_rate), 0, 11).astype(int)
    outage_minutes = (
        np.where(outages == 0, 0, np.clip(rng.gamma(1.8, 38, records) * outages, 10, 1_800))
        .round()
        .astype(int)
    )

    tickets_30 = np.clip(rng.poisson(0.35 + outages * 0.30), 0, 9).astype(int)
    tickets_90 = np.clip(tickets_30 + rng.poisson(0.65 + outages * 0.20), 0, 16).astype(int)
    complaints = np.clip(
        rng.binomial(tickets_90, np.clip(0.16 + quality_factor * 0.1, 0, 0.5)), 0, 10
    ).astype(int)
    resolution_hours = np.clip(
        rng.gamma(1.7, 5.5, records) + tickets_90 * 0.7 + quality_factor * 4, 0.4, 96
    ).round(1)

    usage_change_90 = np.clip(rng.normal(-2 - outages * 2.2, 16, records), -88, 75).round(1)
    usage_change_30 = np.clip(
        usage_change_90 * 0.65 + rng.normal(-outages * 1.3, 12, records), -92, 90
    ).round(1)
    usage = np.clip(
        np.array([service_usage[item] for item in services])
        * enterprise_multiplier
        * rng.lognormal(0, 0.33, records)
        * (1 + usage_change_30 / 200),
        1,
        4_500,
    ).round(1)
    speed = np.clip(
        np.array([service_speed[item] for item in services])
        * rng.normal(1 - quality_factor * 0.15, 0.16, records),
        1,
        400,
    ).round(1)

    payment_delay = np.clip(
        rng.negative_binomial(2, 0.48, records)
        + rng.binomial(1, 0.11, records) * rng.integers(7, 28, records),
        0,
        60,
    ).astype(int)
    failed_payments = np.clip(rng.poisson(0.12 + payment_delay / 35), 0, 6).astype(int)
    package_changes = np.clip(rng.poisson(0.2 + (usage_change_30 < -25) * 0.35), 0, 5).astype(int)
    recharge_days = np.clip(payment_delay + rng.integers(0, 9, records), 0, 75).astype(int)

    satisfaction = np.clip(
        4.45
        - outages * 0.27
        - complaints * 0.34
        - resolution_hours * 0.012
        + rng.normal(0, 0.42, records),
        1,
        5,
    ).round(1)
    nps = (
        np.clip(((satisfaction - 3) * 37 + rng.normal(0, 19, records)), -100, 100)
        .round()
        .astype(int)
    )

    linear_risk = (
        -2.5
        + np.maximum(-usage_change_30 - 12, 0) * 0.022
        + outages * 0.22
        + complaints * 0.31
        + tickets_90 * 0.055
        + payment_delay * 0.027
        + failed_payments * 0.18
        + np.maximum(3.2 - satisfaction, 0) * 0.52
        - np.minimum(tenure, 60) * 0.006
        + quality_factor * 0.25
    )
    latent_probability = _sigmoid(linear_risk)
    churn = rng.binomial(1, latent_probability).astype(int)

    packages = np.select(
        [
            services == "Fiber",
            services == "Business Internet",
            services == "4G",
            services == "ADSL",
        ],
        ["Fiber Plus", "Business Pro", "4G Max", "ADSL Unlimited"],
        default="Flexible Internet",
    )

    return pd.DataFrame(
        {
            "customer_id": [f"LTT-{index:06d}" for index in range(1, records + 1)],
            "region": regions,
            "service_type": services,
            "customer_segment": segments,
            "current_package": packages,
            "tenure_months": tenure,
            "monthly_revenue": revenue,
            "monthly_data_usage_gb": usage,
            "usage_change_30d_pct": usage_change_30,
            "usage_change_90d_pct": usage_change_90,
            "average_speed_mbps": speed,
            "service_outages_30d": outages,
            "total_outage_minutes_30d": outage_minutes,
            "support_tickets_30d": tickets_30,
            "support_tickets_90d": tickets_90,
            "complaints_90d": complaints,
            "average_resolution_time_hours": resolution_hours,
            "payment_delay_days": payment_delay,
            "failed_payments_90d": failed_payments,
            "package_changes_90d": package_changes,
            "days_since_last_recharge": recharge_days,
            "customer_satisfaction_score": satisfaction,
            "nps_score": nps,
            "churn": churn,
        }
    )
