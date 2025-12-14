"""
AWS Service Quotas provider for managing service quotas and limits.
"""

from typing import List, Dict, Optional, Any
from botocore.exceptions import ClientError

from pocket_architect.providers.aws.client import AWSClient, handle_aws_error
from pocket_architect.utils.logger import setup_logger

logger = setup_logger(__name__)


class ServiceQuotasProvider:
    """AWS Service Quotas operations provider."""

    def __init__(self, client: AWSClient):
        """
        Initialize Service Quotas provider.

        Args:
            client: AWSClient instance
        """
        self.client = client
        self.servicequotas = client.servicequotas

    @handle_aws_error
    def list_services(self) -> List[Dict[str, Any]]:
        """
        List all AWS services that have quotas.

        Returns:
            List of service dictionaries with ServiceCode, ServiceName
        """
        services = []
        next_token = None

        while True:
            kwargs = {}
            if next_token:
                kwargs["NextToken"] = next_token

            response = self.servicequotas.list_services(**kwargs)
            services.extend(response.get("Services", []))

            next_token = response.get("NextToken")
            if not next_token:
                break

        logger.info(f"Found {len(services)} services with quotas")
        return services

    @handle_aws_error
    def list_service_quotas(self, service_code: str) -> List[Dict[str, Any]]:
        """
        List all quotas for a specific service.

        Args:
            service_code: AWS service code (e.g., 'ec2', 's3', 'lambda')

        Returns:
            List of quota dictionaries
        """
        quotas = []
        next_token = None

        while True:
            kwargs = {"ServiceCode": service_code}
            if next_token:
                kwargs["NextToken"] = next_token

            try:
                response = self.servicequotas.list_service_quotas(**kwargs)
                quotas.extend(response.get("Quotas", []))
            except ClientError as e:
                if e.response["Error"]["Code"] == "NoSuchResourceException":
                    logger.warning(f"No quotas found for service: {service_code}")
                    break
                else:
                    raise

            next_token = response.get("NextToken")
            if not next_token:
                break

        logger.debug(f"Found {len(quotas)} quotas for service {service_code}")
        return quotas

    @handle_aws_error
    def get_quota_value(
        self, service_code: str, quota_code: str
    ) -> Optional[Dict[str, Any]]:
        """
        Get detailed information about a specific quota.

        Args:
            service_code: AWS service code
            quota_code: Quota code

        Returns:
            Quota details dictionary or None if not found
        """
        try:
            response = self.servicequotas.get_service_quota(
                ServiceCode=service_code, QuotaCode=quota_code
            )
            return response.get("Quota", {})
        except ClientError as e:
            if e.response["Error"]["Code"] == "NoSuchResourceException":
                logger.warning(f"Quota not found: {service_code}/{quota_code}")
                return None
            else:
                raise

    @handle_aws_error
    def get_aws_service_quotas(
        self, service_codes: Optional[List[str]] = None
    ) -> Dict[str, List[Dict[str, Any]]]:
        """
        Get quotas for specified AWS services or all services if none specified.

        Args:
            service_codes: List of service codes to fetch quotas for. If None, fetches for common services.

        Returns:
            Dictionary mapping service codes to their quotas
        """
        if service_codes is None:
            # Common AWS services to check quotas for
            service_codes = [
                "ec2",
                "s3",
                "rds",
                "lambda",
                "vpc",
                "iam",
                "cloudformation",
                "cloudwatch",
                "route53",
                "elb",
                "autoscaling",
                "ebs",
                "kms",
                "sns",
                "sqs",
                "apigateway",
                "cloudfront",
                "dynamodb",
            ]

        service_quotas = {}

        for service_code in service_codes:
            try:
                quotas = self.list_service_quotas(service_code)
                if quotas:
                    service_quotas[service_code] = quotas
                    logger.info(f"Retrieved {len(quotas)} quotas for {service_code}")
                else:
                    logger.debug(f"No quotas found for {service_code}")
            except Exception as e:
                logger.error(f"Failed to get quotas for {service_code}: {e}")
                continue

        return service_quotas
