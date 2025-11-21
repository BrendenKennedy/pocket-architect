"""Shared utilities for CVAT CLI"""

import os
from pathlib import Path
from typing import Optional, Tuple


def get_project_paths() -> Tuple[Path, Path, Path]:
    """Get project root, terraform directory, and configs directory paths.
    
    Returns:
        Tuple of (project_root, terraform_dir, configs_dir)
    """
    # Get the directory where this script is located (scripts/cvat/)
    script_dir = Path(__file__).parent.parent
    # Project root is one level up from scripts/
    project_root = script_dir.parent
    terraform_dir = project_root / "terraform"
    configs_dir = project_root / "configs"
    
    return project_root, terraform_dir, configs_dir


def ensure_symlink(source: Path, target: Path) -> None:
    """Ensure symlink exists from source to target.
    
    Args:
        source: Source file path
        target: Target symlink path
    """
    if not target.exists() or not target.is_symlink():
        if target.exists():
            target.unlink()
        target.symlink_to(source.relative_to(target.parent.parent))


def get_terraform_state_path(terraform_dir: Path) -> Path:
    """Get the terraform state file path.
    
    Args:
        terraform_dir: Path to terraform directory
        
    Returns:
        Path to terraform.tfstate file
    """
    return terraform_dir / "state" / "terraform.tfstate"


def get_tfvars_path(configs_dir: Path) -> Path:
    """Get the terraform.tfvars file path.
    
    Args:
        configs_dir: Path to configs directory
        
    Returns:
        Path to terraform.tfvars file
    """
    return configs_dir / "terraform.tfvars"

