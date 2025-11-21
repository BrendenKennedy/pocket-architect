"""Blueprint system for infrastructure configuration."""

import json
import yaml
from pathlib import Path
from typing import Dict, Any, Optional, List
from enum import Enum
from rich.console import Console
from rich.prompt import Prompt, Confirm
from rich.panel import Panel

from mlcloud.utils.validation import (
    validate_cidr,
    validate_subnet_id,
    validate_domain_name,
    get_my_ip,
)
from mlcloud.utils.ip_detection import detect_public_ip
from mlcloud.utils.errors import (
    BlueprintError,
    ValidationError,
    handle_file_error,
    handle_blueprint_parse_error,
    handle_validation_error,
    handle_missing_required_field,
)

console = Console()


class BlueprintSource(str, Enum):
    """Blueprint source type."""

    FLAGS = "flags"  # From CLI flags
    FILE = "file"  # From Terraform/YAML file
    WIZARD = "wizard"  # From interactive wizard


class Blueprint:
    """Infrastructure blueprint configuration."""

    def __init__(
        self,
        source: BlueprintSource,
        data: Dict[str, Any],
        source_file: Optional[Path] = None,
    ):
        """Initialize blueprint.
        
        Args:
            source: Source of blueprint configuration
            data: Blueprint data dictionary
            source_file: Source file path (if from file)
        """
        self.source = source
        self.data = data
        self.source_file = source_file

    @classmethod
    def from_flags(cls, flags: Dict[str, Any]) -> "Blueprint":
        """Create blueprint from CLI flags.
        
        Args:
            flags: Dictionary of CLI flag values
            
        Returns:
            Blueprint instance
        """
        return cls(BlueprintSource.FLAGS, flags)

    @classmethod
    def from_file(cls, file_path: Path) -> "Blueprint":
        """Load blueprint from file (Terraform .tfvars or YAML).
        
        Args:
            file_path: Path to blueprint file
            
        Returns:
            Blueprint instance
            
        Raises:
            BlueprintError: If file cannot be loaded or parsed
        """
        # Convert to Path if string
        if isinstance(file_path, str):
            file_path = Path(file_path)
        
        # Check file exists
        if not file_path.exists():
            handle_file_error(FileNotFoundError(), str(file_path), "blueprint file")
        
        # Check file is readable
        if not file_path.is_file():
            raise BlueprintError(
                f"Path is not a file: {file_path}",
                solution=(
                    f"1. Verify the path points to a file, not a directory\n"
                    f"2. Check: `ls -l {file_path}`\n"
                    f"3. Use absolute path if needed"
                ),
            )
        
        suffix = file_path.suffix.lower()
        
        # Parse based on file format
        try:
            if suffix in (".yaml", ".yml"):
                try:
                    with open(file_path, "r", encoding="utf-8") as f:
                        data = yaml.safe_load(f)
                except yaml.YAMLError as e:
                    handle_blueprint_parse_error(str(file_path), e, "yaml")
                except UnicodeDecodeError as e:
                    raise BlueprintError(
                        f"File encoding error: {file_path}",
                        solution=(
                            f"1. Ensure file is UTF-8 encoded\n"
                            f"2. Convert encoding: `iconv -f <old-encoding> -t UTF-8 {file_path} > {file_path}.utf8`\n"
                            f"3. Recreate with: `mlcloud blueprint create`"
                        ),
                    )
            elif suffix == ".json":
                try:
                    with open(file_path, "r", encoding="utf-8") as f:
                        data = json.load(f)
                except json.JSONDecodeError as e:
                    handle_blueprint_parse_error(str(file_path), e, "json")
            elif suffix == ".tfvars":
                try:
                    data = cls._parse_tfvars(file_path)
                except Exception as e:
                    handle_blueprint_parse_error(str(file_path), e, "tfvars")
            else:
                raise BlueprintError(
                    f"Unsupported blueprint file format: {suffix}",
                    solution=(
                        f"1. Supported formats: .yaml, .yml, .json, .tfvars\n"
                        f"2. Rename file to use supported extension\n"
                        f"3. Or create new blueprint: `mlcloud blueprint create`"
                    ),
                    hint=f"Current file: {file_path}",
                )
        except PermissionError as e:
            handle_file_error(e, str(file_path), "blueprint file")
        except Exception as e:
            if isinstance(e, BlueprintError):
                raise
            handle_file_error(e, str(file_path), "blueprint file")
        
        # Validate data is not None/empty
        if data is None:
            raise BlueprintError(
                f"Blueprint file is empty: {file_path}",
                solution=(
                    f"1. Add configuration to the file\n"
                    f"2. Or recreate with: `mlcloud blueprint create`\n"
                    f"3. See examples in: examples/blueprint-*.yaml"
                ),
            )
        
        if not isinstance(data, dict):
            raise BlueprintError(
                f"Blueprint file must contain a dictionary/object, got: {type(data).__name__}",
                solution=(
                    f"1. Ensure file contains key-value pairs\n"
                    f"2. For YAML: use `key: value` format\n"
                    f"3. For JSON: use `{{\"key\": \"value\"}}` format\n"
                    f"4. See examples in: examples/blueprint-*.yaml"
                ),
            )
        
        return cls(BlueprintSource.FILE, data, source_file=file_path)

    @classmethod
    def from_wizard(cls, provider: str, blueprint_type: str = "cvat") -> "Blueprint":
        """Create blueprint via interactive wizard.
        
        Args:
            provider: Cloud provider name
            blueprint_type: Type of blueprint (cvat, training, auto_annotate)
            
        Returns:
            Blueprint instance
        """
        console.print(f"\n[bold cyan]📋 Interactive Blueprint Wizard[/bold cyan]")
        console.print(f"Provider: [green]{provider}[/green] | Type: [green]{blueprint_type}[/green]\n")
        
        data = {}
        
        if provider == "aws":
            data = cls._wizard_aws(blueprint_type)
        elif provider == "local":
            data = cls._wizard_local(blueprint_type)
        elif provider == "coreweave":
            data = cls._wizard_coreweave(blueprint_type)
        elif provider == "runpod":
            data = cls._wizard_runpod(blueprint_type)
        else:
            raise ValueError(f"Unsupported provider for wizard: {provider}")
        
        return cls(BlueprintSource.WIZARD, data)

    @staticmethod
    def _wizard_aws(blueprint_type: str) -> Dict[str, Any]:
        """AWS-specific wizard.
        
        Args:
            blueprint_type: Type of blueprint
            
        Returns:
            Configuration dictionary
        """
        data = {}
        
        # Common AWS questions
        console.print("[bold]AWS Configuration[/bold]")
        
        # Region
        region = Prompt.ask(
            "AWS Region",
            default="us-east-2",
        )
        data["aws_region"] = region
        
        # Subnet ID
        subnet_id = Prompt.ask(
            "Subnet ID (required)",
            default="",
        )
        if not subnet_id:
            console.print("[yellow]⚠ Subnet ID is required. You can find it in AWS Console → VPC → Subnets[/yellow]")
            subnet_id = Prompt.ask("Subnet ID", default="")
            if not subnet_id:
                raise ValidationError(
                    "Subnet ID is required for AWS deployments",
                    solution=(
                        "1. Find your subnet ID:\n"
                        "   - AWS Console → VPC → Subnets\n"
                        "   - Or run: `aws ec2 describe-subnets --query 'Subnets[*].[SubnetId,Tags[?Key==`Name`].Value|[0]]' --output table`\n"
                        "2. Use format: subnet-xxxxxxxxxxxxxxxxx\n"
                        "3. Ensure subnet is in the same region as your deployment"
                    ),
                    hint="Subnet IDs start with 'subnet-' followed by alphanumeric characters",
                )
        if not validate_subnet_id(subnet_id):
            handle_validation_error(
                "subnet_id",
                subnet_id,
                "subnet-xxxxxxxxxxxxxxxxx (alphanumeric, 8-17 chars after 'subnet-')",
                "subnet-0123456789abcdef0",
            )
        data["subnet_id"] = subnet_id
        
        # SSH Key
        ssh_key_name = Prompt.ask(
            "SSH Key Pair Name",
            default="",
        )
        if not ssh_key_name:
            console.print("[yellow]⚠ SSH Key Pair is required. Create one in AWS Console → EC2 → Key Pairs[/yellow]")
            ssh_key_name = Prompt.ask("SSH Key Pair Name", default="")
        data["ssh_key_name"] = ssh_key_name
        
        # IP Address
        console.print("\n[bold]Network Access[/bold]")
        my_ip = detect_public_ip()
        if my_ip:
            console.print(f"[green]✓[/green] Detected your IP: {my_ip}")
            use_detected = Confirm.ask("Use detected IP?", default=True)
            if use_detected:
                my_ip_cidr = f"{my_ip}/32"
            else:
                my_ip_cidr = Prompt.ask(
                    "Your IP address in CIDR notation (e.g., 1.2.3.4/32)",
                    default=f"{my_ip}/32",
                )
        else:
            my_ip_cidr = Prompt.ask(
                "Your IP address in CIDR notation (e.g., 1.2.3.4/32)",
                default="",
            )
        
        if not validate_cidr(my_ip_cidr):
            handle_validation_error(
                "IP address (CIDR)",
                my_ip_cidr,
                "X.X.X.X/32 format (IP address followed by /32)",
                f"{my_ip}/32" if my_ip else "1.2.3.4/32",
            )
        data["my_ip_cidr"] = my_ip_cidr
        
        # HTTPS/Domain
        if blueprint_type == "cvat":
            console.print("\n[bold]HTTPS Configuration[/bold]")
            enable_https = Confirm.ask("Enable HTTPS?", default=True)
            data["enable_https"] = enable_https
            
            if enable_https:
                domain_name = Prompt.ask(
                    "Domain name for HTTPS (e.g., example.com)",
                    default="",
                )
                if domain_name and not validate_domain_name(domain_name):
                    console.print("[yellow]⚠ Domain name format may be invalid[/yellow]")
                    console.print("[dim]Continuing anyway, but HTTPS setup may fail if domain is invalid[/dim]")
                data["domain_name"] = domain_name
            else:
                data["domain_name"] = ""
        
        # Instance type
        console.print("\n[bold]Instance Configuration[/bold]")
        if blueprint_type == "cvat":
            instance_type = Prompt.ask(
                "EC2 Instance Type",
                default="t3.xlarge",
            )
        elif blueprint_type == "training":
            instance_type = Prompt.ask(
                "EC2 Instance Type (GPU recommended)",
                default="p3.2xlarge",
            )
        elif blueprint_type == "auto_annotate":
            instance_type = Prompt.ask(
                "EC2 Instance Type (GPU recommended)",
                default="g4dn.xlarge",
            )
        else:
            instance_type = Prompt.ask("EC2 Instance Type", default="t3.xlarge")
        
        data["instance_type"] = instance_type
        
        # Spot instances
        use_spot = Confirm.ask("Use EC2 Spot instances? (saves ~70% cost)", default=True)
        data["use_spot"] = use_spot
        
        # EFS
        if blueprint_type == "cvat":
            enable_efs = Confirm.ask("Enable EFS for persistent storage?", default=True)
            data["efs_enabled"] = enable_efs
        
        # Summary
        console.print("\n[bold green]✓ Blueprint Configuration Complete[/bold green]")
        summary = Panel(
            f"Region: {region}\n"
            f"Subnet: {subnet_id}\n"
            f"SSH Key: {ssh_key_name}\n"
            f"IP: {my_ip_cidr}\n"
            f"Instance: {instance_type}\n"
            f"Spot: {use_spot}",
            title="Configuration Summary",
            border_style="cyan",
        )
        console.print(summary)
        
        if not Confirm.ask("\nProceed with this configuration?", default=True):
            from mlcloud.utils.errors import handle_wizard_interrupt
            handle_wizard_interrupt()
            import sys
            sys.exit(0)
        
        return data

    @staticmethod
    def _wizard_local(blueprint_type: str) -> Dict[str, Any]:
        """Local provider wizard.
        
        Args:
            blueprint_type: Type of blueprint
            
        Returns:
            Configuration dictionary
        """
        data = {}
        
        console.print("[bold]Local Configuration[/bold]")
        
        # CVAT image
        if blueprint_type == "cvat":
            cvat_image = Prompt.ask(
                "CVAT Docker image",
                default="cvat/server:latest",
            )
            data["cvat_image"] = cvat_image
            
            cvat_port = Prompt.ask(
                "CVAT port",
                default="8080",
            )
            try:
                data["cvat_port"] = int(cvat_port)
            except ValueError:
                data["cvat_port"] = 8080
        
        # HTTPS (not applicable for local, but ask anyway)
        enable_https = Confirm.ask("Enable HTTPS? (requires reverse proxy)", default=False)
        data["https"] = enable_https
        
        return data

    @staticmethod
    def _wizard_coreweave(blueprint_type: str) -> Dict[str, Any]:
        """CoreWeave provider wizard.
        
        Args:
            blueprint_type: Type of blueprint
            
        Returns:
            Configuration dictionary
        """
        data = {}
        
        console.print("[bold]CoreWeave Configuration[/bold]")
        
        namespace = Prompt.ask(
            "Kubernetes namespace",
            default="mlcloud",
        )
        data["namespace"] = namespace
        
        if blueprint_type in ("training", "auto_annotate"):
            instance_type = Prompt.ask(
                "GPU instance type (e.g., RTX3090, RTX4090, A100)",
                default="RTX3090",
            )
            data["instance_type"] = instance_type
        
        return data

    @staticmethod
    def _wizard_runpod(blueprint_type: str) -> Dict[str, Any]:
        """RunPod provider wizard.
        
        Args:
            blueprint_type: Type of blueprint
            
        Returns:
            Configuration dictionary
        """
        data = {}
        
        console.print("[bold]RunPod Configuration[/bold]")
        
        if blueprint_type in ("training", "auto_annotate"):
            instance_type = Prompt.ask(
                "GPU instance type (e.g., RTX 3090, RTX 4090, A100 40GB)",
                default="RTX 3090",
            )
            data["instance_type"] = instance_type
        
        secure_cloud = Confirm.ask("Use Secure Cloud? (required)", default=True)
        data["secure_cloud"] = secure_cloud
        
        return data

    @staticmethod
    def _parse_tfvars(file_path: Path) -> Dict[str, Any]:
        """Parse Terraform .tfvars file.
        
        Args:
            file_path: Path to .tfvars file
            
        Returns:
            Parsed variables dictionary
            
        Raises:
            BlueprintError: If parsing fails
        """
        import re
        
        data = {}
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                for line_num, line in enumerate(f, 1):
                    line = line.strip()
                    # Skip comments and empty lines
                    if not line or line.startswith("#"):
                        continue
                    
                    # Match key = "value" or key = value
                    match = re.match(r'^(\w+)\s*=\s*["\']?([^"\']*)["\']?', line)
                    if match:
                        key, value = match.groups()
                        value = value.strip('"\'')
                        
                        # Convert boolean strings
                        if value.lower() == "true":
                            value = True
                        elif value.lower() == "false":
                            value = False
                        # Try to convert numbers
                        elif value.isdigit():
                            value = int(value)
                        elif "." in value and value.replace(".", "").isdigit():
                            value = float(value)
                        
                        data[key] = value
                    else:
                        # Warn about unparseable lines but continue
                        if line and not line.startswith("#"):
                            console.print(f"[yellow]⚠ Warning: Could not parse line {line_num}: {line}[/yellow]")
        except UnicodeDecodeError:
            raise BlueprintError(
                f"File encoding error: {file_path}",
                solution=(
                    f"1. Ensure file is UTF-8 encoded\n"
                    f"2. Convert encoding if needed\n"
                    f"3. Recreate with: `mlcloud blueprint create --format tfvars`"
                ),
            )
        
        return data

    def get(self, key: str, default: Any = None) -> Any:
        """Get value from blueprint.
        
        Args:
            key: Configuration key
            default: Default value if not found
            
        Returns:
            Configuration value
        """
        return self.data.get(key, default)

    def merge(self, other: Dict[str, Any]) -> "Blueprint":
        """Merge another dictionary into this blueprint.
        
        Args:
            other: Dictionary to merge
            
        Returns:
            New blueprint with merged data
        """
        merged_data = {**self.data, **other}
        return Blueprint(self.source, merged_data, self.source_file)

    def save(self, file_path: Path, format: str = "yaml") -> None:
        """Save blueprint to file.
        
        Args:
            file_path: Path to save blueprint
            format: File format (yaml, json, tfvars)
            
        Raises:
            BlueprintError: If save fails
        """
        # Convert to Path if string
        if isinstance(file_path, str):
            file_path = Path(file_path)
        
        # Ensure parent directory exists
        try:
            file_path.parent.mkdir(parents=True, exist_ok=True)
        except PermissionError:
            raise BlueprintError(
                f"Permission denied creating directory: {file_path.parent}",
                solution=(
                    f"1. Check directory permissions: `ls -ld {file_path.parent}`\n"
                    f"2. Use a different output path\n"
                    f"3. Run with appropriate permissions"
                ),
            )
        
        try:
            if format == "yaml":
                with open(file_path, "w", encoding="utf-8") as f:
                    yaml.dump(self.data, f, default_flow_style=False, sort_keys=False)
            elif format == "json":
                with open(file_path, "w", encoding="utf-8") as f:
                    json.dump(self.data, f, indent=2, ensure_ascii=False)
            elif format == "tfvars":
                with open(file_path, "w", encoding="utf-8") as f:
                    for key, value in self.data.items():
                        if isinstance(value, str):
                            f.write(f'{key} = "{value}"\n')
                        elif isinstance(value, bool):
                            f.write(f"{key} = {str(value).lower()}\n")
                        else:
                            f.write(f"{key} = {value}\n")
            else:
                raise BlueprintError(
                    f"Unsupported format: {format}",
                    solution=(
                        f"1. Use one of: yaml, json, tfvars\n"
                        f"2. Default format is yaml"
                    ),
                )
        except PermissionError:
            raise BlueprintError(
                f"Permission denied writing file: {file_path}",
                solution=(
                    f"1. Check file permissions: `ls -l {file_path}`\n"
                    f"2. Ensure directory is writable\n"
                    f"3. Use a different output path"
                ),
            )
        except OSError as e:
            raise BlueprintError(
                f"Failed to save blueprint: {e}",
                solution=(
                    f"1. Check disk space: `df -h`\n"
                    f"2. Verify path is valid\n"
                    f"3. Try a different output path"
                ),
            )

