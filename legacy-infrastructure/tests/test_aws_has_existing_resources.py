"""Comprehensive tests for has_existing_resources method"""

import pytest
import sys
from pathlib import Path
from unittest.mock import MagicMock

# Add scripts directory to path
scripts_dir = Path(__file__).parent.parent / "legacy-infrastructure" / "scripts"
sys.path.insert(0, str(scripts_dir))

from cvat.aws import AWSClients


class TestHasExistingResourcesComprehensive:
    """Comprehensive tests for has_existing_resources with all parameter combinations"""
    
    def test_has_existing_resources_iam_only(self, mock_aws_clients):
        """Test has_existing_resources with only IAM check enabled"""
        mock_aws_clients.iam_role_exists.return_value = True
        
        result = mock_aws_clients.has_existing_resources(
            vpc_id="vpc-12345678",
            check_iam=True,
            check_security_groups=False,
            check_eip=False
        )
        
        assert result is True
        mock_aws_clients.iam_role_exists.assert_called_once_with("cvat-ec2-ssm-role")
    
    def test_has_existing_resources_security_group_only(self, mock_aws_clients):
        """Test has_existing_resources with only security group check enabled"""
        mock_aws_clients.get_security_group_id.return_value = "sg-12345678"
        
        result = mock_aws_clients.has_existing_resources(
            vpc_id="vpc-12345678",
            check_iam=False,
            check_security_groups=True,
            check_eip=False
        )
        
        assert result is True
        mock_aws_clients.get_security_group_id.assert_called_once_with("cvat-ui-server", "vpc-12345678")
    
    def test_has_existing_resources_eip_only(self, mock_aws_clients):
        """Test has_existing_resources with only EIP check enabled"""
        mock_aws_clients.get_elastic_ip_by_tag.return_value = "eipalloc-12345678"
        
        result = mock_aws_clients.has_existing_resources(
            vpc_id="vpc-12345678",
            check_iam=False,
            check_security_groups=False,
            check_eip=True
        )
        
        assert result is True
        mock_aws_clients.get_elastic_ip_by_tag.assert_called_once_with("Name", "cvat-ui-ssh-ip")
    
    def test_has_existing_resources_no_vpc_id(self, mock_aws_clients):
        """Test has_existing_resources with no VPC ID (security groups check skipped)"""
        mock_aws_clients.iam_role_exists.return_value = False
        mock_aws_clients.get_elastic_ip_by_tag.return_value = None
        
        result = mock_aws_clients.has_existing_resources(
            vpc_id=None,
            check_iam=True,
            check_security_groups=True,
            check_eip=True
        )
        
        assert result is False
        # Security group check should be skipped when vpc_id is None
        mock_aws_clients.get_security_group_id.assert_not_called()
    
    def test_has_existing_resources_all_checks_disabled(self, mock_aws_clients):
        """Test has_existing_resources with all checks disabled"""
        result = mock_aws_clients.has_existing_resources(
            vpc_id="vpc-12345678",
            check_iam=False,
            check_security_groups=False,
            check_eip=False
        )
        
        assert result is False
        # No methods should be called
        mock_aws_clients.iam_role_exists.assert_not_called()
        mock_aws_clients.get_security_group_id.assert_not_called()
        mock_aws_clients.get_elastic_ip_by_tag.assert_not_called()
    
    def test_has_existing_resources_multiple_resources_exist(self, mock_aws_clients):
        """Test has_existing_resources when multiple resources exist"""
        mock_aws_clients.iam_role_exists.return_value = True
        mock_aws_clients.get_security_group_id.return_value = "sg-12345678"
        mock_aws_clients.get_elastic_ip_by_tag.return_value = "eipalloc-12345678"
        
        result = mock_aws_clients.has_existing_resources("vpc-12345678")
        
        assert result is True
        # Should return True on first match (IAM role)
    
    def test_has_existing_resources_security_group_with_no_vpc(self, mock_aws_clients):
        """Test that security group check is skipped when vpc_id is None"""
        mock_aws_clients.iam_role_exists.return_value = False
        mock_aws_clients.get_elastic_ip_by_tag.return_value = None
        
        result = mock_aws_clients.has_existing_resources(
            vpc_id=None,
            check_security_groups=True  # Even if True, should be skipped
        )
        
        assert result is False
        mock_aws_clients.get_security_group_id.assert_not_called()

