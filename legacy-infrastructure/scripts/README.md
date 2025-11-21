# Legacy Scripts

⚠️ **DEPRECATED** - These scripts are deprecated and will be removed in a future version.

## Migration to mlcloud CLI

All functionality has been migrated to the `mlcloud` CLI:

| Old Script | New Command |
|------------|-------------|
| `scripts/setup.sh` | `mlcloud cvat up --wizard` |
| `scripts/up.sh` | `mlcloud cvat up --provider aws` |
| `scripts/down.sh` | `mlcloud cvat down --provider aws` |
| `scripts/checkpoint.sh` | Checkpoint functionality integrated into session management |
| `python scripts/cvat.py setup` | `mlcloud cvat up --wizard` |
| `python scripts/cvat.py up` | `mlcloud cvat up` |
| `python scripts/cvat.py down` | `mlcloud cvat down` |

## Why Deprecated?

The mlcloud CLI provides:
- ✅ Unified interface across all providers (AWS, CoreWeave, RunPod, Local)
- ✅ Better error handling and user guidance
- ✅ Blueprint system for repeatable deployments
- ✅ Interactive wizard for first-time setup
- ✅ Automatic credential management
- ✅ Cost tracking and estimation
- ✅ Session management

## Files

- `setup.sh` - Interactive setup script (deprecated)
- `up.sh` - Start infrastructure (deprecated)
- `down.sh` - Stop infrastructure (deprecated)
- `checkpoint.sh` - Create checkpoint (deprecated)
- `cvat.py` - Python CLI wrapper (deprecated)
- `cvat/` - Python modules for CVAT management (deprecated)
- `requirements.txt` - Dependencies for legacy scripts

