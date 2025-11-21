"""Error handling utilities with user-friendly messages and solution guidance."""

from typing import Optional, List
from rich.console import Console
from rich.panel import Panel
from rich.markdown import Markdown

console = Console()


class PocketArchitectError(Exception):
    """Base exception for pocket-architect with user-friendly error messages."""

    def __init__(
        self,
        message: str,
        solution: Optional[str] = None,
        docs_url: Optional[str] = None,
        hint: Optional[str] = None,
    ):
        """Initialize error.
        
        Args:
            message: Error message
            solution: Suggested solution steps
            docs_url: URL to relevant documentation
            hint: Quick hint/tip
        """
        self.message = message
        self.solution = solution
        self.docs_url = docs_url
        self.hint = hint
        super().__init__(self.message)

    def display(self) -> None:
        """Display error with formatting and solution guidance."""
        console.print(f"\n[bold red]❌ Error:[/bold red] {self.message}\n")
        
        if self.hint:
            console.print(f"[yellow]💡 Hint:[/yellow] {self.hint}\n")
        
        if self.solution:
            console.print("[bold cyan]🔧 Solution:[/bold cyan]")
            console.print(Markdown(self.solution))
            console.print()
        
        if self.docs_url:
            console.print(f"[dim]📚 Documentation:[/dim] {self.docs_url}\n")


class BlueprintError(PocketArchitectError):
    """Blueprint-related errors."""

    pass


class ValidationError(PocketArchitectError):
    """Validation errors."""

    pass


class ProviderError(PocketArchitectError):
    """Provider-specific errors."""

    pass


class ConfigurationError(PocketArchitectError):
    """Configuration errors."""

    pass


class DependencyError(PocketArchitectError):
    """Missing dependency errors."""

    pass


def handle_file_error(error: Exception, file_path: str, file_type: str = "file") -> None:
    """Handle file-related errors with helpful messages.
    
    Args:
        error: The exception that occurred
        file_path: Path to the file
        file_type: Type of file (file, blueprint, config, etc.)
    """
    if isinstance(error, FileNotFoundError):
        raise BlueprintError(
            f"{file_type.capitalize()} not found: {file_path}",
            solution=(
                f"1. Check that the file exists: `ls {file_path}`\n"
                f"2. Verify the path is correct (use absolute path if needed)\n"
                f"3. Create the {file_type} if it doesn't exist"
            ),
            hint=f"Use `pocket-architect blueprint create` to generate a new blueprint",
        )
    elif isinstance(error, PermissionError):
        raise BlueprintError(
            f"Permission denied reading {file_type}: {file_path}",
            solution=(
                f"1. Check file permissions: `ls -l {file_path}`\n"
                f"2. Ensure you have read access to the file\n"
                f"3. Try running with appropriate permissions"
            ),
        )
    else:
        raise BlueprintError(
            f"Error reading {file_type}: {error}",
            solution=(
                f"1. Verify the file is readable: `cat {file_path}`\n"
                f"2. Check file format (YAML, JSON, or .tfvars)\n"
                f"3. Validate syntax with: `pocket-architect blueprint validate {file_path}`"
            ),
        )


def handle_validation_error(
    field: str,
    value: str,
    expected_format: str,
    example: Optional[str] = None,
) -> None:
    """Handle validation errors with format guidance.
    
    Args:
        field: Field name that failed validation
        value: Invalid value provided
        expected_format: Expected format description
        example: Example of valid value
    """
    hint = f"Example: {example}" if example else None
    raise ValidationError(
        f"Invalid {field}: '{value}'",
        solution=(
            f"1. Check the {field} format: {expected_format}\n"
            f"{f'2. Use this format: {example}' if example else ''}\n"
            f"3. Verify the value matches the expected pattern"
        ),
        hint=hint,
    )


def handle_provider_error(
    provider: str,
    error: Exception,
    operation: str = "operation",
) -> None:
    """Handle provider-specific errors.
    
    Args:
        provider: Provider name
        error: The exception that occurred
        operation: Operation that failed
    """
    error_msg = str(error)
    
    # AWS-specific error handling
    if provider.lower() == "aws":
        if "credentials" in error_msg.lower() or "NoCredentialsError" in str(type(error)):
            raise ProviderError(
                f"AWS credentials not found or invalid",
                solution=(
                    "1. Configure AWS credentials:\n"
                    "   - Run: `aws configure`\n"
                    "   - Or set: AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY\n"
                    "   - Or use: `pocket-architect --provider aws` (will prompt for setup)\n"
                    "2. Verify credentials: `aws sts get-caller-identity`\n"
                    "3. Check IAM permissions for required operations"
                ),
                docs_url="https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html",
                hint="Use `pocket-architect --provider aws` to set up credentials interactively",
            )
        elif "region" in error_msg.lower():
            raise ProviderError(
                f"AWS region not configured",
                solution=(
                    "1. Set AWS region in blueprint: `aws_region: us-east-2`\n"
                    "2. Or set environment variable: `export AWS_REGION=us-east-2`\n"
                    "3. Or configure in ~/.aws/config"
                ),
                hint="Common regions: us-east-2, us-west-2, eu-west-1",
            )
        elif "subnet" in error_msg.lower() or "VPC" in error_msg.lower():
            raise ProviderError(
                f"AWS networking configuration error: {error_msg}",
                solution=(
                    "1. Verify subnet ID exists: `aws ec2 describe-subnets --subnet-ids <id>`\n"
                    "2. Check subnet is in the correct VPC and region\n"
                    "3. Ensure subnet has internet gateway (for public subnets)\n"
                    "4. Verify security group allows required traffic"
                ),
                docs_url="https://docs.aws.amazon.com/vpc/latest/userguide/what-is-amazon-vpc.html",
            )
    
    # Generic provider error
    raise ProviderError(
        f"{provider} {operation} failed: {error_msg}",
        solution=(
            f"1. Check {provider} service status\n"
            f"2. Verify credentials and permissions\n"
            f"3. Check network connectivity\n"
            f"4. Review error details above"
        ),
    )


def handle_network_error(error: Exception, operation: str = "network request") -> None:
    """Handle network-related errors.
    
    Args:
        error: The exception that occurred
        operation: Operation that failed
    """
    error_msg = str(error).lower()
    
    if "timeout" in error_msg or "timed out" in error_msg:
        raise PocketArchitectError(
            f"Network timeout during {operation}",
            solution=(
                "1. Check your internet connection\n"
                "2. Verify firewall/proxy settings\n"
                "3. Try again in a few moments\n"
                "4. Check if the service is experiencing issues"
            ),
            hint="Network timeouts are often temporary - try again",
        )
    elif "connection" in error_msg or "refused" in error_msg:
        raise PocketArchitectError(
            f"Connection failed during {operation}",
            solution=(
                "1. Verify internet connectivity: `ping 8.8.8.8`\n"
                "2. Check firewall/proxy settings\n"
                "3. Verify the service endpoint is correct\n"
                "4. Check if VPN is required"
            ),
        )
    else:
        raise PocketArchitectError(
            f"Network error during {operation}: {error}",
            solution=(
                "1. Check internet connection\n"
                "2. Verify network settings\n"
                "3. Try again later"
            ),
        )


def handle_dependency_error(
    dependency: str,
    install_command: Optional[str] = None,
    docs_url: Optional[str] = None,
) -> None:
    """Handle missing dependency errors.
    
    Args:
        dependency: Name of missing dependency
        install_command: Command to install dependency
        docs_url: Documentation URL
    """
    solution = f"Install {dependency} to continue"
    if install_command:
        solution = f"Run: `{install_command}`"
    
    raise DependencyError(
        f"Missing dependency: {dependency}",
        solution=solution,
        docs_url=docs_url,
        hint=f"Install with: {install_command or f'pip install {dependency}'}",
    )


def handle_blueprint_parse_error(
    file_path: str,
    error: Exception,
    file_format: str,
) -> None:
    """Handle blueprint parsing errors.
    
    Args:
        file_path: Path to blueprint file
        error: Parsing exception
        file_format: File format (yaml, json, tfvars)
    """
    error_msg = str(error)
    
    if file_format in ("yaml", "yml"):
        raise BlueprintError(
            f"Invalid YAML syntax in blueprint: {file_path}",
            solution=(
                f"1. Validate YAML syntax: `python -c 'import yaml; yaml.safe_load(open(\"{file_path}\"))'`\n"
                f"2. Check for:\n"
                f"   - Missing colons after keys\n"
                f"   - Incorrect indentation (use spaces, not tabs)\n"
                f"   - Unclosed quotes or brackets\n"
                f"3. Use a YAML validator online\n"
                f"4. Recreate with: `pocket-architect blueprint create`"
            ),
            hint="YAML is sensitive to indentation - use 2 spaces per level",
        )
    elif file_format == "json":
        raise BlueprintError(
            f"Invalid JSON syntax in blueprint: {file_path}",
            solution=(
                f"1. Validate JSON: `python -m json.tool {file_path}`\n"
                f"2. Check for:\n"
                f"   - Missing commas between items\n"
                f"   - Unclosed brackets or braces\n"
                f"   - Trailing commas\n"
                f"3. Use a JSON validator online\n"
                f"4. Recreate with: `pocket-architect blueprint create`"
            ),
        )
    elif file_format == "tfvars":
        raise BlueprintError(
            f"Invalid Terraform variables syntax in blueprint: {file_path}",
            solution=(
                f"1. Check Terraform variable format:\n"
                f"   - Use: `key = \"value\"` for strings\n"
                f"   - Use: `key = true` for booleans\n"
                f"   - Use: `key = 123` for numbers\n"
                f"2. Validate with: `terraform validate`\n"
                f"3. Recreate with: `pocket-architect blueprint create --format tfvars`"
            ),
        )
    else:
        raise BlueprintError(
            f"Error parsing blueprint: {error_msg}",
            solution=(
                f"1. Verify file format is correct\n"
                f"2. Check file encoding (should be UTF-8)\n"
                    f"3. Validate with: `pocket-architect blueprint validate {file_path}`"
            ),
        )


def handle_missing_required_field(
    field: str,
    context: str = "blueprint",
    example_value: Optional[str] = None,
) -> None:
    """Handle missing required field errors.
    
    Args:
        field: Missing field name
        context: Context (blueprint, config, etc.)
        example_value: Example value for the field
    """
    solution = f"Add '{field}' to your {context}"
    if example_value:
        solution = f"Add '{field}' to your {context} (example: {field}: {example_value})"
    
    raise ValidationError(
        f"Missing required field: {field}",
        solution=solution,
        hint=f"Use `pocket-architect blueprint create` to generate a complete {context}",
    )


def handle_wizard_interrupt() -> None:
    """Handle wizard interruption gracefully."""
    console.print("\n[yellow]⚠ Wizard cancelled by user[/yellow]")
    console.print("[dim]You can resume later or use CLI flags instead[/dim]\n")


def display_error_summary(errors: List[Exception]) -> None:
    """Display summary of multiple errors.
    
    Args:
        errors: List of exceptions
    """
    if not errors:
        return
    
    console.print("\n[bold red]Multiple errors occurred:[/bold red]\n")
    
    for i, error in enumerate(errors, 1):
        console.print(f"[red]{i}. {error}[/red]")
        if hasattr(error, "display"):
            error.display()
        console.print()
    
    console.print("[yellow]Please fix the errors above and try again[/yellow]\n")
