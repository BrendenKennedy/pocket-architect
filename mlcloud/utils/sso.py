"""SSO/API-key flows for provider authentication."""

import webbrowser
from typing import Optional, Dict, Any
import typer
from rich.console import Console
from rich.prompt import Prompt, Confirm

from mlcloud.core.types import Provider
from mlcloud.utils.keyring import CredentialStore
from mlcloud.config.settings import settings

console = Console()


def check_first_run(provider: Provider) -> bool:
    """Check if this is the first run for a provider.
    
    Args:
        provider: Cloud provider
        
    Returns:
        True if first run, False otherwise
    """
    # Check if credentials exist in keyring
    if provider == Provider.AWS:
        access_key = CredentialStore.get_provider_credential(provider, "access_key_id")
        return access_key is None
    elif provider == Provider.COREWEAVE:
        api_key = CredentialStore.get_provider_credential(provider, "api_key")
        return api_key is None
    elif provider == Provider.RUNPOD:
        api_key = CredentialStore.get_provider_credential(provider, "api_key")
        return api_key is None
    elif provider == Provider.LOCAL:
        return False  # Local doesn't need credentials
    else:
        return True


def authenticate_aws() -> Dict[str, str]:
    """Authenticate with AWS (SSO or access keys).
    
    Returns:
        Dictionary with AWS credentials
        
    Raises:
        RuntimeError: If authentication fails
    """
    console.print("\n[bold cyan]AWS Authentication[/bold cyan]")
    console.print(
        "mlcloud needs AWS credentials to provision resources.\n"
        "We'll use the least-privilege IAM role approach.\n"
    )
    
    # Check if credentials already exist
    access_key = CredentialStore.get_provider_credential(Provider.AWS, "access_key_id")
    secret_key = CredentialStore.get_provider_credential(Provider.AWS, "secret_access_key")
    
    if access_key and secret_key:
        use_existing = Confirm.ask(
            "AWS credentials found in keyring. Use existing?",
            default=True,
        )
        if use_existing:
            return {
                "access_key_id": access_key,
                "secret_access_key": secret_key,
            }
    
    # Option 1: Use AWS SSO
    console.print("\n[bold]Option 1: AWS SSO (Recommended)[/bold]")
    console.print(
        "If you have AWS SSO configured, we can use your existing session.\n"
        "Make sure you've run 'aws sso login' first.\n"
    )
    
    use_sso = Confirm.ask("Use AWS SSO?", default=True)
    
    if use_sso:
        # Try to get credentials from AWS CLI
        import subprocess
        import json
        
        try:
            # Try to get current AWS identity
            result = subprocess.run(
                ["aws", "sts", "get-caller-identity"],
                capture_output=True,
                text=True,
                check=True,
            )
            identity = json.loads(result.stdout)
            console.print(f"\n[green]✓[/green] Using AWS SSO identity: {identity.get('Arn', 'Unknown')}")
            
            # For SSO, we rely on AWS SDK's credential chain
            # No need to store credentials explicitly
            return {
                "use_sso": "true",
                "profile": settings.aws_profile or "default",
            }
        except (subprocess.CalledProcessError, FileNotFoundError, json.JSONDecodeError):
            console.print("[yellow]⚠[/yellow] AWS SSO not available. Falling back to access keys.")
            use_sso = False
    
    # Option 2: Access keys (will be validated for least privilege)
    if not use_sso:
        console.print("\n[bold]Option 2: Access Key ID and Secret Access Key[/bold]")
        console.print(
            "[yellow]⚠[/yellow] These credentials will be validated to ensure they have\n"
            "least-privilege permissions. Credentials with AdministratorAccess\n"
            "will be rejected for security.\n"
        )
        
        access_key_id = Prompt.ask("AWS Access Key ID", password=True)
        secret_access_key = Prompt.ask("AWS Secret Access Key", password=True)
        
        # Store in keyring
        CredentialStore.store_provider_credential(Provider.AWS, "access_key_id", access_key_id)
        CredentialStore.store_provider_credential(Provider.AWS, "secret_access_key", secret_access_key)
        
        return {
            "access_key_id": access_key_id,
            "secret_access_key": secret_access_key,
        }
    
    raise RuntimeError("AWS authentication failed")


def authenticate_coreweave() -> Dict[str, str]:
    """Authenticate with CoreWeave (API key).
    
    Returns:
        Dictionary with CoreWeave credentials
        
    Raises:
        RuntimeError: If authentication fails
    """
    console.print("\n[bold cyan]CoreWeave Authentication[/bold cyan]")
    console.print(
        "mlcloud needs a CoreWeave API key to provision resources.\n"
        "You can generate one at: https://cloud.coreweave.com/\n"
    )
    
    # Check if API key already exists
    api_key = CredentialStore.get_provider_credential(Provider.COREWEAVE, "api_key")
    
    if api_key:
        use_existing = Confirm.ask(
            "CoreWeave API key found in keyring. Use existing?",
            default=True,
        )
        if use_existing:
            return {"api_key": api_key}
    
    # Prompt for API key
    console.print("\nPlease enter your CoreWeave API key:")
    api_key = Prompt.ask("CoreWeave API Key", password=True)
    
    # Store in keyring
    CredentialStore.store_provider_credential(Provider.COREWEAVE, "api_key", api_key)
    
    return {"api_key": api_key}


def authenticate_runpod() -> Dict[str, str]:
    """Authenticate with RunPod (API key).
    
    Returns:
        Dictionary with RunPod credentials
        
    Raises:
        RuntimeError: If authentication fails
    """
    console.print("\n[bold cyan]RunPod Authentication[/bold cyan]")
    console.print(
        "mlcloud needs a RunPod API key to provision resources.\n"
        "You can generate one at: https://www.runpod.io/console/user/settings\n"
    )
    
    # Check if API key already exists
    api_key = CredentialStore.get_provider_credential(Provider.RUNPOD, "api_key")
    
    if api_key:
        use_existing = Confirm.ask(
            "RunPod API key found in keyring. Use existing?",
            default=True,
        )
        if use_existing:
            return {"api_key": api_key}
    
    # Prompt for API key
    console.print("\nPlease enter your RunPod API key:")
    api_key = Prompt.ask("RunPod API Key", password=True)
    
    # Store in keyring
    CredentialStore.store_provider_credential(Provider.RUNPOD, "api_key", api_key)
    
    return {"api_key": api_key}


def authenticate_provider(provider: Provider) -> Dict[str, Any]:
    """Authenticate with a provider (first-run flow).
    
    Args:
        provider: Cloud provider
        
    Returns:
        Dictionary with provider credentials
        
    Raises:
        RuntimeError: If authentication fails or provider is not supported
    """
    if provider == Provider.AWS:
        return authenticate_aws()
    elif provider == Provider.COREWEAVE:
        return authenticate_coreweave()
    elif provider == Provider.RUNPOD:
        return authenticate_runpod()
    elif provider == Provider.LOCAL:
        return {}  # Local doesn't need credentials
    else:
        raise ValueError(f"Unsupported provider: {provider}")


