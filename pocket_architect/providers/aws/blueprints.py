"""Terraform module orchestration for AWS provider."""

import shutil
from pathlib import Path
from typing import Dict, Any, Optional

from pocket_architect.backends.terraform import TerraformBackend, run_security_checks
from pocket_architect.core.state import SessionStore
from pocket_architect.config.settings import settings


class AWSBlueprint:
    """Orchestrates Terraform modules for AWS deployments."""

    def __init__(self, session_id: str):
        """Initialize AWS blueprint.
        
        Args:
            session_id: Session identifier
        """
        self.session_id = session_id
        self.store = SessionStore(settings.state_dir)
        self.session_dir = self.store.get_session_dir(session_id)
        self.terraform_dir = self.session_dir / "terraform"
        self.terraform_dir.mkdir(parents=True, exist_ok=True)

    def prepare_cvat_module(
        self,
        aws_region: str,
        subnet_id: str,
        ssh_key_name: str,
        my_ip_cidr: str,
        enable_https: bool = True,
        domain_name: Optional[str] = None,
        **kwargs: Any,
    ) -> Path:
        """Prepare CVAT Terraform module.
        
        Args:
            aws_region: AWS region
            subnet_id: Subnet ID
            ssh_key_name: SSH key pair name
            my_ip_cidr: IP address in CIDR notation
            enable_https: Enable HTTPS
            domain_name: Domain name for HTTPS
            **kwargs: Additional module options
            
        Returns:
            Path to Terraform module directory
        """
        module_dir = self.terraform_dir / "cvat"
        module_dir.mkdir(parents=True, exist_ok=True)
        
        # Copy module files
        module_source = Path(__file__).parent / "terraform" / "cvat"
        self._copy_module_files(module_source, module_dir)
        
        # Create terraform.tfvars
        tfvars = {
            "aws_region": aws_region,
            "subnet_id": subnet_id,
            "ssh_key_name": ssh_key_name,
            "my_ip_cidr": my_ip_cidr,
            "session_id": self.session_id,
            "enable_https": enable_https,
            "domain_name": domain_name or "",
            "instance_type": kwargs.get("instance_type", "t3.xlarge"),
            "use_spot": kwargs.get("use_spot", True),
            "efs_enabled": kwargs.get("efs_enabled", True),
        }
        
        self._write_tfvars(module_dir / "terraform.tfvars", tfvars)
        
        return module_dir

    def prepare_training_module(
        self,
        aws_region: str,
        subnet_id: str,
        ssh_key_name: str,
        my_ip_cidr: str,
        efs_id: Optional[str] = None,
        **kwargs: Any,
    ) -> Path:
        """Prepare training node Terraform module.
        
        Args:
            aws_region: AWS region
            subnet_id: Subnet ID
            ssh_key_name: SSH key pair name
            my_ip_cidr: IP address in CIDR notation
            efs_id: EFS file system ID
            **kwargs: Additional module options
            
        Returns:
            Path to Terraform module directory
        """
        module_dir = self.terraform_dir / "training"
        module_dir.mkdir(parents=True, exist_ok=True)
        
        # Copy module files
        module_source = Path(__file__).parent / "terraform" / "training_node"
        self._copy_module_files(module_source, module_dir)
        
        # Create terraform.tfvars
        tfvars = {
            "aws_region": aws_region,
            "subnet_id": subnet_id,
            "ssh_key_name": ssh_key_name,
            "my_ip_cidr": my_ip_cidr,
            "session_id": self.session_id,
            "instance_type": kwargs.get("instance_type", "p3.2xlarge"),
            "use_spot": kwargs.get("use_spot", True),
            "efs_id": efs_id or "",
        }
        
        self._write_tfvars(module_dir / "terraform.tfvars", tfvars)
        
        return module_dir

    def prepare_auto_annotate_module(
        self,
        aws_region: str,
        subnet_id: str,
        ssh_key_name: str,
        my_ip_cidr: str,
        efs_id: Optional[str] = None,
        **kwargs: Any,
    ) -> Path:
        """Prepare auto-annotate worker Terraform module.
        
        Args:
            aws_region: AWS region
            subnet_id: Subnet ID
            ssh_key_name: SSH key pair name
            my_ip_cidr: IP address in CIDR notation
            efs_id: EFS file system ID
            **kwargs: Additional module options
            
        Returns:
            Path to Terraform module directory
        """
        module_dir = self.terraform_dir / "auto_annotate"
        module_dir.mkdir(parents=True, exist_ok=True)
        
        # Copy module files
        module_source = Path(__file__).parent / "terraform" / "auto_annotate"
        self._copy_module_files(module_source, module_dir)
        
        # Create terraform.tfvars
        tfvars = {
            "aws_region": aws_region,
            "subnet_id": subnet_id,
            "ssh_key_name": ssh_key_name,
            "my_ip_cidr": my_ip_cidr,
            "session_id": self.session_id,
            "instance_type": kwargs.get("instance_type", "g4dn.xlarge"),
            "use_spot": kwargs.get("use_spot", True),
            "efs_id": efs_id or "",
        }
        
        self._write_tfvars(module_dir / "terraform.tfvars", tfvars)
        
        return module_dir

    def _copy_module_files(self, source: Path, dest: Path) -> None:
        """Copy Terraform module files.
        
        Args:
            source: Source directory
            dest: Destination directory
        """
        if not source.exists():
            raise FileNotFoundError(f"Module source not found: {source}")
        
        for item in source.rglob("*"):
            if item.is_file() and not item.name.startswith("."):
                rel_path = item.relative_to(source)
                dest_file = dest / rel_path
                dest_file.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(item, dest_file)

    def _write_tfvars(self, path: Path, vars: Dict[str, Any]) -> None:
        """Write Terraform variables file.
        
        Args:
            path: Path to tfvars file
            vars: Variables dictionary
        """
        lines = []
        for key, value in vars.items():
            if isinstance(value, str):
                lines.append(f'{key} = "{value}"')
            elif isinstance(value, bool):
                lines.append(f"{key} = {str(value).lower()}")
            else:
                lines.append(f"{key} = {value}")
        
        path.write_text("\n".join(lines) + "\n")

