"""
Qt Web Channel bridge for React-Python communication.
Exposes Python methods to JavaScript via Qt's bridge mechanism.
"""

from PyQt6.QtCore import QObject, pyqtSlot as Slot, pyqtSignal as Signal
from typing import Optional
import json
from pathlib import Path

from pocket_architect.core.manager import ResourceManager
from pocket_architect.core.models import (
    CreateProjectRequest,
    UpdateProjectRequest,
    CreateInstanceRequest,
    CreateBlueprintRequest,
    CreateKeyPairRequest,
    CreateSecurityGroupRequest,
    CreateIAMRoleRequest,
    CreateCertificateRequest,
    CreateAccountRequest,
)
from pocket_architect.utils.logger import setup_logger

logger = setup_logger(__name__)


def redact_sensitive_data(data: dict) -> dict:
    """
    Redact sensitive information from data for safe logging.

    Args:
        data: Dictionary that may contain sensitive information

    Returns:
        Dictionary with sensitive fields redacted
    """
    if not isinstance(data, dict):
        return data

    redacted = data.copy()
    sensitive_fields = [
        "accessKey",
        "secretKey",
        "password",
        "token",
        "key",
        "secret",
        "credentials",
        "auth",
        "apikey",
        "api_key",
    ]

    for field in sensitive_fields:
        if field in redacted:
            if isinstance(redacted[field], str) and len(redacted[field]) > 4:
                # Show first 4 and last 4 characters with *** in between
                redacted[field] = redacted[field][:4] + "***" + redacted[field][-4:]
            else:
                redacted[field] = "***REDACTED***"

    return redacted


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

    def _get_config_path(self) -> Path:
        """
        Get the path to the config file.

        Returns:
            Path to config file
        """
        from pathlib import Path

        config_dir = Path.home() / ".pocket-architect"
        config_dir.mkdir(exist_ok=True)
        return config_dir / "config.json"

    def cleanup(self):
        """Clean up resources before shutdown."""
        logger.info("BackendBridge cleanup initiated")

        try:
            # Close the ResourceManager if it exists
            if self._manager:
                self._manager.close()
                self._manager = None
                logger.debug("ResourceManager closed")

            # Additional cleanup can be added here
            logger.info("BackendBridge cleanup completed")

        except Exception as e:
            logger.error(f"Error during BackendBridge cleanup: {e}")
            import traceback

            traceback.print_exc()

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
            logger.info(
                f"create_project called with data={redact_sensitive_data(data)}"
            )

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
    # AWS CLI PROFILES
    # ========================================================================

    @Slot(result=str)
    def list_aws_profiles(self) -> str:
        """List available AWS CLI profiles."""
        try:
            import boto3

            profiles = boto3.Session().available_profiles
            return json.dumps(profiles)
        except Exception as e:
            logger.error(f"Failed to list AWS profiles: {e}")
            return json.dumps([])

    @Slot(str, str, result=str)
    def validate_aws_profile(self, profile_name: str, region: str) -> str:
        """Validate AWS CLI profile and return account information."""
        try:
            import boto3
            from botocore.exceptions import (
                NoCredentialsError,
                PartialCredentialsError,
                ClientError,
            )

            logger.info(f"Validating AWS profile: {profile_name}")

            session = boto3.Session(profile_name=profile_name)
            credentials = session.get_credentials()
            if not credentials:
                return json.dumps(
                    {"success": False, "error": "No credentials found for profile"}
                )

            # Test the credentials by making a call
            sts_client = session.client("sts", region_name=region)
            response = sts_client.get_caller_identity()
            account_id = response["Account"]

            # Return account info without exposing credentials
            return json.dumps(
                {
                    "success": True,
                    "accountId": account_id,
                    "profile": profile_name,
                    "region": region,
                }
            )

        except (NoCredentialsError, PartialCredentialsError) as e:
            logger.error(f"Invalid credentials for profile {profile_name}: {e}")
            return json.dumps({"success": False, "error": "Invalid AWS credentials"})
        except ClientError as e:
            error_code = e.response["Error"]["Code"]
            if error_code == "InvalidClientTokenId":
                return json.dumps(
                    {
                        "success": False,
                        "error": "AWS credentials are invalid or expired",
                    }
                )
            elif error_code == "UnauthorizedOperation":
                return json.dumps(
                    {
                        "success": False,
                        "error": "Insufficient permissions - need sts:GetCallerIdentity",
                    }
                )
            else:
                return json.dumps(
                    {
                        "success": False,
                        "error": f"AWS API error: {e.response['Error']['Message']}",
                    }
                )
        except Exception as e:
            logger.error(f"Failed to validate profile {profile_name}: {e}")
            return json.dumps({"success": False, "error": str(e)})

    @Slot(str, str, str, result=str)
    def validate_aws_credentials(
        self, access_key: str, secret_key: str, region: str
    ) -> str:
        """Validate AWS credentials and get account ID."""
        try:
            logger.info("Validating AWS credentials")
            import boto3
            from botocore.exceptions import (
                NoCredentialsError,
                PartialCredentialsError,
                ClientError,
            )

            sts_client = boto3.client(
                "sts",
                aws_access_key_id=access_key,
                aws_secret_access_key=secret_key,
                region_name=region,
            )
            response = sts_client.get_caller_identity()
            account_id = response["Account"]
            return json.dumps({"success": True, "accountId": account_id})
        except (NoCredentialsError, PartialCredentialsError) as e:
            logger.error(f"Invalid AWS credentials: {e}")
            return json.dumps({"success": False, "error": "Invalid AWS credentials"})
        except ClientError as e:
            error_code = e.response["Error"]["Code"]
            if error_code == "InvalidAccessKeyId":
                return json.dumps(
                    {"success": False, "error": "Invalid AWS access key ID"}
                )
            elif error_code == "SignatureDoesNotMatch":
                return json.dumps(
                    {"success": False, "error": "Invalid AWS secret access key"}
                )
            elif error_code == "InvalidClientTokenId":
                return json.dumps(
                    {
                        "success": False,
                        "error": "AWS credentials are invalid or expired",
                    }
                )
            elif error_code == "UnauthorizedOperation":
                return json.dumps(
                    {
                        "success": False,
                        "error": "Insufficient permissions - need sts:GetCallerIdentity",
                    }
                )
            else:
                return json.dumps(
                    {
                        "success": False,
                        "error": f"AWS API error: {e.response['Error']['Message']}",
                    }
                )
        except Exception as e:
            logger.error(f"Failed to validate AWS credentials: {e}")
            return json.dumps({"success": False, "error": str(e)})

    # ========================================================================
    # CONFIG FILE OPERATIONS
    # ========================================================================

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
            return json.dumps({"success": False, "error": str(e), "canSimulate": False})

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
            self.error_occurred.emit("list_instances", str(e))
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
            logger.error(f"Failed to get instance {instance_id}: {e}")
            self.error_occurred.emit("get_instance", str(e))
            return json.dumps({})

    @Slot(str, result=str)
    def create_instance(self, instance_data: str) -> str:
        """Create new instance."""
        try:
            data = json.loads(instance_data)
            logger.info(
                f"create_instance called with data={redact_sensitive_data(data)}"
            )

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
            self.error_occurred.emit("create_instance", str(e))
            return json.dumps({"success": False, "error": str(e)})

    @Slot(int, result=str)
    def start_instance(self, instance_id: int) -> str:
        """Start an instance."""
        try:
            logger.info(f"start_instance called with id={instance_id}")
            manager = self._get_manager()
            instance = manager.start_instance(instance_id)

            # Emit signal to update frontend
            self.data_updated.emit("instances", json.dumps([instance.dict()]))

            return json.dumps({"success": True, "data": instance.dict()})
        except Exception as e:
            logger.error(f"Failed to start instance {instance_id}: {e}")
            self.error_occurred.emit("start_instance", str(e))
            return json.dumps({"success": False, "error": str(e)})

    @Slot(int, result=str)
    def stop_instance(self, instance_id: int) -> str:
        """Stop an instance."""
        try:
            logger.info(f"stop_instance called with id={instance_id}")
            manager = self._get_manager()
            instance = manager.stop_instance(instance_id)

            # Emit signal to update frontend
            self.data_updated.emit("instances", json.dumps([instance.dict()]))

            return json.dumps({"success": True, "data": instance.dict()})
        except Exception as e:
            logger.error(f"Failed to stop instance {instance_id}: {e}")
            self.error_occurred.emit("stop_instance", str(e))
            return json.dumps({"success": False, "error": str(e)})

    @Slot(int, result=str)
    def restart_instance(self, instance_id: int) -> str:
        """Restart an instance."""
        try:
            logger.info(f"restart_instance called with id={instance_id}")
            manager = self._get_manager()
            instance = manager.restart_instance(instance_id)

            # Emit signal to update frontend
            self.data_updated.emit("instances", json.dumps([instance.dict()]))

            return json.dumps({"success": True, "data": instance.dict()})
        except Exception as e:
            logger.error(f"Failed to restart instance {instance_id}: {e}")
            self.error_occurred.emit("restart_instance", str(e))
            return json.dumps({"success": False, "error": str(e)})

    # ========================================================================
    # BLUEPRINT OPERATIONS
    # ========================================================================

    @Slot(result=str)
    def list_blueprints(self) -> str:
        """List all blueprints."""
        try:
            logger.info("list_blueprints called")
            manager = self._get_manager()
            blueprints = manager.list_blueprints()
            return json.dumps([b.dict() for b in blueprints])
        except Exception as e:
            logger.error(f"Failed to list blueprints: {e}")
            self.error_occurred.emit("list_blueprints", str(e))
            return json.dumps([])

    @Slot(str, result=str)
    def create_blueprint(self, blueprint_data: str) -> str:
        """Create new blueprint."""
        try:
            data = json.loads(blueprint_data)
            logger.info(f"create_blueprint called with data={data}")

            # Get region from data or use default
            region = data.get("region", "us-east-1")
            manager = self._get_manager(region=region)

            # Create request object
            request = CreateBlueprintRequest(**data)
            blueprint = manager.create_blueprint(request)

            # Emit signal to update frontend
            self.data_updated.emit("blueprints", json.dumps([blueprint.dict()]))

            return json.dumps({"success": True, "data": blueprint.dict()})
        except Exception as e:
            logger.error(f"Failed to create blueprint: {e}")
            self.error_occurred.emit("create_blueprint", str(e))
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
            self.error_occurred.emit("list_accounts", str(e))
            return json.dumps([])

    @Slot(str, result=str)
    def create_account(self, account_data: str) -> str:
        """Create new account."""
        try:
            data = json.loads(account_data)
            logger.info(
                f"create_account called with data={redact_sensitive_data(data)}"
            )

            # Get region from data or use default
            region = data.get("region", "us-east-1")
            manager = self._get_manager(region=region)

            # Create request object
            request = CreateAccountRequest(**data)
            account = manager.create_account(request)

            # Emit signal to update frontend
            self.data_updated.emit("accounts", json.dumps([account.dict()]))

            return json.dumps({"success": True, "data": account.dict()})
        except Exception as e:
            logger.error(f"Failed to create account: {e}")
            self.error_occurred.emit("create_account", str(e))
            return json.dumps({"success": False, "error": str(e)})

    @Slot(int, result=str)
    def disconnect_account(self, account_id: int) -> str:
        """Mark account as disconnected."""
        try:
            logger.info(f"disconnect_account called with id={account_id}")
            manager = self._get_manager()
            manager.disconnect_account(account_id)

            # Emit signal to update frontend
            self.data_updated.emit("accounts", "disconnected")

            return json.dumps(
                {"success": True, "message": "Account disconnected successfully"}
            )
        except Exception as e:
            logger.error(f"Failed to disconnect account {account_id}: {e}")
            self.error_occurred.emit("disconnect_account", str(e))
            return json.dumps({"success": False, "error": str(e)})

    @Slot(int, result=str)
    def test_account_connection(self, account_id: int) -> str:
        """Test account connection."""
        try:
            logger.info(f"test_account_connection called with id={account_id}")
            manager = self._get_manager()
            result = manager.test_account_connection(account_id)
            return json.dumps({"success": True, "connected": result})
        except Exception as e:
            logger.error(f"Failed to test account connection {account_id}: {e}")
            self.error_occurred.emit("test_account_connection", str(e))
            return json.dumps({"success": False, "connected": False, "error": str(e)})

    # ========================================================================
    # COST MANAGEMENT
    # ========================================================================

    @Slot(result=str)
    def get_cost_summary(self) -> str:
        """Get cost summary."""
        try:
            logger.info("get_cost_summary called")
            manager = self._get_manager()
            # This would need to be implemented in the manager
            # For now, return mock data
            return json.dumps(
                {
                    "currentMonth": 0,
                    "lastMonth": 0,
                    "projectedMonth": 0,
                    "byService": [],
                    "dailyData": [],
                }
            )
        except Exception as e:
            logger.error(f"Failed to get cost summary: {e}")
            self.error_occurred.emit("get_cost_summary", str(e))
            return json.dumps(
                {
                    "currentMonth": 0,
                    "lastMonth": 0,
                    "projectedMonth": 0,
                    "byService": [],
                    "dailyData": [],
                }
            )

    # ========================================================================
    # SECURITY OPERATIONS
    # ========================================================================

    @Slot(result=str)
    def list_key_pairs(self) -> str:
        """List all key pairs."""
        try:
            logger.info("list_key_pairs called")
            manager = self._get_manager()
            key_pairs = manager.list_key_pairs()
            return json.dumps(key_pairs)
        except Exception as e:
            logger.error(f"Failed to list key pairs: {e}")
            self.error_occurred.emit("list_key_pairs", str(e))
            return json.dumps([])

    @Slot(str, result=str)
    def create_key_pair(self, key_pair_data: str) -> str:
        """Create new key pair."""
        try:
            data = json.loads(key_pair_data)
            logger.info(f"create_key_pair called with data={data}")

            manager = self._get_manager()
            request = CreateKeyPairRequest(**data)
            result = manager.create_key_pair(request)

            # Emit signal to update frontend
            self.data_updated.emit("key_pairs", json.dumps([result]))

            return json.dumps({"success": True, "data": result})
        except Exception as e:
            logger.error(f"Failed to create key pair: {e}")
            self.error_occurred.emit("create_key_pair", str(e))
            return json.dumps({"success": False, "error": str(e)})

    @Slot(str, result=str)
    def delete_key_pair(self, key_name: str) -> str:
        """Delete key pair."""
        try:
            logger.info(f"delete_key_pair called with name={key_name}")
            manager = self._get_manager()
            manager.delete_key_pair(key_name)

            # Emit signal to update frontend
            self.data_updated.emit("key_pairs", json.dumps([]))

            return json.dumps({"success": True})
        except Exception as e:
            logger.error(f"Failed to delete key pair {key_name}: {e}")
            self.error_occurred.emit("delete_key_pair", str(e))
            return json.dumps({"success": False, "error": str(e)})

    @Slot(result=str)
    def list_security_groups(self) -> str:
        """List all security groups."""
        try:
            logger.info("list_security_groups called")
            manager = self._get_manager()
            security_groups = manager.list_security_groups()
            return json.dumps(security_groups)
        except Exception as e:
            logger.error(f"Failed to list security groups: {e}")
            self.error_occurred.emit("list_security_groups", str(e))
            return json.dumps([])

    @Slot(str, result=str)
    def create_security_group(self, security_group_data: str) -> str:
        """Create new security group."""
        try:
            data = json.loads(security_group_data)
            logger.info(f"create_security_group called with data={data}")

            manager = self._get_manager()
            request = CreateSecurityGroupRequest(**data)
            result = manager.create_security_group(request)

            # Emit signal to update frontend
            self.data_updated.emit("security_groups", json.dumps([result]))

            return json.dumps({"success": True, "data": result})
        except Exception as e:
            logger.error(f"Failed to create security group: {e}")
            self.error_occurred.emit("create_security_group", str(e))
            return json.dumps({"success": False, "error": str(e)})

    @Slot(str, result=str)
    def delete_security_group(self, group_id: str) -> str:
        """Delete security group."""
        try:
            logger.info(f"delete_security_group called with id={group_id}")
            manager = self._get_manager()
            manager.delete_security_group(group_id)

            # Emit signal to update frontend
            self.data_updated.emit("security_groups", json.dumps([]))

            return json.dumps({"success": True})
        except Exception as e:
            logger.error(f"Failed to delete security group {group_id}: {e}")
            self.error_occurred.emit("delete_security_group", str(e))
            return json.dumps({"success": False, "error": str(e)})

    @Slot(result=str)
    def list_iam_roles(self) -> str:
        """List all IAM roles."""
        try:
            logger.info("list_iam_roles called")
            manager = self._get_manager()
            iam_roles = manager.list_iam_roles()
            return json.dumps(iam_roles)
        except Exception as e:
            logger.error(f"Failed to list IAM roles: {e}")
            self.error_occurred.emit("list_iam_roles", str(e))
            return json.dumps([])

    @Slot(str, result=str)
    def create_iam_role(self, iam_role_data: str) -> str:
        """Create new IAM role."""
        try:
            data = json.loads(iam_role_data)
            logger.info(f"create_iam_role called with data={data}")

            manager = self._get_manager()
            request = CreateIAMRoleRequest(**data)
            result = manager.create_iam_role(request)

            # Emit signal to update frontend
            self.data_updated.emit("iam_roles", json.dumps([result]))

            return json.dumps({"success": True, "data": result})
        except Exception as e:
            logger.error(f"Failed to create IAM role: {e}")
            self.error_occurred.emit("create_iam_role", str(e))
            return json.dumps({"success": False, "error": str(e)})

    @Slot(str, result=str)
    def delete_iam_role(self, role_name: str) -> str:
        """Delete IAM role."""
        try:
            logger.info(f"delete_iam_role called with name={role_name}")
            manager = self._get_manager()
            manager.delete_iam_role(role_name)

            # Emit signal to update frontend
            self.data_updated.emit("iam_roles", json.dumps([]))

            return json.dumps({"success": True})
        except Exception as e:
            logger.error(f"Failed to delete IAM role {role_name}: {e}")
            self.error_occurred.emit("delete_iam_role", str(e))
            return json.dumps({"success": False, "error": str(e)})

    @Slot(result=str)
    def list_certificates(self) -> str:
        """List all certificates."""
        try:
            logger.info("list_certificates called")
            manager = self._get_manager()
            certificates = manager.list_certificates()
            return json.dumps(certificates)
        except Exception as e:
            logger.error(f"Failed to list certificates: {e}")
            self.error_occurred.emit("list_certificates", str(e))
            return json.dumps([])

    @Slot(str, result=str)
    def create_certificate(self, certificate_data: str) -> str:
        """Create new certificate."""
        try:
            data = json.loads(certificate_data)
            logger.info(f"create_certificate called with data={data}")

            manager = self._get_manager()
            request = CreateCertificateRequest(**data)
            result = manager.create_certificate(request)

            # Emit signal to update frontend
            self.data_updated.emit("certificates", json.dumps([result]))

            return json.dumps({"success": True, "data": result})
        except Exception as e:
            logger.error(f"Failed to create certificate: {e}")
            self.error_occurred.emit("create_certificate", str(e))
            return json.dumps({"success": False, "error": str(e)})

    @Slot(str, result=str)
    def delete_certificate(self, certificate_arn: str) -> str:
        """Delete certificate."""
        try:
            logger.info(f"delete_certificate called with arn={certificate_arn}")
            manager = self._get_manager()
            manager.delete_certificate(certificate_arn)

            # Emit signal to update frontend
            self.data_updated.emit("certificates", json.dumps([]))

            return json.dumps({"success": True})
        except Exception as e:
            logger.error(f"Failed to delete certificate {certificate_arn}: {e}")
            self.error_occurred.emit("delete_certificate", str(e))
            return json.dumps({"success": False, "error": str(e)})

    # ========================================================================
    # QUOTA OPERATIONS
    # ========================================================================

    @Slot(result=str)
    def get_quotas(self) -> str:
        """Get AWS quotas."""
        try:
            logger.info("get_quotas called")
            manager = self._get_manager()
            # This would need to be implemented in the manager
            # For now, return mock data
            return json.dumps([])
        except Exception as e:
            logger.error(f"Failed to get quotas: {e}")
            self.error_occurred.emit("get_quotas", str(e))
            return json.dumps([])

    # ========================================================================
    # UTILITY OPERATIONS
    # ========================================================================

    @Slot(result=str)
    def ping(self) -> str:
        """Ping the backend to check connectivity."""
        try:
            logger.info("ping called")
            return json.dumps({"status": "ok", "message": "Backend bridge working!"})
        except Exception as e:
            logger.error(f"Ping failed: {e}")
            return json.dumps({"status": "error", "message": str(e)})
