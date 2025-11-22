"""Configuration and constants for pocket-architect."""

import logging
import sys
from pathlib import Path

import boto3
from botocore.exceptions import ClientError, NoCredentialsError

from rich.console import Console

console = Console()

# Base directory for all pocket-architect data
PA_HOME = Path.home() / ".pocket-architect"
PROJECTS_DIR = PA_HOME / "projects"
SNAPSHOTS_FILE = PA_HOME / "snapshots.json"
TEMPLATES_DIR = PA_HOME / "templates"

# Cost tracking configuration
COST_LIMITS_FILE = PA_HOME / "cost_limits.json"
COST_HISTORY_FILE = PA_HOME / "cost_history.json"
GLOBAL_LIMIT_FILE = PA_HOME / "global_cost_limit.json"

# Ensure directories exist
PA_HOME.mkdir(exist_ok=True)
PROJECTS_DIR.mkdir(exist_ok=True)
TEMPLATES_DIR.mkdir(exist_ok=True)

# Logging setup
logger = logging.getLogger("pocket_architect")
logger.setLevel(logging.INFO)
handler = logging.StreamHandler(sys.stdout)
handler.setFormatter(logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s"))
logger.addHandler(handler)


def setup_verbose_logging() -> None:
    """Enable verbose logging including boto3 debug."""
    logger.setLevel(logging.DEBUG)
    logging.getLogger("boto3").setLevel(logging.DEBUG)
    logging.getLogger("botocore").setLevel(logging.DEBUG)
    logging.getLogger("urllib3").setLevel(logging.DEBUG)


def get_aws_identity() -> dict:
    """
    Get AWS caller identity and verify credentials.

    Returns:
        dict: Caller identity with 'Arn', 'UserId', 'Account'

    Raises:
        SystemExit: If credentials are not configured or invalid
    """
    try:
        sts = boto3.client("sts")
        identity = sts.get_caller_identity()
        return identity
    except NoCredentialsError:
        console.print("[red]Error: AWS credentials not configured[/red]")
        console.print("Please configure AWS credentials using:")
        console.print("  - AWS CLI: aws configure")
        console.print("  - Environment variables: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY")
        console.print("  - IAM role (if on EC2)")
        sys.exit(1)
    except ClientError as e:
        console.print(f"[red]Error: Failed to verify AWS credentials: {e}[/red]")
        sys.exit(1)


def print_aws_identity() -> dict:
    """
    Print AWS identity and return it.

    Returns:
        dict: Caller identity
    """
    identity = get_aws_identity()
    console.print(f"[green]You are operating as: {identity['Arn']}[/green]")
    console.print(f"All resources will be created in account: {identity['Account']}")
    return identity
