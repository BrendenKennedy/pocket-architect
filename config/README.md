# Pocket Architect - AWS Test Credentials Setup

This file provides instructions for setting up test AWS credentials for development and testing.

## ⚠️ SECURITY WARNING

**NEVER commit real AWS credentials to version control!**
**Use IAM users with minimal required permissions only!**

## Setting Up Test Credentials

### Method 1: Encrypted Environment Variables (Most Secure)

For maximum security, encrypt your credentials:

1. **Create plain text credentials file**:
   ```bash
   # Create config/aws-credentials.env
   AWS_ACCESS_KEY_ID=your_real_access_key
   AWS_SECRET_ACCESS_KEY=your_real_secret_key
   AWS_DEFAULT_REGION=us-east-1
   ```

2. **Encrypt the credentials** (run in WSL):
   ```bash
   wsl ./scripts/bash/encrypt-aws-creds.sh
   ```
   Or if already in WSL terminal:
   ```bash
   ./scripts/bash/encrypt-aws-creds.sh
   ```
   This creates `config/aws-credentials.env.enc`

3. **Decrypt when needed** (run in WSL):
   ```bash
   wsl ./scripts/bash/decrypt-aws-creds.sh
   source config/aws-credentials.env
   rm config/aws-credentials.env  # Clean up immediately
   ```

### Method 2: Environment Variables (Recommended for Development)

Set these environment variables in your shell or `.env` file:

```bash
# AWS Test Credentials
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_DEFAULT_REGION=us-east-1

# Pocket Architect Test Credentials
POCKET_ARCHITECT_TEST_ACCESS_KEY=AKIAIOSFODNN7EXAMPLE
POCKET_ARCHITECT_TEST_SECRET_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
POCKET_ARCHITECT_TEST_REGION=us-east-1
```

### Method 3: AWS CLI Configuration

If you have AWS CLI installed:

```bash
aws configure --profile pocket-architect-test
# Enter test credentials when prompted

# Then set the profile
export AWS_PROFILE=pocket-architect-test
```

### Method 4: Test Credentials File (For CI/CD)

Create a `config/test-credentials.env` file (add to .gitignore):

```env
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_DEFAULT_REGION=us-east-1
```

## Test IAM User Setup (AWS Console)

Create an IAM user with these minimal permissions for testing:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "ec2:DescribeInstances",
                "ec2:DescribeRegions",
                "s3:ListAllMyBuckets",
                "s3:GetBucketLocation",
                "iam:ListUsers",
                "iam:ListRoles",
                "iam:GetUser"
            ],
            "Resource": "*"
        }
    ]
}
```

## Running Tests with Credentials

```bash
# Load test credentials
source config/test-credentials.env

# Run tests
cargo test --test live_data_test

# Or run with specific credentials
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE \
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY \
cargo test --test live_data_test
```

## Mock vs Live Data Detection

The application automatically detects which mode to use:

- **Mock Mode**: No credentials → Returns sample data for development
- **Live Mode**: Credentials detected → Returns data from real AWS APIs

## Security Best Practices

1. **Encrypt sensitive credentials** using the provided scripts
2. **Never commit real credentials** to version control
3. **Use IAM users** with minimal required permissions
4. **Rotate credentials** regularly (every 90 days)
5. **Use different credentials** for different environments
6. **Monitor usage** of credentials in AWS CloudTrail
7. **Delete decrypted files** immediately after use
8. **Use strong passphrases** for encryption (12+ characters, mixed case, symbols)

## Test Credentials Status

The application includes the following test credentials for development:

- **Access Key**: `AKIAIOSFODNN7EXAMPLE` (AWS documentation example)
- **Secret Key**: `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` (AWS documentation example)
- **Region**: `us-east-2`

These are safe to use in code as they are the official AWS documentation examples and do not provide access to any real AWS resources.