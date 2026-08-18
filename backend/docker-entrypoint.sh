#!/bin/sh
set -e

# First boot on an empty volume: generate the clearly labeled synthetic
# dataset, train the model comparison, and persist scoring artifacts.
if [ ! -f /app/artifacts/model_metadata.json ] || [ ! -f /app/data/customer_predictions.csv ]; then
    echo "No model artifacts found - bootstrapping synthetic data and training models..."
    python scripts/bootstrap_data.py --records "${SYNTHETIC_RECORDS:-12000}"
fi

# Default to a single worker: the analytical read model lives in process
# memory, so extra workers would serve stale retention state until restart.
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers "${UVICORN_WORKERS:-1}"
