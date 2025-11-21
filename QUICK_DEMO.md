# pocket-architect Quick Demo

## What is pocket-architect?

`pocket-architect` is a zero-install, platform-agnostic Python CLI that turns any laptop into an on-demand GPU computer-vision workstation with zero vendor lock-in.

## Key Features

✅ **Multi-Provider Support**: AWS, CoreWeave, RunPod, Local (Docker)  
✅ **CVAT Deployment**: One-command CVAT instance deployment  
✅ **File Synchronization**: Bidirectional sync with CVAT instances  
✅ **Shell Access**: SSH, JupyterLab, and VSCode Remote support  
✅ **Training Jobs**: Deploy and monitor ML training jobs  
✅ **Auto-Annotation**: Automatic image/video annotation  
✅ **Cost Tracking**: Real-time cost estimates and zero-cost teardown  
✅ **Security**: Least-privilege credentials, HTTPS, secure password storage  

## Installation

```bash
pip install pocket-architect
```

Or from source:
```bash
git clone <repository-url>
cd pocket-architect
pip install -e ".[dev]"
```

## Quick Start Examples

### 1. Local Development (Docker)

```bash
# Start CVAT locally
pocket-architect cvat up --provider local

# Access CVAT at http://localhost:8080
# Default credentials: admin / (password stored in keyring)

# Sync your images
pocket-architect cvat sync ./my-images --direction up

# Access container shell
pocket-architect shell --provider local --mode ssh

# Launch JupyterLab
pocket-architect shell --provider local --mode jupyter
# Access at http://localhost:8888

# Stop CVAT
pocket-architect destroy --provider local
```

### 2. AWS Deployment (Interactive)

```bash
# Guided setup
pocket-architect cvat up --provider aws --wizard

# The wizard prompts for:
# - AWS region
# - Subnet ID  
# - SSH key name
# - Your IP (CIDR format)
# - Domain name (for HTTPS)
# - Instance type

# After deployment:
# - CVAT URL shown in output
# - Password stored securely in keyring
# - Cost estimate displayed
```

### 3. AWS Deployment (Blueprint)

```bash
# Create a blueprint
pocket-architect blueprint create aws --type cvat --output my-cvat.yaml

# Edit if needed
nano my-cvat.yaml

# Deploy
pocket-architect cvat up --blueprint my-cvat.yaml
```

### 4. File Synchronization

```bash
# Upload dataset to CVAT
pocket-architect cvat sync ./dataset --provider aws --direction up

# Download annotations
pocket-architect cvat sync ./annotations --provider aws --direction down

# Bidirectional sync (default)
pocket-architect cvat sync ./data --provider aws
```

**How it works:**
- Tries SSM Session Manager first (no SSH key needed)
- Falls back to SSH/rsync if SSM unavailable
- Automatically finds SSH keys in ~/.ssh/

### 5. Shell Access

```bash
# SSH access (uses SSM if available)
pocket-architect shell --provider aws --mode ssh

# Launch JupyterLab on instance
pocket-architect shell --provider aws --mode jupyter
# Output:
# ✓ JupyterLab started
# Access at: http://<public-ip>:8888
# Token: <token>

# Get VSCode Remote SSH config
pocket-architect shell --provider aws --mode vscode
```

### 6. Training Jobs

```bash
# Create training config
cat > train-config.yaml <<EOF
instance_type: p3.2xlarge
framework: yolo
dataset_path: /mnt/efs/datasets/my-dataset
epochs: 100
batch_size: 16
output_path: /mnt/efs/models
EOF

# Launch training
pocket-architect train train-config.yaml --provider aws

# Output:
# Estimated cost: $3.0600/hour ($2233.80/month)
# ⚠ Cost warning: Exceeds threshold
# ✓ Training node provisioned successfully!
# ✓ Training script deployed to /tmp/train.py
# ✓ Training job started (PID: 12345)
# Monitor logs: ssh -i ~/.ssh/key.pem ubuntu@<ip> 'tail -f /tmp/training.log'
```

### 7. Auto-Annotation

```bash
# Single image with SAM 2
pocket-architect auto-annotate image.jpg --model sam2 --output ./annotations

# Directory of images with YOLO
pocket-architect auto-annotate ./images --model yolo11-seg --output ./annotations

# Video file (extracts frames)
pocket-architect auto-annotate video.mp4 --model detectron2 --output ./annotations
```

**Available Models:**
- `sam2` - Segment Anything Model 2.1
- `yolo11-seg` - YOLOv11x segmentation
- `yolo11-obb` - YOLOv11x oriented bounding box
- `grounding-dino` - Text-prompted segmentation
- `detectron2` - Mask R-CNN

### 8. Session Management

```bash
# List all active sessions
pocket-architect list sessions

# Check session status
pocket-architect status --provider aws

# Destroy all resources (zero-cost guarantee)
pocket-architect destroy --provider aws
# Output:
# ✓ All resources destroyed successfully!
# ✓ Verified: $0.00/hour estimated cost
```

## Command Reference

| Command | Description |
|---------|-------------|
| `pocket-architect cvat up` | Deploy CVAT instance |
| `pocket-architect cvat sync` | Sync files with CVAT |
| `pocket-architect cvat down` | Stop CVAT (preserves data) |
| `pocket-architect shell` | Access instance shell (ssh/jupyter/vscode) |
| `pocket-architect train` | Launch training job |
| `pocket-architect auto-annotate` | Auto-annotate images/video |
| `pocket-architect list sessions` | List active sessions |
| `pocket-architect status` | Show session status |
| `pocket-architect destroy` | Destroy all resources |
| `pocket-architect blueprint create` | Create deployment blueprint |

## Cost Management

Every command displays cost estimates:

```bash
pocket-architect cvat up --provider aws --wizard
# Estimated cost: $0.1234/hour ($90.08/month)
```

Destroy command verifies zero cost:

```bash
pocket-architect destroy --provider aws
# ✓ Verified: $0.00/hour estimated cost
```

## State Management

All state stored in `~/.pocket-architect/`:
- **Sessions**: `~/.pocket-architect/sessions/<session-id>/`
- **Models**: `~/.pocket-architect/models/`
- **Credentials**: OS keyring (never in files)

## Security Features

✅ **Least-privilege credentials** - Automatic IAM role creation  
✅ **Credential validation** - Rejects AdministratorAccess  
✅ **Secure password storage** - OS keyring only  
✅ **HTTPS enforcement** - All deployments use HTTPS by default  
✅ **Security scanning** - Terraform code checked with checkov/tfsec  
✅ **Tag-based cleanup** - All resources tagged for guaranteed teardown  

## Next Steps

- Read [EXAMPLES.md](EXAMPLES.md) for detailed workflows
- Read [USAGE_EXAMPLES.md](USAGE_EXAMPLES.md) for quick reference
- Check [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for system design
- Review [docs/SECURITY.md](docs/SECURITY.md) for security best practices

