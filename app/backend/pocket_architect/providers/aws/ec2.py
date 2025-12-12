"""
AWS EC2 provider for managing EC2 instances.
"""

from typing import List, Dict, Optional
from botocore.exceptions import ClientError

from pocket_architect.providers.aws.client import AWSClient, handle_aws_error
from pocket_architect.utils.logger import setup_logger

logger = setup_logger(__name__)


class EC2Provider:
    """AWS EC2 operations provider."""

    def __init__(self, client: AWSClient):
        """
        Initialize EC2 provider.

        Args:
            client: AWSClient instance
        """
        self.client = client
        self.ec2 = client.ec2

    # ========================================================================
    # Instance Operations
    # ========================================================================

    @handle_aws_error
    def list_instances(self, filters: Optional[List[Dict]] = None) -> List[Dict]:
        """
        List EC2 instances.

        Args:
            filters: Optional EC2 filters (e.g., [{'Name': 'instance-state-name', 'Values': ['running']}])

        Returns:
            List of instance dictionaries
        """
        kwargs = {}
        if filters:
            kwargs["Filters"] = filters

        response = self.ec2.describe_instances(**kwargs)

        instances = []
        for reservation in response.get("Reservations", []):
            for instance in reservation.get("Instances", []):
                instances.append(self._format_instance(instance))

        logger.info(f"Listed {len(instances)} instances")
        return instances

    @handle_aws_error
    def get_instance(self, instance_id: str) -> Optional[Dict]:
        """
        Get specific EC2 instance by ID.

        Args:
            instance_id: EC2 instance ID (e.g., 'i-1234567890abcdef0')

        Returns:
            Instance dictionary or None if not found
        """
        try:
            response = self.ec2.describe_instances(InstanceIds=[instance_id])

            if response["Reservations"]:
                instance = response["Reservations"][0]["Instances"][0]
                return self._format_instance(instance)
        except Exception as e:
            logger.warning(f"Instance {instance_id} not found: {e}")

        return None

    @handle_aws_error
    def create_instance(
        self,
        ami_id: str,
        instance_type: str,
        key_name: Optional[str] = None,
        security_group_ids: Optional[List[str]] = None,
        subnet_id: Optional[str] = None,
        user_data: Optional[str] = None,
        tags: Optional[Dict[str, str]] = None,
        **kwargs,
    ) -> Dict:
        """
        Create (launch) a new EC2 instance.

        Args:
            ami_id: AMI ID to use
            instance_type: Instance type (e.g., 't3.micro')
            key_name: SSH key pair name
            security_group_ids: List of security group IDs
            subnet_id: Subnet ID for VPC
            user_data: User data script
            tags: Tags to apply to instance
            **kwargs: Additional run_instances parameters

        Returns:
            Created instance dictionary
        """
        run_params = {
            "ImageId": ami_id,
            "InstanceType": instance_type,
            "MinCount": 1,
            "MaxCount": 1,
        }

        # Add optional parameters
        if key_name:
            run_params["KeyName"] = key_name
        if security_group_ids:
            run_params["SecurityGroupIds"] = security_group_ids
        if subnet_id:
            run_params["SubnetId"] = subnet_id
        if user_data:
            run_params["UserData"] = user_data

        # Merge any additional parameters
        run_params.update(kwargs)

        logger.info(f"Creating EC2 instance: {instance_type} from AMI {ami_id}")
        response = self.ec2.run_instances(**run_params)

        instance = response["Instances"][0]
        instance_id = instance["InstanceId"]

        # Apply tags if provided (handle errors gracefully)
        if tags:
            try:
                self.ec2.create_tags(
                    Resources=[instance_id],
                    Tags=[{"Key": k, "Value": v} for k, v in tags.items()],
                )
                logger.info(f"Applied tags to instance {instance_id}")
            except ClientError as e:
                logger.warning(
                    f"Failed to apply tags to instance {instance_id}: {e.response['Error']['Message']}"
                )
                # Continue - instance was created successfully even if tagging failed

        logger.info(f"Created instance: {instance_id}")
        return self._format_instance(instance)

    @handle_aws_error
    def start_instance(self, instance_id: str) -> Dict:
        """
        Start a stopped EC2 instance.

        Args:
            instance_id: EC2 instance ID

        Returns:
            Response from start_instances
        """
        logger.info(f"Starting instance: {instance_id}")
        response = self.ec2.start_instances(InstanceIds=[instance_id])
        return response

    @handle_aws_error
    def stop_instance(self, instance_id: str) -> Dict:
        """
        Stop a running EC2 instance.

        Args:
            instance_id: EC2 instance ID

        Returns:
            Response from stop_instances
        """
        logger.info(f"Stopping instance: {instance_id}")
        response = self.ec2.stop_instances(InstanceIds=[instance_id])
        return response

    @handle_aws_error
    def reboot_instance(self, instance_id: str) -> Dict:
        """
        Reboot an EC2 instance.

        Args:
            instance_id: EC2 instance ID

        Returns:
            Response from reboot_instances
        """
        logger.info(f"Rebooting instance: {instance_id}")
        response = self.ec2.reboot_instances(InstanceIds=[instance_id])
        return response

    @handle_aws_error
    def terminate_instance(self, instance_id: str) -> Dict:
        """
        Terminate an EC2 instance.

        Args:
            instance_id: EC2 instance ID

        Returns:
            Response from terminate_instances
        """
        logger.info(f"Terminating instance: {instance_id}")
        response = self.ec2.terminate_instances(InstanceIds=[instance_id])
        return response

    # ========================================================================
    # Instance Type Information
    # ========================================================================

    @handle_aws_error
    def describe_instance_types(
        self, instance_types: Optional[List[str]] = None
    ) -> List[Dict]:
        """
        Describe EC2 instance types.

        Args:
            instance_types: Optional list of instance types to describe

        Returns:
            List of instance type information
        """
        kwargs = {}
        if instance_types:
            kwargs["InstanceTypes"] = instance_types

        response = self.ec2.describe_instance_types(**kwargs)
        return response.get("InstanceTypes", [])

    # ========================================================================
    # AMI Operations
    # ========================================================================

    @handle_aws_error
    def describe_images(
        self,
        image_ids: Optional[List[str]] = None,
        owners: Optional[List[str]] = None,
        filters: Optional[List[Dict]] = None,
    ) -> List[Dict]:
        """
        Describe AMIs.

        Args:
            image_ids: List of AMI IDs
            owners: List of owner IDs ('self', 'amazon', etc.)
            filters: EC2 filters

        Returns:
            List of AMI information
        """
        kwargs = {}
        if image_ids:
            kwargs["ImageIds"] = image_ids
        if owners:
            kwargs["Owners"] = owners
        if filters:
            kwargs["Filters"] = filters

        response = self.ec2.describe_images(**kwargs)
        return response.get("Images", [])

    # ========================================================================
    # Helper Methods
    # ========================================================================

    def _format_instance(self, instance: Dict) -> Dict:
        """
        Format EC2 instance data into a standardized dict.

        Args:
            instance: Raw EC2 instance dict from boto3

        Returns:
            Formatted instance dict
        """
        # Get instance name from tags
        name = None
        tags = instance.get("Tags", [])
        for tag in tags:
            if tag["Key"] == "Name":
                name = tag["Value"]
                break

        # Map state to our Status type
        state = instance.get("State", {}).get("Name", "unknown")
        status_map = {
            "running": "healthy",
            "stopped": "stopped",
            "stopping": "degraded",
            "pending": "degraded",
            "shutting-down": "degraded",
            "terminated": "error",
        }
        status = status_map.get(state, "error")

        return {
            "instance_id": instance.get("InstanceId"),
            "name": name or instance.get("InstanceId", "Unnamed"),
            "instance_type": instance.get("InstanceType"),
            "state": state,
            "status": status,
            "public_ip": instance.get("PublicIpAddress"),
            "private_ip": instance.get("PrivateIpAddress"),
            "launch_time": instance.get("LaunchTime").isoformat()
            if instance.get("LaunchTime")
            else None,
            "availability_zone": instance.get("Placement", {}).get("AvailabilityZone"),
            "subnet_id": instance.get("SubnetId"),
            "vpc_id": instance.get("VpcId"),
            "ami_id": instance.get("ImageId"),
            "key_name": instance.get("KeyName"),
            "security_groups": [
                sg["GroupId"] for sg in instance.get("SecurityGroups", [])
            ],
            "tags": {tag["Key"]: tag["Value"] for tag in instance.get("Tags", [])},
        }

    # ========================================================================
    # Security Operations
    # ========================================================================

    @handle_aws_error
    def create_key_pair(self, key_name: str, key_type: str = "ed25519") -> Dict:
        """
        Create a new SSH key pair.

        Args:
            key_name: Name for the key pair
            key_type: Key type ('rsa', 'ed25519')

        Returns:
            Key pair information including private key material
        """
        logger.info(f"Creating SSH key pair: {key_name} ({key_type})")

        params = {
            "KeyName": key_name,
            "KeyType": key_type.upper() if key_type.lower() == "rsa" else "ed25519",
        }

        # RSA keys can specify key length
        if key_type.lower() == "rsa":
            params["KeyFormat"] = "pem"

        response = self.ec2.create_key_pair(**params)

        logger.info(f"Created key pair: {key_name}")
        return {
            "key_name": response["KeyName"],
            "key_fingerprint": response["KeyFingerprint"],
            "key_material": response.get("KeyMaterial", ""),
            "key_type": key_type,
        }

    @handle_aws_error
    def describe_key_pairs(self, key_names: Optional[List[str]] = None) -> List[Dict]:
        """
        Describe SSH key pairs.

        Args:
            key_names: Optional list of key pair names

        Returns:
            List of key pair information
        """
        kwargs = {}
        if key_names:
            kwargs["KeyNames"] = key_names

        response = self.ec2.describe_key_pairs(**kwargs)

        key_pairs = []
        for kp in response.get("KeyPairs", []):
            key_pairs.append(
                {
                    "key_name": kp["KeyName"],
                    "key_fingerprint": kp["KeyFingerprint"],
                    "key_type": kp.get("KeyType", "unknown"),
                    "tags": kp.get("Tags", []),
                }
            )

        logger.info(f"Described {len(key_pairs)} key pairs")
        return key_pairs

    @handle_aws_error
    def delete_key_pair(self, key_name: str) -> None:
        """
        Delete an SSH key pair.

        Args:
            key_name: Name of the key pair to delete
        """
        logger.info(f"Deleting key pair: {key_name}")
        self.ec2.delete_key_pair(KeyName=key_name)
        logger.info(f"Deleted key pair: {key_name}")

    @handle_aws_error
    def create_security_group(
        self, group_name: str, description: str, vpc_id: Optional[str] = None
    ) -> Dict:
        """
        Create a security group.

        Args:
            group_name: Name for the security group
            description: Description of the security group
            vpc_id: VPC ID (optional, uses default VPC if not specified)

        Returns:
            Security group information
        """
        logger.info(f"Creating security group: {group_name}")

        params = {
            "GroupName": group_name,
            "Description": description,
        }

        if vpc_id:
            params["VpcId"] = vpc_id

        response = self.ec2.create_security_group(**params)

        logger.info(f"Created security group: {response['GroupId']}")
        return {
            "group_id": response["GroupId"],
            "group_name": response["GroupName"],
            "description": response["Description"],
            "vpc_id": response.get("VpcId"),
        }

    @handle_aws_error
    def describe_security_groups(
        self,
        group_ids: Optional[List[str]] = None,
        group_names: Optional[List[str]] = None,
    ) -> List[Dict]:
        """
        Describe security groups.

        Args:
            group_ids: Optional list of security group IDs
            group_names: Optional list of security group names

        Returns:
            List of security group information
        """
        kwargs = {}
        if group_ids:
            kwargs["GroupIds"] = group_ids
        if group_names:
            kwargs["GroupNames"] = group_names

        response = self.ec2.describe_security_groups(**kwargs)

        security_groups = []
        for sg in response.get("SecurityGroups", []):
            security_groups.append(
                {
                    "group_id": sg["GroupId"],
                    "group_name": sg["GroupName"],
                    "description": sg["Description"],
                    "vpc_id": sg.get("VpcId"),
                    "ip_permissions": sg.get("IpPermissions", []),
                    "ip_permissions_egress": sg.get("IpPermissionsEgress", []),
                    "tags": sg.get("Tags", []),
                }
            )

        logger.info(f"Described {len(security_groups)} security groups")
        return security_groups

    @handle_aws_error
    def authorize_security_group_ingress(
        self, group_id: str, ip_permissions: List[Dict]
    ) -> None:
        """
        Add inbound rules to a security group.

        Args:
            group_id: Security group ID
            ip_permissions: List of IP permission rules
        """
        logger.info(f"Authorizing ingress for security group: {group_id}")
        self.ec2.authorize_security_group_ingress(
            GroupId=group_id, IpPermissions=ip_permissions
        )
        logger.info(f"Authorized ingress rules for security group: {group_id}")

    @handle_aws_error
    def authorize_security_group_egress(
        self, group_id: str, ip_permissions: List[Dict]
    ) -> None:
        """
        Add outbound rules to a security group.

        Args:
            group_id: Security group ID
            ip_permissions: List of IP permission rules
        """
        logger.info(f"Authorizing egress for security group: {group_id}")
        self.ec2.authorize_security_group_egress(
            GroupId=group_id, IpPermissions=ip_permissions
        )
        logger.info(f"Authorized egress rules for security group: {group_id}")

    @handle_aws_error
    def delete_security_group(self, group_id: str) -> None:
        """
        Delete a security group.

        Args:
            group_id: Security group ID to delete
        """
        logger.info(f"Deleting security group: {group_id}")
        self.ec2.delete_security_group(GroupId=group_id)
        logger.info(f"Deleted security group: {group_id}")

    def _get_tag_value(self, tags: List[Dict], key: str, default: str = "") -> str:
        """
        Get tag value by key.

        Args:
            tags: List of tag dicts
            key: Tag key to find
            default: Default value if not found

        Returns:
            Tag value or default
        """
        for tag in tags:
            if tag.get("Key") == key:
                return tag.get("Value", default)
        return default
