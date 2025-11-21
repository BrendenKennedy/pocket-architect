"""blueprint command - create and manage infrastructure blueprints."""

import typer
from pathlib import Path
from typing import Optional
from rich.console import Console

from mlcloud.core.blueprint import Blueprint
from mlcloud.core.types import Provider
from mlcloud.utils.errors import (
    BlueprintError,
    ValidationError,
    handle_wizard_interrupt,
)

app = typer.Typer(name="blueprint", help="Create and manage infrastructure blueprints")
console = Console()


@app.command()
def create(
    provider: str = typer.Argument(..., help="Cloud provider (aws, coreweave, runpod, local)"),
    blueprint_type: str = typer.Option(
        "cvat",
        "--type",
        "-t",
        help="Blueprint type (cvat, training, auto_annotate)",
    ),
    output: Path = typer.Option(
        None,
        "--output",
        "-o",
        help="Output file path (default: blueprint-{provider}-{type}.yaml)",
    ),
    format: str = typer.Option(
        "yaml",
        "--format",
        "-f",
        help="Output format (yaml, json, tfvars)",
    ),
) -> None:
    """Create a new blueprint via interactive wizard.
    
    Examples:
        mlcloud blueprint create aws
        mlcloud blueprint create aws --type training --output my-training.yaml
        mlcloud blueprint create local --format tfvars
    """
    try:
        # Validate provider
        try:
            Provider(provider.lower())
        except ValueError:
            console.print(f"[red]❌ Invalid provider: {provider}[/red]")
            console.print("\n[bold cyan]Valid providers:[/bold cyan]")
            console.print("  - aws")
            console.print("  - coreweave")
            console.print("  - runpod")
            console.print("  - local\n")
            raise typer.Exit(1)
        
        # Validate blueprint type
        valid_types = ["cvat", "training", "auto_annotate"]
        if blueprint_type not in valid_types:
            console.print(f"[red]❌ Invalid blueprint type: {blueprint_type}[/red]")
            console.print(f"\n[bold cyan]Valid types:[/bold cyan] {', '.join(valid_types)}\n")
            raise typer.Exit(1)
        
        # Run wizard
        try:
            blueprint = Blueprint.from_wizard(provider, blueprint_type)
        except KeyboardInterrupt:
            handle_wizard_interrupt()
            raise typer.Exit(0)
        except (ValidationError, BlueprintError) as e:
            e.display()
            raise typer.Exit(1)
        
        # Determine output path
        if output is None:
            output = Path(f"blueprint-{provider}-{blueprint_type}.{format}")
        
        # Validate output path
        if output.exists():
            from rich.prompt import Confirm
            if not Confirm.ask(f"File {output} already exists. Overwrite?", default=False):
                console.print("[yellow]Cancelled[/yellow]")
                raise typer.Exit(0)
        
        # Save blueprint
        try:
            blueprint.save(output, format=format)
        except Exception as e:
            raise BlueprintError(
                f"Failed to save blueprint: {e}",
                solution=(
                    f"1. Check write permissions: `ls -l {output.parent}`\n"
                    f"2. Ensure directory exists: `mkdir -p {output.parent}`\n"
                    f"3. Try a different output path"
                ),
            )
        
        console.print(f"\n[green]✓[/green] Blueprint saved to: {output}")
        console.print(f"[dim]Use it with: mlcloud cvat up --blueprint {output}[/dim]")
        
    except KeyboardInterrupt:
        handle_wizard_interrupt()
        raise typer.Exit(0)
    except (BlueprintError, ValidationError) as e:
        e.display()
        raise typer.Exit(1)
    except Exception as e:
        console.print(f"\n[red]❌ Error creating blueprint: {e}[/red]")
        console.print("\n[yellow]💡 Try:[/yellow]")
        console.print("1. Verify provider name is correct")
        console.print("2. Check you have required permissions")
        console.print("3. Use --help for more information\n")
        raise typer.Exit(1)


@app.command()
def validate(
    blueprint_file: Path = typer.Argument(..., help="Path to blueprint file"),
) -> None:
    """Validate a blueprint file.
    
    Examples:
        mlcloud blueprint validate my-config.yaml
        mlcloud blueprint validate config.tfvars
    """
    try:
        blueprint = Blueprint.from_file(blueprint_file)
        console.print(f"\n[green]✓[/green] Blueprint is valid")
        console.print(f"Source: {blueprint.source.value}")
        console.print(f"Configuration keys: {len(blueprint.data)}")
        console.print(f"  {', '.join(sorted(blueprint.data.keys()))}\n")
    except (BlueprintError, ValidationError) as e:
        e.display()
        raise typer.Exit(1)
    except Exception as e:
        console.print(f"\n[red]❌ Blueprint validation failed: {e}[/red]")
        console.print("\n[yellow]💡 Try:[/yellow]")
        console.print("1. Check file exists and is readable")
        console.print("2. Verify file format (YAML, JSON, or .tfvars)")
        console.print("3. Use `mlcloud blueprint show` to view contents")
        console.print("4. Recreate with: `mlcloud blueprint create`\n")
        raise typer.Exit(1)


@app.command()
def show(
    blueprint_file: Path = typer.Argument(..., help="Path to blueprint file"),
) -> None:
    """Show blueprint contents.
    
    Examples:
        mlcloud blueprint show my-config.yaml
    """
    try:
        blueprint = Blueprint.from_file(blueprint_file)
        
        from rich.table import Table
        
        table = Table(title=f"Blueprint: {blueprint_file.name}", show_header=True)
        table.add_column("Key", style="cyan")
        table.add_column("Value", style="green")
        
        for key, value in sorted(blueprint.data.items()):
            # Mask sensitive values
            if any(sensitive in key.lower() for sensitive in ["key", "secret", "password", "token"]):
                value = "***" if value else ""
            table.add_row(key, str(value))
        
        console.print(table)
        console.print(f"\n[dim]Source: {blueprint.source.value}[/dim]")
        if blueprint.source_file:
            console.print(f"[dim]File: {blueprint.source_file}[/dim]\n")
        
    except (BlueprintError, ValidationError) as e:
        e.display()
        raise typer.Exit(1)
    except Exception as e:
        console.print(f"\n[red]❌ Error reading blueprint: {e}[/red]")
        console.print("\n[yellow]💡 Try:[/yellow]")
        console.print("1. Verify file exists: `ls {blueprint_file}`")
        console.print("2. Check file permissions")
        console.print("3. Validate with: `mlcloud blueprint validate {blueprint_file}`\n")
        raise typer.Exit(1)

