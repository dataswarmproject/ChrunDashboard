# ADR-001: Separate analytical scoring, operational state, API, and dashboard

## Status

Accepted

## Date

2026-08-18

## Context

The product must compare churn models, score at least 10,000 customers, explain predictions, support fast dashboard aggregation, and persist retention workflow changes. It must also run locally without presenting demonstration data as real LTT data.

## Decision

- Use a Python batch pipeline to create immutable prediction artifacts from a clearly labelled synthetic dataset.
- Load prediction artifacts into an in-memory analytical read model for fast dashboard queries.
- Use PostgreSQL for mutable retention workflow state and audit events.
- Expose a versioned REST API through FastAPI.
- Use React/Vite/Recharts for the Arabic-first RTL interface.
- Serve the production frontend through Nginx and proxy `/api` on the same origin.

## Alternatives considered

### Query every analytical card directly from PostgreSQL

Rejected for the demonstration because the dataset is a bounded scoring snapshot and dataframe aggregation is simpler and faster. Production should move prediction snapshots into governed warehouse/PostgreSQL tables when real ingestion exists.

### Embed synthetic data in the frontend

Rejected because it would disconnect the UI from the trained model and weaken API, security, and operational testing.

### Full identity provider integration

Deferred because no LTT identity platform was supplied. Header-selected roles are explicitly a demonstration control, not production authentication.

## Consequences

- The dashboard starts only after a model artifact is available; first Docker start includes training time.
- Retention updates persist independently from regenerated prediction artifacts.
- A production rollout requires an enterprise identity provider, governed source tables, scheduled scoring, and monitoring.
