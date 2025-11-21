"""IP address detection utilities."""

import subprocess
import requests
from typing import Optional
from rich.console import Console

console = Console()


def detect_public_ip() -> Optional[str]:
    """Detect current public IP address using multiple methods.
    
    Returns:
        IP address string or None if detection fails
    """
    methods = [
        _detect_via_curl,
        _detect_via_ipify,
        _detect_via_icanhazip,
    ]
    
    for method in methods:
        try:
            ip = method()
            if ip and _is_valid_ip(ip):
                return ip
        except Exception:
            continue
    
    return None


def _detect_via_curl() -> Optional[str]:
    """Detect IP using curl ifconfig.me."""
    try:
        result = subprocess.run(
            ["curl", "-s", "--max-time", "5", "ifconfig.me"],
            capture_output=True,
            text=True,
            timeout=5,
        )
        if result.returncode == 0:
            return result.stdout.strip()
    except Exception:
        pass
    return None


def _detect_via_ipify() -> Optional[str]:
    """Detect IP using ipify API."""
    try:
        response = requests.get("https://api.ipify.org", timeout=5)
        if response.status_code == 200:
            return response.text.strip()
    except Exception:
        pass
    return None


def _detect_via_icanhazip() -> Optional[str]:
    """Detect IP using icanhazip.com."""
    try:
        response = requests.get("https://icanhazip.com", timeout=5)
        if response.status_code == 200:
            return response.text.strip()
    except Exception:
        pass
    return None


def _is_valid_ip(ip: str) -> bool:
    """Check if string is a valid IP address.
    
    Args:
        ip: IP address string
        
    Returns:
        True if valid IP
    """
    import ipaddress
    try:
        ipaddress.ip_address(ip)
        return True
    except ValueError:
        return False

