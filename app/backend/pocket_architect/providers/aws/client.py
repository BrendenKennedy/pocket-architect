"""
AWS client wrapper around boto3 with error handling.
"""

from typing import Optional, Callable, Any
from functools import wraps
from botocore.exceptions import ClientError, BotoCoreError

from pocket_architect.core.exceptions import AWSException
from pocket_architect.core.config import get_config
from pocket_architect.utils.logger import setup_logger

logger = setup_logger(__name__)


def handle_aws_error(func: Callable) -> Callable:
    """
    Decorator to handle AWS errors and convert to our exceptions.

    Usage:
        @handle_aws_error
        def my_aws_function(self):
            # boto3 code here
    """

    @wraps(func)
    def wrapper(*args, **kwargs) -> Any:
        try:
            return func(*args, **kwargs)
        except ClientError as e:
            error_code = e.response["Error"]["Code"]
            error_message = e.response["Error"]["Message"]
            logger.error(f"AWS ClientError [{error_code}]: {error_message}")
            raise AWSException(f"AWS Error [{error_code}]: {error_message}") from e
        except BotoCoreError as e:
            logger.error(f"AWS BotoCoreError: {e}")
            raise AWSException(f"AWS Error: {e}") from e
        except Exception as e:
            logger.error(f"Unexpected error in AWS operation: {e}")
            raise AWSException(f"Unexpected AWS error: {e}") from e

    return wrapper


class AWSClient:
    """
    AWS client wrapper providing boto3 clients with error handling.

    This class manages boto3 sessions and clients for AWS services.
    """

    def __init__(self, region: str, profile: Optional[str] = None):
        """
        Initialize AWS client.

        Args:
            region: AWS region (e.g., 'us-east-1')
            profile: AWS profile name (optional, uses default if not provided)
        """
        self.region = region
        self.profile = profile

        config = get_config()
        self.session = config.get_aws_session(profile=profile, region=region)

        # Initialize commonly used clients
        self._ec2 = None
        self._ce = None  # Cost Explorer
        self._sts = None
        self._iam = None
        self._acm = None  # Certificate Manager
        self._servicequotas = None  # Service Quotas

        logger.info(f"AWSClient initialized for region: {region}")

    @property
    def ec2(self):
        """Get EC2 client (lazy initialization)."""
        if self._ec2 is None:
            self._ec2 = self.session.client("ec2")
            logger.debug("EC2 client initialized")
        return self._ec2

    @property
    def ce(self):
        """Get Cost Explorer client (lazy initialization)."""
        if self._ce is None:
            # Cost Explorer is only available in us-east-1
            self._ce = self.session.client("ce", region_name="us-east-1")
            logger.debug("Cost Explorer client initialized")
        return self._ce

    @property
    def sts(self):
        """Get STS (Security Token Service) client (lazy initialization)."""
        if self._sts is None:
            self._sts = self.session.client("sts")
            logger.debug("STS client initialized")
        return self._sts

    @property
    def iam(self):
        """Get IAM client (lazy initialization)."""
        if self._iam is None:
            # IAM is a global service, but we still need to create a client
            self._iam = self.session.client("iam")
            logger.debug("IAM client initialized")
        return self._iam

    @property
    def acm(self):
        """Get ACM (Certificate Manager) client (lazy initialization)."""
        if self._acm is None:
            self._acm = self.session.client("acm")
            logger.debug("ACM client initialized")
        return self._acm

    @property
    def servicequotas(self):
        """Get Service Quotas client (lazy initialization)."""
        if self._servicequotas is None:
            self._servicequotas = self.session.client("servicequotas")
            logger.debug("Service Quotas client initialized")
        return self._servicequotas

    def get_client(self, service_name: str, region: Optional[str] = None):
        """
        Get boto3 client for any AWS service.

        Args:
            service_name: AWS service name (e.g., 's3', 'lambda', 'rds')
            region: Optional region override

        Returns:
            boto3 client for the service
        """
        region = region or self.region
        return self.session.client(service_name, region_name=region)

    @handle_aws_error
    def get_caller_identity(self) -> dict:
        """
        Get AWS caller identity (account ID, user/role ARN).

        Returns:
            Dict with Account, Arn, UserId
        """
        return self.sts.get_caller_identity()

    @handle_aws_error
    def test_connection(self) -> bool:
        """
        Test AWS connection by making a simple API call.

        Returns:
            True if connection successful

        Raises:
            AWSException: If connection fails
        """
        identity = self.get_caller_identity()
        logger.info(f"AWS connection successful. Account: {identity['Account']}")
        return True
