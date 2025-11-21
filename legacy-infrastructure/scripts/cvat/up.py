"""Up command implementation - Start infrastructure"""

import re
import sys
from pathlib import Path

import click
from rich.console import Console
from rich.panel import Panel
from rich.prompt import Confirm, Prompt
from rich.table import Table

from .aws import AWSClients
from .config import get_config_value, parse_tfvars, update_config_value
from .terraform import (
    is_terraform_initialized,
    terraform_apply,
    terraform_init,
    terraform_output,
    terraform_plan,
)
from .utils import get_project_paths, get_tfvars_path

console = Console()


def cleanup_extra_elastic_ips(aws_clients: AWSClients, region: str) -> None:
    """Clean up extra Elastic IPs, keeping only the one tagged cvat-ui-ssh-ip.
    
    Args:
        aws_clients: AWS clients instance
        region: AWS region
    """
    console.print("[cyan]🧹 Cleaning up extra Elastic IPs...[/cyan]")
    
    all_eips = aws_clients.get_all_elastic_ips()
    keep_eip = aws_clients.get_elastic_ip_by_tag("Name", "cvat-ui-ssh-ip")
    cleaned_count = 0
    
    for eip in all_eips:
        alloc_id = eip.get("AllocationId")
        if not alloc_id or alloc_id == keep_eip:
            continue
        
        assoc_id = eip.get("AssociationId")
        
        # Check if associated with ALB network interface
        if assoc_id and assoc_id != "None":
            network_interface_id = eip.get("NetworkInterfaceId")
            if network_interface_id:
                eni_desc = aws_clients.get_network_interface_description(network_interface_id)
                if eni_desc and "ELB" in eni_desc:
                    # Disassociate from ALB network interface
                    aws_clients.disassociate_address(assoc_id)
                    # Release the EIP
                    if aws_clients.release_elastic_ip(alloc_id):
                        cleaned_count += 1
                    continue
        
        # Clean up unassociated EIPs
        if not assoc_id or assoc_id == "None":
            if aws_clients.release_elastic_ip(alloc_id):
                cleaned_count += 1
    
    if cleaned_count > 0:
        console.print(f"  [green]✅ Cleaned up {cleaned_count} extra Elastic IP(s)[/green]")
    else:
        console.print("  [green]✅ No extra Elastic IPs to clean up[/green]")
    console.print()


@click.command()
def up():
    """Start infrastructure - Enable EC2 instances and create ALB."""
    project_root, terraform_dir, configs_dir = get_project_paths()
    tfvars_path = get_tfvars_path(configs_dir)
    state_file = terraform_dir / "state" / "terraform.tfstate"
    var_file = Path("../configs/terraform.tfvars")
    
    console.print(Panel.fit(
        "[bold cyan]🚀 Starting Infrastructure[/bold cyan]",
        border_style="cyan",
    ))
    console.print()
    
    # Check if terraform is initialized
    if not is_terraform_initialized(terraform_dir):
        console.print("[yellow]⚠️  Terraform has not been initialized![/yellow]\n")
        if not Confirm.ask("   Would you like to run 'terraform init' now?", default=True):
            console.print("   Skipping init. Please run 'cd terraform && terraform init' manually.")
            sys.exit(1)
        
        console.print("\n[cyan]🔧 Initializing Terraform...[/cyan]")
        if not terraform_init(terraform_dir):
            console.print("[red]❌ Terraform init failed![/red]")
            sys.exit(1)
        console.print("   [green]✅ Terraform initialized![/green]\n")
    
    # Check if terraform.tfvars exists
    if not tfvars_path.exists():
        console.print("[red]❌ Error: configs/terraform.tfvars not found![/red]\n")
        console.print("[bold]📋 Please run: python scripts/cvat.py setup[/bold]\n")
        sys.exit(1)
    
    # Check if already enabled
    enable_infra = get_config_value(tfvars_path, "enable_infrastructure", "true")
    if enable_infra == "true":
        console.print("[yellow]⚠️  Infrastructure is already enabled![/yellow]\n")
    
    # Enable infrastructure in terraform.tfvars
    update_config_value(tfvars_path, "enable_infrastructure", "true")
    console.print("[cyan]📝 Configuration updated: enable_infrastructure = true[/cyan]\n")
    
    # Offer to run plan first
    if Confirm.ask("   Would you like to run 'terraform plan' first to preview changes?", default=True):
        console.print("\n[cyan]🔍 Running Terraform plan...[/cyan]")
        plan_exit_code, plan_output = terraform_plan(terraform_dir, state_file, var_file, capture_output=False)
        console.print()
        
        # Check if plan shows resources that might already exist
        if "will be created" in plan_output.lower() and any(
            resource in plan_output.lower()
            for resource in ["aws_iam_role", "aws_iam_instance_profile", "aws_security_group"]
        ):
            console.print()
            console.print("[yellow]⚠️  Plan shows IAM/Security Group resources will be created.[/yellow]")
            console.print("   These might already exist in AWS (not in Terraform state).")
            if Confirm.ask("   Would you like to import existing resources now (recommended)?", default=True):
                console.print("   → Running setup to import existing resources...")
                # Import would be handled by setup command
                console.print("   [dim]Run: python scripts/cvat.py setup[/dim]\n")
                if Confirm.ask("   Would you like to run plan again to see updated changes?", default=True):
                    console.print("\n[cyan]🔍 Running Terraform plan again...[/cyan]")
                    terraform_plan(terraform_dir, state_file, var_file, capture_output=False)
                    console.print()
        
        if not Confirm.ask("   Continue with apply?", default=True):
            console.print("   Skipping apply.")
            sys.exit(0)
        console.print()
    
    console.print("[cyan]🔧 Applying Terraform configuration...[/cyan]\n")
    
    # Run terraform apply
    apply_exit_code, apply_output = terraform_apply(terraform_dir, state_file, var_file, capture_output=False)
    
    if apply_exit_code != 0:
        console.print()
        console.print(Panel.fit(
            "[bold red]❌ Terraform Apply Failed[/bold red]",
            border_style="red",
        ))
        console.print()
        
        # Check for "EntityAlreadyExists" or "already exists" errors
        if re.search(r"EntityAlreadyExists|already exists", apply_output, re.IGNORECASE):
            console.print("[yellow]⚠️  Detected: Resource already exists in AWS but not in Terraform state[/yellow]\n")
            if Confirm.ask("   Would you like to run 'python scripts/cvat.py setup' to import existing resources?", default=True):
                console.print("   → Run: python scripts/cvat.py setup")
                console.print("   → Then retry: python scripts/cvat.py up\n")
        
        console.print("[bold]🔍 Common issues and solutions:[/bold]\n")
        console.print("  1. If you see 'Invalid count argument' or dependency errors:")
        if Confirm.ask("     → Would you like to try running 'terraform init' again?", default=True):
            console.print("     → Running terraform init...")
            if terraform_init(terraform_dir):
                console.print("     → [green]✅ Init successful![/green]")
                if Confirm.ask("     → Would you like to retry apply?", default=True):
                    console.print()
                    console.print("[cyan]🔧 Retrying Terraform apply...[/cyan]")
                    apply_exit_code, _ = terraform_apply(terraform_dir, state_file, var_file, capture_output=False)
                    if apply_exit_code == 0:
                        sys.exit(0)
        
        console.print("     → Manual steps: cd terraform && terraform init\n")
        console.print("  2. If you see credential errors:")
        console.print("     → Configure AWS credentials: aws configure")
        console.print("     → Or set AWS_PROFILE environment variable\n")
        console.print("  3. For other errors, check the output above for details\n")
        sys.exit(1)
    
    console.print()
    console.print(Panel.fit(
        "[bold green]✅ Infrastructure Status: UP[/bold green]",
        border_style="green",
    ))
    console.print()
    
    # Clean up extra Elastic IPs
    region = get_config_value(tfvars_path, "aws_region", "us-east-2")
    aws_clients = AWSClients(region=region)
    cleanup_extra_elastic_ips(aws_clients, region)
    
    # Get outputs
    elastic_ip = terraform_output(terraform_dir, state_file, "elastic_ip")
    instance_id = terraform_output(terraform_dir, state_file, "instance_id")
    status = terraform_output(terraform_dir, state_file, "infrastructure_status")
    domain = terraform_output(terraform_dir, state_file, "domain_name")
    https_url = terraform_output(terraform_dir, state_file, "https_url")
    http_url = terraform_output(terraform_dir, state_file, "http_url")
    cvat_url = terraform_output(terraform_dir, state_file, "cvat_url_subdomain")
    ssh_key = get_config_value(tfvars_path, "ssh_key_name")
    
    # Infrastructure Details
    table = Table(title="📦 Infrastructure Resources", show_header=False, box=None)
    if instance_id:
        table.add_row("🖥️  EC2 Instance:", instance_id)
    if elastic_ip:
        table.add_row("🌐 Elastic IP:", elastic_ip)
    if status:
        table.add_row("📊 Status:", status)
    console.print(table)
    console.print()
    
    # Access Information
    access_table = Table(title="🔗 Access Information", show_header=False, box=None)
    
    # SSH Access
    if elastic_ip and ssh_key:
        access_table.add_row("🔐 SSH Access:", f"ssh -i ~/.ssh/{ssh_key}.pem ubuntu@{elastic_ip}")
        access_table.add_row("", "")
    
    # Web Access
    if https_url:
        access_table.add_row("🌐 Web Access (HTTPS):", https_url)
        if cvat_url:
            access_table.add_row("", cvat_url)
    elif http_url:
        access_table.add_row("🌐 Web Access (HTTP):", http_url)
        if cvat_url:
            access_table.add_row("", cvat_url)
    
    if domain and not https_url and not http_url:
        access_table.add_row("⚠️  Domain configured but no URL available yet", "DNS may still be propagating")
    
    console.print(access_table)
    console.print()
    
    console.print(Panel.fit(
        "[bold]💡 Next Steps[/bold]\n"
        "  • EC2 instance is starting (may take 1-2 minutes to be ready)\n"
        "  • Check status: cd terraform && terraform output -state=state/terraform.tfstate infrastructure_status\n"
        "  • To stop infrastructure: python scripts/cvat.py down",
        border_style="cyan",
    ))
    console.print()

