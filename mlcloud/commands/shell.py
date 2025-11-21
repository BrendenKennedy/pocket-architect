"""shell command - instant SSH or VSCode Remote / JupyterLab into the GPU node."""

import typer
from typing import Optional
from rich.console import Console

from mlcloud.core.types import Provider
from mlcloud.core.session import SessionManager
from mlcloud.providers import get_provider
from mlcloud.utils.rich_ui import display_error
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


def shell_command(
    provider: Optional[str] = typer.Option(
        None,
        "--provider",
        "-p",
        help="Cloud provider (aws, coreweave, runpod, local)",
    ),
    mode: str = typer.Option(
        "ssh",
        "--mode",
        "-m",
        help="Connection mode: ssh, vscode, or jupyter",
    ),
) -> None:
    """Instant SSH or VSCode Remote / JupyterLab into the GPU node.
    
    Examples:
        mlcloud shell --provider aws
        mlcloud shell --mode vscode --provider coreweave
        mlcloud shell --mode jupyter --provider local
    """
    provider_enum = _get_provider_from_string(provider)
    
    # Get active session
    session_manager = SessionManager()
    session = session_manager.get_active_session(provider_enum)
    
    if not session:
        display_error(f"No active session found for provider {provider_enum.value}")
        console.print("Run 'mlcloud cvat up' or 'mlcloud train' first")
        raise typer.Exit(1)
    
    try:
        provider_client = get_provider(provider_enum, session.session_id)
        provider_client.shell(mode=mode)
    except Exception as e:
        display_error(f"Failed to connect: {e}")
        raise typer.Exit(1)

