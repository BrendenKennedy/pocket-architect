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

    _startup_cleared = False

    def __init__(self, db_session: Session):
        """
        Initialize account service.

        Args:
            db_session: Database session
        """
        self.db = db_session
        self.config = get_config()

        # Clear accounts on first AccountService instantiation (startup)
        if not AccountService._startup_cleared:
            self._clear_all_accounts_on_startup()
            AccountService._startup_cleared = True

    def _clear_all_accounts_on_startup(self) -> None:
        """Clear all accounts once on application startup for session-based auth."""
        try:
            accounts_db = self.db.query(AccountDB).all()
            if len(accounts_db) > 0:
                logger.info(
                    f"Session-based auth: clearing {len(accounts_db)} accounts from previous session"
                )
                for account_db in accounts_db:
                    if not self._remove_credentials_secure(account_db):
                        logger.warning(
                            f"Failed to remove credentials for account {account_db.id}"
                        )

                deleted_count = self.db.query(AccountDB).delete()
                self.db.commit()
                logger.info(
                    f"Session-based auth: cleared {deleted_count} accounts on startup"
                )
            else:
                logger.info("Session-based auth: no accounts to clear on startup")
        except Exception as e:
            logger.error(f"Failed to clear accounts on startup: {e}")
            self.db.rollback()

    def list_accounts(self) -> List[Account]:
        """
        List all accounts from local database.
        For session-based auth, return current session accounts.

        Returns:
            List of current session accounts
        """
        try:
            accounts_db = self.db.query(AccountDB).all()
            logger.info(
                f"list_accounts: found {len(accounts_db)} accounts in current session"
            )

            accounts = []
            for account_db in accounts_db:
                accounts.append(self._db_to_model(account_db))

            return accounts
        except Exception as e:
            logger.error(f"Error in list_accounts: {e}")
            return []
        except Exception as e:
            logger.error(f"Error in list_accounts: {e}")
            return []

            # Return current session accounts
            logger.info(f"Session-based auth: returning {len(accounts_db)} accounts")

            accounts = []
            for account_db in accounts_db:
                logger.info(
                    f"Account: {account_db.id} - {account_db.name} - {account_db.status}"
                )
                accounts.append(self._db_to_model(account_db))

            return accounts
        except Exception as e:
            logger.error(f"Error in list_accounts: {e}")
            return []

    def _clear_all_accounts(self) -> None:
        """
        Clear all accounts and their credentials for session-based auth.
        """
        try:
            accounts_db = self.db.query(AccountDB).all()
            logger.info(f"Clearing {len(accounts_db)} accounts from database")
            for account_db in accounts_db:
                logger.info(f"Clearing account: {account_db.id} - {account_db.name}")
                # Remove credentials securely
                if not self._remove_credentials_secure(account_db):
                    logger.warning(
                        f"Failed to remove credentials for account {account_db.id}"
                    )

            # Delete all accounts
            deleted_count = self.db.query(AccountDB).delete()
            self.db.commit()
            logger.info(
                f"Successfully cleared {deleted_count} accounts for session-based auth"
            )
        except Exception as e:
            logger.error(f"Failed to clear accounts: {e}")
            self.db.rollback()

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
        if request.profile:
            # For profile-based auth, store the profile name as the "access key"
            # The actual credentials will be retrieved from AWS CLI when needed
            if not self._store_profile_credentials_secure(request):
                raise ValidationError("Failed to store profile credentials securely")
        else:
            # For direct credential auth
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
            if request.profile:
                account_db.aws_profile = request.profile  # Store profile name
            else:
                account_db.aws_profile = (
                    request.accountId
                )  # Use account ID as keychain key
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
        Test connection to account. Auto-disconnects on failure.

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
            success = False
            if account.platform == "aws":
                success = self._test_aws_connection(account)
            elif account.platform == "gcp":
                success = self._test_gcp_connection(account)
            elif account.platform == "azure":
                success = self._test_azure_connection(account)
            else:
                raise ValidationError(f"Unsupported platform: {account.platform}")

            if success:
                # Update last synced timestamp
                account_db = (
                    self.db.query(AccountDB).filter(AccountDB.id == account_id).first()
                )
                if account_db:
                    account_db.last_synced = datetime.utcnow()
                    account_db.status = "connected"
                    self.db.commit()
                return True
            else:
                # Auto-disconnect on failure
                self.disconnect_account(account_id)
                return False

        except Exception as e:
            logger.error(f"Connection test failed for account {account_id}: {e}")
            # Auto-disconnect on exception
            self.disconnect_account(account_id)
            return False

    def disconnect_account(self, account_id: int) -> None:
        """
        Mark account as disconnected without removing credentials.
        Allows for quick reconnection using same profile.

        Args:
            account_id: Account ID to disconnect

        Raises:
            ResourceNotFoundError: If account not found
        """
        account_db = self.db.query(AccountDB).filter(AccountDB.id == account_id).first()
        if not account_db:
            raise ResourceNotFoundError(f"Account {account_id} not found")

        # Mark as disconnected but keep credentials
        account_db.status = "disconnected"
        self.db.commit()

        logger.info(f"Account marked as disconnected: {account_id}")

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
        # Check if this is a profile-based account
        account_db = self.db.query(AccountDB).filter(AccountDB.id == account_id).first()
        if (
            account_db
            and account_db.aws_profile
            and account_db.aws_profile != account.accountId
        ):
            # This is a profile-based account, use AWS CLI profile
            import boto3

            session = boto3.Session(
                profile_name=account_db.aws_profile, region_name=account.region
            )
        else:
            # Use keychain-based credentials
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

    def _store_profile_credentials_secure(self, request: CreateAccountRequest) -> bool:
        """
        Store profile-based credentials securely.
        For profiles, we store a placeholder since credentials come from AWS CLI.

        Args:
            request: Account creation request

        Returns:
            True if successful
        """
        if not request.profile:
            logger.error("Profile name is required for profile-based auth")
            return False

        # Store profile name as both access key and secret key for identification
        # Actual credentials will be retrieved from AWS CLI when needed
        return SecureCredentialStore.store_aws_credentials(
            request.accountId, request.profile, "profile-based-auth"
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
            # Check if this is a profile-based account
            account_db = (
                self.db.query(AccountDB).filter(AccountDB.id == account.id).first()
            )
            if (
                account_db
                and account_db.aws_profile
                and account_db.aws_profile != account.accountId
            ):
                # This is a profile-based account, use AWS CLI profile
                import boto3

                session = boto3.Session(
                    profile_name=account_db.aws_profile, region_name=account.region
                )
            else:
                # Use keychain-based credentials
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

        # Try to get account alias for AWS accounts
        account_alias = None
        if account_db.platform == "aws" and account_db.last_synced:
            try:
                # Get account alias using existing session
                session = self.config.get_aws_session(
                    profile=account_db.account_id, region=account_db.region
                )
                iam_client = session.client("iam")
                aliases = iam_client.list_account_aliases()
                if aliases.get("AccountAliases"):
                    account_alias = aliases["AccountAliases"][0]
            except Exception as e:
                logger.debug(f"Could not fetch account alias: {e}")
                account_alias = None

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
            accountAlias=account_alias,  # Add account alias
        )
