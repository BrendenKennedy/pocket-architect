"""Session management with provider client integration."""

import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from mlcloud.core.types import Provider, Session, SessionState
from mlcloud.core.state import SessionStore
from mlcloud.providers.base import BaseProvider
from mlcloud.providers import get_provider


class SessionManager:
    """Manages mlcloud sessions with provider clients."""

    def __init__(self, state_dir: Optional[Path] = None):
        """Initialize session manager.
        
        Args:
            state_dir: Directory for storing session state (default: ~/.mlcloud)
        """
        if state_dir is None:
            from mlcloud.config.settings import settings
            state_dir = settings.state_dir
        self.state_dir = state_dir
        self.store = SessionStore(state_dir)

    def create_session(
        self,
        provider: Provider,
        metadata: Optional[dict] = None,
    ) -> Session:
        """Create a new session.
        
        Args:
            provider: Cloud provider to use
            metadata: Optional metadata for the session
            
        Returns:
            Created session
        """
        session_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        
        session = Session(
            session_id=session_id,
            provider=provider,
            state=SessionState.CREATING,
            created_at=now,
            updated_at=now,
            metadata=metadata or {},
        )
        
        self.store.save(session)
        return session

    def get_session(self, session_id: str) -> Optional[Session]:
        """Get session by ID.
        
        Args:
            session_id: Session identifier
            
        Returns:
            Session if found, None otherwise
        """
        return self.store.load(session_id)

    def get_active_session(self, provider: Optional[Provider] = None) -> Optional[Session]:
        """Get the most recent active session.
        
        Args:
            provider: Optional provider filter
            
        Returns:
            Active session if found, None otherwise
        """
        sessions = self.store.list_sessions()
        
        # Filter by provider if specified
        if provider:
            sessions = [s for s in sessions if s.provider == provider]
        
        # Filter active sessions
        active_sessions = [
            s for s in sessions
            if s.state in (SessionState.CREATING, SessionState.ACTIVE)
        ]
        
        if not active_sessions:
            return None
        
        # Return most recently updated
        return max(active_sessions, key=lambda s: s.updated_at)

    def update_session(self, session: Session) -> None:
        """Update session state.
        
        Args:
            session: Session to update
        """
        session.updated_at = datetime.now(timezone.utc).isoformat()
        self.store.save(session)

    def get_provider_client(self, session: Session) -> BaseProvider:
        """Get provider client for a session.
        
        Args:
            session: Session to get client for
            
        Returns:
            Provider client instance
        """
        return get_provider(session.provider, session.session_id)
