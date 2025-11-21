"""Pydantic v2 settings management."""

from pathlib import Path
from typing import Optional
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Global pocket-architect settings."""

    model_config = SettingsConfigDict(
        env_prefix="POCKET_ARCHITECT_",
        case_sensitive=False,
        env_file=".env",
        extra="ignore",
    )

    # Base directories
    home_dir: Path = Field(default_factory=lambda: Path.home() / ".pocket-architect")
    state_dir: Path = Field(default_factory=lambda: Path.home() / ".pocket-architect")
    models_dir: Path = Field(default_factory=lambda: Path.home() / ".pocket-architect" / "models")
    
    # Default provider
    default_provider: Optional[str] = Field(default=None, description="Default cloud provider")
    
    # AWS settings
    aws_region: str = Field(default="us-east-2", description="Default AWS region")
    aws_profile: Optional[str] = Field(default=None, description="AWS profile name")
    
    # CoreWeave settings
    coreweave_namespace: str = Field(default="pocket-architect", description="Kubernetes namespace")
    
    # RunPod settings
    runpod_api_key: Optional[str] = Field(default=None, description="RunPod API key")
    
    # CVAT settings
    cvat_default_image: str = Field(
        default="cvat/server:latest",
        description="Default CVAT Docker image"
    )
    
    # Security settings
    require_https: bool = Field(default=True, description="Require HTTPS for CVAT deployments")
    auto_shutdown_hours: int = Field(
        default=24,
        ge=1,
        description="Auto-shutdown instances after N hours of inactivity"
    )
    
    # Cost tracking
    cost_warning_threshold_usd: float = Field(
        default=10.0,
        ge=0,
        description="Warn if hourly cost exceeds this amount"
    )

    def __init__(self, **kwargs):
        """Initialize settings and ensure directories exist."""
        super().__init__(**kwargs)
        
        # Ensure directories exist
        self.home_dir.mkdir(parents=True, exist_ok=True)
        self.state_dir.mkdir(parents=True, exist_ok=True)
        self.models_dir.mkdir(parents=True, exist_ok=True)


# Global settings instance
settings = Settings()

