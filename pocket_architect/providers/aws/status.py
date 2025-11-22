"""Resource status checking functions."""

from typing import Any

import boto3
from botocore.exceptions import ClientError

from pocket_architect.config import logger


def get_instance_status(ec2_client: Any, instance_id: str) -> dict[str, Any]:
    """
    Get EC2 instance status.

    Returns:
        dict with 'state', 'public_ip', 'private_ip', 'exists'
    """
    try:
        response = ec2_client.describe_instances(InstanceIds=[instance_id])
        if not response.get("Reservations"):
            return {"exists": False, "state": "not_found"}

        instance = response["Reservations"][0]["Instances"][0]
        return {
            "exists": True,
            "state": instance["State"]["Name"],
            "public_ip": instance.get("PublicIpAddress"),
            "private_ip": instance.get("PrivateIpAddress"),
            "instance_type": instance.get("InstanceType"),
        }
    except ClientError as e:
        logger.warning(f"Error checking instance {instance_id}: {e}")
        return {"exists": False, "state": "error", "error": str(e)}


def get_alb_status(elbv2_client: Any, alb_arn: str) -> dict[str, Any]:
    """
    Get ALB status.

    Returns:
        dict with 'state', 'dns_name', 'exists'
    """
    try:
        response = elbv2_client.describe_load_balancers(LoadBalancerArns=[alb_arn])
        if not response.get("LoadBalancers"):
            return {"exists": False, "state": "not_found"}

        alb = response["LoadBalancers"][0]
        return {
            "exists": True,
            "state": alb["State"]["Code"],
            "dns_name": alb.get("DNSName"),
            "scheme": alb.get("Scheme"),
        }
    except ClientError as e:
        logger.warning(f"Error checking ALB {alb_arn}: {e}")
        return {"exists": False, "state": "error", "error": str(e)}


def get_target_group_status(elbv2_client: Any, alb_arn: str) -> dict[str, Any]:
    """
    Get target group status for an ALB.

    Returns:
        dict with 'tg_arn', 'targets', 'healthy_count', 'unhealthy_count'
    """
    try:
        tgs = elbv2_client.describe_target_groups(LoadBalancerArn=alb_arn)
        if not tgs.get("TargetGroups"):
            return {"exists": False}

        tg = tgs["TargetGroups"][0]
        tg_arn = tg["TargetGroupArn"]

        # Get target health
        health = elbv2_client.describe_target_health(TargetGroupArn=tg_arn)
        targets = health.get("TargetHealthDescriptions", [])

        healthy = sum(1 for t in targets if t["TargetHealth"]["State"] == "healthy")
        unhealthy = len(targets) - healthy

        return {
            "exists": True,
            "tg_arn": tg_arn,
            "targets": [
                {
                    "id": t["Target"]["Id"],
                    "port": t["Target"]["Port"],
                    "state": t["TargetHealth"]["State"],
                    "reason": t["TargetHealth"].get("Reason"),
                }
                for t in targets
            ],
            "healthy_count": healthy,
            "unhealthy_count": unhealthy,
            "total_count": len(targets),
        }
    except ClientError as e:
        logger.warning(f"Error checking target group: {e}")
        return {"exists": False, "error": str(e)}


def get_eip_status(ec2_client: Any, allocation_id: str) -> dict[str, Any]:
    """
    Get Elastic IP status.

    Returns:
        dict with 'public_ip', 'associated', 'instance_id', 'exists'
    """
    try:
        response = ec2_client.describe_addresses(AllocationIds=[allocation_id])
        if not response.get("Addresses"):
            return {"exists": False, "state": "not_found"}

        address = response["Addresses"][0]
        return {
            "exists": True,
            "public_ip": address.get("PublicIp"),
            "associated": address.get("InstanceId") is not None,
            "instance_id": address.get("InstanceId"),
            "domain": address.get("Domain"),
        }
    except ClientError as e:
        logger.warning(f"Error checking Elastic IP: {e}")
        return {"exists": False, "state": "error", "error": str(e)}


def get_vpc_status(ec2_client: Any, vpc_id: str) -> dict[str, Any]:
    """
    Get VPC status.

    Returns:
        dict with 'state', 'cidr', 'exists'
    """
    try:
        response = ec2_client.describe_vpcs(VpcIds=[vpc_id])
        if not response.get("Vpcs"):
            return {"exists": False, "state": "not_found"}

        vpc = response["Vpcs"][0]
        return {
            "exists": True,
            "state": vpc["State"],
            "cidr": vpc.get("CidrBlock"),
        }
    except ClientError as e:
        logger.warning(f"Error checking VPC {vpc_id}: {e}")
        return {"exists": False, "state": "error", "error": str(e)}


def get_subnet_status(ec2_client: Any, subnet_id: str) -> dict[str, Any]:
    """
    Get subnet status.

    Returns:
        dict with 'state', 'cidr', 'az', 'exists'
    """
    try:
        response = ec2_client.describe_subnets(SubnetIds=[subnet_id])
        if not response.get("Subnets"):
            return {"exists": False, "state": "not_found"}

        subnet = response["Subnets"][0]
        return {
            "exists": True,
            "state": subnet["State"],
            "cidr": subnet.get("CidrBlock"),
            "az": subnet.get("AvailabilityZone"),
        }
    except ClientError as e:
        logger.warning(f"Error checking subnet {subnet_id}: {e}")
        return {"exists": False, "state": "error", "error": str(e)}


def get_security_group_status(ec2_client: Any, sg_id: str) -> dict[str, Any]:
    """
    Get security group status.

    Returns:
        dict with 'exists', 'name', 'description'
    """
    try:
        response = ec2_client.describe_security_groups(GroupIds=[sg_id])
        if not response.get("SecurityGroups"):
            return {"exists": False, "state": "not_found"}

        sg = response["SecurityGroups"][0]
        return {
            "exists": True,
            "name": sg.get("GroupName"),
            "description": sg.get("Description"),
        }
    except ClientError as e:
        logger.warning(f"Error checking security group {sg_id}: {e}")
        return {"exists": False, "state": "error", "error": str(e)}


def get_key_pair_status(ec2_client: Any, key_name: str) -> dict[str, Any]:
    """
    Get key pair status.

    Returns:
        dict with 'exists'
    """
    try:
        ec2_client.describe_key_pairs(KeyNames=[key_name])
        return {"exists": True}
    except ClientError as e:
        if "InvalidKeyPair.NotFound" in str(e):
            return {"exists": False, "state": "not_found"}
        logger.warning(f"Error checking key pair {key_name}: {e}")
        return {"exists": False, "state": "error", "error": str(e)}
