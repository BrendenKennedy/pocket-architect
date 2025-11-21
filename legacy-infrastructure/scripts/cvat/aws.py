"""AWS API calls using boto3"""

import boto3
from botocore.exceptions import ClientError, BotoCoreError
from typing import Optional, List, Dict, Any


class AWSClients:
    """Container for AWS service clients"""
    
    def __init__(self, region: str = "us-east-2"):
        """Initialize AWS clients.
        
        Args:
            region: AWS region
        """
        self.region = region
        self.ec2 = boto3.client('ec2', region_name=region)
        self.iam = boto3.client('iam', region_name=region)
        self.route53 = boto3.client('route53', region_name=region)
    
    def get_vpc_id_from_subnet(self, subnet_id: str) -> Optional[str]:
        """Get VPC ID from subnet ID.
        
        Args:
            subnet_id: Subnet ID
            
        Returns:
            VPC ID or None if not found
        """
        try:
            response = self.ec2.describe_subnets(SubnetIds=[subnet_id])
            if response['Subnets']:
                return response['Subnets'][0]['VpcId']
        except ClientError:
            pass
        return None
    
    def validate_key_pair(self, key_name: str) -> bool:
        """Validate that a key pair exists.
        
        Args:
            key_name: Key pair name
            
        Returns:
            True if key pair exists
        """
        try:
            self.ec2.describe_key_pairs(KeyNames=[key_name])
            return True
        except ClientError:
            return False
    
    def get_security_group_id(self, group_name: str, vpc_id: str) -> Optional[str]:
        """Get security group ID by name and VPC.
        
        Args:
            group_name: Security group name
            vpc_id: VPC ID
            
        Returns:
            Security group ID or None if not found
        """
        try:
            response = self.ec2.describe_security_groups(
                Filters=[
                    {'Name': 'group-name', 'Values': [group_name]},
                    {'Name': 'vpc-id', 'Values': [vpc_id]},
                ]
            )
            if response['SecurityGroups']:
                return response['SecurityGroups'][0]['GroupId']
        except ClientError:
            pass
        return None
    
    def iam_role_exists(self, role_name: str) -> bool:
        """Check if IAM role exists.
        
        Args:
            role_name: IAM role name
            
        Returns:
            True if role exists
        """
        try:
            self.iam.get_role(RoleName=role_name)
            return True
        except ClientError:
            return False
    
    def iam_instance_profile_exists(self, profile_name: str) -> bool:
        """Check if IAM instance profile exists.
        
        Args:
            profile_name: Instance profile name
            
        Returns:
            True if instance profile exists
        """
        try:
            self.iam.get_instance_profile(InstanceProfileName=profile_name)
            return True
        except ClientError:
            return False
    
    def get_elastic_ip_by_tag(self, tag_key: str, tag_value: str) -> Optional[str]:
        """Get Elastic IP allocation ID by tag.
        
        Args:
            tag_key: Tag key
            tag_value: Tag value
            
        Returns:
            Allocation ID or None if not found
        """
        try:
            response = self.ec2.describe_addresses(
                Filters=[
                    {'Name': f'tag:{tag_key}', 'Values': [tag_value]}
                ]
            )
            if response['Addresses']:
                return response['Addresses'][0]['AllocationId']
        except ClientError:
            pass
        return None
    
    def has_existing_resources(
        self,
        vpc_id: Optional[str],
        check_iam: bool = True,
        check_security_groups: bool = True,
        check_eip: bool = True,
    ) -> bool:
        """Check if any existing CVAT resources exist in AWS.
        
        Args:
            vpc_id: VPC ID to check security groups in
            check_iam: Check for IAM resources
            check_security_groups: Check for security groups
            check_eip: Check for Elastic IP
            
        Returns:
            True if any resources exist
        """
        if check_iam:
            if self.iam_role_exists("cvat-ec2-ssm-role"):
                return True
        
        if check_security_groups and vpc_id:
            if self.get_security_group_id("cvat-ui-server", vpc_id):
                return True
        
        if check_eip:
            if self.get_elastic_ip_by_tag("Name", "cvat-ui-ssh-ip"):
                return True
        
        return False
    
    def get_route53_zone_id(self, domain_name: str) -> Optional[str]:
        """Get Route 53 hosted zone ID for domain.
        
        Args:
            domain_name: Domain name
            
        Returns:
            Hosted zone ID or None if not found
        """
        try:
            response = self.route53.list_hosted_zones_by_name(DNSName=domain_name)
            for zone in response.get('HostedZones', []):
                if zone['Name'] == f'{domain_name}.':
                    return zone['Id'].split('/')[-1]
        except ClientError:
            pass
        return None
    
    def get_route53_record(
        self,
        zone_id: str,
        record_name: str,
        record_type: str = "A",
    ) -> Optional[Dict[str, Any]]:
        """Get Route 53 record.
        
        Args:
            zone_id: Hosted zone ID
            record_name: Record name (with trailing dot)
            record_type: Record type (A, CNAME, etc.)
            
        Returns:
            Record data or None if not found
        """
        try:
            response = self.route53.list_resource_record_sets(
                HostedZoneId=zone_id
            )
            for record in response.get('ResourceRecordSets', []):
                if record['Name'] == record_name and record['Type'] == record_type:
                    return record
        except ClientError:
            pass
        return None
    
    def get_instance_root_volume_id(self, instance_id: str) -> Optional[str]:
        """Get root volume ID for an EC2 instance.
        
        Args:
            instance_id: EC2 instance ID
            
        Returns:
            Volume ID or None if not found
        """
        try:
            response = self.ec2.describe_instances(InstanceIds=[instance_id])
            if response['Reservations']:
                instance = response['Reservations'][0]['Instances'][0]
                for block_device in instance.get('BlockDeviceMappings', []):
                    if block_device['DeviceName'] == '/dev/sda1':
                        return block_device['Ebs']['VolumeId']
        except ClientError:
            pass
        return None
    
    def create_snapshot(
        self,
        volume_id: str,
        description: str,
        tags: Optional[List[Dict[str, str]]] = None,
    ) -> Optional[str]:
        """Create EBS snapshot.
        
        Args:
            volume_id: Volume ID to snapshot
            description: Snapshot description
            tags: List of tag dictionaries
            
        Returns:
            Snapshot ID or None if failed
        """
        try:
            tag_spec = None
            if tags:
                tag_spec = [{'ResourceType': 'snapshot', 'Tags': tags}]
            
            response = self.ec2.create_snapshot(
                VolumeId=volume_id,
                Description=description,
                TagSpecifications=tag_spec,
            )
            return response['SnapshotId']
        except ClientError:
            return None
    
    def wait_snapshot_completed(self, snapshot_id: str) -> bool:
        """Wait for snapshot to complete.
        
        Args:
            snapshot_id: Snapshot ID
            
        Returns:
            True if completed successfully
        """
        try:
            waiter = self.ec2.get_waiter('snapshot_completed')
            waiter.wait(SnapshotIds=[snapshot_id])
            return True
        except (ClientError, BotoCoreError):
            return False
    
    def create_ami_from_snapshot(
        self,
        snapshot_id: str,
        name: str,
        description: str,
        tags: Optional[List[Dict[str, str]]] = None,
    ) -> Optional[str]:
        """Create AMI from snapshot.
        
        Args:
            snapshot_id: Snapshot ID
            name: AMI name
            description: AMI description
            tags: List of tag dictionaries
            
        Returns:
            AMI ID or None if failed
        """
        try:
            tag_spec = None
            if tags:
                tag_spec = [{'ResourceType': 'image', 'Tags': tags}]
            
            response = self.ec2.register_image(
                Name=name,
                Description=description,
                Architecture='x86_64',
                VirtualizationType='hvm',
                EnaSupport=True,
                RootDeviceName='/dev/sda1',
                BlockDeviceMappings=[
                    {
                        'DeviceName': '/dev/sda1',
                        'Ebs': {
                            'SnapshotId': snapshot_id,
                            'VolumeType': 'gp3',
                            'DeleteOnTermination': True,
                        }
                    }
                ],
                TagSpecifications=tag_spec,
            )
            return response['ImageId']
        except ClientError:
            return None
    
    def get_all_elastic_ips(self) -> List[Dict[str, Any]]:
        """Get all Elastic IPs in the region.
        
        Returns:
            List of Elastic IP dictionaries
        """
        try:
            response = self.ec2.describe_addresses()
            return response.get('Addresses', [])
        except ClientError:
            return []
    
    def release_elastic_ip(self, allocation_id: str) -> bool:
        """Release an Elastic IP.
        
        Args:
            allocation_id: Allocation ID
            
        Returns:
            True if released successfully
        """
        try:
            self.ec2.release_address(AllocationId=allocation_id)
            return True
        except ClientError:
            return False
    
    def disassociate_address(self, association_id: str) -> bool:
        """Disassociate an Elastic IP.
        
        Args:
            association_id: Association ID
            
        Returns:
            True if disassociated successfully
        """
        try:
            self.ec2.disassociate_address(AssociationId=association_id)
            return True
        except ClientError:
            return False
    
    def get_network_interface_description(self, network_interface_id: str) -> Optional[str]:
        """Get network interface description.
        
        Args:
            network_interface_id: Network interface ID
            
        Returns:
            Description or None if not found
        """
        try:
            response = self.ec2.describe_network_interfaces(
                NetworkInterfaceIds=[network_interface_id]
            )
            if response['NetworkInterfaces']:
                return response['NetworkInterfaces'][0].get('Description')
        except ClientError:
            pass
        return None

