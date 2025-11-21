"""Validation utilities for inputs and configurations."""

import re
import ipaddress
from pathlib import Path
from typing import Optional
from rich.console import Console

console = Console()


def validate_cidr(cidr: str) -> bool:
    """Validate CIDR notation.
    
    Args:
        cidr: CIDR string (e.g., "1.2.3.4/32")
        
    Returns:
        True if valid CIDR
    """
    try:
        ipaddress.ip_network(cidr, strict=False)
        return True
    except ValueError:
        return False


def validate_subnet_id(subnet_id: str) -> bool:
    """Validate AWS subnet ID format.
    
    Args:
        subnet_id: Subnet ID string
        
    Returns:
        True if valid format
    """
    # AWS subnet IDs start with "subnet-" followed by alphanumeric characters
    pattern = r"^subnet-[a-z0-9]{8,17}$"
    return bool(re.match(pattern, subnet_id, re.IGNORECASE))


def validate_domain_name(domain: str) -> bool:
    """Validate domain name format.
    
    Args:
        domain: Domain name string
        
    Returns:
        True if valid format
    """
    # Basic domain validation
    pattern = r"^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$"
    return bool(re.match(pattern, domain.lower()))


def validate_path(path: Path, must_exist: bool = True, must_be_dir: bool = False) -> tuple[bool, Optional[str]]:
    """Validate file or directory path.
    
    Args:
        path: Path to validate
        must_exist: Path must exist
        must_be_dir: Path must be a directory
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    if must_exist and not path.exists():
        return False, f"Path does not exist: {path}"
    
    if must_exist and must_be_dir and not path.is_dir():
        return False, f"Path is not a directory: {path}"
    
    if must_exist and not must_be_dir and not path.is_file():
        return False, f"Path is not a file: {path}"
    
    return True, None


def validate_instance_type(instance_type: str, provider: str) -> bool:
    """Validate instance type for provider.
    
    Args:
        instance_type: Instance type string
        provider: Provider name
        
    Returns:
        True if valid
    """
    # Basic validation - instance types are typically alphanumeric with dots/dashes
    pattern = r"^[a-z0-9][a-z0-9.-]*[a-z0-9]$"
    return bool(re.match(pattern, instance_type.lower()))


def get_my_ip() -> Optional[str]:
    """Get current public IP address.
    
    Returns:
        IP address string or None if unavailable
    """
    from pocket_architect.utils.ip_detection import detect_public_ip
    return detect_public_ip()

