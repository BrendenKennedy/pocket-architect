"""Cost estimation and AWS cost integration."""

from datetime import datetime, timedelta, timezone
from typing import Any

import boto3
from botocore.exceptions import ClientError

from pocket_architect.config import logger
from pocket_architect.models import CostEstimate

# AWS pricing data (on-demand, us-east-1, approximate as of 2024)
# These are approximate and should be updated periodically
INSTANCE_PRICING: dict[str, float] = {
    # General purpose
    "t3.nano": 0.0052,
    "t3.micro": 0.0104,
    "t3.small": 0.0208,
    "t3.medium": 0.0416,
    "t3.large": 0.0832,
    "t3.xlarge": 0.1664,
    "t3.2xlarge": 0.3328,
    # GPU instances
    "g4dn.xlarge": 0.526,
    "g4dn.2xlarge": 0.752,
    "g4dn.4xlarge": 1.204,
    "g4dn.8xlarge": 2.176,
    "p3.2xlarge": 3.06,
    "p3.8xlarge": 12.24,
    "p3.16xlarge": 24.48,
    # Add more as needed
}

# Other service pricing (per hour or per month)
EBS_STORAGE_PER_GB_MONTH = 0.10  # gp3 standard
EIP_CHARGE_PER_HOUR = 0.005  # When not attached to running instance
ALB_BASE_PER_HOUR = 0.0225  # Base ALB charge
ALB_LCU_PER_HOUR = 0.008  # Per LCU (simplified estimate)


def get_instance_hours(
    session: boto3.Session, instance_id: str, created_at: datetime
) -> tuple[float, str]:
    """
    Calculate instance runtime hours and get instance type.

    Args:
        session: boto3 session
        instance_id: EC2 instance ID
        created_at: When instance was created

    Returns:
        Tuple of (hours_running, instance_type)
    """
    ec2 = session.client("ec2")
    try:
        response = ec2.describe_instances(InstanceIds=[instance_id])
        if not response.get("Reservations"):
            return 0.0, "unknown"

        instance = response["Reservations"][0]["Instances"][0]
        instance_type = instance.get("InstanceType", "unknown")
        state = instance.get("State", {}).get("Name", "unknown")

        # Get launch time
        launch_time = instance.get("LaunchTime")
        if not launch_time:
            return 0.0, instance_type

        # Calculate hours
        now = datetime.now(timezone.utc)
        if isinstance(launch_time, str):
            launch_time = datetime.fromisoformat(launch_time.replace("Z", "+00:00"))
        elif launch_time.tzinfo is None:
            launch_time = launch_time.replace(tzinfo=timezone.utc)

        # If stopped, try to get stop time from state transitions
        if state == "stopped":
            # For stopped instances, we'd need to check CloudTrail or use tags
            # For now, calculate from launch to now (will overestimate)
            delta = now - launch_time
        else:
            delta = now - launch_time

        hours = delta.total_seconds() / 3600.0
        return max(0.0, hours), instance_type
    except ClientError as e:
        logger.warning(f"Error getting instance hours for {instance_id}: {e}")
        return 0.0, "unknown"


def get_ebs_storage_gb(session: boto3.Session, instance_id: str) -> float:
    """
    Get total EBS storage size for an instance.

    Args:
        session: boto3 session
        instance_id: EC2 instance ID

    Returns:
        Total storage size in GB
    """
    ec2 = session.client("ec2")
    try:
        response = ec2.describe_instances(InstanceIds=[instance_id])
        if not response.get("Reservations"):
            return 0.0

        instance = response["Reservations"][0]["Instances"][0]
        block_devices = instance.get("BlockDeviceMappings", [])

        total_gb = 0.0
        for bdm in block_devices:
            if "Ebs" in bdm:
                volume_id = bdm["Ebs"]["VolumeId"]
                try:
                    volumes = ec2.describe_volumes(VolumeIds=[volume_id])
                    if volumes.get("Volumes"):
                        volume = volumes["Volumes"][0]
                        size_gb = volume.get("Size", 0)
                        total_gb += size_gb
                except ClientError:
                    pass

        return total_gb
    except ClientError as e:
        logger.warning(f"Error getting EBS storage for {instance_id}: {e}")
        return 0.0


def get_eip_charge_hours(
    session: boto3.Session, allocation_id: str, instance_id: str | None
) -> float:
    """
    Calculate Elastic IP charge hours.

    Args:
        session: boto3 session
        allocation_id: Elastic IP allocation ID
        instance_id: Associated instance ID (if any)

    Returns:
        Hours charged for EIP
    """
    ec2 = session.client("ec2")
    try:
        response = ec2.describe_addresses(AllocationIds=[allocation_id])
        if not response.get("Addresses"):
            return 0.0

        address = response["Addresses"][0]
        associated_instance = address.get("InstanceId")

        # EIP is free when attached to running instance
        if associated_instance:
            # Check if instance is running
            try:
                instances = ec2.describe_instances(InstanceIds=[associated_instance])
                if instances.get("Reservations"):
                    state = (
                        instances["Reservations"][0]["Instances"][0]
                        .get("State", {})
                        .get("Name", "unknown")
                    )
                    if state == "running":
                        return 0.0  # Free when attached to running instance
            except ClientError:
                pass

        # If not attached to running instance, charge applies
        # For simplicity, estimate from allocation time or project creation
        # In practice, you'd track when EIP was allocated
        return 0.0  # Will be calculated based on project creation time
    except ClientError as e:
        logger.warning(f"Error getting EIP status for {allocation_id}: {e}")
        return 0.0


def estimate_project_cost(
    session: boto3.Session,
    project_name: str,
    resources: dict[str, Any],
    created_at: datetime,
    period_start: datetime | None = None,
    period_end: datetime | None = None,
) -> CostEstimate:
    """
    Estimate cost for a project based on resources and runtime.

    Args:
        session: boto3 session
        project_name: Project name
        resources: Resources dictionary from project state
        created_at: When project was created
        period_start: Start of cost period (defaults to created_at)
        period_end: End of cost period (defaults to now)

    Returns:
        CostEstimate with breakdown
    """
    if period_start is None:
        period_start = created_at
    if period_end is None:
        period_end = datetime.now(timezone.utc)

    breakdown: dict[str, float] = {}
    total_cost = 0.0

    # EC2 Instance costs
    if "instance" in resources:
        instance_id = resources["instance"]
        hours, instance_type = get_instance_hours(session, instance_id, created_at)
        hourly_rate = INSTANCE_PRICING.get(instance_type, 0.1)  # Default $0.10/hr
        instance_cost = hours * hourly_rate
        breakdown["ec2_instance"] = instance_cost
        total_cost += instance_cost

        # EBS Storage costs
        storage_gb = get_ebs_storage_gb(session, instance_id)
        days = (period_end - period_start).total_seconds() / 86400.0
        ebs_cost = storage_gb * (days / 30.0) * EBS_STORAGE_PER_GB_MONTH
        breakdown["ebs_storage"] = ebs_cost
        total_cost += ebs_cost

    # Elastic IP costs
    if "elastic_ip" in resources:
        allocation_id = resources["elastic_ip"]
        instance_id = resources.get("instance")
        eip_hours = get_eip_charge_hours(session, allocation_id, instance_id)

        # If EIP is not attached to running instance, charge applies
        # Estimate based on project lifetime
        if instance_id:
            hours, _ = get_instance_hours(session, instance_id, created_at)
            # Check if instance is currently running
            ec2 = session.client("ec2")
            try:
                response = ec2.describe_instances(InstanceIds=[instance_id])
                if response.get("Reservations"):
                    state = (
                        response["Reservations"][0]["Instances"][0]
                        .get("State", {})
                        .get("Name", "stopped")
                    )
                    if state != "running":
                        # Charge for EIP when instance is stopped
                        days = (period_end - period_start).total_seconds() / 86400.0
                        eip_cost = (days * 24) * EIP_CHARGE_PER_HOUR
                        breakdown["elastic_ip"] = eip_cost
                        total_cost += eip_cost
            except ClientError:
                pass

    # ALB costs
    if "alb" in resources:
        # ALB charges per hour regardless of traffic (simplified)
        days = (period_end - period_start).total_seconds() / 86400.0
        alb_hours = days * 24
        alb_cost = alb_hours * ALB_BASE_PER_HOUR
        breakdown["alb"] = alb_cost
        total_cost += alb_cost

    return CostEstimate(
        project_name=project_name,
        estimated_cost=round(total_cost, 4),
        actual_cost=None,
        period_start=period_start,
        period_end=period_end,
        breakdown=breakdown,
    )


def get_aws_cost_explorer_cost(
    session: boto3.Session,
    project_name: str,
    start_date: datetime,
    end_date: datetime,
) -> float | None:
    """
    Get actual cost from AWS Cost Explorer API.

    Args:
        session: boto3 session
        project_name: Project name (used for tag filtering)
        start_date: Start of period
        end_date: End of period

    Returns:
        Actual cost in USD, or None if unavailable
    """
    try:
        ce = session.client("ce")
        response = ce.get_cost_and_usage(
            TimePeriod={
                "Start": start_date.strftime("%Y-%m-%d"),
                "End": end_date.strftime("%Y-%m-%d"),
            },
            Granularity="DAILY",
            Metrics=["UnblendedCost"],
            Filter={
                "Tags": {
                    "Key": "pocket-architect-project",
                    "Values": [project_name],
                }
            },
        )

        total_cost = 0.0
        for result in response.get("ResultsByTime", []):
            amount = result.get("Total", {}).get("UnblendedCost", {}).get("Amount", "0")
            total_cost += float(amount)

        return round(total_cost, 4) if total_cost > 0 else None
    except ClientError as e:
        error_code = e.response.get("Error", {}).get("Code", "")
        if error_code in ["AccessDenied", "UnauthorizedOperation"]:
            logger.warning(
                f"Cost Explorer access denied. Need 'ce:GetCostAndUsage' permission. Error: {e}"
            )
        else:
            logger.warning(f"Error getting cost from Cost Explorer: {e}")
        return None
    except Exception as e:
        logger.warning(f"Unexpected error getting cost from Cost Explorer: {e}")
        return None


def create_aws_budget(
    session: boto3.Session,
    project_name: str,
    budget_amount: float,
    account_id: str,
) -> bool:
    """
    Create an AWS Budget for a project.

    Args:
        session: boto3 session
        project_name: Project name
        budget_amount: Budget amount in USD
        account_id: AWS account ID

    Returns:
        True if created successfully, False otherwise
    """
    try:
        budgets = session.client("budgets")
        budget_name = f"pocket-architect-{project_name}"

        budgets.create_budget(
            AccountId=account_id,
            Budget={
                "BudgetName": budget_name,
                "BudgetLimit": {"Amount": str(budget_amount), "Unit": "USD"},
                "TimeUnit": "MONTHLY",
                "BudgetType": "COST",
                "CostFilters": {"TagKeyValue": [f"user$pocket-architect-project${project_name}"]},
            },
            NotificationsWithSubscribers=[
                {
                    "Notification": {
                        "NotificationType": "ACTUAL",
                        "ComparisonOperator": "GREATER_THAN",
                        "Threshold": 100.0,  # Alert at 100% of budget
                    },
                    "Subscribers": [
                        {
                            "SubscriptionType": "EMAIL",
                            "Address": "admin@example.com",  # Should be configurable
                        }
                    ],
                }
            ],
        )
        return True
    except ClientError as e:
        error_code = e.response.get("Error", {}).get("Code", "")
        if error_code in ["AccessDenied", "UnauthorizedOperation"]:
            logger.warning(
                f"Budget creation access denied. Need 'budgets:*' permission. Error: {e}"
            )
        else:
            logger.warning(f"Error creating AWS Budget: {e}")
        return False
    except Exception as e:
        logger.warning(f"Unexpected error creating AWS Budget: {e}")
        return False
