"""Key pair orchestration."""

from pathlib import Path

import boto3
from botocore.exceptions import ClientError

from pocket_architect.config import logger


def create_key_pair(
    session: boto3.Session, name: str, tags: list[dict] | None = None, save_path: Path | None = None
) -> str:
    """
    Create an EC2 key pair and save private key.

    Args:
        session: boto3 session
        name: Key pair name
        tags: Tags to apply
        save_path: Path to save private key (defaults to ~/.ssh/)

    Returns:
        Key pair name
    """
    ec2 = session.client("ec2")

    # Check if key pair already exists
    try:
        ec2.describe_key_pairs(KeyNames=[name])
        logger.warning(f"Key pair {name} already exists, reusing it")
        return name
    except ClientError:
        # Key pair doesn't exist, create it
        pass

    logger.info(f"Creating key pair {name}")

    key_response = ec2.create_key_pair(
        KeyName=name, TagSpecifications=[{"ResourceType": "key-pair", "Tags": tags or []}]
    )

    # Save private key
    if save_path is None:
        ssh_dir = Path.home() / ".ssh"
        ssh_dir.mkdir(mode=0o700, exist_ok=True)
        save_path = ssh_dir / f"{name}.pem"

    save_path.write_text(key_response["KeyMaterial"])
    save_path.chmod(0o600)

    logger.info(f"Created key pair {name} and saved to {save_path}")

    return name
