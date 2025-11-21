"""Main CLI entry point using Typer."""

import typer
from rich.console import Console
from typing import Optional

from mlcloud import __version__
from mlcloud.core.types import Provider

# Import commands
from mlcloud.commands import auto_annotate, cvat, train
from mlcloud.commands import shell, destroy, list as list_cmd, status, blueprint

app = typer.Typer(
    name="mlcloud",
    help="A zero-install, platform-agnostic Python CLI that turns any laptop into an on-demand GPU computer-vision workstation with zero vendor lock-in.",
    add_completion=False,
)

console = Console()


def version_callback(value: bool) -> None:
    """Display version and exit."""
    if value:
        console.print(f"[bold]mlcloud[/bold] version [cyan]{__version__}[/cyan]")
        raise typer.Exit()


@app.callback()
def main(
    ctx: typer.Context,
    provider: Optional[Provider] = typer.Option(
        None,
        "--provider",
        "-p",
        help="Cloud provider (aws, coreweave, runpod, local)",
        case_sensitive=False,
    ),
    version: bool = typer.Option(
        False,
        "--version",
        "-v",
        callback=version_callback,
        help="Show version and exit",
    ),
) -> None:
    """mlcloud - On-demand GPU computer-vision workstation CLI."""
    # Store provider in context for commands to access
    ctx.ensure_object(dict)
    ctx.obj["provider"] = provider


# Add command groups
app.add_typer(
    auto_annotate.app,
    name="auto-annotate",
    help="Fully automatic labeling (images or video frames)",
)
app.add_typer(
    cvat.app,
    name="cvat",
    help="CVAT instance management (up, sync, down)",
)
app.add_typer(
    train.app,
    name="train",
    help="Launch YOLO/SAM/Detectron2 training job",
)
app.add_typer(
    list_cmd.app,
    name="list",
    help="List active sessions and resources",
)
app.add_typer(
    blueprint.app,
    name="blueprint",
    help="Create and manage infrastructure blueprints",
)

# Register standalone commands
app.command(name="shell", help="Instant SSH or VSCode Remote / JupyterLab into the GPU node")(
    shell.shell_command
)
app.command(name="destroy", help="Guaranteed zero-cost teardown of all resources")(
    destroy.destroy_command
)
app.command(name="status", help="Show current session status")(
    status.status_command
)


def cli() -> int:
    """CLI entry point with graceful error handling."""
    try:
        app()
        return 0
    except KeyboardInterrupt:
        console.print("\n[yellow]⚠ Interrupted by user[/yellow]")
        console.print("[dim]Operation cancelled. You can try again when ready.[/dim]\n")
        return 130
    except typer.Exit as e:
        # Typer handles its own exits
        return e.exit_code if hasattr(e, "exit_code") else 0
    except Exception as e:
        # Check if it's one of our custom errors with display method
        if hasattr(e, "display"):
            e.display()
            return 1
        
        # Generic error handling
        console.print(f"\n[red]❌ Unexpected error:[/red] {e}")
        console.print("\n[yellow]💡 Troubleshooting:[/yellow]")
        console.print("1. Check the error message above")
        console.print("2. Verify your configuration and inputs")
        console.print("3. Try using --wizard for interactive setup")
        console.print("4. Run with --debug for detailed error information\n")
        
        if "--debug" in typer.get_argv():
            import traceback
            console.print("[dim]Full traceback:[/dim]")
            traceback.print_exc()
        
        return 1


if __name__ == "__main__":
    raise SystemExit(cli())

