# pocket-architect CLI Examples

This document demonstrates how to use the `pocket-architect` CLI for various computer vision workflows.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Local Development](#local-development)
3. [AWS Deployment](#aws-deployment)
4. [File Synchronization](#file-synchronization)
5. [Shell Access](#shell-access)
6. [Training Jobs](#training-jobs)
7. [Auto-Annotation](#auto-annotation)

## Quick Start

### Install pocket-architect

```bash
pip install pocket-architect
```

Or install from source:

```bash
git clone <repository-url>
cd pocket-architect
pip install -e ".[dev]"
```

### Check Installation

```bash
pocket-architect --version
pocket-architect --help
```

## Local Development

### Deploy CVAT Locally

```bash
# Start CVAT with Docker Compose
pocket-architect cvat up --provider local

# Check status
pocket-architect status

# Access CVAT at http://localhost:8080
```

### Sync Files with Local CVAT

```bash
# Upload images to CVAT
pocket-architect cvat sync ./my-images --direction up

# Download annotations from CVAT
pocket-architect cvat sync ./annotations --direction down

# Bidirectional sync (default)
pocket-architect cvat sync ./data
```

### Shell Access to Local Container

```bash
# SSH into container
pocket-architect shell --provider local --mode ssh

# Launch JupyterLab in container
pocket-architect shell --provider local --mode jupyter
# Access at http://localhost:8888

# Get VSCode Remote-Containers instructions
pocket-architect shell --provider local --mode vscode
```

### Stop Local CVAT

```bash
pocket-architect destroy --provider local
```

## AWS Deployment

### Interactive Wizard (Recommended)

```bash
# Guided setup for first-time users
pocket-architect cvat up --provider aws --wizard

# The wizard will prompt for:
# - AWS region
# - Subnet ID
# - SSH key name
# - Your IP address (CIDR)
# - Domain name (for HTTPS)
# - Instance type
```

### Blueprint File (Best for Repeatable Deployments)

```bash
# Create a blueprint
pocket-architect blueprint create aws --type cvat --output my-cvat.yaml

# Edit the blueprint file if needed
cat my-cvat.yaml

# Deploy using blueprint
pocket-architect cvat up --blueprint my-cvat.yaml
```

### CLI Flags (Quick Setup)

```bash
pocket-architect cvat up \
  --provider aws \
  --subnet-id subnet-0123456789abcdef0 \
  --ssh-key-name my-key \
  --domain-name cvat.example.com \
  --https
```

### Check Deployment Status

```bash
# List all sessions
pocket-architect list sessions

# Check specific session
pocket-architect status --provider aws
```

## File Synchronization

### Sync with AWS CVAT Instance

```bash
# Upload dataset to CVAT
pocket-architect cvat sync ./dataset --provider aws --direction up

# Download annotations
pocket-architect cvat sync ./annotations --provider aws --direction down

# Bidirectional sync (default)
pocket-architect cvat sync ./data --provider aws
```

The sync command uses:
- **SSM Session Manager** (if available) - no SSH key needed
- **SSH/rsync** (fallback) - requires SSH key configured

## Shell Access

### SSH Access

```bash
# Connect via SSH
pocket-architect shell --provider aws --mode ssh

# Uses SSM Session Manager if available, falls back to SSH
```

### JupyterLab Access

```bash
# Launch JupyterLab on AWS instance
pocket-architect shell --provider aws --mode jupyter

# Output:
# ✓ JupyterLab started
# Access at: http://<public-ip>:8888
# Token: <token>
```

### VSCode Remote SSH

```bash
# Get VSCode Remote SSH configuration
pocket-architect shell --provider aws --mode vscode

# Output includes SSH config to add to ~/.ssh/config
```

## Training Jobs

### Create Training Configuration

```yaml
# train-config.yaml
instance_type: p3.2xlarge
framework: yolo
dataset_path: /mnt/efs/datasets/my-dataset
epochs: 100
batch_size: 16
output_path: /mnt/efs/models
```

### Launch Training Job

```bash
# Deploy training node and start training
pocket-architect train train-config.yaml --provider aws

# Output:
# ✓ Training node provisioned successfully!
# ✓ Training script deployed to /tmp/train.py
# ✓ Training job started (PID: 12345)
# Monitor logs: ssh -i ~/.ssh/key.pem ubuntu@<ip> 'tail -f /tmp/training.log'
```

### Check Training Status

```bash
# List active sessions
pocket-architect list sessions

# Check training job status
pocket-architect status --provider aws
```

## Auto-Annotation

### Annotate Images with SAM 2

```bash
# Single image
pocket-architect auto-annotate image.jpg --model sam2

# Directory of images
pocket-architect auto-annotate ./dataset/images --model sam2 --output ./annotations

# Video file (extracts frames automatically)
pocket-architect auto-annotate video.mp4 --model sam2 --output ./annotations
```

### Available Models

- `sam2` - Segment Anything Model 2.1
- `yolo11-seg` - YOLOv11x segmentation
- `yolo11-obb` - YOLOv11x oriented bounding box
- `grounding-dino` - Text-prompted segmentation
- `detectron2` - Mask R-CNN

### Example: Batch Annotation

```bash
# Annotate all images in directory
pocket-architect auto-annotate ./images \
  --model yolo11-seg \
  --output ./annotations \
  --format coco
```

## Cost Management

### Check Costs

Every command displays cost estimates:

```bash
pocket-architect cvat up --provider aws --wizard
# Output includes:
# Estimated cost: $0.1234/hour ($90.08/month)
```

### Destroy Resources (Zero Cost Guarantee)

```bash
# Destroy all resources for a provider
pocket-architect destroy --provider aws

# Verify zero cost
# Output:
# ✓ All resources destroyed successfully!
# ✓ Verified: $0.00/hour estimated cost
```

## Advanced Usage

### Custom Blueprint Configuration

```yaml
# custom-blueprint.yaml
provider: aws
type: cvat
region: us-west-2
instance_type: g4dn.xlarge
use_spot: true
efs_enabled: true
https: true
domain_name: cvat.example.com
subnet_id: subnet-xxx
ssh_key_name: my-key
my_ip_cidr: 1.2.3.4/32
```

### Environment Variables

```bash
# Set default provider
export POCKET_ARCHITECT_DEFAULT_PROVIDER=aws

# Set AWS region
export POCKET_ARCHITECT_AWS_REGION=us-west-2

# Set cost warning threshold
export POCKET_ARCHITECT_COST_WARNING_THRESHOLD_USD=10.0
```

### State Management

All state is stored in `~/.pocket-architect/`:

```bash
# View session state
ls ~/.pocket-architect/sessions/

# View cached models
ls ~/.pocket-architect/models/

# Credentials stored in OS keyring (never in files)
```

## Troubleshooting

### Local Provider Issues

```bash
# Check Docker is running
docker ps

# Check docker-compose is available
docker-compose --version

# View CVAT logs
docker-compose -f ~/.pocket-architect/sessions/<session-id>/docker-compose.yml logs
```

### AWS Provider Issues

```bash
# Check AWS credentials
aws sts get-caller-identity

# Check Terraform state
ls ~/.pocket-architect/sessions/<session-id>/terraform/cvat/

# View Terraform outputs
cd ~/.pocket-architect/sessions/<session-id>/terraform/cvat
terraform output
```

### Sync Issues

```bash
# Check SSH key is accessible
ls ~/.ssh/<key-name>.pem

# Test SSH connection manually
ssh -i ~/.ssh/<key-name>.pem ubuntu@<public-ip>

# Check rsync is installed
which rsync
```

## Best Practices

1. **Use Blueprints** for repeatable deployments
2. **Monitor Costs** - set cost warning thresholds
3. **Use Spot Instances** for training jobs to save money
4. **Enable EFS** for persistent storage across instances
5. **Use HTTPS** for production deployments
6. **Destroy Resources** when not in use to avoid charges
7. **Version Control** your blueprint files

## Next Steps

- Read the [Architecture Documentation](docs/ARCHITECTURE.md)
- Check [Security Best Practices](docs/SECURITY.md)
- Review [Contributing Guidelines](CONTRIBUTING.md)

