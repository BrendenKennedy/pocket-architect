"""Core Pydantic models and types."""

from enum import Enum
from typing import Optional, Dict, Any, Literal
from pydantic import BaseModel, Field


class Provider(str, Enum):
    """Supported cloud providers."""

    AWS = "aws"
    COREWEAVE = "coreweave"
    RUNPOD = "runpod"
    LOCAL = "local"


class SessionState(str, Enum):
    """Session state enumeration."""

    CREATING = "creating"
    ACTIVE = "active"
    STOPPED = "stopped"
    DESTROYED = "destroyed"
    ERROR = "error"


class Session(BaseModel):
    """Session model representing an active pocket-architect session."""

    session_id: str = Field(..., description="Unique session identifier")
    provider: Provider = Field(..., description="Cloud provider")
    state: SessionState = Field(default=SessionState.CREATING, description="Current session state")
    created_at: str = Field(..., description="ISO timestamp of session creation")
    updated_at: str = Field(..., description="ISO timestamp of last update")
    
    # Provider-specific metadata
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Provider-specific session data")
    
    # Cost tracking
    estimated_hourly_cost: Optional[float] = Field(None, description="Estimated cost per hour in USD")
    total_cost: Optional[float] = Field(None, description="Total cost so far in USD")
    
    # Resource identifiers (provider-specific)
    cvat_url: Optional[str] = Field(None, description="CVAT instance URL")
    worker_node_id: Optional[str] = Field(None, description="Worker node identifier")
    training_job_id: Optional[str] = Field(None, description="Training job identifier")

    class Config:
        """Pydantic config."""

        use_enum_values = True
        json_encoders = {
            Provider: lambda v: v.value,
            SessionState: lambda v: v.value,
        }


class CostEstimate(BaseModel):
    """Cost estimate model."""

    hourly_rate_usd: float = Field(..., ge=0, description="Cost per hour in USD")
    monthly_projection_usd: float = Field(..., ge=0, description="Projected monthly cost (hourly * 730)")
    provider: Provider = Field(..., description="Cloud provider")
    resource_type: str = Field(..., description="Type of resource (cvat, worker, training)")
    details: Dict[str, Any] = Field(default_factory=dict, description="Provider-specific cost details")

