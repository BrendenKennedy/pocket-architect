"""RunPod provider implementation using REST API + Secure Cloud."""

import requests
from typing import Optional, Dict, Any
from pathlib import Path
from rich.console import Console

from mlcloud.providers.base import BaseProvider
from mlcloud.core.types import Provider, CostEstimate
from mlcloud.utils.sso import check_first_run, authenticate_provider
from mlcloud.utils.keyring import CredentialStore
from mlcloud.utils.cost_estimator import CostEstimator
from mlcloud.config.settings import settings

console = Console()


class RunPodProvider(BaseProvider):
    """RunPod provider using REST API (Secure Cloud only)."""

    API_BASE = "https://api.runpod.io/graphql"

    def __init__(self, session_id: str):
        """Initialize RunPod provider.
        
        Args:
            session_id: Session identifier
        """
        super().__init__(session_id)
        self._ensure_authenticated()

    def _ensure_authenticated(self) -> None:
        """Ensure RunPod credentials are configured."""
        if check_first_run(Provider.RUNPOD):
            console.print("[yellow]First run detected. Authenticating with RunPod...[/yellow]")
            authenticate_provider(Provider.RUNPOD)
        
        self.api_key = CredentialStore.get_provider_credential(Provider.RUNPOD, "api_key")
        if not self.api_key:
            raise RuntimeError("RunPod API key not found. Run authentication first.")
        
        self.headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}",
        }

    @property
    def provider(self) -> Provider:
        """Get provider type."""
        return Provider.RUNPOD

    def provision_cvat(
        self,
        https: bool = True,
        **kwargs: Any,
    ) -> Dict[str, Any]:
        """Provision CVAT instance on RunPod (Secure Cloud).
        
        Args:
            https: Enable HTTPS (always enabled for Secure Cloud)
            **kwargs: Provider-specific options
            
        Returns:
            Dictionary with provisioned resource information
        """
        console.print("[bold cyan]Provisioning CVAT on RunPod...[/bold cyan]")
        console.print("[yellow]RunPod provider implementation in progress[/yellow]")
        # Full implementation would create pod via RunPod API
        return {
            "status": "not_implemented",
            "message": "RunPod CVAT provisioning will be fully implemented",
        }

    def provision_worker(
        self,
        instance_type: Optional[str] = None,
        **kwargs: Any,
    ) -> Dict[str, Any]:
        """Provision worker node on RunPod.
        
        Args:
            instance_type: GPU instance type (e.g., RTX 3090, RTX 4090, A100 40GB)
            **kwargs: Provider-specific options
            
        Returns:
            Dictionary with provisioned resource information
        """
        console.print("[yellow]RunPod worker provisioning will be implemented[/yellow]")
        return {
            "status": "not_implemented",
        }

    def sync(
        self,
        local_path: Path,
        remote_path: Optional[str] = None,
        direction: str = "both",
    ) -> None:
        """Sync files with RunPod pod.
        
        Args:
            local_path: Local directory path
            remote_path: Remote path in pod
            direction: Sync direction
        """
        raise NotImplementedError("RunPod sync will be implemented with SSH or API")

    def shell(
        self,
        mode: str = "ssh",
    ) -> None:
        """Get shell access to RunPod pod.
        
        Args:
            mode: Connection mode: "ssh", "vscode", or "jupyter"
        """
        if mode == "ssh":
            console.print("[yellow]RunPod SSH connection will be implemented[/yellow]")
        else:
            raise NotImplementedError(f"Mode {mode} not yet implemented for RunPod")

    def destroy(self, force: bool = False) -> None:
        """Destroy RunPod resources.
        
        Args:
            force: Skip confirmation prompts
        """
        console.print("[yellow]RunPod destroy will be implemented[/yellow]")

    def cost_estimate(
        self,
        resource_type: str,
        **kwargs: Any,
    ) -> CostEstimate:
        """Estimate cost for RunPod resources.
        
        Args:
            resource_type: Type of resource
            **kwargs: Provider-specific parameters
            
        Returns:
            Cost estimate
        """
        return CostEstimator.estimate(
            Provider.RUNPOD,
            resource_type,
            **kwargs,
        )

