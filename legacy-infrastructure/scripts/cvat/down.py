"""Down command implementation - Stop infrastructure"""

import re
import sys
from pathlib import Path

import click
from rich.console import Console
from rich.panel import Panel
from rich.prompt import Confirm
from rich.table import Table

from .config import get_config_value, update_config_value
from .terraform import (
    is_terraform_initialized,
    terraform_apply,
    terraform_init,
    terraform_output,
    terraform_plan,
)
from .utils import get_project_paths, get_tfvars_path

console = Console()


@click.command()
def down():
    """Stop infrastructure - Disable EC2 instances and destroy ALB."""
    project_root, terraform_dir, configs_dir = get_project_paths()
    tfvars_path = get_tfvars_path(configs_dir)
    state_file = terraform_dir / "state" / "terraform.tfstate"
    var_file = Path("../configs/terraform.tfvars")
    
    console.print(Panel.fit(
        "[bold red]🛑 Stopping Infrastructure[/bold red]",
        border_style="red",
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
    
    # Check if already disabled
    enable_infra = get_config_value(tfvars_path, "enable_infrastructure", "true")
    if enable_infra == "false":
        console.print("[yellow]⚠️  Infrastructure is already disabled![/yellow]\n")
    
    # Get current instance info before stopping
    instance_id = terraform_output(terraform_dir, state_file, "instance_id")
    elastic_ip = terraform_output(terraform_dir, state_file, "elastic_ip")
    
    # Disable infrastructure in terraform.tfvars
    update_config_value(tfvars_path, "enable_infrastructure", "false")
    console.print("[cyan]📝 Configuration updated: enable_infrastructure = false[/cyan]\n")
    
    # Offer to run plan first
    if Confirm.ask("   Would you like to run 'terraform plan' first to preview changes?", default=True):
        console.print("\n[cyan]🔍 Running Terraform plan...[/cyan]")
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
        console.print("  2. If you see 'EntityAlreadyExists' or 'already exists' errors:")
        console.print("     → This usually means a resource exists in AWS but not in Terraform state")
        console.print("     → For teardown, this is often fine - the resource will remain in AWS")
        console.print("     → If you want to manage it with Terraform, run 'python scripts/cvat.py setup' to import it\n")
        console.print("  3. If you see credential errors:")
        console.print("     → Configure AWS credentials: aws configure")
        console.print("     → Or set AWS_PROFILE environment variable\n")
        console.print("  4. For other errors, check the output above for details\n")
        sys.exit(1)
    
    console.print()
    console.print(Panel.fit(
        "[bold green]✅ Infrastructure Status: DOWN[/bold green]",
        border_style="green",
    ))
    console.print()
    
    # What was stopped/destroyed
    stopped_table = Table(title="🛑 Resources Stopped/Destroyed", show_header=False, box=None)
    if instance_id:
        stopped_table.add_row("🖥️  EC2 Instance:", "Stopped (data preserved on EBS volume)")
    stopped_table.add_row("⚖️  Application Load Balancer:", "Destroyed")
    stopped_table.add_row("🔒 Security Groups:", "Destroyed (ALB-related)")
    stopped_table.add_row("🌐 Route 53 Records:", "Removed from Terraform management")
    if elastic_ip:
        stopped_table.add_row("🌐 Elastic IP:", "Preserved (will be reused on next up)")
    console.print(stopped_table)
    console.print()
    
    # Cost savings
    cost_table = Table(title="💰 Cost Savings", show_header=False, box=None)
    cost_table.add_row("• EC2 compute charges:", "Stopped")
    cost_table.add_row("• ALB charges (~$16-22/mo):", "Stopped")
    cost_table.add_row("• EBS storage (~$1.50/mo):", "Still charged (data preserved)")
    console.print(cost_table)
    console.print()
    
    # Data preservation
    data_table = Table(title="💾 Data Preservation", show_header=False, box=None)
    data_table.add_row("• EBS volumes:", "Preserved (data safe)")
    data_table.add_row("• Snapshots:", "Preserved (checkpoints intact)")
    data_table.add_row("• Elastic IP:", "Preserved (tagged cvat-ui-ssh-ip, will be reused on next start)")
    console.print(data_table)
    console.print()
    
    console.print(Panel.fit(
        "[bold]💡 To Start Again[/bold]\n  Run: python scripts/cvat.py up",
        border_style="cyan",
    ))
    console.print()

