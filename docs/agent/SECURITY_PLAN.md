# Security Hardening Plan - Bulletproof Implementation

This document outlines a comprehensive security hardening plan to make the CVAT infrastructure and CLI bulletproof for security.

## Executive Summary

**Current State:**
- Basic security in place (security groups, TLS, etc.)
- No credential validation or least-privilege checks
- No secure in-memory secret management
- Missing WAF, DDoS protection, monitoring
- No infrastructure security hardening

**Target State:**
- AWS CLI-based credential management (secure by default)
- Least-privilege credential validation
- Secure in-memory secret handling (no secrets in process memory longer than needed)
- Comprehensive infrastructure security (WAF, Shield, monitoring)
- Defense in depth at every layer

## Phase 1: Secure Credential Management (CLI)

### 1.1 AWS CLI Integration Strategy

**Approach:** Use AWS CLI as the credential base, wrap with secure Python layer

**Benefits:**
- AWS CLI handles credential chain securely (env vars → ~/.aws/credentials → IAM roles)
- Supports SSO, MFA, temporary credentials
- No need to reimplement credential management
- Battle-tested security

**Implementation:**

```python
# New file: scripts/cvat/security/credentials.py

import subprocess
import json
import os
import sys
from typing import Optional, Dict, Any
from pathlib import Path
import keyring  # For secure storage of session tokens
import getpass

class SecureCredentialManager:
    """Secure credential management using AWS CLI as base"""
    
    def __init__(self, profile: str = "terraform"):
        self.profile = profile
        self._session_cache: Optional[Dict[str, Any]] = None
    
    def get_aws_identity(self) -> Dict[str, Any]:
        """Get current AWS identity using AWS CLI (most secure method)"""
        try:
            result = subprocess.run(
                ["aws", "sts", "get-caller-identity", "--profile", self.profile],
                capture_output=True,
                text=True,
                check=True,
                timeout=10
            )
            return json.loads(result.stdout)
        except (subprocess.CalledProcessError, json.JSONDecodeError, subprocess.TimeoutExpired) as e:
            raise SecurityError(f"Failed to get AWS identity: {e}")
    
    def validate_credentials(self) -> bool:
        """Validate credentials exist and are valid"""
        try:
            identity = self.get_aws_identity()
            return identity.get("Arn") is not None
        except SecurityError:
            return False
    
    def check_least_privilege(self) -> Dict[str, Any]:
        """Check if credentials have least-privilege (refuse AdministratorAccess)"""
        identity = self.get_aws_identity()
        arn = identity.get("Arn", "")
        
        # Check for AdministratorAccess
        if ":user/" in arn:
            # For IAM users, check attached policies
            username = arn.split("/")[-1]
            result = subprocess.run(
                ["aws", "iam", "list-attached-user-policies", 
                 "--user-name", username, "--profile", self.profile],
                capture_output=True,
                text=True,
                check=False,
                timeout=10
            )
            if result.returncode == 0:
                policies = json.loads(result.stdout).get("AttachedPolicies", [])
                for policy in policies:
                    if "AdministratorAccess" in policy.get("PolicyArn", ""):
                        raise SecurityError(
                            "CRITICAL: Credentials have AdministratorAccess. "
                            "This violates least-privilege principle. "
                            "Please use credentials with minimal required permissions."
                        )
        
        return {
            "identity": identity,
            "least_privilege": True,
            "warnings": []
        }
    
    def get_credentials_securely(self) -> Dict[str, str]:
        """Get credentials using AWS CLI (never store in memory longer than needed)"""
        # Use AWS CLI to get temporary credentials
        # This ensures we use the credential chain properly
        try:
            result = subprocess.run(
                ["aws", "configure", "get", "aws_access_key_id", "--profile", self.profile],
                capture_output=True,
                text=True,
                check=False
            )
            if result.returncode != 0:
                # Try environment variables
                access_key = os.environ.get("AWS_ACCESS_KEY_ID")
                secret_key = os.environ.get("AWS_SECRET_ACCESS_KEY")
                session_token = os.environ.get("AWS_SESSION_TOKEN")
                
                if not access_key or not secret_key:
                    raise SecurityError("No AWS credentials found. Run 'aws configure' first.")
                
                return {
                    "aws_access_key_id": access_key,
                    "aws_secret_access_key": secret_key,
                    "aws_session_token": session_token,
                    "source": "environment"
                }
            
            # Credentials are in AWS CLI config - use boto3 session (more secure)
            # Don't extract raw credentials - use boto3 session instead
            return {"source": "aws_cli_profile"}
            
        except Exception as e:
            raise SecurityError(f"Failed to get credentials: {e}")
    
    def create_boto3_session(self):
        """Create boto3 session using AWS CLI credential chain (most secure)"""
        import boto3
        
        # Use AWS CLI profile - boto3 will use credential chain
        session = boto3.Session(profile_name=self.profile)
        
        # Verify session works
        try:
            sts = session.client('sts')
            sts.get_caller_identity()
        except Exception as e:
            raise SecurityError(f"Failed to create secure session: {e}")
        
        return session
    
    def clear_credentials_from_memory(self):
        """Clear any cached credentials from memory"""
        if self._session_cache:
            # Overwrite with random data
            import secrets
            for key in self._session_cache:
                if isinstance(self._session_cache[key], str):
                    self._session_cache[key] = secrets.token_bytes(len(self._session_cache[key]))
            self._session_cache = None


class SecurityError(Exception):
    """Security-related exception"""
    pass
```

### 1.2 Secure AWS Client Wrapper

**New file: `scripts/cvat/security/aws_client.py`**

```python
"""Secure AWS client wrapper using AWS CLI credential chain"""

import boto3
from typing import Optional
from .credentials import SecureCredentialManager, SecurityError

class SecureAWSClients:
    """Secure AWS clients with credential validation"""
    
    def __init__(self, region: str = "us-east-2", profile: str = "terraform"):
        self.region = region
        self.profile = profile
        self._credential_manager = SecureCredentialManager(profile)
        self._session = None
        self._validate_and_init()
    
    def _validate_and_init(self):
        """Validate credentials and initialize clients"""
        # Step 1: Validate credentials exist
        if not self._credential_manager.validate_credentials():
            raise SecurityError(
                "No valid AWS credentials found. "
                "Please run 'aws configure --profile terraform' or set AWS environment variables."
            )
        
        # Step 2: Check least-privilege
        try:
            self._credential_manager.check_least_privilege()
        except SecurityError as e:
            # Log warning but don't block (user may have valid reason)
            import warnings
            warnings.warn(str(e), SecurityWarning)
        
        # Step 3: Create secure session
        self._session = self._credential_manager.create_boto3_session()
        
        # Step 4: Create clients
        self.ec2 = self._session.client('ec2', region_name=self.region)
        self.iam = self._session.client('iam', region_name=self.region)
        self.route53 = self._session.client('route53', region_name=self.region)
        self.sts = self._session.client('sts', region_name=self.region)
    
    def get_caller_identity(self) -> dict:
        """Get current AWS identity"""
        return self.sts.get_caller_identity()
    
    def cleanup(self):
        """Clean up credentials from memory"""
        self._credential_manager.clear_credentials_from_memory()
        # Clear client references
        self.ec2 = None
        self.iam = None
        self.route53 = None
        self.sts = None
        self._session = None


class SecurityWarning(UserWarning):
    """Security warning"""
    pass
```

### 1.3 Input Validation & Sanitization

**New file: `scripts/cvat/security/validation.py`**

```python
"""Input validation and sanitization for security"""

import re
import ipaddress
from typing import Optional
from pathlib import Path

class InputValidator:
    """Secure input validation"""
    
    # AWS resource ID patterns
    SUBNET_ID_PATTERN = re.compile(r'^subnet-[0-9a-f]{17}$')
    VPC_ID_PATTERN = re.compile(r'^vpc-[0-9a-f]{17}$')
    SNAPSHOT_ID_PATTERN = re.compile(r'^snap-[0-9a-f]{17}$')
    AMI_ID_PATTERN = re.compile(r'^ami-[0-9a-f]{17}$')
    INSTANCE_ID_PATTERN = re.compile(r'^i-[0-9a-f]{17}$')
    KEY_PAIR_NAME_PATTERN = re.compile(r'^[a-zA-Z0-9\-_]{1,255}$')
    DOMAIN_NAME_PATTERN = re.compile(r'^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$')
    
    @classmethod
    def validate_subnet_id(cls, subnet_id: str) -> bool:
        """Validate subnet ID format"""
        return bool(cls.SUBNET_ID_PATTERN.match(subnet_id))
    
    @classmethod
    def validate_cidr(cls, cidr: str) -> bool:
        """Validate CIDR notation"""
        try:
            ipaddress.ip_network(cidr, strict=False)
            return True
        except ValueError:
            return False
    
    @classmethod
    def validate_domain_name(cls, domain: str) -> bool:
        """Validate domain name format"""
        if not domain or len(domain) > 253:
            return False
        return bool(cls.DOMAIN_NAME_PATTERN.match(domain))
    
    @classmethod
    def validate_key_pair_name(cls, name: str) -> bool:
        """Validate EC2 key pair name"""
        return bool(cls.KEY_PAIR_NAME_PATTERN.match(name))
    
    @classmethod
    def sanitize_path(cls, path: str, base_dir: Optional[Path] = None) -> Path:
        """Sanitize file path to prevent directory traversal"""
        resolved = Path(path).resolve()
        if base_dir:
            base_resolved = Path(base_dir).resolve()
            if not str(resolved).startswith(str(base_resolved)):
                raise SecurityError(f"Path outside base directory: {path}")
        return resolved
    
    @classmethod
    def validate_aws_region(cls, region: str) -> bool:
        """Validate AWS region format"""
        # AWS regions: us-east-1, eu-west-1, etc.
        pattern = re.compile(r'^[a-z]{2}-[a-z]+-\d+$')
        return bool(pattern.match(region))
```

## Phase 2: Infrastructure Security Hardening

### 2.1 Add AWS WAF

**New file: `terraform/waf.tf`**

```hcl
# AWS WAF for Application Load Balancer
resource "aws_wafv2_web_acl" "main" {
  count       = var.enable_infrastructure && var.enable_alb && var.enable_waf ? 1 : 0
  name        = "cvat-waf-acl"
  description = "WAF for CVAT Application Load Balancer"
  scope       = "REGIONAL"

  default_action {
    allow {}
  }

  # OWASP Top 10 protection
  rule {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 1

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "CommonRuleSetMetric"
      sampled_requests_enabled   = true
    }
  }

  # SQL injection protection
  rule {
    name     = "AWSManagedRulesSQLiRuleSet"
    priority = 2

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesSQLiRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "SQLiRuleSetMetric"
      sampled_requests_enabled   = true
    }
  }

  # Rate limiting
  rule {
    name     = "RateLimitRule"
    priority = 3

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = 2000
        aggregate_key_type = "IP"

        scope_down_statement {
          geo_match_statement {
            country_codes = ["US", "CA", "GB", "DE", "FR"] # Adjust as needed
          }
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "RateLimitMetric"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "cvat-waf-metric"
    sampled_requests_enabled   = true
  }

  tags = {
    Name = "cvat-waf-acl"
  }
}

# Associate WAF with ALB
resource "aws_wafv2_web_acl_association" "alb" {
  count        = var.enable_infrastructure && var.enable_alb && var.enable_waf ? 1 : 0
  resource_arn = aws_lb.main[0].arn
  web_acl_arn  = aws_wafv2_web_acl.main[0].arn
}
```

### 2.2 Add VPC Flow Logs

**New file: `terraform/flow_logs.tf`**

```hcl
# CloudWatch Log Group for VPC Flow Logs
resource "aws_cloudwatch_log_group" "vpc_flow_logs" {
  count             = var.enable_infrastructure && var.enable_flow_logs ? 1 : 0
  name              = "/aws/vpc/flowlogs"
  retention_in_days = 30

  kms_key_id = var.flow_logs_kms_key_id

  tags = {
    Name = "cvat-vpc-flow-logs"
  }
}

# IAM Role for VPC Flow Logs
resource "aws_iam_role" "vpc_flow_logs" {
  count = var.enable_infrastructure && var.enable_flow_logs ? 1 : 0
  name  = "cvat-vpc-flow-logs-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "vpc-flow-logs.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "vpc_flow_logs" {
  count = var.enable_infrastructure && var.enable_flow_logs ? 1 : 0
  name  = "cvat-vpc-flow-logs-policy"
  role  = aws_iam_role.vpc_flow_logs[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogGroups",
          "logs:DescribeLogStreams"
        ]
        Resource = "*"
      }
    ]
  })
}

# VPC Flow Logs
resource "aws_flow_log" "vpc" {
  count                    = var.enable_infrastructure && var.enable_flow_logs ? 1 : 0
  iam_role_arn             = aws_iam_role.vpc_flow_logs[0].arn
  log_destination          = aws_cloudwatch_log_group.vpc_flow_logs[0].arn
  log_destination_type     = "cloud-watch-logs"
  traffic_type             = "ALL"
  vpc_id                   = data.aws_vpc.target.id
  max_aggregation_interval = 60

  tags = {
    Name = "cvat-vpc-flow-logs"
  }
}
```

### 2.3 Add Security Monitoring

**New file: `terraform/monitoring.tf`**

```hcl
# CloudWatch Alarms for Security Events
resource "aws_cloudwatch_metric_alarm" "high_error_rate" {
  count               = var.enable_infrastructure && var.enable_alb ? 1 : 0
  alarm_name          = "cvat-high-error-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "HTTPCode_Target_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = 300
  statistic           = "Sum"
  threshold           = 10
  alarm_description   = "This metric monitors high error rates"
  alarm_actions       = var.sns_topic_arn != "" ? [var.sns_topic_arn] : []

  dimensions = {
    LoadBalancer = aws_lb.main[0].arn_suffix
  }

  tags = {
    Name = "cvat-high-error-rate-alarm"
  }
}

# Security Group Change Detection (via AWS Config - requires separate setup)
# Note: AWS Config requires additional setup and costs
```

### 2.4 Restrict Egress Traffic

**Update: `terraform/main.tf` (Security Groups)**

```hcl
# EC2 Security Group - Restricted Egress
resource "aws_security_group" "cvat" {
  # ... existing ingress rules ...

  # Restricted egress - only allow necessary traffic
  egress {
    description = "HTTPS to AWS services"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"] # Can be further restricted to AWS IP ranges
  }

  egress {
    description = "HTTP to AWS services (for package updates)"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"] # Can be further restricted
  }

  egress {
    description = "DNS"
    from_port   = 53
    to_port     = 53
    protocol    = "udp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Remove the "all outbound" rule
}
```

### 2.5 Add ALB Deletion Protection

**Update: `terraform/main.tf`**

```hcl
resource "aws_lb" "main" {
  # ... existing config ...
  enable_deletion_protection = var.enable_deletion_protection # Add variable
}
```

## Phase 3: Secure Terraform Execution

### 3.1 Secure Terraform Wrapper

**Update: `scripts/cvat/terraform.py`**

```python
"""Secure Terraform execution wrapper"""

import subprocess
import shlex
from pathlib import Path
from typing import Optional, List, Tuple

def run_terraform_command_secure(
    terraform_dir: Path,
    command: str,
    args: Optional[List[str]] = None,
    state_file: Optional[Path] = None,
    var_file: Optional[Path] = None,
    auto_approve: bool = False,
    capture_output: bool = False,
) -> Tuple[int, str, str]:
    """Run terraform command with security hardening"""
    
    # Validate all inputs
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
            # Sanitize each argument
            sanitized = shlex.quote(str(arg))
            cmd.append(sanitized)
    
    # Execute with security constraints
    result = subprocess.run(
        cmd,
        cwd=str(terraform_dir),
        capture_output=capture_output,
        text=True,
        timeout=3600,  # 1 hour timeout
        env={
            **os.environ,
            # Don't pass sensitive env vars to subprocess
            "AWS_ACCESS_KEY_ID": "",
            "AWS_SECRET_ACCESS_KEY": "",
            "AWS_SESSION_TOKEN": "",
        }
    )
    
    return result.returncode, result.stdout, result.stderr
```

## Phase 4: Implementation Checklist

### CLI Security
- [ ] Implement `SecureCredentialManager` class
- [ ] Implement `SecureAWSClients` wrapper
- [ ] Add least-privilege credential validation
- [ ] Add input validation for all user inputs
- [ ] Implement secure path sanitization
- [ ] Add credential cleanup on exit
- [ ] Use AWS CLI for credential management
- [ ] Add security warnings for over-privileged credentials

### Infrastructure Security
- [ ] Add AWS WAF with OWASP rules
- [ ] Enable AWS Shield Standard
- [ ] Add VPC Flow Logs
- [ ] Restrict EC2 egress traffic
- [ ] Restrict ALB egress traffic
- [ ] Add ALB deletion protection
- [ ] Add CloudWatch security alarms
- [ ] Enable Route 53 query logging
- [ ] Add security group change monitoring

### Terraform Security
- [ ] Secure Terraform command execution
- [ ] Add input validation for Terraform commands
- [ ] Sanitize all file paths
- [ ] Add timeout protection
- [ ] Don't pass credentials to subprocess

### Monitoring & Alerting
- [ ] Add CloudWatch alarms for security events
- [ ] Set up SNS notifications for critical alerts
- [ ] Add WAF metrics and logging
- [ ] Monitor for unusual API activity
- [ ] Track security group changes

## Phase 5: Testing & Validation

### Security Testing
- [ ] Test credential validation (refuse AdministratorAccess)
- [ ] Test input validation (reject malicious inputs)
- [ ] Test path sanitization (prevent directory traversal)
- [ ] Test WAF rules (block SQL injection, XSS)
- [ ] Test rate limiting
- [ ] Test egress restrictions
- [ ] Test monitoring and alerting

### Compliance Validation
- [ ] Run `checkov` on Terraform code
- [ ] Run `tfsec` on Terraform code
- [ ] Validate against CIS AWS Foundations Benchmark
- [ ] Review IAM policies for least privilege
- [ ] Audit network security configuration

## Dependencies

Add to `scripts/requirements.txt`:
```
keyring>=24.0.0  # For secure credential storage
```

## Migration Path

1. **Week 1**: Implement secure credential management
2. **Week 2**: Add infrastructure security (WAF, Flow Logs)
3. **Week 3**: Add monitoring and alerting
4. **Week 4**: Testing and validation
5. **Week 5**: Documentation and training

## Cost Implications

- AWS WAF: ~$5/month + $1 per million requests
- VPC Flow Logs: ~$0.50 per GB ingested
- CloudWatch Logs: ~$0.50 per GB ingested
- AWS Shield Standard: Free
- Total estimated: ~$10-20/month for typical usage

---

**Priority**: Critical
**Estimated Effort**: 4-5 weeks
**Risk Level**: Low (additive changes, backward compatible)

