"""Setup command implementation"""

import re
import sys
from pathlib import Path
from typing import Optional

import click
import requests
from rich.console import Console
from rich.panel import Panel
from rich.prompt import Confirm, Prompt

from .aws import AWSClients
from .config import create_tfvars, get_config_value, parse_tfvars
from .terraform import (
    is_terraform_initialized,
    terraform_init,
    terraform_import,
    terraform_state_show,
)
from .utils import ensure_symlink, get_project_paths, get_tfvars_path

console = Console()


def detect_public_ip() -> Optional[str]:
    """Detect user's public IP address.
    
    Returns:
        IP address or None if detection failed
    """
    try:
        response = requests.get("https://ifconfig.me", timeout=5)
        if response.status_code == 200:
            return response.text.strip()
    except Exception:
        pass
    return None


def collect_config_interactive(
    aws_clients: AWSClients,
    existing_config: Optional[dict] = None,
) -> dict:
    """Interactively collect configuration values.
    
    Args:
        aws_clients: AWS clients instance
        existing_config: Existing configuration to use as defaults
        
    Returns:
        Dictionary of configuration values
    """
    config = {}
    
    console.print("\n[bold cyan]📋 Let's collect the required configuration values...[/bold cyan]\n")
    
    # AWS Region
    default_region = existing_config.get("aws_region", "us-east-2") if existing_config else "us-east-2"
    region = Prompt.ask(
        "[bold]1️⃣  AWS Region[/bold]",
        default=default_region,
    )
    config["aws_region"] = region
    console.print(f"   [green]✅[/green] Using region: {region}\n")
    
    # Recreate AWS clients with new region
    aws_clients = AWSClients(region=region)
    
    # Subnet ID
    while True:
        subnet_id = Prompt.ask(
            "[bold]2️⃣  Subnet ID (REQUIRED)[/bold]\n   This must be a public subnet with an Internet Gateway\n   Format: subnet-xxxxxxxxxxxxxxxxx",
        )
        if not subnet_id:
            console.print("   [red]❌ Subnet ID is required![/red]")
            continue
        if not subnet_id.startswith("subnet-"):
            if not Confirm.ask("   [yellow]⚠️  Warning: Subnet ID should start with 'subnet-'\n   Continue anyway?[/yellow]"):
                continue
        
        # Validate subnet
        console.print("   [cyan]🔍 Validating subnet...[/cyan]")
        vpc_id = aws_clients.get_vpc_id_from_subnet(subnet_id)
        if not vpc_id:
            console.print(f"   [red]❌ Error: Could not find subnet {subnet_id} in region {region}[/red]")
            console.print("   Please verify the subnet ID and AWS credentials")
            sys.exit(1)
        
        config["subnet_id"] = subnet_id
        config["vpc_id"] = vpc_id
        console.print(f"   [green]✅[/green] Found subnet in VPC: {vpc_id}\n")
        break
    
    # SSH Key Name
    while True:
        ssh_key = Prompt.ask(
            "[bold]3️⃣  EC2 Key Pair Name (REQUIRED)[/bold]\n   This is the name of an existing EC2 Key Pair",
        )
        if not ssh_key:
            console.print("   [red]❌ SSH key pair name is required![/red]")
            continue
        
        # Validate key pair
        console.print("   [cyan]🔍 Validating key pair...[/cyan]")
        if not aws_clients.validate_key_pair(ssh_key):
            if not Confirm.ask(
                f"   [yellow]⚠️  Warning: Key pair '{ssh_key}' not found in region {region}\n   Continue anyway?[/yellow]"
            ):
                continue
        
        config["ssh_key_name"] = ssh_key
        console.print(f"   [green]✅[/green] SSH key name: {ssh_key}\n")
        break
    
    # Public IP
    console.print("[bold]4️⃣  Your Public IP Address (REQUIRED)[/bold]")
    console.print("   This is used to restrict SSH and service access to your IP only")
    console.print("   We'll try to detect it automatically...")
    
    detected_ip = detect_public_ip()
    if detected_ip:
        console.print(f"   Detected IP: {detected_ip}")
        use_detected = Confirm.ask("   Use detected IP?", default=True)
        if use_detected:
            config["my_ip_cidr"] = f"{detected_ip}/32"
        else:
            manual_ip = Prompt.ask("   Enter your public IP address")
            config["my_ip_cidr"] = f"{manual_ip}/32"
    else:
        manual_ip = Prompt.ask("   Enter your public IP address")
        config["my_ip_cidr"] = f"{manual_ip}/32"
    
    console.print(f"   [green]✅[/green] Using IP: {config['my_ip_cidr']}\n")
    
    # Elastic IP
    console.print("[bold]5️⃣  Elastic IP[/bold]")
    console.print("   [green]✅[/green] Elastic IP will be automatically created for SSH access")
    console.print("   This provides a static IP that persists across instance replacements\n")
    
    # Domain Name
    domain = Prompt.ask(
        "[bold]6️⃣  Domain Name (OPTIONAL)[/bold]\n   Required only if you want DNS/SSL setup\n   Press Enter to skip",
        default="",
    )
    if domain:
        config["domain_name"] = domain
        console.print(f"   [green]✅[/green] Domain: {domain}")
        console.print("   [cyan]🔍 Checking for Route 53 hosted zone...[/cyan]")
        zone_id = aws_clients.get_route53_zone_id(domain)
        if zone_id:
            console.print("   [green]✅[/green] Hosted zone found")
        else:
            console.print(f"   [yellow]⚠️  Warning: No Route 53 hosted zone found for {domain}[/yellow]")
            console.print("   You'll need to create one before using DNS features")
    else:
        config["domain_name"] = None
        console.print("   [green]✅[/green] DNS/SSL disabled")
    console.print()
    
    # Snapshot ID
    snapshot_id = Prompt.ask(
        "[bold]7️⃣  Snapshot ID for Restore (OPTIONAL)[/bold]\n   Leave empty to create a fresh instance\n   Format: snap-xxxxxxxxxxxxxxxxx",
        default="",
    )
    config["root_volume_snapshot_id"] = snapshot_id if snapshot_id else None
    if snapshot_id:
        console.print(f"   [green]✅[/green] Will restore from snapshot: {snapshot_id}")
    else:
        console.print("   [green]✅[/green] Will create fresh instance")
    console.print()
    
    # Infrastructure control
    enable_infra = Confirm.ask(
        "[bold]8️⃣  Infrastructure Control[/bold]\n   Set to 'true' to enable infrastructure immediately",
        default=True,
    )
    config["enable_infrastructure"] = enable_infra
    console.print(f"   [green]✅[/green] enable_infrastructure = {enable_infra}\n")
    
    # ALB control
    if config.get("domain_name"):
        enable_alb = Confirm.ask(
            "[bold]9️⃣  Application Load Balancer (ALB)[/bold]\n   Enable HTTPS/SSL via ALB (~$16-22/month when running)",
            default=False,
        )
        config["enable_alb"] = enable_alb
    else:
        config["enable_alb"] = False
        console.print("[bold]9️⃣  Application Load Balancer (ALB)[/bold]")
        console.print("   [yellow]⚠️  Skipped (requires domain_name)[/yellow]")
        console.print("   [green]✅[/green] enable_alb = false")
    console.print()
    
    return config


def import_existing_resources(
    project_root: Path,
    terraform_dir: Path,
    configs_dir: Path,
    aws_clients: AWSClients,
    vpc_id: Optional[str],
    region: str,
) -> None:
    """Import existing AWS resources into Terraform state.
    
    Args:
        project_root: Project root directory
        terraform_dir: Terraform directory
        configs_dir: Configs directory
        aws_clients: AWS clients instance
        vpc_id: VPC ID
        region: AWS region
    """
    console.print(Panel.fit(
        "[bold cyan]📦 Checking for existing resources to import...[/bold cyan]",
        border_style="cyan",
    ))
    console.print()
    
    # Check if terraform is initialized
    if not is_terraform_initialized(terraform_dir):
        console.print("[yellow]⚠️  Terraform not initialized yet.[/yellow]\n")
        if not Confirm.ask("   Would you like to run 'terraform init' now?", default=True):
            console.print("   Skipping init and resource import.")
            console.print("   Run 'cd terraform && terraform init' first, then run this script again to import existing resources")
            sys.exit(0)
        
        console.print("\n[cyan]🔧 Initializing Terraform...[/cyan]")
        if not terraform_init(terraform_dir):
            console.print("[red]❌ Terraform init failed! Skipping resource import.[/red]")
            console.print("   You can run this script again later to import existing resources.")
            sys.exit(0)
        console.print("   [green]✅ Terraform initialized![/green]\n")
    
    if not vpc_id:
        console.print("[yellow]⚠️  Could not determine VPC ID. Skipping resource import.[/yellow]")
        console.print("   You may need to manually import resources if you get 'already exists' errors")
        return
    
    tfvars_path = get_tfvars_path(configs_dir)
    state_file = terraform_dir / "state" / "terraform.tfstate"
    
    # Import CVAT security group
    cvat_sg_id = aws_clients.get_security_group_id("cvat-ui-server", vpc_id)
    if cvat_sg_id:
        console.print(f"[cyan]📦 Found existing CVAT security group: {cvat_sg_id}[/cyan]")
        if not terraform_state_show(terraform_dir, state_file, "aws_security_group.cvat[0]"):
            console.print("   Importing into Terraform state...")
            if terraform_import(terraform_dir, state_file, "aws_security_group.cvat[0]", cvat_sg_id):
                console.print("   [green]✅ Imported[/green]")
            else:
                console.print("   [yellow]⚠️  Import failed (may need terraform init first)[/yellow]")
        else:
            console.print("   [green]✅ Already in Terraform state[/green]")
    else:
        console.print("[dim]ℹ️  CVAT security group not found (will be created)[/dim]")
    
    # Import ALB security group
    alb_sg_id = aws_clients.get_security_group_id("cvat-ui-server-alb", vpc_id)
    if alb_sg_id:
        console.print(f"[cyan]📦 Found existing ALB security group: {alb_sg_id}[/cyan]")
        if not terraform_state_show(terraform_dir, state_file, "aws_security_group.alb[0]"):
            console.print("   Importing into Terraform state...")
            if terraform_import(terraform_dir, state_file, "aws_security_group.alb[0]", alb_sg_id):
                console.print("   [green]✅ Imported[/green]")
            else:
                console.print("   [yellow]⚠️  Import failed (may need terraform init first)[/yellow]")
        else:
            console.print("   [green]✅ Already in Terraform state[/green]")
    else:
        console.print("[dim]ℹ️  ALB security group not found (will be created)[/dim]")
    
    # Import IAM resources (only if enable_infrastructure=true)
    enable_infra = get_config_value(tfvars_path, "enable_infrastructure", "true")
    if enable_infra == "true":
        # IAM Role
        if aws_clients.iam_role_exists("cvat-ec2-ssm-role"):
            console.print("[cyan]📦 Found existing IAM role: cvat-ec2-ssm-role[/cyan]")
            if not terraform_state_show(terraform_dir, state_file, "aws_iam_role.ec2_ssm_role[0]"):
                console.print("   Importing into Terraform state...")
                if terraform_import(terraform_dir, state_file, "aws_iam_role.ec2_ssm_role[0]", "cvat-ec2-ssm-role"):
                    console.print("   [green]✅ Imported[/green]")
                else:
                    console.print("   [yellow]⚠️  Import failed (ensure enable_infrastructure=true in terraform.tfvars)[/yellow]")
            else:
                console.print("   [green]✅ Already in Terraform state[/green]")
        else:
            console.print("[dim]ℹ️  IAM role not found (will be created when enable_infrastructure=true)[/dim]")
        
        # IAM Instance Profile
        if aws_clients.iam_instance_profile_exists("cvat-ec2-ssm-profile"):
            console.print("[cyan]📦 Found existing IAM instance profile: cvat-ec2-ssm-profile[/cyan]")
            if not terraform_state_show(terraform_dir, state_file, "aws_iam_instance_profile.ec2_ssm_profile[0]"):
                console.print("   Importing into Terraform state...")
                if terraform_import(terraform_dir, state_file, "aws_iam_instance_profile.ec2_ssm_profile[0]", "cvat-ec2-ssm-profile"):
                    console.print("   [green]✅ Imported[/green]")
                else:
                    console.print("   [yellow]⚠️  Import failed (ensure enable_infrastructure=true in terraform.tfvars)[/yellow]")
            else:
                console.print("   [green]✅ Already in Terraform state[/green]")
        else:
            console.print("[dim]ℹ️  IAM instance profile not found (will be created when enable_infrastructure=true)[/dim]")
    else:
        console.print("[dim]ℹ️  Skipping IAM resource import (enable_infrastructure=false - resources are conditional)[/dim]")
    
    # Import Route 53 records
    domain_name = get_config_value(tfvars_path, "domain_name")
    if domain_name:
        console.print()
        console.print("[cyan]📦 Checking for existing Route 53 records...[/cyan]")
        zone_id = aws_clients.get_route53_zone_id(domain_name)
        if zone_id:
            # Main domain record
            main_record = aws_clients.get_route53_record(zone_id, f"{domain_name}.", "A")
            if main_record:
                console.print(f"[cyan]📦 Found existing Route 53 record: {domain_name}[/cyan]")
                if not terraform_state_show(terraform_dir, state_file, "aws_route53_record.main[0]"):
                    console.print("   Importing into Terraform state...")
                    import_id = f"{zone_id}_{domain_name}._A"
                    if terraform_import(terraform_dir, state_file, "aws_route53_record.main[0]", import_id):
                        console.print("   [green]✅ Imported[/green]")
                    else:
                        console.print("   [yellow]⚠️  Import failed (record will be managed with allow_overwrite=true)[/yellow]")
                else:
                    console.print("   [green]✅ Already in Terraform state[/green]")
            
            # Subdomain records
            for subdomain in ["cvat"]:
                subdomain_name = f"{subdomain}.{domain_name}"
                subdomain_record = aws_clients.get_route53_record(zone_id, f"{subdomain_name}.", "A")
                if subdomain_record:
                    console.print(f"[cyan]📦 Found existing Route 53 record: {subdomain_name}[/cyan]")
                    resource_name = f"aws_route53_record.{subdomain}_subdomain[0]"
                    if not terraform_state_show(terraform_dir, state_file, resource_name):
                        console.print("   Importing into Terraform state...")
                        import_id = f"{zone_id}_{subdomain_name}._A"
                        if terraform_import(terraform_dir, state_file, resource_name, import_id):
                            console.print("   [green]✅ Imported[/green]")
                        else:
                            console.print("   [yellow]⚠️  Import failed (record will be managed with allow_overwrite=true)[/yellow]")
                    else:
                        console.print("   [green]✅ Already in Terraform state[/green]")


@click.command()
def setup():
    """Interactive setup for CVAT Infrastructure.
    
    Collects configuration values and sets up Terraform configuration.
    Can also import existing AWS resources into Terraform state.
    """
    project_root, terraform_dir, configs_dir = get_project_paths()
    tfvars_path = get_tfvars_path(configs_dir)
    
    import_only = False
    has_existing_resources = False
    
    # Check if terraform.tfvars already exists
    if tfvars_path.exists():
        console.print("[green]✅ configs/terraform.tfvars already exists![/green]\n")
        
        # Ensure symlink exists
        terraform_tfvars = terraform_dir / "terraform.tfvars"
        ensure_symlink(tfvars_path, terraform_tfvars)
        
        # Try to get region and subnet from existing file
        existing_region = get_config_value(tfvars_path, "aws_region", "us-east-2")
        existing_subnet = get_config_value(tfvars_path, "subnet_id")
        
        # Check for existing resources
        if existing_subnet:
            aws_clients = AWSClients(region=existing_region)
            vpc_id = aws_clients.get_vpc_id_from_subnet(existing_subnet)
            
            if vpc_id:
                has_existing_resources = aws_clients.has_existing_resources(vpc_id)
        
        # If we found existing resources, ask about importing first
        if has_existing_resources:
            if Confirm.ask(
                "   Found existing AWS resources. Would you like to import them into Terraform state?",
                default=True,
            ):
                import_only = True
            else:
                # If they don't want to import, ask about overwriting
                if not Confirm.ask("   Do you want to overwrite configs/terraform.tfvars?", default=False):
                    console.print("   Exiting (no changes made)")
                    sys.exit(0)
                import_only = False
        else:
            # No existing resources found, ask about overwriting
            if not Confirm.ask("   Do you want to overwrite configs/terraform.tfvars?", default=False):
                console.print("   Keeping existing configs/terraform.tfvars\n")
                if not Confirm.ask("   Would you like to check for and import existing resources?", default=True):
                    console.print("   Exiting (no changes made)")
                    sys.exit(0)
                import_only = True
            else:
                console.print("   Will create new configs/terraform.tfvars\n")
    
    # Collect configuration if not import-only
    if not import_only:
        console.print(Panel.fit(
            "[bold cyan]🚀 CVAT Infrastructure Setup[/bold cyan]",
            border_style="cyan",
        ))
        console.print()
        
        existing_config = parse_tfvars(tfvars_path) if tfvars_path.exists() else {}
        aws_clients = AWSClients(region=existing_config.get("aws_region", "us-east-2"))
        
        config = collect_config_interactive(aws_clients, existing_config)
        
        # Create terraform.tfvars
        console.print("[cyan]📝 Creating configs/terraform.tfvars...[/cyan]")
        create_tfvars(
            tfvars_path,
            aws_region=config["aws_region"],
            my_ip_cidr=config["my_ip_cidr"],
            subnet_id=config["subnet_id"],
            ssh_key_name=config["ssh_key_name"],
            domain_name=config.get("domain_name"),
            root_volume_snapshot_id=config.get("root_volume_snapshot_id"),
            enable_infrastructure=config["enable_infrastructure"],
            enable_alb=config.get("enable_alb", False),
        )
        console.print("   [green]✅ configs/terraform.tfvars created![/green]\n")
        
        # Create symlink
        terraform_tfvars = terraform_dir / "terraform.tfvars"
        ensure_symlink(tfvars_path, terraform_tfvars)
        console.print("   [green]✅ Created symlink: terraform/terraform.tfvars → ../configs/terraform.tfvars[/green]\n")
        
        # Ask about importing
        if not Confirm.ask("   Would you like to check for and import existing resources?", default=True):
            console.print("   Skipping resource import.\n")
            sys.exit(0)
        console.print()
        
        vpc_id = config.get("vpc_id")
        region = config["aws_region"]
    else:
        # Import only mode - get values from existing config
        existing_config = parse_tfvars(tfvars_path)
        region = existing_config.get("aws_region", "us-east-2")
        subnet_id = existing_config.get("subnet_id")
        aws_clients = AWSClients(region=region)
        vpc_id = aws_clients.get_vpc_id_from_subnet(subnet_id) if subnet_id else None
    
    # Import existing resources
    console.print(Panel.fit(
        "[bold cyan]🚀 CVAT Infrastructure Setup[/bold cyan]",
        border_style="cyan",
    ))
    console.print()
    
    import_existing_resources(
        project_root,
        terraform_dir,
        configs_dir,
        aws_clients,
        vpc_id,
        region,
    )
    
    console.print()
    console.print(Panel.fit(
        "[bold green]✅ Setup Complete![/bold green]",
        border_style="green",
    ))
    console.print()
    console.print("[bold]📋 Next steps:[/bold]\n")
    console.print("1. Initialize Terraform (if not already done):")
    console.print("   cd terraform && terraform init\n")
    console.print("2. Review the plan:")
    console.print("   cd terraform && terraform plan -state=state/terraform.tfstate\n")
    console.print("3. Apply the configuration:")
    console.print("   cd terraform && terraform apply -state=state/terraform.tfstate\n")
    console.print("   Or use the convenience commands:")
    console.print("   python scripts/cvat.py up    # Start infrastructure")
    console.print("   python scripts/cvat.py down  # Stop infrastructure\n")
    console.print("[dim]💡 If you encounter 'already exists' errors, run this command again")
    console.print("   or manually import resources with: terraform import <resource> <id>[/dim]\n")

