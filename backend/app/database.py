"""Persistence for retention workflow state and security audit events."""

from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import DateTime, String, create_engine, select
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column

from app.config import get_settings


class Base(DeclarativeBase):
    pass


class RetentionState(Base):
    __tablename__ = "retention_states"

    customer_id: Mapped[str] = mapped_column(String(20), primary_key=True)
    campaign_status: Mapped[str] = mapped_column(String(30), default="NOT_STARTED")
    retention_result: Mapped[str] = mapped_column(String(30), default="PENDING")
    updated_by_role: Mapped[str] = mapped_column(String(30))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class AuditEvent(Base):
    __tablename__ = "audit_events"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    event_type: Mapped[str] = mapped_column(String(80), index=True)
    actor_role: Mapped[str] = mapped_column(String(30), index=True)
    resource_id: Mapped[str] = mapped_column(String(80), index=True)
    request_id: Mapped[str] = mapped_column(String(40), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


def _engine():
    url = get_settings().database_url
    options = {"check_same_thread": False} if url.startswith("sqlite") else {}
    return create_engine(url, pool_pre_ping=True, connect_args=options)


ENGINE = _engine()


def initialize_database() -> None:
    Base.metadata.create_all(ENGINE)


def upsert_retention_state(
    customer_id: str,
    campaign_status: str,
    retention_result: str,
    actor_role: str,
    request_id: str,
) -> RetentionState:
    now = datetime.now(UTC)
    with Session(ENGINE) as session:
        state = session.get(RetentionState, customer_id)
        if state is None:
            state = RetentionState(
                customer_id=customer_id, updated_by_role=actor_role, updated_at=now
            )
            session.add(state)
        state.campaign_status = campaign_status
        state.retention_result = retention_result
        state.updated_by_role = actor_role
        state.updated_at = now
        session.add(
            AuditEvent(
                event_type="RETENTION_STATE_UPDATED",
                actor_role=actor_role,
                resource_id=customer_id,
                request_id=request_id,
                created_at=now,
            )
        )
        session.commit()
        session.refresh(state)
        return state


def retention_overrides() -> dict[str, tuple[str, str]]:
    with Session(ENGINE) as session:
        states = session.scalars(select(RetentionState)).all()
    return {state.customer_id: (state.campaign_status, state.retention_result) for state in states}
