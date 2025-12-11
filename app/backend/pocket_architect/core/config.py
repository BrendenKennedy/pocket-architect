"""
Configuration management for Pocket Architect.
Handles AWS credentials, application settings, and environment configuration.
"""

import os
from pathlib import Path
from typing import Optional
import boto3
from dotenv import load_dotenv

from pocket_architect.core.exceptions import ConfigurationError
from pocket_architect.utils.logger import setup_logger

logger = setup_logger(__name__)

# Load .env file if it exists
load_dotenv()


class Config:
    """Configuration manager for Pocket Architect."""

    def __init__(self):
        """Initialize configuration."""
        self._home_dir = Path.home() / ".pocket-architect"
        self._ensure_directories()

    def _ensure_directories(self):
        """Ensure required directories exist."""
        self._home_dir.mkdir(parents=True, exist_ok=True)
        (self._home_dir / "logs").mkdir(exist_ok=True)

    # ========================================================================
    # AWS Configuration
    # ========================================================================

    def get_aws_session(
        self,
        profile: Optional[str] = None,
        region: Optional[str] = None
    ) -> boto3.Session:
        """
        Get AWS boto3 session with credentials.

        Args:
            profile: AWS profile name (from ~/.aws/credentials)
            region: AWS region (defaults to configured default)

        Returns:
            boto3.Session configured with credentials

        Raises:
            ConfigurationError: If AWS credentials are not configured
        """
        try:
            region = region or self.get_default_region()

            # Try to create session with profile
            if profile:
                session = boto3.Session(profile_name=profile, region_name=region)
            else:
                # Use default credentials (env vars, ~/.aws/credentials, IAM role, etc.)
                session = boto3.Session(region_name=region)

            # Test credentials by making a simple call
            sts = session.client('sts')
            identity = sts.get_caller_identity()
            logger.info(f"AWS session created for account: {identity['Account']}")

            return session

        except Exception as e:
            logger.error(f"Failed to create AWS session: {e}")
            raise ConfigurationError(
                f"AWS credentials not configured. Error: {e}\n"
                "Please configure AWS credentials using one of these methods:\n"
                "1. Run 'aws configure' (AWS CLI)\n"
                "2. Set environment variables: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY\n"
                "3. Create a .env file with AWS credentials\n"
                "4. Use ~/.aws/credentials file"
            )

    def get_default_region(self) -> str:
        """
        Get default AWS region.

        Returns:
            Default AWS region string

        Priority:
        1. AWS_DEFAULT_REGION environment variable
        2. AWS_REGION environment variable
        3. Default to 'us-east-1'
        """
        return (
            os.getenv('AWS_DEFAULT_REGION') or
            os.getenv('AWS_REGION') or
            'us-east-1'
        )

    # ========================================================================
    # Database Configuration
    # ========================================================================

    def get_database_url(self) -> str:
        """
        Get database URL for SQLAlchemy.

        Returns:
            SQLite database URL
        """
        db_path = self._home_dir / "pocket-architect.db"
        return f"sqlite:///{db_path}"

    def get_database_path(self) -> Path:
        """Get database file path."""
        return self._home_dir / "pocket-architect.db"

    # ========================================================================
    # Application Settings
    # ========================================================================

    def get_log_level(self) -> str:
        """Get logging level from environment."""
        return os.getenv('LOG_LEVEL', 'INFO').upper()

    def get_log_file(self) -> Optional[Path]:
        """Get log file path."""
        log_dir = self._home_dir / "logs"
        return log_dir / "pocket-architect.log"

    def is_debug_mode(self) -> bool:
        """Check if debug mode is enabled."""
        return os.getenv('DEBUG', '').lower() in ('true', '1', 'yes')

    # ========================================================================
    # Utility Methods
    # ========================================================================

    @property
    def home_directory(self) -> Path:
        """Get Pocket Architect home directory (~/.pocket-architect)."""
        return self._home_dir

    def get_config_file(self) -> Path:
        """Get path to configuration file."""
        return self._home_dir / "config.yaml"

    def reset_configuration(self):
        """Reset configuration (for testing)."""
        logger.warning("Resetting configuration...")
        # This can be expanded to clear specific settings if needed


# Singleton instance
_config_instance: Optional[Config] = None


def get_config() -> Config:
    """Get singleton Config instance."""
    global _config_instance
    if _config_instance is None:
        _config_instance = Config()
    return _config_instance
