"""Subnet orchestration."""

import boto3

from pocket_architect.config import logger


def create_subnet(
    session: boto3.Session,
    vpc_id: str,
    cidr_block: str | None,
    availability_zone: str | None = None,
    tags: list[dict] | None = None,
) -> str:
    """
    Create a public subnet.

    Args:
        session: boto3 session
        vpc_id: VPC ID
        cidr_block: CIDR block for subnet (e.g., "10.1.1.0/24")
        availability_zone: Availability zone (auto-selected if None)
        tags: Tags to apply

    Returns:
        Subnet ID
    """
    ec2 = session.client("ec2")

    # Get VPC CIDR to determine subnet CIDR
    vpcs = ec2.describe_vpcs(VpcIds=[vpc_id])
    vpc_cidr = vpcs["Vpcs"][0]["CidrBlock"]

    # If no subnet CIDR provided, use first /24 from VPC
    if cidr_block is None:
        # Extract base from VPC CIDR (e.g., 10.1.0.0/16 -> 10.1.1.0/24)
        base = vpc_cidr.split("/")[0]
        parts = base.split(".")
        cidr_block = f"{parts[0]}.{parts[1]}.1.0/24"

    # Get availability zones if not specified
    if availability_zone is None:
        azs = ec2.describe_availability_zones()
        availability_zone = azs["AvailabilityZones"][0]["ZoneName"]

    logger.info(f"Creating subnet {cidr_block} in {availability_zone} for VPC {vpc_id}")

    subnet_response = ec2.create_subnet(
        VpcId=vpc_id,
        CidrBlock=cidr_block,
        AvailabilityZone=availability_zone,
        TagSpecifications=[{"ResourceType": "subnet", "Tags": tags or []}],
    )
    subnet_id = subnet_response["Subnet"]["SubnetId"]

    # Enable auto-assign public IP
    ec2.modify_subnet_attribute(SubnetId=subnet_id, MapPublicIpOnLaunch={"Value": True})

    # Create route table and route to internet gateway
    route_tables = ec2.describe_route_tables(Filters=[{"Name": "vpc-id", "Values": [vpc_id]}])
    route_table_id = route_tables["RouteTables"][0]["RouteTableId"]

    # Find internet gateway
    igws = ec2.describe_internet_gateways(
        Filters=[{"Name": "attachment.vpc-id", "Values": [vpc_id]}]
    )
    if igws.get("InternetGateways"):
        igw_id = igws["InternetGateways"][0]["InternetGatewayId"]
        ec2.create_route(
            RouteTableId=route_table_id, DestinationCidrBlock="0.0.0.0/0", GatewayId=igw_id
        )

    # Associate route table with subnet
    ec2.associate_route_table(RouteTableId=route_table_id, SubnetId=subnet_id)

    logger.info(f"Created subnet {subnet_id}")

    return subnet_id
