"""WebChannel bridge for Python-JavaScript communication."""

import json
from typing import Any

from PySide6.QtCore import QObject, Signal, Slot

from pocket_architect.gui import cli_bridge


class WebBridge(QObject):
    """Bridge object exposed to JavaScript via WebChannel."""

    # Signals for async operations
    operation_progress = Signal(str, str)  # operation_id, message
    operation_finished = Signal(str, bool, str)  # operation_id, success, message

    def __init__(self, parent=None):
        """Initialize bridge."""
        super().__init__(parent)
        self._active_operations = {}

    @Slot(result=list)
    def list_projects(self) -> list[dict[str, Any]]:
        """List all projects.

        Returns:
            List of project dicts
        """
        try:
            projects = cli_bridge.list_projects()
            # Convert datetime objects to strings for JSON serialization
            for project in projects:
                if "created_at" in project:
                    project["created_at"] = str(project["created_at"])
            return projects
        except Exception as e:
            return [{"error": str(e)}]

    @Slot(str, result=dict)
    def get_project_status(self, project_name: str) -> dict[str, Any]:
        """Get detailed status for a project.

        Args:
            project_name: Project name

        Returns:
            Status dict
        """
        try:
            status = cli_bridge.get_project_status(project_name)
            if status is None:
                return {"error": "Project not found"}
            # Convert datetime objects to strings
            if "created_at" in status:
                status["created_at"] = str(status["created_at"])
            return status
        except Exception as e:
            return {"error": str(e)}

    @Slot(result=list)
    def list_snapshots(self) -> list[dict[str, Any]]:
        """List all snapshots.

        Returns:
            List of snapshot dicts
        """
        try:
            snapshots = cli_bridge.list_snapshots()
            # Convert datetime objects to strings
            for snapshot in snapshots:
                if "created_at" in snapshot:
                    snapshot["created_at"] = str(snapshot["created_at"])
            return snapshots
        except Exception as e:
            return [{"error": str(e)}]

    @Slot(str, result=dict)
    def delete_snapshot(self, name_or_id: str) -> dict[str, Any]:
        """Delete a snapshot.

        Args:
            name_or_id: Snapshot name or ID

        Returns:
            Dict with success and message
        """
        try:
            success, message = cli_bridge.delete_snapshot(name_or_id)
            return {"success": success, "message": message}
        except Exception as e:
            return {"success": False, "error": str(e)}

    @Slot(result=list)
    def list_blueprints(self) -> list[dict[str, Any]]:
        """List all available blueprints.

        Returns:
            List of blueprint dicts
        """
        try:
            blueprints = cli_bridge.list_blueprints()
            # Remove blueprint object from response (not JSON serializable)
            for bp in blueprints:
                if "blueprint" in bp:
                    del bp["blueprint"]
            return blueprints
        except Exception as e:
            return [{"error": str(e)}]

    @Slot(str, result=dict)
    def delete_blueprint(self, name: str) -> dict[str, Any]:
        """Delete a user blueprint.

        Args:
            name: Blueprint name

        Returns:
            Dict with success and message
        """
        try:
            success, message = cli_bridge.delete_blueprint(name)
            return {"success": success, "message": message}
        except Exception as e:
            return {"success": False, "error": str(e)}

    @Slot(str, dict, result=dict)
    def update_blueprint(self, name: str, blueprint_data: dict) -> dict[str, Any]:
        """Update a user blueprint.

        Args:
            name: Blueprint name
            blueprint_data: Blueprint data dict

        Returns:
            Dict with success and message
        """
        try:
            success, message = cli_bridge.update_blueprint(name, blueprint_data)
            return {"success": success, "message": message}
        except Exception as e:
            return {"success": False, "error": str(e)}

    @Slot(str, result=dict)
    def get_cost_info(self, project_name: str) -> dict[str, Any]:
        """Get cost information for a project.

        Args:
            project_name: Project name

        Returns:
            Cost info dict
        """
        try:
            cost_info = cli_bridge.get_cost_info(project_name, use_aws_api=False)
            if cost_info is None:
                return {"error": "Project not found"}
            return cost_info
        except Exception as e:
            return {"error": str(e)}

    @Slot(str, float, str, float, result=dict)
    def set_cost_limit(
        self, project_name: str, limit: float, action: str, warning_threshold: float
    ) -> dict[str, Any]:
        """Set cost limit for a project.

        Args:
            project_name: Project name
            limit: Cost limit in USD
            action: Action (stop/teardown/warn_only)
            warning_threshold: Warning threshold (0.0-1.0)

        Returns:
            Dict with success and message
        """
        try:
            success, message = cli_bridge.set_cost_limit(
                project_name, limit, action, warning_threshold
            )
            return {"success": success, "message": message}
        except Exception as e:
            return {"success": False, "error": str(e)}

    @Slot(result=dict)
    def get_global_cost_limit(self) -> dict[str, Any]:
        """Get global cost limit.

        Returns:
            Dict with limit or null
        """
        try:
            limit = cli_bridge.get_global_cost_limit()
            return {"limit": limit}
        except Exception as e:
            return {"error": str(e)}

    @Slot(float, result=dict)
    def set_global_cost_limit(self, limit: float) -> dict[str, Any]:
        """Set global cost limit.

        Args:
            limit: Global limit in USD (or None to remove)

        Returns:
            Dict with success and message
        """
        try:
            limit_value = limit if limit > 0 else None
            success, message = cli_bridge.set_global_cost_limit(limit_value)
            return {"success": success, "message": message}
        except Exception as e:
            return {"success": False, "error": str(e)}

    @Slot(result=dict)
    def check_aws_credentials(self) -> dict[str, Any]:
        """Check AWS credentials status.

        Returns:
            Dict with valid flag and identity
        """
        try:
            valid, identity = cli_bridge.check_aws_credentials()
            return {"valid": valid, "identity": identity}
        except Exception as e:
            return {"valid": False, "error": str(e)}

    @Slot(result=dict)
    def list_setup_scripts(self) -> dict[str, Any]:
        """List all available setup scripts.

        Returns:
            Dict with script names list
        """
        try:
            scripts = cli_bridge.list_setup_scripts()
            return {"scripts": scripts}
        except Exception as e:
            return {"error": str(e)}

    @Slot(str, result=dict)
    def load_setup_script(self, name: str) -> dict[str, Any]:
        """Load a setup script by name.

        Args:
            name: Script name (without .sh extension)

        Returns:
            Dict with script content
        """
        try:
            content = cli_bridge.load_setup_script(name)
            if content is None:
                return {"error": "Script not found"}
            return {"content": content}
        except Exception as e:
            return {"error": str(e)}

    @Slot(str, str, str, str, float, str, bool, result=dict)
    def deploy_project(
        self,
        operation_id: str,
        blueprint_name: str,
        project_name: str,
        snapshot: str,
        cost_limit: float,
        cost_action: str,
        override: bool,
    ) -> dict[str, Any]:
        """Deploy a project (async operation).

        Args:
            operation_id: Unique operation ID for tracking
            blueprint_name: Blueprint name
            project_name: Project name
            snapshot: Optional snapshot name/ID (empty string if None)
            cost_limit: Optional cost limit (0 if None)
            cost_action: Cost action (stop/teardown/warn_only)
            override: Whether to override existing project

        Returns:
            Dict with operation_id
        """
        try:
            from pocket_architect.gui.cli_bridge import DeployWorker

            worker = DeployWorker(
                blueprint_name=blueprint_name,
                project_name=project_name,
                snapshot=snapshot if snapshot else None,
                cost_limit=cost_limit if cost_limit > 0 else None,
                cost_action=cost_action,
                override=override,
            )

            # Connect signals
            worker.progress.connect(
                lambda msg: self.operation_progress.emit(operation_id, msg)
            )
            worker.finished.connect(
                lambda success, msg: self.operation_finished.emit(
                    operation_id, success, msg
                )
            )

            self._active_operations[operation_id] = worker
            worker.start()

            return {"operation_id": operation_id, "status": "started"}
        except Exception as e:
            return {"error": str(e)}

    @Slot(str, str, bool, result=dict)
    def teardown_project(
        self, operation_id: str, project_name: str, force: bool
    ) -> dict[str, Any]:
        """Teardown a project (async operation).

        Args:
            operation_id: Unique operation ID for tracking
            project_name: Project name
            force: Skip confirmation

        Returns:
            Dict with operation_id
        """
        try:
            from pocket_architect.gui.cli_bridge import TeardownWorker

            worker = TeardownWorker(project_name=project_name, force=force)
            worker.progress.connect(
                lambda msg: self.operation_progress.emit(operation_id, msg)
            )
            worker.finished.connect(
                lambda success, msg: self.operation_finished.emit(
                    operation_id, success, msg
                )
            )

            self._active_operations[operation_id] = worker
            worker.start()

            return {"operation_id": operation_id, "status": "started"}
        except Exception as e:
            return {"error": str(e)}

    @Slot(str, str, str, result=dict)
    def start_stop_project(
        self, operation_id: str, project_name: str, action: str
    ) -> dict[str, Any]:
        """Start or stop a project (async operation).

        Args:
            operation_id: Unique operation ID for tracking
            project_name: Project name
            action: 'start' or 'stop'

        Returns:
            Dict with operation_id
        """
        try:
            from pocket_architect.gui.cli_bridge import StartStopWorker

            worker = StartStopWorker(project_name=project_name, action=action)
            worker.progress.connect(
                lambda msg: self.operation_progress.emit(operation_id, msg)
            )
            worker.finished.connect(
                lambda success, msg: self.operation_finished.emit(
                    operation_id, success, msg
                )
            )

            self._active_operations[operation_id] = worker
            worker.start()

            return {"operation_id": operation_id, "status": "started"}
        except Exception as e:
            return {"error": str(e)}

    @Slot(str, str, str, str, result=dict)
    def create_snapshot(
        self, operation_id: str, project_name: str, name: str, note: str
    ) -> dict[str, Any]:
        """Create a snapshot (async operation).

        Args:
            operation_id: Unique operation ID for tracking
            project_name: Project name
            name: Snapshot name
            note: Optional note (empty string if None)

        Returns:
            Dict with operation_id
        """
        try:
            from pocket_architect.gui.cli_bridge import SnapshotWorker

            worker = SnapshotWorker(
                project_name=project_name, name=name, note=note if note else None
            )
            worker.progress.connect(
                lambda msg: self.operation_progress.emit(operation_id, msg)
            )
            worker.finished.connect(
                lambda success, msg: self.operation_finished.emit(
                    operation_id, success, msg
                )
            )

            self._active_operations[operation_id] = worker
            worker.start()

            return {"operation_id": operation_id, "status": "started"}
        except Exception as e:
            return {"error": str(e)}

