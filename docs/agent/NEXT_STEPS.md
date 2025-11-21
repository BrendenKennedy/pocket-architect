# Next Steps - Security Implementation Guide

This document provides a step-by-step guide to integrate the security hardening into the existing codebase.

## Phase 1: Integrate Secure Credential Management (1-2 days)

### Step 1.1: Update `scripts/cvat/aws.py` to use SecureAWSClients

**File:** `scripts/cvat/aws.py`

**Current code:**
```python
import boto3
from botocore.exceptions import ClientError, BotoCoreError

class AWSClients:
    def __init__(self, region: str = "us-east-2"):
        self.region = region
        self.ec2 = boto3.client('ec2', region_name=region)
        self.iam = boto3.client('iam', region_name=region)
        self.route53 = boto3.client('route53', region_name=region)
```

**New code:**
```python
import boto3
from botocore.exceptions import ClientError, BotoCoreError
from typing import Optional
from .security import SecureAWSClients, SecurityError

class AWSClients:
    """AWS API calls using secure credential management.
    
    This class now wraps SecureAWSClients for security hardening.
    """
    
    def __init__(self, region: str = "us-east-2", profile: str = "terraform"):
        """Initialize AWS clients with security validation.
        
        Args:
            region: AWS region
            profile: AWS CLI profile name (default: "terraform")
            
        Raises:
            SecurityError: If credentials are invalid or over-privileged
        """
        self.region = region
        self.profile = profile
        # Use secure wrapper
        self._secure_client = SecureAWSClients(region=region, profile=profile)
        # Expose clients for backward compatibility
        self.ec2 = self._secure_client.ec2
        self.iam = self._secure_client.iam
        self.route53 = self._secure_client.route53
    
    def cleanup(self):
        """Clean up credentials from memory."""
        if self._secure_client:
            self._secure_client.cleanup()
    
    def __enter__(self):
        """Context manager entry."""
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit - cleanup credentials."""
        self.cleanup()
```

**Testing:**
```bash
# Test with valid credentials
python scripts/cvat.py setup

# Test with invalid credentials
unset AWS_ACCESS_KEY_ID
python scripts/cvat.py setup
# Should show: "No valid AWS credentials found"
```

### Step 1.2: Update `scripts/cvat/setup.py` to use context managers

**File:** `scripts/cvat/setup.py`

**Find all instances of:**
```python
aws_clients = AWSClients(region=region)
```

**Replace with:**
```python
with AWSClients(region=region, profile="terraform") as aws_clients:
    # Use aws_clients here
```

**Specific locations to update:**
1. Line ~69: `aws_clients = AWSClients(region=region)` → Use context manager
2. Line ~191: `aws_clients = AWSClients(region=region)` → Use context manager
3. Line ~375: `aws_clients = AWSClients(region=region)` → Use context manager
4. Line ~451: `aws_clients = AWSClients(region=region)` → Use context manager

**Example update:**
```python
# OLD:
aws_clients = AWSClients(region=region)
vpc_id = aws_clients.get_vpc_id_from_subnet(subnet_id)

# NEW:
with AWSClients(region=region, profile="terraform") as aws_clients:
    vpc_id = aws_clients.get_vpc_id_from_subnet(subnet_id)
```

### Step 1.3: Add input validation to `scripts/cvat/setup.py`

**File:** `scripts/cvat/setup.py`

**Add import:**
```python
from .security import InputValidator
```

**Update subnet ID validation (around line 73):**
```python
# OLD:
subnet_id = Prompt.ask("...")
if not subnet_id.startswith("subnet-"):
    if not Confirm.ask("..."):

# NEW:
subnet_id = Prompt.ask("...")
if not InputValidator.validate_subnet_id(subnet_id):
    console.print("   [red]❌ Invalid subnet ID format![/red]")
    console.print("   Format must be: subnet-xxxxxxxxxxxxxxxxx")
    continue
```

**Update IP/CIDR validation (around line 127):**
```python
# OLD:
config["my_ip_cidr"] = f"{detected_ip}/32"

# NEW:
ip_cidr = f"{detected_ip}/32"
if not InputValidator.validate_cidr_is_host(ip_cidr):
    console.print("   [red]❌ Invalid IP address![/red]")
    continue
config["my_ip_cidr"] = ip_cidr
```

**Update domain name validation (around line 143):**
```python
# OLD:
domain = Prompt.ask("...")

# NEW:
domain = Prompt.ask("...")
if domain and not InputValidator.validate_domain_name(domain):
    console.print("   [red]❌ Invalid domain name format![/red]")
    domain = ""
```

**Update SSH key validation (around line 98):**
```python
# OLD:
ssh_key = Prompt.ask("...")

# NEW:
ssh_key = Prompt.ask("...")
if not InputValidator.validate_key_pair_name(ssh_key):
    console.print("   [red]❌ Invalid key pair name![/red]")
    console.print("   Key pair name must be 1-255 alphanumeric characters, dashes, or underscores")
    continue
```

### Step 1.4: Update other command files

**Files to update:**
- `scripts/cvat/up.py` - Use context manager for AWSClients
- `scripts/cvat/down.py` - Use context manager for AWSClients  
- `scripts/cvat/checkpoint.py` - Use context manager for AWSClients

**Pattern:**
```python
# Find:
aws_clients = AWSClients(region=region)

# Replace with:
with AWSClients(region=region, profile="terraform") as aws_clients:
    # Existing code using aws_clients
```

### Step 1.5: Test Phase 1

```bash
# Install dependencies
pip install -r scripts/requirements.txt

# Test setup with valid credentials
python scripts/cvat.py setup

# Test with AdministratorAccess (should warn)
# Test with invalid inputs (should reject)
```

## Phase 2: Secure Terraform Execution (1 day)

### Step 2.1: Update `scripts/cvat/terraform.py`

**File:** `scripts/cvat/terraform.py`

**Add imports:**
```python
import shlex
import os
from .security import InputValidator, SecurityError
```

**Update `run_terraform_command` function:**
```python
def run_terraform_command(
    terraform_dir: Path,
    command: str,
    args: Optional[List[str]] = None,
    state_file: Optional[Path] = None,
    var_file: Optional[Path] = None,
    auto_approve: bool = False,
    capture_output: bool = False,
) -> Tuple[int, str, str]:
    """Run a terraform command with security hardening."""
    
    # Validate terraform directory
    if not terraform_dir.exists():
        raise SecurityError(f"Terraform directory does not exist: {terraform_dir}")
    
    # Build command securely
    cmd = ["terraform", command]
    
    # Validate and sanitize paths
    if state_file:
        state_file = InputValidator.sanitize_path(str(state_file), terraform_dir)
        cmd.extend(["-state", str(state_file)])
    
    if var_file:
        var_file = InputValidator.sanitize_path(str(var_file), terraform_dir)
        cmd.extend(["-var-file", str(var_file)])
    
    if auto_approve:
        cmd.append("-auto-approve")
    
    # Validate and sanitize arguments
    if args:
        for arg in args:
            # Sanitize each argument to prevent command injection
            sanitized = InputValidator.sanitize_shell_argument(str(arg))
            cmd.append(sanitized)
    
    # Create secure environment (don't pass AWS credentials to subprocess)
    secure_env = {
        k: v for k, v in os.environ.items()
        if not k.startswith("AWS_") or k in ["AWS_PROFILE", "AWS_REGION"]
    }
    
    # Execute with security constraints
    if capture_output:
        result = subprocess.run(
            cmd,
            cwd=str(terraform_dir),
            capture_output=True,
            text=True,
            timeout=3600,  # 1 hour timeout
            env=secure_env,
        )
        return result.returncode, result.stdout, result.stderr
    else:
        # Stream output in real-time
        process = subprocess.Popen(
            cmd,
            cwd=str(terraform_dir),
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
            timeout=3600,
            env=secure_env,
        )
        
        output_lines = []
        for line in process.stdout:
            print(line, end='')
            output_lines.append(line)
        
        process.wait()
        output = ''.join(output_lines)
        return process.returncode, output, ""
```

### Step 2.2: Test Phase 2

```bash
# Test terraform commands
cd terraform
python -c "from scripts.cvat.terraform import terraform_init; terraform_init(Path('.'))"
```

## Phase 3: Infrastructure Security (2-3 days)

### Step 3.1: Add WAF Variables

**File:** `terraform/variables.tf`

**Add:**
```hcl
variable "enable_waf" {
  description = "Enable AWS WAF for Application Load Balancer (recommended for production)"
  type        = bool
  default     = false
}
```

### Step 3.2: Create WAF Configuration

**File:** `terraform/waf.tf` (new file)

**Copy from:** `SECURITY_HARDENING_PLAN.md` section "2.1 Add AWS WAF"

**Key points:**
- OWASP Top 10 protection
- SQL injection protection
- Rate limiting (2000 requests per 5 minutes per IP)
- CloudWatch metrics enabled

### Step 3.3: Add VPC Flow Logs Variables

**File:** `terraform/variables.tf`

**Add:**
```hcl
variable "enable_flow_logs" {
  description = "Enable VPC Flow Logs for network monitoring"
  type        = bool
  default     = false
}

variable "flow_logs_kms_key_id" {
  description = "KMS key ID for encrypting Flow Logs (optional)"
  type        = string
  default     = ""
}
```

### Step 3.4: Create Flow Logs Configuration

**File:** `terraform/flow_logs.tf` (new file)

**Copy from:** `SECURITY_HARDENING_PLAN.md` section "2.2 Add VPC Flow Logs"

### Step 3.5: Update Security Groups for Egress Restrictions

**File:** `terraform/main.tf`

**Find the EC2 security group egress rule (around line 211):**
```hcl
# OLD:
egress {
  from_port   = 0
  to_port     = 0
  protocol    = "-1"
  cidr_blocks = ["0.0.0.0/0"]
  description = "All outbound"
}
```

**Replace with:**
```hcl
# Restricted egress - only allow necessary traffic
egress {
  description = "HTTPS to AWS services and internet"
  from_port   = 443
  to_port     = 443
  protocol    = "tcp"
  cidr_blocks = ["0.0.0.0/0"]
}

egress {
  description = "HTTP to AWS services (for package updates)"
  from_port   = 80
  to_port     = 80
  protocol    = "tcp"
  cidr_blocks = ["0.0.0.0/0"]
}

egress {
  description = "DNS"
  from_port   = 53
  to_port     = 53
  protocol    = "udp"
  cidr_blocks = ["0.0.0.0/0"]
}
```

**Find the ALB security group egress rule (around line 266):**
```hcl
# OLD:
egress {
  from_port   = 0
  to_port     = 0
  protocol    = "-1"
  cidr_blocks = ["0.0.0.0/0"]
  description = "All outbound"
}
```

**Replace with:**
```hcl
# ALB egress - only to EC2 on port 8080
egress {
  description     = "HTTP to EC2 instance"
  from_port       = 8080
  to_port         = 8080
  protocol        = "tcp"
  security_groups = [aws_security_group.cvat[0].id]
}
```

### Step 3.6: Add ALB Deletion Protection Variable

**File:** `terraform/variables.tf`

**Add:**
```hcl
variable "enable_deletion_protection" {
  description = "Enable deletion protection for ALB (recommended for production)"
  type        = bool
  default     = false
}
```

**File:** `terraform/main.tf`

**Update ALB resource (around line 596):**
```hcl
resource "aws_lb" "main" {
  # ... existing config ...
  enable_deletion_protection = var.enable_deletion_protection
}
```

### Step 3.7: Test Phase 3

```bash
# Initialize Terraform
cd terraform
terraform init

# Plan with WAF enabled
terraform plan -var-file=../configs/terraform.tfvars \
  -var="enable_waf=true" \
  -var="enable_flow_logs=true" \
  -var="enable_deletion_protection=true"

# Review the plan carefully
# Apply if satisfied
terraform apply -var-file=../configs/terraform.tfvars \
  -var="enable_waf=true" \
  -var="enable_flow_logs=true" \
  -var="enable_deletion_protection=true"
```

## Phase 4: Monitoring & Alerting (1 day)

### Step 4.1: Add Monitoring Variables

**File:** `terraform/variables.tf`

**Add:**
```hcl
variable "sns_topic_arn" {
  description = "SNS topic ARN for CloudWatch alarms (optional)"
  type        = string
  default     = ""
}
```

### Step 4.2: Create Monitoring Configuration

**File:** `terraform/monitoring.tf` (new file)

**Copy from:** `SECURITY_HARDENING_PLAN.md` section "2.3 Add Security Monitoring"

### Step 4.3: Test Phase 4

```bash
# Create SNS topic (optional)
aws sns create-topic --name cvat-alerts

# Get ARN and add to terraform.tfvars
# sns_topic_arn = "arn:aws:sns:us-east-2:123456789012:cvat-alerts"

# Apply monitoring
terraform apply -var-file=../configs/terraform.tfvars
```

## Phase 5: Testing & Validation (1 day)

### Step 5.1: Run Security Scans

```bash
# Install security scanning tools
pip install checkov

# Scan Terraform code
checkov -d terraform/

# Install tfsec
# (See https://github.com/aquasecurity/tfsec for installation)
tfsec terraform/
```

### Step 5.2: Test Credential Validation

```bash
# Test with no credentials
unset AWS_ACCESS_KEY_ID
unset AWS_SECRET_ACCESS_KEY
python scripts/cvat.py setup
# Should fail with clear error message

# Test with AdministratorAccess (if you have it)
# Should show security warning but allow (or block if configured)
```

### Step 5.3: Test Input Validation

```bash
# Test with invalid subnet ID
python scripts/cvat.py setup
# Enter: "invalid-subnet-id"
# Should reject with error message

# Test with invalid domain
# Enter: "invalid..domain"
# Should reject
```

### Step 5.4: Test Infrastructure Security

```bash
# Deploy with WAF enabled
terraform apply -var="enable_waf=true"

# Test WAF rules
# Try SQL injection: curl "https://your-domain.com/cvat?id=1' OR '1'='1"
# Should be blocked by WAF

# Check Flow Logs
aws logs tail /aws/vpc/flowlogs --follow

# Check WAF metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/WAFV2 \
  --metric-name BlockedRequests \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Sum
```

## Phase 6: Documentation (1 day)

### Step 6.1: Update README.md

**Add security section:**
```markdown
## Security

This project implements comprehensive security hardening:

- **Credential Management**: Uses AWS CLI credential chain (secure by default)
- **Least-Privilege**: Validates credentials don't have AdministratorAccess
- **Input Validation**: All user inputs are validated to prevent injection attacks
- **Network Security**: WAF, Flow Logs, and monitoring available
- **Memory Safety**: Credentials cleared from memory when done

See [SECURITY_CHECKLIST.md](SECURITY_CHECKLIST.md) for complete security review.
```

### Step 6.2: Create User Guide

**File:** `SECURITY_USER_GUIDE.md` (optional)

Document:
- How to set up credentials securely
- How to enable WAF and Flow Logs
- How to interpret security warnings
- Troubleshooting security issues

## Implementation Checklist

### Phase 1: CLI Security
- [ ] Update `scripts/cvat/aws.py` to use SecureAWSClients
- [ ] Update `scripts/cvat/setup.py` to use context managers
- [ ] Add input validation to `setup.py`
- [ ] Update `scripts/cvat/up.py` to use context managers
- [ ] Update `scripts/cvat/down.py` to use context managers
- [ ] Update `scripts/cvat/checkpoint.py` to use context managers
- [ ] Test credential validation
- [ ] Test input validation

### Phase 2: Terraform Security
- [ ] Update `scripts/cvat/terraform.py` with secure execution
- [ ] Test terraform commands

### Phase 3: Infrastructure Security
- [ ] Add WAF variables
- [ ] Create `terraform/waf.tf`
- [ ] Add Flow Logs variables
- [ ] Create `terraform/flow_logs.tf`
- [ ] Update EC2 security group egress
- [ ] Update ALB security group egress
- [ ] Add ALB deletion protection
- [ ] Test WAF deployment
- [ ] Test Flow Logs

### Phase 4: Monitoring
- [ ] Add monitoring variables
- [ ] Create `terraform/monitoring.tf`
- [ ] Test CloudWatch alarms

### Phase 5: Testing
- [ ] Run checkov scan
- [ ] Run tfsec scan
- [ ] Test credential validation
- [ ] Test input validation
- [ ] Test WAF rules
- [ ] Test Flow Logs

### Phase 6: Documentation
- [ ] Update README.md
- [ ] Create user guide (optional)

## Estimated Timeline

- **Phase 1**: 1-2 days
- **Phase 2**: 1 day
- **Phase 3**: 2-3 days
- **Phase 4**: 1 day
- **Phase 5**: 1 day
- **Phase 6**: 1 day

**Total**: 7-9 days

## Priority Order

1. **Phase 1** (CLI Security) - Highest priority, prevents credential leaks
2. **Phase 2** (Terraform Security) - High priority, prevents command injection
3. **Phase 3** (Infrastructure Security) - Medium priority, adds defense in depth
4. **Phase 4** (Monitoring) - Medium priority, enables detection
5. **Phase 5** (Testing) - Required before production
6. **Phase 6** (Documentation) - Required for users

## Getting Help

- See `SECURITY_QUICK_START.md` for code examples
- See `SECURITY_HARDENING_PLAN.md` for detailed Terraform code
- See `SECURITY_CHECKLIST.md` for complete security review
- See `SECURITY_IMPLEMENTATION_SUMMARY.md` for what was implemented

---

**Ready to start?** Begin with Phase 1, Step 1.1!

