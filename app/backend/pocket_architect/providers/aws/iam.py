"""
AWS IAM provider for managing IAM roles and policies.
"""

from typing import List, Dict, Optional
from botocore.exceptions import ClientError

from pocket_architect.providers.aws.client import AWSClient, handle_aws_error
from pocket_architect.utils.logger import setup_logger

logger = setup_logger(__name__)


class IAMProvider:
    """AWS IAM operations provider."""

    def __init__(self, client: AWSClient):
        """
        Initialize IAM provider.

        Args:
            client: AWSClient instance
        """
        self.client = client
        self.iam = client.iam

    @handle_aws_error
    def create_role(
        self,
        role_name: str,
        assume_role_policy_document: str,
        description: Optional[str] = None,
        path: Optional[str] = None,
        max_session_duration: Optional[int] = None,
        tags: Optional[List[Dict[str, str]]] = None,
    ) -> Dict:
        """
        Create an IAM role.

        Args:
            role_name: Name of the role
            assume_role_policy_document: Trust policy JSON
            description: Role description
            path: Role path
            max_session_duration: Maximum session duration in seconds
            tags: Tags for the role

        Returns:
            Created role information
        """
        logger.info(f"Creating IAM role: {role_name}")

        params = {
            "RoleName": role_name,
            "AssumeRolePolicyDocument": assume_role_policy_document,
        }

        if description:
            params["Description"] = description
        if path:
            params["Path"] = path
        if max_session_duration:
            params["MaxSessionDuration"] = max_session_duration
        if tags:
            params["Tags"] = [{"Key": k, "Value": v} for k, v in tags.items()]

        response = self.iam.create_role(**params)

        logger.info(f"Created IAM role: {role_name}")
        return {
            "role_name": response["Role"]["RoleName"],
            "role_id": response["Role"]["RoleId"],
            "arn": response["Role"]["Arn"],
            "path": response["Role"]["Path"],
            "create_date": response["Role"]["CreateDate"].isoformat(),
            "description": response["Role"].get("Description", ""),
            "max_session_duration": response["Role"].get("MaxSessionDuration"),
            "assume_role_policy_document": response["Role"]["AssumeRolePolicyDocument"],
        }

    @handle_aws_error
    def get_role(self, role_name: str) -> Optional[Dict]:
        """
        Get IAM role by name.

        Args:
            role_name: Name of the role

        Returns:
            Role information or None if not found
        """
        try:
            response = self.iam.get_role(RoleName=role_name)
            role = response["Role"]
            return {
                "role_name": role["RoleName"],
                "role_id": role["RoleId"],
                "arn": role["Arn"],
                "path": role["Path"],
                "create_date": role["CreateDate"].isoformat(),
                "description": role.get("Description", ""),
                "max_session_duration": role.get("MaxSessionDuration"),
                "assume_role_policy_document": role["AssumeRolePolicyDocument"],
            }
        except ClientError as e:
            if e.response["Error"]["Code"] == "NoSuchEntity":
                logger.warning(f"Role {role_name} not found")
                return None
            raise

    @handle_aws_error
    def list_roles(self, path_prefix: Optional[str] = None) -> List[Dict]:
        """
        List IAM roles.

        Args:
            path_prefix: Optional path prefix to filter roles

        Returns:
            List of role information
        """
        kwargs = {}
        if path_prefix:
            kwargs["PathPrefix"] = path_prefix

        response = self.iam.list_roles(**kwargs)

        roles = []
        for role in response.get("Roles", []):
            roles.append(
                {
                    "role_name": role["RoleName"],
                    "role_id": role["RoleId"],
                    "arn": role["Arn"],
                    "path": role["Path"],
                    "create_date": role["CreateDate"].isoformat(),
                    "description": role.get("Description", ""),
                    "max_session_duration": role.get("MaxSessionDuration"),
                }
            )

        logger.info(f"Listed {len(roles)} IAM roles")
        return roles

    @handle_aws_error
    def delete_role(self, role_name: str) -> None:
        """
        Delete an IAM role.

        Args:
            role_name: Name of the role to delete
        """
        logger.info(f"Deleting IAM role: {role_name}")
        self.iam.delete_role(RoleName=role_name)
        logger.info(f"Deleted IAM role: {role_name}")

    @handle_aws_error
    def attach_role_policy(self, role_name: str, policy_arn: str) -> None:
        """
        Attach a managed policy to a role.

        Args:
            role_name: Name of the role
            policy_arn: ARN of the policy to attach
        """
        logger.info(f"Attaching policy {policy_arn} to role {role_name}")
        self.iam.attach_role_policy(RoleName=role_name, PolicyArn=policy_arn)
        logger.info(f"Attached policy to role {role_name}")

    @handle_aws_error
    def detach_role_policy(self, role_name: str, policy_arn: str) -> None:
        """
        Detach a managed policy from a role.

        Args:
            role_name: Name of the role
            policy_arn: ARN of the policy to detach
        """
        logger.info(f"Detaching policy {policy_arn} from role {role_name}")
        self.iam.detach_role_policy(RoleName=role_name, PolicyArn=policy_arn)
        logger.info(f"Detached policy from role {role_name}")

    @handle_aws_error
    def put_role_policy(
        self, role_name: str, policy_name: str, policy_document: str
    ) -> None:
        """
        Add or update an inline policy for a role.

        Args:
            role_name: Name of the role
            policy_name: Name of the inline policy
            policy_document: Policy document JSON
        """
        logger.info(f"Putting inline policy {policy_name} on role {role_name}")
        self.iam.put_role_policy(
            RoleName=role_name, PolicyName=policy_name, PolicyDocument=policy_document
        )
        logger.info(f"Put inline policy on role {role_name}")

    @handle_aws_error
    def delete_role_policy(self, role_name: str, policy_name: str) -> None:
        """
        Delete an inline policy from a role.

        Args:
            role_name: Name of the role
            policy_name: Name of the inline policy to delete
        """
        logger.info(f"Deleting inline policy {policy_name} from role {role_name}")
        self.iam.delete_role_policy(RoleName=role_name, PolicyName=policy_name)
        logger.info(f"Deleted inline policy from role {role_name}")

    @handle_aws_error
    def list_attached_role_policies(self, role_name: str) -> List[Dict]:
        """
        List managed policies attached to a role.

        Args:
            role_name: Name of the role

        Returns:
            List of attached policies
        """
        response = self.iam.list_attached_role_policies(RoleName=role_name)

        policies = []
        for policy in response.get("AttachedPolicies", []):
            policies.append(
                {"policy_arn": policy["PolicyArn"], "policy_name": policy["PolicyName"]}
            )

        return policies

    @handle_aws_error
    def list_role_policies(self, role_name: str) -> List[str]:
        """
        List inline policy names for a role.

        Args:
            role_name: Name of the role

        Returns:
            List of inline policy names
        """
        response = self.iam.list_role_policies(RoleName=role_name)
        return response.get("PolicyNames", [])
