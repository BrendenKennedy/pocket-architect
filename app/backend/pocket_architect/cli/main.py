"""
CLI entry point using Click framework.
Provides command-line interface for all cloud operations.
"""

import click
from rich.console import Console
from rich.table import Table

from pocket_architect import __version__
from pocket_architect.core.manager import ResourceManager
from pocket_architect.core.models import CreateProjectRequest, CreateInstanceRequest

console = Console()


@click.group()
@click.version_option(version=__version__)
@click.option('--verbose', '-v', is_flag=True, help='Enable verbose output')
@click.option('--config', '-c', type=click.Path(), help='Path to config file')
@click.pass_context
def cli(ctx, verbose, config):
    """Pocket Architect - Multi-cloud infrastructure management."""
    ctx.ensure_object(dict)
    ctx.obj['verbose'] = verbose
    ctx.obj['config'] = config
    if verbose:
        console.print("[dim]Verbose mode enabled[/dim]")


@cli.group()
def project():
    """Manage cloud projects."""
    pass


@project.command('list')
@click.option('--platform', type=click.Choice(['aws', 'gcp', 'azure']), help='Filter by platform')
@click.option('--region', help='Filter by region')
@click.pass_context
def list_projects(ctx, platform, region):
    """List all projects."""
    try:
        with ResourceManager(region=region) as manager:
            projects = manager.list_projects()

            # Filter by platform if specified
            if platform:
                projects = [p for p in projects if p.platform == platform]

            if not projects:
                console.print("[yellow]No projects found.[/yellow]")
                return

            # Create table
            table = Table(title="Projects")
            table.add_column("ID", style="cyan", no_wrap=True)
            table.add_column("Name", style="green")
            table.add_column("Platform", style="magenta")
            table.add_column("Region", style="blue")
            table.add_column("Status", style="yellow")
            table.add_column("Instances", style="white")
            table.add_column("Monthly Cost", style="red")

            for project in projects:
                table.add_row(
                    str(project.id),
                    project.name,
                    project.platform,
                    project.region,
                    project.status,
                    str(project.instanceCount),
                    f"${project.monthlyCost:.2f}"
                )

            console.print(table)
    except Exception as e:
        console.print(f"[red]Error: {e}[/red]")
        if ctx.obj.get('verbose'):
            import traceback
            console.print(traceback.format_exc())


@project.command('create')
@click.option('--name', required=True, help='Project name')
@click.option('--description', required=True, help='Project description')
@click.option('--platform', required=True, type=click.Choice(['aws', 'gcp', 'azure']), help='Cloud platform')
@click.option('--region', required=True, help='Cloud region')
@click.option('--color', default='#3b82f6', help='Project color (hex)')
@click.pass_context
def create_project(ctx, name, description, platform, region, color):
    """Create a new project."""
    try:
        console.print(f"[yellow]Creating project '{name}'...[/yellow]")

        with ResourceManager(region=region) as manager:
            request = CreateProjectRequest(
                name=name,
                description=description,
                platform=platform,
                region=region,
                color=color
            )
            project = manager.create_project(request)

            console.print("[green]✓ Project created successfully![/green]")
            console.print(f"  ID: {project.id}")
            console.print(f"  Name: {project.name}")
            console.print(f"  Platform: {project.platform}")
            console.print(f"  Region: {project.region}")
    except Exception as e:
        console.print(f"[red]Error: {e}[/red]")
        if ctx.obj.get('verbose'):
            import traceback
            console.print(traceback.format_exc())


@cli.group()
def instance():
    """Manage cloud instances."""
    pass


@instance.command('list')
@click.option('--project', type=int, help='Filter by project ID')
@click.option('--platform', type=click.Choice(['aws', 'gcp', 'azure']), help='Filter by platform')
@click.option('--region', help='AWS region')
@click.pass_context
def list_instances(ctx, project, platform, region):
    """List all instances."""
    try:
        with ResourceManager(region=region) as manager:
            instances = manager.list_instances(project_id=project)

            # Filter by platform if specified
            if platform:
                instances = [i for i in instances if i.platform == platform]

            if not instances:
                console.print("[yellow]No instances found.[/yellow]")
                return

            # Create table
            table = Table(title="Instances")
            table.add_column("ID", style="cyan", no_wrap=True)
            table.add_column("Name", style="green")
            table.add_column("Type", style="blue")
            table.add_column("Status", style="yellow")
            table.add_column("Project", style="magenta")
            table.add_column("Public IP", style="white")
            table.add_column("Uptime", style="white")

            for instance in instances:
                table.add_row(
                    str(instance.id),
                    instance.name,
                    instance.instanceType,
                    instance.status,
                    instance.projectName,
                    instance.publicIp or "N/A",
                    instance.uptime
                )

            console.print(table)
    except Exception as e:
        console.print(f"[red]Error: {e}[/red]")
        if ctx.obj.get('verbose'):
            import traceback
            console.print(traceback.format_exc())


@instance.command('create')
@click.option('--name', required=True, help='Instance name')
@click.option('--project-id', required=True, type=int, help='Project ID')
@click.option('--instance-type', required=True, help='Instance type (e.g., t3.micro)')
@click.option('--platform', required=True, type=click.Choice(['aws', 'gcp', 'azure']), help='Cloud platform')
@click.option('--region', required=True, help='Cloud region')
@click.option('--storage', default=20, type=int, help='Storage size in GB')
@click.option('--ssh-key', help='SSH key pair name')
@click.pass_context
def create_instance(ctx, name, project_id, instance_type, platform, region, storage, ssh_key):
    """Create a new instance."""
    try:
        console.print(f"[yellow]Creating instance '{name}'...[/yellow]")

        with ResourceManager(region=region) as manager:
            request = CreateInstanceRequest(
                name=name,
                projectId=project_id,
                instanceType=instance_type,
                platform=platform,
                region=region,
                storage=storage,
                securityConfigId=1,  # TODO: Make this configurable
                sshKey=ssh_key or ''
            )
            instance = manager.create_instance(request)

            console.print("[green]✓ Instance created successfully![/green]")
            console.print(f"  ID: {instance.id}")
            console.print(f"  Name: {instance.name}")
            console.print(f"  Type: {instance.instanceType}")
            console.print(f"  Status: {instance.status}")
            console.print(f"  Private IP: {instance.privateIp or 'Pending...'}")
    except Exception as e:
        console.print(f"[red]Error: {e}[/red]")
        if ctx.obj.get('verbose'):
            import traceback
            console.print(traceback.format_exc())


@instance.command('start')
@click.argument('instance_id', type=int)
@click.option('--region', help='AWS region')
@click.pass_context
def start_instance(ctx, instance_id, region):
    """Start a stopped instance."""
    try:
        console.print(f"[yellow]Starting instance {instance_id}...[/yellow]")

        with ResourceManager(region=region) as manager:
            instance = manager.start_instance(instance_id)

            console.print("[green]✓ Instance started successfully![/green]")
            console.print(f"  ID: {instance.id}")
            console.print(f"  Name: {instance.name}")
            console.print(f"  Status: {instance.status}")
    except Exception as e:
        console.print(f"[red]Error: {e}[/red]")
        if ctx.obj.get('verbose'):
            import traceback
            console.print(traceback.format_exc())


@instance.command('stop')
@click.argument('instance_id', type=int)
@click.option('--region', help='AWS region')
@click.pass_context
def stop_instance(ctx, instance_id, region):
    """Stop a running instance."""
    try:
        console.print(f"[yellow]Stopping instance {instance_id}...[/yellow]")

        with ResourceManager(region=region) as manager:
            instance = manager.stop_instance(instance_id)

            console.print("[green]✓ Instance stopped successfully![/green]")
            console.print(f"  ID: {instance.id}")
            console.print(f"  Name: {instance.name}")
            console.print(f"  Status: {instance.status}")
    except Exception as e:
        console.print(f"[red]Error: {e}[/red]")
        if ctx.obj.get('verbose'):
            import traceback
            console.print(traceback.format_exc())


@instance.command('restart')
@click.argument('instance_id', type=int)
@click.option('--region', help='AWS region')
@click.pass_context
def restart_instance(ctx, instance_id, region):
    """Restart an instance."""
    try:
        console.print(f"[yellow]Restarting instance {instance_id}...[/yellow]")

        with ResourceManager(region=region) as manager:
            instance = manager.restart_instance(instance_id)

            console.print("[green]✓ Instance restarted successfully![/green]")
            console.print(f"  ID: {instance.id}")
            console.print(f"  Name: {instance.name}")
            console.print(f"  Status: {instance.status}")
    except Exception as e:
        console.print(f"[red]Error: {e}[/red]")
        if ctx.obj.get('verbose'):
            import traceback
            console.print(traceback.format_exc())


@instance.command('terminate')
@click.argument('instance_id', type=int)
@click.option('--region', help='AWS region')
@click.option('--force', is_flag=True, help='Skip confirmation prompt')
@click.pass_context
def terminate_instance(ctx, instance_id, region, force):
    """Terminate (delete) an instance."""
    try:
        if not force:
            console.print(f"[red]WARNING: This will permanently terminate instance {instance_id}![/red]")
            confirmation = input("Type 'yes' to confirm: ")
            if confirmation.lower() != 'yes':
                console.print("[yellow]Termination cancelled.[/yellow]")
                return

        console.print(f"[yellow]Terminating instance {instance_id}...[/yellow]")

        with ResourceManager(region=region) as manager:
            manager.terminate_instance(instance_id)

            console.print("[green]✓ Instance terminated successfully![/green]")
    except Exception as e:
        console.print(f"[red]Error: {e}[/red]")
        if ctx.obj.get('verbose'):
            import traceback
            console.print(traceback.format_exc())


@cli.command()
def gui():
    """Launch the GUI interface."""
    try:
        from pocket_architect.gui.main import main as gui_main
        console.print("[blue]Launching GUI...[/blue]")
        gui_main()
    except ImportError as e:
        console.print(f"[red]Error: Failed to import GUI module: {e}[/red]")
        console.print("[yellow]Make sure PySide6 is installed: pip install PySide6 PySide6-WebEngine[/yellow]")
    except Exception as e:
        console.print(f"[red]Error launching GUI: {e}[/red]")


if __name__ == "__main__":
    cli()
