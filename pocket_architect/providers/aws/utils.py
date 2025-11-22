"""AWS utility functions."""

from datetime import datetime
from typing import Any

import boto3
from botocore.exceptions import ClientError

from pocket_architect.config import console, logger


def make_tags(project_name: str, owner: str, created_at: datetime) -> list[dict[str, str]]:
    """
    Create standard tags for pocket-architect resources.

    Args:
        project_name: Project name
        owner: Owner identifier (from AWS identity)
        created_at: Creation timestamp

    Returns:
        List of tag dictionaries
    """
    return [
        {"Key": "pocket-architect-project", "Value": project_name},
        {"Key": "pocket-architect-owner", "Value": owner},
        {"Key": "pocket-architect-created", "Value": created_at.isoformat()},
    ]


def make_name(project_name: str, resource_type: str) -> str:
    """
    Create a consistent resource name.

    Args:
        project_name: Project name
        resource_type: Resource type (e.g., 'vpc', 'subnet')

    Returns:
        Resource name
    """
    return f"pa-{project_name}-{resource_type}"


def wait_for_instance_running(ec2_client: Any, instance_id: str, timeout: int = 300) -> None:
    """
    Wait for an EC2 instance to be in running state.

    Args:
        ec2_client: boto3 EC2 client
        instance_id: Instance ID
        timeout: Timeout in seconds
    """
    waiter = ec2_client.get_waiter("instance_running")
    try:
        waiter.wait(
            InstanceIds=[instance_id], WaiterConfig={"Delay": 5, "MaxAttempts": timeout // 5}
        )
    except Exception as e:
        logger.warning(f"Timeout waiting for instance {instance_id}: {e}")


def cleanup_on_failure(
    resources: dict[str, Any], session: boto3.Session, project_name: str
) -> None:
    """
    Attempt to clean up resources created during a failed deployment.

    Args:
        resources: Dictionary of created resources by type
        session: boto3 session
        project_name: Project name for logging
    """
    console.print(f"[yellow]Attempting to clean up resources for {project_name}...[/yellow]")

    ec2 = session.client("ec2")
    elbv2 = session.client("elbv2")

    # Cleanup in reverse order of creation
    cleanup_order = [
        "alb",
        "target_group",
        "elastic_ip",
        "instance",
        "key_pair",
        "iam_instance_profile",
        "iam_role",
        "security_group",
        "subnet",
        "vpc",
    ]

    for resource_type in cleanup_order:
        if resource_type not in resources:
            continue

        try:
            if resource_type == "alb":
                alb_arn = resources.get("alb")
                if alb_arn:
                    elbv2.delete_load_balancer(LoadBalancerArn=alb_arn)
                    console.print(f"  [green]Deleted ALB: {alb_arn}[/green]")
            elif resource_type == "target_group":
                tg_arn = resources.get("target_group")
                if tg_arn:
                    elbv2.delete_target_group(TargetGroupArn=tg_arn)
                    console.print(f"  [green]Deleted Target Group: {tg_arn}[/green]")
            elif resource_type == "elastic_ip":
                eip_allocation_id = resources.get("elastic_ip")
                if eip_allocation_id:
                    ec2.release_address(AllocationId=eip_allocation_id)
                    console.print(f"  [green]Released Elastic IP: {eip_allocation_id}[/green]")
            elif resource_type == "instance":
                instance_id = resources.get("instance")
                if instance_id:
                    ec2.terminate_instances(InstanceIds=[instance_id])
                    console.print(f"  [green]Terminated instance: {instance_id}[/green]")
            elif resource_type == "key_pair":
                key_name = resources.get("key_pair")
                if key_name:
                    try:
                        ec2.delete_key_pair(KeyName=key_name)
                        console.print(f"  [green]Deleted key pair from AWS: {key_name}[/green]")
                    except Exception as e:
                        logger.warning(f"Failed to delete key pair from AWS: {e}")

                    # Delete local .pem file
                    from pathlib import Path

                    ssh_key_file = Path.home() / ".ssh" / f"{key_name}.pem"
                    if ssh_key_file.exists():
                        try:
                            ssh_key_file.unlink()
                            console.print(
                                f"  [green]Deleted local SSH key file: {ssh_key_file}[/green]"
                            )
                        except Exception as e:
                            logger.warning(f"Failed to delete local SSH key file: {e}")
            elif resource_type in ["iam_instance_profile", "iam_role"]:
                # IAM cleanup is handled together
                if resource_type == "iam_role":
                    try:
                        from pocket_architect.providers.aws.orchestrators import (
                            iam_role as iam_role_module,
                        )

                        iam_role_module.delete_iam_role(session, project_name, resources)
                        console.print(f"  [green]Cleaned up IAM resources[/green]")
                    except Exception as e:
                        logger.warning(f"Failed to cleanup IAM resources: {e}")
            elif resource_type == "security_group":
                sg_id = resources.get("security_group")
                if sg_id:
                    ec2.delete_security_group(GroupId=sg_id)
                    console.print(f"  [green]Deleted security group: {sg_id}[/green]")
            elif resource_type == "subnet":
                subnet_id = resources.get("subnet")
                if subnet_id:
                    ec2.delete_subnet(SubnetId=subnet_id)
                    console.print(f"  [green]Deleted subnet: {subnet_id}[/green]")
            elif resource_type == "vpc":
                vpc_id = resources.get("vpc")
                if vpc_id:
                    # Delete internet gateway first if exists
                    igws = ec2.describe_internet_gateways(
                        Filters=[{"Name": "attachment.vpc-id", "Values": [vpc_id]}]
                    )
                    for igw in igws.get("InternetGateways", []):
                        ec2.detach_internet_gateway(
                            InternetGatewayId=igw["InternetGatewayId"], VpcId=vpc_id
                        )
                        ec2.delete_internet_gateway(InternetGatewayId=igw["InternetGatewayId"])

                    ec2.delete_vpc(VpcId=vpc_id)
                    console.print(f"  [green]Deleted VPC: {vpc_id}[/green]")
        except ClientError as e:
            logger.warning(f"Failed to cleanup {resource_type}: {e}")

    console.print("[yellow]Cleanup attempt completed[/yellow]")
