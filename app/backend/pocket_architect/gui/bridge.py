"""
Qt Web Channel bridge for React-Python communication.
Exposes Python methods to JavaScript via Qt's bridge mechanism.
"""

from PySide6.QtCore import QObject, Slot, Signal
from typing import Optional
import json
from pathlib import Path

from pocket_architect.core.manager import ResourceManager
from pocket_architect.core.models import (
    CreateProjectRequest,
    UpdateProjectRequest,
    CreateInstanceRequest,
    CreateKeyPairRequest,
    CreateSecurityGroupRequest,
    CreateIAMRoleRequest,
    CreateCertificateRequest,
    CreateAccountRequest,
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
    # SECURITY OPERATIONS
    # ========================================================================

    @Slot(result=str)
    def list_key_pairs(self) -> str:
        """List SSH key pairs."""
        try:
            logger.info("list_key_pairs called")
            manager = self._get_manager()
            key_pairs = manager.list_key_pairs()

            return json.dumps({"success": True, "data": key_pairs})
        except Exception as e:
            logger.error(f"Failed to list key pairs: {e}")
            return json.dumps({"success": False, "error": str(e)})

    @Slot(str, result=str)
    def create_key_pair(self, key_pair_data: str) -> str:
        """Create SSH key pair."""
        try:
            logger.info(f"create_key_pair called with data={key_pair_data}")
            data = json.loads(key_pair_data)
            request = CreateKeyPairRequest(**data)

            manager = self._get_manager()
            key_pair = manager.create_key_pair(request)

            # Emit signal to update frontend
            self.data_updated.emit("key_pairs", json.dumps([key_pair]))

            return json.dumps({"success": True, "data": key_pair})
        except Exception as e:
            logger.error(f"Failed to create key pair: {e}")
            return json.dumps({"success": False, "error": str(e)})

    @Slot(str, result=str)
    def delete_key_pair(self, key_name: str) -> str:
        """Delete SSH key pair."""
        try:
            logger.info(f"delete_key_pair called with name={key_name}")
            manager = self._get_manager()
            manager.delete_key_pair(key_name)

            return json.dumps({"success": True})
        except Exception as e:
            logger.error(f"Failed to delete key pair: {e}")
            return json.dumps({"success": False, "error": str(e)})

    @Slot(result=str)
    def list_security_groups(self) -> str:
        """List security groups."""
        try:
            logger.info("list_security_groups called")
            manager = self._get_manager()
            security_groups = manager.list_security_groups()

            return json.dumps({"success": True, "data": security_groups})
        except Exception as e:
            logger.error(f"Failed to list security groups: {e}")
            return json.dumps({"success": False, "error": str(e)})

    @Slot(str, result=str)
    def create_security_group(self, security_group_data: str) -> str:
        """Create security group."""
        try:
            logger.info(f"create_security_group called with data={security_group_data}")
            data = json.loads(security_group_data)
            request = CreateSecurityGroupRequest(**data)

            manager = self._get_manager()
            security_group = manager.create_security_group(request)

            # Emit signal to update frontend
            self.data_updated.emit("security_groups", json.dumps([security_group]))

            return json.dumps({"success": True, "data": security_group})
        except Exception as e:
            logger.error(f"Failed to create security group: {e}")
            return json.dumps({"success": False, "error": str(e)})

    @Slot(str, result=str)
    def delete_security_group(self, group_id: str) -> str:
        """Delete security group."""
        try:
            logger.info(f"delete_security_group called with id={group_id}")
            manager = self._get_manager()
            manager.delete_security_group(group_id)

            return json.dumps({"success": True})
        except Exception as e:
            logger.error(f"Failed to delete security group: {e}")
            return json.dumps({"success": False, "error": str(e)})

    @Slot(result=str)
    def list_iam_roles(self) -> str:
        """List IAM roles."""
        try:
            logger.info("list_iam_roles called")
            manager = self._get_manager()
            iam_roles = manager.list_iam_roles()

            return json.dumps({"success": True, "data": iam_roles})
        except Exception as e:
            logger.error(f"Failed to list IAM roles: {e}")
            return json.dumps({"success": False, "error": str(e)})

    @Slot(str, result=str)
    def create_iam_role(self, iam_role_data: str) -> str:
        """Create IAM role."""
        try:
            logger.info(f"create_iam_role called with data={iam_role_data}")
            data = json.loads(iam_role_data)
            request = CreateIAMRoleRequest(**data)

            manager = self._get_manager()
            iam_role = manager.create_iam_role(request)

            # Emit signal to update frontend
            self.data_updated.emit("iam_roles", json.dumps([iam_role]))

            return json.dumps({"success": True, "data": iam_role})
        except Exception as e:
            logger.error(f"Failed to create IAM role: {e}")
            return json.dumps({"success": False, "error": str(e)})

    @Slot(str, result=str)
    def delete_iam_role(self, role_name: str) -> str:
        """Delete IAM role."""
        try:
            logger.info(f"delete_iam_role called with name={role_name}")
            manager = self._get_manager()
            manager.delete_iam_role(role_name)

            return json.dumps({"success": True})
        except Exception as e:
            logger.error(f"Failed to delete IAM role: {e}")
            return json.dumps({"success": False, "error": str(e)})

    @Slot(result=str)
    def list_certificates(self) -> str:
        """List certificates."""
        try:
            logger.info("list_certificates called")
            manager = self._get_manager()
            certificates = manager.list_certificates()

            return json.dumps({"success": True, "data": certificates})
        except Exception as e:
            logger.error(f"Failed to list certificates: {e}")
            return json.dumps({"success": False, "error": str(e)})

    @Slot(str, result=str)
    def create_certificate(self, certificate_data: str) -> str:
        """Create certificate."""
        try:
            logger.info(f"create_certificate called with data={certificate_data}")
            data = json.loads(certificate_data)
            request = CreateCertificateRequest(**data)

            manager = self._get_manager()
            certificate = manager.create_certificate(request)

            # Emit signal to update frontend
            self.data_updated.emit("certificates", json.dumps([certificate]))

            return json.dumps({"success": True, "data": certificate})
        except Exception as e:
            logger.error(f"Failed to create certificate: {e}")
            return json.dumps({"success": False, "error": str(e)})

    @Slot(str, result=str)
    def delete_certificate(self, certificate_arn: str) -> str:
        """Delete certificate."""
        try:
            logger.info(f"delete_certificate called with arn={certificate_arn}")
            manager = self._get_manager()
            manager.delete_certificate(certificate_arn)

            return json.dumps({"success": True})
        except Exception as e:
            logger.error(f"Failed to delete certificate: {e}")
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
            manager = self._get_manager()
            accounts = manager.list_accounts()
            return json.dumps([a.dict() for a in accounts])
        except Exception as e:
            logger.error(f"Failed to list accounts: {e}")
            return json.dumps([])

    @Slot(str, result=str)
    def create_account(self, account_data: str) -> str:
        """Create new account."""
        try:
            data = json.loads(account_data)
            logger.info(f"create_account called with data={data}")

            # Create request object
            request = CreateAccountRequest(**data)
            manager = self._get_manager()
            account = manager.create_account(request)

            # Emit signal to update frontend
            self.data_updated.emit("accounts", json.dumps([account.dict()]))

            return json.dumps({"success": True, "data": account.dict()})
        except Exception as e:
            logger.error(f"Failed to create account: {e}")
            return json.dumps({"success": False, "error": str(e)})

    @Slot(int, result=str)
    def test_account_connection(self, account_id: int) -> str:
        """Test account connection."""
        try:
            logger.info(f"test_account_connection called with id={account_id}")
            manager = self._get_manager()
            success = manager.test_account_connection(account_id)

            if success:
                return json.dumps({"success": True, "message": "Connection successful"})
            else:
                return json.dumps({"success": False, "error": "Connection failed"})
        except Exception as e:
            logger.error(f"Failed to test connection: {e}")
            return json.dumps({"success": False, "error": str(e)})

    @Slot(str, str, str, result=str)
    def validate_aws_credentials(
        self, access_key: str, secret_key: str, region: str
    ) -> str:
        """Validate AWS credentials and return account ID."""
        try:
            logger.info("validate_aws_credentials called")

            # Create a direct session with the provided credentials
            import boto3

            temp_session = boto3.Session(
                aws_access_key_id=access_key,
                aws_secret_access_key=secret_key,
                region_name=region,
            )

            # Test credentials with STS GetCallerIdentity
            sts = temp_session.client("sts")
            identity = sts.get_caller_identity()

            account_id = identity["Account"]
            logger.info(f"AWS credentials validated for account: {account_id}")

            return json.dumps({"success": True, "accountId": account_id})

        except Exception as e:
            logger.error(f"Failed to validate AWS credentials: {e}")

            # Map AWS errors to user-friendly messages
            error_str = str(e)
            if "InvalidAccessKeyId" in error_str:
                error_msg = "Invalid AWS access key ID"
            elif "SignatureDoesNotMatch" in error_str:
                error_msg = "Invalid AWS secret access key"
            elif "InvalidClientTokenId" in error_str:
                error_msg = "AWS credentials are invalid or expired"
            elif "UnauthorizedOperation" in error_str:
                error_msg = "Insufficient permissions - need sts:GetCallerIdentity"
            elif "Network" in error_str or "timeout" in error_str:
                error_msg = "Network error - check internet connection"
            else:
                error_msg = f"AWS API error: {error_str}"

            return json.dumps({"success": False, "error": error_msg})

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

    @Slot(int, result=str)
    def check_account_permissions(self, account_id: int) -> str:
        """
        Check AWS permissions for an account.

        Args:
            account_id: Account ID to check

        Returns:
            JSON string with permission check results
        """
        try:
            logger.info(f"check_account_permissions called with id={account_id}")
            manager = self._get_manager()
            result = manager.accounts.check_permissions(account_id)
            return json.dumps(result.dict())
        except Exception as e:
            logger.error(f"Failed to check permissions: {e}", exc_info=True)
            return json.dumps({
                "success": False,
                "error": str(e),
                "canSimulate": False
            })
