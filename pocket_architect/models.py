"""Pydantic models for pocket-architect."""

from datetime import datetime, timezone
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator


class Blueprint(BaseModel):
    """Blueprint definition for cloud resources."""

    name: str = Field(..., description="Blueprint name")
    description: str = Field(default="", description="Blueprint description")
    provider: str = Field(default="aws", description="Cloud provider")
    resources: dict[str, Any] = Field(..., description="Resource definitions")
    metadata: dict[str, Any] = Field(default_factory=dict, description="Additional metadata")

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        """Validate blueprint name."""
        if not v or not v.replace("-", "").replace("_", "").isalnum():
            raise ValueError("Blueprint name must be alphanumeric with dashes/underscores")
        return v


class ProjectState(BaseModel):
    """State of a deployed project."""

    model_config = ConfigDict(json_encoders={datetime: lambda v: v.isoformat()})

    project_name: str = Field(..., description="Project name")
    blueprint_name: str = Field(..., description="Blueprint used for deployment")
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc), description="Creation timestamp"
    )
    resources: dict[str, Any] = Field(
        default_factory=dict, description="Resource IDs and metadata by type"
    )


class SnapshotMetadata(BaseModel):
    """Metadata for a saved snapshot."""

    model_config = ConfigDict(json_encoders={datetime: lambda v: v.isoformat()})

    snapshot_id: str = Field(..., description="EBS snapshot ID")
    name: str = Field(..., description="Snapshot name")
    project_name: str = Field(..., description="Source project name")
    ami_id: str | None = Field(default=None, description="Cached AMI ID from snapshot")
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc), description="Creation timestamp"
    )
    note: str | None = Field(default=None, description="User note")


class CostLimit(BaseModel):
    """Cost limit configuration for a project."""

    model_config = ConfigDict(json_encoders={datetime: lambda v: v.isoformat()})

    project_name: str = Field(..., description="Project name")
    limit_amount: float = Field(..., description="Cost limit in USD", gt=0)
    action: str = Field(
        default="warn_only",
        description="Action when limit exceeded: 'stop', 'teardown', or 'warn_only'",
    )
    warning_threshold: float = Field(
        default=0.75, description="Warning threshold as fraction (0.75 = 75%)", ge=0, le=1
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc), description="Creation timestamp"
    )
    last_checked: datetime | None = Field(
        default=None, description="Last time cost was checked against this limit"
    )

    @field_validator("action")
    @classmethod
    def validate_action(cls, v: str) -> str:
        """Validate action value."""
        valid_actions = ["stop", "teardown", "warn_only"]
        if v not in valid_actions:
            raise ValueError(f"Action must be one of {valid_actions}")
        return v


class CostEstimate(BaseModel):
    """Cost estimate for a project."""

    model_config = ConfigDict(json_encoders={datetime: lambda v: v.isoformat()})

    project_name: str = Field(..., description="Project name")
    estimated_cost: float = Field(..., description="Estimated cost in USD", ge=0)
    actual_cost: float | None = Field(
        default=None, description="Actual cost from AWS Cost Explorer (USD)", ge=0
    )
    period_start: datetime = Field(..., description="Start of cost period")
    period_end: datetime = Field(..., description="End of cost period")
    breakdown: dict[str, float] = Field(
        default_factory=dict, description="Cost breakdown by resource type"
    )
    calculated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="When estimate was calculated",
    )
