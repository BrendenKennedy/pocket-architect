"""Provider registry and factory."""

from typing import Optional

from pocket_architect.providers.base import BaseProvider
from pocket_architect.providers.local.client import LocalProvider
from pocket_architect.providers.aws.client import AWSProvider
from pocket_architect.providers.coreweave.client import CoreWeaveProvider
from pocket_architect.providers.runpod.client import RunPodProvider
from pocket_architect.core.types import Provider


def get_provider(provider: Provider, session_id: str) -> BaseProvider:
    """Get provider client instance.
    
    Args:
        provider: Provider type
        session_id: Session identifier
        
    Returns:
        Provider client instance
        
    Raises:
        ValueError: If provider is not supported
    """
    if provider == Provider.LOCAL:
        return LocalProvider(session_id)
    elif provider == Provider.AWS:
        return AWSProvider(session_id)
    elif provider == Provider.COREWEAVE:
        return CoreWeaveProvider(session_id)
    elif provider == Provider.RUNPOD:
        return RunPodProvider(session_id)
    else:
        raise ValueError(f"Unsupported provider: {provider}")

