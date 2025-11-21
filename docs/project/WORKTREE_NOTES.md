# Worktree Compatibility Notes

## Temporary Root Files

The following files exist at both the root and in `docs/project/` for worktree compatibility:

- `CHANGELOG.md` (root) ↔ `docs/project/CHANGELOG.md` (canonical)
- `CONTRIBUTING.md` (root) ↔ `docs/project/CONTRIBUTING.md` (canonical)
- `STRUCTURE.md` (root) ↔ `docs/project/STRUCTURE.md` (canonical)
- `IMPLEMENTATION_STATUS.md` (root) ↔ `docs/project/IMPLEMENTATION_STATUS.md` (canonical)
- `tests/test_cli.py` (root) ↔ `tests/unit/test_cli.py` (canonical)
- `tests/test_local_provider.py` (root) ↔ `tests/unit/test_local_provider.py` (canonical)

## After Worktree Operation Completes

Once the worktree operation succeeds, you can remove the duplicates at the root:

```bash
git rm CHANGELOG.md CONTRIBUTING.md STRUCTURE.md IMPLEMENTATION_STATUS.md
git rm tests/test_cli.py tests/test_local_provider.py
```

The canonical locations are:
- `docs/project/` for documentation files
- `tests/unit/` for test files

## Why This Is Needed

Git worktrees need to apply changes from other branches/commits that reference files at their original paths. By keeping copies at the old paths temporarily, the worktree operation can succeed. After completion, the duplicates can be removed.

