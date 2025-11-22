"""Cost tracking and limit management."""

import json
from datetime import datetime, timezone

from pocket_architect.config import PA_HOME
from pocket_architect.models import CostEstimate, CostLimit

COST_LIMITS_FILE = PA_HOME / "cost_limits.json"
COST_HISTORY_FILE = PA_HOME / "cost_history.json"
GLOBAL_LIMIT_FILE = PA_HOME / "global_cost_limit.json"


def load_cost_limits() -> dict[str, CostLimit]:
    """
    Load all cost limits.

    Returns:
        Dictionary mapping project_name to CostLimit
    """
    if not COST_LIMITS_FILE.exists():
        return {}

    try:
        with open(COST_LIMITS_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        return {project_name: CostLimit(**limit_data) for project_name, limit_data in data.items()}
    except (json.JSONDecodeError, ValueError, KeyError):
        return {}


def save_cost_limits(limits: dict[str, CostLimit]) -> None:
    """
    Save all cost limits.

    Args:
        limits: Dictionary mapping project_name to CostLimit
    """
    COST_LIMITS_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(COST_LIMITS_FILE, "w", encoding="utf-8") as f:
        data = {
            project_name: limit.model_dump(mode="json") for project_name, limit in limits.items()
        }
        json.dump(data, f, indent=2)


def get_cost_limit(project_name: str) -> CostLimit | None:
    """
    Get cost limit for a project.

    Args:
        project_name: Project name

    Returns:
        CostLimit if found, None otherwise
    """
    limits = load_cost_limits()
    return limits.get(project_name)


def set_cost_limit(limit: CostLimit) -> None:
    """
    Set or update cost limit for a project.

    Args:
        limit: CostLimit to save
    """
    limits = load_cost_limits()
    limits[limit.project_name] = limit
    save_cost_limits(limits)


def delete_cost_limit(project_name: str) -> None:
    """
    Delete cost limit for a project.

    Args:
        project_name: Project name
    """
    limits = load_cost_limits()
    if project_name in limits:
        del limits[project_name]
        save_cost_limits(limits)


def load_cost_history() -> dict[str, list[CostEstimate]]:
    """
    Load cost history for all projects.

    Returns:
        Dictionary mapping project_name to list of CostEstimate
    """
    if not COST_HISTORY_FILE.exists():
        return {}

    try:
        with open(COST_HISTORY_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        result = {}
        for project_name, estimates in data.items():
            result[project_name] = [CostEstimate(**est_data) for est_data in estimates]
        return result
    except (json.JSONDecodeError, ValueError, KeyError):
        return {}


def save_cost_history(history: dict[str, list[CostEstimate]]) -> None:
    """
    Save cost history for all projects.

    Args:
        history: Dictionary mapping project_name to list of CostEstimate
    """
    COST_HISTORY_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(COST_HISTORY_FILE, "w", encoding="utf-8") as f:
        data = {
            project_name: [est.model_dump(mode="json") for est in estimates]
            for project_name, estimates in history.items()
        }
        json.dump(data, f, indent=2)


def add_cost_estimate(estimate: CostEstimate) -> None:
    """
    Add a cost estimate to history.

    Args:
        estimate: CostEstimate to add
    """
    history = load_cost_history()
    if estimate.project_name not in history:
        history[estimate.project_name] = []
    history[estimate.project_name].append(estimate)
    # Keep only last 100 estimates per project
    history[estimate.project_name] = history[estimate.project_name][-100:]
    save_cost_history(history)


def get_cost_history(project_name: str) -> list[CostEstimate]:
    """
    Get cost history for a project.

    Args:
        project_name: Project name

    Returns:
        List of CostEstimate, sorted by calculated_at
    """
    history = load_cost_history()
    estimates = history.get(project_name, [])
    return sorted(estimates, key=lambda x: x.calculated_at)


def get_global_cost_limit() -> float | None:
    """
    Get global cost limit across all projects.

    Returns:
        Global limit in USD, or None if not set
    """
    if not GLOBAL_LIMIT_FILE.exists():
        return None

    try:
        with open(GLOBAL_LIMIT_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        return data.get("limit_amount")
    except (json.JSONDecodeError, ValueError, KeyError):
        return None


def set_global_cost_limit(limit_amount: float | None) -> None:
    """
    Set global cost limit.

    Args:
        limit_amount: Global limit in USD, or None to remove
    """
    if limit_amount is None:
        if GLOBAL_LIMIT_FILE.exists():
            GLOBAL_LIMIT_FILE.unlink()
        return

    GLOBAL_LIMIT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(GLOBAL_LIMIT_FILE, "w", encoding="utf-8") as f:
        json.dump(
            {
                "limit_amount": limit_amount,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            },
            f,
            indent=2,
        )


def update_cost_limit_check_time(project_name: str) -> None:
    """
    Update the last_checked timestamp for a cost limit.

    Args:
        project_name: Project name
    """
    limit = get_cost_limit(project_name)
    if limit:
        limit.last_checked = datetime.now(timezone.utc)
        set_cost_limit(limit)
