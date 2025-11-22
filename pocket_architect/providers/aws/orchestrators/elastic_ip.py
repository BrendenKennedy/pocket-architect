"""Elastic IP orchestration."""

import boto3

from pocket_architect.config import logger


def allocate_eip(session: boto3.Session, tags: list[dict] | None = None) -> str:
    """
    Allocate an Elastic IP.

    Args:
        session: boto3 session
        tags: Tags to apply

    Returns:
        Allocation ID
    """
    ec2 = session.client("ec2")

    logger.info("Allocating Elastic IP")

    eip_response = ec2.allocate_address(
        Domain="vpc", TagSpecifications=[{"ResourceType": "elastic-ip", "Tags": tags or []}]
    )
    allocation_id = eip_response["AllocationId"]
    public_ip = eip_response["PublicIp"]

    logger.info(f"Allocated Elastic IP {public_ip} (AllocationId: {allocation_id})")

    return allocation_id


def associate_eip(session: boto3.Session, allocation_id: str, instance_id: str) -> str:
    """
    Associate an Elastic IP with an instance.

    Args:
        session: boto3 session
        allocation_id: Elastic IP allocation ID
        instance_id: Instance ID

    Returns:
        Public IP address
    """
    ec2 = session.client("ec2")

    logger.info(f"Associating Elastic IP {allocation_id} with instance {instance_id}")

    ec2.associate_address(AllocationId=allocation_id, InstanceId=instance_id)

    # Get the public IP
    addresses = ec2.describe_addresses(AllocationIds=[allocation_id])
    public_ip = addresses["Addresses"][0]["PublicIp"]

    logger.info(f"Associated Elastic IP {public_ip} with instance {instance_id}")

    return public_ip
