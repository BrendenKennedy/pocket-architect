"""Comprehensive tests for Route53 operations"""

import pytest
import sys
from pathlib import Path
from unittest.mock import MagicMock

# Add scripts directory to path
scripts_dir = Path(__file__).parent.parent / "legacy-infrastructure" / "scripts"
sys.path.insert(0, str(scripts_dir))

from cvat.aws import AWSClients


class TestRoute53Comprehensive:
    """Comprehensive tests for Route53 operations"""
    
    @pytest.mark.parametrize("record_type", ["A", "AAAA", "CNAME", "MX", "TXT", "NS"])
    def test_get_route53_record_different_types(self, record_type, mock_aws_clients):
        """Test getting Route53 records with different record types"""
        mock_aws_clients.route53.list_resource_record_sets.return_value = {
            'ResourceRecordSets': [{
                'Name': 'example.com.',
                'Type': record_type,
                'ResourceRecords': [{'Value': '1.2.3.4'}]
            }]
        }
        
        record = mock_aws_clients.get_route53_record("Z1234567890ABC", "example.com.", record_type)
        
        assert record is not None
        assert record['Type'] == record_type
    
    def test_get_route53_record_multiple_records_same_name(self, mock_aws_clients):
        """Test getting Route53 record when multiple records exist with same name"""
        mock_aws_clients.route53.list_resource_record_sets.return_value = {
            'ResourceRecordSets': [
                {
                    'Name': 'example.com.',
                    'Type': 'A',
                    'ResourceRecords': [{'Value': '1.2.3.4'}]
                },
                {
                    'Name': 'example.com.',
                    'Type': 'AAAA',
                    'ResourceRecords': [{'Value': '2001:db8::1'}]
                }
            ]
        }
        
        # Get A record
        a_record = mock_aws_clients.get_route53_record("Z1234567890ABC", "example.com.", "A")
        assert a_record is not None
        assert a_record['Type'] == "A"
        
        # Get AAAA record
        aaaa_record = mock_aws_clients.get_route53_record("Z1234567890ABC", "example.com.", "AAAA")
        assert aaaa_record is not None
        assert aaaa_record['Type'] == "AAAA"
    
    def test_get_route53_record_case_sensitive_name(self, mock_aws_clients):
        """Test that record name matching is case-sensitive"""
        mock_aws_clients.route53.list_resource_record_sets.return_value = {
            'ResourceRecordSets': [{
                'Name': 'Example.Com.',
                'Type': 'A',
                'ResourceRecords': [{'Value': '1.2.3.4'}]
            }]
        }
        
        # Exact match
        record1 = mock_aws_clients.get_route53_record("Z1234567890ABC", "Example.Com.", "A")
        assert record1 is not None
        
        # Different case - should not match
        record2 = mock_aws_clients.get_route53_record("Z1234567890ABC", "example.com.", "A")
        assert record2 is None
    
    def test_get_route53_zone_id_multiple_zones(self, mock_aws_clients):
        """Test getting zone ID when multiple zones exist"""
        mock_aws_clients.route53.list_hosted_zones_by_name.return_value = {
            'HostedZones': [
                {
                    'Id': '/hostedzone/Z1111111111',
                    'Name': 'example.com.'
                },
                {
                    'Id': '/hostedzone/Z2222222222',
                    'Name': 'subdomain.example.com.'
                }
            ]
        }
        
        zone_id = mock_aws_clients.get_route53_zone_id("example.com")
        assert zone_id == "Z1111111111"
    
    def test_get_route53_zone_id_partial_match(self, mock_aws_clients):
        """Test that zone ID requires exact name match"""
        mock_aws_clients.route53.list_hosted_zones_by_name.return_value = {
            'HostedZones': [
                {
                    'Id': '/hostedzone/Z1234567890ABC',
                    'Name': 'example.com.'
                }
            ]
        }
        
        # Exact match should work
        zone_id1 = mock_aws_clients.get_route53_zone_id("example.com")
        assert zone_id1 == "Z1234567890ABC"
        
        # Partial match should not work
        zone_id2 = mock_aws_clients.get_route53_zone_id("subdomain.example.com")
        assert zone_id2 is None

