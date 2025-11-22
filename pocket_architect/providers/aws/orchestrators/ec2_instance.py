"""EC2 instance orchestration."""

import boto3

from pocket_architect.config import logger
from pocket_architect.providers.aws.utils import wait_for_instance_running


def create_instance(
    session: boto3.Session,
    ami_id: str,
    instance_type: str,
    subnet_id: str,
    sg_id: str,
    key_name: str,
    tags: list[dict] | None = None,
    user_data: str | None = None,
    iam_instance_profile_arn: str | None = None,
) -> str:
    """
    Create an EC2 instance.

    Args:
        session: boto3 session
        ami_id: AMI ID to launch from
        instance_type: Instance type (e.g., "t3.medium")
        subnet_id: Subnet ID
        sg_id: Security group ID
        key_name: Key pair name
        tags: Tags to apply
        user_data: Optional user data script
        iam_instance_profile_arn: Optional IAM instance profile ARN

    Returns:
        Instance ID
    """
    ec2 = session.client("ec2")

    logger.info(f"Creating EC2 instance {instance_type} from AMI {ami_id}")

    tag_spec = [{"ResourceType": "instance", "Tags": tags or []}]

    # Build run_instances parameters
    run_params = {
        "ImageId": ami_id,
        "InstanceType": instance_type,
        "MinCount": 1,
        "MaxCount": 1,
        "SubnetId": subnet_id,
        "SecurityGroupIds": [sg_id],
        "KeyName": key_name,
        "TagSpecifications": tag_spec,
    }

    # Only include UserData if provided
    if user_data:
        run_params["UserData"] = user_data

    # Include IAM instance profile if provided
    if iam_instance_profile_arn:
        run_params["IamInstanceProfile"] = {"Arn": iam_instance_profile_arn}
        logger.info(f"Attaching IAM instance profile: {iam_instance_profile_arn}")

    instance_response = ec2.run_instances(**run_params)

    instance_id = instance_response["Instances"][0]["InstanceId"]

    logger.info(f"Created instance {instance_id}, waiting for running state...")
    wait_for_instance_running(ec2, instance_id)

    # Get public IP
    instances = ec2.describe_instances(InstanceIds=[instance_id])
    public_ip = instances["Reservations"][0]["Instances"][0].get("PublicIpAddress", "N/A")

    logger.info(f"Instance {instance_id} is running with public IP {public_ip}")

    return instance_id
