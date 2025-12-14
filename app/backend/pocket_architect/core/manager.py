"""
Resource Manager - Central coordinator for all cloud operations.
"""

from typing import Optional, List
from sqlalchemy.orm import Session

from pocket_architect.core.config import get_config
from pocket_architect.core.models import (
    Project,
    CreateProjectRequest,
    UpdateProjectRequest,
    Instance,
    CreateInstanceRequest,
    CreateKeyPairRequest,
    CreateSecurityGroupRequest,
    CreateIAMRoleRequest,
    CreateCertificateRequest,
    Account,
    CreateAccountRequest,
)
from pocket_architect.providers.aws import AWSProvider
from pocket_architect.services.project_service import ProjectService
from pocket_architect.services.instance_service import InstanceService
from pocket_architect.services.security_service import SecurityService
from pocket_architect.services.account_service import AccountService
from pocket_architect.db.session import get_db, init_db
from pocket_architect.utils.logger import setup_logger

logger = setup_logger(__name__)


class ResourceManager:
    """
    Central resource manager coordinating all cloud operations.

    This is the main entry point for both CLI and GUI.
    """

    def __init__(
        self,
        region: Optional[str] = None,
        profile: Optional[str] = None,
        db_session: Optional[Session] = None,
    ):
        """
        Initialize Resource Manager.

        Args:
            region: AWS region (uses default from config if not provided)
            profile: AWS profile name (optional)
            db_session: Database session (creates new one if not provided)
        """
        # Initialize configuration
        self.config = get_config()

        # Ensure database is initialized
        init_db()

        # Setup region
        self.region = region or self.config.get_default_region()
        self.profile = profile

        # Initialize AWS provider (lazy loading for account operations)
        self._aws_provider = None

        # Get or create database session
        self.db = db_session or get_db()
        self._owns_db = db_session is None  # Track if we own the session

        # Initialize services (AWS provider initialized lazily)
        self.accounts = AccountService(self.db)
        self._projects = None
        self._instances = None
        self._security = None

        logger.info(
            f"ResourceManager initialized (region={self.region}, profile={self.profile})"
        )

    @property
    def aws(self):
        """Lazy-loaded AWS provider."""
        if self._aws_provider is None:
            from pocket_architect.providers.aws import AWSProvider

            self._aws_provider = AWSProvider(self.region, self.profile)
        return self._aws_provider

    @property
    def client(self):
        """Convenience property to access AWS client."""
        return self.aws.client

    @property
    def projects(self):
        """Lazy-loaded project service."""
        if self._projects is None:
            from pocket_architect.services.project_service import ProjectService

            self._projects = ProjectService(self.aws, self.db)
        return self._projects

    @property
    def instances(self):
        """Lazy-loaded instance service."""
        if self._instances is None:
            from pocket_architect.services.instance_service import InstanceService

            self._instances = InstanceService(self.aws, self.db)
        return self._instances

    @property
    def security(self):
        """Lazy-loaded security service."""
        if self._security is None:
            from pocket_architect.services.security_service import SecurityService

            self._security = SecurityService(self.aws, self.db)
        return self._security

    def __enter__(self):
        """Context manager entry."""
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit."""
        if self._owns_db:
            self.db.close()

    # ========================================================================
    # Project Operations
    # ========================================================================

    def list_projects(self) -> List[Project]:
        """
        List all projects.

        Returns:
            List of Project models
        """
        return self.projects.list_projects()

    def get_project(self, project_id: int) -> Project:
        """
        Get project by ID.

        Args:
            project_id: Project ID

        Returns:
            Project model
        """
        return self.projects.get_project(project_id)

    def create_project(self, request: CreateProjectRequest) -> Project:
        """
        Create a new project.

        Args:
            request: Project creation request

        Returns:
            Created Project model
        """
        return self.projects.create_project(request)

    def update_project(self, project_id: int, request: UpdateProjectRequest) -> Project:
        """
        Update existing project.

        Args:
            project_id: Project ID
            request: Update request

        Returns:
            Updated Project model
        """
        return self.projects.update_project(project_id, request)

    def delete_project(self, project_id: int) -> None:
        """
        Delete project.

        Args:
            project_id: Project ID
        """
        self.projects.delete_project(project_id)

    # ========================================================================
    # Instance Operations
    # ========================================================================

    def list_instances(self, project_id: Optional[int] = None) -> List[Instance]:
        """
        List instances.

        Args:
            project_id: Optional project ID filter

        Returns:
            List of Instance models
        """
        return self.instances.list_instances(project_id=project_id)

    def get_instance(self, instance_id: int) -> Instance:
        """
        Get instance by ID.

        Args:
            instance_id: Instance ID

        Returns:
            Instance model
        """
        return self.instances.get_instance(instance_id)

    def create_instance(self, request: CreateInstanceRequest) -> Instance:
        """
        Create a new instance.

        Args:
            request: Instance creation request

        Returns:
            Created Instance model
        """
        return self.instances.create_instance(request)

    def start_instance(self, instance_id: int) -> Instance:
        """
        Start a stopped instance.

        Args:
            instance_id: Instance ID

        Returns:
            Updated Instance model
        """
        return self.instances.start_instance(instance_id)

    def stop_instance(self, instance_id: int) -> Instance:
        """
        Stop a running instance.

        Args:
            instance_id: Instance ID

        Returns:
            Updated Instance model
        """
        return self.instances.stop_instance(instance_id)

    def restart_instance(self, instance_id: int) -> Instance:
        """
        Restart an instance.

        Args:
            instance_id: Instance ID

        Returns:
            Updated Instance model
        """
        return self.instances.restart_instance(instance_id)

    def terminate_instance(self, instance_id: int) -> None:
        """
        Terminate an instance.

        Args:
            instance_id: Instance ID
        """
        self.instances.terminate_instance(instance_id)

    # ========================================================================
    # Security Operations
    # ========================================================================

    def list_key_pairs(self):
        """
        List SSH key pairs.

        Returns:
            List of key pair dictionaries
        """
        return self.security.list_key_pairs()

    def create_key_pair(self, request: CreateKeyPairRequest):
        """
        Create a new SSH key pair.

        Args:
            request: Key pair creation request

        Returns:
            Created key pair dictionary
        """
        return self.security.create_key_pair(request)

    def delete_key_pair(self, key_name: str) -> None:
        """
        Delete an SSH key pair.

        Args:
            key_name: Name of the key pair to delete
        """
        self.security.delete_key_pair(key_name)

    def list_security_groups(self):
        """
        List security groups.

        Returns:
            List of security group dictionaries
        """
        return self.security.list_security_groups()

    def create_security_group(self, request: CreateSecurityGroupRequest):
        """
        Create a new security group.

        Args:
            request: Security group creation request

        Returns:
            Created security group dictionary
        """
        return self.security.create_security_group(request)

    def delete_security_group(self, group_id: str) -> None:
        """
        Delete a security group.

        Args:
            group_id: Security group ID to delete
        """
        self.security.delete_security_group(group_id)

    def list_iam_roles(self):
        """
        List IAM roles.

        Returns:
            List of IAM role dictionaries
        """
        return self.security.list_iam_roles()

    def create_iam_role(self, request: CreateIAMRoleRequest):
        """
        Create a new IAM role.

        Args:
            request: IAM role creation request

        Returns:
            Created IAM role dictionary
        """
        return self.security.create_iam_role(request)

    def delete_iam_role(self, role_name: str) -> None:
        """
        Delete an IAM role.

        Args:
            role_name: Name of the role to delete
        """
        self.security.delete_iam_role(role_name)

    def list_certificates(self):
        """
        List certificates.

        Returns:
            List of certificate dictionaries
        """
        return self.security.list_certificates()

    def create_certificate(self, request: CreateCertificateRequest):
        """
        Request a new SSL certificate.

        Args:
            request: Certificate creation request

        Returns:
            Created certificate dictionary
        """
        return self.security.create_certificate(request)

    def delete_certificate(self, certificate_arn: str) -> None:
        """
        Delete a certificate.

        Args:
            certificate_arn: ARN of the certificate to delete
        """
        self.security.delete_certificate(certificate_arn)

    # ========================================================================
    # Account Operations
    # ========================================================================

    def list_accounts(self) -> List[Account]:
        """
        List all accounts.

        Returns:
            List of Account models
        """
        return self.accounts.list_accounts()

    def get_account(self, account_id: int) -> Account:
        """
        Get account by ID.

        Args:
            account_id: Account ID

        Returns:
            Account model
        """
        return self.accounts.get_account(account_id)

    def create_account(self, request: CreateAccountRequest) -> Account:
        """
        Create a new account.

        Args:
            request: Account creation request

        Returns:
            Created Account model
        """
        return self.accounts.create_account(request)

    def test_account_connection(self, account_id: int) -> bool:
        """
        Test connection to account.

        Args:
            account_id: Account ID to test

        Returns:
            True if connection successful
        """
        return self.accounts.test_connection(account_id)

    def delete_account(self, account_id: int) -> None:
        """
        Delete account.

        Args:
            account_id: Account ID to delete
        """
        self.accounts.delete_account(account_id)

    # ========================================================================
    # Utility Methods
    # ========================================================================

    def test_aws_connection(self) -> bool:
        """
        Test AWS connection.

        Returns:
            True if connection successful
        """
        return self.aws.test_connection()

    def close(self):
        """Close database session if we own it."""
        if self._owns_db and self.db:
            self.db.close()
            logger.debug("Database session closed")
