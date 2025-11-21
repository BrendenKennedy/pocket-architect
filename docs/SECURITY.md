# Security Documentation

This document provides comprehensive security information for mlcloud, including security checklist, quick start guide, and best practices.

## Quick Start

### Using Secure AWS Clients

Replace your existing `AWSClients` usage with `SecureAWSClients`:

```python
# OLD WAY (insecure)
from cvat.aws import AWSClients
aws = AWSClients(region="us-east-2")
vpc_id = aws.get_vpc_id_from_subnet("subnet-xxx")

# NEW WAY (secure)
from cvat.security import SecureAWSClients

# Option 1: Context manager (recommended - auto cleanup)
with SecureAWSClients(region="us-east-2", profile="terraform") as aws:
    vpc_id = aws.get_vpc_id_from_subnet("subnet-xxx")
    # Credentials automatically cleaned up on exit

# Option 2: Manual cleanup
aws = SecureAWSClients(region="us-east-2", profile="terraform")
try:
    vpc_id = aws.get_vpc_id_from_subnet("subnet-xxx")
finally:
    aws.cleanup()  # Clear credentials from memory
```

### Validating Inputs

Always validate user inputs before use:

```python
from cvat.security import InputValidator

# Validate subnet ID
subnet_id = user_input
if not InputValidator.validate_subnet_id(subnet_id):
    raise ValueError(f"Invalid subnet ID: {subnet_id}")

# Validate CIDR (must be /32 for IP addresses)
ip_cidr = user_input
if not InputValidator.validate_cidr_is_host(ip_cidr):
    raise ValueError(f"IP must be /32: {ip_cidr}")

# Validate domain name
domain = user_input
if not InputValidator.validate_domain_name(domain):
    raise ValueError(f"Invalid domain: {domain}")

# Sanitize file paths
user_path = user_input
safe_path = InputValidator.sanitize_path(user_path, base_dir=project_root)
```

### Checking Credentials

```python
from cvat.security import SecureCredentialManager

manager = SecureCredentialManager(profile="terraform")

# Check if credentials exist
if not manager.validate_credentials():
    print("No AWS credentials found. Run 'aws configure' first.")
    exit(1)

# Check least-privilege (warns on AdministratorAccess)
try:
    result = manager.check_least_privilege()
    print(f"Identity: {result['identity']['Arn']}")
except SecurityError as e:
    print(f"SECURITY WARNING: {e}")
    # Decide whether to proceed or exit
```

## Security Checklist

### Critical Security Issues (Must Fix)

#### 1. Credential Management
- [ ] **CRITICAL**: Validate that AWS credentials have least-privilege permissions
  - **Location**: `mlcloud/providers/aws/client.py`
  - **Issue**: Code should check if credentials have `AdministratorAccess` or overly broad permissions
  - **Risk**: Accidental privilege escalation, unauthorized resource access
  - **Recommendation**: Add credential validation to refuse `AdministratorAccess` and validate IAM permissions

- [ ] **CRITICAL**: Terraform state files may contain sensitive data
  - **Location**: `~/.mlcloud/sessions/*/terraform.tfstate`
  - **Issue**: State files contain resource IDs, IPs, and potentially sensitive configuration
  - **Risk**: State file exposure could leak infrastructure details
  - **Recommendation**: 
    - Ensure state files are properly secured
    - Consider using remote state backend (S3 with encryption)
    - Add state file encryption at rest

#### 2. Input Validation
- [ ] **CRITICAL**: Validate all user inputs
  - **Location**: All command implementations
  - **Issue**: User input directly used without validation
  - **Risk**: Command injection, path traversal, or invalid resource IDs
  - **Recommendation**: 
    - Validate all user inputs against expected patterns
    - Use parameterized commands where possible
    - Sanitize file paths and shell arguments

#### 3. Network Architecture Security
- [x] **CRITICAL**: SSH access restricted to authorized IPs
- [x] **CRITICAL**: HTTPS enforced for all CVAT deployments
- [ ] **CRITICAL**: Egress traffic should be restricted where possible
- [ ] **CRITICAL**: AWS WAF protection recommended for production
- [ ] **CRITICAL**: VPC Flow Logs should be enabled for monitoring

### High Priority Security Issues

#### 4. Error Handling & Information Disclosure
- [ ] **HIGH**: Error messages should not leak sensitive information
  - **Location**: All Python scripts
  - **Issue**: Stack traces and error messages may expose file paths, resource IDs
  - **Risk**: Information disclosure to attackers
  - **Recommendation**: 
    - Sanitize error messages in production
    - Log detailed errors separately from user-facing messages
    - Avoid printing full exception traces to console

#### 5. Dependency Security
- [ ] **HIGH**: Pin all dependencies to specific versions
  - **Location**: `pyproject.toml`
  - **Issue**: Dependencies not pinned to specific versions
  - **Risk**: Vulnerable to supply chain attacks
  - **Recommendation**: 
    - Pin all dependencies to specific versions
    - Use `pip-audit` or `safety` to check for vulnerabilities
    - Add automated dependency scanning to CI/CD

### Security Best Practices

1. **Always use SecureAWSClients** instead of direct boto3
2. **Validate all user inputs** before use
3. **Sanitize file paths** to prevent directory traversal
4. **Sanitize shell arguments** to prevent command injection
5. **Use context managers** for automatic cleanup
6. **Check credentials** before operations
7. **Warn on over-privileged credentials** (AdministratorAccess)

## Common Patterns

### Pattern 1: Setup with Validation

```python
from mlcloud.providers.aws.client import SecureAWSClients
from mlcloud.utils.validation import InputValidator
from rich.prompt import Prompt

# Get and validate subnet ID
while True:
    subnet_id = Prompt.ask("Subnet ID")
    if InputValidator.validate_subnet_id(subnet_id):
        break
    print("Invalid subnet ID format. Must be: subnet-xxxxxxxxxxxxxxxxx")

# Use secure client
with SecureAWSClients(region="us-east-2") as aws:
    vpc_id = aws.get_vpc_id_from_subnet(subnet_id)
    if not vpc_id:
        raise ValueError("Subnet not found")
```

### Pattern 2: Secure File Operations

```python
from mlcloud.utils.validation import InputValidator
from pathlib import Path

# User provides path
user_path = "/some/path/../../etc/passwd"  # Malicious!

# Sanitize (prevents directory traversal)
try:
    safe_path = InputValidator.sanitize_path(
        user_path, 
        base_dir=Path("/allowed/base")
    )
except SecurityError as e:
    print(f"Security violation: {e}")
    exit(1)
```

### Pattern 3: Secure Subprocess Calls

```python
from mlcloud.utils.validation import InputValidator
import subprocess

# User input
user_arg = "subnet-xxx; rm -rf /"  # Malicious!

# Sanitize before using in subprocess
safe_arg = InputValidator.sanitize_shell_argument(user_arg)

# Now safe to use
subprocess.run(["aws", "ec2", "describe-subnets", "--subnet-ids", safe_arg])
```

## Error Handling

```python
from mlcloud.providers.aws.client import SecureAWSClients
from mlcloud.utils.errors import SecurityError
from mlcloud.utils.validation import InputValidator

try:
    with SecureAWSClients(region="us-east-2") as aws:
        # Your code here
        pass
except SecurityError as e:
    print(f"Security error: {e}")
    exit(1)
except Exception as e:
    print(f"Error: {e}")
    exit(1)
```

## Migration Checklist

- [ ] Replace insecure client usage with secure clients
- [ ] Add input validation for all user inputs
- [ ] Sanitize file paths
- [ ] Sanitize shell arguments
- [ ] Use context managers for cleanup
- [ ] Test with invalid credentials
- [ ] Test with AdministratorAccess (should warn)
- [ ] Test with invalid inputs (should reject)

## Security Configuration Checklist

### Network Architecture Security
- [x] SSH access restricted to authorized IPs
- [x] HTTPS enforced for all CVAT deployments
- [ ] Egress traffic restricted where possible
- [ ] AWS WAF enabled and configured (recommended for production)
- [ ] AWS Shield Standard/Advanced enabled
- [ ] VPC Flow Logs enabled
- [ ] VPC endpoints for AWS services configured

### Application Security
- [x] TLS 1.3 minimum on load balancers
- [x] HTTP redirects to HTTPS
- [ ] Rate limiting configured
- [ ] Access logs enabled
- [ ] Security group change monitoring enabled

### Code Security
- [x] Sensitive files in `.gitignore`
- [x] No hardcoded credentials
- [ ] Input validation implemented
- [ ] Error messages sanitized
- [ ] Dependencies pinned
- [ ] Security logging implemented
- [ ] Command injection protections

### Operational Security
- [ ] Least-privilege IAM policies validated
- [ ] State file encryption configured
- [ ] Remote state backend configured (if applicable)
- [ ] Backup strategy documented
- [ ] Incident response plan documented
- [ ] Security monitoring enabled

## Immediate Action Items

1. **Add credential validation** - Refuse `AdministratorAccess` and validate IAM permissions
2. **Implement input validation** - Validate all user inputs
3. **Add security logging** - Log all infrastructure changes for audit trail
4. **Pin dependencies** - Lock all dependency versions
5. **Add security documentation** - Document security model and hardening steps

## Security Tools Recommendations

- **Terraform Security Scanning**: `checkov`, `tfsec`, `terrascan`
- **Dependency Scanning**: `pip-audit`, `safety`, `dependabot`
- **Static Analysis**: `bandit` (Python), `shellcheck` (Bash)
- **AWS Security**: AWS Security Hub, GuardDuty, Config
- **CI/CD Integration**: GitHub Actions security scanning, pre-commit hooks

## See Also

- `docs/SECURITY_PLAN.md` - Full security hardening implementation plan
- `docs/agent/SECURITY_IMPLEMENTATION_SUMMARY.md` - What was implemented

---

**Last Updated**: 2024-12-19  
**Next Review**: Quarterly or before major releases

