"""Local provider using docker-compose + NVIDIA Container Toolkit."""

import os
import subprocess
import shutil
from typing import Optional, Dict, Any
from pathlib import Path
from jinja2 import Template

from pocket_architect.providers.base import BaseProvider
from pocket_architect.core.types import Provider, CostEstimate
from pocket_architect.core.state import SessionStore
from pocket_architect.utils.docker import (
    check_docker_available,
    check_docker_compose_available,
    check_nvidia_container_toolkit,
    docker_compose_up,
    docker_compose_down,
    docker_compose_ps,
    docker_exec,
    docker_copy,
)
from pocket_architect.config.settings import settings
from rich.console import Console

console = Console()


class LocalProvider(BaseProvider):
    """Local provider using Docker Compose."""

    def __init__(self, session_id: str):
        """Initialize local provider.
        
        Args:
            session_id: Session identifier
        """
        super().__init__(session_id)
        self.store = SessionStore(settings.state_dir)
        self.session_dir = self.store.get_session_dir(session_id)
        self.compose_file = self.session_dir / "docker-compose.yml"
        self._ensure_docker_available()

    def _ensure_docker_available(self) -> None:
        """Check Docker availability and raise if not available."""
        if not check_docker_available():
            raise RuntimeError(
                "Docker is not available. Please install Docker: https://docs.docker.com/get-docker/"
            )
        if not check_docker_compose_available():
            raise RuntimeError(
                "docker-compose is not available. Please install docker-compose."
            )

    @property
    def provider(self) -> Provider:
        """Get provider type."""
        return Provider.LOCAL

    def provision_cvat(
        self,
        https: bool = True,
        **kwargs: Any,
    ) -> Dict[str, Any]:
        """Provision CVAT instance locally.
        
        Args:
            https: Enable HTTPS (not applicable for local, always HTTP)
            **kwargs: Provider-specific options
                - cvat_image: CVAT Docker image (default: cvat/server:latest)
                - cvat_port: Port to expose CVAT on (default: 8080)
                - cvat_host: Hostname for CVAT (default: localhost)
        
        Returns:
            Dictionary with provisioned resource information
        """
        cvat_image = kwargs.get("cvat_image", settings.cvat_default_image)
        cvat_port = kwargs.get("cvat_port", 8080)
        cvat_host = kwargs.get("cvat_host", "localhost")
        gpu_available = check_nvidia_container_toolkit()
        
        # Load docker-compose template
        template_path = Path(__file__).parent / "templates" / "docker-compose.yml.j2"
        template = Template(template_path.read_text())
        
        # Render docker-compose.yml
        compose_content = template.render(
            cvat_image=cvat_image,
            cvat_port=cvat_port,
            cvat_host=cvat_host,
            gpu_available=gpu_available,
        )
        
        self.compose_file.write_text(compose_content)
        
        # Start containers
        result = docker_compose_up(self.compose_file, detach=True, build=False)
        
        if result.returncode != 0:
            raise RuntimeError(f"Failed to start CVAT: {result.stderr}")
        
        # Wait for CVAT to be ready
        self._wait_for_cvat_ready(timeout=120)
        
        return {
            "status": "running",
            "cvat_url": f"http://{cvat_host}:{cvat_port}",
            "port": cvat_port,
            "gpu_available": gpu_available,
            "compose_file": str(self.compose_file),
        }

    def _wait_for_cvat_ready(self, timeout: int = 120) -> None:
        """Wait for CVAT to be ready.
        
        Args:
            timeout: Maximum time to wait in seconds
        """
        import time
        
        start_time = time.time()
        while time.time() - start_time < timeout:
            result = docker_exec("cvat", ["curl", "-f", "http://localhost:8080/api/server/health"])
            if result.returncode == 0:
                return
            time.sleep(2)
        
        raise RuntimeError(f"CVAT did not become ready within {timeout} seconds")

    def provision_worker(
        self,
        instance_type: Optional[str] = None,
        **kwargs: Any,
    ) -> Dict[str, Any]:
        """Provision worker node locally.
        
        Args:
            instance_type: Not applicable for local (worker runs as docker container)
            **kwargs: Provider-specific options
            
        Returns:
            Dictionary with provisioned resource information
        """
        # For local, the worker is already part of docker-compose
        # Just ensure it's running
        result = docker_compose_up(self.compose_file, detach=True, build=False)
        
        if result.returncode != 0:
            raise RuntimeError(f"Failed to start worker: {result.stderr}")
        
        return {
            "status": "running",
            "container": "cvat_worker",
            "gpu_available": check_nvidia_container_toolkit(),
        }

    def sync(
        self,
        local_path: Path,
        remote_path: Optional[str] = None,
        direction: str = "both",
    ) -> None:
        """Sync files with local CVAT instance.
        
        Args:
            local_path: Local directory path
            remote_path: Remote path in container (default: /home/django/data/upload)
            direction: Sync direction: "up", "down", or "both"
        """
        # For "up" or "both", local path must exist
        # For "down", we can create it
        if direction in ("up", "both") and not local_path.exists():
            raise FileNotFoundError(f"Local path does not exist: {local_path}")
        
        if remote_path is None:
            remote_path = "/home/django/data/upload"
        
        # Get container name from docker-compose
        container_name = self._get_container_name()
        
        if direction in ("up", "both"):
            # Copy to container
            # First, ensure directory exists in container
            docker_exec(container_name, ["mkdir", "-p", remote_path])
            
            # Use docker cp for directory sync
            # docker cp supports directories natively
            dest = f"{container_name}:{remote_path}"
            result = subprocess.run(
                ["docker", "cp", str(local_path) + "/.", dest],
                capture_output=True,
                text=True,
                check=False,
            )
            if result.returncode != 0:
                raise RuntimeError(f"Failed to sync to container: {result.stderr}")
        
        if direction in ("down", "both"):
            # Copy from container - create local directory first
            local_path.mkdir(parents=True, exist_ok=True)
            source = f"{container_name}:{remote_path}"
            result = subprocess.run(
                ["docker", "cp", source + "/.", str(local_path)],
                capture_output=True,
                text=True,
                check=False,
            )
            if result.returncode != 0:
                raise RuntimeError(f"Failed to sync from container: {result.stderr}")
    
    def _get_container_name(self) -> str:
        """Get the CVAT container name from docker-compose.
        
        Returns:
            Container name
        """
        # Check if container is running
        containers = docker_compose_ps(self.compose_file)
        for container in containers:
            if "cvat" in container.get("Service", "").lower():
                return container.get("Name", "cvat")
        # Fallback to default
        return "cvat"

    def shell(
        self,
        mode: str = "ssh",
    ) -> None:
        """Get shell access to local container.
        
        Args:
            mode: Connection mode
                - "ssh": Execute bash shell in cvat container (docker exec)
                - "jupyter": Launch JupyterLab in container
                - "vscode": Instructions for VSCode Remote-Containers
        """
        container_name = self._get_container_name()
        
        if mode == "ssh":
            # Execute interactive bash shell
            subprocess.run(["docker", "exec", "-it", container_name, "bash"])
        elif mode == "jupyter":
            # Launch JupyterLab in container
            console.print("[yellow]Starting JupyterLab in container...[/yellow]")
            # Install jupyterlab if not present
            docker_exec(container_name, ["pip", "install", "--quiet", "jupyterlab"], user="root")
            # Start JupyterLab
            result = docker_exec(
                container_name,
                ["jupyter", "lab", "--ip=0.0.0.0", "--port=8888", "--no-browser", "--allow-root"],
                user="root",
            )
            if result.returncode == 0:
                # Get port mapping
                import json
                inspect_result = subprocess.run(
                    ["docker", "inspect", container_name, "--format", "{{json .NetworkSettings.Ports}}"],
                    capture_output=True,
                    text=True,
                    check=True,
                )
                ports = json.loads(inspect_result.stdout)
                jupyter_port = ports.get("8888/tcp", [{}])[0].get("HostPort", "8888")
                console.print(f"[green]✓[/green] JupyterLab running at http://localhost:{jupyter_port}")
                console.print("[yellow]Press Ctrl+C to stop JupyterLab[/yellow]")
            else:
                raise RuntimeError(f"Failed to start JupyterLab: {result.stderr}")
        elif mode == "vscode":
            # Provide instructions for VSCode Remote-Containers
            console.print("[bold cyan]VSCode Remote-Containers Setup[/bold cyan]")
            console.print(f"\n[yellow]Container name:[/yellow] {container_name}")
            console.print("\n[green]Option 1: Attach to Running Container[/green]")
            console.print("1. Install 'Dev Containers' extension in VSCode")
            console.print("2. Press F1 → 'Dev Containers: Attach to Running Container'")
            console.print(f"3. Select container: {container_name}")
            console.print("\n[green]Option 2: Use Remote-Containers[/green]")
            console.print("1. Install 'Remote - Containers' extension")
            console.print("2. Press F1 → 'Remote-Containers: Attach to Running Container'")
            console.print(f"3. Select: {container_name}")
        else:
            raise ValueError(f"Unsupported shell mode: {mode}. Must be: ssh, jupyter, or vscode")

    def destroy(self, force: bool = False) -> None:
        """Destroy local resources.
        
        Args:
            force: Skip confirmation prompts
        """
        if not force:
            import typer
            confirm = typer.confirm(
                "This will stop and remove all CVAT containers. Continue?",
                default=False,
            )
            if not confirm:
                return
        
        # Stop and remove containers
        result = docker_compose_down(self.compose_file, volumes=False)
        
        if result.returncode != 0:
            raise RuntimeError(f"Failed to destroy resources: {result.stderr}")

    def cost_estimate(
        self,
        resource_type: str,
        **kwargs: Any,
    ) -> CostEstimate:
        """Estimate cost (always $0 for local).
        
        Args:
            resource_type: Type of resource
            **kwargs: Provider-specific parameters
            
        Returns:
            Cost estimate ($0 for local)
        """
        return CostEstimate(
            hourly_rate_usd=0.0,
            monthly_projection_usd=0.0,
            provider=Provider.LOCAL,
            resource_type=resource_type,
            details={"note": "Local provider has no cloud costs"},
        )

