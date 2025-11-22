"""Blueprint loader for user templates."""

import yaml
from pathlib import Path

from pocket_architect.config import TEMPLATES_DIR, logger
from pocket_architect.models import Blueprint


def load_user_blueprint(name: str) -> Blueprint | None:
    """
    Load a user blueprint from templates directory.

    Args:
        name: Blueprint name (without .yaml extension)

    Returns:
        Blueprint if found, None otherwise
    """
    template_file = TEMPLATES_DIR / f"{name}.yaml"
    if not template_file.exists():
        return None

    try:
        with open(template_file, "r") as f:
            data = yaml.safe_load(f)

        return Blueprint(**data)
    except Exception as e:
        logger.error(f"Failed to load blueprint {name}: {e}")
        return None


def list_user_blueprints() -> list[str]:
    """
    List all user blueprint names.

    Returns:
        List of blueprint names
    """
    if not TEMPLATES_DIR.exists():
        return []

    blueprints = []
    for file in TEMPLATES_DIR.glob("*.yaml"):
        blueprints.append(file.stem)

    return sorted(blueprints)
