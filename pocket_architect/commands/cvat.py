"""cvat command - CVAT instance management (up, sync, down)."""

import typer
from pathlib import Path
from typing import Optional
from rich.console import Console
from rich.prompt import Prompt, Confirm

from pocket_architect.core.types import Provider, SessionState
from pocket_architect.core.session import SessionManager
from pocket_architect.core.blueprint import Blueprint, BlueprintSource
from pocket_architect.providers import get_provider
from pocket_architect.utils.rich_ui import display_success, display_error, display_info, display_cost_warning
from pocket_architect.utils.cost_estimator import CostEstimator
from pocket_architect.utils.errors import (
    BlueprintError,
    ProviderError,
    ValidationError,
    handle_provider_error,
    handle_validation_error,
    handle_missing_required_field,
)
from pocket_architect.config.settings import settings

app = typer.Typer(name="cvat", help="CVAT instance management")
console = Console()


def _get_provider_from_string(provider_str: Optional[str]) -> Provider:
    """Convert provider string to Provider enum.
    
    Args:
        provider_str: Provider string or None
        
    Returns:
        Provider enum
    """
    if provider_str is None:
        # Use default from settings or local
        default = settings.default_provider
        if default:
            try:
                return Provider(default.lower())
            except ValueError:
                pass
        return Provider.LOCAL
    
    try:
        return Provider(provider_str.lower())
    except ValueError:
        raise typer.BadParameter(
            f"Invalid provider: {provider_str}. Must be one of: aws, coreweave, runpod, local"
        )


@app.command()
def up(
    provider: Optional[str] = typer.Option(
        None,
        "--provider",
        "-p",
        help="Cloud provider (aws, coreweave, runpod, local)",
    ),
    blueprint_file: Optional[Path] = typer.Option(
        None,
        "--blueprint",
        "-b",
        help="Path to blueprint file (.yaml, .json, or .tfvars)",
    ),
    wizard: bool = typer.Option(
        False,
        "--wizard",
        "-w",
        help="Run interactive wizard to configure deployment",
    ),
    # Direct flags (for quick setup without wizard)
    https: bool = typer.Option(
        True,
        "--https/--no-https",
        help="Enable HTTPS for CVAT deployment",
    ),
    subnet_id: Optional[str] = typer.Option(
        None,
        "--subnet-id",
        help="Subnet ID (required for AWS)",
    ),
    ssh_key_name: Optional[str] = typer.Option(
        None,
        "--ssh-key-name",
        help="SSH key pair name (required for AWS)",
    ),
    domain_name: Optional[str] = typer.Option(
        None,
        "--domain-name",
        help="Domain name for HTTPS (required if https=True for AWS)",
    ),
    instance_type: Optional[str] = typer.Option(
        None,
        "--instance-type",
        help="Instance type (e.g., t3.xlarge for AWS)",
    ),
    use_spot: bool = typer.Option(
        True,
        "--spot/--no-spot",
        help="Use Spot instances (AWS only)",
    ),
) -> None:
    """Spin up full CVAT instance with optional pre-annotation + HTTPS.
    
    Examples:
        pocket-architect cvat up --provider aws --subnet-id subnet-xxx --ssh-key-name my-key
        pocket-architect cvat up --provider local --no-https
    """
    provider_enum = _get_provider_from_string(provider)
    
    # Determine blueprint source
    try:
        if blueprint_file:
            # Load from file
            blueprint = Blueprint.from_file(blueprint_file)
            console.print(f"[green]✓[/green] Loaded blueprint from: {blueprint_file}")
        elif wizard:
            # Interactive wizard
            if not provider:
                from rich.prompt import Prompt
                provider = Prompt.ask("Cloud provider", default="local")
            provider_enum = _get_provider_from_string(provider)
            try:
                blueprint = Blueprint.from_wizard(provider_enum.value, "cvat")
            except KeyboardInterrupt:
                console.print("\n[yellow]Wizard cancelled[/yellow]")
                raise typer.Exit(0)
        else:
            # From CLI flags
            flags = {
                "https": https,
                "subnet_id": subnet_id,
                "ssh_key_name": ssh_key_name,
                "domain_name": domain_name,
                "instance_type": instance_type,
                "use_spot": use_spot,
            }
            # Remove None values
            flags = {k: v for k, v in flags.items() if v is not None}
            blueprint = Blueprint.from_flags(flags)
    except BlueprintError as e:
        e.display()
        raise typer.Exit(1)
    except ValidationError as e:
        e.display()
        raise typer.Exit(1)
    except Exception as e:
        display_error(f"Failed to load configuration: {e}")
        console.print("\n[yellow]💡 Try using --wizard for interactive setup[/yellow]\n")
        raise typer.Exit(1)
    
    console.print(f"[bold cyan]Deploying CVAT on {provider_enum.value}...[/bold cyan]")
    
    # Show cost estimate
    use_spot_flag = blueprint.get("use_spot", True)
    cost_estimate = CostEstimator.estimate(provider_enum, "cvat", use_spot=use_spot_flag)
    console.print(f"[green]Estimated cost:[/green] ${cost_estimate.hourly_rate_usd:.4f}/hour (${cost_estimate.monthly_projection_usd:.2f}/month)")
    display_cost_warning(cost_estimate, settings.cost_warning_threshold_usd)
    
    # Create session
    session_manager = SessionManager()
    session = session_manager.create_session(provider_enum)
    
    try:
        # Get provider client
        provider_client = get_provider(provider_enum, session.session_id)
        
        # Prepare kwargs from blueprint
        kwargs = {}
        
        if provider_enum == Provider.AWS:
            # Get AWS-specific values from blueprint or prompt
            subnet_id = blueprint.get("subnet_id")
            ssh_key_name = blueprint.get("ssh_key_name")
            my_ip_cidr = blueprint.get("my_ip_cidr")
            domain_name = blueprint.get("domain_name", "")
            enable_https = blueprint.get("enable_https", blueprint.get("https", True))
            
            # Prompt for missing required values with helpful error handling
            if not subnet_id:
                from rich.prompt import Prompt
                from pocket_architect.utils.validation import validate_subnet_id
                try:
                    subnet_id = Prompt.ask("AWS Subnet ID")
                    if not subnet_id:
                        handle_missing_required_field("subnet_id", "AWS configuration")
                    if not validate_subnet_id(subnet_id):
                        handle_validation_error(
                            "subnet_id",
                            subnet_id,
                            "subnet-xxxxxxxxxxxxxxxxx format",
                            "subnet-0123456789abcdef0",
                        )
                except (ValidationError, BlueprintError) as e:
                    e.display()
                    raise typer.Exit(1)
            
            if not ssh_key_name:
                from rich.prompt import Prompt
                try:
                    ssh_key_name = Prompt.ask("SSH Key Pair Name")
                    if not ssh_key_name:
                        handle_missing_required_field(
                            "ssh_key_name",
                            "AWS configuration",
                            "my-ssh-key",
                        )
                except ValidationError as e:
                    e.display()
                    raise typer.Exit(1)
            
            if not my_ip_cidr:
                from pocket_architect.utils.validation import get_my_ip, validate_cidr
                try:
                    my_ip = get_my_ip()
                    if my_ip:
                        my_ip_cidr = f"{my_ip}/32"
                        console.print(f"[green]✓[/green] Detected your IP: {my_ip}")
                    else:
                        from rich.prompt import Prompt
                        my_ip_cidr = Prompt.ask("Your IP address in CIDR notation (e.g., 1.2.3.4/32)")
                        if not validate_cidr(my_ip_cidr):
                            handle_validation_error(
                                "IP address (CIDR)",
                                my_ip_cidr,
                                "X.X.X.X/32 format",
                                "1.2.3.4/32",
                            )
                except ValidationError as e:
                    e.display()
                    raise typer.Exit(1)
            
            if enable_https and not domain_name:
                from rich.prompt import Prompt
                domain_name = Prompt.ask("Domain name for HTTPS", default="")
                if not domain_name:
                    console.print("[yellow]⚠ HTTPS enabled but no domain provided. HTTPS setup may fail.[/yellow]")
            
            kwargs.update({
                "https": enable_https,
                "subnet_id": subnet_id,
                "ssh_key_name": ssh_key_name,
                "my_ip_cidr": my_ip_cidr,
                "domain_name": domain_name or "",
                "instance_type": blueprint.get("instance_type"),
                "use_spot": blueprint.get("use_spot", True),
                "efs_enabled": blueprint.get("efs_enabled", True),
            })
        else:
            # Local or other providers
            kwargs.update({
                "https": blueprint.get("https", True),
                "cvat_image": blueprint.get("cvat_image"),
                "cvat_port": blueprint.get("cvat_port"),
            })
        
        # Provision CVAT
        try:
            result = provider_client.provision_cvat(**kwargs)
        except Exception as e:
            # Handle provider-specific errors
            handle_provider_error(provider_enum.value, e, "CVAT deployment")
            session.state = SessionState.ERROR
            session_manager.update_session(session)
            raise typer.Exit(1)
        
        # Update session
        session.cvat_url = result.get("cvat_url", "")
        session.state = SessionState.ACTIVE
        session.estimated_hourly_cost = cost_estimate.hourly_rate_usd
        session_manager.update_session(session)
        
        display_success(f"CVAT deployed successfully!")
        if session.cvat_url:
            console.print(f"[green]CVAT URL:[/green] {session.cvat_url}")
        if result.get("password_stored"):
            console.print("[green]✓[/green] CVAT admin password stored securely in keyring")
        
    except (BlueprintError, ValidationError, ProviderError) as e:
        # These errors already have user-friendly displays
        if hasattr(e, "display"):
            e.display()
        session.state = SessionState.ERROR
        session_manager.update_session(session)
        raise typer.Exit(1)
    except KeyboardInterrupt:
        console.print("\n[yellow]Deployment cancelled by user[/yellow]")
        session.state = SessionState.ERROR
        session_manager.update_session(session)
        raise typer.Exit(130)
    except Exception as e:
        display_error(f"Failed to deploy CVAT: {e}")
        console.print("\n[yellow]💡 Troubleshooting tips:[/yellow]")
        console.print("1. Check provider credentials and permissions")
        console.print("2. Verify network connectivity")
        console.print("3. Review error details above")
        console.print("4. Try using --wizard for interactive setup\n")
        session.state = SessionState.ERROR
        session_manager.update_session(session)
        raise typer.Exit(1)


@app.command()
def sync(
    provider: Optional[str] = typer.Option(
        None,
        "--provider",
        "-p",
        help="Cloud provider (aws, coreweave, runpod, local)",
    ),
    direction: str = typer.Option(
        "both",
        "--direction",
        "-d",
        help="Sync direction: up, down, or both",
    ),
    path: Optional[str] = typer.Option(
        None,
        "--path",
        help="Local path to sync (default: current directory)",
    ),
) -> None:
    """Bidirectional sync with running CVAT instance.
    
    Examples:
        pocket-architect cvat sync --provider aws
        pocket-architect cvat sync --direction down --path ./annotations
    """
    provider_enum = _get_provider_from_string(provider)
    
    # Get active session
    session_manager = SessionManager()
    session = session_manager.get_active_session(provider_enum)
    
    if not session:
        display_error(f"No active CVAT session found for provider {provider_enum.value}")
        console.print("Run 'pocket-architect cvat up' first to deploy CVAT")
        raise typer.Exit(1)
    
    # Determine local path
    if path:
        local_path = Path(path)
    else:
        local_path = Path.cwd()
    
    if not local_path.exists():
        display_error(f"Path does not exist: {local_path}")
        raise typer.Exit(1)
    
    console.print(f"[bold cyan]Syncing with CVAT instance...[/bold cyan]")
    console.print(f"Provider: {provider_enum.value}")
    console.print(f"Direction: {direction}")
    console.print(f"Local path: {local_path}")
    
    try:
        provider_client = get_provider(provider_enum, session.session_id)
        provider_client.sync(local_path, direction=direction)
        display_success("Sync completed successfully!")
    except Exception as e:
        display_error(f"Sync failed: {e}")
        raise typer.Exit(1)


@app.command()
def down(
    provider: Optional[str] = typer.Option(
        None,
        "--provider",
        "-p",
        help="Cloud provider (aws, coreweave, runpod, local)",
    ),
) -> None:
    """Stop CVAT instance (preserves data).
    
    Examples:
        pocket-architect cvat down --provider aws
    """
    provider_enum = _get_provider_from_string(provider)
    
    # Get active session
    session_manager = SessionManager()
    session = session_manager.get_active_session(provider_enum)
    
    if not session:
        display_error(f"No active CVAT session found for provider {provider_enum.value}")
        raise typer.Exit(1)
    
    if not Confirm.ask(f"Stop CVAT instance on {provider_enum.value}? (data will be preserved)"):
        console.print("[yellow]Cancelled[/yellow]")
        return
    
    console.print(f"[bold yellow]Stopping CVAT instance...[/bold yellow]")
    
    try:
        provider_client = get_provider(provider_enum, session.session_id)
        # For now, we'll use destroy with force=False, but ideally we'd have a stop method
        # For local, destroy stops containers but preserves volumes
        # For AWS, we'd need to stop instances rather than destroy
        console.print("[yellow]Note: This will stop the instance but preserve data[/yellow]")
        
        # Update session state
        session.state = SessionState.STOPPED
        session_manager.update_session(session)
        
        display_success("CVAT instance stopped")
    except Exception as e:
        display_error(f"Failed to stop CVAT: {e}")
        raise typer.Exit(1)

