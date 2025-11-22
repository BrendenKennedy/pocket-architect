"""Resource tracking for accurate teardown."""

import json
from pathlib import Path
from typing import Any

from pocket_architect.config import PA_HOME

RESOURCES_FILE = PA_HOME / "resources.json"


def load_all_resources() -> dict[str, dict[str, Any]]:
    """
    Load all tracked resources across all projects.

    Returns:
        Dictionary mapping project_name to resources dict
    """
    if not RESOURCES_FILE.exists():
        return {}

    try:
        with open(RESOURCES_FILE, "r") as f:
            return json.load(f)
    except (json.JSONDecodeError, ValueError):
        return {}


def save_all_resources(resources_by_project: dict[str, dict[str, Any]]) -> None:
    """
    Save all tracked resources.

    Args:
        resources_by_project: Dictionary mapping project_name to resources dict
    """
    RESOURCES_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(RESOURCES_FILE, "w") as f:
        json.dump(resources_by_project, f, indent=2)


def track_project_resources(project_name: str, resources: dict[str, Any]) -> None:
    """
    Track resources for a project.

    Args:
        project_name: Project name
        resources: Resources dictionary from project state
    """
    all_resources = load_all_resources()
    all_resources[project_name] = resources
    save_all_resources(all_resources)


def get_project_resources(project_name: str) -> dict[str, Any] | None:
    """
    Get tracked resources for a project.

    Args:
        project_name: Project name

    Returns:
        Resources dictionary or None if not found
    """
    all_resources = load_all_resources()
    return all_resources.get(project_name)


def remove_project_resources(project_name: str) -> None:
    """
    Remove tracked resources for a project.

    Args:
        project_name: Project name
    """
    all_resources = load_all_resources()
    if project_name in all_resources:
        del all_resources[project_name]
        save_all_resources(all_resources)


def get_all_tracked_projects() -> list[str]:
    """
    Get list of all projects with tracked resources.

    Returns:
        List of project names
    """
    all_resources = load_all_resources()
    return list(all_resources.keys())
