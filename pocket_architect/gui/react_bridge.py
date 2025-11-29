"""Synchronous bridge functions for React UI."""

from datetime import datetime, timedelta, timezone
from typing import Any

from pocket_architect import cli
from pocket_architect.blueprints import builtin, loader, scripts
from pocket_architect.config import TEMPLATES_DIR, get_aws_identity, logger
from pocket_architect.models import CostLimit
from pocket_architect.providers.aws import client as aws_client, cost as cost_module, quota, status as aws_status
from pocket_architect.providers.aws.orchestrators import (
    certificate,
    certificate_resource,
    iam_role_resource,
    key_pair,
    security_group,
    security_group_resource,
)
from pocket_architect.state import (
    cost_tracker,
    manager,
    resource_tracker,
    image_index,
    security_configs,
    security_resources,
)
from pocket_architect.providers.aws.utils import sanitize_name
import json


def list_projects() -> list[dict[str, Any]]:
    """List all projects with status and resource details.

    Returns:
        List of project dicts with keys: name, blueprint, status, created_at, instance_details, resource_counts
    """
    projects = manager.list_projects()
    result = []

    for project_name in projects:
        # Load project state with error handling for corrupted files
        try:
            state = manager.load_project_state(project_name)
            if not state:
                logger.warning(f"Project state file not found or empty for '{project_name}' - skipping")
                continue
        except (ValueError, IOError, OSError) as e:
            logger.error(f"Failed to load project state for '{project_name}': {e} - skipping corrupted project")
            continue
        except Exception as e:
            logger.exception(f"Unexpected error loading project state for '{project_name}': {e} - skipping")
            continue

        # Get full project status (queries AWS for all resources)
        try:
            project_status = get_project_status(project_name)
            if not project_status:
                logger.warning(f"Could not get project status for '{project_name}' - skipping")
                continue
        except Exception as e:
            logger.error(f"Error getting project status for '{project_name}': {e} - skipping")
            continue

        # Extract instance details if available
        instance_details = None
        instance_resource = project_status.get("resources", {}).get("instance")
        if instance_resource and instance_resource.get("exists"):
            instance_details = {
                "instance_id": state.resources.get("instance"),
                "instance_type": instance_resource.get("instance_type"),
                "state": instance_resource.get("state"),
                "public_ip": instance_resource.get("public_ip"),
                "private_ip": instance_resource.get("private_ip"),
            }

        # Count resources
        resource_counts = {
            "instances": 1 if instance_resource and instance_resource.get("exists") else 0,
            "security_groups": 0,
            "s3_buckets": 0,
            "ebs_volumes": 0,
            "has_alb": 1 if project_status.get("resources", {}).get("alb", {}).get("exists") else 0,
            "has_elastic_ip": 1 if project_status.get("resources", {}).get("elastic_ip", {}).get("exists") else 0,
            "has_efs": 1 if project_status.get("resources", {}).get("efs", {}).get("exists") else 0,
            "has_iam_role": 1 if project_status.get("resources", {}).get("iam_role", {}).get("exists") else 0,
        }

        # Count security groups
        if "security_group" in project_status.get("resources", {}):
            resource_counts["security_groups"] += 1
        if "security_groups" in project_status.get("resources", {}):
            sg_list = project_status["resources"]["security_groups"]
            if isinstance(sg_list, list):
                resource_counts["security_groups"] += len(sg_list)
        if "alb_security_group" in project_status.get("resources", {}):
            resource_counts["security_groups"] += 1
        if "instance_security_group" in project_status.get("resources", {}):
            resource_counts["security_groups"] += 1

        # Count S3 buckets
        s3_buckets = project_status.get("resources", {}).get("s3_buckets", [])
        if isinstance(s3_buckets, list):
            resource_counts["s3_buckets"] = len([b for b in s3_buckets if b.get("exists")])

        # Count EBS volumes
        ebs_volumes = project_status.get("resources", {}).get("ebs_volumes", [])
        if isinstance(ebs_volumes, list):
            resource_counts["ebs_volumes"] = len([v for v in ebs_volumes if v.get("exists")])

        # Extract resource details from project_status
        resources_info = project_status.get("resources", {})
        
        # Build networking info
        networking = {}
        if "vpc" in resources_info and resources_info["vpc"].get("exists"):
            vpc_info = resources_info["vpc"]
            networking["vpc_id"] = state.resources.get("vpc")
            networking["vpc_cidr"] = vpc_info.get("cidr_block", "")
        
        if "subnet" in resources_info and resources_info["subnet"].get("exists"):
            subnet_info = resources_info["subnet"]
            networking["subnet_id"] = state.resources.get("subnet")
            networking["subnet_az"] = subnet_info.get("availability_zone", "")
        
        # Build security info
        security = {}
        if "key_pair" in resources_info and resources_info["key_pair"].get("exists"):
            security["key_pair_name"] = state.resources.get("key_pair", "")
        
        security_groups_list = []
        if "security_group" in resources_info:
            sg = resources_info["security_group"]
            if sg.get("exists"):
                security_groups_list.append({
                    "id": state.resources.get("security_group", ""),
                    "name": sg.get("group_name", ""),
                })
        
        if "security_groups" in resources_info:
            sgs = resources_info["security_groups"]
            if isinstance(sgs, list):
                for sg in sgs:
                    if sg.get("exists"):
                        security_groups_list.append({
                            "id": sg.get("group_id", ""),
                            "name": sg.get("group_name", ""),
                        })
        
        if "alb_security_group" in resources_info:
            sg = resources_info["alb_security_group"]
            if sg.get("exists"):
                security_groups_list.append({
                    "id": state.resources.get("alb_security_group", ""),
                    "name": sg.get("group_name", ""),
                })
        
        if "instance_security_group" in resources_info:
            sg = resources_info["instance_security_group"]
            if sg.get("exists"):
                security_groups_list.append({
                    "id": state.resources.get("instance_security_group", ""),
                    "name": sg.get("group_name", ""),
                })
        
        if security_groups_list:
            security["security_groups"] = security_groups_list
        
        if "iam_role" in resources_info and resources_info["iam_role"].get("exists"):
            iam_role = resources_info["iam_role"]
            security["iam_role_arn"] = iam_role.get("arn", "")
            security["iam_role_name"] = iam_role.get("role_name", "")
        
        # Build load balancing info
        load_balancing = {}
        if "alb" in resources_info and resources_info["alb"].get("exists"):
            alb = resources_info["alb"]
            load_balancing["alb_arn"] = state.resources.get("alb", "")
            load_balancing["alb_dns_name"] = alb.get("dns_name", "")
            load_balancing["alb_scheme"] = alb.get("scheme", "")
        
        if "elastic_ip" in resources_info and resources_info["elastic_ip"].get("exists"):
            eip = resources_info["elastic_ip"]
            load_balancing["elastic_ip"] = eip.get("public_ip", "")
            load_balancing["elastic_ip_allocation_id"] = state.resources.get("elastic_ip", "")
        
        # Build storage info
        storage = {}
        ebs_volumes_list = []
        if "ebs_volumes" in resources_info:
            volumes = resources_info["ebs_volumes"]
            if isinstance(volumes, list):
                for vol in volumes:
                    if vol.get("exists"):
                        ebs_volumes_list.append({
                            "volume_id": vol.get("volume_id", ""),
                            "size_gb": vol.get("size", ""),
                            "type": vol.get("volume_type", ""),
                            "state": vol.get("state", ""),
                        })
        
        if ebs_volumes_list:
            storage["ebs_volumes"] = ebs_volumes_list
        
        if "efs" in resources_info and resources_info["efs"].get("exists"):
            efs = resources_info["efs"]
            storage["efs_file_system_id"] = state.resources.get("efs_file_system_id", "")
            storage["efs_dns_name"] = efs.get("dns_name", "")
        
        # Build S3 info
        s3_buckets_list = []
        if "s3_buckets" in resources_info:
            buckets = resources_info["s3_buckets"]
            if isinstance(buckets, list):
                for bucket in buckets:
                    if bucket.get("exists"):
                        s3_buckets_list.append({
                            "name": bucket.get("bucket_name", ""),
                        })
        
        if s3_buckets_list:
            storage["s3_buckets"] = s3_buckets_list

        # Build result dict
        project_dict = {
            "name": state.project_name,
            "blueprint": state.blueprint_name,
            "status": project_status.get("status", "unknown"),
            "created_at": state.created_at.isoformat() if isinstance(state.created_at, datetime) else str(state.created_at),
            "instance_details": instance_details,
            "resource_counts": resource_counts,
            "networking": networking if networking else None,
            "security": security if security else None,
            "load_balancing": load_balancing if load_balancing else None,
            "storage": storage if storage else None,
        }

        # Include key pair name if available
        if "key_pair" in project_status:
            project_dict["key_pair"] = project_status["key_pair"]

        result.append(project_dict)

    return result


def get_project_status(project_name: str) -> dict[str, Any] | None:
    """Get detailed status for a project.

    Args:
        project_name: Project name

    Returns:
        Status dict or None if project not found
    """
    state = manager.load_project_state(project_name)
    if not state:
        return None

    session = aws_client.get_boto3_session()
    ec2 = session.client("ec2")
    elbv2 = session.client("elbv2")
    s3 = session.client("s3")
    efs = session.client("efs")
    iam = session.client("iam")

    resources = state.resources
    status_info = {
        "project_name": project_name,
        "blueprint": state.blueprint_name,
        "created_at": state.created_at.isoformat() if isinstance(state.created_at, datetime) else str(state.created_at),
        "resources": {},
    }

    # Check VPC
    if "vpc" in resources:
        vpc_status = aws_status.get_vpc_status(ec2, resources["vpc"])
        status_info["resources"]["vpc"] = vpc_status

    # Check Subnet
    if "subnet" in resources:
        subnet_status = aws_status.get_subnet_status(ec2, resources["subnet"])
        status_info["resources"]["subnet"] = subnet_status

    # Check Security Groups (can be multiple)
    if "security_group" in resources:
        sg_status = aws_status.get_security_group_status(ec2, resources["security_group"])
        status_info["resources"]["security_group"] = sg_status
    
    if "security_groups" in resources:
        sg_list = resources["security_groups"]
        if isinstance(sg_list, list):
            status_info["resources"]["security_groups"] = []
            for sg_id in sg_list:
                sg_status = aws_status.get_security_group_status(ec2, sg_id)
                status_info["resources"]["security_groups"].append(sg_status)
        else:
            # Single security group stored as string
            sg_status = aws_status.get_security_group_status(ec2, sg_list)
            status_info["resources"]["security_groups"] = [sg_status]
    
    if "alb_security_group" in resources:
        alb_sg_status = aws_status.get_security_group_status(ec2, resources["alb_security_group"])
        status_info["resources"]["alb_security_group"] = alb_sg_status
    
    if "instance_security_group" in resources:
        instance_sg_status = aws_status.get_security_group_status(ec2, resources["instance_security_group"])
        status_info["resources"]["instance_security_group"] = instance_sg_status

    # Check Key Pair
    if "key_pair" in resources:
        key_pair_status = aws_status.get_key_pair_status(ec2, resources["key_pair"])
        status_info["resources"]["key_pair"] = key_pair_status
        status_info["key_pair"] = resources["key_pair"]  # Keep name for backward compatibility

    # Check IAM Role
    if "iam_role" in resources or "iam_role_arn" in resources:
        role_arn = resources.get("iam_role") or resources.get("iam_role_arn")
        if role_arn:
            # Extract role name from ARN
            role_name = role_arn.split("/")[-1] if "/" in role_arn else role_arn.split(":")[-1]
            iam_role_status = aws_status.get_iam_role_status(iam, role_name)
            status_info["resources"]["iam_role"] = iam_role_status

    # Check IAM Instance Profile
    if "iam_instance_profile" in resources or "iam_instance_profile_arn" in resources:
        profile_arn = resources.get("iam_instance_profile") or resources.get("iam_instance_profile_arn")
        if profile_arn:
            # Extract profile name from ARN
            profile_name = profile_arn.split("/")[-1] if "/" in profile_arn else profile_arn.split(":")[-1]
            iam_profile_status = aws_status.get_iam_instance_profile_status(iam, profile_name)
            status_info["resources"]["iam_instance_profile"] = iam_profile_status

    # Check EC2 Instance (set overall status from this)
    if "instance" in resources:
        instance_status = aws_status.get_instance_status(ec2, resources["instance"])
        status_info["resources"]["instance"] = instance_status
        # Set overall project status from instance state
        if instance_status.get("exists") and instance_status.get("state"):
            status_info["status"] = instance_status["state"]

    # Check ALB
    if "alb" in resources:
        alb_status = aws_status.get_alb_status(elbv2, resources["alb"])
        status_info["resources"]["alb"] = alb_status
        # Also get target group status
        tg_status = aws_status.get_target_group_status(elbv2, resources["alb"])
        if tg_status.get("exists"):
            status_info["resources"]["target_group"] = tg_status

    # Check Elastic IP
    if "elastic_ip" in resources:
        eip_status = aws_status.get_eip_status(ec2, resources["elastic_ip"])
        status_info["resources"]["elastic_ip"] = eip_status

    # Check S3 Buckets (list)
    if "s3_buckets" in resources:
        s3_buckets_status = []
        s3_bucket_list = resources["s3_buckets"]
        if isinstance(s3_bucket_list, list):
            for bucket_name in s3_bucket_list:
                bucket_status = aws_status.get_s3_bucket_status(s3, bucket_name)
                bucket_status["bucket_name"] = bucket_name
                s3_buckets_status.append(bucket_status)
        status_info["resources"]["s3_buckets"] = s3_buckets_status

    # Check EBS Volumes (list)
    if "ebs_volumes" in resources:
        ebs_volumes_status = []
        ebs_volume_list = resources["ebs_volumes"]
        if isinstance(ebs_volume_list, list):
            for volume_id in ebs_volume_list:
                volume_status = aws_status.get_ebs_volume_status(ec2, volume_id)
                volume_status["volume_id"] = volume_id
                ebs_volumes_status.append(volume_status)
        status_info["resources"]["ebs_volumes"] = ebs_volumes_status

    # Check EFS File System
    if "efs_file_system_id" in resources:
        efs_status = aws_status.get_efs_status(efs, resources["efs_file_system_id"])
        status_info["resources"]["efs"] = efs_status
    
    # Check EFS Mount Target
    if "efs_mount_target_id" in resources:
        # Mount target info is stored but we don't have a status function for it
        # Just include the ID
        status_info["resources"]["efs_mount_target_id"] = resources["efs_mount_target_id"]

    # Check DNS Records (stored as dns_records_info)
    if "dns_records_info" in resources:
        # DNS records are stored as list of dicts with hosted_zone_id, record_name, record_type
        # We don't query Route53 for status, just include the info
        status_info["resources"]["dns_records"] = resources["dns_records_info"]

    return status_info


def list_images() -> list[dict[str, Any]]:
    """List all images/snapshots.

    Returns:
        List of image dicts
    """
    images = image_index.load_images()
    return [
        {
            "name": img.name,
            "snapshot_id": img.snapshot_id,
            "project_name": img.project_name,
            "ami_id": img.ami_id,
            "ami_name": img.ami_name,
            "created_at": img.created_at.isoformat() if isinstance(img.created_at, datetime) else str(img.created_at),
            "note": img.note,
        }
        for img in images
    ]


def list_snapshots() -> list[dict[str, Any]]:
    """Backward compatibility alias for list_images()."""
    return list_images()


def get_available_amis() -> list[dict[str, Any]]:
    """Get available AWS AMIs.

    Returns:
        List of AMI dicts with id, name, description, owner, and type
    """
    try:
        session = aws_client.get_boto3_session()
        amis = cli.get_available_amis(session)
        return amis
    except Exception as e:
        logger.exception("Failed to fetch AMIs")
        return []


def update_ami_name(snapshot_id: str, ami_name: str) -> tuple[bool, str]:
    """Update the custom display name for an AMI.

    Args:
        snapshot_id: Snapshot ID
        ami_name: New custom name for the AMI

    Returns:
        Tuple of (success, message)
    """
    try:
        cli.update_ami_name(snapshot_id, ami_name)
        return (True, "AMI name updated successfully")
    except Exception as e:
        logger.exception("Update AMI name error")
        return (False, f"Failed to update AMI name: {str(e)}")


def delete_image(name_or_id: str) -> tuple[bool, str]:
    """Delete an image.

    Args:
        name_or_id: Image name or snapshot ID

    Returns:
        Tuple of (success, message)
    """
    try:
        import io
        from contextlib import redirect_stderr, redirect_stdout

        stdout_capture = io.StringIO()
        stderr_capture = io.StringIO()

        with redirect_stdout(stdout_capture), redirect_stderr(stderr_capture):
            cli.image_delete_cmd(name_or_id)

        return (True, f"Image '{name_or_id}' deleted successfully")
    except SystemExit as e:
        error_msg = stderr_capture.getvalue() if 'stderr_capture' in locals() else str(e)
        return (False, f"Delete failed: {error_msg}")
    except Exception as e:
        logger.exception("Image delete error")
        return (False, f"Delete failed: {str(e)}")


def delete_snapshot(name_or_id: str) -> tuple[bool, str]:
    """Backward compatibility alias for delete_image()."""
    return delete_image(name_or_id)


def list_blueprints() -> list[dict[str, Any]]:
    """List all available blueprints.

    Returns:
        List of blueprint dicts with keys: name, description, type, instance_type
    """
    result = []

    # Builtin blueprints
    builtin_blueprints = builtin.get_builtin_blueprints()
    for name, blueprint in builtin_blueprints.items():
        instance_type = blueprint.resources.get("instance_type", "t3.medium")
        result.append(
            {
                "name": name,
                "description": blueprint.description,
                "type": "built-in",
                "instance_type": instance_type,
            }
        )

    # User blueprints
    user_blueprint_names = loader.list_user_blueprints()
    for name in user_blueprint_names:
        blueprint = loader.load_user_blueprint(name)
        if blueprint:
            instance_type = blueprint.resources.get("instance_type", "t3.medium")
            result.append(
                {
                    "name": name,
                    "description": blueprint.description,
                    "type": "user",
                    "instance_type": instance_type,
                }
            )

    return result


def get_blueprint(name: str) -> dict[str, Any] | None:
    """Get a blueprint by name.

    Args:
        name: Blueprint name

    Returns:
        Blueprint dict or None if not found
    """
    # Check builtin first
    builtin_blueprints = builtin.get_builtin_blueprints()
    if name in builtin_blueprints:
        blueprint = builtin_blueprints[name]
        return {
            "name": blueprint.name,
            "description": blueprint.description,
            "type": "built-in",
            "instance_type": blueprint.resources.get("instance_type", "t3.medium"),
            "resources": blueprint.resources,
            "metadata": blueprint.metadata,
        }

    # Check user blueprints
    blueprint = loader.load_user_blueprint(name)
    if blueprint:
        return {
            "name": blueprint.name,
            "description": blueprint.description,
            "type": "user",
            "instance_type": blueprint.resources.get("instance_type", "t3.medium"),
            "resources": blueprint.resources,
            "metadata": blueprint.metadata,
        }

    return None


def create_blueprint(name: str, blueprint_data: dict[str, Any]) -> tuple[bool, str]:
    """Create a new blueprint.

    Args:
        name: Blueprint name (will be sanitized)
        blueprint_data: Blueprint data dict

    Returns:
        Tuple of (success, message)
    """
    try:
        from pocket_architect.models import Blueprint
        import yaml

        # Sanitize name
        name = sanitize_name(name, max_length=50)
        
        # Ensure name matches
        blueprint_data["name"] = name
        blueprint = Blueprint(**blueprint_data)

        # Save to file (name is already sanitized, safe for file path)
        template_file = TEMPLATES_DIR / f"{name}.yaml"
        TEMPLATES_DIR.mkdir(parents=True, exist_ok=True)
        with open(template_file, 'w', encoding='utf-8') as f:
            yaml.dump(blueprint.model_dump(), f, default_flow_style=False, sort_keys=False)

        return True, f"Blueprint '{name}' created successfully"
    except Exception as e:
        logger.exception("Create blueprint error")
        return False, f"Failed to create blueprint: {str(e)}"


def update_blueprint(name: str, blueprint_data: dict[str, Any]) -> tuple[bool, str]:
    """Update a user blueprint.

    Args:
        name: Blueprint name
        blueprint_data: Blueprint data dict

    Returns:
        Tuple of (success, message)
    """
    try:
        # Check if it's a built-in blueprint
        builtin_blueprints = builtin.get_builtin_blueprints()
        if name in builtin_blueprints:
            return False, "Cannot update built-in blueprints"

        # Load existing blueprint to merge
        existing_blueprint = loader.load_user_blueprint(name)
        if not existing_blueprint:
            return False, f"Blueprint '{name}' not found"

        # Update blueprint with new data
        from pocket_architect.models import Blueprint
        import yaml

        # Merge existing data with new data
        updated_data = existing_blueprint.model_dump()
        updated_data.update(blueprint_data)

        # Create updated blueprint
        updated_blueprint = Blueprint(**updated_data)

        # Save to file
        template_file = TEMPLATES_DIR / f"{name}.yaml"
        TEMPLATES_DIR.mkdir(parents=True, exist_ok=True)
        with open(template_file, 'w', encoding='utf-8') as f:
            yaml.dump(updated_blueprint.model_dump(), f, default_flow_style=False, sort_keys=False)

        return True, f"Blueprint '{name}' updated successfully"
    except Exception as e:
        logger.exception("Update blueprint error")
        return False, f"Failed to update blueprint: {str(e)}"


def delete_blueprint(name: str) -> tuple[bool, str]:
    """Delete a user blueprint.

    Args:
        name: Blueprint name

    Returns:
        Tuple of (success, message)
    """
    try:
        # Check if it's a built-in blueprint
        builtin_blueprints = builtin.get_builtin_blueprints()
        if name in builtin_blueprints:
            return False, "Cannot delete built-in blueprints"

        # Delete user blueprint file
        template_file = TEMPLATES_DIR / f"{name}.yaml"
        if not template_file.exists():
            return False, f"Blueprint '{name}' not found"

        template_file.unlink()
        return True, f"Blueprint '{name}' deleted successfully"
    except Exception as e:
        logger.exception("Delete blueprint error")
        return False, f"Failed to delete blueprint: {str(e)}"


def get_cost_info(project_name: str, use_aws_api: bool = False) -> dict[str, Any] | None:
    """Get cost information for a project.

    Args:
        project_name: Project name
        use_aws_api: Whether to fetch actual cost from AWS

    Returns:
        Cost info dict or None if project not found
    """
    state = manager.load_project_state(project_name)
    if not state:
        return None

    resources = resource_tracker.get_project_resources(project_name)
    if not resources:
        resources = state.resources

    session = aws_client.get_boto3_session()

    # Calculate cost estimate
    cost_estimate = cost_module.estimate_project_cost(
        session, project_name, resources, state.created_at
    )

    # Optionally fetch actual cost
    if use_aws_api:
        actual_cost = cost_module.get_aws_cost_explorer_cost(
            session, project_name, state.created_at, cost_estimate.period_end
        )
        if actual_cost is not None:
            cost_estimate.actual_cost = actual_cost

    # Get cost limit
    limit = cost_tracker.get_cost_limit(project_name)

    result = {
        "project_name": project_name,
        "estimated_cost": cost_estimate.estimated_cost,
        "actual_cost": cost_estimate.actual_cost,
        "breakdown": cost_estimate.breakdown,
        "limit": limit.limit_amount if limit else None,
        "action": limit.action if limit else None,
        "warning_threshold": limit.warning_threshold if limit else None,
    }

    if limit:
        percentage = (cost_estimate.estimated_cost / limit.limit_amount) * 100 if limit.limit_amount > 0 else 0
        result["usage_percentage"] = percentage

    return result


def get_cost_history_data(project_name: str, hours: int = 12) -> list[dict[str, Any]]:
    """Get historical cost data for a project.

    Args:
        project_name: Project name
        hours: Number of hours of history to retrieve (default: 12)

    Returns:
        List of dicts with keys: timestamp (ISO format), cost (float), is_actual (bool)
    """
    state = manager.load_project_state(project_name)
    if not state:
        return []

    # Calculate time range
    end_date = datetime.now(timezone.utc)
    start_date = end_date - timedelta(hours=hours)
    
    # If project was created after start_date, adjust start_date
    if state.created_at > start_date:
        start_date = state.created_at

    time_series = []
    aws_time_series = []
    
    # First, try to get actual cost data from AWS Cost Explorer
    try:
        session = aws_client.get_boto3_session()
        aws_time_series = cost_module.get_aws_cost_time_series(
            session, project_name, start_date, end_date
        )
        if aws_time_series:
            time_series.extend(aws_time_series)
    except Exception as e:
        logger.warning(f"Error fetching AWS cost time series for {project_name}: {e}")

    # Get cost history from stored estimates
    cost_history = cost_tracker.get_cost_history(project_name)
    
    # Add historical estimates that fall within the time range
    for estimate in cost_history:
        # Check if estimate is within the requested time range
        if estimate.period_end >= start_date and estimate.period_start <= end_date:
            # Use actual cost if available, otherwise use estimated
            cost_value = estimate.actual_cost if estimate.actual_cost is not None else estimate.estimated_cost
            
            # Only add if we don't already have actual data for this period
            # Check if there's AWS data that overlaps with this estimate
            has_aws_data = False
            if aws_time_series:
                for aws_point in aws_time_series:
                    aws_timestamp = datetime.fromisoformat(aws_point["timestamp"].replace("Z", "+00:00"))
                    # If AWS data exists for a similar time period, skip the estimate
                    if abs((aws_timestamp - estimate.period_end).total_seconds()) < 3600:  # Within 1 hour
                        has_aws_data = True
                        break
            
            if not has_aws_data and cost_value > 0:
                time_series.append({
                    "timestamp": estimate.period_end.isoformat(),
                    "cost": cost_value,
                    "is_actual": estimate.actual_cost is not None,
                })

    # Sort by timestamp
    time_series.sort(key=lambda x: x["timestamp"])
    
    # If we have no data, generate estimated data points based on current cost estimate
    if not time_series:
        try:
            session = aws_client.get_boto3_session()
            resources = resource_tracker.get_project_resources(project_name)
            if not resources:
                resources = state.resources
            
            # Get current cost estimate to calculate hourly rate
            current_estimate = cost_module.estimate_project_cost(
                session, project_name, resources, state.created_at
            )
            
            # Calculate hourly rate from estimated cost
            hours_since_creation = (end_date - state.created_at).total_seconds() / 3600.0
            if hours_since_creation > 0:
                hourly_rate = current_estimate.estimated_cost / hours_since_creation
            else:
                hourly_rate = 0.0
            
            # Generate estimated data points for each hour
            current_time = start_date
            cumulative_cost = 0.0
            while current_time <= end_date:
                if current_time >= state.created_at:
                    # Calculate cost up to this point
                    hours_elapsed = (current_time - state.created_at).total_seconds() / 3600.0
                    cumulative_cost = hourly_rate * hours_elapsed
                    
                    time_series.append({
                        "timestamp": current_time.isoformat(),
                        "cost": round(cumulative_cost, 4),
                        "is_actual": False,
                    })
                
                current_time += timedelta(hours=1)
        except Exception as e:
            logger.warning(f"Error generating estimated cost data for {project_name}: {e}")

    return time_series


def set_cost_limit(project_name: str, limit: float, action: str, warning_threshold: float) -> tuple[bool, str]:
    """Set cost limit for a project.

    Args:
        project_name: Project name
        limit: Cost limit in USD
        action: Action (stop/teardown/warn_only)
        warning_threshold: Warning threshold (0.0-1.0)

    Returns:
        Tuple of (success, message)
    """
    try:
        cost_limit_obj = CostLimit(
            project_name=project_name,
            limit_amount=limit,
            action=action,
            warning_threshold=warning_threshold,
        )
        cost_tracker.set_cost_limit(cost_limit_obj)
        return (True, f"Cost limit set for '{project_name}': ${limit:.2f}")
    except Exception as e:
        logger.exception("Set cost limit error")
        return (False, f"Failed to set cost limit: {str(e)}")


def get_global_cost_limit() -> float | None:
    """Get global cost limit.

    Returns:
        Global limit in USD or None
    """
    return cost_tracker.get_global_cost_limit()


def set_global_cost_limit(limit: float | None) -> tuple[bool, str]:
    """Set global cost limit.

    Args:
        limit: Global limit in USD or None to remove

    Returns:
        Tuple of (success, message)
    """
    try:
        cost_tracker.set_global_cost_limit(limit)
        if limit:
            return (True, f"Global cost limit set to ${limit:.2f}")
        else:
            return (True, "Global cost limit removed")
    except Exception as e:
        logger.exception("Set global cost limit error")
        return (False, f"Failed to set global cost limit: {str(e)}")


def check_aws_credentials() -> tuple[bool, dict[str, Any] | None]:
    """Check AWS credentials status.

    Returns:
        Tuple of (valid, identity_dict or None)
    """
    try:
        identity = get_aws_identity()
        return (True, identity)
    except SystemExit:
        return (False, None)
    except Exception:
        return (False, None)


def list_setup_scripts() -> list[str]:
    """List all available setup scripts.

    Returns:
        List of setup script names (without .sh extension)
    """
    return scripts.list_setup_scripts()


def load_setup_script(name: str) -> str | None:
    """Load a setup script by name.

    Args:
        name: Script name (without .sh extension)

    Returns:
        Script content if found, None otherwise
    """
    return scripts.load_setup_script(name)


def list_key_pairs() -> list[dict[str, Any]]:
    """List all EC2 key pairs in the current region.

    Returns:
        List of key pair dictionaries with 'name' and 'fingerprint' keys
    """
    try:
        session = aws_client.get_boto3_session()
        return key_pair.list_key_pairs(session)
    except Exception as e:
        logger.exception("List key pairs error")
        return []


def create_key_pair(name: str) -> tuple[bool, str, str | None]:
    """Create a new EC2 key pair.

    Args:
        name: Key pair name (will be sanitized)

    Returns:
        Tuple of (success, message, key_path or None)
    """
    try:
        # Sanitize name (AWS key pair names can be up to 255 chars, but we'll use 50 for consistency)
        name = sanitize_name(name, max_length=50)
        
        session = aws_client.get_boto3_session()
        key_path = key_pair.create_key_pair(session, name)
        return True, f"Key pair '{name}' created successfully", str(key_path)
    except Exception as e:
        logger.exception("Create key pair error")
        return False, f"Failed to create key pair: {str(e)}", None


def delete_key_pair(name: str) -> tuple[bool, str]:
    """Delete an AWS key pair.

    Args:
        name: Key pair name

    Returns:
        Tuple of (success, message)
    """
    try:
        session = aws_client.get_boto3_session()
        key_pair.delete_key_pair(session, name)
        return True, f"Key pair '{name}' deleted successfully"
    except Exception as e:
        logger.exception("Delete key pair error")
        error_msg = str(e)
        if "still in use" in error_msg.lower():
            return False, "Cannot delete key pair: still in use by EC2 instances"
        return False, f"Failed to delete key pair: {error_msg}"


def list_acm_certificates(region: str | None = None) -> list[dict[str, Any]]:
    """List ACM certificates in the specified region.

    Args:
        region: AWS region (defaults to session region)

    Returns:
        List of certificate dictionaries with 'arn', 'domain', and 'status' keys
    """
    try:
        session = aws_client.get_boto3_session()
        return certificate.list_acm_certificates(session, region)
    except Exception as e:
        logger.exception("List ACM certificates error")
        return []


def create_acm_certificate(
    domain: str,
    validation_method: str = "DNS",
    subject_alternative_names: list[str] | None = None,
    region: str | None = None,
) -> tuple[bool, str]:
    """Create (request) an ACM certificate.

    Args:
        domain: Primary domain name for the certificate
        validation_method: Validation method ('DNS' or 'EMAIL')
        subject_alternative_names: Optional list of additional domain names
        region: AWS region (defaults to session region)

    Returns:
        Tuple of (success, message) with certificate ARN in message if successful
    """
    try:
        session = aws_client.get_boto3_session(region_name=region)
        cert_arn = certificate_resource.create_acm_certificate(
            session,
            domain,
            validation_method,
            subject_alternative_names,
        )
        return True, f"Certificate requested successfully. ARN: {cert_arn}. Please complete validation in AWS Console."
    except Exception as e:
        logger.exception("Create ACM certificate error")
        error_msg = str(e)
        return False, f"Failed to create ACM certificate: {error_msg}"


def delete_acm_certificate(cert_arn: str) -> tuple[bool, str]:
    """Delete an ACM certificate.

    Args:
        cert_arn: ACM certificate ARN

    Returns:
        Tuple of (success, message)
    """
    try:
        session = aws_client.get_boto3_session()
        certificate_resource.delete_acm_certificate(session, cert_arn)
        return True, "ACM certificate deleted successfully"
    except Exception as e:
        logger.exception("Delete ACM certificate error")
        error_msg = str(e)
        if "ResourceInUseException" in error_msg:
            return False, "Cannot delete certificate: still in use by AWS resources"
        return False, f"Failed to delete ACM certificate: {error_msg}"


def list_security_groups() -> list[dict[str, Any]]:
    """List all EC2 security groups in the current region.

    Returns:
        List of security group dictionaries
    """
    try:
        session = aws_client.get_boto3_session()
        ec2 = session.client("ec2")
        response = ec2.describe_security_groups()

        result = []
        for sg in response.get("SecurityGroups", []):
            # Check if this is the default security group (AWS creates one per VPC that cannot be deleted)
            is_default = sg.get("GroupName") == "default"
            result.append({
                "id": sg["GroupId"],
                "name": sg["GroupName"],
                "description": sg.get("Description", ""),
                "vpc_id": sg.get("VpcId", ""),
                "is_default": is_default,  # Flag to indicate this is AWS's default security group
            })
        return result
    except Exception as e:
        logger.exception("List security groups error")
        return []


def delete_security_group(sg_id: str) -> tuple[bool, str]:
    """Delete an AWS security group.

    Args:
        sg_id: Security group ID

    Returns:
        Tuple of (success, message)
    """
    try:
        session = aws_client.get_boto3_session()
        security_group.delete_security_group(session, sg_id)
        return True, f"Security group '{sg_id}' deleted successfully"
    except Exception as e:
        logger.exception("Delete security group error")
        error_msg = str(e)
        if "still in use" in error_msg.lower() or "DependencyViolation" in error_msg:
            return False, "Cannot delete security group: still in use by other AWS resources"
        return False, f"Failed to delete security group: {error_msg}"


def list_iam_roles() -> list[dict[str, Any]]:
    """List all IAM roles.

    Returns:
        List of IAM role dictionaries with descriptions from AWS
    """
    try:
        session = aws_client.get_boto3_session()
        iam = session.client("iam")
        response = iam.list_roles()

        result = []
        for role in response.get("Roles", []):
            role_name = role["RoleName"]
            # Get full role details including description
            description = ""
            try:
                role_detail = iam.get_role(RoleName=role_name)
                description = role_detail.get("Role", {}).get("Description", "")
            except Exception as e:
                logger.warning(f"Failed to get description for role {role_name}: {e}")
            
            result.append({
                "name": role_name,
                "arn": role["Arn"],
                "path": role.get("Path", "/"),
                "description": description,
                "created_at": role.get("CreateDate", "").isoformat() if role.get("CreateDate") else None,
            })
        return result
    except Exception as e:
        logger.exception("List IAM roles error")
        return []


def delete_iam_role(role_name: str) -> tuple[bool, str]:
    """Delete an AWS IAM role.

    Args:
        role_name: IAM role name

    Returns:
        Tuple of (success, message)
    """
    try:
        session = aws_client.get_boto3_session()
        iam_role_resource.delete_iam_role_resource(session, role_name)
        return True, f"IAM role '{role_name}' deleted successfully"
    except Exception as e:
        logger.exception("Delete IAM role error")
        error_msg = str(e)
        if "still in use" in error_msg.lower() or "DeleteConflict" in error_msg:
            return False, "Cannot delete IAM role: still in use by other AWS resources"
        return False, f"Failed to delete IAM role: {error_msg}"


# Security Configuration Management
def list_security_configs() -> list[dict[str, Any]]:
    """List all security configuration templates.

    Returns:
        List of security config dictionaries
    """
    try:
        configs = security_configs.list_security_configs()
        # Convert to dict format for JSON serialization
        result = []
        for config in configs:
            config_dict = config.model_dump()
            if isinstance(config_dict.get("created_at"), datetime):
                config_dict["created_at"] = config_dict["created_at"].isoformat()
            result.append(config_dict)
        return result
    except Exception as e:
        logger.exception("List security configs error")
        return []


def get_security_config(name: str) -> dict[str, Any] | None:
    """Get a security configuration by name.

    Args:
        name: Security config name

    Returns:
        Security config dict if found, None otherwise
    """
    try:
        config = security_configs.get_security_config(name)
        if config:
            config_dict = config.model_dump()
            if isinstance(config_dict.get("created_at"), datetime):
                config_dict["created_at"] = config_dict["created_at"].isoformat()
            return config_dict
        return None
    except Exception as e:
        logger.exception("Get security config error")
        return None


def create_security_config(name: str, config_data: dict[str, Any]) -> tuple[bool, str]:
    """Create a new security configuration template.

    Args:
        name: Security config name (will be sanitized)
        config_data: Security config data dictionary

    Returns:
        Tuple of (success, message)
    """
    try:
        from pocket_architect.models import SecurityConfig

        # Sanitize name
        name = sanitize_name(name, max_length=50)
        
        # Ensure name matches
        config_data["name"] = name
        config = SecurityConfig(**config_data)
        security_configs.save_security_config(config)
        return True, f"Security config '{name}' created successfully"
    except Exception as e:
        logger.exception("Create security config error")
        return False, f"Failed to create security config: {str(e)}"


def update_security_config(name: str, config_data: dict[str, Any]) -> tuple[bool, str]:
    """Update an existing security configuration template.

    Args:
        name: Security config name (will be sanitized)
        config_data: Updated security config data dictionary

    Returns:
        Tuple of (success, message)
    """
    try:
        from pocket_architect.models import SecurityConfig

        # Sanitize name
        name = sanitize_name(name, max_length=50)
        
        # Ensure name matches
        config_data["name"] = name
        config = SecurityConfig(**config_data)
        security_configs.save_security_config(config)
        return True, f"Security config '{name}' updated successfully"
    except Exception as e:
        logger.exception("Update security config error")
        return False, f"Failed to update security config: {str(e)}"


def delete_security_config(name: str) -> tuple[bool, str]:
    """Delete a security configuration template.

    Args:
        name: Security config name to delete

    Returns:
        Tuple of (success, message)
    """
    try:
        # Sanitize name to match how it was saved (SecurityConfig model sanitizes on save)
        sanitized_name = sanitize_name(name, max_length=50)
        logger.info(f"Deleting security config: {name} (sanitized: {sanitized_name})")
        
        # List all configs to find the actual file name
        all_configs = security_configs.list_security_configs()
        
        # Try to find matching config (case-insensitive, handle sanitization)
        matching_config = None
        for config in all_configs:
            # Compare both sanitized versions for case-insensitive matching
            config_name_sanitized = sanitize_name(config.name, max_length=50)
            if config_name_sanitized == sanitized_name or config.name.lower() == name.lower():
                matching_config = config
                break
        
        if matching_config:
            # Use the actual name from the config file
            actual_name = matching_config.name
            logger.info(f"Found matching config with name: {actual_name}")
            deleted = security_configs.delete_security_config(actual_name)
            if deleted:
                return True, f"Security config '{actual_name}' deleted successfully"
            else:
                return False, f"Security config '{actual_name}' not found on disk"
        else:
            # Config doesn't exist in the file system - might be mock data
            if not all_configs:
                return False, "No security configurations found. This may be a mock configuration that was never saved."
            # Try with sanitized name directly as fallback
            deleted = security_configs.delete_security_config(sanitized_name)
            if deleted:
                return True, f"Security config '{sanitized_name}' deleted successfully"
            else:
                return False, f"Security config '{sanitized_name}' not found. Available configs: {[c.name for c in all_configs]}"
    except Exception as e:
        logger.exception("Delete security config error")
        return False, f"Failed to delete security config: {str(e)}"


# Security Group Resources
def list_security_group_resources() -> list[dict[str, Any]]:
    """List all security group resources.

    Returns:
        List of security group resource dictionaries
    """
    try:
        resources = security_resources.list_security_group_resources()
        result = []
        for resource in resources:
            resource_dict = resource.model_dump()
            if isinstance(resource_dict.get("created_at"), datetime):
                resource_dict["created_at"] = resource_dict["created_at"].isoformat()
            result.append(resource_dict)
        return result
    except Exception as e:
        logger.exception("List security group resources error")
        return []


def get_security_group_resource(name: str) -> dict[str, Any] | None:
    """Get a security group resource by name.

    Args:
        name: Security group resource name

    Returns:
        Security group resource dictionary or None
    """
    try:
        resource = security_resources.get_security_group_resource(name)
        if resource:
            resource_dict = resource.model_dump()
            if isinstance(resource_dict.get("created_at"), datetime):
                resource_dict["created_at"] = resource_dict["created_at"].isoformat()
            return resource_dict
        return None
    except Exception as e:
        logger.exception("Get security group resource error")
        return None


def create_security_group_resource(resource_data: dict[str, Any]) -> tuple[bool, str]:
    """Create a new security group resource.

    Args:
        resource_data: Security group resource data

    Returns:
        Tuple of (success, message)
    """
    try:
        from pocket_architect.models import SecurityGroupResource

        # Sanitize name
        if "name" in resource_data:
            resource_data["name"] = sanitize_name(resource_data["name"], max_length=50)

        resource = SecurityGroupResource(**resource_data)
        security_resources.save_security_group_resource(resource)
        return True, f"Security group resource '{resource.name}' created successfully"
    except Exception as e:
        logger.exception("Create security group resource error")
        return False, f"Failed to create security group resource: {str(e)}"


def update_security_group_resource(name: str, resource_data: dict[str, Any]) -> tuple[bool, str]:
    """Update an existing security group resource.

    Args:
        name: Security group resource name (will be sanitized)
        resource_data: Updated security group resource data

    Returns:
        Tuple of (success, message)
    """
    try:
        from pocket_architect.models import SecurityGroupResource

        # Sanitize name
        name = sanitize_name(name, max_length=50)
        if "name" in resource_data:
            resource_data["name"] = sanitize_name(resource_data["name"], max_length=50)
        
        existing = security_resources.get_security_group_resource(name)
        if not existing:
            return False, f"Security group resource '{name}' not found"

        # Update fields
        update_data = existing.model_dump()
        update_data.update(resource_data)
        update_data["name"] = name  # Ensure name doesn't change

        resource = SecurityGroupResource(**update_data)
        security_resources.save_security_group_resource(resource)
        return True, f"Security group resource '{name}' updated successfully"
    except Exception as e:
        logger.exception("Update security group resource error")
        return False, f"Failed to update security group resource: {str(e)}"


def delete_security_group_resource(name: str) -> tuple[bool, str]:
    """Delete a security group resource.

    Args:
        name: Security group resource name

    Returns:
        Tuple of (success, message)
    """
    try:
        deleted = security_resources.delete_security_group_resource(name)
        if deleted:
            return True, f"Security group resource '{name}' deleted successfully"
        else:
            return False, f"Security group resource '{name}' not found"
    except Exception as e:
        logger.exception("Delete security group resource error")
        return False, f"Failed to delete security group resource: {str(e)}"


# IAM Role Resources
def list_iam_role_resources() -> list[dict[str, Any]]:
    """List all IAM role resources.

    Returns:
        List of IAM role resource dictionaries
    """
    try:
        resources = security_resources.list_iam_role_resources()
        result = []
        for resource in resources:
            resource_dict = resource.model_dump()
            if isinstance(resource_dict.get("created_at"), datetime):
                resource_dict["created_at"] = resource_dict["created_at"].isoformat()
            result.append(resource_dict)
        return result
    except Exception as e:
        logger.exception("List IAM role resources error")
        return []


def get_iam_role_resource(name: str) -> dict[str, Any] | None:
    """Get an IAM role resource by name.

    Args:
        name: IAM role resource name

    Returns:
        IAM role resource dictionary or None
    """
    try:
        resource = security_resources.get_iam_role_resource(name)
        if resource:
            resource_dict = resource.model_dump()
            if isinstance(resource_dict.get("created_at"), datetime):
                resource_dict["created_at"] = resource_dict["created_at"].isoformat()
            return resource_dict
        return None
    except Exception as e:
        logger.exception("Get IAM role resource error")
        return None


def create_iam_role_resource(resource_data: dict[str, Any]) -> tuple[bool, str]:
    """Create a new IAM role resource.

    Args:
        resource_data: IAM role resource data

    Returns:
        Tuple of (success, message)
    """
    try:
        from pocket_architect.models import IAMRoleResource

        # Sanitize name (IAM role names can be up to 64 chars)
        if "name" in resource_data:
            resource_data["name"] = sanitize_name(resource_data["name"], max_length=64)

        resource = IAMRoleResource(**resource_data)
        security_resources.save_iam_role_resource(resource)
        return True, f"IAM role resource '{resource.name}' created successfully"
    except Exception as e:
        logger.exception("Create IAM role resource error")
        return False, f"Failed to create IAM role resource: {str(e)}"


def update_iam_role_resource(name: str, resource_data: dict[str, Any]) -> tuple[bool, str]:
    """Update an existing IAM role resource.

    Args:
        name: IAM role resource name (will be sanitized)
        resource_data: Updated IAM role resource data

    Returns:
        Tuple of (success, message)
    """
    try:
        from pocket_architect.models import IAMRoleResource

        # Sanitize name (IAM role names can be up to 64 chars)
        name = sanitize_name(name, max_length=64)
        if "name" in resource_data:
            resource_data["name"] = sanitize_name(resource_data["name"], max_length=64)
        
        existing = security_resources.get_iam_role_resource(name)
        if not existing:
            return False, f"IAM role resource '{name}' not found"

        # Update fields
        update_data = existing.model_dump()
        update_data.update(resource_data)
        update_data["name"] = name  # Ensure name doesn't change

        resource = IAMRoleResource(**update_data)
        security_resources.save_iam_role_resource(resource)
        return True, f"IAM role resource '{name}' updated successfully"
    except Exception as e:
        logger.exception("Update IAM role resource error")
        return False, f"Failed to update IAM role resource: {str(e)}"


def delete_iam_role_resource(name: str) -> tuple[bool, str]:
    """Delete an IAM role resource.

    Args:
        name: IAM role resource name

    Returns:
        Tuple of (success, message)
    """
    try:
        # If AWS role exists, delete it
        resource = security_resources.get_iam_role_resource(name)
        if resource and resource.aws_role_arn:
            try:
                session = aws_client.get_boto3_session()
                iam_role_resource.delete_iam_role_resource(session, name)
            except Exception as e:
                logger.warning(f"Failed to delete IAM role from AWS: {e}")

        deleted = security_resources.delete_iam_role_resource(name)
        if deleted:
            return True, f"IAM role resource '{name}' deleted successfully"
        else:
            return False, f"IAM role resource '{name}' not found"
    except Exception as e:
        logger.exception("Delete IAM role resource error")
        return False, f"Failed to delete IAM role resource: {str(e)}"


def get_aws_account_info() -> dict[str, Any]:
    """Get AWS account information for display in the UI.

    Returns:
        Dictionary with account details including status, account ID, identity ARN, etc.
    """
    try:
        identity = get_aws_identity()
        session = aws_client.get_boto3_session()
        region = session.region_name or 'us-east-1'

        # Get account details
        account_id = identity.get("Account", "")
        identity_arn = identity.get("Arn", "")
        user_id = identity.get("UserId", "")

        # Try to get additional account information
        mfa_enabled = None
        cloud_trail_enabled = None
        account_type = None
        support_plan = None

        try:
            # Check IAM for MFA status (simplified - would need more detailed checks)
            iam = session.client("iam")
            try:
                account_summary = iam.get_account_summary()
                mfa_enabled = account_summary.get("SummaryMap", {}).get("AccountMFAEnabled", False)
            except Exception:
                pass

            # Check CloudTrail status (simplified - would need to check all regions)
            cloudtrail = session.client("cloudtrail")
            try:
                trails = cloudtrail.describe_trails()
                cloud_trail_enabled = len(trails.get("trailList", [])) > 0
            except Exception:
                cloud_trail_enabled = False

            # Try to get support plan
            try:
                support = session.client("support", region_name="us-east-1")
                support_plan = "Business"  # Default, would need to check actual plan
            except Exception:
                pass
        except Exception as e:
            logger.debug(f"Could not fetch additional AWS account info: {e}")

        return {
            "status": "connected",
            "accountId": account_id,
            "identityArn": identity_arn,
            "region": region,
            "user": identity_arn,
            "lastChecked": datetime.now().isoformat(),
            "mfaEnabled": mfa_enabled,
            "cloudTrailEnabled": cloud_trail_enabled,
            "accountType": account_type or "Standard",
            "supportPlan": support_plan or "Unknown",
        }
    except SystemExit:
        return {
            "status": "disconnected",
        }
    except Exception as e:
        logger.exception("Get AWS account info error")
        return {
            "status": "disconnected",
        }


def get_gcp_account_info() -> dict[str, Any]:
    """Get GCP account information for display in the UI.

    Returns:
        Dictionary with GCP account details including status, project ID, etc.
    """
    # Placeholder for GCP - would need GCP client implementation
    try:
        # TODO: Implement GCP client to get account info
        # For now, return disconnected status
        return {
            "status": "disconnected",
        }
    except Exception as e:
        logger.exception("Get GCP account info error")
        return {
            "status": "disconnected",
        }


def get_azure_account_info() -> dict[str, Any]:
    """Get Azure account information for display in the UI.

    Returns:
        Dictionary with Azure account details including status, subscription ID, etc.
    """
    # Placeholder for Azure - would need Azure client implementation
    try:
        # TODO: Implement Azure client to get account info
        # For now, return disconnected status
        return {
            "status": "disconnected",
        }
    except Exception as e:
        logger.exception("Get Azure account info error")
        return {
            "status": "disconnected",
        }


def stop_instance(instance_id: str) -> tuple[bool, str]:
    """Stop an EC2 instance by instance ID.

    Args:
        instance_id: EC2 instance ID (e.g., 'i-1234567890abcdef0')

    Returns:
        Tuple of (success, message)
    """
    try:
        session = aws_client.get_boto3_session()
        ec2 = session.client("ec2")

        # Check current instance state
        response = ec2.describe_instances(InstanceIds=[instance_id])
        if not response.get("Reservations"):
            return (False, f"Instance {instance_id} not found")

        instance = response["Reservations"][0]["Instances"][0]
        current_state = instance["State"]["Name"]

        if current_state == "stopped":
            return (True, f"Instance {instance_id} is already stopped")
        elif current_state not in ("running", "stopping"):
            return (False, f"Instance {instance_id} is in '{current_state}' state, cannot stop")

        # Stop the instance
        ec2.stop_instances(InstanceIds=[instance_id])

        # Wait for stopped state (optional - can be done async on frontend)
        try:
            waiter = ec2.get_waiter("instance_stopped")
            waiter.wait(InstanceIds=[instance_id], WaiterConfig={"Delay": 5, "MaxAttempts": 60})
            return (True, f"Instance {instance_id} stopped successfully")
        except Exception as wait_error:
            # If waiter times out, still consider it successful if stop was initiated
            logger.warning(f"Instance stop initiated but waiter timed out: {wait_error}")
            return (True, f"Stop request sent for instance {instance_id}")

    except Exception as e:
        logger.exception("Stop instance error")
        error_msg = str(e)
        if "InvalidInstanceID" in error_msg or "not found" in error_msg.lower():
            return (False, f"Instance {instance_id} not found")
        return (False, f"Failed to stop instance: {error_msg}")


def start_instance(instance_id: str) -> tuple[bool, str]:
    """Start an EC2 instance by instance ID.

    Args:
        instance_id: EC2 instance ID (e.g., 'i-1234567890abcdef0')

    Returns:
        Tuple of (success, message)
    """
    try:
        session = aws_client.get_boto3_session()
        ec2 = session.client("ec2")

        # Check current instance state
        response = ec2.describe_instances(InstanceIds=[instance_id])
        if not response.get("Reservations"):
            return (False, f"Instance {instance_id} not found")

        instance = response["Reservations"][0]["Instances"][0]
        current_state = instance["State"]["Name"]

        if current_state == "running":
            return (True, f"Instance {instance_id} is already running")
        elif current_state not in ("stopped", "pending"):
            return (False, f"Instance {instance_id} is in '{current_state}' state, cannot start")

        # Start the instance
        ec2.start_instances(InstanceIds=[instance_id])

        # Wait for running state (optional - can be done async on frontend)
        try:
            waiter = ec2.get_waiter("instance_running")
            waiter.wait(InstanceIds=[instance_id], WaiterConfig={"Delay": 5, "MaxAttempts": 60})
            return (True, f"Instance {instance_id} started successfully")
        except Exception as wait_error:
            # If waiter times out, still consider it successful if start was initiated
            logger.warning(f"Instance start initiated but waiter timed out: {wait_error}")
            return (True, f"Start request sent for instance {instance_id}")

    except Exception as e:
        logger.exception("Start instance error")
        error_msg = str(e)
        if "InvalidInstanceID" in error_msg or "not found" in error_msg.lower():
            return (False, f"Instance {instance_id} not found")
        return (False, f"Failed to start instance: {error_msg}")


def terminate_instance(instance_id: str) -> tuple[bool, str]:
    """Terminate an EC2 instance by instance ID.

    Args:
        instance_id: EC2 instance ID (e.g., 'i-1234567890abcdef0')

    Returns:
        Tuple of (success, message)
    """
    try:
        session = aws_client.get_boto3_session()
        ec2 = session.client("ec2")

        # Check current instance state
        response = ec2.describe_instances(InstanceIds=[instance_id])
        if not response.get("Reservations"):
            return (False, f"Instance {instance_id} not found")

        instance = response["Reservations"][0]["Instances"][0]
        current_state = instance["State"]["Name"]

        if current_state == "terminated":
            return (True, f"Instance {instance_id} is already terminated")
        elif current_state == "shutting-down":
            return (True, f"Instance {instance_id} is already terminating")

        # Terminate the instance
        ec2.terminate_instances(InstanceIds=[instance_id])

        # Don't wait for termination - it's async and can take time
        return (True, f"Termination request sent for instance {instance_id}")

    except Exception as e:
        logger.exception("Terminate instance error")
        error_msg = str(e)
        if "InvalidInstanceID" in error_msg or "not found" in error_msg.lower():
            return (False, f"Instance {instance_id} not found")
        return (False, f"Failed to terminate instance: {error_msg}")


def check_instance_status(instance_id: str) -> tuple[bool, str, str]:
    """Check the current status of an EC2 instance.

    Args:
        instance_id: EC2 instance ID (e.g., 'i-1234567890abcdef0')

    Returns:
        Tuple of (exists, state, message)
        - exists: True if instance exists (not terminated), False if terminated/not found
        - state: Current state (running, stopped, shutting-down, terminated, etc.)
        - message: Status message
    """
    try:
        session = aws_client.get_boto3_session()
        ec2 = session.client("ec2")

        response = ec2.describe_instances(InstanceIds=[instance_id])
        if not response.get("Reservations"):
            return (False, "terminated", f"Instance {instance_id} not found (terminated)")

        instance = response["Reservations"][0]["Instances"][0]
        current_state = instance["State"]["Name"]

        if current_state == "terminated":
            return (False, "terminated", f"Instance {instance_id} is terminated")
        else:
            return (True, current_state, f"Instance {instance_id} is {current_state}")

    except Exception as e:
        error_msg = str(e)
        # If instance doesn't exist (terminated), AWS returns InvalidInstanceID.NotFound
        if "InvalidInstanceID" in error_msg or "not found" in error_msg.lower():
            return (False, "terminated", f"Instance {instance_id} not found (terminated)")
        logger.exception("Check instance status error")
        return (True, "unknown", f"Error checking status: {error_msg}")


def check_active_deployments() -> list[str]:
    """
    Check for projects that are currently deploying (have active deployment locks or status='starting').
    
    Returns:
        List of project names that are currently deploying
    """
    active_deployments = []
    
    try:
        # Check all projects for deployment locks or 'starting' status
        projects = manager.list_projects()
        for project_name in projects:
            # Check if deployment lock exists
            if manager.is_deployment_locked(project_name):
                active_deployments.append(project_name)
                continue
            
            # Check if project status is 'starting'
            state = manager.load_project_state(project_name)
            if state and state.status == "starting":
                active_deployments.append(project_name)
    except Exception as e:
        logger.exception("Error checking active deployments")
        # Return empty list on error to avoid blocking deployments
    
    return active_deployments


def get_project_deployment_status(project_name: str) -> dict[str, Any]:
    """
    Get deployment status information for a project.
    
    Args:
        project_name: Name of the project
        
    Returns:
        Dictionary with keys:
        - status: Project status (starting, running, stopped, failed, teardown)
        - locked: Boolean indicating if deployment lock exists
        - lock_info: Dictionary with lock information if locked (operation_id, started_at)
    """
    result = {
        "status": "unknown",
        "locked": False,
        "lock_info": None
    }
    
    try:
        # Check deployment lock
        result["locked"] = manager.is_deployment_locked(project_name)
        
        if result["locked"]:
            # Read lock file to get lock info
            lock_file = manager.get_deployment_lock_file(project_name)
            if lock_file.exists():
                try:
                    with open(lock_file, "r", encoding="utf-8") as f:
                        lock_data = json.load(f)
                    result["lock_info"] = lock_data
                except Exception:
                    pass
        
        # Get project status from state file
        state = manager.load_project_state(project_name)
        if state:
            result["status"] = state.status
        else:
            result["status"] = "unknown"
    except Exception as e:
        logger.exception(f"Error getting deployment status for {project_name}")
        result["status"] = "error"
    
    return result


def get_quotas(region: str) -> list[dict[str, Any]]:
    """Get quota data for a specific region.
    
    Args:
        region: AWS region name
        
    Returns:
        List of quota dictionaries with category, name, used, limit, region, etc.
    """
    try:
        session = aws_client.get_boto3_session()
        logger.info(f"Fetching quotas for region: {region}")
        quotas = quota.get_all_quotas(session, region)
        logger.info(f"Retrieved {len(quotas)} quotas for {region}")
        return quotas
    except Exception as e:
        logger.exception(f"Get quotas error for region {region}: {e}")
        return []


def get_region_quotas(region: str) -> dict[str, list[dict[str, Any]]]:
    """Get all quotas for a region, organized by category.
    
    Args:
        region: AWS region name
        
    Returns:
        Dictionary with category keys and lists of quota dicts as values
    """
    try:
        quotas = get_quotas(region)
        # Organize by category
        result: dict[str, list[dict[str, Any]]] = {}
        for q in quotas:
            category = q.get("category", "Other")
            if category not in result:
                result[category] = []
            result[category].append(q)
        return result
    except Exception as e:
        logger.exception("Get region quotas error")
        return {}


def list_available_regions() -> list[str]:
    """List all available AWS regions.
    
    Returns:
        List of region names
    """
    try:
        return aws_client.get_available_regions()
    except Exception as e:
        logger.exception("List available regions error")
        # Return common regions as fallback
        return [
            "us-east-1", "us-east-2", "us-west-1", "us-west-2",
            "eu-west-1", "eu-west-2", "eu-west-3", "eu-central-1",
            "ap-southeast-1", "ap-southeast-2", "ap-northeast-1", "ap-northeast-2",
            "ap-south-1", "ca-central-1", "sa-east-1",
        ]


def list_vpcs() -> list[dict[str, Any]]:
    """List all VPCs in the current region.
    
    Returns:
        List of VPC dictionaries with 'id', 'cidr', 'name', and 'is_default' keys
    """
    try:
        from pocket_architect.providers.aws.orchestrators import vpc as vpc_orchestrator
        session = aws_client.get_boto3_session()
        vpcs = vpc_orchestrator.list_vpcs(session)
        return vpcs
    except Exception as e:
        logger.exception("List VPCs error")
        return []


def assign_resource_to_project(
    resource_id: str,
    resource_type: str,
    project_name: str,
    region: str
) -> tuple[bool, str]:
    """Assign an existing unassigned AWS resource to a project.
    
    Args:
        resource_id: AWS resource ID (e.g., instance ID, VPC ID, volume ID)
        resource_type: Quota/resource type name (e.g., "EC2 Instances", "VPCs", "EBS Volumes")
        project_name: Name of the project to assign the resource to
        region: AWS region where the resource exists
        
    Returns:
        Tuple of (success: bool, message: str)
    """
    try:
        # Validate project exists
        state = manager.load_project_state(project_name)
        if not state:
            return False, f"Project '{project_name}' not found"
        
        # Map quota type names to resource state keys
        resource_type_mapping = {
            "EC2 Instances": "instance",
            "VPCs": "vpc",
            "EBS Volumes": "ebs_volumes",
            "Elastic IPs": "elastic_ip",
            "Load Balancers": "alb",
        }
        
        resource_key = resource_type_mapping.get(resource_type)
        if not resource_key:
            return False, f"Unsupported resource type: {resource_type}"
        
        # Check if resource is already assigned to another project
        all_projects = manager.list_projects()
        for proj_name in all_projects:
            if proj_name == project_name:
                continue
            proj_state = manager.load_project_state(proj_name)
            if proj_state:
                proj_resources = proj_state.resources
                # Check for instance
                if resource_key == "instance" and proj_resources.get("instance") == resource_id:
                    return False, f"Resource {resource_id} is already assigned to project '{proj_name}'"
                # Check for VPC
                if resource_key == "vpc" and proj_resources.get("vpc") == resource_id:
                    return False, f"Resource {resource_id} is already assigned to project '{proj_name}'"
                # Check for Elastic IP (can be string or dict)
                if resource_key == "elastic_ip":
                    eip_ref = proj_resources.get("elastic_ip")
                    if eip_ref == resource_id or (
                        isinstance(eip_ref, dict) and 
                        (eip_ref.get("allocation_id") == resource_id or 
                         eip_ref.get("public_ip") == resource_id)
                    ):
                        return False, f"Resource {resource_id} is already assigned to project '{proj_name}'"
                # Check for Load Balancer
                if resource_key == "alb" and proj_resources.get("alb") == resource_id:
                    return False, f"Resource {resource_id} is already assigned to project '{proj_name}'"
                # Check for EBS volumes (list)
                if resource_key == "ebs_volumes":
                    ebs_list = proj_resources.get("ebs_volumes", [])
                    if isinstance(ebs_list, list) and resource_id in ebs_list:
                        return False, f"Resource {resource_id} is already assigned to project '{proj_name}'"
        
        # Validate resource exists in AWS
        session = aws_client.get_boto3_session()
        ec2 = session.client("ec2", region_name=region)
        
        resource_exists = False
        if resource_key == "instance":
            try:
                response = ec2.describe_instances(InstanceIds=[resource_id])
                resource_exists = len(response.get("Reservations", [])) > 0
            except Exception:
                resource_exists = False
        elif resource_key == "vpc":
            try:
                response = ec2.describe_vpcs(VpcIds=[resource_id])
                resource_exists = len(response.get("Vpcs", [])) > 0
            except Exception:
                resource_exists = False
        elif resource_key == "ebs_volumes":
            try:
                response = ec2.describe_volumes(VolumeIds=[resource_id])
                resource_exists = len(response.get("Volumes", [])) > 0
            except Exception:
                resource_exists = False
        elif resource_key == "elastic_ip":
            try:
                # Try as allocation ID first
                if resource_id.startswith("eipalloc-"):
                    response = ec2.describe_addresses(AllocationIds=[resource_id])
                else:
                    # Try as public IP
                    response = ec2.describe_addresses(PublicIps=[resource_id])
                resource_exists = len(response.get("Addresses", [])) > 0
            except Exception:
                resource_exists = False
        elif resource_key == "alb":
            try:
                elbv2 = session.client("elbv2", region_name=region)
                # Try as ARN first
                if resource_id.startswith("arn:"):
                    response = elbv2.describe_load_balancers(LoadBalancerArns=[resource_id])
                else:
                    # Try by name
                    response = elbv2.describe_load_balancers(Names=[resource_id])
                resource_exists = len(response.get("LoadBalancers", [])) > 0
            except Exception:
                resource_exists = False
        
        if not resource_exists:
            return False, f"Resource {resource_id} not found in AWS region {region}"
        
        # Update project state
        if resource_key == "ebs_volumes":
            # EBS volumes are stored as a list
            ebs_list = state.resources.get("ebs_volumes", [])
            if not isinstance(ebs_list, list):
                ebs_list = []
            if resource_id not in ebs_list:
                ebs_list.append(resource_id)
                state.resources["ebs_volumes"] = ebs_list
        elif resource_key == "elastic_ip":
            # Elastic IP can be stored as allocation ID (string) or dict
            # Store as allocation ID for simplicity
            existing_value = state.resources.get("elastic_ip")
            if existing_value == resource_id:
                return True, f"Resource {resource_id} is already assigned to this project"
            if existing_value:
                # Check if it's a dict format
                if isinstance(existing_value, dict):
                    existing_id = existing_value.get("allocation_id") or existing_value.get("public_ip")
                    if existing_id == resource_id:
                        return True, f"Resource {resource_id} is already assigned to this project"
                    if existing_id:
                        return False, f"Project already has a different {resource_type} assigned: {existing_id}"
                else:
                    if existing_value != resource_id:
                        return False, f"Project already has a different {resource_type} assigned: {existing_value}"
            state.resources[resource_key] = resource_id
        else:
            # Other resources are stored as single values
            # Check if already assigned to this project
            existing_value = state.resources.get(resource_key)
            if existing_value == resource_id:
                return True, f"Resource {resource_id} is already assigned to this project"
            if existing_value and existing_value != resource_id:
                return False, f"Project already has a different {resource_type} assigned: {existing_value}"
            state.resources[resource_key] = resource_id
        
        # Save updated state
        manager.save_project_state(state)
        
        return True, f"Successfully assigned {resource_type} {resource_id} to project '{project_name}'"
        
    except Exception as e:
        logger.exception("Assign resource to project error")
        return False, f"Failed to assign resource: {str(e)}"

