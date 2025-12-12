"""
Qt Web Channel bridge for React-Python communication.
Exposes Python methods to JavaScript via Qt's bridge mechanism.
"""

from PySide6.QtCore import QObject, Slot, Signal
from typing import Dict, List, Any, Optional
import json
import os
from pathlib import Path

from pocket_architect.core.manager import ResourceManager
from pocket_architect.core.models import (
    CreateProjectRequest,
    UpdateProjectRequest,
    CreateInstanceRequest,
)
from pocket_architect.utils.logger import setup_logger

logger = setup_logger(__name__)


class BackendBridge(QObject):
    """Bridge object exposed to JavaScript via QWebChannel."""

    # Signals to emit to frontend
    data_updated = Signal(str, str)  # (entity_type, json_data)
    error_occurred = Signal(str, str)  # (operation, error_message)

    def __init__(self):
        super().__init__()
        self._manager: Optional[ResourceManager] = None
        logger.info("BackendBridge initialized")

    def _get_manager(self, region: str = "us-east-1") -> ResourceManager:
        """
        Get or create ResourceManager instance.

        Args:
            region: AWS region (defaults to us-east-1)

        Returns:
            ResourceManager instance
        """
        if self._manager is None:
            self._manager = ResourceManager(region=region)
        return self._manager

    # ========================================================================
    # PROJECT OPERATIONS
    # ========================================================================

    @Slot(result=str)
    def list_projects(self) -> str:
        """List all projects."""
        try:
            logger.info("list_projects called")
            manager = self._get_manager()
            projects = manager.list_projects()
            return json.dumps([p.dict() for p in projects])
        except Exception as e:
            logger.error(f"Failed to list projects: {e}")
            self.error_occurred.emit("list_projects", str(e))
            return json.dumps([])

    @Slot(int, result=str)
    def get_project(self, project_id: int) -> str:
        """Get project by ID."""
        try:
            logger.info(f"get_project called with id={project_id}")
            manager = self._get_manager()
            project = manager.get_project(project_id)
            return json.dumps(project.dict())
        except Exception as e:
            logger.error(f"Failed to get project {project_id}: {e}")
            self.error_occurred.emit("get_project", str(e))
            return json.dumps({})

    @Slot(str, result=str)
    def create_project(self, project_data: str) -> str:
        """Create new project."""
        try:
            data = json.loads(project_data)
            logger.info(f"create_project called with data={data}")

            # Get region from data or use default
            region = data.get("region", "us-east-1")
            manager = self._get_manager(region=region)

            # Create request object
            request = CreateProjectRequest(**data)
            project = manager.create_project(request)

            # Emit signal to update frontend
            self.data_updated.emit("projects", json.dumps([project.dict()]))

            return json.dumps({"success": True, "data": project.dict()})
        except Exception as e:
            logger.error(f"Failed to create project: {e}")
            self.error_occurred.emit("create_project", str(e))
            return json.dumps({"success": False, "error": str(e)})

    @Slot(int, str, result=str)
    def update_project(self, project_id: int, update_data: str) -> str:
        """Update existing project."""
        try:
            data = json.loads(update_data)
            logger.info(f"update_project called with id={project_id}, data={data}")

            manager = self._get_manager()
            request = UpdateProjectRequest(**data)
            project = manager.update_project(project_id, request)

            # Emit signal to update frontend
            self.data_updated.emit("projects", json.dumps([project.dict()]))

            return json.dumps({"success": True, "data": project.dict()})
        except Exception as e:
            logger.error(f"Failed to update project: {e}")
            return json.dumps({"success": False, "error": str(e)})

    @Slot(int, result=str)
    def delete_project(self, project_id: int) -> str:
        """Delete project by ID."""
        try:
            logger.info(f"delete_project called with id={project_id}")
            manager = self._get_manager()
            manager.delete_project(project_id)

            # Emit signal to update frontend
            self.data_updated.emit("projects", "deleted")

            return json.dumps(
                {"success": True, "message": "Project deleted successfully"}
            )
        except Exception as e:
            logger.error(f"Failed to delete project: {e}")
            return json.dumps({"success": False, "error": str(e)})

    # ========================================================================
    # INSTANCE OPERATIONS
    # ========================================================================

    @Slot(result=str)
    def list_instances(self) -> str:
        """List all instances."""
        try:
            logger.info("list_instances called")
            manager = self._get_manager()
            instances = manager.list_instances()
            return json.dumps([i.dict() for i in instances])
        except Exception as e:
            logger.error(f"Failed to list instances: {e}")
            return json.dumps([])

    @Slot(int, result=str)
    def get_instance(self, instance_id: int) -> str:
        """Get instance by ID."""
        try:
            logger.info(f"get_instance called with id={instance_id}")
            manager = self._get_manager()
            instance = manager.get_instance(instance_id)
            return json.dumps(instance.dict())
        except Exception as e:
            logger.error(f"Failed to get instance: {e}")
            return json.dumps({})

    @Slot(str, result=str)
    def create_instance(self, instance_data: str) -> str:
        """Create new instance."""
        try:
            data = json.loads(instance_data)
            logger.info(f"create_instance called with data={data}")

            # Get region from data or use default
            region = data.get("region", "us-east-1")
            manager = self._get_manager(region=region)

            # Create request object
            request = CreateInstanceRequest(**data)
            instance = manager.create_instance(request)

            # Emit signal to update frontend
            self.data_updated.emit("instances", json.dumps([instance.dict()]))

            return json.dumps({"success": True, "data": instance.dict()})
        except Exception as e:
            logger.error(f"Failed to create instance: {e}")
            return json.dumps({"success": False, "error": str(e)})

    @Slot(int, result=str)
    def start_instance(self, instance_id: int) -> str:
        """Start instance."""
        try:
            logger.info(f"start_instance called with id={instance_id}")
            manager = self._get_manager()
            instance = manager.start_instance(instance_id)

            # Emit signal to update frontend
            self.data_updated.emit("instances", json.dumps([instance.dict()]))

            return json.dumps({"success": True, "data": instance.dict()})
        except Exception as e:
            logger.error(f"Failed to start instance: {e}")
            return json.dumps({"success": False, "error": str(e)})

    @Slot(int, result=str)
    def stop_instance(self, instance_id: int) -> str:
        """Stop instance."""
        try:
            logger.info(f"stop_instance called with id={instance_id}")
            manager = self._get_manager()
            instance = manager.stop_instance(instance_id)

            # Emit signal to update frontend
            self.data_updated.emit("instances", json.dumps([instance.dict()]))

            return json.dumps({"success": True, "data": instance.dict()})
        except Exception as e:
            logger.error(f"Failed to stop instance: {e}")
            return json.dumps({"success": False, "error": str(e)})

    @Slot(int, result=str)
    def restart_instance(self, instance_id: int) -> str:
        """Restart instance."""
        try:
            logger.info(f"restart_instance called with id={instance_id}")
            manager = self._get_manager()
            instance = manager.restart_instance(instance_id)

            # Emit signal to update frontend
            self.data_updated.emit("instances", json.dumps([instance.dict()]))

            return json.dumps({"success": True, "data": instance.dict()})
        except Exception as e:
            logger.error(f"Failed to restart instance: {e}")
            return json.dumps({"success": False, "error": str(e)})

    # ========================================================================
    # BLUEPRINT OPERATIONS
    # ========================================================================

    @Slot(result=str)
    def list_blueprints(self) -> str:
        """List all blueprints."""
        try:
            logger.info("list_blueprints called")
            # TODO: Implement actual blueprint listing logic
            return json.dumps([])
        except Exception as e:
            logger.error(f"Failed to list blueprints: {e}")
            return json.dumps([])

    @Slot(str, result=str)
    def create_blueprint(self, blueprint_data: str) -> str:
        """Create new blueprint."""
        try:
            data = json.loads(blueprint_data)
            logger.info(f"create_blueprint called with data={data}")
            # TODO: Implement actual blueprint creation logic
            return json.dumps({"success": True, "message": "Blueprint created (mock)"})
        except Exception as e:
            logger.error(f"Failed to create blueprint: {e}")
            return json.dumps({"success": False, "error": str(e)})

    # ========================================================================
    # ACCOUNT OPERATIONS
    # ========================================================================

    @Slot(result=str)
    def list_accounts(self) -> str:
        """List all accounts."""
        try:
            logger.info("list_accounts called")
            # TODO: Implement actual account listing logic
            return json.dumps([])
        except Exception as e:
            logger.error(f"Failed to list accounts: {e}")
            return json.dumps([])

    @Slot(str, result=str)
    def create_account(self, account_data: str) -> str:
        """Create new account."""
        try:
            data = json.loads(account_data)
            logger.info(f"create_account called with data={data}")
            # TODO: Implement actual account creation logic
            return json.dumps({"success": True, "message": "Account created (mock)"})
        except Exception as e:
            logger.error(f"Failed to create account: {e}")
            return json.dumps({"success": False, "error": str(e)})

    @Slot(int, result=str)
    def test_account_connection(self, account_id: int) -> str:
        """Test account connection."""
        try:
            logger.info(f"test_account_connection called with id={account_id}")
            # TODO: Implement actual connection test logic
            return json.dumps(
                {"success": True, "message": "Connection successful (mock)"}
            )
        except Exception as e:
            logger.error(f"Failed to test connection: {e}")
            return json.dumps({"success": False, "error": str(e)})

    # ========================================================================
    # COST MANAGEMENT OPERATIONS
    # ========================================================================

    @Slot(result=str)
    def get_cost_summary(self) -> str:
        """Get cost summary."""
        try:
            logger.info("get_cost_summary called")
            # TODO: Implement actual cost summary logic
            summary = {
                "currentMonth": 0.0,
                "lastMonth": 0.0,
                "projectedMonth": 0.0,
                "byService": [],
                "dailyData": [],
            }
            return json.dumps(summary)
        except Exception as e:
            logger.error(f"Failed to get cost summary: {e}")
            return json.dumps({})

    # ========================================================================
    # QUOTA OPERATIONS
    # ========================================================================

    @Slot(result=str)
    def get_quotas(self) -> str:
        """Get AWS service quotas."""
        try:
            logger.info("get_quotas called")
            # TODO: Implement real AWS quota fetching
            # For now, return empty structure
            quotas = {"categories": []}
            return json.dumps(quotas)
        except Exception as e:
            logger.error(f"Failed to get quotas: {e}")
            return json.dumps({"categories": []})

    # ========================================================================
    # UTILITY OPERATIONS
    # ========================================================================

    @Slot(result=str)
    def ping(self) -> str:
        """Ping to test bridge connection."""
        logger.info("ping called")
        return json.dumps({"status": "ok", "message": "Bridge is working!"})

    # ========================================================================
    # CONFIG FILE OPERATIONS
    # ========================================================================

    def _get_config_path(self) -> Path:
        """Get the path to the config file."""
        # Use user's home directory for config storage
        home_dir = Path.home()
        config_dir = home_dir / ".pocket-architect"
        config_dir.mkdir(exist_ok=True)
        return config_dir / "config.json"

    @Slot(result=str)
    def load_config(self) -> str:
        """Load config from file."""
        try:
            config_path = self._get_config_path()
            if config_path.exists():
                with open(config_path, "r") as f:
                    content = f.read()
                    # Validate it's valid JSON
                    json.loads(content)
                    return content
            else:
                # Return empty object if no config exists
                return json.dumps({})
        except Exception as e:
            logger.error(f"Failed to load config: {e}")
            return json.dumps({})

    @Slot(str, result=str)
    def save_config(self, config_json: str) -> str:
        """Save config to file."""
        try:
            # Validate JSON
            config_data = json.loads(config_json)

            config_path = self._get_config_path()
            with open(config_path, "w") as f:
                json.dump(config_data, f, indent=2)

            logger.info(f"Config saved to {config_path}")
            return json.dumps({"success": True})
        except Exception as e:
            logger.error(f"Failed to save config: {e}")
            return json.dumps({"success": False, "error": str(e)})
