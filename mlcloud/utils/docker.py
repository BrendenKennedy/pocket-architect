"""Docker and docker-compose utilities."""

import subprocess
import shutil
from pathlib import Path
from typing import Optional, List, Dict, Any


def check_docker_available() -> bool:
    """Check if Docker is available.
    
    Returns:
        True if Docker is available
    """
    return shutil.which("docker") is not None


def check_docker_compose_available() -> bool:
    """Check if docker-compose is available.
    
    Returns:
        True if docker-compose is available
    """
    return shutil.which("docker-compose") is not None or shutil.which("docker") is not None


def check_nvidia_container_toolkit() -> bool:
    """Check if NVIDIA Container Toolkit is available.
    
    Returns:
        True if NVIDIA Container Toolkit is available
    """
    try:
        result = subprocess.run(
            ["docker", "run", "--rm", "--gpus", "all", "nvidia/cuda:11.0-base", "nvidia-smi"],
            capture_output=True,
            text=True,
            timeout=30,
        )
        return result.returncode == 0
    except (subprocess.TimeoutExpired, FileNotFoundError):
        return False


def docker_compose_up(
    compose_file: Path,
    detach: bool = True,
    build: bool = False,
) -> subprocess.CompletedProcess:
    """Run docker-compose up.
    
    Args:
        compose_file: Path to docker-compose.yml file
        detach: Run in detached mode
        build: Build images before starting
        
    Returns:
        Completed process
    """
    cmd = ["docker-compose", "-f", str(compose_file), "up"]
    
    if detach:
        cmd.append("-d")
    
    if build:
        cmd.append("--build")
    
    return subprocess.run(
        cmd,
        check=False,
        capture_output=True,
        text=True,
    )


def docker_compose_down(
    compose_file: Path,
    volumes: bool = False,
) -> subprocess.CompletedProcess:
    """Run docker-compose down.
    
    Args:
        compose_file: Path to docker-compose.yml file
        volumes: Remove volumes
        
    Returns:
        Completed process
    """
    cmd = ["docker-compose", "-f", str(compose_file), "down"]
    
    if volumes:
        cmd.append("-v")
    
    return subprocess.run(
        cmd,
        check=False,
        capture_output=True,
        text=True,
    )


def docker_compose_ps(compose_file: Path) -> List[Dict[str, str]]:
    """Get docker-compose container status.
    
    Args:
        compose_file: Path to docker-compose.yml file
        
    Returns:
        List of container status dictionaries
    """
    result = subprocess.run(
        ["docker-compose", "-f", str(compose_file), "ps", "--format", "json"],
        capture_output=True,
        text=True,
        check=False,
    )
    
    if result.returncode != 0:
        return []
    
    containers = []
    for line in result.stdout.strip().split("\n"):
        if line:
            try:
                import json
                containers.append(json.loads(line))
            except json.JSONDecodeError:
                continue
    
    return containers


def docker_exec(
    container: str,
    command: List[str],
    user: Optional[str] = None,
) -> subprocess.CompletedProcess:
    """Execute command in Docker container.
    
    Args:
        container: Container name
        command: Command to execute
        user: User to run command as
        
    Returns:
        Completed process
    """
    cmd = ["docker", "exec"]
    
    if user:
        cmd.extend(["-u", user])
    
    cmd.append(container)
    cmd.extend(command)
    
    return subprocess.run(
        cmd,
        check=False,
        capture_output=True,
        text=True,
    )


def docker_copy(
    source: Path,
    destination: str,
    direction: str = "to",
) -> subprocess.CompletedProcess:
    """Copy files to/from Docker container.
    
    Args:
        source: Source path (local Path object)
        destination: Destination path (container:path or local Path)
        direction: "to" (local -> container) or "from" (container -> local)
        
    Returns:
        Completed process
    """
    if direction == "to":
        # docker cp local_path container:path
        # destination should be "container:path"
        cmd = ["docker", "cp", str(source), destination]
    else:
        # docker cp container:path local_path
        # source should be "container:path", destination is local Path
        cmd = ["docker", "cp", str(source), str(destination)]
    
    return subprocess.run(
        cmd,
        check=False,
        capture_output=True,
        text=True,
    )

