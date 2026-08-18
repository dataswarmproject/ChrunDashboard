"""Request boundary schemas and stable business enums."""

from enum import StrEnum

from pydantic import BaseModel, ConfigDict


class Role(StrEnum):
    EXECUTIVE = "executive"
    ANALYST = "analyst"
    RETENTION = "retention"
    OPERATIONS = "operations"
    ADMIN = "admin"


class RiskLevel(StrEnum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class CampaignStatus(StrEnum):
    NOT_STARTED = "NOT_STARTED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"


class RetentionResult(StrEnum):
    PENDING = "PENDING"
    SAVED = "SAVED"
    CHURNED = "CHURNED"
    UNREACHABLE = "UNREACHABLE"


class RetentionUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    campaignStatus: CampaignStatus
    retentionResult: RetentionResult
