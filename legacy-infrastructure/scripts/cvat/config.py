"""Configuration file parsing and writing for terraform.tfvars"""

import re
from pathlib import Path
from typing import Optional, Dict


def parse_tfvars(file_path: Path) -> Dict[str, str]:
    """Parse terraform.tfvars file into a dictionary.
    
    Args:
        file_path: Path to terraform.tfvars file
        
    Returns:
        Dictionary of key-value pairs
    """
    config = {}
    if not file_path.exists():
        return config
    
    with open(file_path, 'r') as f:
        for line in f:
            line = line.strip()
            # Skip comments and empty lines
            if not line or line.startswith('#'):
                continue
            
            # Match key = "value" or key = value
            match = re.match(r'^(\w+)\s*=\s*["\']?([^"\']*)["\']?', line)
            if match:
                key, value = match.groups()
                config[key] = value.strip('"\'')
    
    return config


def get_config_value(file_path: Path, key: str, default: Optional[str] = None) -> Optional[str]:
    """Get a specific value from terraform.tfvars.
    
    Args:
        file_path: Path to terraform.tfvars file
        key: Configuration key to retrieve
        default: Default value if key not found
        
    Returns:
        Configuration value or default
    """
    config = parse_tfvars(file_path)
    return config.get(key, default)


def update_config_value(file_path: Path, key: str, value: str) -> None:
    """Update a value in terraform.tfvars file.
    
    Args:
        file_path: Path to terraform.tfvars file
        key: Configuration key to update
        value: New value to set
    """
    if not file_path.exists():
        # Create new file
        with open(file_path, 'w') as f:
            f.write(f'{key} = "{value}"\n')
        return
    
    # Read file
    lines = []
    updated = False
    
    with open(file_path, 'r') as f:
        for line in f:
            # Match the key we're looking for
            if re.match(rf'^{re.escape(key)}\s*=', line):
                lines.append(f'{key} = "{value}"\n')
                updated = True
            else:
                lines.append(line)
    
    # If key wasn't found, append it
    if not updated:
        lines.append(f'{key} = "{value}"\n')
    
    # Write back
    with open(file_path, 'w') as f:
        f.writelines(lines)


def create_tfvars(
    file_path: Path,
    aws_region: str,
    my_ip_cidr: str,
    subnet_id: str,
    ssh_key_name: str,
    domain_name: Optional[str] = None,
    root_volume_snapshot_id: Optional[str] = None,
    enable_infrastructure: bool = True,
    enable_alb: bool = False,
) -> None:
    """Create a new terraform.tfvars file with all configuration.
    
    Args:
        file_path: Path where to create terraform.tfvars
        aws_region: AWS region
        my_ip_cidr: IP address in CIDR notation
        subnet_id: Subnet ID
        ssh_key_name: SSH key pair name
        domain_name: Optional domain name
        root_volume_snapshot_id: Optional snapshot ID
        enable_infrastructure: Enable infrastructure flag
        enable_alb: Enable ALB flag
    """
    content = f'''aws_region = "{aws_region}"
my_ip_cidr = "{my_ip_cidr}"

# REQUIRED: Subnet ID where the EC2 instance will be launched
# Must be a public subnet with internet gateway attached
subnet_id = "{subnet_id}"

# REQUIRED: SSH Key Pair name for EC2 instance access
ssh_key_name = "{ssh_key_name}"

# Elastic IP is automatically created by Terraform for SSH access
# No configuration needed - it will be created/reused automatically

# Optional: Domain name for Route 53 DNS and ACM certificate
# Leave empty to disable DNS/SSL setup (no domain needed)
'''
    
    if domain_name:
        content += f'domain_name = "{domain_name}"\n'
    else:
        content += '# domain_name = ""\n'
    
    content += '''
# Optional: Restore from a snapshot checkpoint
# Leave empty or omit to create a fresh instance
'''
    
    if root_volume_snapshot_id:
        content += f'root_volume_snapshot_id = "{root_volume_snapshot_id}"\n'
    else:
        content += '# root_volume_snapshot_id = ""\n'
    
    content += f'''
# Infrastructure Control
# Set to false to stop EC2 instances and destroy ALB (saves compute costs)
# EC2 instances will be stopped (not terminated) - data preserved
# Run ./scripts/down.sh to stop, ./scripts/up.sh to start
enable_infrastructure = {str(enable_infrastructure).lower()}

# ALB Control
# Set to true to enable ALB with HTTPS (~$16-22/month when infrastructure is running)
# Requires domain_name to be set. Set to false to disable ALB (HTTP only, saves money)
# Only applies when enable_infrastructure = true
enable_alb = {str(enable_alb).lower()}
'''
    
    with open(file_path, 'w') as f:
        f.write(content)

