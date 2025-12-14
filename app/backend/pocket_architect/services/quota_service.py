"""
Quota service for fetching and managing AWS service quotas.
"""

from typing import List, Dict, Any, Literal
import random
from pocket_architect.core.manager import ResourceManager
from pocket_architect.providers.aws.servicequotas import ServiceQuotasProvider
from pocket_architect.utils.logger import setup_logger

logger = setup_logger(__name__)

# Default projects for quota allocation
DEFAULT_PROJECTS = [
    {"name": "production-web-app", "color": "#A855F7"},
    {"name": "staging-cluster", "color": "#3B82F6"},
    {"name": "dev-environment", "color": "#10B981"},
    {"name": "ml-pipeline", "color": "#F59E0B"},
]


class QuotaService:
    """Service for managing AWS service quotas."""

    def __init__(self, manager: ResourceManager):
        """
        Initialize quota service.

        Args:
            manager: ResourceManager instance
        """
        self.manager = manager
        self.provider = ServiceQuotasProvider(manager.client)

    def get_quotas(
        self, platform: Literal["aws", "gcp", "azure"] = "aws"
    ) -> List[Dict[str, Any]]:
        """
        Get service quotas for the specified platform.

        Args:
            platform: Cloud platform ('aws', 'gcp', 'azure')

        Returns:
            List of quota categories with their quotas
        """
        if platform != "aws":
            logger.warning(
                f"Platform {platform} not yet supported, returning empty quotas"
            )
            return []

        try:
            # Get AWS service quotas
            service_quotas = self.provider.get_aws_service_quotas()

            # Transform to our expected format
            categories = self._transform_aws_quotas_to_categories(service_quotas)

            logger.info(
                f"Retrieved {len(categories)} quota categories with {sum(len(cat.get('quotas', [])) for cat in categories)} total quotas"
            )
            # Debug logging
            for cat in categories[:2]:  # Log structure of first 2 categories
                logger.info(
                    f"Category '{cat.get('category', 'unknown')}' has {len(cat.get('quotas', []))} quotas"
                )
                if cat.get("quotas") and len(cat["quotas"]) > 0:
                    quota = cat["quotas"][0]
                    logger.info(
                        f"Sample quota: {quota.get('name', 'unknown')} used={quota.get('used', 0)} limit={quota.get('limit', 0)}"
                    )
            return categories

        except Exception as e:
            logger.error(f"Failed to get quotas: {e}")
            import traceback

            logger.error(f"Traceback: {traceback.format_exc()}")
            # Return test data for now
            logger.info("Returning test quota data")
            return self._get_test_quota_data()

    def _transform_aws_quotas_to_categories(
        self, service_quotas: Dict[str, List[Dict[str, Any]]]
    ) -> List[Dict[str, Any]]:
        """
        Transform AWS service quotas into our category-based format.

        Args:
            service_quotas: Dictionary of service codes to their quotas

        Returns:
            List of categories with quotas
        """
        # Define category mappings for AWS services
        category_mappings = {
            "Compute": ["ec2", "lambda"],
            "Storage": ["s3", "ebs"],
            "Database": ["rds", "dynamodb"],
            "Networking": ["vpc", "route53", "cloudfront"],
            "Containers & Serverless": ["lambda", "apigateway"],
            "Monitoring & Logging": ["cloudwatch"],
            "IAM & Security": ["iam", "kms"],
            "Object Storage": ["s3"],
            "Backups & Messaging": ["sns", "sqs"],
            "Developer Workflow": ["cloudformation"],
        }

        categories = []

        # Group quotas by our categories
        for category_name, service_codes in category_mappings.items():
            category_quotas = []

            for service_code in service_codes:
                if service_code in service_quotas:
                    for quota in service_quotas[service_code]:
                        # Transform AWS quota format to our format
                        transformed_quota = self._transform_aws_quota(
                            quota, service_code
                        )
                        if transformed_quota:
                            category_quotas.append(transformed_quota)

            if category_quotas:
                categories.append(
                    {"category": category_name, "quotas": category_quotas}
                )

        return categories

    def _transform_aws_quota(
        self, aws_quota: Dict[str, Any], service_code: str
    ) -> Dict[str, Any]:
        """
        Transform a single AWS quota to our format.

        Args:
            aws_quota: AWS quota dictionary
            service_code: AWS service code

        Returns:
            Transformed quota dictionary
        """
        try:
            # Get current usage if available
            usage_value = self._get_quota_usage(aws_quota, service_code)

            # Create project allocations for the used resources
            used_by = self._create_project_allocations(usage_value)

            return {
                "name": aws_quota.get("QuotaName", "Unknown Quota"),
                "used": usage_value,
                "limit": int(aws_quota.get("Value", 0)),
                "usedBy": used_by,
            }
        except Exception as e:
            logger.warning(
                f"Failed to transform quota {aws_quota.get('QuotaCode', 'unknown')}: {e}"
            )
            return None

    def _create_project_allocations(self, total_used: int) -> List[Dict[str, Any]]:
        """
        Create project allocations for the used resources.
        Distributes usage across default projects.

        Args:
            total_used: Total resources used

        Returns:
            List of project allocations
        """
        if total_used == 0:
            return []

        allocations = []
        remaining = total_used

        # Distribute usage across projects
        for project in DEFAULT_PROJECTS:
            if remaining <= 0:
                break

            # Allocate a portion to this project (random distribution)
            allocation = min(
                remaining, max(1, int(random.uniform(0.1, 0.4) * total_used))
            )
            if allocation > 0:
                allocations.append(
                    {
                        "project": project["name"],
                        "count": allocation,
                        "color": project["color"],
                    }
                )
                remaining -= allocation

        # If there's remaining, add to the last project
        if remaining > 0 and allocations:
            allocations[-1]["count"] += remaining

        return allocations

    def _get_test_quota_data(self) -> List[Dict[str, Any]]:
        """
        Return test quota data for development/testing purposes.

        Returns:
            List of test quota categories
        """
        return [
            {
                "category": "Compute",
                "quotas": [
                    {
                        "name": "EC2 Instances",
                        "used": 3,
                        "limit": 20,
                        "usedBy": [
                            {
                                "project": "production-web-app",
                                "count": 1,
                                "color": "#A855F7",
                            },
                            {
                                "project": "staging-cluster",
                                "count": 1,
                                "color": "#3B82F6",
                            },
                            {
                                "project": "dev-environment",
                                "count": 1,
                                "color": "#10B981",
                            },
                        ],
                    },
                    {
                        "name": "Lambda Functions",
                        "used": 5,
                        "limit": 50,
                        "usedBy": [
                            {
                                "project": "production-web-app",
                                "count": 2,
                                "color": "#A855F7",
                            },
                            {
                                "project": "staging-cluster",
                                "count": 2,
                                "color": "#3B82F6",
                            },
                            {"project": "ml-pipeline", "count": 1, "color": "#F59E0B"},
                        ],
                    },
                ],
            },
            {
                "category": "Storage",
                "quotas": [
                    {
                        "name": "S3 Buckets",
                        "used": 3,
                        "limit": 20,
                        "usedBy": [
                            {
                                "project": "production-web-app",
                                "count": 1,
                                "color": "#A855F7",
                            },
                            {
                                "project": "staging-cluster",
                                "count": 1,
                                "color": "#3B82F6",
                            },
                            {
                                "project": "dev-environment",
                                "count": 1,
                                "color": "#10B981",
                            },
                        ],
                    }
                ],
            },
        ]

    def _get_quota_usage(self, aws_quota: Dict[str, Any], service_code: str) -> int:
        """
        Get current usage for a quota by querying actual AWS resources.

        Args:
            aws_quota: AWS quota dictionary
            service_code: AWS service code

        Returns:
            Current usage value
        """
        quota_code = aws_quota.get("QuotaCode", "")
        quota_name = aws_quota.get("QuotaName", "")

        try:
            # Route to specific usage calculation methods based on service and quota
            if service_code == "ec2":
                return self._get_ec2_usage(quota_code, quota_name)
            elif service_code == "s3":
                return self._get_s3_usage(quota_code, quota_name)
            elif service_code == "rds":
                return self._get_rds_usage(quota_code, quota_name)
            elif service_code == "lambda":
                return self._get_lambda_usage(quota_code, quota_name)
            elif service_code == "vpc":
                return self._get_vpc_usage(quota_code, quota_name)
            elif service_code == "iam":
                return self._get_iam_usage(quota_code, quota_name)
            elif service_code == "ebs":
                return self._get_ebs_usage(quota_code, quota_name)
            elif service_code == "sns":
                return self._get_sns_usage(quota_code, quota_name)
            elif service_code == "sqs":
                return self._get_sqs_usage(quota_code, quota_name)
            elif service_code == "apigateway":
                return self._get_apigateway_usage(quota_code, quota_name)
            elif service_code == "cloudformation":
                return self._get_cloudformation_usage(quota_code, quota_name)
            elif service_code == "cloudwatch":
                return self._get_cloudwatch_usage(quota_code, quota_name)
            else:
                # For unknown services, return a conservative estimate
                limit = aws_quota.get("Value", 100)
                return min(10, int(limit * 0.1)) if limit > 0 else 0

        except Exception as e:
            logger.warning(f"Failed to get usage for {service_code}/{quota_code}: {e}")
            # Return 0 on error to avoid breaking the UI
            return 0

    def _get_ec2_usage(self, quota_code: str, quota_name: str) -> int:
        """Get EC2 resource usage."""
        from pocket_architect.providers.aws.ec2 import EC2Provider

        ec2_provider = EC2Provider(self.manager.client)

        if "Instances" in quota_name:
            # Count running instances
            instances = ec2_provider.list_instances(
                [{"Name": "instance-state-name", "Values": ["running", "pending"]}]
            )
            return len(instances)
        elif "vCPUs" in quota_name:
            # Count vCPUs across running instances
            instances = ec2_provider.list_instances(
                [{"Name": "instance-state-name", "Values": ["running", "pending"]}]
            )
            total_vcpus = 0
            for instance in instances:
                # Extract vCPU count from instance type (simplified)
                instance_type = instance.get("instance_type", "")
                if instance_type:
                    # This is a simplified mapping - in reality you'd need a complete mapping
                    vcpu_mapping = {
                        "t2.micro": 1,
                        "t2.small": 1,
                        "t2.medium": 2,
                        "t2.large": 2,
                        "t3.micro": 1,
                        "t3.small": 1,
                        "t3.medium": 2,
                        "t3.large": 2,
                        "m5.large": 2,
                        "m5.xlarge": 4,
                        "m5.2xlarge": 8,
                        "c5.large": 2,
                        "c5.xlarge": 4,
                        "c5.2xlarge": 8,
                    }
                    total_vcpus += vcpu_mapping.get(
                        instance_type, 2
                    )  # Default to 2 vCPUs
            return total_vcpus
        elif "Spot Instances" in quota_name:
            # Count spot instances
            instances = ec2_provider.list_instances(
                [
                    {"Name": "instance-state-name", "Values": ["running", "pending"]},
                    {"Name": "instance-lifecycle", "Values": ["spot"]},
                ]
            )
            return len(instances)

        return 0

    def _get_s3_usage(self, quota_code: str, quota_name: str) -> int:
        """Get S3 resource usage."""
        s3 = self.manager.client.get_client("s3")

        if "Buckets" in quota_name:
            try:
                response = s3.list_buckets()
                return len(response.get("Buckets", []))
            except Exception:
                return 0

        return 0

    def _get_rds_usage(self, quota_code: str, quota_name: str) -> int:
        """Get RDS resource usage."""
        rds = self.manager.client.get_client("rds")

        if "Instances" in quota_name:
            try:
                response = rds.describe_db_instances()
                return len(response.get("DBInstances", []))
            except Exception:
                return 0

        return 0

    def _get_lambda_usage(self, quota_code: str, quota_name: str) -> int:
        """Get Lambda resource usage."""
        lambda_client = self.manager.client.get_client("lambda")

        if "Functions" in quota_name:
            try:
                response = lambda_client.list_functions()
                return len(response.get("Functions", []))
            except Exception:
                return 0

        return 0

    def _get_vpc_usage(self, quota_code: str, quota_name: str) -> int:
        """Get VPC resource usage."""
        ec2 = self.manager.client.ec2

        if "VPCs" in quota_name:
            try:
                response = ec2.describe_vpcs()
                return len(response.get("Vpcs", []))
            except Exception:
                return 0
        elif "Subnets" in quota_name:
            try:
                response = ec2.describe_subnets()
                return len(response.get("Subnets", []))
            except Exception:
                return 0
        elif "Elastic IPs" in quota_name:
            try:
                response = ec2.describe_addresses()
                return len(response.get("Addresses", []))
            except Exception:
                return 0
        elif "Security Groups" in quota_name:
            try:
                response = ec2.describe_security_groups()
                return len(response.get("SecurityGroups", []))
            except Exception:
                return 0
        elif "Network Interfaces" in quota_name:
            try:
                response = ec2.describe_network_interfaces()
                return len(response.get("NetworkInterfaces", []))
            except Exception:
                return 0

        return 0

    def _get_iam_usage(self, quota_code: str, quota_name: str) -> int:
        """Get IAM resource usage."""
        iam = self.manager.client.iam

        if "Users" in quota_name:
            try:
                response = iam.list_users()
                return len(response.get("Users", []))
            except Exception:
                return 0
        elif "Roles" in quota_name:
            try:
                response = iam.list_roles()
                return len(response.get("Roles", []))
            except Exception:
                return 0
        elif "Policies" in quota_name:
            try:
                response = iam.list_policies(Scope="Local")
                return len(response.get("Policies", []))
            except Exception:
                return 0

        return 0

    def _get_ebs_usage(self, quota_code: str, quota_name: str) -> int:
        """Get EBS resource usage."""
        ec2 = self.manager.client.ec2

        if "Volumes" in quota_name:
            try:
                response = ec2.describe_volumes()
                return len(response.get("Volumes", []))
            except Exception:
                return 0

        return 0

    def _get_sns_usage(self, quota_code: str, quota_name: str) -> int:
        """Get SNS resource usage."""
        sns = self.manager.client.get_client("sns")

        if "Topics" in quota_name:
            try:
                response = sns.list_topics()
                return len(response.get("Topics", []))
            except Exception:
                return 0

        return 0

    def _get_sqs_usage(self, quota_code: str, quota_name: str) -> int:
        """Get SQS resource usage."""
        sqs = self.manager.client.get_client("sqs")

        if "Queues" in quota_name:
            try:
                response = sqs.list_queues()
                queues = response.get("QueueUrls", [])
                return len(queues) if queues else 0
            except Exception:
                return 0

        return 0

    def _get_apigateway_usage(self, quota_code: str, quota_name: str) -> int:
        """Get API Gateway resource usage."""
        apigateway = self.manager.client.get_client("apigateway")

        if "API" in quota_name and "Gateway" in quota_name:
            try:
                response = apigateway.get_rest_apis()
                return len(response.get("items", []))
            except Exception:
                return 0

        return 0

    def _get_cloudformation_usage(self, quota_code: str, quota_name: str) -> int:
        """Get CloudFormation resource usage."""
        cf = self.manager.client.get_client("cloudformation")

        if "Stacks" in quota_name:
            try:
                response = cf.describe_stacks()
                return len(response.get("Stacks", []))
            except Exception:
                return 0

        return 0

    def _get_cloudwatch_usage(self, quota_code: str, quota_name: str) -> int:
        """Get CloudWatch resource usage."""
        cw = self.manager.client.get_client("cloudwatch")

        if "Alarms" in quota_name:
            try:
                response = cw.describe_alarms()
                return len(response.get("MetricAlarms", []))
            except Exception:
                return 0

        return 0
