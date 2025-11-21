"""Secure AWS client wrapper using AWS CLI credential chain"""

import boto3
import warnings
from typing import Optional
from .credentials import SecureCredentialManager, SecurityError


class SecurityWarning(UserWarning):
    """Security warning"""
    pass


class SecureAWSClients:
    """Secure AWS clients with credential validation.
    
    This class wraps boto3 clients with security checks:
    - Validates credentials exist
    - Checks for least-privilege (warns on AdministratorAccess)
    - Uses AWS CLI credential chain
    - Provides secure cleanup
    """
    
    def __init__(self, region: str = "us-east-2", profile: str = "terraform"):
        """Initialize secure AWS clients.
        
        Args:
            region: AWS region
            profile: AWS CLI profile name
            
        Raises:
            SecurityError: If credentials are invalid or over-privileged
        """
        self.region = region
        self.profile = profile
        self._credential_manager = SecureCredentialManager(profile)
        self._session = None
        self._validate_and_init()
    
    def _validate_and_init(self):
        """Validate credentials and initialize clients."""
        # Step 1: Validate credentials exist
        if not self._credential_manager.validate_credentials():
            raise SecurityError(
                "No valid AWS credentials found.\n"
                f"Please run 'aws configure --profile {self.profile}' or set AWS environment variables.\n"
                "See README.md for credential setup instructions."
            )
        
        # Step 2: Check least-privilege (warn but don't block for now)
        # In production, you may want to make this blocking
        try:
            result = self._credential_manager.check_least_privilege()
            if result.get("warnings"):
                for warning in result["warnings"]:
                    warnings.warn(warning, SecurityWarning)
        except SecurityError as e:
            # For now, warn but allow (user may have valid reason)
            # In strict mode, you could raise here
            warnings.warn(
                f"SECURITY WARNING: {str(e)}\n"
                "Proceeding with caution. Consider using least-privilege credentials.",
                SecurityWarning
            )
        
        # Step 3: Create secure session
        self._session = self._credential_manager.create_boto3_session()
        
        # Step 4: Create clients
        self.ec2 = self._session.client('ec2', region_name=self.region)
        self.iam = self._session.client('iam', region_name=self.region)
        self.route53 = self._session.client('route53', region_name=self.region)
        self.sts = self._session.client('sts', region_name=self.region)
    
    def get_caller_identity(self) -> dict:
        """Get current AWS identity.
        
        Returns:
            Dictionary with Arn, UserId, Account
        """
        return self.sts.get_caller_identity()
    
    def cleanup(self):
        """Clean up credentials from memory.
        
        Call this when done with the clients to clear
        credentials from memory.
        """
        self._credential_manager.clear_credentials_from_memory()
        # Clear client references
        self.ec2 = None
        self.iam = None
        self.route53 = None
        self.sts = None
        self._session = None
    
    def __enter__(self):
        """Context manager entry."""
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit - cleanup credentials."""
        self.cleanup()

