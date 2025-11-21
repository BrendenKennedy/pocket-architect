"""Base provider interface (ABC)."""

from abc import ABC, abstractmethod
from typing import Optional, Dict, Any
from pathlib import Path

from pocket_architect.core.types import CostEstimate, Provider


class BaseProvider(ABC):
    """Abstract base class for all cloud providers."""

    def __init__(self, session_id: str):
        """Initialize provider.
        
        Args:
            session_id: Session identifier
        """
        self.session_id = session_id

    @abstractmethod
    def provision_cvat(
        self,
        https: bool = True,
        **kwargs: Any,
    ) -> Dict[str, Any]:
        """Provision CVAT instance.
        
        Args:
            https: Enable HTTPS for CVAT
            **kwargs: Provider-specific options
            
        Returns:
            Dictionary with provisioned resource information
        """
        raise NotImplementedError

    @abstractmethod
    def provision_worker(
        self,
        instance_type: Optional[str] = None,
        **kwargs: Any,
    ) -> Dict[str, Any]:
        """Provision worker node for auto-annotation or training.
        
        Args:
            instance_type: Instance/GPU type (provider-specific)
            **kwargs: Provider-specific options
            
        Returns:
            Dictionary with provisioned resource information
        """
        raise NotImplementedError

    @abstractmethod
    def sync(
        self,
        local_path: Path,
        remote_path: Optional[str] = None,
        direction: str = "both",
    ) -> None:
        """Sync files with CVAT instance.
        
        Args:
            local_path: Local directory path
            remote_path: Remote path on CVAT instance
            direction: Sync direction: "up", "down", or "both"
        """
        raise NotImplementedError

    @abstractmethod
    def shell(
        self,
        mode: str = "ssh",
    ) -> None:
        """Get shell access to GPU node.
        
        Args:
            mode: Connection mode: "ssh", "vscode", or "jupyter"
        """
        raise NotImplementedError

    @abstractmethod
    def destroy(self, force: bool = False) -> None:
        """Destroy all resources (guaranteed zero-cost teardown).
        
        Args:
            force: Skip confirmation prompts
        """
        raise NotImplementedError

    @abstractmethod
    def cost_estimate(
        self,
        resource_type: str,
        **kwargs: Any,
    ) -> CostEstimate:
        """Estimate cost for a resource.
        
        Args:
            resource_type: Type of resource ("cvat", "worker", "training")
            **kwargs: Provider-specific parameters
            
        Returns:
            Cost estimate
        """
        raise NotImplementedError

    @property
    @abstractmethod
    def provider(self) -> Provider:
        """Get provider type."""
        raise NotImplementedError

    def validate_credentials(self) -> bool:
        """Validate provider credentials.
        
        Returns:
            True if credentials are valid
            
        Raises:
            ValueError: If credentials are invalid or over-privileged
        """
        # Default implementation - providers should override
        return True
    
    def deploy_training_script(
        self,
        instance_id: str,
        script_content: str,
        script_path: str = "/tmp/train.py",
    ) -> None:
        """Deploy training script to instance (optional method).
        
        Args:
            instance_id: Instance identifier
            script_content: Python script content
            script_path: Remote path to save script
            
        Raises:
            NotImplementedError: If provider doesn't support script deployment
        """
        raise NotImplementedError("Script deployment not implemented for this provider")
    
    def start_training_job(
        self,
        instance_id: str,
        script_path: str,
    ) -> Optional[str]:
        """Start training job on instance (optional method).
        
        Args:
            instance_id: Instance identifier
            script_path: Path to training script on instance
            
        Returns:
            Job ID if available, None otherwise
            
        Raises:
            NotImplementedError: If provider doesn't support job execution
        """
        raise NotImplementedError("Training job execution not implemented for this provider")

