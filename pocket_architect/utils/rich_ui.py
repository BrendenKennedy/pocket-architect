"""Rich UI utilities for progress, tables, and live panels."""

from typing import List, Dict, Any, Optional
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn
from rich.live import Live

from pocket_architect.core.types import CostEstimate
from pocket_architect.core.cost import format_cost_display

console = Console()


def display_cost_table(estimates: List[CostEstimate], title: str = "Cost Estimates") -> None:
    """Display cost estimates in a Rich table.
    
    Args:
        estimates: List of cost estimates to display
        title: Table title
    """
    table = Table(title=title, show_header=True, header_style="bold magenta")
    table.add_column("Resource", style="cyan", no_wrap=True)
    table.add_column("Provider", style="green")
    table.add_column("Hourly", justify="right", style="yellow")
    table.add_column("Monthly (projected)", justify="right", style="yellow")
    
    for estimate in estimates:
        table.add_row(
            estimate.resource_type,
            estimate.provider.value,
            f"${estimate.hourly_rate_usd:.4f}",
            f"${estimate.monthly_projection_usd:.2f}",
        )
    
    console.print(table)


def display_cost_warning(estimate: CostEstimate, threshold: float = 10.0) -> None:
    """Display cost warning if hourly rate exceeds threshold.
    
    Args:
        estimate: Cost estimate to check
        threshold: Hourly cost threshold in USD
    """
    if estimate.hourly_rate_usd > threshold:
        panel = Panel(
            f"[yellow]⚠️  High Cost Warning[/yellow]\n\n"
            f"Estimated hourly cost: ${estimate.hourly_rate_usd:.4f}/hour\n"
            f"Projected monthly cost: ${estimate.monthly_projection_usd:.2f}/month\n\n"
            f"This exceeds the warning threshold of ${threshold:.2f}/hour.",
            title="Cost Warning",
            border_style="yellow",
        )
        console.print(panel)


def create_progress_spinner(message: str = "Processing..."):
    """Create a progress spinner context manager.
    
    Args:
        message: Progress message
        
    Returns:
        Progress context manager
    """
    return Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        console=console,
    )


def display_success(message: str) -> None:
    """Display success message.
    
    Args:
        message: Success message
    """
    console.print(f"[green]✓[/green] {message}")


def display_error(message: str) -> None:
    """Display error message.
    
    Args:
        message: Error message
    """
    console.print(f"[red]✗[/red] {message}")


def display_info(message: str) -> None:
    """Display info message.
    
    Args:
        message: Info message
    """
    console.print(f"[blue]ℹ[/blue] {message}")


def display_session_info(session_data: Dict[str, Any]) -> None:
    """Display session information in a formatted panel.
    
    Args:
        session_data: Session data dictionary
    """
    lines = []
    for key, value in session_data.items():
        lines.append(f"{key.replace('_', ' ').title()}: {value}")
    
    panel = Panel(
        "\n".join(lines),
        title="Session Information",
        border_style="cyan",
    )
    console.print(panel)

