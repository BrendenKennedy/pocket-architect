# pocket-architect Usage Examples

Quick reference guide for common pocket-architect workflows.

## Basic Commands

### Check Installation
```bash
pocket-architect --version
pocket-architect --help
```

### List Available Commands
```bash
pocket-architect --help
```

## Local Development Workflow

### 1. Start CVAT Locally
```bash
# Deploy CVAT with Docker
pocket-architect cvat up --provider local

# Output:
# ✓ CVAT deployed successfully!
# CVAT URL: http://localhost:8080
```

### 2. Sync Files
```bash
# Upload images to CVAT
pocket-architect cvat sync ./my-images --direction up

# Download annotations
pocket-architect cvat sync ./annotations --direction down

# Bidirectional sync (default)
pocket-architect cvat sync ./data
```

### 3. Access Container Shell
```bash
# SSH into container
pocket-architect shell --provider local --mode ssh

# Launch JupyterLab
pocket-architect shell --provider local --mode jupyter
# Then access at http://localhost:8888

# Get VSCode instructions
pocket-architect shell --provider local --mode vscode
```

### 4. Stop CVAT
```bash
pocket-architect destroy --provider local
```

## AWS Deployment Workflow

### 1. Deploy CVAT on AWS (Interactive)
```bash
pocket-architect cvat up --provider aws --wizard

# Follow prompts:
# - AWS region: us-west-2
# - Subnet ID: subnet-xxx
# - SSH key name: my-key
# - Your IP: 1.2.3.4/32
# - Domain: cvat.example.com
# - Enable HTTPS: yes
```

### 2. Deploy with Blueprint
```bash
# Create blueprint
pocket-architect blueprint create aws --type cvat --output my-cvat.yaml

# Edit blueprint (optional)
nano my-cvat.yaml

# Deploy
pocket-architect cvat up --blueprint my-cvat.yaml
```

### 3. Sync with AWS Instance
```bash
# Upload dataset
pocket-architect cvat sync ./dataset --provider aws --direction up

# Download results
pocket-architect cvat sync ./results --provider aws --direction down
```

### 4. Access AWS Instance
```bash
# SSH access (uses SSM if available, falls back to SSH)
pocket-architect shell --provider aws --mode ssh

# Launch JupyterLab
pocket-architect shell --provider aws --mode jupyter
# Access at http://<public-ip>:8888

# VSCode Remote SSH config
pocket-architect shell --provider aws --mode vscode
```

### 5. Check Status
```bash
# List all sessions
pocket-architect list sessions

# Check specific session
pocket-architect status --provider aws
```

### 6. Destroy Resources
```bash
pocket-architect destroy --provider aws

# Output:
# ✓ All resources destroyed successfully!
# ✓ Verified: $0.00/hour estimated cost
```

## Training Workflow

### 1. Create Training Config
```yaml
# train-config.yaml
instance_type: p3.2xlarge
framework: yolo
dataset_path: /mnt/efs/datasets/my-dataset
epochs: 100
batch_size: 16
output_path: /mnt/efs/models
```

### 2. Launch Training
```bash
pocket-architect train train-config.yaml --provider aws

# Output:
# Estimated cost: $3.0600/hour ($2233.80/month)
# ⚠ Cost warning: Exceeds threshold
# ✓ Training node provisioned successfully!
# ✓ Training script deployed to /tmp/train.py
# ✓ Training job started (PID: 12345)
```

### 3. Monitor Training
```bash
# Check status
pocket-architect status --provider aws

# SSH to instance and check logs
pocket-architect shell --provider aws --mode ssh
# Then: tail -f /tmp/training.log
```

## Auto-Annotation Workflow

### Single Image
```bash
pocket-architect auto-annotate image.jpg --model sam2 --output ./annotations
```

### Directory of Images
```bash
pocket-architect auto-annotate ./dataset/images \
  --model yolo11-seg \
  --output ./annotations \
  --format coco
```

### Video File
```bash
pocket-architect auto-annotate video.mp4 \
  --model detectron2 \
  --output ./annotations
```

## Advanced Examples

### Custom Blueprint
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
subnet_id: subnet-0123456789abcdef0
ssh_key_name: my-aws-key
my_ip_cidr: 1.2.3.4/32
```

```bash
pocket-architect cvat up --blueprint custom-blueprint.yaml
```

### Environment Variables
```bash
# Set defaults
export MLCLOUD_DEFAULT_PROVIDER=aws
export MLCLOUD_AWS_REGION=us-west-2
export MLCLOUD_COST_WARNING_THRESHOLD_USD=10.0

# Now you can omit --provider
pocket-architect cvat up --wizard
```

### Cost Monitoring
```bash
# Every command shows cost estimate
pocket-architect cvat up --provider aws --wizard
# Estimated cost: $0.1234/hour ($90.08/month)

# Destroy verifies zero cost
pocket-architect destroy --provider aws
# ✓ Verified: $0.00/hour estimated cost
```

## Troubleshooting

### Check Docker (Local)
```bash
docker ps
docker-compose --version
```

### Check AWS Credentials
```bash
aws sts get-caller-identity
```

### View Session State
```bash
ls ~/.pocket-architect/sessions/
cat ~/.pocket-architect/sessions/<session-id>/session.json
```

### View Terraform State (AWS)
```bash
cd ~/.pocket-architect/sessions/<session-id>/terraform/cvat
terraform output
```

## Quick Reference

| Command | Description |
|---------|-------------|
| `pocket-architect cvat up` | Deploy CVAT instance |
| `pocket-architect cvat sync` | Sync files with CVAT |
| `pocket-architect cvat down` | Stop CVAT (preserves data) |
| `pocket-architect shell` | Access instance shell |
| `pocket-architect train` | Launch training job |
| `pocket-architect auto-annotate` | Auto-annotate images |
| `pocket-architect list sessions` | List active sessions |
| `pocket-architect status` | Show session status |
| `pocket-architect destroy` | Destroy all resources |
| `pocket-architect blueprint create` | Create deployment blueprint |

