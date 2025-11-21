"""Input validation and sanitization for security"""

import re
import ipaddress
from typing import Optional
from pathlib import Path
from .credentials import SecurityError


class InputValidator:
    """Secure input validation to prevent injection attacks."""
    
    # AWS resource ID patterns (official format)
    SUBNET_ID_PATTERN = re.compile(r'^subnet-[0-9a-f]{17}$')
    VPC_ID_PATTERN = re.compile(r'^vpc-[0-9a-f]{17}$')
    SNAPSHOT_ID_PATTERN = re.compile(r'^snap-[0-9a-f]{17}$')
    AMI_ID_PATTERN = re.compile(r'^ami-[0-9a-f]{17}$')
    INSTANCE_ID_PATTERN = re.compile(r'^i-[0-9a-f]{17}$')
    EIP_ALLOCATION_ID_PATTERN = re.compile(r'^eipalloc-[0-9a-f]{17}$')
    SECURITY_GROUP_ID_PATTERN = re.compile(r'^sg-[0-9a-f]{17}$')
    
    # EC2 Key Pair name: 1-255 alphanumeric, dash, underscore
    KEY_PAIR_NAME_PATTERN = re.compile(r'^[a-zA-Z0-9\-_]{1,255}$')
    
    # Domain name: RFC 1035 compliant
    DOMAIN_NAME_PATTERN = re.compile(
        r'^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$'
    )
    
    # AWS region: us-east-1, eu-west-1, etc.
    AWS_REGION_PATTERN = re.compile(r'^[a-z]{2}-[a-z]+-\d+$')
    
    @classmethod
    def validate_subnet_id(cls, subnet_id: str) -> bool:
        """Validate subnet ID format.
        
        Args:
            subnet_id: Subnet ID to validate
            
        Returns:
            True if valid format
        """
        if not subnet_id or not isinstance(subnet_id, str):
            return False
        return bool(cls.SUBNET_ID_PATTERN.match(subnet_id))
    
    @classmethod
    def validate_vpc_id(cls, vpc_id: str) -> bool:
        """Validate VPC ID format."""
        if not vpc_id or not isinstance(vpc_id, str):
            return False
        return bool(cls.VPC_ID_PATTERN.match(vpc_id))
    
    @classmethod
    def validate_snapshot_id(cls, snapshot_id: str) -> bool:
        """Validate snapshot ID format."""
        if not snapshot_id or not isinstance(snapshot_id, str):
            return False
        return bool(cls.SNAPSHOT_ID_PATTERN.match(snapshot_id))
    
    @classmethod
    def validate_cidr(cls, cidr: str) -> bool:
        """Validate CIDR notation.
        
        Args:
            cidr: CIDR notation (e.g., "192.168.1.0/24")
            
        Returns:
            True if valid CIDR
        """
        if not cidr or not isinstance(cidr, str):
            return False
        try:
            network = ipaddress.ip_network(cidr, strict=False)
            # Ensure it's IPv4 (IPv6 not supported in this tool)
            return network.version == 4
        except ValueError:
            return False
    
    @classmethod
    def validate_cidr_is_host(cls, cidr: str) -> bool:
        """Validate CIDR is a single host (/32).
        
        Args:
            cidr: CIDR notation
            
        Returns:
            True if /32 (single host)
        """
        if not cls.validate_cidr(cidr):
            return False
        try:
            network = ipaddress.ip_network(cidr, strict=False)
            return network.prefixlen == 32
        except ValueError:
            return False
    
    @classmethod
    def validate_domain_name(cls, domain: str) -> bool:
        """Validate domain name format.
        
        Args:
            domain: Domain name to validate
            
        Returns:
            True if valid format
        """
        if not domain or not isinstance(domain, str):
            return False
        if len(domain) > 253:  # RFC 1035 max length
            return False
        return bool(cls.DOMAIN_NAME_PATTERN.match(domain))
    
    @classmethod
    def validate_key_pair_name(cls, name: str) -> bool:
        """Validate EC2 key pair name.
        
        Args:
            name: Key pair name to validate
            
        Returns:
            True if valid format
        """
        if not name or not isinstance(name, str):
            return False
        if len(name) > 255:
            return False
        return bool(cls.KEY_PAIR_NAME_PATTERN.match(name))
    
    @classmethod
    def validate_aws_region(cls, region: str) -> bool:
        """Validate AWS region format.
        
        Args:
            region: AWS region (e.g., "us-east-1")
            
        Returns:
            True if valid format
        """
        if not region or not isinstance(region, str):
            return False
        return bool(cls.AWS_REGION_PATTERN.match(region))
    
    @classmethod
    def sanitize_path(cls, path: str, base_dir: Optional[Path] = None) -> Path:
        """Sanitize file path to prevent directory traversal attacks.
        
        Args:
            path: File path to sanitize
            base_dir: Base directory to restrict paths to
            
        Returns:
            Resolved Path object
            
        Raises:
            SecurityError: If path is outside base_dir
        """
        try:
            resolved = Path(path).resolve()
            
            if base_dir:
                base_resolved = Path(base_dir).resolve()
                # Check if resolved path is within base directory
                try:
                    resolved.relative_to(base_resolved)
                except ValueError:
                    raise SecurityError(
                        f"Security violation: Path outside base directory.\n"
                        f"Path: {path}\n"
                        f"Resolved: {resolved}\n"
                        f"Base: {base_resolved}"
                    )
            
            return resolved
        except (OSError, ValueError) as e:
            raise SecurityError(f"Invalid path: {path} - {e}")
    
    @classmethod
    def sanitize_shell_argument(cls, arg: str) -> str:
        """Sanitize shell argument to prevent command injection.
        
        Args:
            arg: Argument to sanitize
            
        Returns:
            Sanitized argument (quoted if needed)
        """
        import shlex
        if not isinstance(arg, str):
            arg = str(arg)
        # Use shlex.quote to properly escape shell arguments
        return shlex.quote(arg)
    
    @classmethod
    def validate_ip_address(cls, ip: str) -> bool:
        """Validate IP address format.
        
        Args:
            ip: IP address to validate
            
        Returns:
            True if valid IPv4 address
        """
        if not ip or not isinstance(ip, str):
            return False
        try:
            ipaddress.ip_address(ip)
            return True
        except ValueError:
            return False

