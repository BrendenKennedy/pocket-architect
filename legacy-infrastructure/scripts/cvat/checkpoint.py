"""Checkpoint command implementation - Create snapshot and AMI"""

import sys
from datetime import datetime
from pathlib import Path

import click
from rich.console import Console
from rich.panel import Panel
from rich.prompt import Confirm, Prompt
from rich.progress import Progress, SpinnerColumn, TextColumn

from .aws import AWSClients
from .config import get_config_value, update_config_value
from .terraform import (
    is_terraform_initialized,
    terraform_init,
    terraform_output,
)
from .utils import get_project_paths, get_tfvars_path

console = Console()


@click.command()
def checkpoint():
    """Create a checkpoint: snapshot the current instance and create an AMI.
    
    This allows you to save your work at milestones and restore from those checkpoints later.
    """
    project_root, terraform_dir, configs_dir = get_project_paths()
    tfvars_path = get_tfvars_path(configs_dir)
    state_file = terraform_dir / "state" / "terraform.tfstate"
    
    console.print("[bold cyan]📸 Creating a new checkpoint...[/bold cyan]\n")
    
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
    
    # Get instance ID from terraform state
    instance_id = terraform_output(terraform_dir, state_file, "instance_id")
    if not instance_id:
        console.print("[red]❌ Error: Could not find instance ID. Make sure infrastructure is running.[/red]\n")
        console.print("[bold]💡 Run: python scripts/cvat.py up[/bold]\n")
        sys.exit(1)
    
    # Get region
    region = get_config_value(tfvars_path, "aws_region", "us-east-2")
    aws_clients = AWSClients(region=region)
    
    # Get volume ID from instance
    console.print(f"[cyan]📋 Getting root volume ID for instance {instance_id}...[/cyan]")
    volume_id = aws_clients.get_instance_root_volume_id(instance_id)
    
    if not volume_id:
        console.print(f"[red]❌ Error: Could not find root volume for instance {instance_id}.[/red]")
        sys.exit(1)
    
    console.print(f"[green]✅ Found volume: {volume_id}[/green]\n")
    
    # Prompt for checkpoint name
    checkpoint_name = Prompt.ask(
        "[bold]🏷️  Enter a checkpoint name[/bold] (e.g., 'cvat-configured', 'annotations-complete')",
        default=f"checkpoint-{datetime.now().strftime('%Y%m%d-%H%M%S')}",
    )
    
    console.print()
    console.print(f"[cyan]📸 Creating snapshot: {checkpoint_name}...[/cyan]")
    
    # Create snapshot
    snapshot_id = aws_clients.create_snapshot(
        volume_id=volume_id,
        description=f"Checkpoint: {checkpoint_name} - {datetime.now()}",
        tags=[
            {"Key": "Name", "Value": checkpoint_name},
            {"Key": "CheckpointPurpose", "Value": "CVAT Workstation"},
        ],
    )
    
    if not snapshot_id:
        console.print("[red]❌ Error: Failed to create snapshot.[/red]")
        sys.exit(1)
    
    console.print(f"[green]✅ Snapshot created: {snapshot_id}[/green]\n")
    console.print("[cyan]⏳ Waiting for snapshot to complete (this may take a few minutes)...[/cyan]")
    
    # Wait for snapshot to complete
    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        console=console,
    ) as progress:
        task = progress.add_task("Waiting for snapshot...", total=None)
        completed = aws_clients.wait_snapshot_completed(snapshot_id)
        progress.update(task, completed=True)
    
    if not completed:
        console.print("[red]❌ Error: Snapshot did not complete successfully.[/red]")
        sys.exit(1)
    
    console.print("[green]✅ Snapshot completed![/green]\n")
    
    # Create AMI from snapshot
    ami_name = f"cvat-from-snapshot-{snapshot_id[-8:]}"
    console.print(f"[cyan]🖼️  Creating AMI: {ami_name}...[/cyan]")
    
    ami_id = aws_clients.create_ami_from_snapshot(
        snapshot_id=snapshot_id,
        name=ami_name,
        description=f"Checkpoint AMI: {checkpoint_name}",
        tags=[
            {"Key": "Name", "Value": "cvat-checkpoint"},
            {"Key": "SnapshotID", "Value": snapshot_id},
            {"Key": "CheckpointPurpose", "Value": "CVAT Workstation"},
            {"Key": "CheckpointName", "Value": checkpoint_name},
        ],
    )
    
    if not ami_id:
        console.print("[red]❌ Error: Failed to create AMI from snapshot.[/red]")
        console.print(f"[dim]💡 You can manually create the AMI later or update {tfvars_path} with snapshot ID.[/dim]")
        sys.exit(1)
    
    console.print(f"[green]✅ AMI created: {ami_id}[/green]\n")
    
    # Update terraform.tfvars
    console.print("[cyan]📝 Updating configs/terraform.tfvars with new snapshot ID...[/cyan]")
    
    # Backup the file
    backup_path = terraform_dir / "state" / "terraform.tfvars.bak"
    if tfvars_path.exists():
        import shutil
        shutil.copy2(tfvars_path, backup_path)
    
    # Update snapshot ID
    update_config_value(tfvars_path, "root_volume_snapshot_id", snapshot_id)
    
    console.print(f"[green]✅ Updated configs/terraform.tfvars: root_volume_snapshot_id = \"{snapshot_id}\"[/green]\n")
    
    console.print(Panel.fit(
        "[bold green]✅ Checkpoint created successfully![/bold green]",
        border_style="green",
    ))
    console.print()
    
    summary_table = Table(title="📋 Summary", show_header=False, box=None)
    summary_table.add_row("Checkpoint Name:", checkpoint_name)
    summary_table.add_row("Snapshot ID:", snapshot_id)
    summary_table.add_row("AMI ID:", ami_id)
    console.print(summary_table)
    console.print()
    
    console.print("[bold]📝 Next steps:[/bold]\n")
    console.print("   1. Run 'cd terraform && terraform plan -state=state/terraform.tfstate' to see what will change")
    console.print("   2. Run 'cd terraform && terraform apply -state=state/terraform.tfstate' to use the new checkpoint")
    console.print("   3. To test the checkpoint, you can:")
    console.print("      - Destroy the instance: cd terraform && terraform destroy -target=aws_instance.cvat -state=state/terraform.tfstate")
    console.print("      - Recreate it: cd terraform && terraform apply -state=state/terraform.tfstate")
    console.print()
    console.print("[dim]💡 The snapshot and AMI are now saved. You can switch between checkpoints")
    console.print("   by updating 'root_volume_snapshot_id' in configs/terraform.tfvars[/dim]\n")

