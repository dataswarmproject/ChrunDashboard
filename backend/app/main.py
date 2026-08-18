"""FastAPI entrypoint for the churn decision-support service."""

from __future__ import annotations

import io
import math
import uuid
from collections.abc import AsyncIterator, Callable
from contextlib import asynccontextmanager
from typing import Annotated, Any

from fastapi import Depends, FastAPI, Header, HTTPException, Query, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse, Response

from app.analytics_store import AnalyticsStore, CustomerFilters
from app.config import get_settings
from app.database import initialize_database, upsert_retention_state
from app.schemas import RetentionUpdate, RiskLevel, Role


@asynccontextmanager
async def lifespan(application: FastAPI) -> AsyncIterator[None]:
    settings = get_settings()
    initialize_database()
    store = AnalyticsStore(
        settings.predictions_path, settings.metadata_path, settings.synthetic_records
    )
    store.load()
    store.apply_overrides()
    application.state.store = store
    yield


app = FastAPI(
    title="LTT Predictive Customer Churn API",
    version="1.0.0",
    description=(
        "Decision-support API backed by clearly labeled synthetic telecom data. "
        "The header-based demo roles must be replaced by an enterprise identity "
        "provider in production."
    ),
    lifespan=lifespan,
)


@app.middleware("http")
async def security_and_request_id(request: Request, call_next: Callable) -> Response:
    request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))[:40]
    request.state.request_id = request_id
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    response.headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'"
    return response


@app.exception_handler(HTTPException)
async def http_error(_: Request, exception: HTTPException) -> JSONResponse:
    detail = exception.detail
    if isinstance(detail, dict) and "code" in detail:
        payload = detail
    else:
        payload = {"code": "HTTP_ERROR", "message": str(detail)}
    return JSONResponse(status_code=exception.status_code, content={"error": payload})


@app.exception_handler(RequestValidationError)
async def validation_error(_: Request, exception: RequestValidationError) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Invalid request parameters",
                "details": exception.errors(),
            }
        },
    )


def current_role(x_user_role: Annotated[str, Header()] = Role.EXECUTIVE.value) -> Role:
    try:
        return Role(x_user_role.lower())
    except ValueError as error:
        raise HTTPException(
            status_code=403,
            detail={"code": "INVALID_ROLE", "message": "The supplied demo role is not allowed"},
        ) from error


def require_roles(*allowed: Role) -> Callable:
    def dependency(role: Annotated[Role, Depends(current_role)]) -> Role:
        if role not in allowed:
            raise HTTPException(
                status_code=403,
                detail={"code": "FORBIDDEN", "message": "Role cannot perform this action"},
            )
        return role

    return dependency


def get_store(request: Request) -> AnalyticsStore:
    return request.app.state.store


def get_filters(
    region: Annotated[str | None, Query(max_length=40)] = None,
    service_type: Annotated[str | None, Query(alias="serviceType", max_length=40)] = None,
    segment: Annotated[str | None, Query(max_length=40)] = None,
    risk_level: Annotated[RiskLevel | None, Query(alias="riskLevel")] = None,
    revenue_band: Annotated[
        str | None, Query(alias="revenueBand", pattern="^(LOW|MEDIUM|HIGH)$")
    ] = None,
    tenure_min: Annotated[int | None, Query(alias="tenureMin", ge=0, le=240)] = None,
    tenure_max: Annotated[int | None, Query(alias="tenureMax", ge=0, le=240)] = None,
    query: Annotated[str | None, Query(max_length=30)] = None,
) -> CustomerFilters:
    if tenure_min is not None and tenure_max is not None and tenure_min > tenure_max:
        raise HTTPException(
            status_code=422,
            detail={
                "code": "INVALID_TENURE_RANGE",
                "message": "tenureMin must not exceed tenureMax",
            },
        )
    return CustomerFilters(
        region=region,
        service_type=service_type,
        segment=segment,
        risk_level=risk_level.value if risk_level else None,
        revenue_band=revenue_band,
        tenure_min=tenure_min,
        tenure_max=tenure_max,
        query=query,
    )


def can_view_customer_id(role: Role) -> bool:
    return role in {Role.ANALYST, Role.RETENTION, Role.ADMIN}


@app.get("/api/health", tags=["Operations"])
def health(store: Annotated[AnalyticsStore, Depends(get_store)]) -> dict[str, Any]:
    return {
        "status": "healthy",
        "datasetType": "SYNTHETIC",
        "recordCount": len(store.data),
        "modelVersion": store.metadata["modelVersion"],
    }


@app.get("/api/v1/overview", tags=["Dashboard"])
def overview(
    filters: Annotated[CustomerFilters, Depends(get_filters)],
    store: Annotated[AnalyticsStore, Depends(get_store)],
    _: Annotated[Role, Depends(current_role)],
) -> dict[str, Any]:
    return store.overview(filters)


@app.get("/api/v1/risk-analysis", tags=["Dashboard"])
def risk_analysis(
    filters: Annotated[CustomerFilters, Depends(get_filters)],
    store: Annotated[AnalyticsStore, Depends(get_store)],
    _: Annotated[Role, Depends(current_role)],
) -> dict[str, Any]:
    return store.risk_analysis(filters)


@app.get("/api/v1/drivers", tags=["Dashboard"])
def drivers(
    filters: Annotated[CustomerFilters, Depends(get_filters)],
    store: Annotated[AnalyticsStore, Depends(get_store)],
    _: Annotated[Role, Depends(current_role)],
) -> dict[str, Any]:
    return store.drivers(filters)


@app.get("/api/v1/geography", tags=["Dashboard"])
def geography(
    filters: Annotated[CustomerFilters, Depends(get_filters)],
    store: Annotated[AnalyticsStore, Depends(get_store)],
    _: Annotated[Role, Depends(current_role)],
) -> list[dict[str, Any]]:
    return store.geography(filters)


@app.get("/api/v1/model-performance", tags=["Model governance"])
def model_performance(
    store: Annotated[AnalyticsStore, Depends(get_store)],
    _: Annotated[Role, Depends(current_role)],
) -> dict[str, Any]:
    return store.model_performance()


@app.get("/api/v1/filter-options", tags=["Dashboard"])
def filter_options(
    store: Annotated[AnalyticsStore, Depends(get_store)],
    _: Annotated[Role, Depends(current_role)],
) -> dict[str, list[str]]:
    return store.options()


@app.get("/api/v1/customers", tags=["Customers"])
def customers(
    filters: Annotated[CustomerFilters, Depends(get_filters)],
    store: Annotated[AnalyticsStore, Depends(get_store)],
    role: Annotated[Role, Depends(current_role)],
    page: Annotated[int, Query(ge=1, le=10_000)] = 1,
    page_size: Annotated[int, Query(alias="pageSize", ge=1, le=200)] = 25,
) -> dict[str, Any]:
    frame = store.filtered(filters).sort_values("retention_priority_score", ascending=False)
    start = (page - 1) * page_size
    page_frame = frame.iloc[start : start + page_size]
    return {
        "data": [
            store.serialize_customer(row, can_view_customer_id(role))
            for _, row in page_frame.iterrows()
        ],
        "pagination": {
            "page": page,
            "pageSize": page_size,
            "totalItems": int(len(frame)),
            "totalPages": math.ceil(len(frame) / page_size) if len(frame) else 0,
        },
    }


@app.get("/api/v1/customers/export", tags=["Customers"])
def export_customers(
    filters: Annotated[CustomerFilters, Depends(get_filters)],
    store: Annotated[AnalyticsStore, Depends(get_store)],
    role: Annotated[Role, Depends(require_roles(Role.ANALYST, Role.RETENTION, Role.ADMIN))],
) -> Response:
    frame = (
        store.filtered(filters)
        .sort_values("retention_priority_score", ascending=False)
        .head(25_000)
    )
    allowed = frame[
        [
            "customer_id",
            "region",
            "service_type",
            "customer_segment",
            "monthly_revenue",
            "churn_risk_score",
            "churn_probability_30d",
            "revenue_at_risk",
            "recommended_action",
            "retention_priority_score",
        ]
    ].copy()
    if not can_view_customer_id(role):
        allowed["customer_id"] = allowed["customer_id"].map(store.mask_customer_id)
    buffer = io.StringIO()
    allowed.to_csv(buffer, index=False)
    return Response(
        content=buffer.getvalue().encode("utf-8-sig"),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="churn-risk-export.csv"'},
    )


@app.get("/api/v1/customers/{customer_id}", tags=["Customers"])
def customer_detail(
    customer_id: str,
    store: Annotated[AnalyticsStore, Depends(get_store)],
    role: Annotated[Role, Depends(current_role)],
) -> dict[str, Any]:
    if len(customer_id) > 20 or not customer_id.upper().startswith("LTT-"):
        raise HTTPException(
            status_code=422,
            detail={"code": "INVALID_CUSTOMER_ID", "message": "Invalid customer identifier"},
        )
    matches = store.data[store.data["customer_id"] == customer_id.upper()]
    if matches.empty:
        raise HTTPException(
            status_code=404,
            detail={"code": "CUSTOMER_NOT_FOUND", "message": "Customer was not found"},
        )
    return store.serialize_customer(matches.iloc[0], can_view_customer_id(role))


@app.get("/api/v1/retention", tags=["Retention"])
def retention_queue(
    store: Annotated[AnalyticsStore, Depends(get_store)],
    role: Annotated[Role, Depends(current_role)],
    page: Annotated[int, Query(ge=1, le=10_000)] = 1,
    page_size: Annotated[int, Query(alias="pageSize", ge=1, le=200)] = 50,
) -> dict[str, Any]:
    frame = store.data[store.data["risk_category"].isin(["HIGH", "CRITICAL"])].sort_values(
        "retention_priority_score", ascending=False
    )
    start = (page - 1) * page_size
    page_frame = frame.iloc[start : start + page_size]
    return {
        "data": [
            store.serialize_customer(row, can_view_customer_id(role))
            for _, row in page_frame.iterrows()
        ],
        "pagination": {
            "page": page,
            "pageSize": page_size,
            "totalItems": int(len(frame)),
            "totalPages": math.ceil(len(frame) / page_size) if len(frame) else 0,
        },
    }


@app.patch("/api/v1/retention/{customer_id}", tags=["Retention"])
def update_retention(
    customer_id: str,
    payload: RetentionUpdate,
    request: Request,
    store: Annotated[AnalyticsStore, Depends(get_store)],
    role: Annotated[Role, Depends(require_roles(Role.RETENTION, Role.ADMIN))],
) -> dict[str, Any]:
    matches = store.data["customer_id"] == customer_id.upper()
    if not matches.any():
        raise HTTPException(
            status_code=404,
            detail={"code": "CUSTOMER_NOT_FOUND", "message": "Customer was not found"},
        )
    upsert_retention_state(
        customer_id.upper(),
        payload.campaignStatus.value,
        payload.retentionResult.value,
        role.value,
        request.state.request_id,
    )
    store.data.loc[matches, "campaign_status"] = payload.campaignStatus.value
    store.data.loc[matches, "retention_result"] = payload.retentionResult.value
    return {
        "customerId": customer_id.upper(),
        "campaignStatus": payload.campaignStatus.value,
        "retentionResult": payload.retentionResult.value,
        "updatedByRole": role.value,
    }
