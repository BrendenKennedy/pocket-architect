"""CLI commands for pocket-architect."""

from datetime import datetime, timezone
from typing import Any

import boto3
import typer
from rich.console import Console
from rich.table import Table

from pocket_architect.blueprints import builtin, loader
from pocket_architect.config import (
    logger,
    print_aws_identity,
    setup_verbose_logging,
)
from pocket_architect.models import Blueprint, ProjectState, SnapshotMetadata
from pocket_architect.providers.aws import client as aws_client
from pocket_architect.providers.aws.orchestrators import (
    alb,
    ec2_instance,
    elastic_ip,
    iam_role,
    key_pair,
    security_group,
    subnet,
    vpc,
)
from pocket_architect.providers.aws import status as aws_status
from pocket_architect.providers.aws.utils import cleanup_on_failure, make_tags, make_name
from pocket_architect.state import manager, resource_tracker, snapshot_index

app = typer.Typer(
    help="Pocket Architect - Personal, isolated, cost-effective cloud environment CLI"
)
console = Console()


def resolve_blueprint(name: str) -> Blueprint | None:
    """Resolve a blueprint by name (builtin or user template)."""
    # Check builtin first
    builtin_blueprints = builtin.get_builtin_blueprints()
    if name in builtin_blueprints:
        return builtin_blueprints[name]

    # Check user templates
    user_blueprint = loader.load_user_blueprint(name)
    if user_blueprint:
        return user_blueprint

    return None


def get_ami_from_snapshot(snapshot_id: str, session: boto3.Session, snapshot_name: str) -> str:
    """
    Get or create AMI from EBS snapshot.

    Args:
        snapshot_id: EBS snapshot ID
        session: boto3 session
        snapshot_name: Snapshot name for tagging

    Returns:
        AMI ID
    """
    ec2 = session.client("ec2")

    # Check if AMI already exists for this snapshot
    snap_meta = snapshot_index.find_snapshot(snapshot_id)
    if snap_meta and snap_meta.ami_id:
        # Verify AMI still exists
        try:
            ec2.describe_images(ImageIds=[snap_meta.ami_id])
            console.print(f"[green]Using existing AMI: {snap_meta.ami_id}[/green]")
            return snap_meta.ami_id
        except Exception:
            # AMI was deleted, create new one
            pass

    # Get snapshot info
    snapshots = ec2.describe_snapshots(SnapshotIds=[snapshot_id])
    if not snapshots.get("Snapshots"):
        raise ValueError(f"Snapshot {snapshot_id} not found")

    # Use default device name (modern AMIs use /dev/sda1)
    # Note: We could store device name in snapshot metadata for better accuracy
    device_name = "/dev/sda1"

    # Create AMI from snapshot
    console.print(f"[yellow]Creating AMI from snapshot {snapshot_id}...[/yellow]")

    image_response = ec2.register_image(
        Name=f"pa-{snapshot_name}-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}",
        RootDeviceName=device_name,
        BlockDeviceMappings=[
            {
                "DeviceName": device_name,
                "Ebs": {"SnapshotId": snapshot_id},
            }
        ],
    )

    ami_id = image_response["ImageId"]
    console.print(f"[green]Created AMI: {ami_id}[/green]")

    # Update snapshot metadata with AMI ID
    if snap_meta:
        snap_meta.ami_id = ami_id
        snapshot_index.save_snapshot_metadata(snap_meta)
    else:
        # Create new metadata entry
        new_meta = SnapshotMetadata(
            snapshot_id=snapshot_id,
            name=snapshot_name,
            project_name="unknown",
            ami_id=ami_id,
        )
        snapshot_index.save_snapshot_metadata(new_meta)

    return ami_id


@app.command()
def deploy(
    blueprint_name: str = typer.Argument(..., help="Blueprint name"),
    project_name: str = typer.Argument(..., help="Project name"),
    snapshot: str | None = typer.Option(
        None, "--snapshot", "-s", help="Snapshot name or ID to deploy from"
    ),
    interactive: bool = typer.Option(
        False, "--interactive", "-i", help="Interactive mode for configuration"
    ),
    verbose: bool = typer.Option(False, "--verbose", "-v", help="Verbose logging"),
    cost_limit: float | None = typer.Option(
        None, "--cost-limit", "-L", help="Set cost limit in USD"
    ),
    cost_action: str = typer.Option(
        "warn_only",
        "--cost-action",
        "-a",
        help="Action when cost limit exceeded: stop, teardown, or warn_only",
    ),
) -> None:
    """Deploy a blueprint to create a new project."""
    # Validate project name (AWS resource naming constraints)
    if not project_name or not project_name.replace("-", "").replace("_", "").isalnum():
        console.print(
            f"[red]Error: Project name must be alphanumeric with dashes/underscores only[/red]"
        )
        raise typer.Exit(1)

    if len(project_name) > 50:
        console.print(f"[red]Error: Project name must be 50 characters or less[/red]")
        raise typer.Exit(1)

    # Validate cost limit if provided
    if cost_limit is not None and cost_limit <= 0:
        console.print(f"[red]Error: Cost limit must be greater than 0[/red]")
        raise typer.Exit(1)

    # Validate cost action
    if cost_action not in ["stop", "teardown", "warn_only"]:
        console.print(f"[red]Error: Cost action must be one of: stop, teardown, warn_only[/red]")
        raise typer.Exit(1)

    if verbose:
        setup_verbose_logging()

    # Verify credentials
    identity = print_aws_identity()
    owner = identity["Arn"]

    # Resolve blueprint
    blueprint = resolve_blueprint(blueprint_name)
    if not blueprint:
        console.print(f"[red]Error: Blueprint '{blueprint_name}' not found[/red]")
        raise typer.Exit(1)

    # Check if project already exists
    existing_state = manager.load_project_state(project_name)
    if existing_state:
        console.print(f"[red]Error: Project '{project_name}' already exists[/red]")
        raise typer.Exit(1)

    console.print(
        f"[cyan]Deploying blueprint '{blueprint_name}' as project '{project_name}'[/cyan]"
    )

    session = aws_client.get_boto3_session()
    created_resources = {}
    created_at = datetime.now(timezone.utc)

    # Initialize resource tracking for this project
    resource_tracker.track_project_resources(project_name, {})

    try:
        # Get AMI ID - blueprint is source of truth
        ami_id = None
        if snapshot:
            snap_meta = snapshot_index.find_snapshot(snapshot)
            if not snap_meta:
                console.print(f"[red]Error: Snapshot '{snapshot}' not found[/red]")
                raise typer.Exit(1)
            ami_id = get_ami_from_snapshot(snap_meta.snapshot_id, session, snap_meta.name)
        else:
            # Check blueprint for AMI configuration
            blueprint_ami_id = blueprint.resources.get("ami_id")
            blueprint_ami_name = blueprint.resources.get("ami_name")
            blueprint_ami_owner = blueprint.resources.get("ami_owner", "amazon")

            ec2 = session.client("ec2")

            if blueprint_ami_id:
                # Direct AMI ID specified
                try:
                    ec2.describe_images(ImageIds=[blueprint_ami_id])
                    ami_id = blueprint_ami_id
                    console.print(f"[green]Using AMI from blueprint: {ami_id}[/green]")
                except Exception as e:
                    console.print(f"[red]Error: AMI {blueprint_ami_id} not found: {e}[/red]")
                    raise typer.Exit(1)
            elif blueprint_ami_name:
                # AMI name pattern specified
                filters = [
                    {"Name": "name", "Values": [blueprint_ami_name]},
                    {"Name": "state", "Values": ["available"]},
                ]
                images = ec2.describe_images(Owners=[blueprint_ami_owner], Filters=filters)
                if not images.get("Images"):
                    console.print(
                        f"[red]Error: Could not find AMI matching '{blueprint_ami_name}'[/red]"
                    )
                    raise typer.Exit(1)
                # Get latest
                images["Images"].sort(key=lambda x: x["CreationDate"], reverse=True)
                ami_id = images["Images"][0]["ImageId"]
                console.print(
                    f"[green]Using AMI from blueprint pattern '{blueprint_ami_name}': {ami_id}[/green]"
                )
            else:
                # Use default AMI (Amazon Linux 2023)
                images = ec2.describe_images(
                    Owners=["amazon"],
                    Filters=[
                        {"Name": "name", "Values": ["al2023-ami-*-x86_64"]},
                        {"Name": "state", "Values": ["available"]},
                    ],
                )
                if not images.get("Images"):
                    console.print("[red]Error: Could not find default AMI[/red]")
                    raise typer.Exit(1)
                # Get latest
                images["Images"].sort(key=lambda x: x["CreationDate"], reverse=True)
                ami_id = images["Images"][0]["ImageId"]
                console.print(f"[green]Using default AMI: {ami_id}[/green]")

        # Blueprint is the source of truth - display configuration
        if interactive:
            console.print("[cyan]Blueprint configuration:[/cyan]")
            console.print(
                f"  Instance type: {blueprint.resources.get('instance_type', 't3.medium')}"
            )

            # Display AMI info
            if blueprint.resources.get("ami_id"):
                console.print(f"  AMI ID: {blueprint.resources.get('ami_id')}")
            elif blueprint.resources.get("ami_name"):
                console.print(f"  AMI pattern: {blueprint.resources.get('ami_name')}")
                if blueprint.resources.get("ami_owner") != "amazon":
                    console.print(f"  AMI owner: {blueprint.resources.get('ami_owner')}")
            else:
                console.print(f"  AMI: Default (Amazon Linux 2023)")

            console.print(f"  Ports: {blueprint.resources.get('ports', [22])}")
            console.print(f"  Use ALB: {blueprint.resources.get('use_alb', False)}")
            console.print(f"  Use EIP: {blueprint.resources.get('use_eip', True)}")
            if blueprint.resources.get("certificate_arn"):
                console.print(f"  Certificate ARN: {blueprint.resources.get('certificate_arn')}")
            console.print()
            from rich.prompt import Confirm

            if not Confirm.ask("Deploy with this configuration?", default=True):
                console.print("[yellow]Deployment cancelled[/yellow]")
                return

        # Create resources using blueprint values only
        tags = make_tags(project_name, owner, created_at)

        # 1. VPC
        vpc_id = vpc.create_vpc(session, project_name, tags=tags)
        created_resources["vpc"] = vpc_id
        # Track immediately
        resource_tracker.track_project_resources(project_name, created_resources)

        # 2. Subnet
        subnet_id = subnet.create_subnet(session, vpc_id, None, tags=tags)
        created_resources["subnet"] = subnet_id
        resource_tracker.track_project_resources(project_name, created_resources)

        # 3. Security Group
        ports = blueprint.resources.get("ports", [22])
        sg_name = make_name(project_name, "sg")
        sg_id = security_group.create_sg(session, sg_name, vpc_id, ports, tags=tags)
        created_resources["security_group"] = sg_id
        resource_tracker.track_project_resources(project_name, created_resources)

        # 4. Key Pair
        key_name = make_name(project_name, "key")
        key_pair.create_key_pair(session, key_name, tags=tags)
        created_resources["key_pair"] = key_name
        resource_tracker.track_project_resources(project_name, created_resources)

        # 4.5. IAM Role and Instance Profile (if specified in blueprint)
        iam_instance_profile_arn = None
        use_iam_role = blueprint.resources.get("use_iam_role", False)
        if use_iam_role:
            try:
                managed_policies = blueprint.resources.get("iam_policies", None)
                role_arn = iam_role.create_iam_role(
                    session, project_name, managed_policies=managed_policies, tags=tags
                )
                created_resources["iam_role"] = role_arn
                created_resources["iam_role_arn"] = role_arn
                resource_tracker.track_project_resources(project_name, created_resources)

                profile_arn = iam_role.create_instance_profile(
                    session, project_name, role_arn, tags=tags
                )
                created_resources["iam_instance_profile"] = profile_arn
                created_resources["iam_instance_profile_arn"] = profile_arn
                iam_instance_profile_arn = profile_arn
                resource_tracker.track_project_resources(project_name, created_resources)
                console.print(f"[green]Created IAM role with S3 access[/green]")
            except Exception as e:
                console.print(f"[yellow]Warning: Failed to create IAM role: {e}[/yellow]")
                console.print("[yellow]Instance will be created without IAM role[/yellow]")
                logger.warning(f"Failed to create IAM role: {e}")

        # 5. EC2 Instance
        instance_type = blueprint.resources.get("instance_type", "t3.medium")
        user_data = blueprint.resources.get("user_data")
        instance_id = ec2_instance.create_instance(
            session,
            ami_id,
            instance_type,
            subnet_id,
            sg_id,
            key_name,
            tags=tags,
            user_data=user_data,
            iam_instance_profile_arn=iam_instance_profile_arn,
        )
        created_resources["instance"] = instance_id
        resource_tracker.track_project_resources(project_name, created_resources)

        # 6. Elastic IP or ALB - use blueprint configuration
        use_alb = blueprint.resources.get("use_alb", False)
        use_eip = blueprint.resources.get("use_eip", True)
        certificate_arn = blueprint.resources.get("certificate_arn")
        target_port = blueprint.resources.get("target_port", 8080)

        if use_alb:
            # Create ALB (with or without certificate)
            alb_name = make_name(project_name, "alb")
            alb_arn, alb_dns = alb.create_alb(
                session, alb_name, [subnet_id], sg_id, certificate_arn, target_port, tags=tags
            )
            created_resources["alb"] = alb_arn
            resource_tracker.track_project_resources(project_name, created_resources)

            # Register instance with target group
            alb.register_target(alb_arn, instance_id, session)

            console.print(f"[green]Deployment complete![/green]")
            if certificate_arn:
                console.print(f"[cyan]Access your service at: https://{alb_dns}[/cyan]")
            else:
                console.print(f"[cyan]Access your service at: http://{alb_dns}[/cyan]")
        elif use_eip:
            # Use Elastic IP
            eip_allocation_id = elastic_ip.allocate_eip(session, tags=tags)
            created_resources["elastic_ip"] = eip_allocation_id
            resource_tracker.track_project_resources(project_name, created_resources)

            public_ip = elastic_ip.associate_eip(session, eip_allocation_id, instance_id)
            created_resources["elastic_ip_address"] = public_ip
            resource_tracker.track_project_resources(project_name, created_resources)

            console.print(f"[green]Deployment complete![/green]")
            console.print(f"[cyan]SSH: ssh -i ~/.ssh/{key_name}.pem ec2-user@{public_ip}[/cyan]")
            app_port = ports[1] if len(ports) > 1 else ports[0]
            console.print(f"[cyan]Service: http://{public_ip}:{app_port}[/cyan]")
        else:
            # No ALB or EIP
            console.print(f"[green]Deployment complete![/green]")
            console.print(
                "[yellow]Warning: No ALB or Elastic IP configured - instance only accessible via VPC[/yellow]"
            )

        # Save project state
        project_state = ProjectState(
            project_name=project_name,
            blueprint_name=blueprint_name,
            created_at=created_at,
            resources=created_resources,
        )
        manager.save_project_state(project_state)

        # Resources already tracked incrementally above
        console.print(f"[green]Project state saved[/green]")

        # Set cost limit if provided
        if cost_limit is not None:
            from pocket_architect.models import CostLimit
            from pocket_architect.state import cost_tracker

            # Validate action
            if cost_action not in ["stop", "teardown", "warn_only"]:
                console.print(
                    f"[yellow]Warning: Invalid cost action '{cost_action}', using 'warn_only'[/yellow]"
                )
                cost_action = "warn_only"

            cost_limit_obj = CostLimit(
                project_name=project_name,
                limit_amount=cost_limit,
                action=cost_action,
            )
            cost_tracker.set_cost_limit(cost_limit_obj)
            console.print(
                f"[green]Cost limit set: ${cost_limit:.2f} (action: {cost_action})[/green]"
            )

    except Exception as e:
        console.print(f"[red]Error during deployment: {e}[/red]")
        cleanup_on_failure(created_resources, session, project_name)
        raise typer.Exit(1)


@app.command()
def teardown(
    project_name: str = typer.Argument(..., help="Project name"),
    force: bool = typer.Option(False, "--force", "-f", help="Skip confirmation"),
) -> None:
    """Tear down a project and all its resources."""
    print_aws_identity()
    _teardown_project(project_name, force)


def _teardown_resources(project_name: str, resources: dict[str, Any], force: bool = False) -> None:
    """Internal function to tear down resources directly."""
    if not force:
        console.print(
            f"[yellow]This will delete all resources for project '{project_name}'[/yellow]"
        )
        from rich.prompt import Confirm

        if not Confirm.ask("Are you sure?"):
            console.print("[yellow]Cancelled[/yellow]")
            return

    console.print(f"[cyan]Tearing down project '{project_name}'...[/cyan]")

    session = aws_client.get_boto3_session()
    ec2 = session.client("ec2")
    elbv2 = session.client("elbv2")

    # ALB and target group (must delete listeners first, then target groups, then ALB)
    if "alb" in resources:
        try:
            alb_arn = resources["alb"]

            # Step 1: Delete listeners first
            listeners = elbv2.describe_listeners(LoadBalancerArn=alb_arn)
            for listener in listeners.get("Listeners", []):
                try:
                    elbv2.delete_listener(ListenerArn=listener["ListenerArn"])
                    console.print(
                        f"[green]Deleted listener {listener['ListenerArn'][:50]}...[/green]"
                    )
                except Exception as e:
                    logger.warning(f"Failed to delete listener: {e}")

            # Step 2: Delete target groups
            target_groups = elbv2.describe_target_groups(LoadBalancerArn=alb_arn)
            for tg in target_groups.get("TargetGroups", []):
                try:
                    elbv2.delete_target_group(TargetGroupArn=tg["TargetGroupArn"])
                    console.print(f"[green]Deleted target group[/green]")
                except Exception as e:
                    logger.warning(f"Failed to delete target group: {e}")

            # Step 3: Delete the ALB itself
            elbv2.delete_load_balancer(LoadBalancerArn=alb_arn)
            console.print(f"[green]Deleted ALB[/green]")
        except Exception as e:
            console.print(f"[yellow]Warning: Failed to delete ALB: {e}[/yellow]")

    # Elastic IP
    if "elastic_ip" in resources:
        try:
            ec2.release_address(AllocationId=resources["elastic_ip"])
            console.print(f"[green]Released Elastic IP[/green]")
        except Exception as e:
            console.print(f"[yellow]Warning: Failed to release Elastic IP: {e}[/yellow]")

    # Instance
    if "instance" in resources:
        try:
            ec2.terminate_instances(InstanceIds=[resources["instance"]])
            # Wait for termination
            waiter = ec2.get_waiter("instance_terminated")
            waiter.wait(
                InstanceIds=[resources["instance"]], WaiterConfig={"Delay": 5, "MaxAttempts": 60}
            )
            console.print(f"[green]Terminated instance[/green]")
        except Exception as e:
            console.print(f"[yellow]Warning: Failed to terminate instance: {e}[/yellow]")

    # Key pair
    if "key_pair" in resources:
        key_name = resources["key_pair"]
        try:
            # Delete from AWS
            ec2.delete_key_pair(KeyName=key_name)
            console.print(f"[green]Deleted key pair from AWS[/green]")
        except Exception as e:
            console.print(f"[yellow]Warning: Failed to delete key pair from AWS: {e}[/yellow]")

        # Delete local .pem file
        from pathlib import Path

        ssh_key_file = Path.home() / ".ssh" / f"{key_name}.pem"
        if ssh_key_file.exists():
            try:
                ssh_key_file.unlink()
                console.print(f"[green]Deleted local SSH key file: {ssh_key_file}[/green]")
            except Exception as e:
                console.print(f"[yellow]Warning: Failed to delete local SSH key file: {e}[/yellow]")

    # Security group
    if "security_group" in resources:
        try:
            ec2.delete_security_group(GroupId=resources["security_group"])
            console.print(f"[green]Deleted security group[/green]")
        except Exception as e:
            console.print(f"[yellow]Warning: Failed to delete security group: {e}[/yellow]")

    # Subnet
    if "subnet" in resources:
        try:
            ec2.delete_subnet(SubnetId=resources["subnet"])
            console.print(f"[green]Deleted subnet[/green]")
        except Exception as e:
            console.print(f"[yellow]Warning: Failed to delete subnet: {e}[/yellow]")

    # IAM Role and Instance Profile (must be deleted before VPC)
    if "iam_role" in resources or "iam_instance_profile" in resources:
        try:
            iam_role.delete_iam_role(session, project_name, resources)
            console.print(f"[green]Deleted IAM role and instance profile[/green]")
        except Exception as e:
            console.print(f"[yellow]Warning: Failed to delete IAM resources: {e}[/yellow]")

    # VPC (and internet gateway)
    if "vpc" in resources:
        try:
            vpc_id = resources["vpc"]
            # Delete internet gateway
            igws = ec2.describe_internet_gateways(
                Filters=[{"Name": "attachment.vpc-id", "Values": [vpc_id]}]
            )
            for igw in igws.get("InternetGateways", []):
                ec2.detach_internet_gateway(
                    InternetGatewayId=igw["InternetGatewayId"], VpcId=vpc_id
                )
                ec2.delete_internet_gateway(InternetGatewayId=igw["InternetGatewayId"])

            ec2.delete_vpc(VpcId=vpc_id)
            console.print(f"[green]Deleted VPC[/green]")
        except Exception as e:
            console.print(f"[yellow]Warning: Failed to delete VPC: {e}[/yellow]")

    # Delete project state (if exists)
    manager.delete_project_state(project_name)

    # Remove from resource tracker
    resource_tracker.remove_project_resources(project_name)

    console.print(f"[green]Project '{project_name}' torn down successfully[/green]")


def _teardown_project(project_name: str, force: bool = False) -> None:
    """Internal function to tear down a project from state."""
    # Load project state
    state = manager.load_project_state(project_name)
    if not state:
        # Try to get from resource tracker
        resources = resource_tracker.get_project_resources(project_name)
        if resources:
            _teardown_resources(project_name, resources, force)
            return
        console.print(f"[red]Error: Project '{project_name}' not found[/red]")
        return

    # Use state resources
    _teardown_resources(project_name, state.resources, force)


@app.command()
def stop(
    project_name: str = typer.Argument(..., help="Project name"),
) -> None:
    """Stop a project's EC2 instance (saves compute costs, keeps all resources)."""
    print_aws_identity()

    # Get resources from tracker or state
    resources = resource_tracker.get_project_resources(project_name)
    if not resources:
        state = manager.load_project_state(project_name)
        if state:
            resources = state.resources
        else:
            console.print(f"[red]Error: Project '{project_name}' not found[/red]")
            raise typer.Exit(1)

    if "instance" not in resources:
        console.print(f"[red]Error: Project '{project_name}' has no instance[/red]")
        raise typer.Exit(1)

    session = aws_client.get_boto3_session()
    ec2 = session.client("ec2")

    instance_id = resources["instance"]

    # Check current state
    instance_status = aws_status.get_instance_status(ec2, instance_id)
    if not instance_status.get("exists"):
        console.print(f"[red]Error: Instance {instance_id} not found in AWS[/red]")
        raise typer.Exit(1)

    current_state = instance_status.get("state", "unknown")
    if current_state == "stopped":
        console.print(f"[yellow]Instance is already stopped[/yellow]")
        return
    elif current_state != "running":
        console.print(f"[yellow]Instance is in '{current_state}' state, cannot stop[/yellow]")
        return

    console.print(f"[cyan]Stopping instance {instance_id}...[/cyan]")
    try:
        ec2.stop_instances(InstanceIds=[instance_id])

        # Wait for stopped state
        waiter = ec2.get_waiter("instance_stopped")
        waiter.wait(InstanceIds=[instance_id], WaiterConfig={"Delay": 5, "MaxAttempts": 60})

        console.print(f"[green]Instance stopped successfully[/green]")
        console.print(
            "[yellow]Note: You still pay for EBS storage and Elastic IP while stopped[/yellow]"
        )
        console.print(f"[yellow]Use 'pocket-architect start {project_name}' to restart[/yellow]")
    except Exception as e:
        console.print(f"[red]Error stopping instance: {e}[/red]")
        raise typer.Exit(1)


@app.command()
def start(
    project_name: str = typer.Argument(..., help="Project name"),
) -> None:
    """Start a stopped project's EC2 instance."""
    print_aws_identity()

    # Get resources from tracker or state
    resources = resource_tracker.get_project_resources(project_name)
    if not resources:
        state = manager.load_project_state(project_name)
        if state:
            resources = state.resources
        else:
            console.print(f"[red]Error: Project '{project_name}' not found[/red]")
            raise typer.Exit(1)

    if "instance" not in resources:
        console.print(f"[red]Error: Project '{project_name}' has no instance[/red]")
        raise typer.Exit(1)

    session = aws_client.get_boto3_session()
    ec2 = session.client("ec2")

    instance_id = resources["instance"]

    # Check current state
    instance_status = aws_status.get_instance_status(ec2, instance_id)
    if not instance_status.get("exists"):
        console.print(f"[red]Error: Instance {instance_id} not found in AWS[/red]")
        raise typer.Exit(1)

    current_state = instance_status.get("state", "unknown")
    if current_state == "running":
        console.print(f"[yellow]Instance is already running[/yellow]")
        return
    elif current_state != "stopped":
        console.print(f"[yellow]Instance is in '{current_state}' state, cannot start[/yellow]")
        return

    console.print(f"[cyan]Starting instance {instance_id}...[/cyan]")
    try:
        ec2.start_instances(InstanceIds=[instance_id])

        # Wait for running state
        waiter = ec2.get_waiter("instance_running")
        waiter.wait(InstanceIds=[instance_id], WaiterConfig={"Delay": 5, "MaxAttempts": 60})

        # Get updated instance info
        instance_status = aws_status.get_instance_status(ec2, instance_id)
        public_ip = instance_status.get("public_ip", "N/A")

        console.print(f"[green]Instance started successfully[/green]")

        # Show access info
        if "elastic_ip" in resources:
            eip_status = aws_status.get_eip_status(ec2, resources["elastic_ip"])
            if eip_status.get("public_ip"):
                public_ip = eip_status.get("public_ip")

        if "key_pair" in resources:
            key_name = resources["key_pair"]
            console.print(f"[cyan]SSH: ssh -i ~/.ssh/{key_name}.pem ec2-user@{public_ip}[/cyan]")

        if "alb" in resources:
            elbv2 = session.client("elbv2")
            alb_status = aws_status.get_alb_status(elbv2, resources["alb"])
            if alb_status.get("exists") and alb_status.get("dns_name"):
                console.print(f"[cyan]ALB: http://{alb_status.get('dns_name')}[/cyan]")
    except Exception as e:
        console.print(f"[red]Error starting instance: {e}[/red]")
        raise typer.Exit(1)


@app.command("teardown-all")
def teardown_all(
    force: bool = typer.Option(False, "--force", "-f", help="Skip confirmation for each project"),
    check_status: bool = typer.Option(
        True, "--check-status/--no-check-status", help="Check resource status before teardown"
    ),
) -> None:
    """Tear down all projects and their resources."""
    print_aws_identity()

    # Get projects ONLY from resource tracker (source of truth)
    tracked_projects = resource_tracker.get_all_tracked_projects()

    if not tracked_projects:
        console.print("[yellow]No tracked projects found[/yellow]")
        return

    console.print(f"[cyan]Found {len(tracked_projects)} tracked project(s):[/cyan]")
    for project in sorted(tracked_projects):
        # Check if state file exists for reference
        state_exists = manager.load_project_state(project) is not None
        source = " (state file exists)" if state_exists else " (tracked only - no state file)"
        console.print(f"  - {project}{source}")

    console.print()
    if not force:
        from rich.prompt import Confirm

        console.print("[yellow]WARNING: This will delete ALL tracked resources![/yellow]")
        if not Confirm.ask("Are you sure you want to continue?", default=False):
            console.print("[yellow]Cancelled[/yellow]")
            return

    session = aws_client.get_boto3_session()
    ec2 = session.client("ec2")
    elbv2 = session.client("elbv2")

    # Check status of all resources if requested
    if check_status:
        console.print()
        console.print("[cyan]Checking resource status from tracker...[/cyan]")
        status_table = Table(title="Resource Status Before Teardown")
        status_table.add_column("Project")
        status_table.add_column("Resource Type")
        status_table.add_column("ID")
        status_table.add_column("Status")

        for project in sorted(tracked_projects):
            # Get resources ONLY from tracker
            resources = resource_tracker.get_project_resources(project)
            if not resources:
                status_table.add_row(
                    project, "N/A", "No resources in tracker", "[yellow]Empty[/yellow]"
                )
                continue

            # Check instance
            if "instance" in resources:
                instance_status = aws_status.get_instance_status(ec2, resources["instance"])
                if instance_status.get("exists"):
                    state = instance_status.get("state", "unknown")
                    color = "[green]" if state == "running" else "[yellow]"
                    status_table.add_row(
                        project, "EC2 Instance", resources["instance"], f"{color}{state}[/{color}]"
                    )
                else:
                    status_table.add_row(
                        project, "EC2 Instance", resources["instance"], "[red]Not Found[/red]"
                    )

            # Check ALB
            if "alb" in resources:
                alb_status = aws_status.get_alb_status(elbv2, resources["alb"])
                if alb_status.get("exists"):
                    state_code = (
                        alb_status.get("state", {}).get("Code", "unknown")
                        if isinstance(alb_status.get("state"), dict)
                        else alb_status.get("state", "unknown")
                    )
                    color = "[green]" if state_code == "active" else "[yellow]"
                    status_table.add_row(
                        project,
                        "ALB",
                        resources["alb"][:50] + "...",
                        f"{color}{state_code}[/{color}]",
                    )
                else:
                    status_table.add_row(
                        project, "ALB", resources["alb"][:50] + "...", "[red]Not Found[/red]"
                    )

            # Check Elastic IP
            if "elastic_ip" in resources:
                eip_status = aws_status.get_eip_status(ec2, resources["elastic_ip"])
                if eip_status.get("exists"):
                    associated = (
                        "[green]Associated[/green]"
                        if eip_status.get("associated")
                        else "[yellow]Unassociated[/yellow]"
                    )
                    status_table.add_row(project, "Elastic IP", resources["elastic_ip"], associated)
                else:
                    status_table.add_row(
                        project, "Elastic IP", resources["elastic_ip"], "[red]Not Found[/red]"
                    )

        console.print(status_table)
        console.print()

    # Teardown each project using ONLY tracker resources
    for project in sorted(tracked_projects):
        console.print()
        console.print(f"[cyan]Tearing down project: {project}[/cyan]")
        try:
            # Get resources ONLY from tracker (source of truth)
            resources = resource_tracker.get_project_resources(project)
            if resources:
                _teardown_resources(project, resources, force=True)
            else:
                console.print(
                    f"[yellow]No resources found in tracker for {project}, skipping[/yellow]"
                )
        except Exception as e:
            console.print(f"[red]Error tearing down {project}: {e}[/red]")
            # Continue with next project

    console.print()
    console.print(f"[green]Completed teardown of {len(tracked_projects)} project(s)[/green]")


@app.command("status")
def project_status(
    project_name: str = typer.Argument(..., help="Project name"),
    watch: bool = typer.Option(
        False, "--watch", "-w", help="Continuously monitor status (Ctrl+C to stop)"
    ),
) -> None:
    """Show detailed status of a project and all its resources."""
    print_aws_identity()

    # Load project state
    state = manager.load_project_state(project_name)
    if not state:
        console.print(f"[red]Error: Project '{project_name}' not found[/red]")
        raise typer.Exit(1)

    session = aws_client.get_boto3_session()
    ec2 = session.client("ec2")
    elbv2 = session.client("elbv2")

    console.print(f"[bold cyan]Project: {project_name}[/bold cyan]")
    console.print(f"Blueprint: {state.blueprint_name}")
    console.print(f"Created: {state.created_at.strftime('%Y-%m-%d %H:%M:%S')}")
    console.print()

    # Create status table
    table = Table(title="Resource Status")
    table.add_column("Resource Type")
    table.add_column("ID/Name")
    table.add_column("Status")
    table.add_column("Details")

    resources = state.resources

    # Check VPC
    if "vpc" in resources:
        vpc_status = aws_status.get_vpc_status(ec2, resources["vpc"])
        if vpc_status.get("exists"):
            table.add_row(
                "VPC",
                resources["vpc"],
                vpc_status.get("state", "unknown"),
                f"CIDR: {vpc_status.get('cidr', 'N/A')}",
            )
        else:
            table.add_row("VPC", resources["vpc"], "[red]Not Found[/red]", "")

    # Check Subnet
    if "subnet" in resources:
        subnet_status = aws_status.get_subnet_status(ec2, resources["subnet"])
        if subnet_status.get("exists"):
            table.add_row(
                "Subnet",
                resources["subnet"],
                subnet_status.get("state", "unknown"),
                f"AZ: {subnet_status.get('az', 'N/A')}",
            )
        else:
            table.add_row("Subnet", resources["subnet"], "[red]Not Found[/red]", "")

    # Check Security Group
    if "security_group" in resources:
        sg_status = aws_status.get_security_group_status(ec2, resources["security_group"])
        if sg_status.get("exists"):
            table.add_row(
                "Security Group",
                resources["security_group"],
                "[green]Active[/green]",
                sg_status.get("name", "N/A"),
            )
        else:
            table.add_row("Security Group", resources["security_group"], "[red]Not Found[/red]", "")

    # Check Key Pair
    if "key_pair" in resources:
        key_status = aws_status.get_key_pair_status(ec2, resources["key_pair"])
        if key_status.get("exists"):
            table.add_row("Key Pair", resources["key_pair"], "[green]Exists[/green]", "")
        else:
            table.add_row("Key Pair", resources["key_pair"], "[red]Not Found[/red]", "")

    # Check Instance
    if "instance" in resources:
        instance_status = aws_status.get_instance_status(ec2, resources["instance"])
        if instance_status.get("exists"):
            state_name = instance_status.get("state", "unknown")
            state_color = "[green]" if state_name == "running" else "[yellow]"
            details = f"IP: {instance_status.get('public_ip', 'N/A')}"
            if instance_status.get("instance_type"):
                details += f" | Type: {instance_status.get('instance_type')}"
            table.add_row(
                "EC2 Instance",
                resources["instance"],
                f"{state_color}{state_name.title()}[/{state_color}]",
                details,
            )
        else:
            table.add_row("EC2 Instance", resources["instance"], "[red]Not Found[/red]", "")

    # Check Elastic IP
    if "elastic_ip" in resources:
        eip_status = aws_status.get_eip_status(ec2, resources["elastic_ip"])
        if eip_status.get("exists"):
            associated = (
                "[green]Associated[/green]"
                if eip_status.get("associated")
                else "[yellow]Unassociated[/yellow]"
            )
            details = f"IP: {eip_status.get('public_ip', 'N/A')}"
            if eip_status.get("instance_id"):
                details += f" | Instance: {eip_status.get('instance_id')}"
            table.add_row(
                "Elastic IP",
                resources["elastic_ip"],
                associated,
                details,
            )
        else:
            table.add_row("Elastic IP", resources["elastic_ip"], "[red]Not Found[/red]", "")

    # Check ALB
    if "alb" in resources:
        alb_status = aws_status.get_alb_status(elbv2, resources["alb"])
        if alb_status.get("exists"):
            state_code = (
                alb_status.get("state", {}).get("Code", "unknown")
                if isinstance(alb_status.get("state"), dict)
                else alb_status.get("state", "unknown")
            )
            state_color = "[green]" if state_code == "active" else "[yellow]"
            details = f"DNS: {alb_status.get('dns_name', 'N/A')}"
            table.add_row(
                "Application Load Balancer",
                resources["alb"][:50] + "..." if len(resources["alb"]) > 50 else resources["alb"],
                f"{state_color}{state_code}[/{state_color}]",
                details,
            )

            # Check target group
            tg_status = aws_status.get_target_group_status(elbv2, resources["alb"])
            if tg_status.get("exists"):
                healthy = tg_status.get("healthy_count", 0)
                unhealthy = tg_status.get("unhealthy_count", 0)
                total = tg_status.get("total_count", 0)
                health_color = "[green]" if unhealthy == 0 else "[yellow]"
                table.add_row(
                    "Target Group",
                    (
                        tg_status.get("tg_arn", "N/A")[:50] + "..."
                        if len(tg_status.get("tg_arn", "")) > 50
                        else tg_status.get("tg_arn", "N/A")
                    ),
                    f"{health_color}Healthy: {healthy}/{total}[/{health_color}]",
                    f"Unhealthy: {unhealthy}" if unhealthy > 0 else "All healthy",
                )
        else:
            table.add_row("Application Load Balancer", resources["alb"], "[red]Not Found[/red]", "")

    console.print(table)

    # If watch mode, continuously check until everything is ready
    if watch:
        import time
        from rich.live import Live
        from rich.panel import Panel

        console.print()
        console.print("[yellow]Watching for changes (Ctrl+C to stop)...[/yellow]")

        def get_status_table():
            """Generate status table for live display."""
            table = Table(title=f"Project: {project_name} (Watching)")
            table.add_column("Resource")
            table.add_column("Status")
            table.add_column("Details")

            # Check key resources
            if "instance" in resources:
                instance_status = aws_status.get_instance_status(ec2, resources["instance"])
                if instance_status.get("exists"):
                    state = instance_status.get("state", "unknown")
                    color = "[green]" if state == "running" else "[yellow]"
                    table.add_row(
                        "EC2 Instance",
                        f"{color}{state.title()}[/{color}]",
                        f"IP: {instance_status.get('public_ip', 'N/A')}",
                    )

            if "alb" in resources:
                alb_status = aws_status.get_alb_status(elbv2, resources["alb"])
                if alb_status.get("exists"):
                    state_code = (
                        alb_status.get("state", {}).get("Code", "unknown")
                        if isinstance(alb_status.get("state"), dict)
                        else alb_status.get("state", "unknown")
                    )
                    color = "[green]" if state_code == "active" else "[yellow]"
                    table.add_row(
                        "ALB",
                        f"{color}{state_code}[/{color}]",
                        f"DNS: {alb_status.get('dns_name', 'N/A')}",
                    )

                    tg_status = aws_status.get_target_group_status(elbv2, resources["alb"])
                    if tg_status.get("exists"):
                        healthy = tg_status.get("healthy_count", 0)
                        total = tg_status.get("total_count", 0)
                        color = "[green]" if healthy == total and total > 0 else "[yellow]"
                        table.add_row(
                            "Target Health",
                            f"{color}{healthy}/{total} healthy[/{color}]",
                            "",
                        )

            return Panel(table, title="Status")

        try:
            with Live(get_status_table(), refresh_per_second=2, screen=True) as live:
                while True:
                    time.sleep(5)
                    live.update(get_status_table())
        except KeyboardInterrupt:
            console.print("\n[yellow]Stopped watching[/yellow]")


@app.command("list")
def list_projects() -> None:
    """List all projects."""
    print_aws_identity()

    projects = manager.list_projects()
    if not projects:
        console.print("[yellow]No projects found[/yellow]")
        return

    table = Table(title="Projects")
    table.add_column("Name")
    table.add_column("Blueprint")
    table.add_column("Created")
    table.add_column("Status")

    session = aws_client.get_boto3_session()
    ec2 = session.client("ec2")

    for project_name in projects:
        state = manager.load_project_state(project_name)
        if state:
            # Check if resources still exist
            status = "Unknown"
            if "instance" in state.resources:
                try:
                    instance_status = aws_status.get_instance_status(
                        ec2, state.resources["instance"]
                    )
                    if instance_status.get("exists"):
                        status = instance_status.get("state", "unknown").title()
                    else:
                        status = "Deleted"
                except Exception:
                    status = "Deleted"

            table.add_row(
                state.project_name,
                state.blueprint_name,
                state.created_at.strftime("%Y-%m-%d %H:%M:%S"),
                status,
            )

    console.print(table)


def _snapshot_create(
    project_name: str,
    name: str,
    note: str | None = None,
) -> None:
    """Create a snapshot from a project's instance (internal function)."""
    print_aws_identity()

    # Load project state
    state = manager.load_project_state(project_name)
    if not state:
        console.print(f"[red]Error: Project '{project_name}' not found[/red]")
        raise typer.Exit(1)

    if "instance" not in state.resources:
        console.print(f"[red]Error: Project '{project_name}' has no instance[/red]")
        raise typer.Exit(1)

    session = aws_client.get_boto3_session()
    ec2 = session.client("ec2")

    # Get instance volumes
    instance_id = state.resources["instance"]
    instances = ec2.describe_instances(InstanceIds=[instance_id])
    if not instances.get("Reservations"):
        console.print(f"[red]Error: Instance {instance_id} not found[/red]")
        raise typer.Exit(1)

    instance = instances["Reservations"][0]["Instances"][0]
    block_devices = instance.get("BlockDeviceMappings", [])

    # Find root device
    root_device = None
    for bdm in block_devices:
        if "Ebs" in bdm:
            if bdm.get("DeviceName") == instance.get("RootDeviceName"):
                root_device = bdm
                break

    if not root_device:
        # Fallback to first EBS volume
        root_device = next((b for b in block_devices if "Ebs" in b), None)
        if not root_device:
            console.print(f"[red]Error: No volumes found for instance[/red]")
            raise typer.Exit(1)

    root_volume = root_device["Ebs"]["VolumeId"]
    device_name = root_device.get("DeviceName", "/dev/sda1")

    console.print(f"[cyan]Creating snapshot from volume {root_volume}...[/cyan]")

    # Create snapshot
    tags = make_tags(project_name, "", datetime.now(timezone.utc))
    tags.append({"Key": "pocket-architect-snapshot-name", "Value": name})

    snapshot_response = ec2.create_snapshot(
        VolumeId=root_volume,
        Description=f"Pocket Architect snapshot: {name}",
        TagSpecifications=[{"ResourceType": "snapshot", "Tags": tags}],
    )

    snapshot_id = snapshot_response["SnapshotId"]
    console.print(f"[green]Created snapshot: {snapshot_id}[/green]")

    # Wait for snapshot to complete
    console.print("[yellow]Waiting for snapshot to complete...[/yellow]")
    waiter = ec2.get_waiter("snapshot_completed")
    waiter.wait(SnapshotIds=[snapshot_id], WaiterConfig={"Delay": 15, "MaxAttempts": 40})

    # Create AMI from snapshot
    console.print("[yellow]Creating AMI from snapshot...[/yellow]")

    image_response = ec2.register_image(
        Name=f"pa-{name}-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}",
        RootDeviceName=device_name,
        BlockDeviceMappings=[
            {
                "DeviceName": device_name,
                "Ebs": {"SnapshotId": snapshot_id},
            }
        ],
    )

    ami_id = image_response["ImageId"]
    console.print(f"[green]Created AMI: {ami_id}[/green]")

    # Save snapshot metadata
    snapshot_meta = SnapshotMetadata(
        snapshot_id=snapshot_id,
        name=name,
        project_name=project_name,
        ami_id=ami_id,
        note=note,
    )
    snapshot_index.save_snapshot_metadata(snapshot_meta)

    console.print(f"[green]Snapshot '{name}' saved successfully[/green]")


# Snapshot subcommands
snapshot_app = typer.Typer(help="Snapshot management")


@snapshot_app.command("create")
def snapshot_create_cmd(
    project_name: str = typer.Argument(..., help="Project name"),
    name: str = typer.Option(..., "--name", "-n", help="Snapshot name"),
    note: str | None = typer.Option(None, "--note", help="Optional note for the snapshot"),
) -> None:
    """Create a snapshot from a project's instance."""
    _snapshot_create(project_name, name, note)


@snapshot_app.command("list")
def snapshot_list_cmd() -> None:
    """List all snapshots."""
    print_aws_identity()

    snapshots = snapshot_index.load_snapshots()
    if not snapshots:
        console.print("[yellow]No snapshots found[/yellow]")
        return

    table = Table(title="Snapshots")
    table.add_column("Name")
    table.add_column("Snapshot ID")
    table.add_column("Project")
    table.add_column("AMI ID")
    table.add_column("Created")
    table.add_column("Note")

    for snap in snapshots:
        table.add_row(
            snap.name,
            snap.snapshot_id,
            snap.project_name,
            snap.ami_id or "N/A",
            snap.created_at.strftime("%Y-%m-%d %H:%M:%S"),
            snap.note or "",
        )

    console.print(table)


@snapshot_app.command("delete")
def snapshot_delete_cmd(
    name_or_id: str = typer.Argument(..., help="Snapshot name or snapshot ID"),
) -> None:
    """Delete a snapshot and its associated AMI."""
    print_aws_identity()

    # Find snapshot
    snap_meta = snapshot_index.find_snapshot(name_or_id)
    if not snap_meta:
        console.print(f"[red]Error: Snapshot '{name_or_id}' not found[/red]")
        raise typer.Exit(1)

    session = aws_client.get_boto3_session()
    ec2 = session.client("ec2")

    # Deregister AMI if exists
    if snap_meta.ami_id:
        try:
            ec2.deregister_image(ImageId=snap_meta.ami_id)
            console.print(f"[green]Deregistered AMI: {snap_meta.ami_id}[/green]")
        except Exception as e:
            console.print(f"[yellow]Warning: Failed to deregister AMI: {e}[/yellow]")

    # Delete snapshot
    try:
        ec2.delete_snapshot(SnapshotId=snap_meta.snapshot_id)
        console.print(f"[green]Deleted snapshot: {snap_meta.snapshot_id}[/green]")
    except Exception as e:
        console.print(f"[yellow]Warning: Failed to delete snapshot: {e}[/yellow]")

    # Remove from index
    snapshot_index.delete_snapshot_metadata(name_or_id)

    console.print(f"[green]Snapshot '{snap_meta.name}' deleted successfully[/green]")


app.add_typer(snapshot_app, name="snapshot")

# Blueprint subcommands
blueprint_app = typer.Typer(help="Blueprint management")


@blueprint_app.command("create")
def blueprint_create_cmd() -> None:
    """Create a new blueprint interactively."""
    print_aws_identity()

    from pocket_architect.wizard import create_blueprint_wizard

    create_blueprint_wizard()


@blueprint_app.command("list")
def blueprint_list_cmd() -> None:
    """List all available blueprints."""
    print_aws_identity()

    table = Table(title="Blueprints")
    table.add_column("Name")
    table.add_column("Description")
    table.add_column("Type")

    # Builtin blueprints
    builtin_blueprints = builtin.get_builtin_blueprints()
    for name, blueprint in builtin_blueprints.items():
        table.add_row(name, blueprint.description, "Built-in")

    # User blueprints
    user_blueprint_names = loader.list_user_blueprints()
    for name in user_blueprint_names:
        blueprint = loader.load_user_blueprint(name)
        if blueprint:
            table.add_row(name, blueprint.description, "User")

    console.print(table)


app.add_typer(blueprint_app, name="blueprint")

# Cost subcommands
cost_app = typer.Typer(help="Cost tracking and limit management")


@cost_app.command("set")
def cost_set_cmd(
    project_name: str = typer.Argument(..., help="Project name"),
    limit: float = typer.Option(..., "--limit", "-l", help="Cost limit in USD"),
    action: str = typer.Option(
        "warn_only",
        "--action",
        "-a",
        help="Action when limit exceeded: stop, teardown, or warn_only",
    ),
    warning_threshold: float = typer.Option(
        0.75,
        "--warning-threshold",
        "-w",
        help="Warning threshold as fraction (0.0-1.0, default 0.75 = 75%)",
    ),
) -> None:
    """Set or update cost limit for a project."""
    print_aws_identity()

    from pocket_architect.models import CostLimit
    from pocket_architect.state import cost_tracker

    # Validate cost limit
    if limit <= 0:
        console.print(f"[red]Error: Cost limit must be greater than 0[/red]")
        raise typer.Exit(1)

    # Validate action (Pydantic model will also validate, but check early for better UX)
    if action not in ["stop", "teardown", "warn_only"]:
        console.print(f"[red]Error: Action must be one of: stop, teardown, warn_only[/red]")
        raise typer.Exit(1)

    # Validate warning threshold
    if not 0.0 <= warning_threshold <= 1.0:
        console.print(f"[red]Error: Warning threshold must be between 0.0 and 1.0[/red]")
        raise typer.Exit(1)

    # Check if project exists
    state = manager.load_project_state(project_name)
    if not state:
        console.print(f"[red]Error: Project '{project_name}' not found[/red]")
        raise typer.Exit(1)

    # Create or update cost limit
    cost_limit = CostLimit(
        project_name=project_name,
        limit_amount=limit,
        action=action,
        warning_threshold=warning_threshold,
    )
    cost_tracker.set_cost_limit(cost_limit)

    console.print(f"[green]Cost limit set for project '{project_name}':[/green]")
    console.print(f"  Limit: ${limit:.2f}")
    console.print(f"  Action: {action}")
    console.print(f"  Warning threshold: {warning_threshold * 100:.0f}%")


@cost_app.command("check")
def cost_check_cmd(
    project_name: str = typer.Argument(..., help="Project name"),
    use_aws_api: bool = typer.Option(
        False, "--aws-api", "-A", help="Also fetch actual cost from AWS Cost Explorer"
    ),
) -> None:
    """Check current cost for a project."""
    print_aws_identity()

    from pocket_architect.providers.aws import cost as cost_module, enforcement
    from pocket_architect.state import cost_tracker

    # Load project state
    state = manager.load_project_state(project_name)
    if not state:
        console.print(f"[red]Error: Project '{project_name}' not found[/red]")
        raise typer.Exit(1)

    # Get resources
    resources = resource_tracker.get_project_resources(project_name)
    if not resources:
        resources = state.resources

    session = aws_client.get_boto3_session()

    # Calculate cost estimate
    cost_estimate = cost_module.estimate_project_cost(
        session, project_name, resources, state.created_at
    )

    # Optionally fetch actual cost from AWS
    if use_aws_api:
        actual_cost = cost_module.get_aws_cost_explorer_cost(
            session, project_name, state.created_at, datetime.now(timezone.utc)
        )
        if actual_cost is not None:
            cost_estimate.actual_cost = actual_cost

    # Save to history
    cost_tracker.add_cost_estimate(cost_estimate)

    # Check against limit if set
    limit = cost_tracker.get_cost_limit(project_name)
    if limit:
        check_result = enforcement.check_cost_limit(session, project_name, cost_estimate, limit)
        console.print(f"[cyan]Cost Limit Check for '{project_name}':[/cyan]")
        console.print(f"  Estimated Cost: ${cost_estimate.estimated_cost:.2f}")
        if cost_estimate.actual_cost:
            console.print(f"  Actual Cost (AWS): ${cost_estimate.actual_cost:.2f}")
        console.print(f"  Limit: ${limit.limit_amount:.2f}")
        console.print(f"  Usage: {check_result['percentage']:.1f}%")

        if check_result["warnings"]:
            for warning in check_result["warnings"]:
                console.print(f"[yellow]{warning}[/yellow]")
    else:
        console.print(f"[cyan]Cost Estimate for '{project_name}':[/cyan]")
        console.print(f"  Estimated Cost: ${cost_estimate.estimated_cost:.2f}")
        if cost_estimate.actual_cost:
            console.print(f"  Actual Cost (AWS): ${cost_estimate.actual_cost:.2f}")
        console.print("[yellow]No cost limit configured for this project[/yellow]")

    # Show breakdown
    if cost_estimate.breakdown:
        console.print("\n[cyan]Cost Breakdown:[/cyan]")
        for resource_type, cost in cost_estimate.breakdown.items():
            console.print(f"  {resource_type}: ${cost:.2f}")


@cost_app.command("list")
def cost_list_cmd() -> None:
    """List all projects with their cost information and limits."""
    print_aws_identity()

    from pocket_architect.providers.aws import cost as cost_module
    from pocket_architect.state import cost_tracker

    projects = manager.list_projects()
    if not projects:
        console.print("[yellow]No projects found[/yellow]")
        return

    session = aws_client.get_boto3_session()
    limits = cost_tracker.load_cost_limits()

    table = Table(title="Project Costs")
    table.add_column("Project")
    table.add_column("Estimated Cost")
    table.add_column("Limit")
    table.add_column("Usage %")
    table.add_column("Action")

    for project_name in sorted(projects):
        state = manager.load_project_state(project_name)
        if not state:
            continue

        resources = resource_tracker.get_project_resources(project_name)
        if not resources:
            resources = state.resources

        cost_estimate = cost_module.estimate_project_cost(
            session, project_name, resources, state.created_at
        )

        limit = limits.get(project_name)
        if limit:
            percentage = (
                (cost_estimate.estimated_cost / limit.limit_amount) * 100
                if limit.limit_amount > 0
                else 0
            )
            color = "[red]" if percentage >= 100 else "[yellow]" if percentage >= 75 else "[green]"
            usage_str = f"{color}{percentage:.1f}%[/{color}]"
            limit_str = f"${limit.limit_amount:.2f}"
            action_str = limit.action
        else:
            usage_str = "N/A"
            limit_str = "None"
            action_str = "N/A"

        table.add_row(
            project_name,
            f"${cost_estimate.estimated_cost:.2f}",
            limit_str,
            usage_str,
            action_str,
        )

    console.print(table)


@cost_app.command("enforce")
def cost_enforce_cmd(
    project_name: str | None = typer.Argument(
        None, help="Project name (optional: omit to enforce limits for all projects)"
    ),
) -> None:
    """Manually trigger cost limit enforcement check."""
    print_aws_identity()

    from pocket_architect.providers.aws import enforcement
    from pocket_architect.state import cost_tracker

    session = aws_client.get_boto3_session()

    if project_name:
        # Enforce for single project
        limit = cost_tracker.get_cost_limit(project_name)
        if not limit:
            console.print(f"[yellow]No cost limit configured for project '{project_name}'[/yellow]")
            return

        result = enforcement.enforce_cost_limit(session, project_name, limit)

        console.print(f"[cyan]Enforcement Check for '{project_name}':[/cyan]")
        console.print(f"  Cost: ${result.get('cost', 0):.2f}")
        console.print(f"  Limit: ${result.get('limit', 0):.2f}")
        console.print(f"  Usage: {result.get('percentage', 0):.1f}%")

        if result.get("warnings"):
            for warning in result["warnings"]:
                console.print(f"[yellow]{warning}[/yellow]")

        if result.get("action_executed"):
            console.print(f"[green]{result.get('action_message', 'Action executed')}[/green]")
        elif result.get("action"):
            console.print(
                f"[yellow]Action '{result['action']}' would be executed if limit exceeded[/yellow]"
            )
    else:
        # Enforce for all projects
        console.print("[cyan]Enforcing cost limits for all projects...[/cyan]")
        results = enforcement.enforce_all_cost_limits(session)

        for proj_name, result in results.items():
            if result.get("enforced"):
                console.print(
                    f"[red]{proj_name}: Action executed - {result.get('action_message', '')}[/red]"
                )
            elif result.get("warnings"):
                for warning in result["warnings"]:
                    console.print(f"[yellow]{proj_name}: {warning}[/yellow]")

        # Check global limit
        global_check = enforcement.check_global_cost_limit(session)
        if global_check.get("checked"):
            console.print(f"\n[cyan]Global Cost Limit:[/cyan]")
            console.print(f"  Total Cost: ${global_check['total_cost']:.2f}")
            console.print(f"  Global Limit: ${global_check['global_limit']:.2f}")
            console.print(f"  Usage: {global_check['percentage']:.1f}%")
            if global_check.get("warning"):
                console.print(f"[yellow]{global_check['warning']}[/yellow]")


@cost_app.command("global-limit")
def cost_global_limit_cmd(
    limit: float | None = typer.Option(None, "--limit", "-l", help="Set global cost limit in USD"),
    remove: bool = typer.Option(False, "--remove", "-r", help="Remove global cost limit"),
) -> None:
    """View or set global cost limit across all projects."""
    print_aws_identity()

    from pocket_architect.state import cost_tracker

    # Validate limit if provided
    if limit is not None:
        if limit <= 0:
            console.print(f"[red]Error: Global cost limit must be greater than 0[/red]")
            raise typer.Exit(1)

    if remove:
        cost_tracker.set_global_cost_limit(None)
        console.print("[green]Global cost limit removed[/green]")
    elif limit is not None:
        cost_tracker.set_global_cost_limit(limit)
        console.print(f"[green]Global cost limit set to ${limit:.2f}[/green]")
    else:
        # Show current global limit
        global_limit = cost_tracker.get_global_cost_limit()
        if global_limit:
            console.print(f"[cyan]Global cost limit: ${global_limit:.2f}[/cyan]")
        else:
            console.print("[yellow]No global cost limit configured[/yellow]")


app.add_typer(cost_app, name="cost")
