"""OS keyring wrapper for secure credential storage."""

import keyring
import secrets
from typing import Optional
from mlcloud.core.types import Provider


class CredentialStore:
    """Secure credential storage using OS keyring."""

    SERVICE_NAME = "mlcloud"

    @classmethod
    def store_cvat_password(cls, session_id: str, password: str) -> None:
        """Store CVAT admin password in keyring.
        
        Args:
            session_id: Session identifier
            password: CVAT admin password
        """
        keyring.set_password(cls.SERVICE_NAME, f"cvat_password_{session_id}", password)

    @classmethod
    def get_cvat_password(cls, session_id: str) -> Optional[str]:
        """Get CVAT admin password from keyring.
        
        Args:
            session_id: Session identifier
            
        Returns:
            Password if found, None otherwise
        """
        return keyring.get_password(cls.SERVICE_NAME, f"cvat_password_{session_id}")

    @classmethod
    def delete_cvat_password(cls, session_id: str) -> None:
        """Delete CVAT admin password from keyring.
        
        Args:
            session_id: Session identifier
        """
        try:
            keyring.delete_password(cls.SERVICE_NAME, f"cvat_password_{session_id}")
        except keyring.errors.PasswordDeleteError:
            pass  # Password may not exist

    @classmethod
    def generate_cvat_password(cls) -> str:
        """Generate random 32-character CVAT admin password.
        
        Returns:
            Random password string
        """
        # Generate 32-character alphanumeric password
        alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*"
        return "".join(secrets.choice(alphabet) for _ in range(32))

    @classmethod
    def store_provider_credential(
        cls,
        provider: Provider,
        credential_key: str,
        credential_value: str,
    ) -> None:
        """Store provider credential in keyring.
        
        Args:
            provider: Cloud provider
            credential_key: Credential key (e.g., "api_key", "access_key_id")
            credential_value: Credential value
        """
        keyring.set_password(
            cls.SERVICE_NAME,
            f"{provider.value}_{credential_key}",
            credential_value,
        )

    @classmethod
    def get_provider_credential(
        cls,
        provider: Provider,
        credential_key: str,
    ) -> Optional[str]:
        """Get provider credential from keyring.
        
        Args:
            provider: Cloud provider
            credential_key: Credential key
            
        Returns:
            Credential value if found, None otherwise
        """
        return keyring.get_password(
            cls.SERVICE_NAME,
            f"{provider.value}_{credential_key}",
        )

    @classmethod
    def delete_provider_credential(
        cls,
        provider: Provider,
        credential_key: str,
    ) -> None:
        """Delete provider credential from keyring.
        
        Args:
            provider: Cloud provider
            credential_key: Credential key
        """
        try:
            keyring.delete_password(
                cls.SERVICE_NAME,
                f"{provider.value}_{credential_key}",
            )
        except keyring.errors.PasswordDeleteError:
            pass  # Credential may not exist

