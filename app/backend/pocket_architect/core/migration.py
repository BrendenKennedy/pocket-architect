"""
Credential migration service.
Handles migration from insecure storage (AWS CLI profiles) to secure keychain storage.
"""

import configparser
from pathlib import Path
from typing import List, Dict
from pocket_architect.core.secure_store import SecureCredentialStore
from pocket_architect.utils.logger import setup_logger

logger = setup_logger(__name__)


class CredentialMigrationService:
    """Service for migrating credentials from insecure to secure storage."""

    @staticmethod
    def migrate_aws_cli_profiles() -> Dict[str, int]:
        """
        Migrate existing AWS CLI profiles to secure keychain storage.

        Scans ~/.aws/credentials for profiles and migrates them to keychain.
        Removes migrated profiles from the plaintext file.

        Returns:
            Dict with migration statistics
        """
        aws_dir = Path.home() / ".aws"
        credentials_file = aws_dir / "credentials"

        if not credentials_file.exists():
            logger.info("No AWS credentials file found, nothing to migrate")
            return {"scanned": 0, "migrated": 0, "skipped": 0, "errors": 0}

        logger.info("Starting AWS CLI profile migration to secure keychain")

        config = configparser.ConfigParser()
        config.read(credentials_file)

        stats = {"scanned": 0, "migrated": 0, "skipped": 0, "errors": 0}
        profiles_to_remove = []

        for profile_name in config.sections():
            stats["scanned"] += 1

            # Skip profiles that are already migrated or not AWS keys
            if profile_name.startswith("pocket-architect-"):
                logger.debug(f"Skipping already migrated profile: {profile_name}")
                stats["skipped"] += 1
                continue

            try:
                access_key = config.get(
                    profile_name, "aws_access_key_id", fallback=None
                )
                secret_key = config.get(
                    profile_name, "aws_secret_access_key", fallback=None
                )

                if not access_key or not secret_key:
                    logger.debug(
                        f"Profile {profile_name} missing credentials, skipping"
                    )
                    stats["skipped"] += 1
                    continue

                # Create a unique account ID for the migrated profile
                account_id = f"legacy-{profile_name}"

                # Store in secure keychain
                if SecureCredentialStore.store_aws_credentials(
                    account_id, access_key, secret_key
                ):
                    logger.info(
                        f"Successfully migrated profile: {profile_name} -> {account_id}"
                    )
                    profiles_to_remove.append(profile_name)
                    stats["migrated"] += 1
                else:
                    logger.error(
                        f"Failed to store credentials for profile: {profile_name}"
                    )
                    stats["errors"] += 1

            except Exception as e:
                logger.error(f"Error migrating profile {profile_name}: {e}")
                stats["errors"] += 1

        # Remove migrated profiles from plaintext file
        if profiles_to_remove:
            for profile in profiles_to_remove:
                config.remove_section(profile)

            try:
                with open(credentials_file, "w") as f:
                    config.write(f)
                logger.info(
                    f"Removed {len(profiles_to_remove)} migrated profiles from plaintext file"
                )
            except Exception as e:
                logger.error(f"Failed to update credentials file: {e}")

        logger.info(f"Migration completed: {stats}")
        return stats

    @staticmethod
    def get_migration_status() -> Dict[str, any]:
        """
        Get current migration status and recommendations.

        Returns:
            Dict with migration status information
        """
        aws_dir = Path.home() / ".aws"
        credentials_file = aws_dir / "credentials"

        status = {
            "keychain_available": SecureCredentialStore.test_keychain_access(),
            "keychain_backend": SecureCredentialStore.get_keychain_backend(),
            "aws_credentials_file_exists": credentials_file.exists(),
            "plaintext_profiles": [],
            "migration_recommended": False,
        }

        if credentials_file.exists():
            config = configparser.ConfigParser()
            config.read(credentials_file)
            status["plaintext_profiles"] = list(config.sections())

            # Recommend migration if there are non-pocket-architect profiles
            non_migrated = [
                p
                for p in status["plaintext_profiles"]
                if not p.startswith("pocket-architect-")
            ]
            status["migration_recommended"] = len(non_migrated) > 0

        return status

    @staticmethod
    def validate_migration() -> bool:
        """
        Validate that migration was successful by checking keychain access.

        Returns:
            True if migration appears successful
        """
        # Test keychain access
        if not SecureCredentialStore.test_keychain_access():
            logger.error("Keychain access test failed")
            return False

        # Check that we can retrieve a test credential
        test_account = "migration-test"
        test_access = "AKIATEST"
        test_secret = "test-secret"

        # Store test credential
        if not SecureCredentialStore.store_aws_credentials(
            test_account, test_access, test_secret
        ):
            logger.error("Failed to store test credential")
            return False

        # Retrieve and verify
        access_key, secret_key = SecureCredentialStore.get_aws_credentials(test_account)
        if access_key != test_access or secret_key != test_secret:
            logger.error("Test credential retrieval failed")
            return False

        # Clean up
        SecureCredentialStore.delete_aws_credentials(test_account)

        logger.info("Migration validation successful")
        return True
