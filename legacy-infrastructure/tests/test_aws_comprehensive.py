"""Comprehensive AWS client tests with parameterized inputs"""

import pytest
import sys
from pathlib import Path
from unittest.mock import MagicMock
from botocore.exceptions import ClientError

# Add scripts directory to path
scripts_dir = Path(__file__).parent.parent / "legacy-infrastructure" / "scripts"
sys.path.insert(0, str(scripts_dir))


class TestAWSParameterized:
    """Parameterized tests for AWS operations"""
    
    @pytest.mark.parametrize("subnet_id,expected_vpc", [
        ("subnet-12345678", "vpc-12345678"),
        ("subnet-abcdefgh", "vpc-abcdefgh"),
        ("subnet-invalid", None),
    ])
    def test_get_vpc_id_from_subnet_variations(self, subnet_id, expected_vpc, mock_aws_clients):
        """Test getting VPC ID with various subnet IDs"""
        if expected_vpc:
            mock_aws_clients.ec2.describe_subnets.return_value = {
                'Subnets': [{'SubnetId': subnet_id, 'VpcId': expected_vpc}]
            }
        else:
            mock_aws_clients.ec2.describe_subnets.side_effect = ClientError(
                {'Error': {'Code': 'InvalidSubnetID.NotFound'}},
                'DescribeSubnets'
            )
        
        vpc_id = mock_aws_clients.get_vpc_id_from_subnet(subnet_id)
        assert vpc_id == expected_vpc
    
    @pytest.mark.parametrize("key_name,exists", [
        ("my-key", True),
        ("another-key", True),
        ("nonexistent-key", False),
        ("", False),
    ])
    def test_validate_key_pair_variations(self, key_name, exists, mock_aws_clients):
        """Test key pair validation with various key names"""
        if not exists:
            mock_aws_clients.ec2.describe_key_pairs.side_effect = ClientError(
                {'Error': {'Code': 'InvalidKeyPair.NotFound'}},
                'DescribeKeyPairs'
            )
        
        result = mock_aws_clients.validate_key_pair(key_name)
        assert result == exists
    
    @pytest.mark.parametrize("snapshot_id,should_succeed", [
        ("snap-12345678", True),
        ("snap-abcdefgh", True),
        ("snap-invalid", False),
    ])
    def test_wait_snapshot_completed_variations(self, snapshot_id, should_succeed, mock_aws_clients):
        """Test waiting for snapshot completion with various snapshot IDs"""
        mock_waiter = MagicMock()
        mock_aws_clients.ec2.get_waiter.return_value = mock_waiter
        
        if not should_succeed:
            import botocore.exceptions
            mock_waiter.wait.side_effect = botocore.exceptions.WaiterError(
                name='snapshot_completed',
                reason='Max attempts exceeded',
                last_response={}
            )
        
        result = mock_aws_clients.wait_snapshot_completed(snapshot_id)
        assert result == should_succeed
    
    @pytest.mark.parametrize("volume_id,snapshot_id", [
        ("vol-12345678", "snap-12345678"),
        ("vol-abcdefgh", "snap-abcdefgh"),
    ])
    def test_create_snapshot_variations(self, volume_id, snapshot_id, mock_aws_clients):
        """Test creating snapshots with various volume IDs"""
        mock_aws_clients.ec2.create_snapshot.return_value = {
            'SnapshotId': snapshot_id
        }
        
        result = mock_aws_clients.create_snapshot(
            volume_id=volume_id,
            description="Test snapshot"
        )
        assert result == snapshot_id
    
    @pytest.mark.parametrize("snapshot_id,ami_id", [
        ("snap-12345678", "ami-12345678"),
        ("snap-abcdefgh", "ami-abcdefgh"),
    ])
    def test_create_ami_from_snapshot_variations(self, snapshot_id, ami_id, mock_aws_clients):
        """Test creating AMI from snapshot with various snapshot IDs"""
        mock_aws_clients.ec2.register_image.return_value = {
            'ImageId': ami_id
        }
        
        result = mock_aws_clients.create_ami_from_snapshot(
            snapshot_id=snapshot_id,
            name="test-ami",
            description="Test AMI"
        )
        assert result == ami_id


class TestAWSBulkOperations:
    """Test bulk AWS operations"""
    
    def test_get_all_elastic_ips_multiple(self, mock_aws_clients):
        """Test getting multiple Elastic IPs"""
        mock_aws_clients.ec2.describe_addresses.return_value = {
            'Addresses': [
                {'AllocationId': 'eipalloc-1', 'PublicIp': '1.2.3.4'},
                {'AllocationId': 'eipalloc-2', 'PublicIp': '5.6.7.8'},
                {'AllocationId': 'eipalloc-3', 'PublicIp': '9.10.11.12'},
            ]
        }
        
        eips = mock_aws_clients.get_all_elastic_ips()
        assert len(eips) == 3
        assert eips[0]['AllocationId'] == 'eipalloc-1'
    
    def test_cleanup_multiple_elastic_ips(self, mock_aws_clients):
        """Test cleaning up multiple Elastic IPs"""
        from cvat.up import cleanup_extra_elastic_ips
        
        mock_aws_clients.get_all_elastic_ips.return_value = [
            {
                'AllocationId': 'eipalloc-1',
                'AssociationId': None,
                'PublicIp': '1.2.3.4'
            },
            {
                'AllocationId': 'eipalloc-2',
                'AssociationId': 'None',
                'PublicIp': '5.6.7.8'
            },
            {
                'AllocationId': 'eipalloc-3',
                'AssociationId': 'eipassoc-3',
                'PublicIp': '9.10.11.12'
            }
        ]
        mock_aws_clients.get_elastic_ip_by_tag.return_value = "eipalloc-keep"
        mock_aws_clients.release_elastic_ip.return_value = True
        
        with patch('cvat.up.console') as mock_console:
            cleanup_extra_elastic_ips(mock_aws_clients, "us-east-2")
            
            # Should release unassociated EIPs (eipalloc-1 and eipalloc-2)
            assert mock_aws_clients.release_elastic_ip.call_count == 2


class TestAWSResourceTagging:
    """Test AWS resource tagging operations"""
    
    def test_create_snapshot_with_tags(self, mock_aws_clients):
        """Test creating snapshot with multiple tags"""
        tags = [
            {"Key": "Name", "Value": "test-snapshot"},
            {"Key": "Environment", "Value": "test"},
            {"Key": "Project", "Value": "cvat"},
        ]
        
        mock_aws_clients.ec2.create_snapshot.return_value = {
            'SnapshotId': 'snap-12345678'
        }
        
        snapshot_id = mock_aws_clients.create_snapshot(
            volume_id="vol-12345678",
            description="Test snapshot",
            tags=tags
        )
        
        assert snapshot_id == "snap-12345678"
        # Verify tags were passed
        call_args = mock_aws_clients.ec2.create_snapshot.call_args
        assert call_args[1]['TagSpecifications'] is not None
    
    def test_create_ami_with_tags(self, mock_aws_clients):
        """Test creating AMI with multiple tags"""
        tags = [
            {"Key": "Name", "Value": "test-ami"},
            {"Key": "SnapshotID", "Value": "snap-12345678"},
            {"Key": "CheckpointPurpose", "Value": "CVAT Workstation"},
        ]
        
        mock_aws_clients.ec2.register_image.return_value = {
            'ImageId': 'ami-12345678'
        }
        
        ami_id = mock_aws_clients.create_ami_from_snapshot(
            snapshot_id="snap-12345678",
            name="test-ami",
            description="Test AMI",
            tags=tags
        )
        
        assert ami_id == "ami-12345678"
        # Verify tags were passed
        call_args = mock_aws_clients.ec2.register_image.call_args
        assert call_args[1]['TagSpecifications'] is not None


class TestAWSRegionHandling:
    """Test AWS region-specific operations"""
    
    @pytest.mark.parametrize("region", [
        "us-east-1",
        "us-east-2",
        "us-west-1",
        "us-west-2",
        "eu-west-1",
        "ap-southeast-1",
    ])
    def test_aws_clients_region_initialization(self, region):
        """Test AWSClients initialization with different regions"""
        from cvat.aws import AWSClients
        
        clients = AWSClients(region=region)
        assert clients.region == region
    
    def test_aws_clients_region_change(self, mock_aws_clients):
        """Test changing AWS region"""
        original_region = mock_aws_clients.region
        
        # Recreate with new region
        from cvat.aws import AWSClients
        new_clients = AWSClients(region="us-west-2")
        
        assert new_clients.region == "us-west-2"
        assert new_clients.region != original_region

