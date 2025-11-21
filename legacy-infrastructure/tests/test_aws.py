"""Tests for AWS client module"""

import pytest
import sys
from pathlib import Path
from botocore.exceptions import ClientError
from unittest.mock import MagicMock, patch

# Add legacy scripts directory to path
scripts_dir = Path(__file__).parent.parent / "legacy-infrastructure" / "scripts"
sys.path.insert(0, str(scripts_dir))

from cvat.aws import AWSClients


class TestAWSClients:
    """Test AWSClients class"""
    
    def test_init(self):
        """Test AWSClients initialization"""
        clients = AWSClients(region="us-east-2")
        assert clients.region == "us-east-2"
        assert clients.ec2 is not None
        assert clients.iam is not None
        assert clients.route53 is not None
    
    def test_get_vpc_id_from_subnet_success(self, mock_aws_clients):
        """Test successful VPC ID retrieval from subnet"""
        vpc_id = mock_aws_clients.get_vpc_id_from_subnet("subnet-12345678")
        assert vpc_id == "vpc-12345678"
        mock_aws_clients.ec2.describe_subnets.assert_called_once_with(
            SubnetIds=["subnet-12345678"]
        )
    
    def test_get_vpc_id_from_subnet_not_found(self, mock_aws_clients):
        """Test VPC ID retrieval when subnet doesn't exist"""
        mock_aws_clients.ec2.describe_subnets.side_effect = ClientError(
            {'Error': {'Code': 'InvalidSubnetID.NotFound'}},
            'DescribeSubnets'
        )
        vpc_id = mock_aws_clients.get_vpc_id_from_subnet("subnet-nonexistent")
        assert vpc_id is None
    
    def test_validate_key_pair_exists(self, mock_aws_clients):
        """Test key pair validation when key exists"""
        result = mock_aws_clients.validate_key_pair("my-key")
        assert result is True
        mock_aws_clients.ec2.describe_key_pairs.assert_called_once_with(
            KeyNames=["my-key"]
        )
    
    def test_validate_key_pair_not_exists(self, mock_aws_clients):
        """Test key pair validation when key doesn't exist"""
        mock_aws_clients.ec2.describe_key_pairs.side_effect = ClientError(
            {'Error': {'Code': 'InvalidKeyPair.NotFound'}},
            'DescribeKeyPairs'
        )
        result = mock_aws_clients.validate_key_pair("nonexistent-key")
        assert result is False
    
    def test_get_security_group_id_found(self, mock_aws_clients):
        """Test security group retrieval when found"""
        mock_aws_clients.ec2.describe_security_groups.return_value = {
            'SecurityGroups': [{
                'GroupId': 'sg-12345678',
                'GroupName': 'cvat-ui-server',
                'VpcId': 'vpc-12345678'
            }]
        }
        sg_id = mock_aws_clients.get_security_group_id("cvat-ui-server", "vpc-12345678")
        assert sg_id == "sg-12345678"
    
    def test_get_security_group_id_not_found(self, mock_aws_clients):
        """Test security group retrieval when not found"""
        mock_aws_clients.ec2.describe_security_groups.return_value = {
            'SecurityGroups': []
        }
        sg_id = mock_aws_clients.get_security_group_id("nonexistent", "vpc-12345678")
        assert sg_id is None
    
    def test_iam_role_exists(self, mock_aws_clients):
        """Test IAM role existence check when role exists"""
        mock_aws_clients.iam.get_role.return_value = {
            'Role': {'RoleName': 'cvat-ec2-ssm-role'}
        }
        result = mock_aws_clients.iam_role_exists("cvat-ec2-ssm-role")
        assert result is True
    
    def test_iam_role_not_exists(self, mock_aws_clients):
        """Test IAM role existence check when role doesn't exist"""
        mock_aws_clients.iam.get_role.side_effect = ClientError(
            {'Error': {'Code': 'NoSuchEntity'}},
            'GetRole'
        )
        result = mock_aws_clients.iam_role_exists("nonexistent-role")
        assert result is False
    
    def test_iam_instance_profile_exists(self, mock_aws_clients):
        """Test IAM instance profile existence check"""
        mock_aws_clients.iam.get_instance_profile.return_value = {
            'InstanceProfile': {'InstanceProfileName': 'cvat-ec2-ssm-profile'}
        }
        result = mock_aws_clients.iam_instance_profile_exists("cvat-ec2-ssm-profile")
        assert result is True
    
    def test_get_elastic_ip_by_tag(self, mock_aws_clients):
        """Test Elastic IP retrieval by tag"""
        mock_aws_clients.ec2.describe_addresses.return_value = {
            'Addresses': [{
                'AllocationId': 'eipalloc-12345678',
                'PublicIp': '1.2.3.4',
                'Tags': [{'Key': 'Name', 'Value': 'cvat-ui-ssh-ip'}]
            }]
        }
        eip_id = mock_aws_clients.get_elastic_ip_by_tag("Name", "cvat-ui-ssh-ip")
        assert eip_id == "eipalloc-12345678"
    
    def test_get_elastic_ip_by_tag_not_found(self, mock_aws_clients):
        """Test Elastic IP retrieval when not found"""
        mock_aws_clients.ec2.describe_addresses.return_value = {
            'Addresses': []
        }
        eip_id = mock_aws_clients.get_elastic_ip_by_tag("Name", "nonexistent")
        assert eip_id is None
    
    def test_has_existing_resources_found(self, mock_aws_clients):
        """Test existing resources detection when resources exist"""
        mock_aws_clients.iam.get_role.return_value = {
            'Role': {'RoleName': 'cvat-ec2-ssm-role'}
        }
        result = mock_aws_clients.has_existing_resources("vpc-12345678")
        assert result is True
    
    def test_has_existing_resources_not_found(self, mock_aws_clients):
        """Test existing resources detection when no resources exist"""
        result = mock_aws_clients.has_existing_resources("vpc-12345678")
        assert result is False
    
    def test_get_route53_zone_id_found(self, mock_aws_clients):
        """Test Route53 zone ID retrieval when zone exists"""
        zone_id = mock_aws_clients.get_route53_zone_id("example.com")
        assert zone_id == "Z1234567890ABC"
    
    def test_get_route53_zone_id_not_found(self, mock_aws_clients):
        """Test Route53 zone ID retrieval when zone doesn't exist"""
        mock_aws_clients.route53.list_hosted_zones_by_name.return_value = {
            'HostedZones': []
        }
        zone_id = mock_aws_clients.get_route53_zone_id("nonexistent.com")
        assert zone_id is None
    
    def test_get_route53_record_found(self, mock_aws_clients):
        """Test Route53 record retrieval when record exists"""
        mock_aws_clients.route53.list_resource_record_sets.return_value = {
            'ResourceRecordSets': [{
                'Name': 'example.com.',
                'Type': 'A',
                'ResourceRecords': [{'Value': '1.2.3.4'}]
            }]
        }
        record = mock_aws_clients.get_route53_record("Z1234567890ABC", "example.com.", "A")
        assert record is not None
        assert record['Name'] == 'example.com.'
    
    def test_get_route53_record_not_found(self, mock_aws_clients):
        """Test Route53 record retrieval when record doesn't exist"""
        mock_aws_clients.route53.list_resource_record_sets.return_value = {
            'ResourceRecordSets': []
        }
        record = mock_aws_clients.get_route53_record("Z1234567890ABC", "nonexistent.com.", "A")
        assert record is None
    
    def test_get_instance_root_volume_id(self, mock_aws_clients):
        """Test root volume ID retrieval from instance"""
        volume_id = mock_aws_clients.get_instance_root_volume_id("i-1234567890abcdef0")
        assert volume_id == "vol-12345678"
    
    def test_get_instance_root_volume_id_not_found(self, mock_aws_clients):
        """Test root volume ID retrieval when instance not found"""
        mock_aws_clients.ec2.describe_instances.return_value = {
            'Reservations': []
        }
        volume_id = mock_aws_clients.get_instance_root_volume_id("i-nonexistent")
        assert volume_id is None
    
    def test_create_snapshot(self, mock_aws_clients):
        """Test snapshot creation"""
        snapshot_id = mock_aws_clients.create_snapshot(
            volume_id="vol-12345678",
            description="Test snapshot",
            tags=[{"Key": "Name", "Value": "test"}]
        )
        assert snapshot_id == "snap-12345678"
        mock_aws_clients.ec2.create_snapshot.assert_called_once()
    
    def test_create_snapshot_failure(self, mock_aws_clients):
        """Test snapshot creation failure"""
        mock_aws_clients.ec2.create_snapshot.side_effect = ClientError(
            {'Error': {'Code': 'InvalidVolume.NotFound'}},
            'CreateSnapshot'
        )
        snapshot_id = mock_aws_clients.create_snapshot(
            volume_id="vol-nonexistent",
            description="Test snapshot"
        )
        assert snapshot_id is None
    
    def test_wait_snapshot_completed(self, mock_aws_clients):
        """Test waiting for snapshot completion"""
        mock_waiter = MagicMock()
        mock_aws_clients.ec2.get_waiter.return_value = mock_waiter
        
        result = mock_aws_clients.wait_snapshot_completed("snap-12345678")
        assert result is True
        mock_waiter.wait.assert_called_once_with(SnapshotIds=["snap-12345678"])
    
    def test_wait_snapshot_completed_failure(self, mock_aws_clients):
        """Test snapshot wait failure"""
        mock_aws_clients.ec2.get_waiter.side_effect = ClientError(
            {'Error': {'Code': 'InvalidSnapshot.NotFound'}},
            'WaitSnapshotCompleted'
        )
        result = mock_aws_clients.wait_snapshot_completed("snap-nonexistent")
        assert result is False
    
    def test_create_ami_from_snapshot(self, mock_aws_clients):
        """Test AMI creation from snapshot"""
        ami_id = mock_aws_clients.create_ami_from_snapshot(
            snapshot_id="snap-12345678",
            name="test-ami",
            description="Test AMI",
            tags=[{"Key": "Name", "Value": "test"}]
        )
        assert ami_id == "ami-12345678"
        mock_aws_clients.ec2.register_image.assert_called_once()
    
    def test_create_ami_from_snapshot_failure(self, mock_aws_clients):
        """Test AMI creation failure"""
        mock_aws_clients.ec2.register_image.side_effect = ClientError(
            {'Error': {'Code': 'InvalidSnapshot.NotFound'}},
            'RegisterImage'
        )
        ami_id = mock_aws_clients.create_ami_from_snapshot(
            snapshot_id="snap-nonexistent",
            name="test-ami",
            description="Test AMI"
        )
        assert ami_id is None
    
    def test_get_all_elastic_ips(self, mock_aws_clients):
        """Test getting all Elastic IPs"""
        mock_aws_clients.ec2.describe_addresses.return_value = {
            'Addresses': [
                {'AllocationId': 'eipalloc-1', 'PublicIp': '1.2.3.4'},
                {'AllocationId': 'eipalloc-2', 'PublicIp': '5.6.7.8'}
            ]
        }
        eips = mock_aws_clients.get_all_elastic_ips()
        assert len(eips) == 2
    
    def test_release_elastic_ip(self, mock_aws_clients):
        """Test Elastic IP release"""
        result = mock_aws_clients.release_elastic_ip("eipalloc-12345678")
        assert result is True
        mock_aws_clients.ec2.release_address.assert_called_once_with(
            AllocationId="eipalloc-12345678"
        )
    
    def test_release_elastic_ip_failure(self, mock_aws_clients):
        """Test Elastic IP release failure"""
        mock_aws_clients.ec2.release_address.side_effect = ClientError(
            {'Error': {'Code': 'InvalidAllocationID.NotFound'}},
            'ReleaseAddress'
        )
        result = mock_aws_clients.release_elastic_ip("eipalloc-nonexistent")
        assert result is False
    
    def test_disassociate_address(self, mock_aws_clients):
        """Test Elastic IP disassociation"""
        result = mock_aws_clients.disassociate_address("eipassoc-12345678")
        assert result is True
        mock_aws_clients.ec2.disassociate_address.assert_called_once_with(
            AssociationId="eipassoc-12345678"
        )
    
    def test_get_network_interface_description(self, mock_aws_clients):
        """Test network interface description retrieval"""
        desc = mock_aws_clients.get_network_interface_description("eni-12345678")
        assert desc == "ELB app/cvat-alb/1234567890abcdef"
    
    def test_get_network_interface_description_not_found(self, mock_aws_clients):
        """Test network interface description when not found"""
        mock_aws_clients.ec2.describe_network_interfaces.side_effect = ClientError(
            {'Error': {'Code': 'InvalidNetworkInterfaceID.NotFound'}},
            'DescribeNetworkInterfaces'
        )
        desc = mock_aws_clients.get_network_interface_description("eni-nonexistent")
        assert desc is None

