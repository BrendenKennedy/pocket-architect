"""Interactive blueprint creation wizard."""

import yaml
from pathlib import Path

from rich.console import Console
from rich.prompt import Confirm, IntPrompt, Prompt

from pocket_architect.config import TEMPLATES_DIR, console as config_console
from pocket_architect.models import Blueprint

console = Console()


def create_blueprint_wizard() -> None:
    """Interactive wizard to create a new blueprint."""
    console.print("[bold cyan]Blueprint Creation Wizard[/bold cyan]")
    console.print()

    # Get blueprint name
    name = Prompt.ask("Blueprint name", default="my-blueprint")
    if not name.replace("-", "").replace("_", "").isalnum():
        console.print(
            "[red]Error: Blueprint name must be alphanumeric with dashes/underscores[/red]"
        )
        return

    # Check if blueprint already exists
    template_file = TEMPLATES_DIR / f"{name}.yaml"
    if template_file.exists():
        if not Confirm.ask(f"Blueprint '{name}' already exists. Overwrite?"):
            return

    # Get description
    description = Prompt.ask("Description", default="")

    # Get instance type
    instance_type = Prompt.ask("Instance type", default="t3.medium")

    # Get AMI configuration
    console.print("[cyan]AMI Configuration[/cyan]")
    console.print("  Leave empty to use default (Amazon Linux 2023)")
    console.print("  Examples:")
    console.print("    - Direct AMI ID: ami-0e2294e559390023a")
    console.print("    - Ubuntu 22.04: ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*")
    console.print("    - Amazon Linux: al2023-ami-*-x86_64")

    ami_choice = Prompt.ask("AMI (ID or name pattern, leave empty for default)", default="")

    ami_id = None
    ami_name = None
    ami_owner = "amazon"

    if ami_choice:
        if ami_choice.startswith("ami-"):
            # Direct AMI ID
            ami_id = ami_choice
            console.print(f"[green]Using AMI ID: {ami_id}[/green]")
        else:
            # AMI name pattern
            ami_name = ami_choice

            # Ask for owner if not Amazon
            owner_choice = Prompt.ask(
                "AMI Owner (amazon, aws-marketplace, or account-id, default: amazon)",
                default="amazon",
            )
            if owner_choice == "aws-marketplace":
                ami_owner = "aws-marketplace"
            elif owner_choice != "amazon":
                ami_owner = owner_choice

            console.print(f"[green]Using AMI pattern: {ami_name} (owner: {ami_owner})[/green]")

    # Get ports
    ports_input = Prompt.ask("Ports to open (comma-separated)", default="22")
    try:
        ports = [int(p.strip()) for p in ports_input.split(",")]
    except ValueError:
        console.print("[red]Error: Invalid port list[/red]")
        return

    # Networking: ALB or EIP
    use_alb = Confirm.ask("Use Application Load Balancer?", default=False)
    certificate_arn = None
    target_port = None
    use_eip = True

    # Always ask for certificate ARN (can be used later or for ALB)
    certificate_arn_input = Prompt.ask(
        "ACM Certificate ARN (required for HTTPS, leave empty if not using HTTPS)", default=""
    )
    certificate_arn = certificate_arn_input if certificate_arn_input else None

    if use_alb:
        if not certificate_arn:
            console.print(
                "[yellow]Warning: No certificate ARN provided, ALB will use HTTP only[/yellow]"
            )
            if not Confirm.ask("Continue with HTTP-only ALB?", default=True):
                return
        target_port = IntPrompt.ask("Target port (backend port)", default=8080)
        use_eip = False  # Don't use EIP if using ALB
    else:
        use_eip = Confirm.ask("Use Elastic IP?", default=True)
        if not use_eip:
            console.print(
                "[yellow]Warning: No ALB and no EIP - instance will only be accessible via VPC[/yellow]"
            )
        # Still ask for target port in case they want to use ALB later
        target_port = IntPrompt.ask("Target port (for future ALB use)", default=8080)

    # User data (optional)
    user_data = None
    if Confirm.ask("Include user data script?", default=False):
        console.print("Enter user data script (end with empty line):")
        lines = []
        while True:
            line = input()
            if not line:
                break
            lines.append(line)
        user_data = "\n".join(lines) if lines else None

    # Build resources dict - blueprint is source of truth for all config
    resources = {
        "instance_type": instance_type,
        "ports": ports,
        "use_alb": use_alb,
        "use_eip": use_eip,
        "certificate_arn": certificate_arn,  # Always store, even if None
        "target_port": target_port,  # Always store target port
    }

    # Add AMI configuration if specified
    if ami_id:
        resources["ami_id"] = ami_id
    elif ami_name:
        resources["ami_name"] = ami_name
        if ami_owner != "amazon":
            resources["ami_owner"] = ami_owner

    if user_data:
        resources["user_data"] = user_data

    # Create blueprint
    blueprint = Blueprint(
        name=name,
        description=description,
        provider="aws",
        resources=resources,
    )

    # Save to file
    TEMPLATES_DIR.mkdir(parents=True, exist_ok=True)
    with open(template_file, "w") as f:
        yaml.dump(blueprint.model_dump(), f, default_flow_style=False, sort_keys=False)

    console.print(f"[green]Blueprint '{name}' saved to {template_file}[/green]")
