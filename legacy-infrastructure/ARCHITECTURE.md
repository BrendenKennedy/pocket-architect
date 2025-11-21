# CVAT Infrastructure Architecture Guide

## Table of Contents

1. [System Overview](#system-overview)
2. [Project Structure](#project-structure)
3. [Component Architecture](#component-architecture)
4. [Data Flow](#data-flow)
5. [Key Design Decisions](#key-design-decisions)
6. [Infrastructure Components](#infrastructure-components)
7. [CLI Command Flow](#cli-command-flow)
8. [Configuration Management](#configuration-management)
9. [State Management](#state-management)
10. [Security Architecture](#security-architecture)
11. [Cost Optimization](#cost-optimization)
12. [Extension Points](#extension-points)

---

## System Overview

This project provides a Python CLI tool for managing CVAT (Computer Vision Annotation Tool) infrastructure on AWS using Terraform. The system enables users to:

- Deploy CVAT instances on AWS EC2 with optional HTTPS/SSL
- Manage infrastructure lifecycle (start/stop) to optimize costs
- Create checkpoints (snapshots/AMIs) for data preservation
- Import existing AWS resources into Terraform state
- Automatically configure security groups, IAM roles, and networking

### Core Principles

1. **Infrastructure as Code**: All infrastructure is defined in Terraform
2. **Cost Optimization**: Infrastructure can be stopped (not destroyed) to save compute costs
3. **State Preservation**: Data persists across infrastructure cycles via EBS volumes
4. **Security First**: Least-privilege IAM roles, IP-restricted access, HTTPS support
5. **User-Friendly**: Interactive CLI with validation and helpful error messages

---

## Project Structure

```
aws-cvat-infrastructure/
├── configs/                    # User configuration files
│   └── terraform.tfvars       # Terraform variables (gitignored)
├── scripts/                    # Python CLI implementation
│   ├── cvat.py                # Main CLI entry point (Click)
│   ├── requirements.txt        # Python dependencies
│   └── cvat/                  # CLI package
│       ├── __init__.py        # Package metadata
│       ├── aws.py             # AWS API client wrapper
│       ├── config.py          # Configuration file parsing
│       ├── terraform.py       # Terraform command wrapper
│       ├── utils.py           # Shared utilities
│       ├── setup.py           # Interactive setup command
│       ├── up.py              # Start infrastructure command
│       ├── down.py            # Stop infrastructure command
│       └── checkpoint.py      # Create checkpoint command
├── terraform/                  # Terraform infrastructure code
│   ├── main.tf                # Main infrastructure definition
│   ├── variables.tf           # Variable declarations
│   ├── terraform.tfvars       # Symlink to configs/terraform.tfvars
│   └── state/                 # Terraform state files (gitignored)
│       ├── terraform.tfstate
│       └── terraform.tfstate.backup
└── README.md                   # User documentation
```

---

## Component Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    User (CLI Commands)                       │
│  setup | up | down | checkpoint                             │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Python CLI Layer (scripts/cvat/)                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  setup   │  │    up    │  │   down   │  │checkpoint│   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
│       │             │              │              │          │
│       └─────────────┴──────────────┴──────────────┘          │
│                          │                                    │
│       ┌──────────────────┴──────────────────┐                │
│       │                                    │                 │
│  ┌────▼─────┐                      ┌───────▼──────┐          │
│  │   AWS    │                      │  Terraform   │          │
│  │  Client  │                      │   Wrapper    │          │
│  └────┬─────┘                      └───────┬──────┘          │
└───────┼─────────────────────────────────────┼─────────────────┘
        │                                     │
        ▼                                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    AWS Services Layer                       │
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐        │
│  │ EC2  │  │  VPC │  │ IAM  │  │Route │  │ ACM  │        │
│  │      │  │      │  │      │  │  53  │  │      │        │
│  └──────┘  └──────┘  └──────┘  └──────┘  └──────┘        │
└─────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

#### 1. CLI Entry Point (`scripts/cvat.py`)
- **Purpose**: Main entry point using Click framework
- **Responsibilities**:
  - Register subcommands (setup, up, down, checkpoint)
  - Handle version display
  - Route commands to appropriate modules

#### 2. AWS Client (`scripts/cvat/aws.py`)
- **Purpose**: Wrapper around boto3 for AWS API calls
- **Key Methods**:
  - Resource validation (subnets, key pairs, security groups)
  - Resource discovery (existing IAM roles, security groups, EIPs)
  - Snapshot and AMI creation
  - Route 53 zone and record management
- **Design Pattern**: Singleton-like class that encapsulates all AWS clients

#### 3. Terraform Wrapper (`scripts/cvat/terraform.py`)
- **Purpose**: Subprocess wrapper for Terraform commands
- **Key Functions**:
  - `terraform_init()`: Initialize Terraform
  - `terraform_plan()`: Preview changes
  - `terraform_apply()`: Apply changes
  - `terraform_output()`: Retrieve output values
  - `terraform_import()`: Import existing resources
- **Design Pattern**: Functional interface with consistent error handling

#### 4. Configuration Manager (`scripts/cvat/config.py`)
- **Purpose**: Parse and manage `terraform.tfvars` files
- **Key Functions**:
  - `parse_tfvars()`: Parse key-value pairs from tfvars file
  - `get_config_value()`: Retrieve specific configuration value
  - `update_config_value()`: Update configuration in-place
  - `create_tfvars()`: Generate new configuration file
- **Design Pattern**: Simple key-value parser with regex matching

#### 5. Command Implementations

##### Setup Command (`scripts/cvat/setup.py`)
- **Flow**:
  1. Detect or prompt for AWS region
  2. Collect required values (subnet, SSH key, IP address)
  3. Validate inputs via AWS API
  4. Collect optional values (domain, snapshot, ALB)
  5. Generate `terraform.tfvars`
  6. Create symlink for Terraform
  7. Optionally import existing resources

##### Up Command (`scripts/cvat/up.py`)
- **Flow**:
  1. Check Terraform initialization
  2. Update `enable_infrastructure = true` in tfvars
  3. Optionally run `terraform plan`
  4. Run `terraform apply`
  5. Clean up extra Elastic IPs
  6. Display infrastructure details and access information

##### Down Command (`scripts/cvat/down.py`)
- **Flow**:
  1. Check Terraform initialization
  2. Update `enable_infrastructure = false` in tfvars
  3. Optionally run `terraform plan`
  4. Run `terraform apply` (stops instances, destroys ALB)
  5. Display cost savings and data preservation info

##### Checkpoint Command (`scripts/cvat/checkpoint.py`)
- **Flow**:
  1. Get instance ID from Terraform state
  2. Get root volume ID from instance
  3. Create EBS snapshot
  4. Wait for snapshot completion
  5. Create AMI from snapshot
  6. Update `terraform.tfvars` with snapshot ID

#### 6. Utilities (`scripts/cvat/utils.py`)
- **Purpose**: Shared helper functions
- **Key Functions**:
  - `get_project_paths()`: Resolve project directory structure
  - `ensure_symlink()`: Create symlink for Terraform var file
  - `get_terraform_state_path()`: Get state file path
  - `get_tfvars_path()`: Get tfvars file path

---

## Data Flow

### Infrastructure Deployment Flow

```
User runs: python scripts/cvat.py setup
    │
    ├─→ Collect configuration interactively
    │   ├─→ Validate subnet via AWS API
    │   ├─→ Validate SSH key via AWS API
    │   ├─→ Detect public IP
    │   └─→ Validate domain (if provided)
    │
    ├─→ Generate configs/terraform.tfvars
    │
    ├─→ Create symlink: terraform/terraform.tfvars → ../configs/terraform.tfvars
    │
    └─→ Import existing resources (optional)
        ├─→ Check for existing security groups
        ├─→ Check for existing IAM roles
        └─→ Import into Terraform state

User runs: python scripts/cvat.py up
    │
    ├─→ Update enable_infrastructure = true
    │
    ├─→ terraform plan (optional preview)
    │
    ├─→ terraform apply
    │   ├─→ Create/update IAM role and instance profile
    │   ├─→ Create/update security groups
    │   ├─→ Create/associate Elastic IP
    │   ├─→ Launch/start EC2 instance
    │   ├─→ Create ALB (if enabled)
    │   ├─→ Create ACM certificate (if domain provided)
    │   ├─→ Create Route 53 records
    │   └─→ Associate instance with ALB target group
    │
    └─→ Display outputs (IPs, URLs, SSH commands)
```

### Checkpoint Creation Flow

```
User runs: python scripts/cvat.py checkpoint
    │
    ├─→ Get instance ID from Terraform state
    │
    ├─→ Get root volume ID from instance
    │
    ├─→ Create EBS snapshot
    │   └─→ Tag with checkpoint name
    │
    ├─→ Wait for snapshot completion (AWS waiter)
    │
    ├─→ Create AMI from snapshot
    │   └─→ Tag with checkpoint metadata
    │
    └─→ Update terraform.tfvars with snapshot ID
```

### Infrastructure Teardown Flow

```
User runs: python scripts/cvat.py down
    │
    ├─→ Update enable_infrastructure = false
    │
    ├─→ terraform apply
    │   ├─→ Stop EC2 instance (preserves EBS)
    │   ├─→ Destroy ALB and related resources
    │   ├─→ Remove Route 53 records from Terraform management
    │   └─→ Preserve Elastic IP (tagged, reusable)
    │
    └─→ Display cost savings and data preservation info
```

---

## Key Design Decisions

### 1. Configuration File Location

**Decision**: Store `terraform.tfvars` in `configs/` directory, symlink to `terraform/`

**Rationale**:
- Separates user configuration from infrastructure code
- Allows multiple configurations without duplicating Terraform code
- Symlink enables Terraform to find variables automatically

**Implementation**: `ensure_symlink()` in `utils.py`

### 2. State File Management

**Decision**: Store Terraform state in `terraform/state/` directory (local, not remote)

**Rationale**:
- Simplicity for single-user deployments
- No need for remote state backend setup
- State files are gitignored for security

**Trade-off**: Not suitable for team collaboration (would need S3 backend)

### 3. Infrastructure Lifecycle Control

**Decision**: Use `enable_infrastructure` boolean flag instead of destroy/recreate

**Rationale**:
- Preserves data on EBS volumes when stopped
- Faster start/stop cycles
- Cost optimization (only pay for storage when stopped)
- ALB is destroyed when stopped (saves ~$16-22/month)

**Implementation**: Conditional resource creation in `terraform/main.tf` using `count`

### 4. Elastic IP Management

**Decision**: Auto-create Elastic IP with tag, reuse across cycles

**Rationale**:
- Provides static IP for SSH access
- Persists across instance replacements
- Terraform data source checks for existing EIP before creating

**Implementation**: `data.external.existing_eip` in `main.tf` + resource with conditional count

### 5. Resource Import Strategy

**Decision**: Interactive import of existing resources during setup

**Rationale**:
- Handles cases where resources exist in AWS but not in Terraform state
- Prevents "already exists" errors
- User-friendly with prompts

**Implementation**: `import_existing_resources()` in `setup.py`

### 6. Security Group Design

**Decision**: Separate security groups for EC2 and ALB, conditional ingress rules

**Rationale**:
- EC2 only accepts traffic from ALB when ALB enabled (hardened)
- Direct access from user IP when ALB disabled (cost savings)
- Clear separation of concerns

**Implementation**: Dynamic ingress blocks in `main.tf` based on `enable_alb`

### 7. Checkpoint System

**Decision**: Create both snapshot and AMI for checkpoints

**Rationale**:
- Snapshot preserves data
- AMI enables fast instance recreation
- Terraform can use snapshot ID directly (creates AMI if needed)

**Implementation**: `checkpoint.py` creates both, Terraform auto-creates AMI from snapshot

---

## Infrastructure Components

### Core Resources (Always Created When Enabled)

#### 1. EC2 Instance
- **Type**: `t3.xlarge` (4 vCPU, 16 GB RAM)
- **AMI**: Ubuntu 22.04 LTS (auto-selected) or from snapshot
- **Storage**: 60GB gp3 EBS (or matches snapshot size)
- **Networking**: Public subnet, auto-assign public IP
- **IAM**: Instance profile with SSM access
- **Lifecycle**: Started when `enable_infrastructure = true`, stopped when `false`

#### 2. Security Group (EC2)
- **Name**: `cvat-ui-server`
- **Ingress Rules**:
  - SSH (22) from user IP only
  - CVAT UI (8080) from ALB security group (if ALB enabled) OR from user IP (if ALB disabled)
- **Egress**: All traffic allowed

#### 3. IAM Role & Instance Profile
- **Role**: `cvat-ec2-ssm-role`
- **Policy**: `AmazonSSMManagedInstanceCore` (for Systems Manager access)
- **Purpose**: Enable SSM access without SSH keys (optional)

#### 4. Elastic IP
- **Tag**: `Name = cvat-ui-ssh-ip`
- **Lifecycle**: Created once, reused across cycles
- **Association**: Automatically associated with instance

### Optional Resources (Conditional)

#### 5. Application Load Balancer
- **Condition**: `enable_infrastructure = true` AND `enable_alb = true`
- **Type**: Application Load Balancer (internet-facing)
- **Subnets**: Requires 2+ AZs (creates alternate subnet if needed)
- **Cost**: ~$16-22/month when running
- **Lifecycle**: Destroyed when infrastructure stopped

#### 6. ALB Security Group
- **Name**: `cvat-ui-server-alb`
- **Ingress**: HTTPS (443) and HTTP (80) from anywhere (required for public ALB)
- **Egress**: All traffic allowed
- **Note**: Security hardening via TLS termination and EC2-only-from-ALB rule

#### 7. ACM Certificate
- **Condition**: ALB enabled AND `domain_name` provided
- **Type**: Public certificate with DNS validation
- **Domains**: Main domain + wildcard (`*.domain.com`)
- **Validation**: Automatic via Route 53 DNS records

#### 8. Route 53 Records
- **Condition**: `domain_name` provided
- **Records**:
  - Main domain: Points to ALB (if enabled) or Elastic IP
  - `cvat.domain.com`: Points to ALB (if enabled) or Elastic IP
- **Lifecycle**: Records removed from Terraform management when stopped (DNS may still point to EIP)

#### 9. Alternate Subnet (Auto-Created)
- **Condition**: ALB enabled AND only 1 AZ available
- **Purpose**: ALB requires subnets in 2+ AZs
- **CIDR**: Auto-calculated from VPC CIDR
- **Route Table**: Associated with main route table (for internet access)

### Snapshot & AMI Resources

#### 10. EBS Snapshot
- **Created**: Via `checkpoint` command
- **Source**: Root volume of running instance
- **Tags**: Checkpoint name, purpose, timestamp

#### 11. AMI from Snapshot
- **Created**: Via `checkpoint` command OR automatically by Terraform
- **Name**: `cvat-from-snapshot-{snapshot-suffix}`
- **Purpose**: Fast instance recreation
- **Lifecycle**: Terraform checks for existing AMI before creating (prevents duplicates)

---

## CLI Command Flow

### Setup Command Flow

```python
setup()
    │
    ├─→ Check if terraform.tfvars exists
    │   ├─→ If exists: Ask about overwrite or import-only mode
    │   └─→ If not exists: Proceed with collection
    │
    ├─→ collect_config_interactive()
    │   ├─→ Prompt for AWS region
    │   ├─→ Validate subnet ID (AWS API)
    │   ├─→ Validate SSH key name (AWS API)
    │   ├─→ Detect public IP (ifconfig.me)
    │   ├─→ Prompt for domain (optional)
    │   │   └─→ Validate Route 53 zone (AWS API)
    │   ├─→ Prompt for snapshot ID (optional)
    │   ├─→ Prompt for enable_infrastructure
    │   └─→ Prompt for enable_alb (if domain provided)
    │
    ├─→ create_tfvars()
    │   └─→ Write configs/terraform.tfvars
    │
    ├─→ ensure_symlink()
    │   └─→ Create terraform/terraform.tfvars symlink
    │
    └─→ import_existing_resources() (if user confirms)
        ├─→ Check for existing security groups
        ├─→ Check for existing IAM roles
        ├─→ Check for existing Route 53 records
        └─→ Import into Terraform state
```

### Up Command Flow

```python
up()
    │
    ├─→ Check Terraform initialization
    │   └─→ Run terraform init if needed
    │
    ├─→ Check terraform.tfvars exists
    │
    ├─→ Check if already enabled (warn if true)
    │
    ├─→ update_config_value("enable_infrastructure", "true")
    │
    ├─→ Optionally run terraform plan
    │   └─→ Check for "will be created" resources
    │       └─→ Suggest import if needed
    │
    ├─→ terraform_apply()
    │   └─→ Stream output in real-time
    │
    ├─→ Handle errors
    │   ├─→ EntityAlreadyExists → Suggest setup command
    │   ├─→ Invalid count → Suggest terraform init
    │   └─→ Credential errors → Show AWS config help
    │
    ├─→ cleanup_extra_elastic_ips()
    │   └─→ Remove EIPs not tagged cvat-ui-ssh-ip
    │
    └─→ Display infrastructure details
        ├─→ Instance ID, Elastic IP, Status
        ├─→ SSH command
        └─→ Web access URLs
```

### Down Command Flow

```python
down()
    │
    ├─→ Check Terraform initialization
    │
    ├─→ Get current instance info (before stopping)
    │
    ├─→ update_config_value("enable_infrastructure", "false")
    │
    ├─→ Optionally run terraform plan
    │
    ├─→ terraform_apply()
    │   └─→ Stops instance, destroys ALB
    │
    └─→ Display summary
        ├─→ Resources stopped/destroyed
        ├─→ Cost savings
        └─→ Data preservation info
```

### Checkpoint Command Flow

```python
checkpoint()
    │
    ├─→ Check Terraform initialization
    │
    ├─→ Get instance_id from Terraform state
    │   └─→ Error if not found (infrastructure not running)
    │
    ├─→ Get root volume_id from instance (AWS API)
    │
    ├─→ Prompt for checkpoint name
    │
    ├─→ create_snapshot()
    │   └─→ Tag with checkpoint name
    │
    ├─→ wait_snapshot_completed()
    │   └─→ AWS waiter with progress display
    │
    ├─→ create_ami_from_snapshot()
    │   └─→ Tag with checkpoint metadata
    │
    └─→ update_config_value("root_volume_snapshot_id", snapshot_id)
        └─→ Backup existing tfvars first
```

---

## Configuration Management

### Configuration File Format

**Location**: `configs/terraform.tfvars`

**Format**: HCL (HashiCorp Configuration Language) key-value pairs

**Example**:
```hcl
aws_region = "us-east-2"
my_ip_cidr = "1.2.3.4/32"
subnet_id = "subnet-xxxxxxxxxxxxxxxxx"
ssh_key_name = "my-key-pair"
domain_name = "example.com"
root_volume_snapshot_id = "snap-xxxxxxxxxxxxxxxxx"
enable_infrastructure = true
enable_alb = false
```

### Configuration Parsing

**Implementation**: `config.py` uses regex-based parsing

**Limitations**:
- Simple key-value parser (not full HCL parser)
- Assumes string values in quotes
- Comments and complex expressions not fully supported

**Future Improvement**: Use `hcl2` library for proper HCL parsing

### Configuration Updates

**Pattern**: In-place file modification via regex replacement

**Functions**:
- `get_config_value()`: Read value (with default)
- `update_config_value()`: Update existing key or append new key
- `create_tfvars()`: Generate complete file from parameters

### Symlink Strategy

**Purpose**: Allow Terraform to find variables without `-var-file` flag

**Implementation**: `terraform/terraform.tfvars` → `../configs/terraform.tfvars`

**Benefit**: Terraform automatically loads `terraform.tfvars` in working directory

---

## State Management

### Terraform State

**Location**: `terraform/state/terraform.tfstate`

**Type**: Local file (not remote backend)

**Backup**: Automatic backup files (`.backup`)

### State Operations

1. **Read State**: `terraform output` command
2. **Write State**: `terraform apply` updates state
3. **Import State**: `terraform import` adds existing resources
4. **Show State**: `terraform state show` checks resource existence

### State File Structure

Terraform state is JSON containing:
- Resource addresses
- Resource attributes
- Dependencies
- Outputs

### State Management Functions

- `terraform_output()`: Read output values
- `terraform_state_show()`: Check if resource exists in state
- `terraform_import()`: Import existing AWS resource

### State File Security

- **Gitignored**: State files contain sensitive data
- **Backup**: Automatic backups in same directory
- **Access**: Only readable by file owner (should set permissions)

---

## Security Architecture

### Network Security

#### Security Group Design
- **EC2 Security Group**: 
  - SSH (22) from user IP only (`my_ip_cidr`)
  - CVAT UI (8080) from ALB SG (if ALB) OR from user IP (if no ALB)
- **ALB Security Group**:
  - HTTPS (443) from anywhere (required for public ALB)
  - HTTP (80) from anywhere (redirects to HTTPS)
  - **Note**: EC2 is not directly exposed when ALB enabled

#### IP Restriction
- All access restricted to user's public IP (`my_ip_cidr`)
- Detected automatically or entered manually
- Format: CIDR notation (e.g., `1.2.3.4/32`)

### IAM Security

#### Instance Role
- **Name**: `cvat-ec2-ssm-role`
- **Policy**: `AmazonSSMManagedInstanceCore` (least privilege)
- **Purpose**: Enable Systems Manager access (no SSH keys needed)

#### Least Privilege Principle
- Only SSM access granted (no S3, no other services)
- No administrator access
- Role attached via instance profile

### TLS/SSL Security

#### ACM Certificate
- **Validation**: DNS validation via Route 53
- **Domains**: Main domain + wildcard
- **Lifecycle**: Auto-renewed by AWS

#### ALB TLS Termination
- TLS terminates at ALB (not on EC2)
- Modern TLS policy: `ELBSecurityPolicy-TLS13-1-2-2021-06`
- HTTP redirects to HTTPS

### Credential Management

#### AWS Credentials
- **Source**: AWS CLI configuration or environment variables
- **Profile**: Uses `terraform` profile (configurable)
- **Storage**: Not stored in project (gitignored)

#### SSH Keys
- **Storage**: User's `~/.ssh/` directory
- **Reference**: Only key pair name stored in config
- **Permissions**: User responsible for `chmod 400`

### Security Best Practices

1. **No Hardcoded Secrets**: All credentials external
2. **IP Whitelisting**: All access restricted to user IP
3. **Least Privilege IAM**: Minimal permissions granted
4. **TLS Everywhere**: HTTPS when ALB enabled
5. **State File Protection**: Gitignored, local-only

---

## Cost Optimization

### Cost Structure

#### When Infrastructure Running (`enable_infrastructure = true`)
- **EC2 Instance**: ~$0.166/hour for `t3.xlarge` (~$120/month)
- **EBS Storage**: ~$0.10/GB/month (~$6/month for 60GB)
- **ALB** (if enabled): ~$0.0225/hour (~$16-22/month)
- **Elastic IP**: Free when associated with instance
- **Route 53**: ~$0.50/month per hosted zone
- **ACM Certificate**: Free

#### When Infrastructure Stopped (`enable_infrastructure = false`)
- **EC2 Instance**: $0 (stopped, not terminated)
- **EBS Storage**: ~$0.10/GB/month (~$6/month for 60GB)
- **ALB**: $0 (destroyed)
- **Elastic IP**: Free (tagged, reusable)
- **Route 53**: ~$0.50/month per hosted zone
- **Total**: ~$6.50/month (storage only)

### Cost Savings Strategy

1. **Stop When Not in Use**: `down` command stops compute
2. **ALB Optional**: Disable ALB to save ~$16-22/month (use HTTP direct access)
3. **Snapshot Management**: Old snapshots can be deleted to save storage costs
4. **Instance Type**: `t3.xlarge` is cost-effective for CVAT workloads

### Cost Tracking

**Current**: No automatic cost tracking

**Future Enhancement**: 
- CloudWatch cost alarms
- Cost estimation before apply
- Monthly cost reports

---

## Extension Points

### Adding New Commands

1. Create new file in `scripts/cvat/` (e.g., `new_command.py`)
2. Implement Click command function
3. Register in `scripts/cvat.py`:
   ```python
   from cvat.new_command import new_command
   cli.add_command(new_command)
   ```

### Adding New AWS Resources

1. Add resource definition in `terraform/main.tf`
2. Add variable in `terraform/variables.tf` (if needed)
3. Update `setup.py` to collect configuration
4. Update `up.py` to display new outputs

### Supporting New Providers

**Current**: AWS-only

**Future**: Multi-provider support would require:
1. Provider abstraction layer
2. Provider-specific implementations
3. Unified CLI interface
4. Provider selection in configuration

### Customizing Infrastructure

1. **Instance Type**: Change `instance_type` in `main.tf`
2. **AMI**: Change AMI filter or use custom AMI ID
3. **Storage Size**: Change `volume_size` in `root_block_device`
4. **Additional Security Groups**: Add to `vpc_security_group_ids`

### Integration with CI/CD

**Current**: Manual CLI usage

**Future**: Could be integrated into CI/CD:
1. Terraform remote state backend (S3)
2. Automated apply on merge
3. Cost alerts on Slack/email
4. Automated checkpoint creation

---

## Error Handling Patterns

### Common Error Scenarios

#### 1. Resource Already Exists
- **Detection**: `EntityAlreadyExists` in Terraform output
- **Solution**: Run `setup` command to import resources
- **Implementation**: Error message with suggestion in `up.py`

#### 2. Terraform Not Initialized
- **Detection**: Check for `.terraform/` directory
- **Solution**: Auto-prompt to run `terraform init`
- **Implementation**: `is_terraform_initialized()` check

#### 3. Invalid Configuration
- **Detection**: AWS API validation errors
- **Solution**: Show clear error with validation details
- **Implementation**: Validation in `setup.py` before file creation

#### 4. Credential Errors
- **Detection**: Boto3 `ClientError` with credential issues
- **Solution**: Show AWS configuration help
- **Implementation**: Try-catch in AWS client methods

### Error Recovery Strategies

1. **Automatic Retry**: Terraform init retry in commands
2. **User Guidance**: Clear error messages with next steps
3. **State Validation**: Check state before operations
4. **Resource Import**: Automatic import suggestions

---

## Testing Strategy

### Current Testing

**Status**: No automated tests

### Recommended Testing

1. **Unit Tests**:
   - Configuration parsing
   - AWS client methods (mocked)
   - Terraform wrapper functions

2. **Integration Tests**:
   - End-to-end command execution
   - Terraform apply/destroy cycles
   - Resource import/export

3. **Validation Tests**:
   - Configuration validation
   - AWS resource existence checks
   - State file integrity

---

## Future Enhancements

### Planned Features

1. **Remote State Backend**: S3 backend for team collaboration
2. **Cost Tracking**: Automatic cost estimation and alerts
3. **Multi-Region Support**: Deploy to multiple regions
4. **Auto-Scaling**: Scale instances based on load
5. **Backup Automation**: Scheduled checkpoint creation

### Technical Debt

1. **HCL Parser**: Replace regex with proper HCL parser
2. **Error Handling**: More comprehensive error recovery
3. **Testing**: Add unit and integration tests
4. **Documentation**: API documentation for modules
5. **Type Hints**: Complete type annotations

---

## Conclusion

This architecture provides a solid foundation for managing CVAT infrastructure on AWS. The design prioritizes:

- **Simplicity**: Easy to understand and modify
- **Cost Optimization**: Stop/start cycles save money
- **Security**: Least privilege, IP restrictions, HTTPS
- **User Experience**: Interactive CLI with helpful messages
- **Extensibility**: Clear extension points for new features

The system is production-ready for single-user deployments and can be extended for team use with remote state backends and additional automation.

