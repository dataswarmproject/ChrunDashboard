from app.synthetic import REQUIRED_FIELDS, generate_synthetic_customers


def test_generator_creates_complete_reproducible_dataset():
    first = generate_synthetic_customers(records=10_000, seed=42)
    second = generate_synthetic_customers(records=10_000, seed=42)

    assert len(first) == 10_000
    assert set(REQUIRED_FIELDS).issubset(first.columns)
    assert first.iloc[0].to_dict() == second.iloc[0].to_dict()
    assert first["customer_id"].is_unique
    assert first["churn"].mean() > 0.08
    assert first["churn"].mean() < 0.45


def test_generator_contains_plausible_early_warning_signal():
    data = generate_synthetic_customers(records=10_000, seed=7)
    heavy_outages = data.loc[data["service_outages_30d"] >= 4, "churn"].mean()
    stable_service = data.loc[data["service_outages_30d"] == 0, "churn"].mean()

    assert heavy_outages > stable_service
