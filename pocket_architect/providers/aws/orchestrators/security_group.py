"""Security group orchestration."""

import boto3

from pocket_architect.config import logger


def create_sg(
    session: boto3.Session,
    name: str,
    vpc_id: str,
    ports: list[int],
    tags: list[dict] | None = None,
) -> str:
    """
    Create a security group with rules.

    Args:
        session: boto3 session
        name: Security group name
        vpc_id: VPC ID
        ports: List of ports to open (e.g., [22, 8080])
        tags: Tags to apply

    Returns:
        Security group ID
    """
    ec2 = session.client("ec2")

    logger.info(f"Creating security group {name} with ports {ports}")

    sg_response = ec2.create_security_group(
        GroupName=name,
        Description=f"Security group for {name}",
        VpcId=vpc_id,
        TagSpecifications=[{"ResourceType": "security-group", "Tags": tags or []}],
    )
    sg_id = sg_response["GroupId"]

    # Add ingress rules
    ip_permissions = []
    for port in ports:
        ip_permissions.append(
            {
                "IpProtocol": "tcp",
                "FromPort": port,
                "ToPort": port,
                "IpRanges": [{"CidrIp": "0.0.0.0/0", "Description": f"Allow {port} from anywhere"}],
            }
        )

    if ip_permissions:
        ec2.authorize_security_group_ingress(GroupId=sg_id, IpPermissions=ip_permissions)

    logger.info(f"Created security group {sg_id}")

    return sg_id
