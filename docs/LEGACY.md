# Legacy Code

This document describes legacy code that may be removed in future versions.

## `scripts/` Directory

The `scripts/` directory contains deprecated shell scripts that have been replaced by the Python CLI.

### Deprecated Scripts

- `scripts/setup.sh` - Replaced by `pocket-architect cvat up --wizard`
- `scripts/up.sh` - Replaced by `pocket-architect cvat up`
- `scripts/down.sh` - Replaced by `pocket-architect cvat down`
- `scripts/checkpoint.sh` - Functionality moved to session management

### Migration

All functionality has been migrated to the `pocket-architect` CLI. Please use:

```bash
# Old: ./scripts/setup.sh
pocket-architect cvat up --wizard

# Old: ./scripts/up.sh
pocket-architect cvat up --provider aws

# Old: ./scripts/down.sh
pocket-architect cvat down --provider aws
```

## `terraform/` Directory (Root)

The root `terraform/` directory contains legacy Terraform configurations that have been replaced by embedded Terraform modules in `pocket-architect/providers/aws/terraform/`.

### Migration

Terraform modules are now embedded in the package and managed automatically by the AWS provider. You no longer need to manage Terraform files manually.

If you have existing Terraform state, you can import it using:

```bash
pocket-architect cvat up --provider aws --blueprint your-existing-config.tfvars
```

## Removal Timeline

These legacy components will be removed in version 2.0.0.

