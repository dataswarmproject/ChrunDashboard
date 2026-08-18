# Agent collaboration guide — LTT Churn Dashboard

This repository is co-developed by AI coding agents (Codex, Claude Code) and Ahmed.
Read this before changing anything.

## Project invariants (do not break)

1. **Synthetic data honesty.** All data is generated (`backend/app/synthetic.py`). Every surface that shows data must keep the SYNTHETIC labeling: `datasetType`, the Arabic/English dataset notices, and the dashboard banner. Never present the data as real LTT data.
2. **Arabic-first RTL UI.** `index.html` sets `lang="ar" dir="rtl"`. UI copy is Arabic with English technical terms where useful. Use CSS logical properties (`inline-start`, not `left`). Machine data slots (IDs, currency, metrics) are marked `dir="ltr"` and render in the mono font.
3. **Decision-support rule.** Every prediction shown must lead to: an understandable reason (reason codes), business impact (revenue at risk), a priority (Retention Priority Score = probability × value × retainability), and a recommended action with an owner. Features that show a score without those do not ship.
4. **Model selection ignores Accuracy.** Champion selection weights ROC-AUC/Recall/Precision/F1 (`select_best_model`). Keep it that way; the class is imbalanced.
5. **Security posture.** Header-based roles are a documented demo mechanism; masking (`LTT-***421`), role-gated export/PATCH, audit events, and security headers must survive any refactor.

## Layout

- `backend/` — FastAPI + ML pipeline. Contracts: `app/schemas.py` (enums), `app/analytics_store.py` (response shapes — keep in sync with `frontend/src/types.ts`).
- `frontend/` — React 19 + TS + Vite + Recharts. Pages in `src/pages/`, shared UI in `src/components/`, all styling in `src/styles.css` (design tokens at the top).
- Deployment: `docker-compose.yml` (db + backend + frontend); the backend entrypoint generates deterministic artifacts when the model/data volumes are empty.
- Docs: `docs/MODEL_CARD.md`, `docs/DATA_DICTIONARY.md`, `docs/decisions/` (ADRs). Update them when model behavior or data contracts change.

## Commands

| Task | Command |
| --- | --- |
| Backend deps | `cd backend && pip install -e ".[dev]"` |
| Regenerate data + retrain | `python scripts/bootstrap_data.py [--fast]` |
| Backend tests / lint | `pytest` · `ruff check .` |
| Run API | `uvicorn app.main:app --reload --port 8000` |
| Frontend deps | `cd frontend && npm install` |
| Frontend dev / test / lint / build | `npm run dev` · `npm run test` · `npm run lint` · `npm run build` |
| Full stack | `docker compose up --build` (needs `.env`, see `.env.example`) |

## Conventions

- Python: ruff (line length 100), full type hints, docstrings state *why*. Tests colocated in `backend/tests/`.
- TypeScript: strict, no `any`; camelCase API JSON; types mirror backend serializers exactly.
- API errors: `{ "error": { "code", "message" } }` with stable UPPER_SNAKE codes.
- Commits: conventional (`feat:`, `fix:`, `docs:`…), one coherent change per commit.

## Handoff log

- **Phase 1–3 (Codex):** synthetic data contracts + scoring rules; ML pipeline (3-model comparison, prior-shift probability restoration, SHAP with deterministic fallback); secure decision-support API (RBAC, masking, audit, export).
- **Phase 4 (Claude Code, 2026-08-18):** frontend completion — app shell (`App.tsx`, `main.tsx`), Model Performance page, full RTL design system (`styles.css`); initial Docker stack; this guide.
- **Phase 5 (Codex + Claude Code, concurrent, 2026-08-18):** Codex revised the Docker stack (inline bootstrap CMD, nginx CSP, Postgres 17), rewrote README (Arabic), added `docs/` (model card, data dictionary, ADR-001), moved API docs to `/api/docs`, provisioned root `.venv` + frontend `node_modules`. Claude fixed `libgomp1` missing from the backend image (XGBoost import), relaxed CSP for the interactive docs routes only, deduplicated a concurrent `KpiCard` edit, and switched `vite.config.ts` to `vitest/config` (Codex landed the same fix first).
- **Open items:** see "قيود مهمة قبل الإنتاج" in README.md.
