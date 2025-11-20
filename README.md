# CVAT Workstation - Minimal Configuration

## Brief Summary

Terraform configuration for deploying a CVAT workstation on AWS EC2. This infrastructure supports a checkpoint/restore workflow, allowing you to save your progress at milestones (e.g., "n8n working", "mlflow configured") and restore from those checkpoints later.

**Use Cases:**
- Deploy a CVAT workstation with optional MLflow and n8n services
- Save infrastructure state at milestones using checkpoints
- Cost-effective: stop infrastructure when not in use (saves compute costs)
- Optional HTTPS/SSL via Application Load Balancer with custom domain

## Prerequisites

### Required Tools

1. **Terraform** (>= 1.5.0)
   - macOS: `brew install terraform`
   - Linux/Windows: [terraform.io/downloads](https://www.terraform.io/downloads)
   - Verify: `terraform version`

2. **AWS CLI** (v2 recommended)
   - macOS: `brew install awscli`
   - Linux/Windows: [AWS CLI installation guide](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)
   - Verify: `aws --version`
   - Configure: `aws configure --profile terraform`

3. **SSH Client** (usually pre-installed)
   - Verify: `ssh -V`

4. **curl** (usually pre-installed)
   - Verify: `curl --version`

### AWS Account Setup

1. **AWS Account** with permissions for:
   - EC2 (instances, key pairs, snapshots, AMIs)
   - VPC (read subnets, security groups)
   - IAM (EC2 SSM roles)
   - Route 53 (if using `domain_name`)
   - ACM (if using `enable_alb`)

2. **AWS Credentials** configured:
   ```bash
   aws configure --profile terraform
   ```

### Required AWS Values

Before running Terraform, gather these **3 required values**:

1. **Subnet ID** (`subnet_id`)
   - AWS Console → VPC → Subnets
   - Must be a public subnet with Internet Gateway
   - Example: `subnet-0563a2c216fb47323`

2. **EC2 Key Pair Name** (`ssh_key_name`)
   - AWS Console → EC2 → Key Pairs
   - Create if needed: EC2 → Key Pairs → Create Key Pair
   - Download `.pem` file and set permissions: `chmod 400 ~/.ssh/key-name.pem`
   - Use the **name** (not file path) in Terraform
   - Example: `brendens-mac`

3. **Your Public IP** (`my_ip_cidr`)
   - Run: `curl ifconfig.me`
   - Add `/32` suffix
   - Example: `70.119.100.238/32`

### Optional AWS Values

- **Elastic IP Allocation ID** - AWS Console → EC2 → Elastic IPs
- **Domain Name** - Requires Route 53 hosted zone (AWS Console → Route 53)
- **Snapshot ID** - AWS Console → EC2 → Snapshots (or use `./checkpoint.sh`)

## How to Use

### Initial Deployment

1. **Copy and configure:**
   ```bash
   cp terraform.tfvars.example terraform.tfvars
   ```
   Edit `terraform.tfvars` with your values:
   ```hcl
   my_ip_cidr = "YOUR_IP/32"
   subnet_id = "subnet-xxxxx"
   ssh_key_name = "your-key-name"
   ```

2. **Initialize and deploy:**
   ```bash
   terraform init
   terraform plan
   terraform apply
   ```

3. **SSH to instance:**
   ```bash
   ssh -i ~/.ssh/your-key-name.pem ubuntu@<instance-ip>
   ```

### Starting and Stopping Infrastructure

**Start (turn ON):**
```bash
./up.sh
```
- Starts EC2 instances
- Creates ALB (if `enable_alb = true`)
- Updates DNS records

**Stop (turn OFF - saves costs):**
```bash
./down.sh
```
- Stops EC2 instances (data preserved)
- Destroys ALB (saves ~$16-22/month)
- Updates DNS to point to Elastic IP

**Note:** When stopped, you only pay for storage (~$1.50/month for 250GB). No compute charges.

### Creating Checkpoints

Save your progress at milestones (e.g., "n8n working", "mlflow configured"):

```bash
./checkpoint.sh
```

This automatically:
- Creates a snapshot of your current instance
- Creates an AMI from that snapshot
- Updates `terraform.tfvars` with the new snapshot ID
- Tags everything for easy identification

**Manual method:**
1. AWS Console → EC2 → Volumes → Create snapshot
2. Edit `terraform.tfvars`: `root_volume_snapshot_id = "snap-xxxxx"`

### Restoring from a Checkpoint

If `root_volume_snapshot_id` is set in `terraform.tfvars`, Terraform will automatically:
- Create an AMI from the snapshot (if one doesn't exist)
- Launch the instance from that AMI
- Preserve all your data and configuration

Just run:
```bash
terraform apply
```

### Switching Between Checkpoints

1. Edit `terraform.tfvars`:
   ```hcl
   root_volume_snapshot_id = "snap-YOUR-CHECKPOINT-ID"
   ```
2. Apply:
   ```bash
   terraform apply
   ```
   Terraform will destroy the existing instance and create a new one from the checkpoint.

### Creating a Fresh Instance

To start completely fresh (not from a checkpoint):

1. In `terraform.tfvars`, set:
   ```hcl
   root_volume_snapshot_id = ""
   ```
2. Apply:
   ```bash
   terraform apply
   ```

## General Architecture

### Core Resources

- **EC2 Instance** (`t3.xlarge`, Ubuntu 22.04)
  - Always created, can be stopped when `enable_infrastructure = false`
  - Root volume: 60GB (or matches snapshot size if restoring)
  - IAM role for SSM access
  - Automatic SSH host key cleanup on replacement

- **Security Group**
  - SSH access from your IP only
  - Service ports (8080 CVAT, 5000 MLflow, 5678 n8n):
    - Direct access from your IP (when ALB disabled)
    - Or only from ALB security group (when ALB enabled)

### Optional Resources (when enabled)

- **Application Load Balancer** (`enable_alb = true`)
  - HTTPS/SSL termination
  - Routes traffic to EC2 instance
  - Requires `domain_name` to be set
  - Cost: ~$16-22/month when running

- **ACM Certificate** (when ALB + domain enabled)
  - Free SSL/TLS certificate
  - Wildcard support for subdomains
  - Automatic DNS validation via Route 53

- **Route 53 DNS Records** (when `domain_name` set)
  - Main domain: `example.com`
  - Subdomains: `cvat.example.com`, `mlflow.example.com`, `n8n.example.com`
  - Points to ALB (when enabled) or Elastic IP (when disabled)

- **Elastic IP** (optional, via `elastic_ip_allocation_id`)
  - Static public IP address
  - Automatically reassociated on instance replacement

- **AMI from Snapshot** (when `root_volume_snapshot_id` set)
  - Created automatically from snapshot
  - Reused if AMI already exists (prevents duplicates)
  - One AMI per checkpoint snapshot

### Network Architecture

- **Public Subnet** (user-provided)
  - Must have Internet Gateway route
  - EC2 instance launched here

- **Alternate Subnet** (created automatically if ALB enabled)
  - Created in different AZ for ALB high availability
  - Only created if needed (when ALB enabled and only 1 AZ available)

### Cost Optimization

- **Stopped Infrastructure**: Only pay for EBS storage (~$1.50/month for 250GB)
- **ALB Disabled**: Access services directly via IP (HTTP only, saves ~$16-22/month)
- **No Domain**: Skip DNS/SSL setup entirely

## Configuration Variables

**Required:**
- `my_ip_cidr`: Your IP in CIDR notation (e.g., "1.2.3.4/32")
- `subnet_id`: Public subnet ID
- `ssh_key_name`: EC2 Key Pair name

**Optional:**
- `aws_region`: AWS region (default: "us-east-2")
- `elastic_ip_allocation_id`: Static IP allocation ID (default: "")
- `domain_name`: Domain for DNS/SSL (default: "")
- `root_volume_snapshot_id`: Snapshot ID to restore from (default: "")
- `enable_infrastructure`: Enable infrastructure (default: `true`)
- `enable_alb`: Enable ALB with HTTPS (default: `false`, requires `domain_name`)

See `terraform.tfvars.example` for a complete example.

## Outputs

- `instance_id`: EC2 instance ID
- `public_ip`: Public IP address
- `domain_name`: Main domain (if set)
- `load_balancer_dns`: ALB DNS name (if ALB enabled)
- `https_url`: HTTPS URL (if ALB + domain enabled)
- `cvat_url_subdomain`, `mlflow_url_subdomain`, `n8n_url_subdomain`: Service URLs
- `infrastructure_status`: Current status (UP/DOWN)
