"""
Database session management for SQLite.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from contextlib import contextmanager
from typing import Generator

from pocket_architect.db.models import Base
from pocket_architect.core.config import get_config
from pocket_architect.utils.logger import setup_logger

logger = setup_logger(__name__)

# Global engine and session maker
_engine = None
_SessionLocal = None


def init_db(force: bool = False):
    """
    Initialize database and create all tables.

    Args:
        force: If True, drop all tables and recreate
    """
    global _engine, _SessionLocal

    config = get_config()
    database_url = config.get_database_url()

    logger.info(f"Initializing database at: {config.get_database_path()}")

    # Create engine
    _engine = create_engine(
        database_url,
        connect_args={"check_same_thread": False},  # Needed for SQLite
        echo=config.is_debug_mode()  # SQL logging in debug mode
    )

    # Create session maker
    _SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=_engine)

    # Create tables
    if force:
        logger.warning("Dropping all tables (force=True)")
        Base.metadata.drop_all(bind=_engine)

    Base.metadata.create_all(bind=_engine)
    logger.info("Database tables created successfully")


def get_engine():
    """Get SQLAlchemy engine."""
    global _engine
    if _engine is None:
        init_db()
    return _engine


def get_session_maker():
    """Get session maker."""
    global _SessionLocal
    if _SessionLocal is None:
        init_db()
    return _SessionLocal


def get_db() -> Session:
    """
    Get database session.

    Returns:
        SQLAlchemy Session

    Usage:
        db = get_db()
        try:
            # Use db
            db.add(item)
            db.commit()
        finally:
            db.close()
    """
    SessionLocal = get_session_maker()
    return SessionLocal()


@contextmanager
def get_db_context() -> Generator[Session, None, None]:
    """
    Get database session as context manager.

    Usage:
        with get_db_context() as db:
            db.add(item)
            db.commit()
    """
    db = get_db()
    try:
        yield db
    finally:
        db.close()


def reset_db():
    """Reset database (drop all tables and recreate). USE WITH CAUTION!"""
    logger.warning("Resetting database...")
    init_db(force=True)
    logger.info("Database reset complete")
