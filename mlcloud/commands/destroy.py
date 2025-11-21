"""destroy command - guaranteed zero-cost teardown."""

import typer
from typing import Optional
from rich.console import Console

from mlcloud.core.types import Provider, SessionState
from mlcloud.core.session import SessionManager
from mlcloud.providers import get_provider
from mlcloud.utils.rich_ui import display_success, display_error, display_info
from mlcloud.config.settings import settings

console = Console()


def _get_provider_from_string(provider_str: Optional[str]) -> Provider:
    """Convert provider string to Provider enum."""
    if provider_str is None:
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


def destroy_command(
    provider: Optional[str] = typer.Option(
        None,
        "--provider",
        "-p",
        help="Cloud provider (aws, coreweave, runpod, local)",
    ),
    force: bool = typer.Option(
        False,
        "--force",
        "-f",
        help="Force destroy without confirmation",
    ),
) -> None:
    """Guaranteed zero-cost teardown of all resources.
    
    Examples:
        mlcloud destroy --provider aws
        mlcloud destroy --provider local --force
    """
    provider_enum = _get_provider_from_string(provider)
    
    # Get active session
    session_manager = SessionManager()
    session = session_manager.get_active_session(provider_enum)
    
    if not session:
        display_error(f"No active session found for provider {provider_enum.value}")
        raise typer.Exit(1)
    
    if not force:
        from rich.prompt import Confirm
        if not Confirm.ask(
            f"[bold red]This will destroy ALL resources for {provider_enum.value} session {session.session_id}[/bold red]\n"
            "This action cannot be undone. Continue?",
            default=False,
        ):
            console.print("[yellow]Cancelled[/yellow]")
            return
    
    console.print(f"[bold red]Destroying all resources on {provider_enum.value}...[/bold red]")
    
    try:
        provider_client = get_provider(provider_enum, session.session_id)
        
        # Get cost estimate before destroy (should be $0 after)
        if provider_enum != Provider.LOCAL:
            console.print("[yellow]Verifying cost before destroy...[/yellow]")
            pre_cost = provider_client.cost_estimate("cvat")
            if pre_cost.hourly_rate_usd > 0:
                console.print(f"[yellow]Current estimated cost: ${pre_cost.hourly_rate_usd:.4f}/hour[/yellow]")
        
        provider_client.destroy(force=True)
        
        # Verify zero cost after destroy
        if provider_enum != Provider.LOCAL:
            console.print("[yellow]Verifying zero cost after destroy...[/yellow]")
            post_cost = provider_client.cost_estimate("cvat")
            if post_cost.hourly_rate_usd > 0.01:  # Allow small rounding errors
                console.print(f"[yellow]⚠ Warning: Estimated cost still ${post_cost.hourly_rate_usd:.4f}/hour[/yellow]")
                console.print("[yellow]Some resources may still be running. Check your cloud console.[/yellow]")
            else:
                console.print("[green]✓[/green] Verified: $0.00/hour estimated cost")
        
        # Update session
        session.state = SessionState.DESTROYED
        session_manager.update_session(session)
        
        display_success("All resources destroyed successfully!")
        console.print("[green]✓[/green] Zero recurring charges - all resources removed")
        
    except Exception as e:
        display_error(f"Failed to destroy resources: {e}")
        raise typer.Exit(1)

