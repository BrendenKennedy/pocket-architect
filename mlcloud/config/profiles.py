"""Provider profile management."""

from pathlib import Path
from typing import Dict, Optional
import json

from mlcloud.config.settings import settings


class ProfileManager:
    """Manages provider profiles/credentials."""

    def __init__(self):
        """Initialize profile manager."""
        self.profiles_dir = settings.home_dir / "profiles"
        self.profiles_dir.mkdir(parents=True, exist_ok=True)

    def get_profile_path(self, provider: str) -> Path:
        """Get path to profile file.
        
        Args:
            provider: Provider name
            
        Returns:
            Path to profile file
        """
        return self.profiles_dir / f"{provider}.json"

    def save_profile(self, provider: str, profile_data: Dict) -> None:
        """Save provider profile.
        
        Args:
            provider: Provider name
            profile_data: Profile data (credentials are stored in keyring, not here)
        """
        profile_file = self.get_profile_path(provider)
        # Remove sensitive data - it should be in keyring
        safe_data = {k: v for k, v in profile_data.items() if not k.endswith("_key") and not k.endswith("_secret")}
        profile_file.write_text(json.dumps(safe_data, indent=2))

    def load_profile(self, provider: str) -> Optional[Dict]:
        """Load provider profile.
        
        Args:
            provider: Provider name
            
        Returns:
            Profile data if found, None otherwise
        """
        profile_file = self.get_profile_path(provider)
        if not profile_file.exists():
            return None
        
        try:
            return json.loads(profile_file.read_text())
        except Exception:
            return None

