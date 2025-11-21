"""Tests for up command"""

import pytest
import sys
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock

# Add scripts directory to path
scripts_dir = Path(__file__).parent.parent / "legacy-infrastructure" / "scripts"
sys.path.insert(0, str(scripts_dir))

from cvat.up import cleanup_extra_elastic_ips


class TestCleanupExtraElasticIPs:
    """Test Elastic IP cleanup"""
    
    def test_cleanup_extra_elastic_ips_none_to_clean(self, mock_aws_clients):
        """Test cleanup when no extra EIPs exist"""
        mock_aws_clients.get_all_elastic_ips.return_value = []
        mock_aws_clients.get_elastic_ip_by_tag.return_value = "eipalloc-keep"
        
        cleanup_extra_elastic_ips(mock_aws_clients, "us-east-2")
        
        # Should not release any EIPs
        mock_aws_clients.release_elastic_ip.assert_not_called()
    
    def test_cleanup_extra_elastic_ips_unassociated(self, mock_aws_clients):
        """Test cleanup of unassociated EIPs"""
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
            }
        ]
        mock_aws_clients.get_elastic_ip_by_tag.return_value = "eipalloc-keep"
        mock_aws_clients.release_elastic_ip.return_value = True
        
        cleanup_extra_elastic_ips(mock_aws_clients, "us-east-2")
        
        # Should release unassociated EIPs
        assert mock_aws_clients.release_elastic_ip.call_count == 2
    
    def test_cleanup_extra_elastic_ips_alb_associated(self, mock_aws_clients):
        """Test cleanup of EIPs associated with ALB"""
        mock_aws_clients.get_all_elastic_ips.return_value = [
            {
                'AllocationId': 'eipalloc-1',
                'AssociationId': 'eipassoc-1',
                'NetworkInterfaceId': 'eni-12345678',
                'PublicIp': '1.2.3.4'
            }
        ]
        mock_aws_clients.get_elastic_ip_by_tag.return_value = "eipalloc-keep"
        mock_aws_clients.get_network_interface_description.return_value = "ELB app/cvat-alb/123"
        mock_aws_clients.disassociate_address.return_value = True
        mock_aws_clients.release_elastic_ip.return_value = True
        
        cleanup_extra_elastic_ips(mock_aws_clients, "us-east-2")
        
        # Should disassociate and release
        mock_aws_clients.disassociate_address.assert_called_once()
        mock_aws_clients.release_elastic_ip.assert_called_once()
    
    def test_cleanup_extra_elastic_ips_keeps_tagged(self, mock_aws_clients):
        """Test that tagged EIP is kept"""
        mock_aws_clients.get_all_elastic_ips.return_value = [
            {
                'AllocationId': 'eipalloc-keep',
                'AssociationId': None,
                'PublicIp': '1.2.3.4'
            }
        ]
        mock_aws_clients.get_elastic_ip_by_tag.return_value = "eipalloc-keep"
        
        cleanup_extra_elastic_ips(mock_aws_clients, "us-east-2")
        
        # Should not release the tagged EIP
        mock_aws_clients.release_elastic_ip.assert_not_called()

