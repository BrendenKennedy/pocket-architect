"""Project state management."""

import json
from pathlib import Path

from pocket_architect.config import PROJECTS_DIR
from pocket_architect.models import ProjectState


def get_project_dir(project_name: str) -> Path:
    """Get the directory path for a project."""
    return PROJECTS_DIR / project_name


def get_state_file(project_name: str) -> Path:
    """Get the state.json file path for a project."""
    return get_project_dir(project_name) / "state.json"


def load_project_state(project_name: str) -> ProjectState | None:
    """
    Load project state from disk.

    Args:
        project_name: Name of the project

    Returns:
        ProjectState if found, None otherwise
    """
    state_file = get_state_file(project_name)
    if not state_file.exists():
        return None

    try:
        with open(state_file, "r") as f:
            data = json.load(f)
        # Handle datetime deserialization
        if isinstance(data.get("created_at"), str):
            from datetime import datetime

            data["created_at"] = datetime.fromisoformat(data["created_at"])
        return ProjectState(**data)
    except (json.JSONDecodeError, ValueError) as e:
        raise ValueError(f"Failed to load project state for {project_name}: {e}")


def save_project_state(state: ProjectState) -> None:
    """
    Save project state to disk.

    Args:
        state: ProjectState to save
    """
    project_dir = get_project_dir(state.project_name)
    project_dir.mkdir(parents=True, exist_ok=True)

    state_file = get_state_file(state.project_name)
    with open(state_file, "w") as f:
        # Convert datetime to ISO string for JSON
        data = state.model_dump()
        if isinstance(data.get("created_at"), str):
            pass  # Already string
        else:
            data["created_at"] = data["created_at"].isoformat()
        json.dump(data, f, indent=2)


def list_projects() -> list[str]:
    """
    List all project names.

    Returns:
        List of project names
    """
    if not PROJECTS_DIR.exists():
        return []

    projects = []
    for item in PROJECTS_DIR.iterdir():
        if item.is_dir() and (item / "state.json").exists():
            projects.append(item.name)

    return sorted(projects)


def delete_project_state(project_name: str) -> None:
    """
    Delete project state and directory.

    Args:
        project_name: Name of the project to delete
    """
    project_dir = get_project_dir(project_name)
    if project_dir.exists():
        import shutil

        shutil.rmtree(project_dir)
