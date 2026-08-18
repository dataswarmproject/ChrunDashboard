"""Generate the synthetic dataset, train models, and persist dashboard artifacts."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from app.ml_pipeline import save_training_result, train_and_score  # noqa: E402
from app.synthetic import generate_synthetic_customers  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--records", type=int, default=12_000)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--fast", action="store_true")
    args = parser.parse_args()

    print(f"Generating {args.records:,} clearly labeled synthetic telecom records...")
    customers = generate_synthetic_customers(records=args.records, seed=args.seed)
    print(f"Observed synthetic churn rate: {customers['churn'].mean():.1%}")
    result = train_and_score(customers, seed=args.seed, fast=args.fast)
    save_training_result(result, BACKEND_ROOT / "artifacts")
    best_metrics = result.metrics[result.selected_model]
    print(
        f"Selected {result.selected_model}: ROC-AUC={best_metrics['rocAuc']:.3f}, "
        f"Recall={best_metrics['recall']:.3f}, Precision={best_metrics['precision']:.3f}"
    )
    print("Artifacts saved under backend/artifacts and backend/data.")


if __name__ == "__main__":
    main()
