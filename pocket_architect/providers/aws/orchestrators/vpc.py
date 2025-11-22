"""VPC orchestration."""

import boto3
from botocore.exceptions import ClientError

from pocket_architect.config import logger
from pocket_architect.providers.aws.utils import make_name
from pocket_architect.state.manager import list_projects, load_project_state


def find_next_cidr(session: boto3.Session) -> str:
    """
    Find the next available CIDR block for a new project.

    Scans existing projects to find the highest 10.X.0.0/16 in use,
    then returns 10.(X+1).0.0/16.

    Args:
        session: boto3 session

    Returns:
        CIDR block string (e.g., "10.1.0.0/16")
    """
    projects = list_projects()
    used_cidrs = []

    # Check existing projects for their VPC CIDRs
    ec2 = session.client("ec2")
    for project_name in projects:
        state = load_project_state(project_name)
        if state and "vpc" in state.resources:
            try:
                vpcs = ec2.describe_vpcs(VpcIds=[state.resources["vpc"]])
                if vpcs.get("Vpcs"):
                    cidr = vpcs["Vpcs"][0]["CidrBlock"]
                    if cidr.startswith("10."):
                        # Extract the second octet
                        parts = cidr.split(".")
                        if len(parts) >= 2:
                            try:
                                used_cidrs.append(int(parts[1]))
                            except ValueError:
                                pass
            except ClientError:
                # VPC might not exist anymore, skip
                pass

    # Find next available CIDR
    if not used_cidrs:
        return "10.1.0.0/16"

    max_cidr = max(used_cidrs)
    next_cidr = max_cidr + 1

    # Safety check: don't go above 10.255.0.0/16
    if next_cidr > 255:
        raise ValueError("No available CIDR blocks (exceeded 10.255.0.0/16)")

    return f"10.{next_cidr}.0.0/16"


def create_vpc(
    session: boto3.Session,
    project_name: str,
    cidr: str | None = None,
    tags: list[dict] | None = None,
) -> str:
    """
    Create a VPC with internet gateway.

    Args:
        session: boto3 session
        project_name: Project name
        cidr: CIDR block (auto-assigned if None)
        tags: Tags to apply

    Returns:
        VPC ID
    """
    ec2 = session.client("ec2")

    if cidr is None:
        cidr = find_next_cidr(session)

    logger.info(f"Creating VPC with CIDR {cidr} for project {project_name}")

    # Create VPC
    vpc_response = ec2.create_vpc(
        CidrBlock=cidr, TagSpecifications=[{"ResourceType": "vpc", "Tags": tags or []}]
    )
    vpc_id = vpc_response["Vpc"]["VpcId"]

    # Enable DNS hostnames
    ec2.modify_vpc_attribute(VpcId=vpc_id, EnableDnsHostnames={"Value": True})
    ec2.modify_vpc_attribute(VpcId=vpc_id, EnableDnsSupport={"Value": True})

    # Create and attach internet gateway
    igw_response = ec2.create_internet_gateway(
        TagSpecifications=[{"ResourceType": "internet-gateway", "Tags": tags or []}]
    )
    igw_id = igw_response["InternetGateway"]["InternetGatewayId"]

    ec2.attach_internet_gateway(InternetGatewayId=igw_id, VpcId=vpc_id)

    logger.info(f"Created VPC {vpc_id} with internet gateway {igw_id}")

    return vpc_id
