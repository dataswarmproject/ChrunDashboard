from app.scoring import (
    calculate_priority_score,
    derive_reason_codes,
    recommend_retention_action,
    risk_category,
)


def test_risk_category_boundaries_are_business_defined():
    assert risk_category(0) == "LOW"
    assert risk_category(29) == "LOW"
    assert risk_category(30) == "MEDIUM"
    assert risk_category(59) == "MEDIUM"
    assert risk_category(60) == "HIGH"
    assert risk_category(79) == "HIGH"
    assert risk_category(80) == "CRITICAL"
    assert risk_category(100) == "CRITICAL"


def test_priority_score_combines_probability_value_and_retainability():
    score = calculate_priority_score(
        churn_probability=0.8,
        monthly_revenue=250,
        estimated_retention_probability=0.65,
    )
    assert score == 130.0


def test_reason_codes_and_action_are_actionable():
    customer = {
        "usage_change_30d_pct": -58,
        "service_outages_30d": 4,
        "complaints_90d": 5,
        "payment_delay_days": 12,
        "customer_satisfaction_score": 1.8,
        "support_tickets_90d": 6,
        "monthly_revenue": 145,
    }

    reasons = derive_reason_codes(customer)
    action = recommend_retention_action(customer, reasons)

    assert len(reasons) == 3
    assert reasons[0]["code"] == "USAGE_DROP"
    assert action["code"] == "TECHNICAL_RECOVERY"
    assert "تصعيد" in action["labelAr"]
