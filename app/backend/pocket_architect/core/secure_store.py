"""
Secure credential storage using OS keychain/keyring.
Provides encrypted storage for cloud provider credentials.
"""

import keyring
from keyring.errors import KeyringError, PasswordDeleteError
from typing import Optional, Tuple
from pocket_architect.utils.logger import setup_logger

logger = setup_logger(__name__)


class SecureCredentialStore:
    """Secure credential storage using OS keychain."""

    SERVICE_NAME = "pocket-architect"

    @staticmethod
    def store_aws_credentials(
        account_id: str, access_key: str, secret_key: str
    ) -> bool:
        """
        Store AWS credentials securely in OS keychain.

        Args:
            account_id: Unique account identifier
            access_key: AWS access key ID
            secret_key: AWS secret access key

        Returns:
            True if successful, False otherwise
        """
        try:
            keyring.set_password(
                SecureCredentialStore.SERVICE_NAME,
                f"aws:{account_id}:access_key",
                access_key,
            )
            keyring.set_password(
                SecureCredentialStore.SERVICE_NAME,
                f"aws:{account_id}:secret_key",
                secret_key,
            )
            logger.info(f"AWS credentials stored securely for account: {account_id}")
            return True
        except KeyringError as e:
            logger.error(f"Failed to store AWS credentials in keychain: {e}")
            return False

    @staticmethod
    def get_aws_credentials(account_id: str) -> Tuple[Optional[str], Optional[str]]:
        """
        Retrieve AWS credentials from OS keychain.

        Args:
            account_id: Unique account identifier

        Returns:
            Tuple of (access_key, secret_key), None if not found
        """
        try:
            access_key = keyring.get_password(
                SecureCredentialStore.SERVICE_NAME, f"aws:{account_id}:access_key"
            )
            secret_key = keyring.get_password(
                SecureCredentialStore.SERVICE_NAME, f"aws:{account_id}:secret_key"
            )
            return access_key, secret_key
        except KeyringError as e:
            logger.error(f"Failed to retrieve AWS credentials from keychain: {e}")
            return None, None

    @staticmethod
    def delete_aws_credentials(account_id: str) -> bool:
        """
        Delete AWS credentials from OS keychain.

        Args:
            account_id: Unique account identifier

        Returns:
            True if successful, False otherwise
        """
        try:
            keyring.delete_password(
                SecureCredentialStore.SERVICE_NAME, f"aws:{account_id}:access_key"
            )
            keyring.delete_password(
                SecureCredentialStore.SERVICE_NAME, f"aws:{account_id}:secret_key"
            )
            logger.info(
                f"AWS credentials deleted from keychain for account: {account_id}"
            )
            return True
        except (KeyringError, PasswordDeleteError) as e:
            logger.error(f"Failed to delete AWS credentials from keychain: {e}")
            return False

    @staticmethod
    def test_keychain_access() -> bool:
        """
        Test if keychain is accessible and working.

        Returns:
            True if keychain is accessible
        """
        try:
            # Test with a temporary entry
            test_key = "test-keychain-access"
            test_value = "test-value"

            keyring.set_password(
                SecureCredentialStore.SERVICE_NAME, test_key, test_value
            )
            retrieved = keyring.get_password(
                SecureCredentialStore.SERVICE_NAME, test_key
            )
            keyring.delete_password(SecureCredentialStore.SERVICE_NAME, test_key)

            return retrieved == test_value
        except Exception as e:
            logger.error(f"Keychain access test failed: {e}")
            return False

    @staticmethod
    def get_keychain_backend() -> str:
        """
        Get information about the current keychain backend.

        Returns:
            String describing the keychain backend
        """
        try:
            backend = keyring.get_keyring()
            return f"{backend.__class__.__name__} ({backend.__class__.__module__})"
        except Exception as e:
            return f"Unknown backend (error: {e})"
