"""status command - show current session status and resource information."""

import typer
from typing import Optional
from rich.console import Console
from rich.panel import Panel

from mlcloud.core.types import Provider
from mlcloud.core.session import SessionManager
from mlcloud.utils.rich_ui import display_info, display_error

console = Console()


def _get_provider_from_string(provider_str: Optional[str]) -> Optional[Provider]:
    """Convert provider string to Provider enum."""
    if provider_str is None:
        return None
    
    try:
        return Provider(provider_str.lower())
    except ValueError:
        return None


def status_command(
    provider: Optional[str] = typer.Option(
        None,
        "--provider",
        "-p",
        help="Filter by provider (aws, coreweave, runpod, local)",
    ),
) -> None:
    """Show current session status and resource information.
    
    Examples:
        mlcloud status
        mlcloud status --provider aws
    """
    session_manager = SessionManager()
    provider_enum = _get_provider_from_string(provider)
    
    session = session_manager.get_active_session(provider_enum)
    
    if not session:
        display_info("No active session found")
        if provider_enum:
            console.print(f"Run 'mlcloud cvat up --provider {provider_enum.value}' to start a session")
        else:
            console.print("Run 'mlcloud cvat up' to start a session")
        return
    
    # Display session information
    info_lines = [
        f"Session ID: {session.session_id}",
        f"Provider: {session.provider.value}",
        f"State: {session.state.value}",
        f"Created: {session.created_at}",
        f"Updated: {session.updated_at}",
    ]
    
    if session.cvat_url:
        info_lines.append(f"CVAT URL: {session.cvat_url}")
    
    if session.estimated_hourly_cost is not None:
        monthly = session.estimated_hourly_cost * 730
        info_lines.append(f"Cost: ${session.estimated_hourly_cost:.4f}/hour (${monthly:.2f}/month projected)")
    
    panel = Panel(
        "\n".join(info_lines),
        title=f"Session Status - {session.session_id[:8]}...",
        border_style="cyan",
    )
    console.print(panel)
    
    # Show metadata if available
    if session.metadata:
        console.print("\n[bold]Metadata:[/bold]")
        for key, value in session.metadata.items():
            console.print(f"  {key}: {value}")

