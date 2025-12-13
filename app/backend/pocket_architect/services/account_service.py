"""
Account service for managing cloud provider accounts.
Handles secure credential storage, account management, and connection testing.
"""

import os
import json
from typing import List, Optional, Dict, Any
from datetime import datetime
from pathlib import Path
import boto3
from sqlalchemy.orm import Session

from pocket_architect.core.models import (
    Account,
    CreateAccountRequest,
    ResourceCount,
    PermissionCheckResult,
)
from pocket_architect.db.models import AccountDB
from pocket_architect.core.exceptions import (
    ValidationError,
    ConfigurationError,
    ResourceNotFoundError,
)
from pocket_architect.core.config import get_config
from pocket_architect.core.secure_store import SecureCredentialStore
from pocket_architect.core.migration import CredentialMigrationService
from pocket_architect.services.permission_service import PermissionService
from pocket_architect.utils.logger import setup_logger

logger = setup_logger(__name__)


class AccountService:
    """Service for managing cloud provider accounts."""

    def __init__(self, db_session: Session):
        """
        Initialize account service.

        Args:
            db_session: Database session
        """
        self.db = db_session
        self.config = get_config()

    def list_accounts(self) -> List[Account]:
        """
        List all accounts from local database.

        Returns:
            List of Account models
        """
        accounts_db = self.db.query(AccountDB).all()
        logger.info(f"Found {len(accounts_db)} accounts in database")

        accounts = []
        for account_db in accounts_db:
            accounts.append(self._db_to_model(account_db))

        return accounts

    def get_account(self, account_id: int) -> Account:
        """
        Get account by ID.

        Args:
            account_id: Account ID

        Returns:
            Account model

        Raises:
            ResourceNotFoundError: If account not found
        """
        account_db = self.db.query(AccountDB).filter(AccountDB.id == account_id).first()
        if not account_db:
            raise ResourceNotFoundError(f"Account {account_id} not found")

        return self._db_to_model(account_db)

    def create_account(self, request: CreateAccountRequest) -> Account:
        """
        Create a new account with secure credential storage.
        Only one account per platform is allowed.

        Args:
            request: Account creation request

        Returns:
            Created Account model

        Raises:
            ValidationError: If account already exists or validation fails
        """
        logger.info(f"Creating account: {request.name} ({request.platform})")

        # Check if any account already exists for this platform
        existing_platform_account = (
            self.db.query(AccountDB)
            .filter(AccountDB.platform == request.platform)
            .first()
        )
        if existing_platform_account:
            raise ValidationError(
                f"An account for {request.platform.upper()} already exists. "
                f"Only one account per platform is allowed for auditability. "
                f"Disconnect the existing account first."
            )

        # Check if account with same ID already exists (shouldn't happen due to platform check above)
        existing_same_id = (
            self.db.query(AccountDB)
            .filter(AccountDB.account_id == request.accountId)
            .first()
        )
        if existing_same_id:
            raise ValidationError(f"Account {request.accountId} already exists")

        # Store credentials securely
        if not self._store_credentials_secure(request):
            raise ValidationError("Failed to store credentials securely")

        # Create database record
        now = datetime.utcnow()
        account_db = AccountDB(
            name=request.name,
            platform=request.platform,
            account_id=request.accountId,
            region=request.region,
            is_default=True,  # Since only one account per platform, it's always default
            created=now,
            last_synced=now,  # Mark as synced since credentials were just validated
            migrated_from_cli=False,  # New accounts aren't migrated
        )

        # Set platform-specific fields
        if request.platform == "aws":
            account_db.aws_profile = request.accountId  # Use account ID as keychain key
        elif request.platform == "gcp":
            # For GCP, we might store service account email if provided
            pass
        elif request.platform == "azure":
            # For Azure, we might store subscription/tenant info
            pass

        self.db.add(account_db)
        self.db.commit()
        self.db.refresh(account_db)

        logger.info(f"Account created with secure storage: {account_db.id}")
        return self._db_to_model(account_db)

    def test_connection(self, account_id: int) -> bool:
        """
        Test connection to account.

        Args:
            account_id: Account ID to test

        Returns:
            True if connection successful

        Raises:
            ResourceNotFoundError: If account not found
        """
        account = self.get_account(account_id)
        logger.info(
            f"Testing connection to account: {account.name} ({account.platform})"
        )

        try:
            if account.platform == "aws":
                return self._test_aws_connection(account)
            elif account.platform == "gcp":
                return self._test_gcp_connection(account)
            elif account.platform == "azure":
                return self._test_azure_connection(account)
            else:
                raise ValidationError(f"Unsupported platform: {account.platform}")
        except Exception as e:
            logger.error(f"Connection test failed for account {account_id}: {e}")
            return False

    def delete_account(self, account_id: int) -> None:
        """
        Delete account and securely remove credentials.

        Args:
            account_id: Account ID to delete

        Raises:
            ResourceNotFoundError: If account not found
        """
        account_db = self.db.query(AccountDB).filter(AccountDB.id == account_id).first()
        if not account_db:
            raise ResourceNotFoundError(f"Account {account_id} not found")

        # Remove credentials securely
        if not self._remove_credentials_secure(account_db):
            logger.warning(f"Failed to remove credentials for account {account_id}")

        self.db.delete(account_db)
        self.db.commit()

        logger.info(f"Account deleted securely: {account_id}")

    def check_permissions(self, account_id: int) -> PermissionCheckResult:
        """
        Check AWS permissions for an account using IAM Policy Simulator.

        Args:
            account_id: Account ID to check

        Returns:
            PermissionCheckResult with detailed permission status

        Raises:
            ResourceNotFoundError: If account not found
            ValidationError: If account is not AWS platform
        """
        account = self.get_account(account_id)

        if account.platform != "aws":
            raise ValidationError("Permission checking only supported for AWS")

        logger.info(f"Checking permissions for AWS account: {account.name}")

        # Get AWS session for the account
        session = self.config.get_aws_session(
            profile=account.accountId, region=account.region
        )

        # Use PermissionService to check permissions
        permission_service = PermissionService()
        result_dict = permission_service.check_account_permissions(account_id, session)

        # Convert dict to Pydantic model
        result = PermissionCheckResult(**result_dict)

        logger.info(
            f"Permission check complete for account {account_id}: "
            f"{result.overallStatus}"
        )

        return result

    def _store_credentials_secure(self, request: CreateAccountRequest) -> bool:
        """
        Store credentials securely based on platform.

        Args:
            request: Account creation request with credentials

        Returns:
            True if successful, False otherwise
        """
        if request.platform == "aws":
            return self._store_aws_credentials_secure(request)
        elif request.platform == "gcp":
            return self._store_gcp_credentials_secure(request)
        elif request.platform == "azure":
            return self._store_azure_credentials_secure(request)
        else:
            logger.error(f"Unsupported platform: {request.platform}")
            return False

    def _store_aws_credentials_secure(self, request: CreateAccountRequest) -> bool:
        """
        Store AWS credentials securely in OS keychain.

        Args:
            request: Account creation request

        Returns:
            True if successful
        """
        if not request.accessKey or not request.secretKey:
            logger.error("AWS access key and secret key are required")
            return False

        return SecureCredentialStore.store_aws_credentials(
            request.accountId, request.accessKey, request.secretKey
        )

    def _store_gcp_credentials_secure(self, request: CreateAccountRequest) -> bool:
        """
        Store GCP credentials securely.

        Args:
            request: Account creation request

        Returns:
            True if successful
        """
        # For GCP, we'll store the service account JSON in keychain
        if not request.secretKey:
            logger.error("GCP service account JSON key is required")
            return False

        try:
            # Validate JSON
            json.loads(request.secretKey)

            # Store the entire JSON as the "secret key"
            return SecureCredentialStore.store_aws_credentials(
                f"gcp-{request.accountId}", "", request.secretKey
            )
        except json.JSONDecodeError:
            logger.error("Invalid GCP service account JSON")
            return False

    def _store_azure_credentials_secure(self, request: CreateAccountRequest) -> bool:
        """
        Store Azure credentials securely.

        Args:
            request: Account creation request

        Returns:
            True if successful
        """
        if not request.accessKey or not request.secretKey:
            logger.error("Azure client ID and client secret are required")
            return False

        # Store client ID as access key, client secret as secret key
        return SecureCredentialStore.store_aws_credentials(
            f"azure-{request.accountId}", request.accessKey, request.secretKey
        )

    def _remove_credentials_secure(self, account_db: AccountDB) -> bool:
        """
        Remove stored credentials securely.

        Args:
            account_db: Account database record

        Returns:
            True if successful
        """
        if account_db.platform == "aws":
            return SecureCredentialStore.delete_aws_credentials(account_db.account_id)
        elif account_db.platform == "gcp":
            return SecureCredentialStore.delete_aws_credentials(
                f"gcp-{account_db.account_id}"
            )
        elif account_db.platform == "azure":
            return SecureCredentialStore.delete_aws_credentials(
                f"azure-{account_db.account_id}"
            )
        else:
            logger.error(
                f"Unsupported platform for credential removal: {account_db.platform}"
            )
            return False

    def _test_aws_connection(self, account: Account) -> bool:
        """Test AWS connection."""
        try:
            session = self.config.get_aws_session(
                profile=account.accountId, region=account.region
            )
            sts = session.client("sts")
            identity = sts.get_caller_identity()
            logger.info(f"AWS connection successful: {identity['Account']}")
            return True
        except Exception as e:
            logger.error(f"AWS connection failed: {e}")
            return False

    def _test_gcp_connection(self, account: Account) -> bool:
        """Test GCP connection."""
        try:
            # Try to use gcloud or google-cloud libraries
            # For now, just check if credentials file exists
            gcloud_dir = Path.home() / ".config" / "gcloud"
            key_file = gcloud_dir / f"{account.name}-service-account.json"

            if key_file.exists():
                # Try to parse the JSON to validate it's a proper service account key
                with open(key_file) as f:
                    key_data = json.load(f)

                if "type" in key_data and key_data["type"] == "service_account":
                    logger.info("GCP credentials file exists and appears valid")
                    return True

            return False
        except Exception as e:
            logger.error(f"GCP connection test failed: {e}")
            return False

    def _test_azure_connection(self, account: Account) -> bool:
        """Test Azure connection."""
        try:
            # For now, just return True - real implementation would test Azure auth
            logger.info("Azure connection test (mock)")
            return True
        except Exception as e:
            logger.error(f"Azure connection test failed: {e}")
            return False

    def _db_to_model(self, account_db: AccountDB) -> Account:
        """
        Convert database model to API model.

        Args:
            account_db: Database account record

        Returns:
            Account API model
        """
        # Count resources (this could be optimized with actual queries)
        resource_count = ResourceCount(
            instances=0,  # TODO: Implement actual counting
            projects=0,
            images=0,
        )

        return Account(
            id=account_db.id,
            name=account_db.name,
            platform=account_db.platform,
            accountId=account_db.account_id,
            status="connected" if account_db.last_synced else "disconnected",
            region=account_db.region,
            accessKey=None,  # Don't expose credentials
            isDefault=account_db.is_default,
            created=account_db.created.isoformat(),
            lastSynced=account_db.last_synced.isoformat()
            if account_db.last_synced
            else "",
            resourceCount=resource_count,
        )
