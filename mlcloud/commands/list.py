"""list command - list active sessions and resources."""

import typer
from typing import Optional
from rich.console import Console
from rich.table import Table

from mlcloud.core.types import Provider
from mlcloud.core.session import SessionManager
from mlcloud.utils.rich_ui import display_info

app = typer.Typer(name="list", help="List active sessions and resources")
console = Console()


def _get_provider_from_string(provider_str: Optional[str]) -> Optional[Provider]:
    """Convert provider string to Provider enum."""
    if provider_str is None:
        return None
    
    try:
        return Provider(provider_str.lower())
    except ValueError:
        return None


@app.command()
def sessions(
    provider: Optional[str] = typer.Option(
        None,
        "--provider",
        "-p",
        help="Filter by provider (aws, coreweave, runpod, local)",
    ),
) -> None:
    """List all active sessions.
    
    Examples:
        mlcloud list sessions
        mlcloud list sessions --provider aws
    """
    session_manager = SessionManager()
    provider_enum = _get_provider_from_string(provider)
    
    all_sessions = session_manager.store.list_sessions()
    
    if provider_enum:
        all_sessions = [s for s in all_sessions if s.provider == provider_enum]
    
    if not all_sessions:
        display_info("No sessions found")
        return
    
    # Create table
    table = Table(title="Active Sessions", show_header=True, header_style="bold magenta")
    table.add_column("Session ID", style="cyan", no_wrap=True)
    table.add_column("Provider", style="green")
    table.add_column("State", style="yellow")
    table.add_column("CVAT URL", style="blue")
    table.add_column("Cost/Hour", justify="right", style="yellow")
    table.add_column("Created", style="dim")
    
    for session in sorted(all_sessions, key=lambda s: s.created_at, reverse=True):
        table.add_row(
            session.session_id[:8] + "...",
            session.provider.value,
            session.state.value,
            session.cvat_url or "-",
            f"${session.estimated_hourly_cost:.4f}" if session.estimated_hourly_cost else "-",
            session.created_at[:10] if len(session.created_at) > 10 else session.created_at,
        )
    
    console.print(table)

