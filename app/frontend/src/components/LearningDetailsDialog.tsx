import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import {
  BookOpen,
  CheckCircle2,
  Circle,
  Clock,
  Target,
  Lightbulb,
  Code,
  Terminal,
  FileText,
  ExternalLink,
  Play,
  Award,
  ArrowRight
} from 'lucide-react';
import { Card } from './ui/card';
import { additionalModules } from './LearningDetailsDialog_modules14-21';

interface LearningDetailsDialogProps {
  open: boolean;
  onClose: () => void;
  module: any;
}

const learningContent: Record<number, any> = {
  1: {
    overview: `# Getting Started with Pocket Architect

Pocket Architect is a modern desktop application designed for managing isolated AWS environments with emphasis on **clarity, efficiency, safety, and progressive disclosure**. This comprehensive guide will walk you through the fundamentals of using Pocket Architect to provision and manage infrastructure specifically tailored for machine learning workloads.

## What is Pocket Architect?

Pocket Architect provides a unified interface for managing cloud infrastructure with a focus on machine learning workflows. The application features:

- **Dark theme with purple accents** for reduced eye strain during long development sessions
- **Projects as logical groupings** for organizing related infrastructure
- **Instances as individual compute resources** for actual workloads
- **Multi-platform region support** across AWS, GCP, and Azure
- **SSH connectivity management** for secure remote access
- **WCAG-compliant accessibility** standards throughout

## Core Concepts

### Projects: Logical Organization

Projects serve as containers for related infrastructure. Think of them as namespaces or folders that group together all resources for a specific ML initiative, research project, or application.

**Key characteristics:**
- Each Project can contain multiple Instances
- Projects have associated metadata (tags, descriptions, regions)
- Billing and cost tracking can be organized by Project
- Projects enable team collaboration and resource sharing

### Instances: Compute Resources

Instances are the actual compute resources where your ML workloads run. Each Instance belongs to exactly one Project, has a specific configuration (CPU, GPU, memory, storage), can be in various states (stopped, running, terminated), and supports SSH connectivity for remote access.

### The Dashboard: Your Command Center

The Dashboard provides at-a-glance visibility into operational status of all running instances with neonish green borders and Circle icons, connected resources showing active SSH connections, recent activity and system events, and quick actions for common tasks.

## Your First Workflow

Let's walk through a typical workflow for setting up a machine learning training environment.

### Step 1: Create a Project

Navigate to the **Projects** page and click the **Plus (+)** button in the action bar. Fill in the creation wizard with a descriptive name (e.g., "vision-research-2025"), document the purpose, select your preferred AWS region, and add cost tracking tags.

### Step 2: Configure Security

Before launching instances, set up security configurations. Go to the **Security** page and review built-in security configurations or create a custom one. Ensure SSH access (port 22) is enabled and add ports for ML services like TensorBoard (6006), Jupyter (8888), and model serving APIs (8000).

### Step 3: Select or Create a Blueprint

Blueprints are templates that define instance configurations. Visit the **Blueprints** page and choose from built-in options like GPU Training (p3.2xlarge with Deep Learning AMI), Large-scale Training (p3.8xlarge for distributed workloads), or Development (t3.large for code development). You can also create custom Blueprints with your specifications.

### Step 4: Launch Your Instance

Navigate to the **Instances** page, click **Plus (+)** to open the creation wizard, select your Project, Blueprint, and Security Configuration, review and confirm, then wait for the status badge to show **"operational"** with the green neonish border.

### Step 5: Connect via SSH

Once operational, click on your Instance card, copy the SSH connection command, open your terminal and paste the command, then start training your models!

## Navigation Tips

The header layout is standardized across all pages with title + refresh button, action bar (plus, pen, trashcan), search bar, and filter dropdown. Status badges use the modern neonish aesthetic with colored borders, text, and filled Circle icons. Card-based interfaces provide quick access to resources, and progressive disclosure means advanced options are hidden until needed.

## Best Practices for Beginners

1. **Start small**: Begin with a single Project and one Instance
2. **Use built-in resources**: Leverage built-in Blueprints and Security Configurations
3. **Tag everything**: Consistent tagging enables cost tracking
4. **Monitor the Dashboard**: Check operational status regularly
5. **Stop when idle**: Stop Instances when not in use to control costs

## Common Pitfalls

Avoid launching without security configuration, forgetting to stop instances (running = ongoing costs), using inconsistent naming, skipping tags, and ignoring regions (choose regions close to your data sources).

## Next Steps

Explore Module 2 (Projects & Instance Management), Module 3 (Blueprints for Rapid Provisioning), Module 4 (Security Groups & Network Isolation), and Module 6 (Distributed Model Training) to deepen your knowledge.`,
    keyPoints: [
      'Projects serve as logical groupings for related infrastructure',
      'Instances are individual compute resources within Projects',
      'The Dashboard provides operational status at a glance',
      'Multi-region support enables global infrastructure deployment',
      'Security configurations are reusable across resources'
    ],
    bestPractices: [
      'Create separate Projects for development, staging, and production environments',
      'Use descriptive naming conventions: project-env-purpose (e.g., vision-prod-training)',
      'Tag resources consistently for cost tracking and management',
      'Start with built-in Blueprints before creating custom ones',
      'Always configure security groups before launching instances',
      'Use the Dashboard to monitor operational status and resource health'
    ],
    codeExample: `# Typical Workflow in Pocket Architect

1. **Create a Project**
   - Navigate to Projects page
   - Click the Plus (+) button
   - Enter: Name, Description, Region
   - Apply tags for cost tracking

2. **Configure Security**
   - Go to Security page
   - Select a built-in security config or create custom
   - Define SSH access rules (port 22)
   - Add ports for services (TensorBoard: 6006, Jupyter: 8888)

3. **Select/Create Blueprint**
   - Visit Blueprints page
   - Choose GPU instance type (p3.2xlarge for training)
   - Select AMI (Deep Learning AMI recommended)
   - Configure storage (500GB+ for ML datasets)

4. **Launch Instance**
   - Navigate to Instances page
   - Click Plus (+) to create
   - Select Project, Blueprint, Security Config
   - Launch and wait for "operational" status

5. **Connect via SSH**
   - Copy SSH connection command from instance details
   - Connect: ssh -i key.pem ec2-user@instance-ip
   - Start training!`,
    resources: [
      { title: 'Pocket Architect Documentation', url: 'github.com/pocket-architect/docs' },
      { title: 'AWS EC2 Getting Started', url: 'docs.aws.amazon.com/ec2' },
      { title: 'SSH Key Management', url: 'docs.aws.amazon.com/ec2/keypairs' }
    ]
  },
  2: {
    overview: `# Projects & Instance Management

Understanding the relationship between Projects and Instances is fundamental to effectively managing your machine learning infrastructure in Pocket Architect. This module provides a deep dive into the unified architecture that makes resource organization intuitive and scalable.

## The Unified Architecture

Pocket Architect implements a two-tier architecture that separates **logical organization** from **physical resources**:

- **Projects**: Logical groupings that act as containers for related infrastructure
- **Instances**: Individual compute resources that perform actual workloads

This separation provides several key benefits:
- **Clear resource boundaries**: Know exactly which resources belong to which initiative
- **Simplified billing**: Track costs at the Project level
- **Team collaboration**: Share access and configurations within Projects
- **Lifecycle independence**: Manage Instance lifecycles without affecting Project structure

## Understanding Projects

### What is a Project?

A Project is a logical namespace for organizing related cloud infrastructure. Think of it as a folder or workspace that contains all resources for a specific ML initiative, research project, or application.

**Key characteristics of Projects:**
- Contain one or more Instances
- Have metadata (name, description, tags, region)
- Provide cost tracking and attribution
- Enable resource grouping and organization
- Support team collaboration workflows

### Project Organization Patterns

#### Pattern 1: By ML Initiative
Create one Project per major machine learning initiative:
- **vision-research-2025**: Computer vision research
- **nlp-production**: Production NLP models
- **recommendation-dev**: Recommendation system development

#### Pattern 2: By Environment
Separate Projects for different deployment environments:
- **ml-platform-dev**: Development and experimentation
- **ml-platform-staging**: Pre-production testing
- **ml-platform-prod**: Production workloads

#### Pattern 3: By Team or Department
Organize Projects by organizational structure:
- **research-team-ml**: Research team infrastructure
- **product-team-inference**: Product team inference services
- **data-eng-pipelines**: Data engineering pipelines

### Project Metadata

Each Project should have:
- **Descriptive name**: Use consistent naming conventions (e.g., \`team-purpose-env\`)
- **Clear description**: Document purpose, owner, and usage guidelines
- **Appropriate tags**: For cost tracking, department attribution, and resource management
- **Correct region**: Choose based on data locality and latency requirements

## Understanding Instances

### What is an Instance?

An Instance is an individual compute resource where your ML workloads actually run. Every Instance belongs to exactly one Project and represents a virtual machine with specific CPU, GPU, memory, and storage configurations.

**Key characteristics of Instances:**
- Belong to exactly one Project
- Have specific configurations (Blueprint)
- Can be in various states (see lifecycle below)
- Support SSH connectivity
- Incur costs while running

### Instance Lifecycle States

Instances progress through several states during their lifecycle:

1. **Provisioning**: Instance is being created and initialized
2. **Running**: Instance is active and ready for use
3. **Stopped**: Instance is paused (storage persists, no compute charges)
4. **Terminated**: Instance is permanently deleted (cannot be recovered)

Understanding these states is crucial for cost management. A **stopped** Instance retains all data and configuration but doesn't incur compute charges—only storage costs.

### Instance Types for ML Workloads

Different workloads require different Instance types:

**Training Instances:**
- **p3.2xlarge**: Single V100 GPU for small-medium models
- **p3.8xlarge**: 4x V100 GPUs for distributed training
- **p3.16xlarge**: 8x V100 GPUs for large-scale training
- **p4d.24xlarge**: 8x A100 GPUs for cutting-edge performance

**Development Instances:**
- **t3.large**: Code development, small experiments
- **t3.xlarge**: Data exploration, prototyping
- **c5.2xlarge**: CPU-intensive preprocessing

**Inference Instances:**
- **g5.xlarge**: Single GPU inference
- **g5.2xlarge**: Higher throughput inference
- **c5.large**: CPU-only lightweight inference

## SSH Connectivity

SSH is the primary method for accessing and managing Instances in Pocket Architect.

### SSH Key Management

1. **Generate key pairs**: Create SSH keys for secure access
2. **Upload to AWS**: Store public keys in your AWS account
3. **Configure security**: Ensure SSH (port 22) is enabled in Security Configurations
4. **Connect securely**: Use private keys to establish connections

### SSH Best Practices

- **Use one key per Project**: Simplifies access management
- **Store keys securely**: Never commit keys to version control
- **Use SSH config**: Create aliases for quick connections
- **Enable keep-alive**: Prevent connection timeouts during long jobs
- **Use tmux/screen**: Maintain persistent sessions

### SSH Config Example

Store connection details in \`~/.ssh/config\` for convenience:

\`\`\`
Host ml-train-1
    HostName 54.123.45.67
    User ec2-user
    IdentityFile ~/.ssh/ml-project-key.pem
    ServerAliveInterval 60
    ServerAliveCountMax 120
\`\`\`

Then connect simply with:
\`\`\`
ssh ml-train-1
\`\`\`

## Multi-Instance Deployments

For advanced ML workflows, you'll often need multiple Instances working together.

### Distributed Training Setup

Deploy multiple GPU Instances for distributed training:

**Project**: \`vision-distributed-training\`
- **Instance 1**: Master node (p3.8xlarge)
- **Instance 2-4**: Worker nodes (p3.8xlarge each)
- **Instance 5**: Data preprocessing (c5.4xlarge)

### Workflow Separation

Separate Instances for different workflow stages:

**Project**: \`nlp-pipeline-prod\`
- **data-ingestion**: ETL and preprocessing
- **training-primary**: Model training
- **validation**: Model evaluation
- **inference-api**: Production serving

## Lifecycle Management Best Practices

### Start/Stop Automation

**Problem**: Forgetting to stop Instances wastes money

**Solution**: Implement auto-stop policies
- Stop Instances after training completion
- Schedule automatic shutdown during off-hours
- Use monitoring alerts for idle Instances

### Instance Tagging Strategy

Tag every Instance with:
- **Project**: Which Project it belongs to
- **Purpose**: training, inference, development, preprocessing
- **Owner**: Who manages this Instance
- **Cost-center**: For billing attribution
- **Experiment-id**: For research reproducibility

### Monitoring and Alerts

Set up monitoring for:
- **State changes**: Alert when Instances start/stop
- **Resource utilization**: Notify on low GPU usage
- **Cost thresholds**: Warn when spending exceeds budget
- **Connection status**: Alert on SSH connectivity issues

## Cost Optimization

### Stop When Idle

The most effective cost optimization: **stop Instances when not in use**.

- Running Instance: Full hourly charges
- Stopped Instance: Only storage charges (~95% savings)

### Right-Sizing

Choose appropriate Instance types:
- Don't use p3.16xlarge for experimentation
- Start small, scale up when needed
- Use spot instances for fault-tolerant workloads

### Resource Cleanup

Regularly review and terminate:
- Completed experiments
- Unused development Instances
- Old test deployments

## Team Collaboration

### Shared Projects

Multiple team members can work within the same Project:
- Shared SSH keys for access
- Consistent naming conventions
- Documented Instance purposes
- Coordinated start/stop schedules

### Project Documentation

Maintain documentation in Project descriptions:
- Purpose and objectives
- Team members and contacts
- Important Instance details
- SSH access procedures
- Estimated costs and budgets

## Common Scenarios

### Scenario 1: ML Research Project

**Setup:**
- Create Project: \`vision-research-q1-2025\`
- Launch Instance: \`experiment-baseline\` (p3.2xlarge)
- Configure SSH and security
- Start training experiments
- Stop Instance between runs
- Document results in Project description

### Scenario 2: Production ML Service

**Setup:**
- Create Project: \`recommendation-service-prod\`
- Launch Instances:
  - \`api-server-1\` (g5.xlarge)
  - \`api-server-2\` (g5.xlarge) for redundancy
- Configure load balancing
- Set up monitoring and alerts
- Keep Instances running 24/7

### Scenario 3: Distributed Training

**Setup:**
- Create Project: \`large-model-training\`
- Launch Instances:
  - \`master\` (p3.8xlarge)
  - \`worker-1\` through \`worker-4\` (p3.8xlarge)
- Configure cluster networking
- Run distributed training job
- Stop all Instances after completion

## Troubleshooting

### Instance Won't Start

**Check:**
- AWS account limits
- Region capacity
- Security configuration
- Project status

### Can't Connect via SSH

**Check:**
- Instance state (must be "running")
- Security group allows port 22
- Correct SSH key
- Correct user (\`ec2-user\`, \`ubuntu\`, etc.)

### High Costs

**Check:**
- Running Instances that should be stopped
- Over-provisioned Instance types
- Unnecessary storage volumes
- Idle development Instances

## Summary

Mastering Projects and Instance management in Pocket Architect enables you to:
- Organize infrastructure logically
- Control costs effectively
- Collaborate with teams efficiently
- Scale ML workloads appropriately
- Maintain secure, reliable access

Remember: Projects provide structure, Instances provide compute. Use this separation to build organized, efficient ML infrastructure.`,
    keyPoints: [
      'Projects provide logical boundaries for resource organization',
      'Instances inherit Project-level configurations and tags',
      'Instance lifecycle: Provisioning → Running → Stopped → Terminated',
      'SSH connectivity is managed through key pairs and security groups',
      'Multi-instance deployments enable distributed training setups'
    ],
    bestPractices: [
      'Use one Project per major ML initiative or research area',
      'Group related instances (training, evaluation, inference) within Projects',
      'Stop instances when not in use to save costs',
      'Use consistent SSH key pairs across Project instances',
      'Tag instances with purpose: training, inference, development, experiment-id',
      'Set up monitoring alerts for instance state changes',
      'Document Project structure in descriptions for team collaboration'
    ],
    codeExample: `# Project Organization Example

**Project Structure:**
vision-research-2025/
├── training-primary (p3.8xlarge)     # Main training workload
├── training-secondary (p3.2xlarge)   # Hyperparameter tuning
├── data-prep (c5.4xlarge)            # Data preprocessing
└── inference-api (g5.xlarge)         # Model serving

# SSH Connection Management
# Store connection configs in ~/.ssh/config

Host vision-train-1
    HostName 54.123.45.67
    User ec2-user
    IdentityFile ~/.ssh/ml-research-key.pem
    ServerAliveInterval 60

Host vision-train-2
    HostName 54.123.45.68
    User ec2-user
    IdentityFile ~/.ssh/ml-research-key.pem
    ServerAliveInterval 60

# Quick connect
ssh vision-train-1

# Instance Lifecycle Script
#!/bin/bash
# Auto-stop instance after training completion

INSTANCE_ID="i-0123456789abcdef"
REGION="us-east-1"

# Training script
python train.py --epochs 100 --checkpoint-dir s3://bucket/models

# Check training success
if [ $? -eq 0 ]; then
    echo "Training complete, stopping instance..."
    aws ec2 stop-instances --instance-ids $INSTANCE_ID --region $REGION
else
    echo "Training failed, keeping instance running for debugging"
fi`,
    resources: [
      { title: 'EC2 Instance Lifecycle', url: 'docs.aws.amazon.com/ec2/lifecycle' },
      { title: 'SSH Config Best Practices', url: 'man.openbsd.org/ssh_config' },
      { title: 'AWS Resource Tagging', url: 'docs.aws.amazon.com/general/tagging' }
    ]
  },
  3: {
    overview: `# Blueprints for Rapid Provisioning

Blueprints are one of the most powerful features in Pocket Architect, enabling you to standardize infrastructure configuration and deploy compute resources in seconds instead of minutes. This module teaches you how to leverage Blueprints to accelerate your ML workflows while maintaining consistency and reducing errors.

## What are Blueprints?

A Blueprint is a reusable template that encapsulates all configuration needed to launch an Instance:

- **Instance Type**: CPU/GPU specifications (e.g., p3.2xlarge, g5.xlarge)
- **AMI (Amazon Machine Image)**: Operating system and pre-installed software
- **Storage Configuration**: Root volume, data volumes, sizes, and types
- **Networking**: Enhanced networking, placement groups, EFA
- **Additional Settings**: User data, IAM roles, monitoring

Think of Blueprints as "recipes" for infrastructure. Once defined, you can launch identical Instances repeatedly with a single click.

## Why Use Blueprints?

### Consistency
Every Instance launched from a Blueprint has identical configuration, eliminating "works on my machine" problems.

### Speed
Launch Instances in seconds without manually configuring settings each time.

### Standardization
Enforce organizational standards and best practices through approved Blueprint templates.

### Reproducibility
Ensure experiments are reproducible by using the same Blueprint across runs.

### Error Reduction
Pre-validated configurations reduce misconfigurations and deployment failures.

## Built-in vs Custom Blueprints

### Built-in Blueprints

Pocket Architect includes several production-ready Blueprints for common ML workloads:

**ML Training GPU** - General-purpose GPU training
- Instance: p3.2xlarge (1x V100 GPU)
- AMI: Deep Learning AMI (Ubuntu 20.04)
- Storage: 100GB root + 500GB data volume
- Use for: Most ML training workloads

**ML Training Large** - Large-scale distributed training
- Instance: p3.8xlarge (4x V100 GPUs)
- AMI: Deep Learning AMI with EFA
- Storage: 200GB root + 1TB data volume
- Use for: Large model training, distributed workloads

**ML Inference GPU** - Low-latency GPU inference
- Instance: g5.xlarge (1x A10G GPU)
- AMI: Deep Learning AMI (optimized)
- Storage: 50GB root + 100GB model cache
- Use for: Production inference serving

**Development** - Cost-effective development
- Instance: g4dn.xlarge (1x T4 GPU)
- AMI: Deep Learning AMI
- Storage: 100GB root + 200GB data
- Use for: Experimentation, code development

**CPU Training** - Non-GPU workloads
- Instance: c5.4xlarge (16 vCPUs)
- AMI: Ubuntu 22.04 with ML tools
- Storage: 100GB root + 300GB data
- Use for: Classical ML, data preprocessing

### Custom Blueprints

Create custom Blueprints when:
- You have specialized requirements
- You need specific software pre-installed
- You want to standardize team configurations
- Built-in Blueprints don't match your needs

**Important**: Built-in Blueprints cannot be modified. Create custom alternatives instead.

## Blueprint Anatomy

Let's dissect what makes up a Blueprint:

### Instance Type Selection

Choose based on your workload requirements:

**For Training:**
- **p3.2xlarge**: 1x V100, standard training ($3.06/hr)
- **p3.8xlarge**: 4x V100, distributed training ($12.24/hr)
- **p3.16xlarge**: 8x V100, large-scale training ($24.48/hr)
- **p4d.24xlarge**: 8x A100, cutting-edge performance ($32.77/hr)

**For Inference:**
- **g5.xlarge**: 1x A10G, cost-effective inference ($1.01/hr)
- **g5.2xlarge**: 1x A10G, higher memory ($1.21/hr)
- **g4dn.xlarge**: 1x T4, budget inference ($0.53/hr)

**For Development:**
- **t3.large**: CPU-only, basic development ($0.08/hr)
- **g4dn.xlarge**: Budget GPU development ($0.53/hr)
- **c5.2xlarge**: CPU-intensive preprocessing ($0.34/hr)

### AMI Selection

The AMI determines what software is available when the Instance starts:

**Deep Learning AMI (Ubuntu)** - Most popular
- Pre-installed: PyTorch, TensorFlow, CUDA, cuDNN
- Python 3.8+, Conda environments
- Jupyter, TensorBoard
- Best for: Most ML workloads

**Deep Learning AMI (Amazon Linux)** - AWS-optimized
- Similar software stack
- Optimized for AWS services
- Slightly better performance
- Best for: Production deployments

**Ubuntu 22.04 Base** - Clean slate
- Minimal software
- Install what you need
- Smaller AMI size
- Best for: Custom environments

**Custom AMIs** - Your own images
- Pre-configured with your tools
- Faster startup times
- Team-specific configurations
- Best for: Repeated deployments

### Storage Configuration

Storage is critical for ML workloads with large datasets:

**Root Volume** - Operating system and applications
- Typical size: 50-200GB
- Type: gp3 (general purpose SSD)
- Use for: OS, software, code

**Data Volume** - Datasets and model artifacts
- Typical size: 500GB-5TB
- Type: gp3 for most, io2 for high performance
- Mount at: /data, /datasets, /models
- Use for: Training data, checkpoints, outputs

**Volume Type Comparison:**
- **gp3**: General purpose, 3000 IOPS baseline, $0.08/GB-month
- **io2**: High performance, up to 64000 IOPS, $0.125/GB-month
- **st1**: Throughput optimized HDD, $0.045/GB-month (cold storage)

### Networking Configuration

**Standard Networking** - Default, suitable for most workloads
- Up to 10 Gbps bandwidth
- No additional cost
- Use for: Single-instance workloads

**Enhanced Networking** - Higher bandwidth
- Up to 100 Gbps (on supported instances)
- Included with modern instance types
- Use for: Data-intensive workloads

**Elastic Fabric Adapter (EFA)** - Ultra-low latency
- For distributed training
- Reduces inter-node communication latency
- Required for large-scale distributed workloads
- Use for: Multi-instance distributed training

## Creating Custom Blueprints

### When to Create Custom Blueprints

Create a custom Blueprint when you:
1. Launch the same configuration repeatedly
2. Want to enforce team standards
3. Need specific software pre-installed (custom AMI)
4. Require non-standard storage layouts
5. Have specialized networking requirements

### Blueprint Creation Workflow

**Step 1: Plan Your Configuration**
- Define instance type based on workload
- Select appropriate AMI
- Determine storage requirements
- Consider networking needs

**Step 2: Create in Pocket Architect**
1. Navigate to **Blueprints** page
2. Click **Plus (+)** button
3. Fill in the creation wizard:
   - **Name**: Use descriptive, versioned names
   - **Instance Type**: Choose from dropdown
   - **AMI**: Select or enter AMI ID
   - **Storage**: Configure volumes
   - **Networking**: Enable enhanced networking if needed
4. Review and save

**Step 3: Test Before Production**
- Launch a test Instance in a dev Project
- Verify configuration
- Test workload performance
- Validate storage mounting
- Confirm networking

**Step 4: Document and Share**
- Add description explaining Blueprint purpose
- Document recommended use cases
- Share with team
- Version appropriately

### Blueprint Naming Conventions

Use consistent naming for clarity:

**Pattern**: \`{purpose}-{size}-{version}\`

Examples:
- \`training-small-v1\`: Small training workload, version 1
- \`training-large-v2\`: Large training, version 2 (updated)
- \`inference-gpu-v1\`: GPU inference serving
- \`dev-gpu-v1\`: Development with GPU
- \`preprocessing-cpu-v1\`: CPU-only data preprocessing

### Blueprint Versioning

As requirements evolve, create new Blueprint versions:

**Version 1**: Initial configuration
- Name: \`bert-training-v1\`
- Instance: p3.2xlarge
- Storage: 500GB

**Version 2**: Increased storage
- Name: \`bert-training-v2\`
- Instance: p3.2xlarge
- Storage: 1TB (updated)

**Version 3**: Upgraded instance
- Name: \`bert-training-v3\`
- Instance: p3.8xlarge (upgraded)
- Storage: 1TB

Never modify existing Blueprints used in production. Create new versions instead to maintain reproducibility.

## Blueprint Design Patterns

### Pattern 1: Training Blueprint Family

Create a family of related training Blueprints:

- **training-small-v1**: p3.2xlarge, 500GB, small models
- **training-medium-v1**: p3.8xlarge, 1TB, medium models
- **training-large-v1**: p3.16xlarge, 2TB, large models
- **training-xlarge-v1**: p4d.24xlarge, 5TB, cutting-edge

### Pattern 2: Workflow-Specific Blueprints

Design Blueprints for each workflow stage:

- **data-prep-v1**: c5.4xlarge, 1TB, ETL and preprocessing
- **training-v1**: p3.8xlarge, 1TB, model training
- **evaluation-v1**: g5.xlarge, 200GB, model evaluation
- **inference-v1**: g5.xlarge, 100GB, production serving

### Pattern 3: Framework-Specific Blueprints

Optimize for specific ML frameworks:

- **pytorch-training-v1**: PyTorch-optimized AMI and config
- **tensorflow-training-v1**: TensorFlow-optimized setup
- **jax-training-v1**: JAX and TPU-ready configuration

### Pattern 4: Team-Specific Blueprints

Create Blueprints for different teams:

- **research-gpu-v1**: Flexible config for research
- **product-inference-v1**: Production-ready inference
- **dataeng-pipeline-v1**: Data engineering workflows

## Common Blueprint Configurations

### Computer Vision Training
\`\`\`
Instance: p3.8xlarge (4x V100 GPUs)
AMI: Deep Learning AMI (Ubuntu 20.04)
Root Volume: 100GB gp3
Data Volume: 2TB gp3 (for ImageNet-scale datasets)
Network: Enhanced networking
Use case: Training ResNet, EfficientNet, Vision Transformers
\`\`\`

### NLP Model Training
\`\`\`
Instance: p3.2xlarge (1x V100 GPU)
AMI: Deep Learning AMI with transformers pre-installed
Root Volume: 100GB gp3
Data Volume: 500GB gp3
Network: Standard
Use case: Fine-tuning BERT, GPT, T5 models
\`\`\`

### Large Language Model Training
\`\`\`
Instance: p4d.24xlarge (8x A100 GPUs)
AMI: Deep Learning AMI with DeepSpeed
Root Volume: 200GB gp3
Data Volume: 5TB gp3
Network: EFA enabled
Use case: Pre-training large transformers, GPT-style models
\`\`\`

### Real-Time Inference
\`\`\`
Instance: g5.xlarge (1x A10G GPU)
AMI: Deep Learning AMI (inference optimized)
Root Volume: 50GB gp3
Model Cache: 100GB gp3
Network: Enhanced networking
Use case: Low-latency REST API serving
\`\`\`

### Batch Inference
\`\`\`
Instance: p3.2xlarge (1x V100 GPU)
AMI: Deep Learning AMI
Root Volume: 100GB gp3
Input/Output Volume: 1TB gp3
Network: Standard
Use case: Processing large batches of data
\`\`\`

### Development & Experimentation
\`\`\`
Instance: g4dn.xlarge (1x T4 GPU)
AMI: Deep Learning AMI
Root Volume: 100GB gp3
Data Volume: 200GB gp3
Network: Standard
Use case: Code development, small experiments
\`\`\`

## Blueprint Selection Decision Tree

**Start here**: What's your primary workload?

**Training**:
- Small model (<1B params) → training-small-v1 (p3.2xlarge)
- Medium model (1-10B params) → training-medium-v1 (p3.8xlarge)
- Large model (>10B params) → training-large-v1 (p4d.24xlarge)

**Inference**:
- Real-time API → inference-gpu-v1 (g5.xlarge)
- Batch processing → inference-batch-v1 (p3.2xlarge)
- CPU-only → inference-cpu-v1 (c5.2xlarge)

**Development**:
- With GPU → dev-gpu-v1 (g4dn.xlarge)
- CPU only → dev-cpu-v1 (t3.large)

**Data Processing**:
- ETL/preprocessing → data-prep-v1 (c5.4xlarge)

## Advanced Blueprint Features

### User Data Scripts

Add startup scripts to Blueprints for automatic configuration:

\`\`\`bash
#!/bin/bash
# Clone training repo
cd /home/ec2-user
git clone https://github.com/your-org/ml-training.git

# Install dependencies
pip install -r ml-training/requirements.txt

# Mount S3 bucket
s3fs my-datasets /data -o iam_role=auto
\`\`\`

### IAM Roles

Attach IAM roles to Blueprints for AWS service access:
- S3 access for datasets
- ECR access for Docker images
- CloudWatch for metrics
- Secrets Manager for credentials

### Placement Groups

For distributed training, use placement groups:
- **Cluster**: Low latency, high bandwidth
- **Partition**: Fault isolation
- **Spread**: Maximum availability

## Best Practices Summary

1. **Start with built-ins**: Test built-in Blueprints before creating custom ones
2. **Version everything**: Use versioned naming (v1, v2, v3)
3. **Document thoroughly**: Explain purpose and use cases
4. **Test before sharing**: Validate in dev before production
5. **Review storage needs**: ML workloads need substantial storage
6. **Consider costs**: Larger instances = higher costs
7. **Use Deep Learning AMIs**: Save time with pre-installed frameworks
8. **Plan for growth**: Design Blueprint families for scaling

## Troubleshooting

### Blueprint Launch Fails
- Check AWS account limits
- Verify AMI availability in region
- Confirm instance type availability
- Review storage quotas

### Instance Runs Out of Storage
- Increase data volume size in Blueprint
- Use S3 for large datasets
- Clean up old checkpoints regularly

### Slow Training Performance
- Ensure correct instance type (GPU needed)
- Verify CUDA drivers installed
- Check data loading bottlenecks
- Consider enhanced networking

## Summary

Blueprints are the key to efficient infrastructure management in Pocket Architect. They provide:
- **Speed**: Deploy in seconds
- **Consistency**: Identical configurations
- **Reproducibility**: Exact environment recreation
- **Standardization**: Enforced best practices

Master Blueprints to accelerate your ML workflows while maintaining quality and reducing errors.`,
    keyPoints: [
      'Blueprints are immutable templates for instance configuration',
      'Built-in Blueprints cannot be edited (create custom alternatives instead)',
      'Custom Blueprints enable specialized ML infrastructure patterns',
      'Blueprint versioning supports infrastructure evolution',
      'Blueprints can be shared across Projects'
    ],
    bestPractices: [
      'Start with built-in "ML Training GPU" Blueprint for standard workloads',
      'Create custom Blueprints for repeated infrastructure patterns',
      'Version Blueprint names: ml-training-v1, ml-training-v2',
      'Document Blueprint purpose and recommended use cases',
      'Include sufficient storage in Blueprints (500GB+ for ML)',
      'Use Deep Learning AMIs for pre-installed ML frameworks',
      'Test custom Blueprints in development Projects before production',
      'Create separate Blueprints for training vs inference workloads'
    ],
    codeExample: `# Blueprint Design Patterns

**Standard Training Blueprint:**
- Instance Type: p3.2xlarge (V100 GPU, 8 vCPU, 61GB RAM)
- AMI: Deep Learning AMI (Ubuntu 20.04)
- Root Volume: 100GB gp3
- Data Volume: 500GB gp3 (mounted at /data)
- Network: Enhanced networking enabled

**Large-Scale Training Blueprint:**
- Instance Type: p3.8xlarge (4x V100 GPUs)
- AMI: Deep Learning AMI with EFA support
- Root Volume: 200GB gp3
- Data Volume: 1TB gp3 + S3 mounting
- Network: EFA enabled for multi-node

**Inference Serving Blueprint:**
- Instance Type: g5.xlarge (NVIDIA A10G)
- AMI: Deep Learning AMI (optimized)
- Root Volume: 50GB gp3
- Model Cache: 100GB gp3
- Network: Standard networking

**Development Blueprint:**
- Instance Type: g4dn.xlarge (T4 GPU)
- AMI: Deep Learning AMI
- Root Volume: 100GB gp3
- Data Volume: 200GB gp3
- Network: Standard networking

# Custom Blueprint Creation Workflow
1. Go to Blueprints page
2. Click Plus (+) button
3. Fill in configuration:
   - Name: "custom-bert-training-v1"
   - Instance Type: p3.2xlarge
   - AMI: ami-0abcdef1234567890 (Deep Learning AMI)
   - Storage: 100GB root + 500GB data
4. Save and use in Instance creation

# Terraform-Style Blueprint Definition
# (for documentation/reference)
resource "pocket_architect_blueprint" "bert_training" {
  name          = "custom-bert-training-v1"
  instance_type = "p3.2xlarge"
  ami_id        = "ami-0abcdef1234567890"
  
  root_volume {
    size = 100
    type = "gp3"
  }
  
  data_volume {
    size       = 500
    type       = "gp3"
    mount_path = "/data"
  }
}`,
    resources: [
      { title: 'AWS Deep Learning AMIs', url: 'aws.amazon.com/machine-learning/amis' },
      { title: 'EC2 Instance Types', url: 'aws.amazon.com/ec2/instance-types' },
      { title: 'EBS Volume Types', url: 'docs.aws.amazon.com/ebs/volume-types' }
    ]
  },
  4: {
    overview: `Security configurations in Pocket Architect define network access rules for your instances. They implement AWS Security Groups to control inbound and outbound traffic. Proper security configuration is essential for protecting ML workloads while enabling necessary access for development and deployment. The principle of least privilege should guide all security decisions.`,
    keyPoints: [
      'Security configs control network traffic via port and IP rules',
      'SSH access (port 22) is fundamental for remote management',
      'Service ports must be explicitly opened (TensorBoard, Jupyter, etc.)',
      'Built-in configs provide baseline security patterns',
      'Custom security configs enable specialized access requirements'
    ],
    bestPractices: [
      'Restrict SSH access to known IP addresses, never use 0.0.0.0/0 in production',
      'Use VPN or bastion hosts for production environment access',
      'Open only required ports: SSH (22), TensorBoard (6006), Jupyter (8888)',
      'Use security groups as firewalls, not instance-level iptables',
      'Create separate security configs for dev/staging/prod environments',
      'Document who needs access and why in security config descriptions',
      'Regularly audit security group rules',
      'Use SSH key-based auth, never password-based'
    ],
    codeExample: `# Security Configuration Examples

**Development Security Config:**
Name: dev-ml-workstation
Description: Development environment with full access
Rules:
  - SSH (22): Your IP only (203.0.113.0/32)
  - TensorBoard (6006): Your IP
  - Jupyter (8888): Your IP
  - HTTP (80): Your IP (for web demos)
  - HTTPS (443): Your IP

**Production Training Security Config:**
Name: prod-training-isolated
Description: Production training with restricted access
Rules:
  - SSH (22): VPN subnet (10.0.0.0/24)
  - TensorBoard (6006): VPN subnet
  - All Outbound: Allow (for S3, PyPI access)

**Distributed Training Security Config:**
Name: multi-node-training
Description: Allows inter-node communication
Rules:
  - SSH (22): VPN subnet
  - All TCP (0-65535): Same security group (for NCCL)
  - All Outbound: Allow

**Inference API Security Config:**
Name: inference-public-api
Description: Public-facing inference endpoint
Rules:
  - SSH (22): Bastion host only (10.0.1.50/32)
  - HTTPS (443): Internet (0.0.0.0/0)
  - HTTP (80): Internet (0.0.0.0/0) → redirect to HTTPS

# SSH Access Pattern with Bastion
# Network Architecture:
#   Internet → Bastion Host → Training Instances
#   (public IP)   (10.0.1.50)   (10.0.2.x)

# ~/.ssh/config
Host bastion
    HostName bastion.example.com
    User admin
    IdentityFile ~/.ssh/bastion-key.pem

Host training-*
    ProxyJump bastion
    User ec2-user
    IdentityFile ~/.ssh/ml-key.pem
    
# Connect through bastion
ssh training-1  # Automatically proxies through bastion

# Security Group Audit Script
#!/bin/bash
echo "Reviewing security groups for overly permissive rules..."
aws ec2 describe-security-groups \\
  --filters "Name=group-name,Values=*ml*" \\
  --query "SecurityGroups[?IpPermissions[?IpRanges[?CidrIp=='0.0.0.0/0']]]" \\
  --output table`,
    resources: [
      { title: 'AWS Security Groups', url: 'docs.aws.amazon.com/vpc/security-groups' },
      { title: 'SSH Bastion Hosts', url: 'aws.amazon.com/quickstart/architecture/bastion' },
      { title: 'VPC Network Design', url: 'docs.aws.amazon.com/vpc/design' }
    ]
  },
  5: {
    overview: `Pocket Architect supports multi-platform deployment across AWS regions, with planned support for GCP and Azure. Strategic region selection impacts latency, data sovereignty, cost, and availability. This module covers best practices for leveraging Pocket Architect's multi-region capabilities to build globally distributed ML infrastructure while managing complexity and costs.`,
    keyPoints: [
      'Region selection affects latency to data sources and users',
      'Different regions have different instance availability and pricing',
      'Data transfer between regions incurs costs',
      'Multi-region deployment enables disaster recovery',
      'Compliance requirements may mandate specific regions'
    ],
    bestPractices: [
      'Choose regions close to your data sources to minimize transfer costs',
      'Use us-east-1 or us-west-2 for broadest instance type availability',
      'Consider EU regions (eu-west-1, eu-central-1) for GDPR compliance',
      'Deploy inference endpoints in multiple regions for low latency',
      'Keep training in one region, inference in multiple regions',
      'Use S3 Cross-Region Replication for disaster recovery',
      'Monitor cross-region data transfer costs carefully',
      'Test instance availability in target regions before commitment'
    ],
    codeExample: `# Multi-Region Deployment Strategy

**Training (Single Region):**
Region: us-west-2 (Oregon)
Reason: Lowest GPU instance costs, close to S3 data lake
Setup:
  - Project: vision-training-west
  - Instances: 4x p3.8xlarge
  - Data: S3 bucket in us-west-2

**Inference (Multi-Region):**
Region 1: us-east-1 (N. Virginia) - North America
Region 2: eu-west-1 (Ireland) - Europe  
Region 3: ap-southeast-1 (Singapore) - Asia
Setup per region:
  - Project: vision-inference-{region}
  - Instances: 2x g5.xlarge (auto-scaling)
  - Models: Replicated from training region

# Cross-Region Data Replication
# S3 bucket configuration for disaster recovery

# Training region (us-west-2)
aws s3api put-bucket-replication \\
  --bucket ml-training-usw2 \\
  --replication-configuration file://replication.json

# replication.json
{
  "Role": "arn:aws:iam::account:role/s3-replication",
  "Rules": [{
    "Status": "Enabled",
    "Priority": 1,
    "Destination": {
      "Bucket": "arn:aws:s3:::ml-training-use1",
      "ReplicationTime": {
        "Status": "Enabled",
        "Time": { "Minutes": 15 }
      }
    },
    "Filter": { "Prefix": "models/" }
  }]
}

# Region Selection Decision Matrix
+---------------+----------+----------+---------------+
| Region        | GPU Cost | Latency  | Data Residency|
+---------------+----------+----------+---------------+
| us-east-1     | Medium   | Low (US) | US            |
| us-west-2     | Low      | Low (US) | US            |
| eu-west-1     | High     | Low (EU) | EU (GDPR)     |
| ap-south-1    | Medium   | Low (IN) | India         |
+---------------+----------+----------+---------------+

# Pocket Architect Multi-Region Workflow
1. **Primary Training Region**
   - Create Project in us-west-2
   - Launch training instances
   - Store models in S3

2. **Inference Regions**
   - Create Projects in us-east-1, eu-west-1, ap-southeast-1
   - Replicate models from training S3
   - Launch inference instances per region
   - Configure Route53 geo-routing

3. **Monitoring & Management**
   - Use Dashboard to view all regions
   - Filter by region for focused management
   - Set up CloudWatch cross-region dashboards`,
    resources: [
      { title: 'AWS Global Infrastructure', url: 'aws.amazon.com/about-aws/global-infrastructure' },
      { title: 'S3 Cross-Region Replication', url: 'docs.aws.amazon.com/s3/crr' },
      { title: 'Route53 Geo-Routing', url: 'docs.aws.amazon.com/route53/geo-routing' }
    ]
  },
  6: {
    overview: `Distributed training is essential for training large models that don't fit on a single GPU or when you need to reduce training time. This module covers the fundamental approaches to distributing your ML workload across multiple devices and nodes using PyTorch DDP, Horovod, and DeepSpeed.`,
    keyPoints: [
      'Data Parallelism replicates the model across GPUs, splitting data batches',
      'Model Parallelism splits the model itself across GPUs when it\'s too large',
      'Pipeline Parallelism combines both approaches for maximum efficiency',
      'Communication overhead can be the bottleneck in distributed training',
      'Fault tolerance requires proper checkpointing and recovery mechanisms'
    ],
    bestPractices: [
      'Use gradient accumulation to simulate larger batch sizes with limited memory',
      'Implement efficient all-reduce operations (NCCL for NVIDIA GPUs)',
      'Monitor GPU utilization to identify bottlenecks',
      'Use mixed precision training (FP16/BF16) to reduce memory and increase speed',
      'Save checkpoints to durable storage (S3) with versioning',
      'Implement exponential backoff for node failures in long-running jobs',
      'Use EFA (Elastic Fabric Adapter) for multi-node AWS training',
      'Profile communication patterns to optimize data parallel strategy'
    ],
    codeExample: `# PyTorch Distributed Data Parallel Example
import torch
import torch.distributed as dist
from torch.nn.parallel import DistributedDataParallel as DDP

# Initialize process group
dist.init_process_group(backend='nccl')
local_rank = int(os.environ['LOCAL_RANK'])
torch.cuda.set_device(local_rank)

# Wrap model with DDP
model = YourModel().cuda(local_rank)
model = DDP(model, device_ids=[local_rank])

# Use DistributedSampler for data loading
train_sampler = torch.utils.data.distributed.DistributedSampler(
    train_dataset,
    num_replicas=dist.get_world_size(),
    rank=dist.get_rank()
)

train_loader = DataLoader(
    train_dataset,
    batch_size=batch_size,
    sampler=train_sampler
)

# Training loop with checkpointing
for epoch in range(num_epochs):
    train_sampler.set_epoch(epoch)
    
    for batch in train_loader:
        outputs = model(batch)
        loss = criterion(outputs, labels)
        loss.backward()
        optimizer.step()
        optimizer.zero_grad()
    
    # Save checkpoint from rank 0 only
    if dist.get_rank() == 0:
        checkpoint = {
            'epoch': epoch,
            'model_state_dict': model.module.state_dict(),
            'optimizer_state_dict': optimizer.state_dict(),
        }
        torch.save(checkpoint, f's3://bucket/checkpoints/epoch_{epoch}.pt')

# Launch script for Pocket Architect instances
# launch_distributed.sh
#!/bin/bash
MASTER_ADDR=$(hostname -i)
MASTER_PORT=29500
WORLD_SIZE=4  # Total number of GPUs

torchrun \\
    --nproc_per_node=4 \\
    --nnodes=1 \\
    --master_addr=$MASTER_ADDR \\
    --master_port=$MASTER_PORT \\
    train.py`,
    resources: [
      { title: 'PyTorch Distributed Tutorial', url: 'pytorch.org/tutorials/distributed' },
      { title: 'Horovod Documentation', url: 'horovod.readthedocs.io' },
      { title: 'DeepSpeed Library', url: 'deepspeed.ai' },
      { title: 'AWS EFA for ML', url: 'aws.amazon.com/hpc/efa' }
    ]
  },
  7: {
    overview: `Choosing the right GPU instance is critical for ML performance and cost efficiency. Different instance families are optimized for different workloads, from training to inference. This module helps you select optimal instances for your ML workloads using Pocket Architect's Blueprint system.`,
    keyPoints: [
      'P instances (P4, P5) offer the highest training performance with A100/H100 GPUs',
      'G instances provide cost-effective graphics workloads and light ML inference',
      'Inf instances use AWS Inferentia chips optimized for inference at low cost',
      'Spot instances can reduce costs by 70-90% for fault-tolerant training',
      'GPU memory is often the limiting factor, not compute'
    ],
    bestPractices: [
      'Profile your workload to determine GPU memory requirements',
      'Use p3.2xlarge (V100 16GB) for most training workloads',
      'Use p3.8xlarge (4x V100) for large models or faster training',
      'Consider g5 instances for inference and smaller training jobs',
      'Implement checkpointing to use Spot instances safely',
      'Monitor GPU utilization with nvidia-smi or CloudWatch',
      'Use EFA (Elastic Fabric Adapter) for multi-node communication',
      'Create separate Blueprints for training vs inference instances'
    ],
    codeExample: `# GPU Instance Selection Guide

**Development & Experimentation:**
Instance: g4dn.xlarge
GPU: NVIDIA T4 (16GB)
Cost: ~$0.526/hr
Use: Code development, small model training

**Standard Training:**
Instance: p3.2xlarge
GPU: NVIDIA V100 (16GB)
Cost: ~$3.06/hr
Use: Most ML training workloads

**Large-Scale Training:**
Instance: p3.8xlarge
GPU: 4x NVIDIA V100 (64GB total)
Cost: ~$12.24/hr
Use: Large models, multi-GPU training

**Production Inference:**
Instance: g5.xlarge
GPU: NVIDIA A10G (24GB)
Cost: ~$1.006/hr
Use: Real-time inference serving

# GPU Monitoring Script
import subprocess
import boto3
import time

def monitor_gpu_utilization():
    """Monitor and log GPU metrics"""
    result = subprocess.run(
        ['nvidia-smi', '--query-gpu=utilization.gpu,memory.used,memory.total,temperature.gpu',
         '--format=csv,noheader,nounits'],
        capture_output=True, text=True
    )
    
    cloudwatch = boto3.client('cloudwatch')
    
    for i, line in enumerate(result.stdout.strip().split('\\n')):
        util, mem_used, mem_total, temp = line.split(', ')
        
        # Log to console
        print(f"GPU {'{'}i{'}'}: {'{'}util{'}'}% util, {'{'}mem_used{'}'}/{'{'}mem_total{'}'}MB, {'{'}temp{'}'}°C")
        
        # Send to CloudWatch
        cloudwatch.put_metric_data(
            Namespace='PocketArchitect/GPU',
            MetricData=[
                {
                    'MetricName': 'GPUUtilization',
                    'Value': float(util),
                    'Unit': 'Percent',
                    'Dimensions': [{'Name': 'GPU', 'Value': str(i)}]
                },
                {
                    'MetricName': 'GPUMemoryUsed',
                    'Value': float(mem_used),
                    'Unit': 'Megabytes',
                    'Dimensions': [{'Name': 'GPU', 'Value': str(i)}]
                }
            ]
        )

# Run continuously
while True:
    monitor_gpu_utilization()
    time.sleep(60)

# Spot Instance Strategy
# Use Pocket Architect to launch with spot pricing
# Ensure checkpointing for fault tolerance

def train_with_spot_recovery():
    """Training loop with spot interruption handling"""
    checkpoint_path = 's3://bucket/checkpoints/latest.pt'
    
    # Load checkpoint if exists
    if s3_object_exists(checkpoint_path):
        checkpoint = load_from_s3(checkpoint_path)
        model.load_state_dict(checkpoint['model'])
        start_epoch = checkpoint['epoch'] + 1
    else:
        start_epoch = 0
    
    for epoch in range(start_epoch, num_epochs):
        try:
            train_one_epoch(model, train_loader)
            
            # Save checkpoint every epoch
            save_to_s3({
                'epoch': epoch,
                'model': model.state_dict()
            }, checkpoint_path)
            
        except KeyboardInterrupt:
            print("Spot interruption detected, saving checkpoint...")
            save_to_s3({'epoch': epoch, 'model': model.state_dict()}, checkpoint_path)
            break`,
    resources: [
      { title: 'AWS EC2 Instance Types', url: 'aws.amazon.com/ec2/instance-types' },
      { title: 'GPU Instance Pricing', url: 'instances.vantage.sh' },
      { title: 'NVIDIA Data Center GPUs', url: 'nvidia.com/data-center' },
      { title: 'Spot Instance Best Practices', url: 'aws.amazon.com/ec2/spot' }
    ]
  },
  8: {
    overview: `Headless training enables fully automated ML workflows without GUI dependencies. This approach is essential for production ML systems, CI/CD pipelines, and long-running experiments on remote servers. With Pocket Architect instances, you'll primarily work through SSH connections to manage training.`,
    keyPoints: [
      'SSH is the primary interface for remote headless training',
      'Tmux/Screen keep training sessions alive after disconnection',
      'Docker containers ensure reproducible training environments',
      'Remote monitoring tools provide visibility without GUI',
      'Automated logging captures all experiment data'
    ],
    bestPractices: [
      'Use tmux or screen to persist training sessions across SSH disconnects',
      'Configure SSH keepalive to prevent connection timeouts',
      'Implement structured logging (JSON format) for easy parsing',
      'Use TensorBoard with SSH port forwarding for remote visualization',
      'Set up automated email/Slack notifications for training completion',
      'Store logs and checkpoints on S3 for durability',
      'Use systemd services for auto-restart on instance reboot',
      'Create startup scripts in Blueprints for automated environment setup'
    ],
    codeExample: `# Headless Training Setup for Pocket Architect

# 1. SSH into instance (get command from Pocket Architect)
ssh -i ml-key.pem ec2-user@54.123.45.67

# 2. Start tmux session
tmux new-session -s training

# 3. Setup environment
source ~/miniconda3/bin/activate
conda activate pytorch

# 4. Start training with logging
python train.py \\
  --config configs/experiment_001.yaml \\
  --output-dir s3://my-bucket/experiments/001 \\
  --tensorboard-dir /tmp/tb \\
  2>&1 | tee training.log &

# 5. Detach from tmux (Ctrl+B, then D)
# Training continues in background

# 6. Setup SSH tunnel for TensorBoard (local machine)
ssh -i ml-key.pem -L 6006:localhost:6006 ec2-user@54.123.45.67

# 7. Reattach to monitor progress
tmux attach -t training

# Python Training Script with Notifications
import logging
import boto3
from torch.utils.tensorboard import SummaryWriter

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('training.log'),
        logging.StreamHandler()
    ]
)

# TensorBoard
writer = SummaryWriter('/tmp/tb')

# SNS for notifications
sns = boto3.client('sns')
TOPIC_ARN = 'arn:aws:sns:us-east-1:account:ml-training-alerts'

def send_notification(message, subject):
    """Send training status notification"""
    sns.publish(
        TopicArn=TOPIC_ARN,
        Message=message,
        Subject=subject
    )

# Training loop
try:
    for epoch in range(num_epochs):
        train_loss = train_one_epoch(model, train_loader)
        val_loss = validate(model, val_loader)
        
        writer.add_scalar('Loss/train', train_loss, epoch)
        writer.add_scalar('Loss/val', val_loss, epoch)
        
        # Save to S3
        if epoch % 10 == 0:
            checkpoint_path = f'/tmp/checkpoint_epoch_{epoch}.pt'
            torch.save(model.state_dict(), checkpoint_path)
            
            s3 = boto3.client('s3')
            s3.upload_file(
                checkpoint_path,
                'my-bucket',
                f'experiments/001/checkpoints/epoch_{epoch}.pt'
            )
        
        logging.info(f'Epoch {epoch}: train={train_loss:.4f}, val={val_loss:.4f}')
    
    send_notification(
        "Training completed successfully!",
        "ML Training Complete"
    )
    
except Exception as e:
    logging.error(f"Training failed: {e}")
    send_notification(
        f"Training failed with error: {e}",
        "ML Training Failed"
    )
    raise

writer.close()

# Automated Startup Script
# Add to Pocket Architect Blueprint user data
#!/bin/bash
# /etc/init.d/training-setup

# Mount data volume
mkdir -p /data
mount /dev/nvme1n1 /data

# Setup environment
sudo -u ec2-user bash << 'EOF'
cd /home/ec2-user
source miniconda3/bin/activate

# Clone training code
git clone https://github.com/myorg/ml-training.git
cd ml-training

# Install dependencies
pip install -r requirements.txt

# Start TensorBoard
tensorboard --logdir=/tmp/tb --host=0.0.0.0 --port=6006 &

echo "Environment ready for training"
EOF`,
    resources: [
      { title: 'Tmux Cheat Sheet', url: 'tmuxcheatsheet.com' },
      { title: 'SSH Port Forwarding', url: 'man.openbsd.org/ssh' },
      { title: 'AWS SNS Notifications', url: 'docs.aws.amazon.com/sns' },
      { title: 'EC2 User Data Scripts', url: 'docs.aws.amazon.com/ec2/user-data' }
    ]
  },
  9: {
    overview: `Efficient data pipelines are crucial for ML training performance. Poor data loading can cause GPU idle time, wasting expensive compute resources. This module covers designing scalable data architectures that keep your GPUs fed with data while managing storage costs effectively on AWS.`,
    keyPoints: [
      'Data loading should never be the bottleneck in training',
      'S3 provides virtually unlimited storage for ML datasets',
      'Data versioning enables reproducible experiments',
      'Feature stores centralize feature engineering logic',
      'Streaming enables training on datasets larger than disk'
    ],
    bestPractices: [
      'Use multi-threaded data loaders (PyTorch num_workers)',
      'Prefetch data to overlap I/O with computation',
      'Store preprocessed data in optimized formats (Parquet, TFRecord)',
      'Use Instance Store volumes for temporary high-speed storage',
      'Mount S3 with s3fs or use streaming datasets',
      'Partition large datasets for parallel loading',
      'Implement data validation to catch corruption early',
      'Cache frequently accessed data on EBS volumes'
    ],
    codeExample: `# Efficient S3 Data Pipeline for Pocket Architect

import boto3
import s3fs
from torch.utils.data import Dataset, DataLoader
import pyarrow.parquet as pq

class S3StreamingDataset(Dataset):
    """Stream data directly from S3"""
    
    def __init__(self, s3_prefix):
        self.s3 = s3fs.S3FileSystem()
        self.files = sorted(self.s3.glob(f'{s3_prefix}/**/*.parquet'))
        
        # Calculate total samples
        self.file_offsets = [0]
        for f in self.files:
            metadata = pq.read_metadata(self.s3.open(f))
            self.file_offsets.append(
                self.file_offsets[-1] + metadata.num_rows
            )
    
    def __len__(self):
        return self.file_offsets[-1]
    
    def __getitem__(self, idx):
        # Binary search to find file
        file_idx = self._find_file(idx)
        row_idx = idx - self.file_offsets[file_idx]
        
        # Read specific row
        table = pq.read_table(
            self.s3.open(self.files[file_idx]),
            columns=['features', 'label']
        )
        row = table.slice(row_idx, 1).to_pydict()
        
        return torch.tensor(row['features'][0]), row['label'][0]
    
    def _find_file(self, idx):
        left, right = 0, len(self.file_offsets) - 1
        while left < right:
            mid = (left + right) // 2
            if self.file_offsets[mid] <= idx < self.file_offsets[mid + 1]:
                return mid
            elif idx < self.file_offsets[mid]:
                right = mid
            else:
                left = mid + 1
        return left

# Optimized DataLoader configuration
dataset = S3StreamingDataset('s3://my-bucket/training-data')
loader = DataLoader(
    dataset,
    batch_size=64,
    num_workers=8,          # Parallel loading
    prefetch_factor=4,      # Prefetch batches
    persistent_workers=True, # Keep workers alive
    pin_memory=True         # Faster GPU transfer
)

# Data Pipeline Performance Monitoring
import time

def train_with_metrics():
    data_time = 0
    compute_time = 0
    
    for epoch in range(num_epochs):
        epoch_start = time.time()
        
        for batch_idx, (data, target) in enumerate(loader):
            batch_start = time.time()
            
            # Transfer to GPU
            data, target = data.cuda(), target.cuda()
            
            # Training step
            output = model(data)
            loss = criterion(output, target)
            loss.backward()
            optimizer.step()
            optimizer.zero_grad()
            
            compute_time += time.time() - batch_start
            
            if batch_idx % 100 == 0:
                efficiency = compute_time / (time.time() - epoch_start) * 100
                print(f"GPU utilization: {'{'}efficiency:.1f{'}'}%")
                
                if efficiency < 80:
                    print("WARNING: Data loading bottleneck detected!")

# S3 Data Organization Best Practices
# s3://my-bucket/ml-datasets/
# ├── raw/                    # Original data
# │   └── images/
# │       ├── train/
# │       └── val/
# ├── processed/              # Preprocessed features
# │   ├── train/
# │   │   ├── part-0000.parquet
# │   │   ├── part-0001.parquet
# │   │   └── ...
# │   └── val/
# └── metadata/
#     ├── train_stats.json
#     └── class_weights.json

# Data Preprocessing Script (run once)
def preprocess_and_upload():
    """Preprocess data and upload to S3 in optimized format"""
    import pandas as pd
    
    # Process in chunks
    chunk_size = 10000
    for i, chunk in enumerate(pd.read_csv('raw_data.csv', chunksize=chunk_size)):
        # Feature engineering
        features = extract_features(chunk)
        
        # Save as parquet
        output_path = f'processed/part-{i:04d}.parquet'
        features.to_parquet(output_path, compression='snappy')
        
        # Upload to S3
        s3 = boto3.client('s3')
        s3.upload_file(
            output_path,
            'my-bucket',
            f'ml-datasets/processed/train/{output_path}'
        )
        
        print(f"Uploaded chunk {'{'}i{'}'}")`,
    resources: [
      { title: 'PyTorch Data Loading', url: 'pytorch.org/tutorials/data_loading' },
      { title: 'S3 Performance Optimization', url: 'docs.aws.amazon.com/s3/performance' },
      { title: 'Parquet Format', url: 'parquet.apache.org' },
      { title: 'AWS DataSync', url: 'aws.amazon.com/datasync' }
    ]
  },
  10: {
    overview: `Experiment tracking and model versioning are fundamental to reproducible ML research. As you run hundreds of experiments with different hyperparameters, architectures, and datasets, systematic tracking becomes essential. This module covers MLflow, Weights & Biases, and best practices for managing ML experiments.`,
    keyPoints: [
      'Experiment tracking captures parameters, metrics, and artifacts',
      'Model versioning enables rollback and comparison',
      'Artifact storage preserves models, configs, and visualizations',
      'Reproducibility requires tracking code version, dependencies, and data',
      'Centralized tracking enables team collaboration'
    ],
    bestPractices: [
      'Log all hyperparameters at experiment start',
      'Track system info: GPU type, instance type, framework versions',
      'Save model checkpoints with experiment metadata',
      'Use tags to organize experiments (baseline, ablation, production)',
      'Store training curves and evaluation metrics',
      'Version datasets alongside models',
      'Automate experiment logging in training scripts',
      'Set up dashboards for team visibility'
    ],
    codeExample: `# MLflow Experiment Tracking Setup

import mlflow
import mlflow.pytorch
from mlflow import log_metric, log_param, log_artifact

# Configure MLflow (can run on Pocket Architect instance)
mlflow.set_tracking_uri("http://mlflow-server:5000")
mlflow.set_experiment("vision-transformer-experiments")

def train_with_tracking():
    # Start run
    with mlflow.start_run(run_name="vit-base-lr0.001"):
        
        # Log parameters
        log_param("learning_rate", 0.001)
        log_param("batch_size", 64)
        log_param("model_architecture", "vit-base")
        log_param("instance_type", "p3.2xlarge")
        log_param("num_gpus", 1)
        
        # Log system info
        log_param("cuda_version", torch.version.cuda)
        log_param("pytorch_version", torch.__version__)
        
        # Training loop
        for epoch in range(num_epochs):
            train_loss, train_acc = train_one_epoch()
            val_loss, val_acc = validate()
            
            # Log metrics
            log_metric("train_loss", train_loss, step=epoch)
            log_metric("train_accuracy", train_acc, step=epoch)
            log_metric("val_loss", val_loss, step=epoch)
            log_metric("val_accuracy", val_acc, step=epoch)
            
            # Save checkpoint
            if epoch % 10 == 0:
                checkpoint_path = f"checkpoints/epoch_{epoch}.pt"
                torch.save(model.state_dict(), checkpoint_path)
                log_artifact(checkpoint_path)
        
        # Log final model
        mlflow.pytorch.log_model(model, "model")
        
        # Log training curve plot
        plot_training_curves(metrics)
        log_artifact("training_curves.png")
        
        # Log model metrics
        log_metric("final_val_accuracy", final_val_acc)
        log_metric("best_val_accuracy", best_val_acc)
        
        # Add tags
        mlflow.set_tag("status", "completed")
        mlflow.set_tag("dataset", "imagenet-1k")

# Weights & Biases Integration
import wandb

wandb.init(
    project="vision-research",
    entity="ml-team",
    config={
        "learning_rate": 0.001,
        "architecture": "vit-base",
        "dataset": "imagenet-1k",
        "epochs": 100,
    },
    tags=["baseline", "transformer"]
)

# Training with W&B
for epoch in range(config.epochs):
    train_loss = train_one_epoch()
    val_loss = validate()
    
    # Log metrics
    wandb.log({
        "epoch": epoch,
        "train_loss": train_loss,
        "val_loss": val_loss,
        "learning_rate": optimizer.param_groups[0]['lr']
    })
    
    # Log images (every 10 epochs)
    if epoch % 10 == 0:
        sample_images = get_sample_predictions()
        wandb.log({"predictions": [wandb.Image(img) for img in sample_images]})

# Model Registry Pattern
class ModelRegistry:
    """Manage model versions with metadata"""
    
    def __init__(self, s3_bucket):
        self.bucket = s3_bucket
        self.s3 = boto3.client('s3')
    
    def register_model(self, model, name, version, metadata):
        """Save model with full metadata"""
        # Save model
        model_path = f"/tmp/{name}-v{version}.pt"
        torch.save(model.state_dict(), model_path)
        
        # Upload to S3
        s3_key = f"models/{name}/v{version}/model.pt"
        self.s3.upload_file(model_path, self.bucket, s3_key)
        
        # Save metadata
        metadata_key = f"models/{name}/v{version}/metadata.json"
        self.s3.put_object(
            Bucket=self.bucket,
            Key=metadata_key,
            Body=json.dumps({
                **metadata,
                "registered_at": datetime.now().isoformat(),
                "model_size_mb": os.path.getsize(model_path) / 1e6,
                "s3_path": f"s3://{self.bucket}/{s3_key}"
            })
        )
        
        print(f"Registered {'{'}name{'}'} v{'{'}version{'}'}")
    
    def load_model(self, name, version):
        """Load specific model version"""
        s3_key = f"models/{'{'}name{'}'}/v{'{'}version{'}'}/model.pt"
        local_path = f"/tmp/{'{'}name{'}'}-v{'{'}version{'}'}.pt"
        
        self.s3.download_file(self.bucket, s3_key, local_path)
        return torch.load(local_path)

# Usage
registry = ModelRegistry("my-ml-models")
registry.register_model(
    model=trained_model,
    name="vision-classifier",
    version="1.0.0",
    metadata={
        "accuracy": 0.945,
        "architecture": "resnet50",
        "training_epochs": 100,
        "dataset": "imagenet-1k",
        "trained_by": "researcher@example.com",
        "instance_type": "p3.2xlarge"
    }
)`,
    resources: [
      { title: 'MLflow Documentation', url: 'mlflow.org/docs' },
      { title: 'Weights & Biases', url: 'wandb.ai/site' },
      { title: 'DVC for Data Versioning', url: 'dvc.org' },
      { title: 'Model Registry Patterns', url: 'ml-ops.org/content/model-registry' }
    ]
  },
  11: {
    overview: `Model inference optimization is crucial for deploying ML models in production. Raw trained models are often too slow or resource-intensive for real-time use. This module covers techniques to make models faster and more efficient: quantization, pruning, distillation, and optimized runtimes like ONNX and TensorRT.`,
    keyPoints: [
      'Quantization reduces model size and speeds up inference',
      'Pruning removes unnecessary weights to reduce computation',
      'ONNX provides cross-framework model interoperability',
      'TensorRT optimizes models specifically for NVIDIA GPUs',
      'Batch inference can significantly improve throughput'
    ],
    bestPractices: [
      'Profile model before optimization to identify bottlenecks',
      'Use INT8 quantization for 4x speedup with minimal accuracy loss',
      'Deploy inference on g5 instances for cost-effective GPU serving',
      'Implement model caching to avoid redundant computation',
      'Use dynamic batching to maximize GPU utilization',
      'Test optimized models thoroughly for accuracy regression',
      'Monitor inference latency and throughput in production',
      'Use A/B testing when deploying optimized models'
    ],
    codeExample: `# Model Optimization Pipeline

# 1. PyTorch Quantization
import torch.quantization

def quantize_model(model):
    """Quantize model to INT8"""
    # Prepare for quantization
    model.eval()
    model.qconfig = torch.quantization.get_default_qconfig('fbgemm')
    torch.quantization.prepare(model, inplace=True)
    
    # Calibrate with representative data
    with torch.no_grad():
        for data in calibration_loader:
            model(data)
    
    # Convert to quantized model
    torch.quantization.convert(model, inplace=True)
    
    return model

# 2. ONNX Export for Cross-Platform Inference
def export_to_onnx(model, output_path):
    """Export PyTorch model to ONNX format"""
    dummy_input = torch.randn(1, 3, 224, 224).cuda()
    
    torch.onnx.export(
        model,
        dummy_input,
        output_path,
        export_params=True,
        opset_version=13,
        do_constant_folding=True,
        input_names=['input'],
        output_names=['output'],
        dynamic_axes={
            'input': {0: 'batch_size'},
            'output': {0: 'batch_size'}
        }
    )

# 3. TensorRT Optimization (on Pocket Architect GPU instance)
import tensorrt as trt
import pycuda.driver as cuda

def build_tensorrt_engine(onnx_path):
    """Build optimized TensorRT engine"""
    logger = trt.Logger(trt.Logger.WARNING)
    builder = trt.Builder(logger)
    network = builder.create_network(
        1 << int(trt.NetworkDefinitionCreationFlag.EXPLICIT_BATCH)
    )
    parser = trt.OnnxParser(network, logger)
    
    # Parse ONNX
    with open(onnx_path, 'rb') as model:
        parser.parse(model.read())
    
    # Build engine with optimizations
    config = builder.create_builder_config()
    config.max_workspace_size = 1 << 30  # 1GB
    config.set_flag(trt.BuilderFlag.FP16)  # Use FP16 precision
    
    engine = builder.build_engine(network, config)
    
    # Save engine
    with open('model.trt', 'wb') as f:
        f.write(engine.serialize())
    
    return engine

# 4. Inference Server with Batching
from fastapi import FastAPI
from typing import List
import asyncio

app = FastAPI()

class InferenceEngine:
    def __init__(self, model_path):
        self.model = load_optimized_model(model_path)
        self.batch_queue = []
        self.batch_size = 32
        self.batch_timeout = 0.01  # 10ms
        
    async def add_to_batch(self, input_data):
        """Dynamic batching for throughput"""
        future = asyncio.Future()
        self.batch_queue.append((input_data, future))
        
        # Trigger batch if full
        if len(self.batch_queue) >= self.batch_size:
            await self.process_batch()
        
        return await future
    
    async def process_batch(self):
        """Process batched inputs"""
        if not self.batch_queue:
            return
        
        # Collect batch
        batch_inputs = [item[0] for item in self.batch_queue]
        batch_futures = [item[1] for item in self.batch_queue]
        self.batch_queue = []
        
        # Run inference
        batch_tensor = torch.stack(batch_inputs).cuda()
        with torch.no_grad():
            results = self.model(batch_tensor)
        
        # Return results
        for future, result in zip(batch_futures, results):
            future.set_result(result)

engine = InferenceEngine('optimized_model.pt')

@app.post("/predict")
async def predict(image: bytes):
    """Inference endpoint with batching"""
    input_tensor = preprocess_image(image)
    result = await engine.add_to_batch(input_tensor)
    return {"prediction": result.tolist()}

# 5. Benchmark Different Optimizations
def benchmark_inference():
    """Compare inference performance"""
    models = {
        'baseline': load_model('baseline.pt'),
        'quantized': load_model('quantized.pt'),
        'onnx': onnxruntime.InferenceSession('model.onnx'),
        'tensorrt': load_tensorrt_engine('model.trt')
    }
    
    dummy_input = torch.randn(1, 3, 224, 224).cuda()
    
    for name, model in models.items():
        # Warmup
        for _ in range(10):
            _ = model(dummy_input)
        
        # Benchmark
        start = time.time()
        for _ in range(100):
            _ = model(dummy_input)
        torch.cuda.synchronize()
        
        latency = (time.time() - start) / 100 * 1000
        print(f"{'{'}name{'}'}: {'{'}latency:.2f{'}'}ms per inference")

# Deploy on Pocket Architect Instance
# Create g5.xlarge instance with Blueprint
# Install dependencies: tensorrt, onnxruntime-gpu
# Run inference server with uvicorn
# uvicorn inference_server:app --host 0.0.0.0 --port 8000`,
    resources: [
      { title: 'PyTorch Quantization', url: 'pytorch.org/docs/stable/quantization' },
      { title: 'ONNX Runtime', url: 'onnxruntime.ai' },
      { title: 'TensorRT Documentation', url: 'docs.nvidia.com/tensorrt' },
      { title: 'Model Optimization Guide', url: 'huggingface.co/docs/optimum' }
    ]
  },
  12: {
    overview: `Security in ML systems extends beyond traditional application security. You must protect training data, model artifacts, and inference endpoints while maintaining compliance with data privacy regulations. With Pocket Architect's security configurations, you can implement defense-in-depth for your ML infrastructure.`,
    keyPoints: [
      'ML data often contains sensitive information requiring encryption',
      'Model artifacts should be versioned and access-controlled',
      'Training environments should be isolated in private VPCs',
      'Inference endpoints need authentication and rate limiting',
      'Model poisoning attacks can compromise model behavior'
    ],
    bestPractices: [
      'Use IAM roles instead of access keys for AWS service access',
      'Enable S3 encryption at rest (SSE-S3 or SSE-KMS)',
      'Encrypt data in transit with TLS/SSL',
      'Restrict SSH access in Pocket Architect security configs to known IPs',
      'Use VPC endpoints for S3 access to avoid public internet',
      'Implement model registry access controls',
      'Scan training data for PII before upload',
      'Use AWS Secrets Manager for credential management',
      'Audit security group rules regularly'
    ],
    codeExample: `# Secure ML Infrastructure with Pocket Architect

# 1. Create Security Configuration in Pocket Architect
# Name: prod-ml-training-secure
# Rules:
#   - SSH (22): Corporate VPN only (10.0.0.0/16)
#   - TensorBoard (6006): VPN only
#   - All Outbound: S3 VPC endpoint + PyPI

# 2. Secure Data Upload
import boto3
from botocore.client import Config

def upload_training_data_encrypted(local_path, s3_path):
    """Upload data with server-side encryption"""
    s3 = boto3.client('s3', config=Config(signature_version='s3v4'))
    
    # Split s3://bucket/key
    bucket, key = s3_path.replace('s3://', '').split('/', 1)
    
    s3.upload_file(
        Filename=local_path,
        Bucket=bucket,
        Key=key,
        ExtraArgs={
            'ServerSideEncryption': 'aws:kms',
            'SSEKMSKeyId': 'arn:aws:kms:region:account:key/key-id',
            'Metadata': {
                'uploaded-by': get_user_email(),
                'purpose': 'ml-training',
                'classification': 'confidential'
            }
        }
    )
    print(f"Uploaded {'{'}local_path{'}'} with encryption")

# 3. Secure Credential Management
from botocore.exceptions import ClientError

def get_db_credentials():
    """Retrieve credentials from Secrets Manager"""
    secrets = boto3.client('secretsmanager')
    
    try:
        response = secrets.get_secret_value(
            SecretId='ml-training-db-creds'
        )
        return json.loads(response['SecretString'])
    except ClientError as e:
        logging.error(f"Failed to retrieve credentials: {e}")
        raise

# 4. Model Artifact Protection
def save_model_securely(model, name, version, metadata):
    """Save model with encryption and access control"""
    # Save locally
    model_path = f"/tmp/{name}-{version}.pt"
    torch.save(model.state_dict(), model_path)
    
    # Upload with encryption
    s3 = boto3.client('s3')
    s3.upload_file(
        model_path,
        'ml-models-encrypted',
        f'models/{name}/{version}/model.pt',
        ExtraArgs={
            'ServerSideEncryption': 'aws:kms',
            'Metadata': {
                'model-name': name,
                'version': version,
                'accuracy': str(metadata['accuracy']),
                'created-by': metadata['user'],
                'git-commit': get_git_commit()
            }
        }
    )
    
    # Set bucket policy for restricted access
    policy = {
        'Version': '2012-10-17',
        'Statement': [{
            'Effect': 'Allow',
            'Principal': {'AWS': 'arn:aws:iam::account:role/MLTeamRole'},
            'Action': ['s3:GetObject'],
            'Resource': f'arn:aws:s3:::ml-models-encrypted/models/{name}/*'
        }]
    }
    
    os.remove(model_path)  # Clean up local file

# 5. Secure Inference Endpoint
from fastapi import FastAPI, Depends, HTTPException, Security
from fastapi.security import APIKeyHeader
import hmac
import hashlib

app = FastAPI()
api_key_header = APIKeyHeader(name="X-API-Key")

def verify_api_key(api_key: str = Security(api_key_header)):
    """Verify API key from Secrets Manager"""
    secrets = boto3.client('secretsmanager')
    valid_key = secrets.get_secret_value(
        SecretId='inference-api-key'
    )['SecretString']
    
    if not hmac.compare_digest(api_key, valid_key):
        raise HTTPException(status_code=403, detail="Invalid API key")
    
    return api_key

@app.post("/predict")
async def predict(
    image: bytes,
    api_key: str = Depends(verify_api_key)
):
    """Protected inference endpoint"""
    # Log request for audit
    log_inference_request(api_key, len(image))
    
    # Rate limiting
    if not check_rate_limit(api_key):
        raise HTTPException(status_code=429, detail="Rate limit exceeded")
    
    # Run inference
    result = model.predict(image)
    
    return {"prediction": result}

# 6. Data Privacy Scanning
import re

def scan_for_pii(data):
    """Scan data for common PII patterns"""
    patterns = {
        'email': r'\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b',
        'ssn': r'\\b\\d{3}-\\d{2}-\\d{4}\\b',
        'credit_card': r'\\b\\d{4}[\\s-]?\\d{4}[\\s-]?\\d{4}[\\s-]?\\d{4}\\b',
        'phone': r'\\b\\d{3}[-.]?\\d{3}[-.]?\\d{4}\\b'
    }
    
    findings = {}
    for pii_type, pattern in patterns.items():
        matches = re.findall(pattern, str(data))
        if matches:
            findings[pii_type] = len(matches)
    
    if findings:
        raise ValueError(f"PII detected: {findings}")
    
    return True

# 7. Audit Logging
def log_model_access(model_name, action, user):
    """Log all model access for compliance"""
    cloudtrail = boto3.client('cloudtrail')
    
    cloudwatch_logs = boto3.client('logs')
    cloudwatch_logs.put_log_events(
        logGroupName='/ml/model-access',
        logStreamName=model_name,
        logEvents=[{
            'timestamp': int(time.time() * 1000),
            'message': json.dumps({
                'action': action,
                'model': model_name,
                'user': user,
                'ip': get_client_ip(),
                'timestamp': datetime.now().isoformat()
            })
        }]
    )`,
    resources: [
      { title: 'AWS Security Best Practices', url: 'aws.amazon.com/security/best-practices' },
      { title: 'ML Security Threats', url: 'owasp.org/www-project-machine-learning-security' },
      { title: 'AWS Secrets Manager', url: 'docs.aws.amazon.com/secretsmanager' },
      { title: 'KMS Encryption', url: 'docs.aws.amazon.com/kms' }
    ]
  },
  13: {
    overview: `ML workloads can be extremely expensive if not optimized. GPU instances cost $30+/hour, and storage costs add up quickly with large datasets. Pocket Architect helps manage costs through instance lifecycle management, but strategic optimization can reduce your cloud bill by 70-90%. This module teaches cost optimization without sacrificing quality.`,
    keyPoints: [
      'Spot instances can reduce training costs by 70-90%',
      'Reserved instances offer 40-60% savings for consistent workloads',
      'Storage costs accumulate with large datasets and models',
      'Idle GPU time is wasted money',
      'Right-sizing instances prevents over-provisioning'
    ],
    bestPractices: [
      'Stop Pocket Architect instances when not actively training',
      'Use Spot instances for fault-tolerant training (implement checkpointing)',
      'Implement auto-shutdown scripts for idle GPU instances',
      'Use S3 Lifecycle policies to move old data to Glacier',
      'Delete intermediate checkpoints, keep only best models',
      'Use smaller instances for development/debugging',
      'Monitor costs with AWS Cost Explorer and set billing alerts',
      'Use mixed instance types: CPU for data prep, GPU for training',
      'Compress datasets with optimized formats (Parquet, WebDataset)'
    ],
    codeExample: `# Cost Optimization for Pocket Architect ML Workloads

# 1. Auto-Shutdown for Idle Instances
import subprocess
import boto3
import time
import os

class GPUIdleMonitor:
    """Monitor GPU and auto-shutdown if idle"""
    
    def __init__(self, idle_threshold_minutes=30):
        self.idle_threshold = idle_threshold_minutes
        self.ec2 = boto3.client('ec2')
        self.instance_id = self._get_instance_id()
    
    def _get_instance_id(self):
        """Get current instance ID"""
        response = requests.get(
            'http://169.254.169.254/latest/meta-data/instance-id',
            timeout=1
        )
        return response.text
    
    def check_gpu_utilization(self):
        """Check if GPU is being used"""
        result = subprocess.run(
            ['nvidia-smi', '--query-gpu=utilization.gpu',
             '--format=csv,noheader,nounits'],
            capture_output=True, text=True
        )
        
        utils = [int(u) for u in result.stdout.strip().split('\\n')]
        return max(utils) if utils else 0
    
    def monitor_and_shutdown(self):
        """Monitor GPU and shutdown if idle"""
        idle_minutes = 0
        
        while True:
            util = self.check_gpu_utilization()
            print(f"GPU utilization: {'{'}util{'}'}%")
            
            if util < 10:  # Less than 10% utilization
                idle_minutes += 1
                print(f"GPU idle for {'{'}idle_minutes{'}'} minutes")
                
                if idle_minutes >= self.idle_threshold:
                    print("Idle threshold reached, shutting down...")
                    
                    # Save final checkpoint
                    if os.path.exists('/tmp/training_state.pt'):
                        self._save_checkpoint_to_s3()
                    
                    # Stop instance
                    self.ec2.stop_instances(InstanceIds=[self.instance_id])
                    break
            else:
                idle_minutes = 0  # Reset counter
            
            time.sleep(60)  # Check every minute
    
    def _save_checkpoint_to_s3(self):
        """Save checkpoint before shutdown"""
        s3 = boto3.client('s3')
        s3.upload_file(
            '/tmp/training_state.pt',
            'my-ml-bucket',
            f'checkpoints/auto_shutdown_{int(time.time())}.pt'
        )

# Run monitor in background
# Add to training script startup
monitor = GPUIdleMonitor(idle_threshold_minutes=30)
import threading
shutdown_thread = threading.Thread(target=monitor.monitor_and_shutdown, daemon=True)
shutdown_thread.start()

# 2. Spot Instance Training with Fault Tolerance
def train_with_spot_recovery():
    """Training loop optimized for Spot instances"""
    checkpoint_path = 's3://my-ml-bucket/checkpoints/latest.pt'
    s3 = boto3.client('s3')
    
    # Load checkpoint if exists
    try:
        s3.download_file('my-ml-bucket', 'checkpoints/latest.pt', '/tmp/latest.pt')
        checkpoint = torch.load('/tmp/latest.pt')
        model.load_state_dict(checkpoint['model'])
        optimizer.load_state_dict(checkpoint['optimizer'])
        start_epoch = checkpoint['epoch'] + 1
        print(f"Resumed from epoch {'{'}start_epoch{'}'}")
    except:
        start_epoch = 0
        print("Starting fresh training")
    
    try:
        for epoch in range(start_epoch, num_epochs):
            # Train epoch
            for batch in train_loader:
                train_step(model, batch)
            
            # Save checkpoint every epoch
            checkpoint = {
                'epoch': epoch,
                'model': model.state_dict(),
                'optimizer': optimizer.state_dict(),
                'train_loss': train_loss
            }
            torch.save(checkpoint, '/tmp/latest.pt')
            s3.upload_file('/tmp/latest.pt', 'my-ml-bucket', 'checkpoints/latest.pt')
            
            print(f"Epoch {'{'}epoch{'}'} complete, checkpoint saved")
    
    except KeyboardInterrupt:
        print("Training interrupted, checkpoint saved to S3")

# 3. Storage Cost Optimization
def cleanup_old_artifacts(bucket, days_to_keep=30):
    """Delete old training artifacts"""
    s3 = boto3.client('s3')
    cutoff_date = datetime.now() - timedelta(days=days_to_keep)
    
    # List all checkpoints
    paginator = s3.get_paginator('list_objects_v2')
    
    for page in paginator.paginate(Bucket=bucket, Prefix='checkpoints/'):
        for obj in page.get('Contents', []):
            if obj['LastModified'].replace(tzinfo=None) < cutoff_date:
                # Keep only checkpoints with 'best' or 'final' in name
                if 'best' not in obj['Key'] and 'final' not in obj['Key']:
                    s3.delete_object(Bucket=bucket, Key=obj['Key'])
                    print(f"Deleted old checkpoint: {'{'}obj['Key']{'}'}")

# 4. S3 Lifecycle Policy (apply in AWS Console or via Pocket Architect)
lifecycle_policy = {
    "Rules": [
        {
            "Id": "MoveOldDataToGlacier",
            "Status": "Enabled",
            "Prefix": "training-data/",
            "Transitions": [
                {
                    "Days": 90,
                    "StorageClass": "GLACIER"
                }
            ]
        },
        {
            "Id": "DeleteOldLogs",
            "Status": "Enabled",
            "Prefix": "logs/",
            "Expiration": {
                "Days": 30
            }
        },
        {
            "Id": "DeleteIntermediateCheckpoints",
            "Status": "Enabled",
            "Prefix": "checkpoints/epoch_",
            "Expiration": {
                "Days": 14
            }
        }
    ]
}

# 5. Cost Monitoring Dashboard
def generate_cost_report():
    """Generate ML workload cost report"""
    ce = boto3.client('ce')
    
    # Get costs for last 30 days
    end_date = datetime.now().date()
    start_date = end_date - timedelta(days=30)
    
    response = ce.get_cost_and_usage(
        TimePeriod={
            'Start': start_date.isoformat(),
            'End': end_date.isoformat()
        },
        Granularity='DAILY',
        Filter={
            'Tags': {
                'Key': 'Project',
                'Values': ['ml-training']  # Filter by Pocket Architect Project tag
            }
        },
        Metrics=['UnblendedCost'],
        GroupBy=[
            {'Type': 'SERVICE', 'Key': 'SERVICE'},
            {'Type': 'INSTANCE_TYPE', 'Key': 'INSTANCE_TYPE'}
        ]
    )
    
    # Analyze costs
    total_cost = 0
    breakdown = {}
    
    for result in response['ResultsByTime']:
        for group in result['Groups']:
            service = group['Keys'][0]
            cost = float(group['Metrics']['UnblendedCost']['Amount'])
            total_cost += cost
            breakdown[service] = breakdown.get(service, 0) + cost
    
    print(f"\\nTotal ML Cost (30 days): ${'{'}total_cost:.2f{'}'}")
    print("\\nBreakdown by service:")
    for service, cost in sorted(breakdown.items(), key=lambda x: x[1], reverse=True):
        print(f"  {'{'}service{'}'}: ${'{'}cost:.2f{'}'} ({'{'}cost/total_cost*100:.1f{'}'}%)")
    
    return breakdown

# 6. Right-Sizing Recommendations
def recommend_instance_size():
    """Analyze GPU usage and recommend instance size"""
    # Collect GPU metrics over 24 hours
    max_memory_used = 0
    avg_utilization = 0
    samples = 0
    
    for _ in range(1440):  # 24 hours, every minute
        result = subprocess.run(
            ['nvidia-smi', '--query-gpu=memory.used,utilization.gpu',
             '--format=csv,noheader,nounits'],
            capture_output=True, text=True
        )
        
        memory_mb, util = result.stdout.strip().split(', ')
        max_memory_used = max(max_memory_used, int(memory_mb))
        avg_utilization += int(util)
        samples += 1
        
        time.sleep(60)
    
    avg_utilization /= samples
    
    # Recommendations
    print(f"\\nGPU Analysis (24 hours):")
    print(f"  Max Memory Used: {'{'}max_memory_used{'}'} MB")
    print(f"  Avg Utilization: {'{'}avg_utilization:.1f{'}'}%")
    
    if max_memory_used < 12000:  # < 12GB
        print("\\n  Recommendation: Consider g4dn.xlarge (T4 16GB) - save 50%")
    elif avg_utilization < 30:
        print("\\n  Recommendation: Instance underutilized, optimize code or downsize")
    else:
        print("\\n  Recommendation: Current instance size appropriate")`,
    resources: [
      { title: 'AWS Cost Explorer', url: 'aws.amazon.com/cost-management/cost-explorer' },
      { title: 'EC2 Spot Instances', url: 'aws.amazon.com/ec2/spot' },
      { title: 'S3 Lifecycle Policies', url: 'docs.aws.amazon.com/s3/lifecycle' },
      { title: 'AWS Budgets', url: 'aws.amazon.com/aws-cost-management/budgets' }
    ]
  }
};

// Merge additional modules 14-21 into learningContent
Object.assign(learningContent, additionalModules);

export function LearningDetailsDialog({
  open,
  onClose,
  module,
}: LearningDetailsDialogProps) {
  const [activeTab, setActiveTab] = useState('overview');
  
  if (!module) return null;

  const content = learningContent[module.id] || {
    overview: 'Content coming soon...',
    keyPoints: [],
    bestPractices: [],
    codeExample: '',
    resources: []
  };

  const IconComponent = module.icon;
  
  const tabs = ['overview', 'key-concepts', 'best-practices', 'code', 'resources'];
  
  const handleReviewModule = () => {
    const currentIndex = tabs.indexOf(activeTab);
    const nextIndex = (currentIndex + 1) % tabs.length;
    setActiveTab(tabs[nextIndex]);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-green-500/30 bg-green-500/10">
            <Circle className="size-3 fill-green-500 text-green-500" />
            <span className="text-green-500">Completed</span>
          </div>
        );
      case 'in-progress':
        return (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-blue-500/30 bg-blue-500/10">
            <Circle className="size-3 fill-blue-500 text-blue-500" />
            <span className="text-blue-500">In Progress</span>
          </div>
        );
      case 'not-started':
        return (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-text-muted/30 bg-text-muted/10">
            <Circle className="size-3 fill-text-muted text-text-muted" />
            <span className="text-text-muted">Not Started</span>
          </div>
        );
      default:
        return null;
    }
  };

  const handleClose = () => {
    setActiveTab('overview');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="max-w-5xl max-h-[85vh] bg-background border-border overflow-hidden flex flex-col" aria-describedby="learning-module-description">
        <DialogHeader className="border-b border-border pb-4">
          <div className="flex items-start justify-between">
             <div className="flex items-start gap-4">
               <div className="p-3 rounded-lg bg-primary/10 border border-primary/30">
                 <IconComponent className="size-6 text-primary" />
               </div>
              <div>
                <DialogTitle className="text-text-primary mb-2">
                  {module.title}
                </DialogTitle>
                <p id="learning-module-description" className="text-text-muted text-sm mb-3">
                  {module.description}
                </p>
                <div className="flex items-center gap-3 flex-wrap">
                  {getStatusBadge(module.status)}
                  <Badge variant="secondary" className="bg-background-elevated text-text-secondary border-border-muted">
                    {module.category}
                  </Badge>
                  <div className="flex items-center gap-1.5 text-sm text-text-muted">
                    <Clock className="size-4" />
                    {module.duration}
                  </div>
                   <div className="flex items-center gap-1.5 text-sm">
                     <Target className="size-4 text-primary" />
                     <span className="text-primary">{module.difficulty}</span>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full justify-start border-b border-border bg-transparent rounded-none h-auto p-0 pb-0.5">
               <TabsTrigger
                 value="overview"
                 className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-t-md rounded-b-none bg-transparent text-text-secondary data-[state=active]:text-primary pb-3 mb-[-2px]"
               >
                <BookOpen className="size-4 mr-2" />
                Overview
              </TabsTrigger>
               <TabsTrigger
                 value="key-concepts"
                 className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-t-md rounded-b-none bg-transparent text-text-secondary data-[state=active]:text-primary pb-3 mb-[-2px]"
               >
                <Lightbulb className="size-4 mr-2" />
                Key Concepts
              </TabsTrigger>
               <TabsTrigger
                 value="best-practices"
                 className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-t-md rounded-b-none bg-transparent text-text-secondary data-[state=active]:text-primary pb-3 mb-[-2px]"
               >
                <CheckCircle2 className="size-4 mr-2" />
                Best Practices
              </TabsTrigger>
               <TabsTrigger
                 value="code"
                 className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-t-md rounded-b-none bg-transparent text-text-secondary data-[state=active]:text-primary pb-3 mb-[-2px]"
               >
                <Code className="size-4 mr-2" />
                Code Examples
              </TabsTrigger>
               <TabsTrigger
                 value="resources"
                 className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-t-md rounded-b-none bg-transparent text-text-secondary data-[state=active]:text-primary pb-3 mb-[-2px]"
               >
                <ExternalLink className="size-4 mr-2" />
                Resources
              </TabsTrigger>
            </TabsList>

            <div className="p-6">
              <TabsContent value="overview" className="mt-0">
                <div className="space-y-6">
                  {/* Main Learning Content */}
                  <div className="prose prose-invert max-w-none">
                    <ReactMarkdown
                      className="text-text-primary leading-relaxed space-y-4"
                       components={{
                         h1: ({node, ...props}) => <h1 className="text-2xl text-primary mb-4 mt-6" {...props} />,
                         h2: ({node, ...props}) => <h2 className="text-xl text-primary/80 mb-3 mt-5" {...props} />,
                         h3: ({node, ...props}) => <h3 className="text-lg text-text-primary mb-2 mt-4" {...props} />,
                         p: ({node, ...props}) => <p className="text-text-primary mb-4 leading-relaxed" {...props} />,
                         ul: ({node, ...props}) => <ul className="list-disc list-inside space-y-2 mb-4 text-text-primary" {...props} />,
                         ol: ({node, ...props}) => <ol className="list-decimal list-inside space-y-2 mb-4 text-text-primary" {...props} />,
                         li: ({node, ...props}) => <li className="text-text-primary ml-4" {...props} />,
                         code: ({node, inline, ...props}: any) =>
                           inline ? (
                             <code className="bg-background-elevated text-primary/80 px-1.5 py-0.5 rounded text-sm" {...props} />
                           ) : (
                             <code className="block bg-background-elevated text-text-primary p-4 rounded-lg overflow-x-auto text-sm mb-4" {...props} />
                           ),
                         pre: ({node, ...props}) => <pre className="bg-background-elevated rounded-lg overflow-x-auto mb-4" {...props} />,
                         blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-primary pl-4 italic text-text-secondary my-4" {...props} />,
                        strong: ({node, ...props}) => <strong className="text-primary/80 font-semibold" {...props} />,
                        a: ({node, ...props}) => <a className="text-primary hover:text-primary/80 underline" {...props} />,
                      }}
                    >
                      {content.overview}
                    </ReactMarkdown>
                  </div>

                  {module.progress > 0 && (
                    <Card className="bg-background-elevated border-border-muted p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-text-primary">Your Progress</span>
                        <span className="text-primary">{module.progress}%</span>
                      </div>
                      <Progress value={module.progress} className="h-2" />
                    </Card>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="key-concepts" className="mt-0">
                <div className="space-y-6">
                  {/* Topics Covered Section */}
                  <div>
                    <h3 className="text-text-primary mb-3">Topics Covered</h3>
                    <div className="grid grid-cols-1 gap-2">
                      {module.topics.map((topic: string, index: number) => (
                        <div
                          key={index}
                          className="flex items-start gap-3 p-3 rounded-lg bg-background-elevated border border-border-muted"
                        >
                          <CheckCircle2 className="size-5 text-primary flex-shrink-0 mt-0.5" />
                          <span className="text-text-primary">{topic}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Key Points Section */}
                  <div className="border-t border-border pt-6">
                    <h3 className="text-text-primary mb-4">Key Points to Remember</h3>
                    {content.keyPoints.length > 0 ? (
                      <div className="space-y-4">
                        {content.keyPoints.map((point: string, index: number) => (
                          <div
                            key={index}
                            className="flex items-start gap-3 p-4 rounded-lg bg-background-elevated border border-border-muted"
                          >
                            <div className="flex-shrink-0 size-6 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
                              <span className="text-primary text-sm">{index + 1}</span>
                            </div>
                            <div className="flex-1">
                              <ReactMarkdown
                                components={{
                                  p: ({node, ...props}) => <p className="text-text-primary leading-relaxed" {...props} />,
                                  code: ({node, inline, ...props}: any) =>
                                    inline ? (
                                      <code className="bg-background-elevated text-primary/80 px-1.5 py-0.5 rounded text-sm" {...props} />
                                    ) : (
                                      <code className="block bg-background-elevated text-text-primary p-3 rounded-lg overflow-x-auto text-sm mt-2" {...props} />
                                    ),
                                  strong: ({node, ...props}) => <strong className="text-primary/80 font-semibold" {...props} />,
                                }}
                              >
                                {point}
                              </ReactMarkdown>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-text-muted">Content coming soon...</p>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="best-practices" className="mt-0">
                <div className="space-y-4">
                  <h3 className="text-text-primary mb-4">Recommended Best Practices</h3>
                  {content.bestPractices.length > 0 ? (
                    content.bestPractices.map((practice: string, index: number) => (
                      <div
                        key={index}
                        className="flex items-start gap-3 p-4 rounded-lg bg-background-elevated border border-border-muted hover:border-primary/30 transition-colors"
                      >
                        <CheckCircle2 className="size-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <ReactMarkdown
                            components={{
                              p: ({node, ...props}) => <p className="text-text-primary leading-relaxed" {...props} />,
                              code: ({node, inline, ...props}: any) =>
                                inline ? (
                                  <code className="bg-background-elevated text-primary/80 px-1.5 py-0.5 rounded text-sm" {...props} />
                                ) : (
                                  <code className="block bg-background-elevated text-text-primary p-3 rounded-lg overflow-x-auto text-sm mt-2" {...props} />
                                ),
                              strong: ({node, ...props}) => <strong className="text-primary/80 font-semibold" {...props} />,
                            }}
                          >
                            {practice}
                          </ReactMarkdown>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-text-muted">Content coming soon...</p>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="code" className="mt-0">
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-text-primary">Code Examples</h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(content.codeExample || '');
                      }}
                      className="text-primary border-primary/30 hover:bg-primary/10 hover:text-primary/80"
                    >
                      <Terminal className="size-4 mr-2" />
                      Copy Code
                    </Button>
                  </div>
                  <div className="prose prose-invert max-w-none">
                    <ReactMarkdown
                      components={{
                        h1: ({node, ...props}) => <h1 className="text-xl text-primary mb-3 mt-4" {...props} />,
                        h2: ({node, ...props}) => <h2 className="text-lg text-primary/80 mb-2 mt-3" {...props} />,
                        h3: ({node, ...props}) => <h3 className="text-md text-text-primary mb-2 mt-3" {...props} />,
                        p: ({node, ...props}) => <p className="text-text-primary mb-3 leading-relaxed" {...props} />,
                        code: ({node, inline, ...props}: any) => 
                          inline ? (
                            <code className="bg-background-elevated text-primary/80 px-1.5 py-0.5 rounded text-sm" {...props} />
                          ) : (
                            <code className="block bg-background text-text-primary p-4 rounded-lg overflow-x-auto text-sm font-mono" {...props} />
                          ),
                        pre: ({node, ...props}) => <pre className="bg-background border border-border rounded-lg overflow-x-auto mb-4" {...props} />,
                      }}
                    >
                      {content.codeExample || '```\n# Code examples coming soon...\n```'}
                    </ReactMarkdown>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="resources" className="mt-0">
                <div className="space-y-4">
                  <h3 className="text-text-primary mb-4">Additional Resources</h3>
                  {content.resources.length > 0 ? (
                    content.resources.map((resource: any, index: number) => (
                      <a
                        key={index}
                        href={resource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-4 rounded-lg bg-background-elevated border border-border-muted hover:border-primary/50 transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="size-5 text-primary" />
                          <div className="flex-1 min-w-0">
                            <div className="text-text-primary group-hover:text-primary transition-colors">
                              {resource.title}
                            </div>
                            <div className="text-sm text-text-muted">{resource.url}</div>
                          </div>
                        </div>
                        <ExternalLink className="size-4 text-text-muted group-hover:text-primary transition-colors" />
                      </a>
                    ))
                  ) : (
                    <p className="text-text-muted">Resources coming soon...</p>
                  )}
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        <div className="border-t border-border pt-4 flex items-center justify-between">
          <Button
            variant="outline"
            onClick={onClose}
            className="text-text-secondary border-border-muted hover:bg-background-elevated hover:text-text-primary"
          >
            Close
          </Button>
          <div className="flex items-center gap-2">
            {module.status !== 'completed' && (
              <Button 
                className="bg-primary hover:bg-primary/90 text-white"
                onClick={handleReviewModule}
              >
                <Play className="size-4 mr-2" />
                {module.status === 'not-started' ? 'Start Module' : 'Continue Learning'}
              </Button>
            )}
            {module.status === 'completed' && (
              <Button 
                className="bg-primary hover:bg-primary/90 text-white"
                onClick={handleReviewModule}
              >
                <ArrowRight className="size-4 mr-2" />
                Next
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
