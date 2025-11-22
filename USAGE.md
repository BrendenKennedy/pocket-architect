# Pocket Architect - Complete Usage Guide

A comprehensive guide to using Pocket Architect for deploying and managing isolated cloud environments on AWS.

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Core Concepts](#core-concepts)
4. [Command Reference](#command-reference)
5. [Built-in Blueprints](#built-in-blueprints)
6. [Common Workflows](#common-workflows)
7. [Advanced Features](#advanced-features)
8. [Best Practices](#best-practices)
9. [Troubleshooting](#troubleshooting)
10. [Quick Reference](#quick-reference)

---

## Introduction

Pocket Architect is a CLI tool for creating personal, isolated, cost-effective cloud environments on AWS. It's designed for power users who want full control without enterprise complexity.

### Philosophy

- **Simplicity over enterprise complexity** — power-user tool, not a corporate platform
- **Explicit over implicit** — nothing automatic unless explicitly requested
- **Manual control of state** — no auto-snapshots, no hidden defaults, no background processes
- **Open/Closed Principle** — extend via blueprints/templates/providers, never by modifying core logic
- **All state is local and human-readable** — `~/.pocket-architect/` contains everything

### What It Does

Pocket Architect creates completely isolated AWS environments (VPCs) for each project, allowing you to:
- Deploy web servers, ML training environments, and model serving endpoints
- Track and limit costs with automated guardrails
- Create snapshots for reproducible deployments
- Stop/start projects to save costs
- Extend functionality via custom blueprints

---

## Getting Started

### Prerequisites

- Python 3.12 or higher
- AWS account with appropriate permissions
- AWS credentials configured

### Installation

**Option 1: Using Conda (Recommended)**
```bash
conda env create -f environment.yml
conda activate pocket-architect
pip install -e .
```

**Option 2: Manual Setup**
```bash
conda create -n pocket-architect python=3.12 -y
conda activate pocket-architect
pip install -e .
```

**Option 3: Using pip**
```bash
pip install -e .
```

### AWS Credentials

Configure AWS credentials using one of these methods:

```bash
# AWS CLI (recommended)
aws configure

# Environment variables
export AWS_ACCESS_KEY_ID=your_key
export AWS_SECRET_ACCESS_KEY=your_secret

# IAM role (if running on EC2)
# No configuration needed
```

### Quick Start

Deploy your first project:

```bash
pocket-architect deploy basic-web my-first-project
```

This creates:
- An isolated VPC
- An EC2 instance (t3.large)
- SSH access (port 22)
- Web access (port 8080)
- An Elastic IP for public access

---

## Core Concepts

### Projects

A **project** is a named collection of AWS resources that work together. Each project gets:
- Its own VPC with unique CIDR block (10.1.0.0/16, 10.2.0.0/16, etc.)
- Complete isolation from other projects
- Independent lifecycle management

### Blueprints

A **blueprint** defines what resources to create and how to configure them. Blueprints specify:
- Instance type
- Ports to open
- Whether to use ALB or Elastic IP
- AMI selection
- User data scripts
- IAM roles
- Cost limits

**Types of blueprints:**
- **Built-in**: Pre-configured blueprints included with Pocket Architect
- **User**: Custom blueprints you create (stored in `~/.pocket-architect/templates/`)

### Resource Isolation

Each project is completely isolated:
- Separate VPC per project
- Unique security groups
- Independent networking
- No resource sharing between projects

### State Management

All project state is stored locally in `~/.pocket-architect/`:
- `projects/<name>/state.json` — project configuration and resource IDs
- `snapshots.json` — snapshot metadata index
- `templates/*.yaml` — user-created blueprints
- `cost_limits.json` — cost limit configurations
- `cost_history.json` — cost tracking history

### Cost Tracking

Pocket Architect tracks costs in two ways:
- **Estimated costs**: Real-time calculation based on resource types and runtime
- **Actual costs**: From AWS Cost Explorer API (24-48 hour delay)

Cost limits can trigger automatic actions:
- **stop**: Stop the instance when limit exceeded
- **teardown**: Delete the entire project
- **warn_only**: Only display warnings

### IAM Roles

ML blueprints automatically create IAM roles with S3 access, allowing instances to:
- Access S3 buckets without managing credentials
- Store training data and model artifacts
- Use MLflow with S3 backend

---

## Command Reference

### Main Commands

#### `deploy` - Deploy a Project

Deploy a blueprint to create a new project.

**Syntax:**
```bash
pocket-architect deploy <blueprint> <project> [OPTIONS]
```

**Arguments:**
- `<blueprint>` - Blueprint name (built-in or user-created)
- `<project>` - Project name (must be unique)

**Options:**
- `--snapshot, -s <name>` - Deploy from a snapshot (by name or ID)
- `--interactive, -i` - Interactive mode for configuration
- `--verbose, -v` - Verbose logging (shows AWS API calls)
- `--cost-limit, -L <amount>` - Set cost limit in USD during deployment
- `--cost-action <action>` - Action when cost limit exceeded: `stop`, `teardown`, or `warn_only` (default: `warn_only`)

**Examples:**
```bash
# Basic deployment
pocket-architect deploy basic-web my-app

# Deploy from snapshot
pocket-architect deploy basic-web my-app --snapshot nginx-ready

# Deploy with cost limit
pocket-architect deploy ml-training-gpu training --cost-limit 100.0 --cost-action stop

# Interactive mode
pocket-architect deploy basic-web my-app --interactive
```

#### `teardown` - Remove a Project

Delete a project and all its resources.

**Syntax:**
```bash
pocket-architect teardown <project> [OPTIONS]
```

**Arguments:**
- `<project>` - Project name to tear down

**Options:**
- `--force, -f` - Skip confirmation prompt

**Examples:**
```bash
# Tear down with confirmation
pocket-architect teardown my-app

# Force teardown (no confirmation)
pocket-architect teardown my-app --force
```

**What gets deleted:**
- EC2 instance
- Elastic IP (if used)
- ALB and target groups (if used)
- IAM role and instance profile (if used)
- Security groups
- Subnets
- VPC and internet gateway
- Key pair (AWS and local .pem file)
- Project state

#### `teardown-all` - Remove All Projects

Delete all projects and their resources.

**Syntax:**
```bash
pocket-architect teardown-all [OPTIONS]
```

**Options:**
- `--force, -f` - Skip confirmation for each project
- `--check-status/--no-check-status` - Check resource status before teardown (default: enabled)

**Example:**
```bash
pocket-architect teardown-all --force
```

#### `stop` - Stop a Project

Stop a project's EC2 instance to save compute costs while keeping all resources.

**Syntax:**
```bash
pocket-architect stop <project>
```

**What happens:**
- EC2 instance is stopped (no compute charges)
- All other resources remain (VPC, EBS, Elastic IP, etc.)
- You still pay for EBS storage and Elastic IP

**Example:**
```bash
pocket-architect stop my-app
```

#### `start` - Start a Stopped Project

Restart a stopped project's EC2 instance.

**Syntax:**
```bash
pocket-architect start <project>
```

**Example:**
```bash
pocket-architect start my-app
```

#### `status` - Show Project Status

Display detailed status of a project and all its resources.

**Syntax:**
```bash
pocket-architect status <project> [OPTIONS]
```

**Options:**
- `--watch, -w` - Continuously monitor status (Ctrl+C to stop)

**Example:**
```bash
# One-time status check
pocket-architect status my-app

# Watch mode (updates every 5 seconds)
pocket-architect status my-app --watch
```

#### `list` - List All Projects

Show all deployed projects with their status.

**Syntax:**
```bash
pocket-architect list
```

**Output includes:**
- Project name
- Blueprint used
- Creation date
- Current status (Running, Stopped, etc.)

### Snapshot Commands

#### `snapshot create` - Create a Snapshot

Create an EBS snapshot and AMI from a project's instance.

**Syntax:**
```bash
pocket-architect snapshot create <project> --name <name> [OPTIONS]
```

**Arguments:**
- `<project>` - Project name
- `--name, -n <name>` - Snapshot name (required)

**Options:**
- `--note <text>` - Optional note for the snapshot

**Example:**
```bash
pocket-architect snapshot create my-app --name v1-stable --note "Nginx installed and configured"
```

**What it does:**
- Creates EBS snapshot of root volume
- Creates AMI from snapshot
- Saves metadata for later use
- Takes a few minutes to complete

#### `snapshot list` - List Snapshots

View all saved snapshots.

**Syntax:**
```bash
pocket-architect snapshot list
```

**Output includes:**
- Snapshot name
- Snapshot ID
- Source project
- AMI ID (for deployment)
- Creation date
- Notes

#### `snapshot delete` - Delete a Snapshot

Remove a snapshot and its associated AMI.

**Syntax:**
```bash
pocket-architect snapshot delete <name-or-id>
```

**Arguments:**
- `<name-or-id>` - Snapshot name or snapshot ID

**Example:**
```bash
pocket-architect snapshot delete v1-stable
```

### Blueprint Commands

#### `blueprint create` - Create Custom Blueprint

Create a new blueprint interactively.

**Syntax:**
```bash
pocket-architect blueprint create
```

**Prompts:**
- Blueprint name
- Instance type
- Ports to open (comma-separated)
- Use ALB? (yes/no)
- Use Elastic IP? (yes/no)
- User data script? (optional)

**Output:**
Blueprint saved to `~/.pocket-architect/templates/<name>.yaml`

#### `blueprint list` - List Blueprints

Show all available blueprints (built-in and user-created).

**Syntax:**
```bash
pocket-architect blueprint list
```

### Cost Commands

#### `cost set` - Set Cost Limit

Set or update cost limit for a project.

**Syntax:**
```bash
pocket-architect cost set <project> --limit <amount> [OPTIONS]
```

**Arguments:**
- `<project>` - Project name
- `--limit, -l <amount>` - Cost limit in USD (required)

**Options:**
- `--action, -a <action>` - Action when limit exceeded: `stop`, `teardown`, or `warn_only` (default: `warn_only`)
- `--warning-threshold, -w <0.0-1.0>` - Warning threshold as fraction (default: 0.75 = 75%)

**Examples:**
```bash
# Set limit with default warning-only action
pocket-architect cost set my-app --limit 50.0

# Set limit with auto-stop action
pocket-architect cost set training --limit 100.0 --action stop

# Set limit with custom warning threshold
pocket-architect cost set my-app --limit 200.0 --warning-threshold 0.5
```

#### `cost check` - Check Project Costs

Check current cost for a project.

**Syntax:**
```bash
pocket-architect cost check <project> [OPTIONS]
```

**Arguments:**
- `<project>` - Project name

**Options:**
- `--aws-api, -A` - Also fetch actual cost from AWS Cost Explorer (requires permissions)

**Example:**
```bash
# Estimated cost only
pocket-architect cost check my-app

# Include actual cost from AWS
pocket-architect cost check my-app --aws-api
```

**Output includes:**
- Estimated cost
- Actual cost (if `--aws-api` used)
- Cost limit (if set)
- Usage percentage
- Cost breakdown by resource type
- Warnings if approaching/exceeding limit

#### `cost list` - List All Project Costs

Show all projects with their cost information and limits.

**Syntax:**
```bash
pocket-architect cost list
```

**Output includes:**
- Project name
- Estimated cost
- Cost limit (if set)
- Usage percentage
- Enforcement action

#### `cost enforce` - Enforce Cost Limits

Manually trigger cost limit enforcement check.

**Syntax:**
```bash
pocket-architect cost enforce [<project>]
```

**Arguments:**
- `<project>` - Optional project name (omitting enforces limits for all projects)

**Examples:**
```bash
# Enforce for specific project
pocket-architect cost enforce my-app

# Enforce for all projects
pocket-architect cost enforce
```

**What it does:**
- Calculates current costs
- Compares to limits
- Executes configured actions (stop/teardown) if limits exceeded
- Shows warnings for projects approaching limits
- Checks global cost limit if configured

#### `cost global-limit` - Manage Global Cost Limit

View or set global cost limit across all projects.

**Syntax:**
```bash
pocket-architect cost global-limit [OPTIONS]
```

**Options:**
- `--limit, -l <amount>` - Set global cost limit in USD
- `--remove, -r` - Remove global cost limit

**Examples:**
```bash
# View current global limit
pocket-architect cost global-limit

# Set global limit
pocket-architect cost global-limit --limit 500.0

# Remove global limit
pocket-architect cost global-limit --remove
```

---

## Built-in Blueprints

### Web Server Blueprints

#### `basic-web`

Basic web server configuration.

**Configuration:**
- Instance type: `t3.large`
- Ports: `22` (SSH), `8080` (web)
- Networking: Elastic IP (default) or ALB (optional)
- AMI: Amazon Linux 2023 (latest)

**Use case:** General web applications, APIs, development servers

**Example:**
```bash
pocket-architect deploy basic-web my-web-app
```

#### `bare-metal`

Minimal instance with just SSH access.

**Configuration:**
- Instance type: `t3.medium`
- Ports: `22` (SSH only)
- Networking: Elastic IP
- AMI: Amazon Linux 2023 (latest)

**Use case:** Custom setups, minimal configurations

**Example:**
```bash
pocket-architect deploy bare-metal my-bare-instance
```

### ML Training Blueprints

#### `ml-training-gpu`

Single GPU training instance with Jupyter Lab.

**Configuration:**
- Instance type: `g4dn.xlarge` (NVIDIA T4 GPU)
- Ports: `22` (SSH), `8888` (Jupyter Lab)
- Networking: Elastic IP
- AMI: Deep Learning Base OSS Nvidia Driver AMI (Ubuntu 22.04)
- IAM Role: Yes (S3 access)
- Pre-installed: PyTorch, TensorFlow, Jupyter Lab, NumPy, Pandas, Scikit-learn

**Use case:** Single GPU model training, experimentation

**Example:**
```bash
pocket-architect deploy ml-training-gpu my-training
```

**Access:**
- Jupyter Lab: `http://<public-ip>:8888`
- SSH: `ssh -i ~/.ssh/pa-my-training-key.pem ubuntu@<public-ip>`

**Note:** GPU instances may not be available in all regions. Check availability:
```bash
aws ec2 describe-instance-type-offerings --location-type region --filters "Name=instance-type,Values=g4dn.xlarge"
```

#### `ml-training-multi-gpu`

Multi-GPU instance for distributed training.

**Configuration:**
- Instance type: `g4dn.4xlarge` (4x NVIDIA T4 GPUs)
- Ports: `22` (SSH), `8888` (Jupyter Lab)
- Networking: Elastic IP
- AMI: Deep Learning Base OSS Nvidia Driver AMI (Ubuntu 22.04)
- IAM Role: Yes (S3 access)
- Pre-installed: Same as `ml-training-gpu`

**Use case:** Distributed training with PyTorch DDP or TensorFlow MirroredStrategy

**Example:**
```bash
pocket-architect deploy ml-training-multi-gpu distributed-training
```

**Cost note:** ~$1.20/hour. Use `stop` when not training.

### ML Serving Blueprints

#### `ml-serving-api`

Model serving endpoint with ALB.

**Configuration:**
- Instance type: `t3.large`
- Ports: `22` (SSH), `8000` (API)
- Networking: ALB (load balanced)
- AMI: Amazon Linux 2023 (latest)
- IAM Role: Yes (S3 access)
- Pre-installed: FastAPI, Uvicorn, PyTorch (CPU), TensorFlow (CPU)

**Use case:** Production model serving, API endpoints

**Example:**
```bash
pocket-architect deploy ml-serving-api model-api
```

**Access:**
- API: `http://<alb-dns-name>`
- Health check: `http://<alb-dns-name>/health`
- Predict endpoint: `http://<alb-dns-name>/predict`

**Next steps:**
1. SSH into instance
2. Edit `~/model-serving/app.py` to load your model
3. Restart service: `sudo systemctl restart ml-serving`

### ML Development Blueprints

#### `ml-jupyter-server`

Jupyter Lab server for experimentation.

**Configuration:**
- Instance type: `t3.large`
- Ports: `22` (SSH), `8888` (Jupyter Lab)
- Networking: Elastic IP
- AMI: Amazon Linux 2023 (latest)
- IAM Role: Yes (S3 access)
- Pre-installed: Jupyter Lab

**Use case:** Data exploration, notebook-based development

**Example:**
```bash
pocket-architect deploy ml-jupyter-server my-notebooks
```

**Access:**
- Jupyter Lab: `http://<public-ip>:8888`
- No password required (development configuration)

**Security note:** For production, modify user_data script to add authentication.

#### `ml-mlflow-server`

MLflow tracking server for experiment management.

**Configuration:**
- Instance type: `t3.medium`
- Ports: `22` (SSH), `5000` (MLflow UI)
- Networking: Elastic IP
- AMI: Amazon Linux 2023 (latest)
- IAM Role: Yes (S3 access)
- Pre-installed: MLflow, Boto3

**Use case:** Centralized experiment tracking, model registry

**Example:**
```bash
pocket-architect deploy ml-mlflow-server mlflow-tracking
```

**Access:**
- MLflow UI: `http://<public-ip>:5000`
- Backend store: Local file system (`~/mlflow/mlruns`)
- Artifact store: S3 (configure bucket in service file)

**Configuration:**
1. SSH into instance
2. Edit `/etc/systemd/system/mlflow.service` to set your S3 bucket
3. Restart: `sudo systemctl restart mlflow`

**Using MLflow:**
```python
import mlflow
mlflow.set_tracking_uri("http://<public-ip>:5000")
mlflow.set_experiment("my-experiment")
# Your training code here
```

### ML Pipeline Blueprints

#### `ml-pipeline-full`

Complete ML environment with training, tracking, and serving.

**Configuration:**
- Instance type: `g4dn.xlarge` (NVIDIA T4 GPU)
- Ports: `22` (SSH), `8888` (Jupyter), `5000` (MLflow)
- Networking: Elastic IP
- AMI: Deep Learning Base OSS Nvidia Driver AMI (Ubuntu 22.04)
- IAM Role: Yes (S3 access)
- Pre-installed: PyTorch, TensorFlow, Jupyter Lab, MLflow, FastAPI

**Use case:** Complete ML stack on single instance

**Example:**
```bash
pocket-architect deploy ml-pipeline-full complete-ml-stack
```

**Access points:**
- Jupyter Lab: `http://<public-ip>:8888`
- MLflow UI: `http://<public-ip>:5000`
- SSH: `ssh -i ~/.ssh/pa-complete-ml-stack-key.pem ubuntu@<public-ip>`

**Workflow:**
1. Use Jupyter Lab to develop and train models
2. Log experiments to MLflow
3. Export trained models for serving
4. Deploy models using FastAPI

---

## Common Workflows

### Basic Web Server Deployment

Complete workflow for deploying and managing a web server:

```bash
# 1. Deploy
pocket-architect deploy basic-web my-web-app

# 2. SSH in and set up
ssh -i ~/.ssh/pa-my-web-app-key.pem ec2-user@<public-ip>
# ... install nginx, configure, etc. ...

# 3. Create snapshot
pocket-architect snapshot create my-web-app --name nginx-ready

# 4. Stop when not in use
pocket-architect stop my-web-app

# 5. Start when needed
pocket-architect start my-web-app

# 6. Tear down when done
pocket-architect teardown my-web-app --force
```

### ML Training Workflow

Complete ML training workflow with cost management:

```bash
# 1. Deploy GPU training instance with cost limit
pocket-architect deploy ml-training-gpu training --cost-limit 100.0 --cost-action stop

# 2. Check costs
pocket-architect cost check training

# 3. SSH in and train
ssh -i ~/.ssh/pa-training-key.pem ubuntu@<public-ip>
# ... train model, save to S3 ...

# 4. Create snapshot with trained model
pocket-architect snapshot create training --name model-v1-trained

# 5. Stop to save costs
pocket-architect stop training

# 6. Later, deploy serving instance from snapshot
pocket-architect deploy ml-serving-api inference --snapshot model-v1-trained
```

### Multi-Instance ML Setup

Deploy separate instances for different ML tasks:

```bash
# Training instance (GPU)
pocket-architect deploy ml-training-gpu ml-training --cost-limit 200.0

# Tracking server (CPU, low cost)
pocket-architect deploy ml-mlflow-server mlflow

# Serving endpoint (CPU, with ALB)
pocket-architect deploy ml-serving-api ml-api

# Connect them:
# - Point training to MLflow: mlflow.set_tracking_uri("http://<mlflow-ip>:5000")
# - Deploy models from training to serving
```

### Snapshot and Restore Workflow

Create and reuse snapshots:

```bash
# 1. Deploy and configure
pocket-architect deploy basic-web my-app
# ... configure instance ...

# 2. Create snapshot
pocket-architect snapshot create my-app --name v1-stable --note "Production ready"

# 3. Tear down original
pocket-architect teardown my-app --force

# 4. Deploy from snapshot later
pocket-architect deploy basic-web my-app-v2 --snapshot v1-stable

# 5. Clean up snapshot when done
pocket-architect snapshot delete v1-stable
```

### Cost Management Workflow

Set up and monitor cost limits:

```bash
# 1. Deploy with cost limit
pocket-architect deploy ml-training-gpu training --cost-limit 50.0 --cost-action stop

# 2. Check costs periodically
pocket-architect cost check training

# 3. List all project costs
pocket-architect cost list

# 4. Manually enforce limits
pocket-architect cost enforce training

# 5. Set global limit
pocket-architect cost global-limit --limit 500.0
```

---

## Advanced Features

### Cost Tracking and Limits

Pocket Architect provides comprehensive cost tracking and automated guardrails.

#### How Cost Tracking Works

**Estimated Costs:**
- Calculated in real-time based on:
  - EC2 instance type and runtime hours
  - EBS storage (GB/month)
  - Elastic IP charges
  - ALB charges
- No AWS API calls needed
- Available immediately

**Actual Costs:**
- Fetched from AWS Cost Explorer API
- Requires `ce:GetCostAndUsage` permission
- 24-48 hour delay (AWS processing time)
- Use `--aws-api` flag to fetch

#### Setting Cost Limits

**During deployment:**
```bash
pocket-architect deploy ml-training-gpu training --cost-limit 100.0 --cost-action stop
```

**After deployment:**
```bash
pocket-architect cost set training --limit 100.0 --action stop --warning-threshold 0.75
```

#### Enforcement Actions

- **`warn_only`** (default): Display warnings, no automatic action
- **`stop`**: Automatically stop instance when limit exceeded
- **`teardown`**: Automatically delete entire project when limit exceeded

#### Cost Breakdown

View detailed cost breakdown:
```bash
pocket-architect cost check my-app
```

Shows costs by resource type:
- EC2 instance
- EBS storage
- Elastic IP
- ALB

### IAM Roles and S3 Access

ML blueprints automatically create IAM roles with S3 access, enabling:
- Access S3 buckets without managing credentials
- Store training data and model artifacts
- Use MLflow with S3 backend

**How it works:**
- IAM role created with `AmazonS3FullAccess` policy
- Instance profile attached to EC2 instance
- Instance can access S3 using AWS SDK/CLI

**Example usage on instance:**
```bash
# List S3 buckets (no credentials needed)
aws s3 ls

# Upload data
aws s3 cp data.csv s3://my-bucket/data/

# Download model
aws s3 cp s3://my-bucket/models/model.pth ./model.pth
```

**Custom IAM policies:**
Create a custom blueprint with specific policies:
```yaml
resources:
  use_iam_role: true
  iam_policies:
    - "arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess"
```

### Custom Blueprints

Create reusable blueprints for your specific needs.

**Interactive creation:**
```bash
pocket-architect blueprint create
```

**Manual creation:**
Create `~/.pocket-architect/templates/my-blueprint.yaml`:

```yaml
name: my-blueprint
description: Custom blueprint for my application
provider: aws
resources:
  instance_type: t3.large
  ports: [22, 3000]
  use_alb: false
  use_eip: true
  use_iam_role: true
  user_data: |
    #!/bin/bash
    # Your setup script here
```

**Blueprint options:**
- `instance_type`: EC2 instance type
- `ports`: List of ports to open
- `use_alb`: Use Application Load Balancer (true/false)
- `use_eip`: Use Elastic IP (true/false)
- `certificate_arn`: ACM certificate ARN (for HTTPS)
- `target_port`: Port for ALB target group
- `use_iam_role`: Create IAM role (true/false)
- `iam_policies`: List of IAM policy ARNs
- `ami_id`: Specific AMI ID
- `ami_name`: AMI name pattern (e.g., "Deep Learning Base OSS Nvidia Driver AMI (Ubuntu 22.04) *")
- `ami_owner`: AMI owner (default: "amazon")
- `user_data`: User data script (bash)

### ALB with HTTPS

Deploy with Application Load Balancer and HTTPS certificate:

**Prerequisites:**
- ACM certificate in the same region
- Certificate ARN

**Steps:**
```bash
# 1. Get certificate ARN
aws acm list-certificates --region us-east-1

# 2. Create blueprint with ALB and certificate
# Edit blueprint YAML or use interactive mode

# 3. Deploy
pocket-architect deploy my-alb-blueprint my-app
```

**Access:**
- HTTPS: `https://<alb-dns-name>`
- Health check: `https://<alb-dns-name>/health`

### Snapshots and AMIs

Snapshots allow you to save and reuse instance configurations.

**When to use snapshots:**
- Save configured environments
- Create reproducible deployments
- Backup before major changes
- Share configurations between projects

**Snapshot workflow:**
1. Deploy and configure instance
2. Create snapshot: `pocket-architect snapshot create <project> --name <name>`
3. Deploy from snapshot: `pocket-architect deploy <blueprint> <project> --snapshot <name>`

**Snapshot storage:**
- EBS snapshot stored in AWS
- AMI created from snapshot
- Metadata stored locally in `~/.pocket-architect/snapshots.json`

### Stop/Start for Cost Savings

Stop instances when not in use to save compute costs.

**Cost comparison:**
- **Running instance**: Full compute charges
- **Stopped instance**: Only EBS storage (~$0.10/GB/month) and Elastic IP (~$0.005/hour if not attached)

**Example savings:**
- g4dn.xlarge running: ~$0.50/hour
- g4dn.xlarge stopped: ~$0.10/hour (EBS only)
- **Savings: ~80% when stopped**

**When to use:**
- **Stop**: When you'll resume work soon (keeps all resources)
- **Teardown**: When completely done (deletes everything)

---

## Best Practices

### Cost Optimization

1. **Set cost limits** for all projects, especially GPU instances
2. **Stop instances** when not in use (saves 80% on compute)
3. **Use appropriate instance types** (CPU for serving, GPU only for training)
4. **Monitor costs regularly**: `pocket-architect cost list`
5. **Set global limit** to prevent total overspending
6. **Use `teardown`** when completely done (not just `stop`)

### Security

1. **Use IAM roles** instead of storing credentials
2. **Limit security group ports** to only what's needed
3. **Use ALB with HTTPS** for production web services
4. **Add authentication** to Jupyter/MLflow for production use
5. **Review IAM policies** - ML blueprints use S3FullAccess (permissive)

### Resource Management

1. **Use descriptive project names** that indicate purpose
2. **Create snapshots** before major changes
3. **Clean up unused snapshots** (they cost storage)
4. **Use `teardown-all`** periodically to clean up abandoned projects
5. **Check project status** before deploying: `pocket-architect list`

### ML Workflows

1. **Use separate instances** for training vs serving (cost optimization)
2. **Use MLflow** for experiment tracking (centralized)
3. **Store data/models in S3** (leveraging IAM roles)
4. **Create snapshots** after training successful models
5. **Stop GPU instances** immediately after training completes

### Blueprint Management

1. **Create reusable blueprints** for common configurations
2. **Document custom blueprints** with notes in YAML
3. **Version control blueprints** (they're just YAML files)
4. **Share blueprints** via version control or file sharing

---

## Troubleshooting

### AWS Credentials

**Error:** "AWS credentials not configured"

**Solution:**
```bash
# Configure using AWS CLI
aws configure

# Or set environment variables
export AWS_ACCESS_KEY_ID=your_key
export AWS_SECRET_ACCESS_KEY=your_secret
```

**Verify credentials:**
Every command shows your AWS identity:
```
You are operating as: arn:aws:iam::123456789012:user/yourname
All resources will be created in this account: 123456789012
```

### Project Already Exists

**Error:** "Project already exists"

**Solution:**
```bash
# Check existing projects
pocket-architect list

# Tear down existing project
pocket-architect teardown <project-name> --force

# Or use a different project name
pocket-architect deploy <blueprint> <different-name>
```

### Instance Not Accessible

**Symptoms:** Can't SSH or access web service

**Checklist:**
1. Verify instance is running: `pocket-architect status <project>`
2. Check security group rules (ports should be open)
3. Verify Elastic IP is associated: `pocket-architect status <project>`
4. Check instance status in AWS: `aws ec2 describe-instances`
5. Verify key file exists: `ls ~/.ssh/pa-<project>-key.pem`

### Snapshot Not Found

**Error:** "Snapshot not found"

**Solution:**
```bash
# List all snapshots
pocket-architect snapshot list

# Use exact snapshot name or snapshot ID
pocket-architect deploy <blueprint> <project> --snapshot <exact-name>
```

### Cost Tracking Issues

**Estimated costs seem wrong:**
- Costs are estimates based on resource types and runtime
- Actual costs may differ (reserved instances, spot pricing, etc.)
- Use `--aws-api` flag to get actual costs (24-48hr delay)

**Cost Explorer access denied:**
- Need `ce:GetCostAndUsage` IAM permission
- Estimated costs still work without this permission

**Cost limit not enforcing:**
- Limits are checked only when you run `cost enforce` or `cost check`
- Set up a cron job to run `cost enforce` periodically if needed

### IAM Role Issues

**Error creating IAM role:**
- Need `iam:*` permissions
- Check IAM service quotas (roles per account)
- Instance will deploy without IAM role if creation fails

**S3 access not working:**
- Verify IAM role was created: Check deployment output
- Check IAM role policies: `aws iam list-attached-role-policies --role-name pa-<project>-role`
- Verify instance profile attached: `aws ec2 describe-instances --instance-ids <id>`

### GPU Instance Issues

**GPU instance not available:**
- GPU instances may not be available in all regions
- Check availability: `aws ec2 describe-instance-type-offerings --location-type region --filters "Name=instance-type,Values=g4dn.xlarge"`
- Try a different region or instance type

**Deep Learning AMI not found:**
- AMI names are region-specific
- The blueprint uses a pattern that should match latest AMI
- If issues persist, specify `ami_id` directly in custom blueprint

### Deployment Failures

**Partial deployment:**
- Pocket Architect attempts cleanup on failure
- Check what was created: `pocket-architect status <project>`
- Manually clean up if needed: `pocket-architect teardown <project> --force`

**Timeout errors:**
- Some operations take time (instance startup, snapshot creation)
- Use `--verbose` flag to see detailed progress
- Check AWS console for resource status

### Viewing Project State

**Project state location:**
```
~/.pocket-architect/projects/<project-name>/state.json
```

**Snapshot index:**
```
~/.pocket-architect/snapshots.json
```

**Cost limits:**
```
~/.pocket-architect/cost_limits.json
```

**Cost history:**
```
~/.pocket-architect/cost_history.json
```

All state files are human-readable JSON.

---

## Quick Reference

### Command Cheat Sheet

```bash
# Deployment
pocket-architect deploy <blueprint> <project> [--snapshot <name>] [--cost-limit <amount>] [--cost-action <action>]

# Project Management
pocket-architect list                    # List all projects
pocket-architect status <project>        # Show project status
pocket-architect stop <project>          # Stop instance
pocket-architect start <project>         # Start instance
pocket-architect teardown <project>      # Delete project
pocket-architect teardown-all            # Delete all projects

# Snapshots
pocket-architect snapshot create <project> --name <name>
pocket-architect snapshot list
pocket-architect snapshot delete <name-or-id>

# Blueprints
pocket-architect blueprint list
pocket-architect blueprint create

# Cost Management
pocket-architect cost set <project> --limit <amount> [--action <action>]
pocket-architect cost check <project> [--aws-api]
pocket-architect cost list
pocket-architect cost enforce [<project>]
pocket-architect cost global-limit [--limit <amount>] [--remove]
```

### Common Flags

- `--force, -f` - Skip confirmation prompts
- `--verbose, -v` - Verbose logging
- `--interactive, -i` - Interactive mode
- `--snapshot, -s` - Deploy from snapshot
- `--cost-limit, -L` - Set cost limit
- `--cost-action, -a` - Cost limit action
- `--aws-api, -A` - Fetch actual costs from AWS
- `--watch, -w` - Watch mode for status

### Built-in Blueprints

**Web:**
- `basic-web` - Web server (t3.large, ports 22+8080)
- `bare-metal` - Minimal instance (t3.medium, port 22)

**ML Training:**
- `ml-training-gpu` - Single GPU (g4dn.xlarge)
- `ml-training-multi-gpu` - Multi-GPU (g4dn.4xlarge)

**ML Serving:**
- `ml-serving-api` - Model API (t3.large, ALB, port 8000)

**ML Development:**
- `ml-jupyter-server` - Jupyter Lab (t3.large, port 8888)
- `ml-mlflow-server` - MLflow tracking (t3.medium, port 5000)

**ML Pipeline:**
- `ml-pipeline-full` - Complete stack (g4dn.xlarge, ports 22+8888+5000)

### Cost Estimation Reference

**EC2 Instances (approximate, us-east-1, on-demand):**
- t3.medium: ~$0.04/hour
- t3.large: ~$0.08/hour
- g4dn.xlarge: ~$0.50/hour
- g4dn.4xlarge: ~$1.20/hour

**Other Services:**
- EBS storage: ~$0.10/GB/month
- Elastic IP: ~$0.005/hour (when not attached to running instance)
- ALB: ~$0.0225/hour + data processing

### File Locations

- Project state: `~/.pocket-architect/projects/<name>/state.json`
- Snapshots: `~/.pocket-architect/snapshots.json`
- Blueprints: `~/.pocket-architect/templates/*.yaml`
- Cost limits: `~/.pocket-architect/cost_limits.json`
- SSH keys: `~/.ssh/pa-<project>-key.pem`

---

## Additional Resources

- **README.md**: Project overview and philosophy
- **AWS Documentation**: For understanding underlying services
- **Blueprint YAML files**: Examples in `~/.pocket-architect/templates/`

For issues or questions, check the troubleshooting section above or review the project state files for debugging information.

