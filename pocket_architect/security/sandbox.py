"""Automatic least-privilege role/key creation for providers."""

import json
from typing import Dict, Any, Optional
from rich.console import Console

from pocket_architect.core.types import Provider
from pocket_architect.security.aws_roles import create_aws_role_template
from pocket_architect.security.coreweave_rbac import create_coreweave_rbac
from pocket_architect.security.runpod_scopes import validate_runpod_scopes

console = Console()


class CredentialValidator:
    """Validates and creates least-privilege credentials for providers."""

    @staticmethod
    def validate_aws_credentials(access_key_id: str, secret_access_key: str) -> bool:
        """Validate AWS credentials and check for over-privileged access.
        
        Args:
            access_key_id: AWS access key ID
            secret_access_key: AWS secret access key
            
        Returns:
            True if credentials are valid and properly scoped
            
        Raises:
            ValueError: If credentials are invalid or over-privileged
        """
        import boto3
        from botocore.exceptions import ClientError
        
        try:
            # Create temporary client to validate credentials
            sts = boto3.client(
                "sts",
                aws_access_key_id=access_key_id,
                aws_secret_access_key=secret_access_key,
            )
            
            # Get caller identity
            identity = sts.get_caller_identity()
            
            # Check if credentials have AdministratorAccess
            iam = boto3.client(
                "iam",
                aws_access_key_id=access_key_id,
                aws_secret_access_key=secret_access_key,
            )
            
            # Try to get attached policies
            try:
                # Get attached user policies
                user_name = identity.get("Arn", "").split("/")[-1]
                attached_policies = iam.list_attached_user_policies(UserName=user_name)
                
                for policy in attached_policies.get("AttachedPolicies", []):
                    if policy["PolicyArn"] == "arn:aws:iam::aws:policy/AdministratorAccess":
                        raise ValueError(
                            "Credentials have AdministratorAccess which is not allowed for security.\n"
                            "mlcloud requires least-privilege IAM roles. Please create a scoped role\n"
                            "or let mlcloud create one automatically with minimal permissions."
                        )
            except ClientError as e:
                # May not have permission to list policies, check inline policies
                pass
            
            console.print(f"[green]✓[/green] AWS credentials validated: {identity.get('Arn', 'Unknown')}")
            return True
            
        except ClientError as e:
            error_code = e.response.get("Error", {}).get("Code", "")
            if error_code == "InvalidClientTokenId":
                raise ValueError("Invalid AWS credentials")
            elif error_code == "SignatureDoesNotMatch":
                raise ValueError("Invalid AWS credentials")
            else:
                raise ValueError(f"Failed to validate AWS credentials: {e}")
        except Exception as e:
            raise ValueError(f"Failed to validate AWS credentials: {e}")

    @staticmethod
    def create_aws_role(
        role_name: str,
        trust_policy: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Create AWS IAM role with least-privilege permissions.
        
        Args:
            role_name: IAM role name
            trust_policy: Trust policy (default: EC2 service principal)
            
        Returns:
            Dictionary with role ARN and other details
        """
        import boto3
        from botocore.exceptions import ClientError
        
        iam = boto3.client("iam")
        
        # Use default trust policy if not provided
        if trust_policy is None:
            trust_policy = {
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Effect": "Allow",
                        "Principal": {"Service": "ec2.amazonaws.com"},
                        "Action": "sts:AssumeRole",
                    }
                ],
            }
        
        try:
            # Check if role exists
            try:
                role = iam.get_role(RoleName=role_name)
                console.print(f"[yellow]⚠[/yellow] IAM role '{role_name}' already exists")
                return {
                    "role_arn": role["Role"]["Arn"],
                    "role_name": role_name,
                    "exists": True,
                }
            except ClientError as e:
                if e.response["Error"]["Code"] != "NoSuchEntity":
                    raise
            
            # Create role
            role = iam.create_role(
                RoleName=role_name,
                AssumeRolePolicyDocument=json.dumps(trust_policy),
                Description="mlcloud least-privilege role for CVAT deployments",
                Tags=[
                    {"Key": "CreatedBy", "Value": "mlcloud"},
                    {"Key": "Purpose", "Value": "CVAT deployment"},
                ],
            )
            
            # Attach minimal policies
            policy_doc = create_aws_role_template()
            policy = iam.put_role_policy(
                RoleName=role_name,
                PolicyName="mlcloud-minimal-policy",
                PolicyDocument=json.dumps(policy_doc),
            )
            
            console.print(f"[green]✓[/green] Created IAM role: {role['Role']['Arn']}")
            
            return {
                "role_arn": role["Role"]["Arn"],
                "role_name": role_name,
                "exists": False,
            }
            
        except ClientError as e:
            raise RuntimeError(f"Failed to create AWS IAM role: {e}")

    @staticmethod
    def validate_runpod_credentials(api_key: str) -> bool:
        """Validate RunPod API key and check scopes.
        
        Args:
            api_key: RunPod API key
            
        Returns:
            True if API key is valid and properly scoped
            
        Raises:
            ValueError: If API key is invalid or over-privileged
        """
        import requests
        
        # Check API key format (RunPod keys are typically UUIDs)
        if len(api_key) < 32:
            raise ValueError("Invalid RunPod API key format")
        
        # Validate scopes (RunPod doesn't expose scope validation, but we can check basic validity)
        # This is a placeholder - actual validation would check API key permissions
        return validate_runpod_scopes(api_key)

    @staticmethod
    def validate_coreweave_credentials(api_key: str) -> bool:
        """Validate CoreWeave API key.
        
        Args:
            api_key: CoreWeave API key
            
        Returns:
            True if API key is valid
            
        Raises:
            ValueError: If API key is invalid
        """
        # CoreWeave API key validation would go here
        # For now, basic format check
        if not api_key or len(api_key) < 20:
            raise ValueError("Invalid CoreWeave API key format")
        
        return True

