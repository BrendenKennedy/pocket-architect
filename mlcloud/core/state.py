"""Session state persistence in ~/.mlcloud/sessions/."""

import json
from pathlib import Path
from typing import List, Optional

from mlcloud.core.types import Session


class SessionStore:
    """Stores and retrieves session state from disk."""

    def __init__(self, base_dir: Path):
        """Initialize session store.
        
        Args:
            base_dir: Base directory for mlcloud state (~/.mlcloud)
        """
        self.base_dir = base_dir
        self.sessions_dir = base_dir / "sessions"
        self.sessions_dir.mkdir(parents=True, exist_ok=True)

    def save(self, session: Session) -> None:
        """Save session to disk.
        
        Args:
            session: Session to save
        """
        session_file = self.sessions_dir / f"{session.session_id}.json"
        session_file.write_text(session.model_dump_json(indent=2))

    def load(self, session_id: str) -> Optional[Session]:
        """Load session from disk.
        
        Args:
            session_id: Session identifier
            
        Returns:
            Session if found, None otherwise
        """
        session_file = self.sessions_dir / f"{session_id}.json"
        if not session_file.exists():
            return None
        
        try:
            data = json.loads(session_file.read_text())
            return Session(**data)
        except Exception:
            return None

    def list_sessions(self) -> List[Session]:
        """List all saved sessions.
        
        Returns:
            List of all sessions
        """
        sessions = []
        if not self.sessions_dir.exists():
            return sessions
        
        for session_file in self.sessions_dir.glob("*.json"):
            try:
                session = self.load(session_file.stem)
                if session:
                    sessions.append(session)
            except Exception:
                continue
        
        return sessions

    def delete(self, session_id: str) -> bool:
        """Delete session from disk.
        
        Args:
            session_id: Session identifier
            
        Returns:
            True if deleted, False if not found
        """
        session_file = self.sessions_dir / f"{session_id}.json"
        if session_file.exists():
            session_file.unlink()
            return True
        return False

    def get_session_dir(self, session_id: str) -> Path:
        """Get session-specific directory.
        
        Args:
            session_id: Session identifier
            
        Returns:
            Path to session directory
        """
        session_dir = self.sessions_dir / session_id
        session_dir.mkdir(parents=True, exist_ok=True)
        return session_dir

