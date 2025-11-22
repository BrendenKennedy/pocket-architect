"""Cost limit enforcement system."""

from datetime import datetime, timezone
from typing import Any

import boto3
from rich.console import Console

from pocket_architect.config import logger
from pocket_architect.models import CostEstimate, CostLimit
from pocket_architect.providers.aws import cost as cost_module
from pocket_architect.state import cost_tracker, manager, resource_tracker

console = Console()


def check_cost_limit(
    session: boto3.Session,
    project_name: str,
    cost_estimate: CostEstimate,
    limit: CostLimit,
) -> dict[str, Any]:
    """
    Check if cost estimate exceeds limit and return enforcement info.

    Args:
        session: boto3 session
        project_name: Project name
        cost_estimate: Cost estimate to check
        limit: Cost limit configuration

    Returns:
        Dictionary with 'exceeded', 'percentage', 'action_required', 'warnings'
    """
    cost = cost_estimate.actual_cost if cost_estimate.actual_cost else cost_estimate.estimated_cost
    percentage = (cost / limit.limit_amount) * 100 if limit.limit_amount > 0 else 0
    exceeded = cost >= limit.limit_amount
    warning_threshold_cost = limit.limit_amount * limit.warning_threshold
    warning_triggered = cost >= warning_threshold_cost

    result = {
        "exceeded": exceeded,
        "percentage": round(percentage, 2),
        "action_required": exceeded and limit.action != "warn_only",
        "warnings": [],
    }

    # Add warnings at thresholds
    if warning_triggered and not exceeded:
        result["warnings"].append(
            f"Cost ({cost:.2f}) is at {percentage:.1f}% of limit ({limit.limit_amount:.2f})"
        )

    if exceeded:
        result["warnings"].append(f"Cost limit EXCEEDED: ${cost:.2f} >= ${limit.limit_amount:.2f}")
        if limit.action != "warn_only":
            result["warnings"].append(f"Action required: {limit.action}")

    return result


def enforce_cost_limit(
    session: boto3.Session, project_name: str, limit: CostLimit | None = None
) -> dict[str, Any]:
    """
    Check and enforce cost limit for a project.

    Args:
        session: boto3 session
        project_name: Project name
        limit: Cost limit (if None, will load from tracker)

    Returns:
        Dictionary with enforcement results
    """
    if limit is None:
        limit = cost_tracker.get_cost_limit(project_name)
        if not limit:
            return {
                "enforced": False,
                "reason": "No cost limit configured for this project",
            }

    # Load project state
    state = manager.load_project_state(project_name)
    if not state:
        return {"enforced": False, "reason": "Project not found"}

    # Get resources
    resources = resource_tracker.get_project_resources(project_name)
    if not resources:
        resources = state.resources

    # Calculate cost estimate
    cost_estimate = cost_module.estimate_project_cost(
        session, project_name, resources, state.created_at
    )

    # Check against limit
    check_result = check_cost_limit(session, project_name, cost_estimate, limit)

    # Update last checked time
    limit.last_checked = datetime.now(timezone.utc)
    cost_tracker.set_cost_limit(limit)

    # Add cost estimate to history
    cost_tracker.add_cost_estimate(cost_estimate)

    result = {
        "enforced": check_result["action_required"],
        "cost": cost_estimate.estimated_cost,
        "limit": limit.limit_amount,
        "percentage": check_result["percentage"],
        "warnings": check_result["warnings"],
        "action": limit.action if check_result["action_required"] else None,
    }

    # Execute action if required
    if check_result["action_required"]:
        action_result = execute_enforcement_action(session, project_name, limit.action, resources)
        result["action_executed"] = action_result.get("success", False)
        result["action_message"] = action_result.get("message", "")

    return result


def execute_enforcement_action(
    session: boto3.Session,
    project_name: str,
    action: str,
    resources: dict[str, Any],
) -> dict[str, Any]:
    """
    Execute enforcement action (stop or teardown).

    Args:
        session: boto3 session
        project_name: Project name
        action: Action to execute ('stop' or 'teardown')
        resources: Project resources

    Returns:
        Dictionary with execution results
    """
    if action == "stop":
        return _execute_stop_action(session, project_name, resources)
    elif action == "teardown":
        return _execute_teardown_action(session, project_name, resources)
    else:
        return {"success": False, "message": f"Unknown action: {action}"}


def _execute_stop_action(
    session: boto3.Session, project_name: str, resources: dict[str, Any]
) -> dict[str, Any]:
    """Execute stop action on project instance."""
    if "instance" not in resources:
        return {"success": False, "message": "No instance found to stop"}

    ec2 = session.client("ec2")
    instance_id = resources["instance"]

    try:
        # Check current state
        response = ec2.describe_instances(InstanceIds=[instance_id])
        if not response.get("Reservations"):
            return {"success": False, "message": "Instance not found"}

        state = response["Reservations"][0]["Instances"][0].get("State", {}).get("Name", "unknown")

        if state == "stopped":
            return {"success": True, "message": "Instance already stopped"}
        elif state != "running":
            return {"success": False, "message": f"Instance is in '{state}' state, cannot stop"}

        # Stop the instance
        ec2.stop_instances(InstanceIds=[instance_id])
        logger.info(f"Stopped instance {instance_id} due to cost limit")

        return {
            "success": True,
            "message": f"Instance {instance_id} stopped due to cost limit",
        }
    except Exception as e:
        logger.error(f"Error stopping instance {instance_id}: {e}")
        return {"success": False, "message": f"Error stopping instance: {e}"}


def _execute_teardown_action(
    session: boto3.Session, project_name: str, resources: dict[str, Any]
) -> dict[str, Any]:
    """Execute teardown action on project."""
    # Import here to avoid circular dependency
    from pocket_architect.cli import _teardown_resources

    try:
        _teardown_resources(project_name, resources, force=True)
        logger.info(f"Torn down project {project_name} due to cost limit")
        console.print(f"[yellow]Project '{project_name}' torn down due to cost limit[/yellow]")

        return {
            "success": True,
            "message": f"Project {project_name} torn down due to cost limit",
        }
    except Exception as e:
        logger.error(f"Error tearing down project {project_name}: {e}")
        return {"success": False, "message": f"Error tearing down project: {e}"}


def enforce_all_cost_limits(session: boto3.Session) -> dict[str, dict[str, Any]]:
    """
    Check and enforce cost limits for all projects.

    Args:
        session: boto3 session

    Returns:
        Dictionary mapping project_name to enforcement results
    """
    limits = cost_tracker.load_cost_limits()
    results = {}

    for project_name, limit in limits.items():
        try:
            result = enforce_cost_limit(session, project_name, limit)
            results[project_name] = result
        except Exception as e:
            logger.error(f"Error enforcing cost limit for {project_name}: {e}")
            results[project_name] = {
                "enforced": False,
                "error": str(e),
            }

    return results


def check_global_cost_limit(session: boto3.Session) -> dict[str, Any]:
    """
    Check total costs across all projects against global limit.

    Args:
        session: boto3 session

    Returns:
        Dictionary with global cost check results
    """
    global_limit = cost_tracker.get_global_cost_limit()
    if not global_limit:
        return {
            "checked": False,
            "reason": "No global cost limit configured",
        }

    # Get all projects
    projects = manager.list_projects()
    total_cost = 0.0
    project_costs: dict[str, float] = {}

    for project_name in projects:
        state = manager.load_project_state(project_name)
        if not state:
            continue

        resources = resource_tracker.get_project_resources(project_name)
        if not resources:
            resources = state.resources

        cost_estimate = cost_module.estimate_project_cost(
            session, project_name, resources, state.created_at
        )
        project_costs[project_name] = cost_estimate.estimated_cost
        total_cost += cost_estimate.estimated_cost

    percentage = (total_cost / global_limit) * 100 if global_limit > 0 else 0
    exceeded = total_cost >= global_limit

    return {
        "checked": True,
        "total_cost": round(total_cost, 4),
        "global_limit": global_limit,
        "percentage": round(percentage, 2),
        "exceeded": exceeded,
        "project_costs": project_costs,
        "warning": (
            f"Global cost limit {'EXCEEDED' if exceeded else 'approaching'}: ${total_cost:.2f} / ${global_limit:.2f} ({percentage:.1f}%)"
            if total_cost >= global_limit * 0.75
            else None
        ),
    }
