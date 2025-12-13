"""
Permission checking service for AWS accounts.

This service uses AWS IAM Policy Simulator to check if an account has
the required permissions for Pocket Architect functionality.
"""

import json
from typing import Dict, List, Tuple, Optional
from datetime import datetime, timedelta
import boto3
from botocore.exceptions import ClientError

from pocket_architect.utils.logger import setup_logger

logger = setup_logger(__name__)


# Required permissions organized by service
REQUIRED_PERMISSIONS = {
    "EC2": [
        {"action": "ec2:DescribeInstances", "description": "View EC2 instances", "critical": True, "feature": "Instance Management"},
        {"action": "ec2:RunInstances", "description": "Create and launch new instances", "critical": True, "feature": "Instance Creation"},
        {"action": "ec2:StartInstances", "description": "Start stopped instances", "critical": True, "feature": "Instance Control"},
        {"action": "ec2:StopInstances", "description": "Stop running instances", "critical": True, "feature": "Instance Control"},
        {"action": "ec2:RebootInstances", "description": "Restart instances", "critical": False, "feature": "Instance Control"},
        {"action": "ec2:TerminateInstances", "description": "Terminate instances", "critical": True, "feature": "Instance Management"},
        {"action": "ec2:CreateTags", "description": "Apply tags to resources", "critical": False, "feature": "Resource Tagging"},
        {"action": "ec2:DescribeInstanceTypes", "description": "Get instance type information", "critical": True, "feature": "Instance Creation"},
        {"action": "ec2:DescribeImages", "description": "List and retrieve AMI information", "critical": True, "feature": "Instance Creation"},
        {"action": "ec2:CreateKeyPair", "description": "Create SSH key pairs", "critical": False, "feature": "SSH Key Management"},
        {"action": "ec2:DescribeKeyPairs", "description": "List SSH key pairs", "critical": True, "feature": "SSH Key Management"},
        {"action": "ec2:DeleteKeyPair", "description": "Delete SSH key pairs", "critical": False, "feature": "SSH Key Management"},
        {"action": "ec2:CreateSecurityGroup", "description": "Create firewall rules", "critical": True, "feature": "Security/Firewall"},
        {"action": "ec2:DescribeSecurityGroups", "description": "List firewall rules", "critical": True, "feature": "Security/Firewall"},
        {"action": "ec2:AuthorizeSecurityGroupIngress", "description": "Add inbound firewall rules", "critical": True, "feature": "Security/Firewall"},
        {"action": "ec2:AuthorizeSecurityGroupEgress", "description": "Add outbound firewall rules", "critical": False, "feature": "Security/Firewall"},
        {"action": "ec2:DeleteSecurityGroup", "description": "Delete firewall rules", "critical": False, "feature": "Security/Firewall"},
    ],
    "IAM": [
        {"action": "iam:CreateRole", "description": "Create IAM roles", "critical": True, "feature": "IAM Role Management"},
        {"action": "iam:GetRole", "description": "Retrieve IAM role details", "critical": True, "feature": "IAM Role Management"},
        {"action": "iam:ListRoles", "description": "List all IAM roles", "critical": True, "feature": "IAM Role Management"},
        {"action": "iam:DeleteRole", "description": "Delete IAM roles", "critical": False, "feature": "IAM Role Management"},
        {"action": "iam:AttachRolePolicy", "description": "Attach managed policies to roles", "critical": True, "feature": "IAM Policy Management"},
        {"action": "iam:DetachRolePolicy", "description": "Detach managed policies from roles", "critical": False, "feature": "IAM Policy Management"},
        {"action": "iam:PutRolePolicy", "description": "Create/update inline policies", "critical": True, "feature": "IAM Policy Management"},
        {"action": "iam:DeleteRolePolicy", "description": "Delete inline policies", "critical": False, "feature": "IAM Policy Management"},
        {"action": "iam:ListAttachedRolePolicies", "description": "List managed policies for a role", "critical": True, "feature": "IAM Policy Management"},
        {"action": "iam:ListRolePolicies", "description": "List inline policy names for a role", "critical": True, "feature": "IAM Policy Management"},
    ],
    "ACM": [
        {"action": "acm:RequestCertificate", "description": "Request SSL/TLS certificates", "critical": True, "feature": "Certificate Management"},
        {"action": "acm:DescribeCertificate", "description": "Get certificate details", "critical": True, "feature": "Certificate Management"},
        {"action": "acm:ListCertificates", "description": "List certificates", "critical": True, "feature": "Certificate Management"},
        {"action": "acm:DeleteCertificate", "description": "Delete certificates", "critical": False, "feature": "Certificate Management"},
        {"action": "acm:ResendValidationEmail", "description": "Resend certificate validation email", "critical": False, "feature": "Certificate Validation"},
    ],
    "STS": [
        {"action": "sts:GetCallerIdentity", "description": "Verify AWS credentials and account", "critical": True, "feature": "Account Authentication"},
    ],
}


class PermissionService:
    """Service for checking AWS permissions using IAM Policy Simulator."""

    def __init__(self):
        """Initialize permission service with in-memory cache."""
        # In-memory cache: {account_id: (PermissionCheckResult, expire_time)}
        self._cache: Dict[int, Tuple[Dict, datetime]] = {}
        self._cache_ttl = timedelta(minutes=60)

    def check_account_permissions(self, account_id: int, session: boto3.Session) -> Dict:
        """
        Check all required permissions for an account using IAM Policy Simulator.

        Args:
            account_id: Account ID to check
            session: Boto3 session with account credentials

        Returns:
            PermissionCheckResult dict with permission status
        """
        # Check cache first
        cached = self._get_from_cache(account_id)
        if cached:
            logger.info(f"Returning cached permission check for account {account_id}")
            return cached

        logger.info(f"Checking permissions for account {account_id}")

        try:
            # Get IAM and STS clients
            iam_client = session.client('iam')
            sts_client = session.client('sts')

            # Get caller identity to determine principal ARN
            identity = sts_client.get_caller_identity()
            principal_arn = identity['Arn']

            logger.info(f"Checking permissions for principal: {principal_arn}")

            # Try to simulate permissions
            can_simulate = True
            service_permissions = {}

            try:
                # Get all permission actions to check
                all_actions = []
                for service, perms in REQUIRED_PERMISSIONS.items():
                    all_actions.extend([p["action"] for p in perms])

                # Call IAM Policy Simulator
                logger.debug(f"Simulating {len(all_actions)} permissions")
                response = iam_client.simulate_principal_policy(
                    PolicySourceArn=principal_arn,
                    ActionNames=all_actions
                )

                # Map results to permission status
                results_map = {}
                for eval_result in response.get('EvaluationResults', []):
                    action = eval_result['EvalActionName']
                    decision = eval_result['EvalDecision']

                    # Map AWS decision to our status
                    if decision == 'allowed':
                        status = 'allowed'
                    elif decision in ['explicitDeny', 'implicitDeny']:
                        status = 'denied'
                    else:
                        status = 'unknown'

                    results_map[action] = status

                # Build service-grouped results
                for service, perms in REQUIRED_PERMISSIONS.items():
                    permissions = []
                    allowed = 0
                    denied = 0
                    unknown = 0

                    for perm in perms:
                        action = perm["action"]
                        status = results_map.get(action, 'unknown')

                        if status == 'allowed':
                            allowed += 1
                        elif status == 'denied':
                            denied += 1
                        else:
                            unknown += 1

                        feature_impact = None
                        if status == 'denied' and perm.get("critical"):
                            feature_impact = f"Required for {perm['feature']}"

                        permissions.append({
                            "action": action,
                            "status": status,
                            "description": perm["description"],
                            "critical": perm["critical"],
                            "featureImpact": feature_impact
                        })

                    service_permissions[service] = {
                        "service": service,
                        "total": len(perms),
                        "allowed": allowed,
                        "denied": denied,
                        "unknown": unknown,
                        "permissions": permissions
                    }

            except ClientError as e:
                error_code = e.response.get('Error', {}).get('Code', '')

                if error_code in ['AccessDenied', 'UnauthorizedOperation']:
                    logger.warning(f"Cannot simulate permissions: {error_code}")
                    can_simulate = False

                    # Mark all permissions as unknown
                    for service, perms in REQUIRED_PERMISSIONS.items():
                        permissions = []
                        for perm in perms:
                            permissions.append({
                                "action": perm["action"],
                                "status": "unknown",
                                "description": perm["description"],
                                "critical": perm["critical"],
                                "featureImpact": None
                            })

                        service_permissions[service] = {
                            "service": service,
                            "total": len(perms),
                            "allowed": 0,
                            "denied": 0,
                            "unknown": len(perms),
                            "permissions": permissions
                        }
                else:
                    raise

            # Calculate overall status
            total_allowed = sum(sp["allowed"] for sp in service_permissions.values())
            total_denied = sum(sp["denied"] for sp in service_permissions.values())
            total_unknown = sum(sp["unknown"] for sp in service_permissions.values())
            total_perms = sum(sp["total"] for sp in service_permissions.values())

            if total_denied == 0 and total_unknown == 0:
                overall_status = "full"
            elif total_allowed == 0 and total_unknown == 0:
                overall_status = "none"
            elif total_unknown > 0:
                overall_status = "unknown"
            else:
                overall_status = "partial"

            # Generate minimal IAM policy if there are denied permissions
            minimal_policy = None
            if total_denied > 0:
                denied_actions = []
                for sp in service_permissions.values():
                    for perm in sp["permissions"]:
                        if perm["status"] == "denied":
                            denied_actions.append(perm["action"])

                minimal_policy = self.generate_minimal_policy(denied_actions)

            # Build result
            result = {
                "accountId": account_id,
                "checkedAt": datetime.utcnow().isoformat() + "Z",
                "services": list(service_permissions.values()),
                "canSimulate": can_simulate,
                "overallStatus": overall_status,
                "minimalPolicy": minimal_policy
            }

            # Cache the result
            self._add_to_cache(account_id, result)

            logger.info(
                f"Permission check complete for account {account_id}: "
                f"{overall_status} ({total_allowed}/{total_perms} allowed)"
            )

            return result

        except Exception as e:
            logger.error(f"Error checking permissions for account {account_id}: {e}")
            raise

    def generate_minimal_policy(self, denied_actions: List[str]) -> str:
        """
        Generate minimal IAM policy JSON for denied permissions.

        Args:
            denied_actions: List of denied IAM actions

        Returns:
            Formatted JSON string of minimal IAM policy
        """
        policy = {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Effect": "Allow",
                    "Action": sorted(denied_actions),
                    "Resource": "*"
                }
            ]
        }

        return json.dumps(policy, indent=2)

    def invalidate_cache(self, account_id: int) -> None:
        """
        Clear cached permissions for an account.

        Args:
            account_id: Account ID to invalidate cache for
        """
        if account_id in self._cache:
            del self._cache[account_id]
            logger.info(f"Invalidated permission cache for account {account_id}")

    def _get_from_cache(self, account_id: int) -> Optional[Dict]:
        """Get cached permission result if not expired."""
        if account_id in self._cache:
            result, expire_time = self._cache[account_id]
            if datetime.utcnow() < expire_time:
                return result
            else:
                # Expired, remove from cache
                del self._cache[account_id]
        return None

    def _add_to_cache(self, account_id: int, result: Dict) -> None:
        """Add permission result to cache with TTL."""
        expire_time = datetime.utcnow() + self._cache_ttl
        self._cache[account_id] = (result, expire_time)
