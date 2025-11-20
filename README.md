# CVAT Workstation - Minimal Configuration

Terraform configuration for deploying a CVAT workstation on AWS EC2.

## Features

- EC2 instance with Ubuntu 22.04
- Automatic SSH host key cleanup on instance replacement
- **EBS Snapshot Restore Support** - Restore from manually created snapshots

## Checkpoint Workflow (Recommended)

This configuration supports a checkpoint/restore workflow for managing your infrastructure state at different milestones (e.g., "n8n working", "mlflow setup", etc.).

### Your Workflow

1. **Fresh Start**: Run `terraform init`, `terraform plan`, `terraform apply`
   - Creates instances from the latest snapshot checkpoint
   - Stands up ALB if enabled

2. **Work on Services**: Install/configure services on the instance

3. **Take Breaks**: Use `./down.sh` to stop instances and destroy ALB (saves money)

4. **Create Checkpoints**: When you reach milestones (e.g., "n8n working"), create a checkpoint:
   ```bash
   ./checkpoint.sh
   ```
   This will:
   - Create a snapshot of your current instance
   - Create an AMI from that snapshot
   - Update `terraform.tfvars` with the new snapshot ID

5. **Test Checkpoints**: After creating a checkpoint:
   ```bash
   # Destroy and recreate to verify
   terraform destroy -target=aws_instance.minimal
   terraform apply
   ```
   The instance will be rebuilt from the new checkpoint.

### Creating a Checkpoint

**Recommended: Use the automated script**
```bash
./checkpoint.sh
```

The script will:
1. Find your running instance
2. Create a snapshot from its root volume
3. Create an AMI from that snapshot
4. Update `terraform.tfvars` with the new snapshot ID
5. Tag everything for easy identification

**Manual Method** (if you prefer):
1. Go to AWS Console → EC2 → Volumes
2. Find your instance's root volume
3. Create snapshot with a descriptive name
4. Get the snapshot ID (starts with `snap-`)
5. Edit `terraform.tfvars` and update `root_volume_snapshot_id`

### Switching Between Checkpoints

To use a different checkpoint snapshot:

1. Edit `terraform.tfvars` and update:
   ```hcl
   root_volume_snapshot_id = "snap-YOUR-CHECKPOINT-ID"
   ```
2. Apply:
   ```bash
   terraform apply
   ```

### AMI Management

- **No Clutter**: AMIs are only created when you create a new checkpoint (new snapshot ID)
- **Reuse**: If an AMI already exists for a snapshot, Terraform will reuse it instead of creating a duplicate
- **Checkpoint-Based**: One AMI per checkpoint snapshot, not per terraform run
- **Clean Up**: Old AMIs can be manually deleted from AWS Console when no longer needed

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

## Configuration

### Required Variables

- `my_ip_cidr`: Your IP address in CIDR notation (e.g., "1.2.3.4/32") - used for SSH and service access
- `subnet_id`: Subnet ID where the EC2 instance will be launched (must be a public subnet with internet gateway)
- `ssh_key_name`: Name of the AWS EC2 Key Pair to use for SSH access

### Optional Variables

- `aws_region`: AWS region (default: "us-east-2")
- `elastic_ip_allocation_id`: Elastic IP allocation ID to associate with the instance. Leave empty to use auto-assigned public IP (default: "")
- `domain_name`: Domain name for Route 53 DNS and ACM certificate. Leave empty to disable DNS/SSL setup (default: ""). If provided, you must have a Route 53 hosted zone for this domain
- `root_volume_snapshot_id`: EBS snapshot ID to restore from (default: "")
- `enable_infrastructure`: Enable all infrastructure. When false, EC2 instances are stopped and ALB is destroyed (saves costs). Default: `true`
- `enable_alb`: Enable Application Load Balancer with HTTPS/SSL. Requires `domain_name` to be set. When disabled, services are accessed directly via IP (HTTP only). Default: `false`

### Example terraform.tfvars

```hcl
aws_region = "us-east-2"
my_ip_cidr = "YOUR_IP_ADDRESS/32"
subnet_id = "subnet-0123456789abcdef0"
ssh_key_name = "my-key-pair"

# Optional: Elastic IP (leave empty to use auto-assigned IP)
# elastic_ip_allocation_id = "eipalloc-0123456789abcdef0"

# Optional: Domain name for DNS and SSL (leave empty to disable)
# domain_name = "example.com"

# Optional: Restore from snapshot
# root_volume_snapshot_id = "snap-0123456789abcdef0"

# Infrastructure control
enable_infrastructure = true
enable_alb = false  # Set to true if you provided domain_name
```

### Getting Started

1. **Copy the example file:**
   ```bash
   cp terraform.tfvars.example terraform.tfvars
   ```

2. **Create or select an EC2 Key Pair (if you don't have one):**
   - **AWS Console:** EC2 → Key Pairs → Create Key Pair
     - Name it (e.g., `my-key-pair`)
     - Download the `.pem` file to `~/.ssh/my-key-pair.pem`
     - Set permissions: `chmod 400 ~/.ssh/my-key-pair.pem`
   - **AWS CLI:**
     ```bash
     aws ec2 create-key-pair --key-name my-key-pair --query 'KeyMaterial' --output text > ~/.ssh/my-key-pair.pem
     chmod 400 ~/.ssh/my-key-pair.pem
     ```
   - **Note:** This creates the Key Pair in AWS and downloads the private key. The Terraform code uses the Key Pair NAME (not the file path).

3. **Edit `terraform.tfvars` with your values:**
   - Get your IP: `curl ifconfig.me` (add `/32` at the end)
   - Find a public subnet in your VPC (AWS Console > VPC > Subnets)
   - Set `ssh_key_name` to the NAME of your EC2 Key Pair (the one you created/selected above)
   - Example: `ssh_key_name = "my-key-pair"`

4. **Optional: Set up domain and SSL:**
   - Create a Route 53 hosted zone for your domain
   - Set `domain_name` in `terraform.tfvars`
   - Set `enable_alb = true` to use HTTPS

5. **SSH to your instance after deployment:**
   ```bash
   ssh -i ~/.ssh/my-key-pair.pem ubuntu@<instance-ip>
   ```
   Use the private key file you downloaded when creating the Key Pair.

## Usage

### Quick Start/Stop (Recommended)

**Turn infrastructure ON:**
```bash
./up.sh
```
This will:
- Start EC2 instances
- Create ALB (if `enable_alb = true`)
- Update DNS records

**Turn infrastructure OFF (save costs):**
```bash
./down.sh
```
This will:
- Stop EC2 instances (data preserved)
- Destroy ALB (saves ~$16-22/month)
- Update DNS to point to Elastic IP

**Create a checkpoint (save your progress):**
```bash
./checkpoint.sh
```
This will:
- Create a snapshot of your current instance state
- Create an AMI from that snapshot
- Update `terraform.tfvars` with the new snapshot ID
- Tag everything for easy identification

Perfect for saving milestones like "n8n working", "mlflow configured", etc.

### Manual Setup

1. Copy `terraform.tfvars.example` to `terraform.tfvars`
2. Edit `terraform.tfvars` with your values
3. Initialize Terraform:
   ```bash
   terraform init
   ```
4. Review the plan:
   ```bash
   terraform plan
   ```
5. Apply:
   ```bash
   terraform apply
   ```

## Important Notes

- **Checkpoint-Based Snapshots**: Use `./checkpoint.sh` to create checkpoints at milestones. Don't create snapshots manually unless you understand the workflow.
- **AMI Reuse**: Terraform will reuse existing AMIs for a snapshot instead of creating duplicates. Only creates new AMIs when you create a new checkpoint (new snapshot ID).
- **Instance Replacement**: When switching to a different checkpoint, Terraform will destroy the existing instance and create a new one. The Elastic IP will be automatically reassociated.
- **SSH Host Keys**: The configuration automatically removes old SSH host keys from `~/.ssh/known_hosts` when instances are replaced, preventing SSH connection errors.
- **Volume Size**: The root volume is set to 60GB (or matches snapshot size if restoring). You can only increase volume size, not decrease.
- **Cost Savings**: When stopped, you only pay for storage (~$1.50/month for 250GB). No compute charges for stopped instances.

## Outputs

- `instance_id`: The EC2 instance ID
- `public_ip`: The public IP address of the instance (Elastic IP)
- `domain_name`: The main domain name
- `load_balancer_dns`: ALB DNS name (when ALB is enabled)
- `https_url`: HTTPS URL (when ALB is enabled)
- `cvat_url_subdomain`, `mlflow_url_subdomain`, `n8n_url_subdomain`: Subdomain URLs for each service
- `infrastructure_status`: Current infrastructure status (UP/DOWN)

