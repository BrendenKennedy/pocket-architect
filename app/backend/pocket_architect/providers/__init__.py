"""
Base provider classes for cloud operations.
Defines common interfaces that all cloud providers must implement.
"""

from abc import ABC, abstractmethod
from typing import List, Dict, Optional, Any


class CloudProvider(ABC):
    """Abstract base class for cloud providers."""

    # ========================================================================
    # Instance Operations
    # ========================================================================

    @abstractmethod
    def list_instances(
        self, filters: Optional[List[Dict[str, Any]]] = None
    ) -> List[Dict[str, Any]]:
        """
        List instances from the cloud provider.

        Args:
            filters: Optional filters to apply

        Returns:
            List of instance dictionaries
        """
        pass

    @abstractmethod
    def get_instance(self, instance_id: str) -> Dict[str, Any]:
        """
        Get a specific instance by ID.

        Args:
            instance_id: Instance identifier

        Returns:
            Instance dictionary
        """
        pass

    @abstractmethod
    def create_instance(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create a new instance.

        Args:
            config: Instance configuration

        Returns:
            Created instance dictionary
        """
        pass

    @abstractmethod
    def start_instance(self, instance_id: str) -> Dict[str, Any]:
        """
        Start an instance.

        Args:
            instance_id: Instance identifier

        Returns:
            Updated instance dictionary
        """
        pass

    @abstractmethod
    def stop_instance(self, instance_id: str) -> Dict[str, Any]:
        """
        Stop an instance.

        Args:
            instance_id: Instance identifier

        Returns:
            Updated instance dictionary
        """
        pass

    @abstractmethod
    def restart_instance(self, instance_id: str) -> Dict[str, Any]:
        """
        Restart an instance.

        Args:
            instance_id: Instance identifier

        Returns:
            Updated instance dictionary
        """
        pass

    @abstractmethod
    def delete_instance(self, instance_id: str) -> None:
        """
        Delete an instance.

        Args:
            instance_id: Instance identifier
        """
        pass

    # ========================================================================
    # Security Operations
    # ========================================================================

    @abstractmethod
    def list_key_pairs(self) -> List[Dict[str, Any]]:
        """
        List SSH key pairs.

        Returns:
            List of key pair dictionaries
        """
        pass

    @abstractmethod
    def create_key_pair(self, name: str) -> Dict[str, Any]:
        """
        Create a new SSH key pair.

        Args:
            name: Key pair name

        Returns:
            Key pair dictionary
        """
        pass

    @abstractmethod
    def delete_key_pair(self, name: str) -> None:
        """
        Delete an SSH key pair.

        Args:
            name: Key pair name
        """
        pass

    @abstractmethod
    def list_security_groups(self) -> List[Dict[str, Any]]:
        """
        List security groups/firewall rules.

        Returns:
            List of security group dictionaries
        """
        pass

    @abstractmethod
    def create_security_group(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create a security group.

        Args:
            config: Security group configuration

        Returns:
            Security group dictionary
        """
        pass

    @abstractmethod
    def delete_security_group(self, group_id: str) -> None:
        """
        Delete a security group.

        Args:
            group_id: Security group identifier
        """
        pass

    @abstractmethod
    def list_iam_roles(self) -> List[Dict[str, Any]]:
        """
        List IAM roles.

        Returns:
            List of IAM role dictionaries
        """
        pass

    @abstractmethod
    def create_iam_role(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create an IAM role.

        Args:
            config: IAM role configuration

        Returns:
            IAM role dictionary
        """
        pass

    @abstractmethod
    def delete_iam_role(self, role_name: str) -> None:
        """
        Delete an IAM role.

        Args:
            role_name: IAM role name
        """
        pass

    @abstractmethod
    def list_certificates(self) -> List[Dict[str, Any]]:
        """
        List SSL certificates.

        Returns:
            List of certificate dictionaries
        """
        pass

    @abstractmethod
    def create_certificate(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create an SSL certificate.

        Args:
            config: Certificate configuration

        Returns:
            Certificate dictionary
        """
        pass

    @abstractmethod
    def delete_certificate(self, certificate_arn: str) -> None:
        """
        Delete an SSL certificate.

        Args:
            certificate_arn: Certificate ARN
        """
        pass

    # ========================================================================
    # Cost Management
    # ========================================================================

    @abstractmethod
    def get_cost_summary(self) -> Dict[str, Any]:
        """
        Get cost summary for the account.

        Returns:
            Cost summary dictionary
        """
        pass

    # ========================================================================
    # Utility Methods
    # ========================================================================

    @abstractmethod
    def test_connection(self) -> bool:
        """
        Test connection to the cloud provider.

        Returns:
            True if connection successful
        """
        pass

    @abstractmethod
    def get_regions(self) -> List[str]:
        """
        Get available regions for the provider.

        Returns:
            List of region identifiers
        """
        pass
