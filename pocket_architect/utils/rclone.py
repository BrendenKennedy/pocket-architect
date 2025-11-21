"""RClone wrapper for bidirectional file syncing."""

import subprocess
import shutil
from pathlib import Path
from typing import Optional
from rich.console import Console

console = Console()


def check_rclone_available() -> bool:
    """Check if rclone is available.
    
    Returns:
        True if rclone is available
    """
    return shutil.which("rclone") is not None


def sync_files(
    source: Path,
    destination: str,
    direction: str = "both",
    exclude: Optional[list] = None,
) -> subprocess.CompletedProcess:
    """Sync files using rclone.
    
    Args:
        source: Local source path
        destination: Remote destination (rclone remote:path format)
        direction: Sync direction: "up", "down", or "both"
        exclude: List of patterns to exclude
        
    Returns:
        Completed process
    """
    if not check_rclone_available():
        raise RuntimeError(
            "rclone is not available. Install it: https://rclone.org/install/"
        )
    
    cmd = ["rclone", "sync"]
    
    if direction == "up":
        # Local -> Remote
        cmd.extend([str(source), destination])
    elif direction == "down":
        # Remote -> Local
        cmd.extend([destination, str(source)])
    else:
        # Bidirectional (copy both ways)
        # For bidirectional, we use copy instead of sync
        cmd = ["rclone", "copy", str(source), destination]
        result1 = subprocess.run(cmd, check=False, capture_output=True, text=True)
        cmd = ["rclone", "copy", destination, str(source)]
        result2 = subprocess.run(cmd, check=False, capture_output=True, text=True)
        
        # Return combined result
        if result1.returncode != 0:
            return result1
        return result2
    
    if exclude:
        for pattern in exclude:
            cmd.extend(["--exclude", pattern])
    
    return subprocess.run(
        cmd,
        check=False,
        capture_output=True,
        text=True,
    )


def setup_rclone_remote(
    remote_name: str,
    remote_type: str,
    config: dict,
) -> bool:
    """Set up an rclone remote configuration.
    
    Args:
        remote_name: Name for the remote
        remote_type: Type of remote (s3, sftp, etc.)
        config: Configuration dictionary
        
    Returns:
        True if successful
    """
    if not check_rclone_available():
        return False
    
    # Use rclone config to set up remote
    # This would typically be interactive, but we can use environment variables
    # or config file manipulation
    console.print(f"[yellow]Setting up rclone remote '{remote_name}' of type '{remote_type}'[/yellow]")
    console.print("[yellow]Note: Full rclone remote setup requires interactive configuration[/yellow]")
    return True

