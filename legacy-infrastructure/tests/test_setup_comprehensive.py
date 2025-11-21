"""Comprehensive tests for setup command"""

import pytest
import sys
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock

# Add scripts directory to path
scripts_dir = Path(__file__).parent.parent / "legacy-infrastructure" / "scripts"
sys.path.insert(0, str(scripts_dir))


class TestSetupComprehensive:
    """Comprehensive tests for setup command"""
    
    @pytest.mark.parametrize("region", [
        "us-east-2",
        "us-west-1",
        "us-west-2",
        "eu-west-1",
        "ap-southeast-1",
    ])
    def test_setup_with_different_regions(self, region, mock_aws_clients):
        """Test setup with different AWS regions"""
        from cvat.setup import collect_config_interactive
        
        with patch('rich.prompt.Prompt.ask') as mock_prompt, \
             patch('rich.prompt.Confirm.ask') as mock_confirm, \
             patch('rich.console.Console.print'):
            
            mock_prompt.side_effect = [
                region,
                "subnet-12345678",
                "my-key",
                "1.2.3.4",
                "",
                "",
            ]
            mock_confirm.side_effect = [True, True]
            
            config = collect_config_interactive(mock_aws_clients)
            assert config["aws_region"] == region
    
    @pytest.mark.parametrize("domain,expected_alb", [
        ("example.com", True),
        ("example.com", False),
        ("", False),
        (None, False),
    ])
    def test_setup_with_domain_options(self, domain, expected_alb, mock_aws_clients):
        """Test setup with different domain configurations"""
        from cvat.setup import collect_config_interactive
        
        with patch('rich.prompt.Prompt.ask') as mock_prompt, \
             patch('rich.prompt.Confirm.ask') as mock_confirm, \
             patch('rich.console.Console.print'):
            
            prompts = [
                "us-east-2",
                "subnet-12345678",
                "my-key",
                "1.2.3.4",
                domain if domain else "",
                "",
            ]
            mock_prompt.side_effect = prompts
            
            confirms = [True, True]  # use IP, enable infra
            if domain:
                confirms.append(expected_alb)  # enable ALB
            mock_confirm.side_effect = confirms
            
            config = collect_config_interactive(mock_aws_clients)
            
            if domain:
                assert config.get("domain_name") == domain
                assert config.get("enable_alb") == expected_alb
            else:
                assert config.get("domain_name") is None or config.get("domain_name") == ""
    
    def test_setup_with_snapshot_restore(self, mock_aws_clients):
        """Test setup with snapshot ID for restore"""
        from cvat.setup import collect_config_interactive
        
        with patch('rich.prompt.Prompt.ask') as mock_prompt, \
             patch('rich.prompt.Confirm.ask') as mock_confirm, \
             patch('rich.console.Console.print'):
            
            mock_prompt.side_effect = [
                "us-east-2",
                "subnet-12345678",
                "my-key",
                "1.2.3.4",
                "",
                "snap-12345678",  # snapshot ID
            ]
            mock_confirm.side_effect = [True, True]
            
            config = collect_config_interactive(mock_aws_clients)
            assert config.get("root_volume_snapshot_id") == "snap-12345678"
    
    def test_setup_without_snapshot(self, mock_aws_clients):
        """Test setup without snapshot (fresh instance)"""
        from cvat.setup import collect_config_interactive
        
        with patch('rich.prompt.Prompt.ask') as mock_prompt, \
             patch('rich.prompt.Confirm.ask') as mock_confirm, \
             patch('rich.console.Console.print'):
            
            mock_prompt.side_effect = [
                "us-east-2",
                "subnet-12345678",
                "my-key",
                "1.2.3.4",
                "",
                "",  # no snapshot
            ]
            mock_confirm.side_effect = [True, True]
            
            config = collect_config_interactive(mock_aws_clients)
            assert config.get("root_volume_snapshot_id") is None or config.get("root_volume_snapshot_id") == ""
    
    def test_setup_ip_detection_success(self):
        """Test IP detection when it succeeds"""
        from cvat.setup import detect_public_ip
        
        with patch('requests.get') as mock_get:
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.text = "192.168.1.1"
            mock_get.return_value = mock_response
            
            ip = detect_public_ip()
            assert ip == "192.168.1.1"
    
    def test_setup_ip_detection_failure(self):
        """Test IP detection when it fails"""
        from cvat.setup import detect_public_ip
        
        with patch('requests.get') as mock_get:
            mock_get.side_effect = Exception("Network error")
            
            ip = detect_public_ip()
            assert ip is None
    
    def test_setup_ip_detection_timeout(self):
        """Test IP detection timeout"""
        from cvat.setup import detect_public_ip
        
        with patch('requests.get') as mock_get:
            import requests
            mock_get.side_effect = requests.exceptions.Timeout()
            
            ip = detect_public_ip()
            assert ip is None
    
    def test_setup_subnet_validation_retry(self, mock_aws_clients):
        """Test subnet validation with retry on invalid input"""
        from cvat.setup import collect_config_interactive
        
        with patch('rich.prompt.Prompt.ask') as mock_prompt, \
             patch('rich.prompt.Confirm.ask') as mock_confirm, \
             patch('rich.console.Console.print'), \
             patch('sys.exit'):
            
            # First subnet invalid, second valid
            mock_aws_clients.get_vpc_id_from_subnet.side_effect = [
                None,  # First call fails
                "vpc-12345678"  # Second call succeeds
            ]
            
            mock_prompt.side_effect = [
                "us-east-2",
                "subnet-invalid",  # First attempt
                "subnet-12345678",  # Second attempt
                "my-key",
                "1.2.3.4",
                "",
                "",
            ]
            mock_confirm.side_effect = [False, True, True]  # Don't continue on first, then yes
            
            try:
                config = collect_config_interactive(mock_aws_clients)
                # Should succeed on second attempt
                assert config["subnet_id"] == "subnet-12345678"
            except SystemExit:
                pass  # Expected if validation fails
    
    def test_setup_key_pair_validation_retry(self, mock_aws_clients):
        """Test key pair validation with retry on invalid input"""
        from cvat.setup import collect_config_interactive
        
        with patch('rich.prompt.Prompt.ask') as mock_prompt, \
             patch('rich.prompt.Confirm.ask') as mock_confirm, \
             patch('rich.console.Console.print'):
            
            # First key invalid, second valid
            mock_aws_clients.validate_key_pair.side_effect = [
                False,  # First call fails
                True  # Second call succeeds
            ]
            
            mock_prompt.side_effect = [
                "us-east-2",
                "subnet-12345678",
                "invalid-key",  # First attempt
                "my-key",  # Second attempt
                "1.2.3.4",
                "",
                "",
            ]
            mock_confirm.side_effect = [False, True, True]  # Don't continue on first, then yes
            
            config = collect_config_interactive(mock_aws_clients)
            assert config["ssh_key_name"] == "my-key"


class TestImportExistingResources:
    """Test importing existing resources"""
    
    def test_import_security_groups(self, mock_aws_clients, project_root, terraform_dir, configs_dir):
        """Test importing existing security groups"""
        from cvat.setup import import_existing_resources
        
        with patch('cvat.setup.is_terraform_initialized') as mock_init, \
             patch('cvat.setup.terraform_state_show') as mock_state, \
             patch('cvat.setup.terraform_import') as mock_import, \
             patch('cvat.setup.get_config_value') as mock_get_config, \
             patch('rich.console.Console.print'), \
             patch('rich.prompt.Confirm.ask'):
            
            mock_init.return_value = True
            mock_state.return_value = False  # Not in state
            mock_import.return_value = True
            mock_get_config.return_value = "true"
            
            # Mock security groups exist
            mock_aws_clients.get_security_group_id.side_effect = [
                "sg-cvat-123",  # CVAT SG
                "sg-alb-123"  # ALB SG
            ]
            
            import_existing_resources(
                project_root,
                terraform_dir,
                configs_dir,
                mock_aws_clients,
                "vpc-12345678",
                "us-east-2"
            )
            
            # Should attempt to import both security groups
            assert mock_import.call_count >= 2
    
    def test_import_iam_resources(self, mock_aws_clients, project_root, terraform_dir, configs_dir):
        """Test importing existing IAM resources"""
        from cvat.setup import import_existing_resources
        
        with patch('cvat.setup.is_terraform_initialized') as mock_init, \
             patch('cvat.setup.terraform_state_show') as mock_state, \
             patch('cvat.setup.terraform_import') as mock_import, \
             patch('cvat.setup.get_config_value') as mock_get_config, \
             patch('rich.console.Console.print'), \
             patch('rich.prompt.Confirm.ask'):
            
            mock_init.return_value = True
            mock_state.return_value = False
            mock_import.return_value = True
            mock_get_config.return_value = "true"
            
            # Mock IAM resources exist
            mock_aws_clients.iam_role_exists.return_value = True
            mock_aws_clients.iam_instance_profile_exists.return_value = True
            
            import_existing_resources(
                project_root,
                terraform_dir,
                configs_dir,
                mock_aws_clients,
                "vpc-12345678",
                "us-east-2"
            )
            
            # Should attempt to import IAM resources
            assert mock_import.called
    
    def test_import_route53_records(self, mock_aws_clients, project_root, terraform_dir, configs_dir):
        """Test importing existing Route53 records"""
        from cvat.setup import import_existing_resources
        
        with patch('cvat.setup.is_terraform_initialized') as mock_init, \
             patch('cvat.setup.terraform_state_show') as mock_state, \
             patch('cvat.setup.terraform_import') as mock_import, \
             patch('cvat.setup.get_config_value') as mock_get_config, \
             patch('rich.console.Console.print'), \
             patch('rich.prompt.Confirm.ask'):
            
            mock_init.return_value = True
            mock_state.return_value = False
            mock_import.return_value = True
            mock_get_config.return_value = "example.com"
            
            # Mock Route53 records exist
            mock_aws_clients.get_route53_zone_id.return_value = "Z1234567890ABC"
            mock_aws_clients.get_route53_record.return_value = {
                'Name': 'example.com.',
                'Type': 'A',
                'ResourceRecords': [{'Value': '1.2.3.4'}]
            }
            
            import_existing_resources(
                project_root,
                terraform_dir,
                configs_dir,
                mock_aws_clients,
                "vpc-12345678",
                "us-east-2"
            )
            
            # Should attempt to import Route53 records
            assert mock_import.called

