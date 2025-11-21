# pocket-architect

A zero-install, platform-agnostic Python CLI that turns any laptop into an on-demand GPU computer-vision workstation with zero vendor lock-in.

## Installation

```bash
pip install pocket-architect
```

Or install from source:

```bash
git clone <repository-url>
cd pocket-architect
pip install -e .
```

## Quick Start

### Three Ways to Configure Deployments

**1. Interactive Wizard (Recommended for first-time users)**
```bash
pocket-architect cvat up --wizard
# Follow the prompts to configure your deployment
```

**2. Blueprint File (Best for repeatable deployments)**
```bash
# Create a blueprint
pocket-architect blueprint create aws --type cvat --output my-config.yaml

# Use the blueprint
pocket-architect cvat up --blueprint my-config.yaml
```

**3. CLI Flags (Quick one-off deployments)**
```bash
pocket-architect cvat up --provider aws --subnet-id subnet-xxx --ssh-key-name my-key
```

### Basic Usage

```bash
# Show version
pocket-architect --version

# Deploy CVAT locally (requires Docker)
pocket-architect cvat up --provider local

# Deploy CVAT on AWS with wizard
pocket-architect cvat up --provider aws --wizard

# Auto-annotate images
pocket-architect auto-annotate ./images --model sam2

# List active sessions
pocket-architect list sessions

# Check session status
pocket-architect status

# Get shell access
pocket-architect shell --provider local

# Sync files with CVAT
pocket-architect cvat sync --direction both

# Destroy resources
pocket-architect destroy --provider local
```

## Commands

### Core Commands

- `pocket-architect auto-annotate <path>` - Fully automatic labeling (images or video frames)
  - Supports images, video files, and directories
  - Models: sam2, yolo11-seg, yolo11-obb, grounding-dino, detectron2
  - Outputs CVAT-compatible JSON annotations

- `pocket-architect cvat up` - Spin up full CVAT instance with optional pre-annotation + HTTPS
  - Local: Docker Compose deployment
  - AWS: EC2 Spot + EFS + ALB with HTTPS
  - Auto-generates secure admin password stored in keyring

- `pocket-architect cvat sync` - Bidirectional sync with running CVAT
  - Sync direction: up, down, or both
  - Uses EFS (AWS) or Docker volumes (Local)

- `pocket-architect cvat down` - Stop CVAT instance (preserves data)

- `pocket-architect train <config.yaml>` - Launch YOLO/SAM/Detectron2 training job
  - Provisions GPU instance for training
  - Supports YAML configuration files

- `pocket-architect shell` - Instant SSH or VSCode Remote / JupyterLab into the GPU node
  - Modes: ssh, vscode, jupyter

- `pocket-architect destroy` - Guaranteed zero-cost teardown
  - Removes all resources with tag-based cleanup
  - Verifies zero recurring charges

### Utility Commands

- `pocket-architect list sessions` - List all active sessions
- `pocket-architect status` - Show current session status and resource information

## Providers

### Local (✅ Fully Implemented)
- Docker Compose + NVIDIA Container Toolkit
- Zero cloud costs
- Perfect for development and testing

### AWS (✅ Fully Implemented)
- EC2 Spot instances for cost savings
- EFS for persistent storage
- Application Load Balancer with HTTPS
- Automatic least-privilege IAM role creation
- Terraform-based infrastructure

### CoreWeave (🔄 Skeleton)
- Kubernetes API integration
- Block storage for CVAT data
- GPU instances

### RunPod (🔄 Skeleton)
- REST API integration
- Secure Cloud only
- GPU pod management

## Models (v1.0)

All models are automatically downloaded and cached:

- **SAM 2.1 hiera-large** - Segment Anything Model 2.1
- **YOLO11x-seg** - YOLOv11x segmentation model
- **YOLO11x-obb** - YOLOv11x oriented bounding box model
- **Grounding DINO 1.5 + SAM 2** - Text-prompted segmentation
- **Detectron2 Mask R-CNN** - Pretrained on COCO

## Security Features

- ✅ **Least-privilege credentials** - Automatic IAM role creation with minimal permissions
- ✅ **Credential validation** - Rejects AdministratorAccess credentials
- ✅ **Secure password storage** - Random 32-char CVAT passwords stored only in OS keyring
- ✅ **HTTPS enforcement** - All CVAT deployments use HTTPS by default
- ✅ **Security scanning** - Terraform code checked with checkov and tfsec before deployment
- ✅ **Tag-based cleanup** - All resources tagged for guaranteed teardown

## Cost Tracking

Every command displays:
- Live hourly cost estimate
- Projected monthly cost (hourly × 730)
- Cost warnings for expensive operations

Local provider: **$0.00/hour**

## State Management

All state is stored in `~/.pocket-architect/`:
- **Sessions**: `~/.pocket-architect/sessions/<session-id>/`
  - Session metadata and Terraform state
- **Models**: `~/.pocket-architect/models/`
  - Cached model weights and checkpoints
- **Credentials**: OS keyring (never stored in files)
  - CVAT passwords
  - Provider API keys

## Configuration

Settings can be configured via:
- Environment variables (prefix: `MLCLOUD_`)
- `.env` file
- Defaults in `pocket-architect/config/settings.py`

Key settings:
- `MLCLOUD_DEFAULT_PROVIDER` - Default cloud provider
- `MLCLOUD_AWS_REGION` - Default AWS region
- `MLCLOUD_COST_WARNING_THRESHOLD_USD` - Cost warning threshold

## Examples

### Deploy CVAT on AWS

**Option 1: Interactive Wizard (Easiest)**
```bash
pocket-architect cvat up --provider aws --wizard
# Guides you through all configuration options
```

**Option 2: Blueprint File (Most Flexible)**
```bash
# Create blueprint interactively
pocket-architect blueprint create aws --type cvat --output my-cvat.yaml

# Edit the blueprint file if needed
# Then use it
pocket-architect cvat up --blueprint my-cvat.yaml
```

**Option 3: CLI Flags (Quick Setup)**
```bash
pocket-architect cvat up \
  --provider aws \
  --subnet-id subnet-0123456789abcdef0 \
  --ssh-key-name my-key \
  --domain-name cvat.example.com \
  --https
```

**Using Existing Terraform Files**
```bash
# If you have existing terraform.tfvars
pocket-architect cvat up --blueprint terraform.tfvars
```

### Auto-annotate Images

```bash
# Single image
pocket-architect auto-annotate image.jpg --model sam2

# Directory of images
pocket-architect auto-annotate ./dataset/images --model yolo11-seg

# Video file (extracts frames automatically)
pocket-architect auto-annotate video.mp4 --model detectron2 --output ./annotations
```

### Training Job

```bash
# Create training config
cat > train-config.yaml <<EOF
instance_type: p3.2xlarge
framework: yolo
dataset_path: /mnt/efs/datasets/my-dataset
epochs: 100
batch_size: 16
EOF

# Launch training
pocket-architect train train-config.yaml --provider aws
```

## Development

```bash
# Install in development mode
pip install -e ".[dev]"

# Run tests
pytest

# Run CLI
python -m pocket-architect --help

# Check code quality
black pocket-architect/
ruff check pocket-architect/
mypy pocket-architect/
```

## Architecture

```
pocket-architect/
├── pocket-architect/
│   ├── cli.py              # Typer CLI entrypoint
│   ├── commands/           # Command implementations
│   ├── core/               # Types, session, state, cost
│   ├── providers/          # Provider implementations
│   │   ├── local/         # Docker Compose
│   │   ├── aws/           # EC2 + EFS + Terraform
│   │   ├── coreweave/     # Kubernetes
│   │   └── runpod/        # REST API
│   ├── models/            # Model registry & inference
│   ├── utils/             # Utilities (keyring, SSO, etc.)
│   └── security/          # Security hardening
├── tests/                 # Test suite
└── .github/workflows/     # CI/CD
```

## Requirements

- Python 3.9+
- Docker (for local provider)
- Terraform (for AWS provider)
- AWS CLI (optional, for AWS SSO)

## License

MIT License - see [LICENSE](LICENSE) file

## Contributing

Contributions welcome! Please ensure:
- All code passes security checks (checkov, tfsec)
- Tests pass (`pytest`)
- Code is formatted (`black`, `ruff`)
- Documentation is updated
