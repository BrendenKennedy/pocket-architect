"""Application Load Balancer orchestration."""

import boto3
from botocore.exceptions import ClientError

from pocket_architect.config import logger


def create_alb(
    session: boto3.Session,
    name: str,
    subnets: list[str],
    sg_id: str,
    certificate_arn: str | None,
    target_port: int,
    tags: list[dict] | None = None,
) -> tuple[str, str]:
    """
    Create an Application Load Balancer.

    Args:
        session: boto3 session
        name: ALB name
        subnets: List of subnet IDs (at least 2 for ALB)
        sg_id: Security group ID
        certificate_arn: ACM certificate ARN (required for HTTPS)
        target_port: Target port for backend (e.g., 8080)
        tags: Tags to apply

    Returns:
        Tuple of (ALB ARN, ALB DNS name)
    """
    elbv2 = session.client("elbv2")

    logger.info(f"Creating Application Load Balancer {name}")

    # Ensure we have at least 2 subnets for ALB
    if len(subnets) < 2:
        # Get another subnet in a different AZ
        ec2 = session.client("ec2")
        subnet_info = ec2.describe_subnets(SubnetIds=[subnets[0]])
        vpc_id = subnet_info["Subnets"][0]["VpcId"]
        az = subnet_info["Subnets"][0]["AvailabilityZone"]

        # Get all AZs
        azs = ec2.describe_availability_zones()
        other_azs = [
            az_info["ZoneName"] for az_info in azs["AvailabilityZones"] if az_info["ZoneName"] != az
        ]

        if other_azs:
            # Get VPC CIDR to create second subnet
            vpcs = ec2.describe_vpcs(VpcIds=[vpc_id])
            vpc_cidr = vpcs["Vpcs"][0]["CidrBlock"]
            base = vpc_cidr.split("/")[0]
            parts = base.split(".")
            second_cidr = f"{parts[0]}.{parts[1]}.2.0/24"

            # Create second subnet
            from pocket_architect.providers.aws.orchestrators.subnet import create_subnet

            second_subnet = create_subnet(session, vpc_id, second_cidr, other_azs[0], tags)
            subnets.append(second_subnet)

    # Create ALB
    alb_response = elbv2.create_load_balancer(
        Name=name,
        Subnets=subnets,
        SecurityGroups=[sg_id],
        Scheme="internet-facing",
        Type="application",
        Tags=tags or [],
    )

    alb_arn = alb_response["LoadBalancers"][0]["LoadBalancerArn"]
    alb_dns = alb_response["LoadBalancers"][0]["DNSName"]

    logger.info(f"Created ALB {alb_arn} with DNS {alb_dns}")

    # Get VPC ID from first subnet
    ec2 = session.client("ec2")
    subnet_info = ec2.describe_subnets(SubnetIds=[subnets[0]])
    vpc_id = subnet_info["Subnets"][0]["VpcId"]

    # Create target group
    tg_name = f"{name}-tg"
    tg_response = elbv2.create_target_group(
        Name=tg_name,
        Protocol="HTTP",
        Port=target_port,
        VpcId=vpc_id,
        HealthCheckProtocol="HTTP",
        HealthCheckPort=str(target_port),  # Must be string
        HealthCheckPath="/",
        TargetType="instance",
        Tags=tags or [],
    )

    tg_arn = tg_response["TargetGroups"][0]["TargetGroupArn"]

    logger.info(f"Created target group {tg_arn}")

    # Create listener
    if certificate_arn:
        # HTTPS listener
        elbv2.create_listener(
            LoadBalancerArn=alb_arn,
            Protocol="HTTPS",
            Port=443,
            Certificates=[{"CertificateArn": certificate_arn}],
            DefaultActions=[{"Type": "forward", "TargetGroupArn": tg_arn}],
        )
        logger.info(f"Created HTTPS listener on port 443")
    else:
        # HTTP listener
        elbv2.create_listener(
            LoadBalancerArn=alb_arn,
            Protocol="HTTP",
            Port=80,
            DefaultActions=[{"Type": "forward", "TargetGroupArn": tg_arn}],
        )
        logger.info(f"Created HTTP listener on port 80")

    return alb_arn, alb_dns


def register_target(alb_arn: str, instance_id: str, session: boto3.Session) -> None:
    """
    Register an instance with an ALB target group.

    Args:
        alb_arn: ALB ARN (used to find target group)
        instance_id: Instance ID to register
        session: boto3 session
    """
    elbv2 = session.client("elbv2")

    # Find target group for this ALB
    target_groups = elbv2.describe_target_groups(LoadBalancerArn=alb_arn)
    if not target_groups.get("TargetGroups"):
        raise ValueError(f"No target group found for ALB {alb_arn}")

    tg_arn = target_groups["TargetGroups"][0]["TargetGroupArn"]

    logger.info(f"Registering instance {instance_id} with target group {tg_arn}")

    elbv2.register_targets(TargetGroupArn=tg_arn, Targets=[{"Id": instance_id}])

    logger.info(f"Registered instance {instance_id} with target group")
