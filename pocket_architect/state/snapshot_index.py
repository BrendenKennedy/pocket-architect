"""Snapshot index management."""

import json
from pathlib import Path

from pocket_architect.config import SNAPSHOTS_FILE
from pocket_architect.models import SnapshotMetadata


def load_snapshots() -> list[SnapshotMetadata]:
    """
    Load all snapshots from index.

    Returns:
        List of SnapshotMetadata
    """
    if not SNAPSHOTS_FILE.exists():
        return []

    try:
        with open(SNAPSHOTS_FILE, "r") as f:
            data = json.load(f)

        snapshots = []
        for item in data:
            # Handle datetime deserialization
            if isinstance(item.get("created_at"), str):
                from datetime import datetime

                item["created_at"] = datetime.fromisoformat(item["created_at"])
            snapshots.append(SnapshotMetadata(**item))

        return snapshots
    except (json.JSONDecodeError, ValueError) as e:
        raise ValueError(f"Failed to load snapshots index: {e}")


def save_snapshots(snapshots: list[SnapshotMetadata]) -> None:
    """
    Save snapshots to index.

    Args:
        snapshots: List of SnapshotMetadata to save
    """
    SNAPSHOTS_FILE.parent.mkdir(parents=True, exist_ok=True)

    # Convert to JSON-serializable format
    data = []
    for snapshot in snapshots:
        snapshot_dict = snapshot.model_dump()
        if isinstance(snapshot_dict.get("created_at"), str):
            pass
        else:
            snapshot_dict["created_at"] = snapshot_dict["created_at"].isoformat()
        data.append(snapshot_dict)

    with open(SNAPSHOTS_FILE, "w") as f:
        json.dump(data, f, indent=2)


def save_snapshot_metadata(metadata: SnapshotMetadata) -> None:
    """
    Add or update a snapshot in the index.

    Args:
        metadata: SnapshotMetadata to save
    """
    snapshots = load_snapshots()

    # Check if snapshot with same name or ID already exists
    existing_index = None
    for i, snap in enumerate(snapshots):
        if snap.snapshot_id == metadata.snapshot_id or snap.name == metadata.name:
            existing_index = i
            break

    if existing_index is not None:
        snapshots[existing_index] = metadata
    else:
        snapshots.append(metadata)

    save_snapshots(snapshots)


def find_snapshot(name_or_id: str) -> SnapshotMetadata | None:
    """
    Find a snapshot by name or ID.

    Args:
        name_or_id: Snapshot name or snapshot ID

    Returns:
        SnapshotMetadata if found, None otherwise
    """
    snapshots = load_snapshots()
    for snapshot in snapshots:
        if snapshot.name == name_or_id or snapshot.snapshot_id == name_or_id:
            return snapshot
    return None


def delete_snapshot_metadata(name_or_id: str) -> SnapshotMetadata | None:
    """
    Delete a snapshot from the index.

    Args:
        name_or_id: Snapshot name or ID to delete

    Returns:
        SnapshotMetadata if found and deleted, None otherwise
    """
    snapshots = load_snapshots()
    for i, snapshot in enumerate(snapshots):
        if snapshot.name == name_or_id or snapshot.snapshot_id == name_or_id:
            deleted = snapshots.pop(i)
            save_snapshots(snapshots)
            return deleted
    return None
