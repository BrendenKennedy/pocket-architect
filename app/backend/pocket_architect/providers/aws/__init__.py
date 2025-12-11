"""
AWS Provider - Facade for all AWS operations.
"""

from typing import Optional

from pocket_architect.providers.aws.client import AWSClient
from pocket_architect.providers.aws.ec2 import EC2Provider
from pocket_architect.utils.logger import setup_logger

logger = setup_logger(__name__)


class AWSProvider:
    """
    AWS Provider facade combining all AWS service providers.

    Provides a unified interface to AWS operations.
    """

    def __init__(self, region: str, profile: Optional[str] = None):
        """
        Initialize AWS provider.

        Args:
            region: AWS region (e.g., 'us-east-1')
            profile: AWS CLI profile name (optional)
        """
        self.region = region
        self.profile = profile

        # Initialize base client
        self.client = AWSClient(region=region, profile=profile)

        # Initialize service providers
        self.ec2 = EC2Provider(self.client)

        logger.info(f"AWSProvider initialized for region {region}")

    def test_connection(self) -> bool:
        """
        Test AWS connection.

        Returns:
            True if connection successful

        Raises:
            AWSException: If connection fails
        """
        return self.client.test_connection()


__all__ = ['AWSProvider', 'AWSClient', 'EC2Provider']
