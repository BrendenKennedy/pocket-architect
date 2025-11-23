"""Thread-safe bridge to CLI functions for GUI use."""

import io
import sys
from contextlib import redirect_stderr, redirect_stdout
from typing import Any

from PySide6.QtCore import QThread, Signal

from pocket_architect import cli
from pocket_architect.blueprints import builtin, loader, scripts
from pocket_architect.config import TEMPLATES_DIR, get_aws_identity, logger
from pocket_architect.models import CostLimit
from pocket_architect.providers.aws import client as aws_client, cost as cost_module, status as aws_status
from pocket_architect.state import cost_tracker, manager, resource_tracker, snapshot_index


class OperationWorker(QThread):
    """Base class for long-running operations."""

    finished = Signal(bool, str)  # success, message
    progress = Signal(str)  # status message

    def __init__(self, parent=None):
        """Initialize worker."""
        super().__init__(parent)
        self._error = None

    def run(self):
        """Override in subclasses."""
        pass

    def emit_progress(self, message: str) -> None:
        """Emit progress signal.

        Args:
            message: Progress message
        """
        self.progress.emit(message)

    def emit_finished(self, success: bool, message: str) -> None:
        """Emit finished signal.

        Args:
            success: Whether operation succeeded
            message: Result message
        """
        self.finished.emit(success, message)


class DeployWorker(OperationWorker):
    """Worker for project deployment."""

    def __init__(
        self,
        blueprint_name: str,
        project_name: str,
        snapshot: str | None = None,
        cost_limit: float | None = None,
        cost_action: str = "warn_only",
        override: bool = False,
        parent=None,
    ):
        """Initialize deploy worker.

        Args:
            blueprint_name: Blueprint name
            project_name: Project name
            snapshot: Optional snapshot name/ID
            cost_limit: Optional cost limit
            cost_action: Cost action (stop/teardown/warn_only)
            override: Whether to override existing project
            parent: Parent widget
        """
        super().__init__(parent)
        self.blueprint_name = blueprint_name
        self.project_name = project_name
        self.snapshot = snapshot
        self.cost_limit = cost_limit
        self.cost_action = cost_action
        self.override = override

    def run(self):
        """Run deployment."""
        try:
            # Capture stdout/stderr to avoid console output in GUI
            stdout_capture = io.StringIO()
            stderr_capture = io.StringIO()

            with redirect_stdout(stdout_capture), redirect_stderr(stderr_capture):
                # Call deploy function directly
                cli.deploy(
                    blueprint_name=self.blueprint_name,
                    project_name=self.project_name,
                    snapshot=self.snapshot,
                    interactive=False,
                    verbose=False,
                    cost_limit=self.cost_limit,
                    cost_action=self.cost_action,
                    override=self.override,
                )

            self.emit_finished(True, f"Project '{self.project_name}' deployed successfully")
        except SystemExit as e:
            # Typer raises SystemExit for errors
            error_msg = stderr_capture.getvalue() or stdout_capture.getvalue() or f"Exit code: {e.code if hasattr(e, 'code') else 'unknown'}"
            if not error_msg or error_msg.strip() == "":
                error_msg = "Deployment failed. Check logs for details."
            self.emit_finished(False, f"Deployment failed: {error_msg}")
        except Exception as e:
            logger.exception("Deployment error")
            error_msg = str(e) or "Unknown error occurred"
            self.emit_finished(False, f"Deployment failed: {error_msg}")


class TeardownWorker(OperationWorker):
    """Worker for project teardown."""

    def __init__(self, project_name: str, force: bool = False, parent=None):
        """Initialize teardown worker.

        Args:
            project_name: Project name
            force: Skip confirmation
            parent: Parent widget
        """
        super().__init__(parent)
        self.project_name = project_name
        self.force = force

    def run(self):
        """Run teardown."""
        try:
            stdout_capture = io.StringIO()
            stderr_capture = io.StringIO()

            with redirect_stdout(stdout_capture), redirect_stderr(stderr_capture):
                cli._teardown_project(self.project_name, self.force)

            self.emit_finished(True, f"Project '{self.project_name}' torn down successfully")
        except Exception as e:
            logger.exception("Teardown error")
            self.emit_finished(False, f"Teardown failed: {str(e)}")


class StartStopWorker(OperationWorker):
    """Worker for start/stop operations."""

    def __init__(self, project_name: str, action: str, parent=None):
        """Initialize start/stop worker.

        Args:
            project_name: Project name
            action: 'start' or 'stop'
            parent: Parent widget
        """
        super().__init__(parent)
        self.project_name = project_name
        self.action = action

    def run(self):
        """Run start/stop operation."""
        try:
            stdout_capture = io.StringIO()
            stderr_capture = io.StringIO()

            with redirect_stdout(stdout_capture), redirect_stderr(stderr_capture):
                if self.action == "start":
                    cli.start(self.project_name)
                elif self.action == "stop":
                    cli.stop(self.project_name)
                else:
                    raise ValueError(f"Unknown action: {self.action}")

            action_text = "started" if self.action == "start" else "stopped"
            self.emit_finished(True, f"Project '{self.project_name}' {action_text} successfully")
        except SystemExit as e:
            error_msg = stderr_capture.getvalue() or stdout_capture.getvalue() or str(e)
            self.emit_finished(False, f"{self.action.title()} failed: {error_msg}")
        except Exception as e:
            logger.exception(f"{self.action.title()} error")
            self.emit_finished(False, f"{self.action.title()} failed: {str(e)}")


class SnapshotWorker(OperationWorker):
    """Worker for snapshot creation."""

    def __init__(self, project_name: str, name: str, note: str | None = None, parent=None):
        """Initialize snapshot worker.

        Args:
            project_name: Project name
            name: Snapshot name
            note: Optional note
            parent: Parent widget
        """
        super().__init__(parent)
        self.project_name = project_name
        self.name = name
        self.note = note

    def run(self):
        """Run snapshot creation."""
        try:
            stdout_capture = io.StringIO()
            stderr_capture = io.StringIO()

            with redirect_stdout(stdout_capture), redirect_stderr(stderr_capture):
                cli._snapshot_create(self.project_name, self.name, self.note)

            self.emit_finished(True, f"Snapshot '{self.name}' created successfully")
        except SystemExit as e:
            error_msg = stderr_capture.getvalue() or stdout_capture.getvalue() or str(e)
            self.emit_finished(False, f"Snapshot creation failed: {error_msg}")
        except Exception as e:
            logger.exception("Snapshot creation error")
            self.emit_finished(False, f"Snapshot creation failed: {str(e)}")


# Synchronous functions (no threading needed)


def list_projects() -> list[dict[str, Any]]:
    """List all projects with status.

    Returns:
        List of project dicts with keys: name, blueprint, status, created_at
    """
    projects = manager.list_projects()
    result = []

    session = aws_client.get_boto3_session()
    ec2 = session.client("ec2")

    for project_name in projects:
        state = manager.load_project_state(project_name)
        if not state:
            continue

        # Check instance status
        status = "Unknown"
        if "instance" in state.resources:
            try:
                instance_status = aws_status.get_instance_status(ec2, state.resources["instance"])
                if instance_status.get("exists"):
                    status = instance_status.get("state", "unknown")
                else:
                    status = "deleted"
            except Exception:
                status = "deleted"

        result.append(
            {
                "name": state.project_name,
                "blueprint": state.blueprint_name,
                "status": status,
                "created_at": state.created_at,
            }
        )

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

    resources = state.resources
    status_info = {
        "project_name": project_name,
        "blueprint": state.blueprint_name,
        "created_at": state.created_at,
        "resources": {},
    }

    # Check each resource
    if "instance" in resources:
        instance_status = aws_status.get_instance_status(ec2, resources["instance"])
        status_info["resources"]["instance"] = instance_status

    if "alb" in resources:
        alb_status = aws_status.get_alb_status(elbv2, resources["alb"])
        status_info["resources"]["alb"] = alb_status

    if "elastic_ip" in resources:
        eip_status = aws_status.get_eip_status(ec2, resources["elastic_ip"])
        status_info["resources"]["elastic_ip"] = eip_status

    return status_info


def list_snapshots() -> list[dict[str, Any]]:
    """List all snapshots.

    Returns:
        List of snapshot dicts
    """
    snapshots = snapshot_index.load_snapshots()
    return [
        {
            "name": snap.name,
            "snapshot_id": snap.snapshot_id,
            "project_name": snap.project_name,
            "ami_id": snap.ami_id,
            "created_at": snap.created_at,
            "note": snap.note,
        }
        for snap in snapshots
    ]


def delete_snapshot(name_or_id: str) -> tuple[bool, str]:
    """Delete a snapshot.

    Args:
        name_or_id: Snapshot name or ID

    Returns:
        Tuple of (success, message)
    """
    try:
        stdout_capture = io.StringIO()
        stderr_capture = io.StringIO()

        with redirect_stdout(stdout_capture), redirect_stderr(stderr_capture):
            cli.snapshot_delete_cmd(name_or_id)

        return (True, f"Snapshot '{name_or_id}' deleted successfully")
    except SystemExit as e:
        error_msg = stderr_capture.getvalue() or stdout_capture.getvalue() or str(e)
        return (False, f"Delete failed: {error_msg}")
    except Exception as e:
        logger.exception("Snapshot delete error")
        return (False, f"Delete failed: {str(e)}")


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
                "type": "Built-in",
                "instance_type": instance_type,
                "blueprint": blueprint,
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
                    "type": "User",
                    "instance_type": instance_type,
                    "blueprint": blueprint,
                }
            )

    return result


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


def update_blueprint(name: str, blueprint_data: dict) -> tuple[bool, str]:
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

