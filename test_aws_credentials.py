#!/usr/bin/env python3
"""
Standalone AWS credential test script.
Run this with your AWS credentials to verify they work.
"""

import boto3
import sys


def test_aws_credentials(access_key, secret_key, region="us-east-1"):
    """Test AWS credentials by calling STS GetCallerIdentity."""
    try:
        print(f"Testing AWS credentials in region: {region}")
        print(f"Access Key: {access_key[:8]}...")

        # Create STS client with provided credentials
        sts = boto3.client(
            "sts",
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            region_name=region,
        )

        # Call GetCallerIdentity
        print("Calling STS GetCallerIdentity...")
        identity = sts.get_caller_identity()

        print("✅ SUCCESS!")
        print(f"Account ID: {identity['Account']}")
        print(f"ARN: {identity['Arn']}")
        print(f"User ID: {identity['UserId']}")

        return True

    except Exception as e:
        print(f"❌ FAILED: {e}")
        return False


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(
            "Usage: python test_aws_credentials.py <access_key> <secret_key> [region]"
        )
        print("Example: python test_aws_credentials.py AKI... wJal... us-east-1")
        print(f"Received {len(sys.argv) - 1} arguments, need at least 2")
        sys.exit(1)

    access_key = sys.argv[1]
    secret_key = sys.argv[2]
    region = sys.argv[3] if len(sys.argv) > 3 else "us-east-1"

    success = test_aws_credentials(access_key, secret_key, region)
    sys.exit(0 if success else 1)
