"""IAM role and instance profile orchestration."""

import json
import time
from typing import Any

import boto3
from botocore.exceptions import ClientError

from pocket_architect.config import logger
from pocket_architect.providers.aws.utils import make_name


def create_iam_role(
    session: boto3.Session,
    project_name: str,
    managed_policies: list[str] | None = None,
    tags: list[dict] | None = None,
) -> str:
    """
    Create an IAM role with EC2 trust policy.

    Args:
        session: boto3 session
        project_name: Project name
        managed_policies: List of managed policy ARNs to attach (default: S3FullAccess)
        tags: Tags to apply

    Returns:
        IAM role ARN
    """
    iam = session.client("iam")
    role_name = make_name(project_name, "role")

    # Default to S3 full access for ML workflows
    if managed_policies is None:
        managed_policies = ["arn:aws:iam::aws:policy/AmazonS3FullAccess"]

    # Trust policy for EC2 service
    trust_policy = {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Principal": {"Service": "ec2.amazonaws.com"},
                "Action": "sts:AssumeRole",
            }
        ],
    }

    try:
        # Check if role already exists
        try:
            existing_role = iam.get_role(RoleName=role_name)
            logger.info(f"IAM role {role_name} already exists, using existing role")
            role_arn = existing_role["Role"]["Arn"]
        except ClientError as e:
            if e.response["Error"]["Code"] == "NoSuchEntity":
                # Create new role
                logger.info(f"Creating IAM role {role_name}")
                response = iam.create_role(
                    RoleName=role_name,
                    AssumeRolePolicyDocument=json.dumps(trust_policy),
                    Description=f"IAM role for pocket-architect project {project_name}",
                    Tags=tags or [],
                )
                role_arn = response["Role"]["Arn"]
                logger.info(f"Created IAM role: {role_arn}")
            else:
                raise

        # Attach managed policies
        for policy_arn in managed_policies:
            try:
                iam.attach_role_policy(RoleName=role_name, PolicyArn=policy_arn)
                logger.info(f"Attached policy {policy_arn} to role {role_name}")
            except ClientError as e:
                if e.response["Error"]["Code"] == "EntityAlreadyExists":
                    logger.info(f"Policy {policy_arn} already attached to role {role_name}")
                else:
                    logger.warning(f"Failed to attach policy {policy_arn}: {e}")

        return role_arn

    except ClientError as e:
        logger.error(f"Error creating IAM role: {e}")
        raise


def create_instance_profile(
    session: boto3.Session,
    project_name: str,
    role_arn: str,
    tags: list[dict] | None = None,
) -> str:
    """
    Create an instance profile and attach IAM role.

    Args:
        session: boto3 session
        project_name: Project name
        role_arn: IAM role ARN to attach
        tags: Tags to apply

    Returns:
        Instance profile ARN
    """
    iam = session.client("iam")
    profile_name = make_name(project_name, "profile")
    role_name = role_arn.split("/")[-1]  # Extract role name from ARN

    try:
        # Check if instance profile already exists
        try:
            existing_profile = iam.get_instance_profile(InstanceProfileName=profile_name)
            profile_arn = existing_profile["InstanceProfile"]["Arn"]
            logger.info(f"Instance profile {profile_name} already exists")

            # Check if role is attached
            attached_roles = [
                role["RoleName"] for role in existing_profile["InstanceProfile"].get("Roles", [])
            ]
            if role_name not in attached_roles:
                # Add role to existing profile
                iam.add_role_to_instance_profile(
                    InstanceProfileName=profile_name, RoleName=role_name
                )
                logger.info(f"Added role {role_name} to existing instance profile")
        except ClientError as e:
            if e.response["Error"]["Code"] == "NoSuchEntity":
                # Create new instance profile
                logger.info(f"Creating instance profile {profile_name}")
                response = iam.create_instance_profile(
                    InstanceProfileName=profile_name,
                    Path="/",
                    Tags=tags or [],
                )
                profile_arn = response["InstanceProfile"]["Arn"]

                # Add role to instance profile
                iam.add_role_to_instance_profile(
                    InstanceProfileName=profile_name, RoleName=role_name
                )
                logger.info(f"Created instance profile: {profile_arn}")

                # Wait for instance profile to be ready (AWS needs a moment)
                max_attempts = 10
                for attempt in range(max_attempts):
                    try:
                        profile = iam.get_instance_profile(InstanceProfileName=profile_name)
                        if profile["InstanceProfile"].get("Roles"):
                            break
                    except ClientError:
                        pass
                    time.sleep(1)
            else:
                raise

        return profile_arn

    except ClientError as e:
        logger.error(f"Error creating instance profile: {e}")
        raise


def delete_iam_role(session: boto3.Session, project_name: str, resources: dict[str, Any]) -> None:
    """
    Delete IAM role and instance profile.

    Args:
        session: boto3 session
        project_name: Project name
        resources: Resources dictionary containing IAM resource IDs
    """
    iam = session.client("iam")
    profile_name = make_name(project_name, "profile")
    role_name = make_name(project_name, "role")

    # Delete instance profile first (must be done before role)
    if "iam_instance_profile" in resources or "iam_instance_profile_arn" in resources:
        try:
            # Remove role from instance profile
            try:
                iam.remove_role_from_instance_profile(
                    InstanceProfileName=profile_name, RoleName=role_name
                )
                logger.info(f"Removed role from instance profile {profile_name}")
            except ClientError as e:
                if e.response["Error"]["Code"] != "NoSuchEntity":
                    logger.warning(f"Error removing role from instance profile: {e}")

            # Delete instance profile
            try:
                iam.delete_instance_profile(InstanceProfileName=profile_name)
                logger.info(f"Deleted instance profile {profile_name}")
            except ClientError as e:
                if e.response["Error"]["Code"] == "NoSuchEntity":
                    logger.info(f"Instance profile {profile_name} already deleted")
                else:
                    logger.warning(f"Error deleting instance profile: {e}")
        except Exception as e:
            logger.warning(f"Error cleaning up instance profile: {e}")

    # Delete IAM role
    if "iam_role" in resources or "iam_role_arn" in resources:
        try:
            # Detach all managed policies
            try:
                attached_policies = iam.list_attached_role_policies(RoleName=role_name)
                for policy in attached_policies.get("AttachedPolicies", []):
                    try:
                        iam.detach_role_policy(RoleName=role_name, PolicyArn=policy["PolicyArn"])
                        logger.info(f"Detached policy {policy['PolicyArn']} from role {role_name}")
                    except ClientError as e:
                        logger.warning(f"Error detaching policy: {e}")
            except ClientError as e:
                if e.response["Error"]["Code"] != "NoSuchEntity":
                    logger.warning(f"Error listing attached policies: {e}")

            # Delete the role
            try:
                iam.delete_role(RoleName=role_name)
                logger.info(f"Deleted IAM role {role_name}")
            except ClientError as e:
                if e.response["Error"]["Code"] == "NoSuchEntity":
                    logger.info(f"IAM role {role_name} already deleted")
                else:
                    logger.warning(f"Error deleting IAM role: {e}")
        except Exception as e:
            logger.warning(f"Error cleaning up IAM role: {e}")
