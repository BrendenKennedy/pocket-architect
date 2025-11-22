"""AWS client and credential management."""

import boto3
from botocore.exceptions import ClientError, NoCredentialsError

from pocket_architect.config import console, get_aws_identity


def get_boto3_session(region_name: str = None) -> boto3.Session:
    """
    Get a configured boto3 session.

    Args:
        region_name: Optional AWS region name

    Returns:
        boto3.Session instance
    """
    return boto3.Session(region_name=region_name)


def verify_credentials() -> dict:
    """
    Verify AWS credentials and print identity.

    Returns:
        dict: Caller identity

    Raises:
        SystemExit: If credentials are invalid
    """
    return get_aws_identity()


def get_account_id() -> str:
    """
    Get AWS account ID.

    Returns:
        Account ID as string
    """
    identity = get_aws_identity()
    return identity["Account"]
