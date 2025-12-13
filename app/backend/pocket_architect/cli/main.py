"""
CLI entry point using Click framework.
Provides command-line interface for all cloud operations.
"""

import click
from rich.console import Console
from rich.table import Table

from pocket_architect import __version__
from pocket_architect.core.manager import ResourceManager
from pocket_architect.core.models import (
    CreateProjectRequest,
    CreateInstanceRequest,
    CreateAccountRequest,
)

console = Console()


@click.group()
@click.version_option(version=__version__)
@click.option("--verbose", "-v", is_flag=True, help="Enable verbose output")
@click.option("--config", "-c", type=click.Path(), help="Path to config file")
@click.pass_context
def cli(ctx, verbose, config):
    """Pocket Architect - Multi-cloud infrastructure management."""
    ctx.ensure_object(dict)
    ctx.obj["verbose"] = verbose
    ctx.obj["config"] = config
    if verbose:
        console.print("[dim]Verbose mode enabled[/dim]")


@cli.group()
def project():
    """Manage cloud projects."""
    pass


@project.command("list")
@click.option(
    "--platform", type=click.Choice(["aws", "gcp", "azure"]), help="Filter by platform"
)
@click.option("--region", help="Filter by region")
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
                    f"${project.monthlyCost:.2f}",
                )

            console.print(table)
    except Exception as e:
        console.print(f"[red]Error: {e}[/red]")
        if ctx.obj.get("verbose"):
            import traceback

            console.print(traceback.format_exc())


@project.command("create")
@click.option("--name", required=True, help="Project name")
@click.option("--description", required=True, help="Project description")
@click.option(
    "--platform",
    required=True,
    type=click.Choice(["aws", "gcp", "azure"]),
    help="Cloud platform",
)
@click.option("--region", required=True, help="Cloud region")
@click.option("--color", default="#3b82f6", help="Project color (hex)")
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
                color=color,
            )
            project = manager.create_project(request)

            console.print("[green]✓ Project created successfully![/green]")
            console.print(f"  ID: {project.id}")
            console.print(f"  Name: {project.name}")
            console.print(f"  Platform: {project.platform}")
            console.print(f"  Region: {project.region}")
    except Exception as e:
        console.print(f"[red]Error: {e}[/red]")
        if ctx.obj.get("verbose"):
            import traceback

            console.print(traceback.format_exc())


@cli.group()
def instance():
    """Manage cloud instances."""
    pass


@cli.group()
def account():
    """Manage cloud provider accounts."""
    pass


@instance.command("list")
@click.option("--project", type=int, help="Filter by project ID")
@click.option(
    "--platform", type=click.Choice(["aws", "gcp", "azure"]), help="Filter by platform"
)
@click.option("--region", help="AWS region")
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
                    instance.uptime,
                )

            console.print(table)
    except Exception as e:
        console.print(f"[red]Error: {e}[/red]")
        if ctx.obj.get("verbose"):
            import traceback

            console.print(traceback.format_exc())


@instance.command("create")
@click.option("--name", required=True, help="Instance name")
@click.option("--project-id", required=True, type=int, help="Project ID")
@click.option("--instance-type", required=True, help="Instance type (e.g., t3.micro)")
@click.option(
    "--platform",
    required=True,
    type=click.Choice(["aws", "gcp", "azure"]),
    help="Cloud platform",
)
@click.option("--region", required=True, help="Cloud region")
@click.option("--storage", default=20, type=int, help="Storage size in GB")
@click.option("--ssh-key", help="SSH key pair name")
@click.pass_context
def create_instance(
    ctx, name, project_id, instance_type, platform, region, storage, ssh_key
):
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
                sshKey=ssh_key or "",
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
        if ctx.obj.get("verbose"):
            import traceback

            console.print(traceback.format_exc())


@instance.command("start")
@click.argument("instance_id", type=int)
@click.option("--region", help="AWS region")
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
        if ctx.obj.get("verbose"):
            import traceback

            console.print(traceback.format_exc())


@instance.command("stop")
@click.argument("instance_id", type=int)
@click.option("--region", help="AWS region")
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
        if ctx.obj.get("verbose"):
            import traceback

            console.print(traceback.format_exc())


@instance.command("restart")
@click.argument("instance_id", type=int)
@click.option("--region", help="AWS region")
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
        if ctx.obj.get("verbose"):
            import traceback

            console.print(traceback.format_exc())


@instance.command("terminate")
@click.argument("instance_id", type=int)
@click.option("--region", help="AWS region")
@click.option("--force", is_flag=True, help="Skip confirmation prompt")
@click.pass_context
def terminate_instance(ctx, instance_id, region, force):
    """Terminate (delete) an instance."""
    try:
        if not force:
            console.print(
                f"[red]WARNING: This will permanently terminate instance {instance_id}![/red]"
            )
            confirmation = input("Type 'yes' to confirm: ")
            if confirmation.lower() != "yes":
                console.print("[yellow]Termination cancelled.[/yellow]")
                return

        console.print(f"[yellow]Terminating instance {instance_id}...[/yellow]")

        with ResourceManager(region=region) as manager:
            manager.terminate_instance(instance_id)

            console.print("[green]✓ Instance terminated successfully![/green]")
    except Exception as e:
        console.print(f"[red]Error: {e}[/red]")
        if ctx.obj.get("verbose"):
            import traceback

            console.print(traceback.format_exc())


# Account commands are defined inline


@cli.command()
def gui():
    """Launch the GUI interface."""
    try:
        from pocket_architect.gui.main import main as gui_main

        console.print("[blue]Launching GUI...[/blue]")
        gui_main()
    except ImportError as e:
        console.print(f"[red]Error: Failed to import GUI module: {e}[/red]")
        console.print(
            "[yellow]Make sure PySide6 is installed: pip install PySide6 PySide6-WebEngine[/yellow]"
        )
    except Exception as e:
        console.print(f"[red]Error launching GUI: {e}[/red]")


# Add account commands
@account.command("list")
@click.option(
    "--platform", type=click.Choice(["aws", "gcp", "azure"]), help="Filter by platform"
)
@click.pass_context
def list_accounts(ctx, platform):
    """List all accounts."""
    try:
        with ResourceManager() as manager:
            accounts = manager.list_accounts()

            # Filter by platform if specified
            if platform:
                accounts = [a for a in accounts if a.platform == platform]

            if not accounts:
                console.print("[yellow]No accounts found.[/yellow]")
                return

            # Create table
            table = Table(title="Accounts")
            table.add_column("ID", style="cyan", no_wrap=True)
            table.add_column("Name", style="green")
            table.add_column("Platform", style="magenta")
            table.add_column("Account ID", style="blue")
            table.add_column("Region", style="white")
            table.add_column("Status", style="yellow")
            table.add_column("Default", style="red")

            for acc in accounts:
                table.add_row(
                    str(acc.id),
                    acc.name,
                    acc.platform.upper(),
                    acc.accountId,
                    acc.region,
                    acc.status,
                    "✓" if acc.isDefault else "",
                )

            console.print(table)
    except Exception as e:
        console.print(f"[red]Error: {e}[/red]")
        if ctx.obj.get("verbose"):
            import traceback

            console.print(traceback.format_exc())


@account.command("create")
@click.option("--name", required=True, help="Account name (used as profile name)")
@click.option(
    "--platform",
    required=True,
    type=click.Choice(["aws", "gcp", "azure"]),
    help="Cloud platform",
)
@click.option(
    "--account-id", required=True, help="Cloud account/project/subscription ID"
)
@click.option("--region", required=True, help="Default region")
@click.option(
    "--access-key", help="Access key/client ID (for AWS/GCP service accounts)"
)
@click.option(
    "--secret-key", help="Secret key/client secret (for AWS/GCP service accounts)"
)
@click.option("--default", is_flag=True, help="Set as default account")
@click.pass_context
def create_account(
    ctx, name, platform, account_id, region, access_key, secret_key, default
):
    """Create a new account."""
    try:
        console.print(f"[yellow]Creating account '{name}'...[/yellow]")

        # Validate required credentials based on platform
        if platform == "aws":
            if not access_key or not secret_key:
                console.print(
                    "[red]Error: AWS requires --access-key and --secret-key[/red]"
                )
                return
        elif platform == "gcp":
            if not secret_key:
                console.print(
                    "[red]Error: GCP requires --secret-key (service account JSON)[/red]"
                )
                return
        elif platform == "azure":
            if not access_key or not secret_key:
                console.print(
                    "[red]Error: Azure requires --access-key (client ID) and --secret-key (client secret)[/red]"
                )
                return

        with ResourceManager() as manager:
            request = CreateAccountRequest(
                name=name,
                platform=platform,
                accountId=account_id,
                region=region,
                accessKey=access_key,
                secretKey=secret_key,
                isDefault=default,
            )
            acc = manager.create_account(request)

            console.print("[green]✓ Account created successfully![/green]")
            console.print(f"  ID: {acc.id}")
            console.print(f"  Name: {acc.name}")
            console.print(f"  Platform: {acc.platform}")
            console.print(f"  Account ID: {acc.accountId}")
            console.print(f"  Region: {acc.region}")
            console.print(f"  Status: {acc.status}")

    except Exception as e:
        console.print(f"[red]Error: {e}[/red]")
        if ctx.obj.get("verbose"):
            import traceback

            console.print(traceback.format_exc())


@account.command("test-connection")
@click.argument("account_id", type=int)
@click.pass_context
def test_account_connection(ctx, account_id):
    """Test connection to an account."""
    try:
        console.print(f"[yellow]Testing connection to account {account_id}...[/yellow]")

        with ResourceManager() as manager:
            success = manager.test_account_connection(account_id)

            if success:
                console.print("[green]✓ Connection successful![/green]")
            else:
                console.print("[red]✗ Connection failed![/red]")

    except Exception as e:
        console.print(f"[red]Error: {e}[/red]")
        if ctx.obj.get("verbose"):
            import traceback

            console.print(traceback.format_exc())


@account.command("delete")
@click.argument("account_id", type=int)
@click.option("--force", is_flag=True, help="Skip confirmation prompt")
@click.pass_context
def delete_account(ctx, account_id, force):
    """Delete an account."""
    try:
        if not force:
            console.print(
                f"[red]WARNING: This will permanently delete account {account_id} and remove stored credentials![/red]"
            )
            confirmation = input("Type 'yes' to confirm: ")
            if confirmation.lower() != "yes":
                console.print("[yellow]Deletion cancelled.[/yellow]")
                return

        console.print(f"[yellow]Deleting account {account_id}...[/yellow]")

        with ResourceManager() as manager:
            manager.delete_account(account_id)

            console.print("[green]✓ Account deleted successfully![/green]")

    except Exception as e:
        console.print(f"[red]Error: {e}[/red]")
        if ctx.obj.get("verbose"):
            import traceback

            console.print(traceback.format_exc())


@account.command("migrate-credentials")
@click.option(
    "--dry-run", is_flag=True, help="Show what would be migrated without making changes"
)
@click.pass_context
def migrate_credentials(ctx, dry_run):
    """Migrate existing AWS CLI credentials to secure keychain storage."""
    try:
        from pocket_architect.core.migration import CredentialMigrationService
        from pocket_architect.core.secure_store import SecureCredentialStore

        console.print("[yellow]Checking migration status...[/yellow]")

        # Check keychain availability
        if not SecureCredentialStore.test_keychain_access():
            console.print(
                "[red]ERROR: Keychain is not accessible. Cannot migrate credentials.[/red]"
            )
            console.print("Please ensure your OS keychain is set up and accessible.")
            return

        status = CredentialMigrationService.get_migration_status()
        console.print(f"Keychain backend: {status['keychain_backend']}")
        console.print(
            f"AWS credentials file exists: {status['aws_credentials_file_exists']}"
        )

        if not status["migration_recommended"]:
            console.print(
                "[green]✓ No migration needed. All credentials are already secure.[/green]"
            )
            return

        console.print(
            f"Found {len(status['plaintext_profiles'])} profiles in plaintext:"
        )
        for profile in status["plaintext_profiles"]:
            console.print(f"  - {profile}")

        if dry_run:
            console.print(
                "[blue]DRY RUN: Would migrate the above profiles to secure keychain.[/blue]"
            )
            return

        console.print("[yellow]Starting migration...[/yellow]")
        stats = CredentialMigrationService.migrate_aws_cli_profiles()

        console.print("[green]✓ Migration completed![/green]")
        console.print(f"  Scanned: {stats['scanned']} profiles")
        console.print(f"  Migrated: {stats['migrated']} profiles")
        console.print(f"  Skipped: {stats['skipped']} profiles")
        console.print(f"  Errors: {stats['errors']} profiles")

        if stats["migrated"] > 0:
            console.print(
                "\n[blue]Note: Migrated profiles have been removed from ~/.aws/credentials[/blue]"
            )
            console.print(
                "[blue]They are now stored securely in your OS keychain.[/blue]"
            )

        # Validate migration
        if CredentialMigrationService.validate_migration():
            console.print("[green]✓ Migration validation successful![/green]")
        else:
            console.print(
                "[red]⚠ Migration validation failed. Please check the logs.[/red]"
            )

    except Exception as e:
        console.print(f"[red]Error during migration: {e}[/red]")
        if ctx.obj.get("verbose"):
            import traceback

            console.print(traceback.format_exc())


if __name__ == "__main__":
    cli()
