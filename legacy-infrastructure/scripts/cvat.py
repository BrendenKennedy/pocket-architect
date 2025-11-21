#!/usr/bin/env python3
"""CVAT Infrastructure Management CLI

A Python CLI tool for managing CVAT infrastructure on AWS using Terraform.
"""

import sys
from pathlib import Path

import click
from rich.console import Console

# Add scripts directory to path so we can import cvat package
scripts_dir = Path(__file__).parent
sys.path.insert(0, str(scripts_dir))

from cvat.checkpoint import checkpoint
from cvat.down import down
from cvat.setup import setup
from cvat.up import up

console = Console()


@click.group()
@click.version_option(version="1.0.0")
def cli():
    """CVAT Infrastructure Management CLI
    
    Manage your CVAT infrastructure on AWS with Terraform.
    """
    pass


# Add subcommands
cli.add_command(setup)
cli.add_command(up)
cli.add_command(down)
cli.add_command(checkpoint)


if __name__ == "__main__":
    cli()

