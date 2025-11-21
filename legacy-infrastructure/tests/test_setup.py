"""Tests for setup command"""

import pytest
import sys
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock

# Add scripts directory to path
scripts_dir = Path(__file__).parent.parent / "legacy-infrastructure" / "scripts"
sys.path.insert(0, str(scripts_dir))

from cvat.setup import (
    detect_public_ip,
    collect_config_interactive,
    import_existing_resources,
)


class TestDetectPublicIP:
    """Test public IP detection"""
    
    @patch('cvat.setup.requests.get')
    def test_detect_public_ip_success(self, mock_get):
        """Test successful IP detection"""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.text = "1.2.3.4"
        mock_get.return_value = mock_response
        
        ip = detect_public_ip()
        assert ip == "1.2.3.4"
    
    @patch('cvat.setup.requests.get')
    def test_detect_public_ip_failure(self, mock_get):
        """Test IP detection failure"""
        mock_get.side_effect = Exception("Network error")
        
        ip = detect_public_ip()
        assert ip is None
    
    @patch('cvat.setup.requests.get')
    def test_detect_public_ip_bad_status(self, mock_get):
        """Test IP detection with bad status code"""
        mock_response = Mock()
        mock_response.status_code = 500
        mock_get.return_value = mock_response
        
        ip = detect_public_ip()
        assert ip is None


class TestCollectConfigInteractive:
    """Test interactive config collection"""
    
    @patch('rich.prompt.Prompt.ask')
    @patch('rich.prompt.Confirm.ask')
    @patch('rich.console.Console.print')
    def test_collect_config_interactive_basic(self, mock_print, mock_confirm, mock_prompt, mock_aws_clients):
        """Test basic config collection"""
        # Mock prompts
        mock_prompt.side_effect = [
            "us-east-2",  # region
            "subnet-12345678",  # subnet
            "my-key",  # ssh key
            "1.2.3.4",  # IP
            "",  # domain (empty)
            "",  # snapshot (empty)
        ]
        mock_confirm.side_effect = [
            True,  # use detected IP
            True,  # enable infrastructure
        ]
        
        config = collect_config_interactive(mock_aws_clients)
        
        assert config["aws_region"] == "us-east-2"
        assert config["subnet_id"] == "subnet-12345678"
        assert config["ssh_key_name"] == "my-key"
        assert config["my_ip_cidr"] == "1.2.3.4/32"
        assert config.get("domain_name") is None
        assert config["enable_infrastructure"] is True
    
    @patch('rich.prompt.Prompt.ask')
    @patch('rich.prompt.Confirm.ask')
    @patch('rich.console.Console.print')
    @patch('sys.exit')
    def test_collect_config_interactive_invalid_subnet(self, mock_exit, mock_print, mock_confirm, mock_prompt, mock_aws_clients):
        """Test config collection with invalid subnet"""
        # Mock subnet validation failure
        mock_aws_clients.get_vpc_id_from_subnet.return_value = None
        
        mock_prompt.side_effect = [
            "us-east-2",  # region
            "subnet-invalid",  # subnet (invalid)
        ]
        
        collect_config_interactive(mock_aws_clients)
        
        # Should exit on invalid subnet
        mock_exit.assert_called_once()
    
    @patch('rich.prompt.Prompt.ask')
    @patch('rich.prompt.Confirm.ask')
    @patch('rich.console.Console.print')
    def test_collect_config_interactive_with_domain(self, mock_print, mock_confirm, mock_prompt, mock_aws_clients):
        """Test config collection with domain"""
        mock_prompt.side_effect = [
            "us-east-2",
            "subnet-12345678",
            "my-key",
            "1.2.3.4",
            "example.com",  # domain
            "",  # snapshot
        ]
        mock_confirm.side_effect = [
            True,  # use detected IP
            True,  # enable infrastructure
            False,  # enable ALB
        ]
        
        config = collect_config_interactive(mock_aws_clients)
        
        assert config.get("domain_name") == "example.com"
        assert config.get("enable_alb") is False


class TestImportExistingResources:
    """Test importing existing resources"""
    
    @patch('cvat.setup.terraform_init')
    @patch('cvat.setup.is_terraform_initialized')
    @patch('cvat.setup.terraform_state_show')
    @patch('cvat.setup.terraform_import')
    @patch('cvat.setup.get_config_value')
    @patch('rich.console.Console.print')
    @patch('rich.prompt.Confirm.ask')
    def test_import_existing_resources_security_group(self, mock_confirm, mock_print, mock_get_config, 
                                                      mock_import, mock_state_show, mock_init, mock_is_init, 
                                                      project_root, terraform_dir, configs_dir, mock_aws_clients):
        """Test importing existing security group"""
        mock_is_init.return_value = True
        mock_state_show.return_value = False
        mock_import.return_value = True
        mock_get_config.return_value = "true"
        
        # Mock security group exists
        mock_aws_clients.get_security_group_id.return_value = "sg-12345678"
        
        import_existing_resources(
            project_root,
            terraform_dir,
            configs_dir,
            mock_aws_clients,
            "vpc-12345678",
            "us-east-2"
        )
        
        # Should attempt to import
        assert mock_import.called
    
    @patch('cvat.setup.is_terraform_initialized')
    @patch('rich.console.Console.print')
    @patch('rich.prompt.Confirm.ask')
    @patch('sys.exit')
    def test_import_existing_resources_not_initialized(self, mock_exit, mock_confirm, mock_print, 
                                                        mock_is_init, project_root, terraform_dir, 
                                                        configs_dir, mock_aws_clients):
        """Test import when terraform not initialized"""
        mock_is_init.return_value = False
        mock_confirm.return_value = False  # Don't init
        
        import_existing_resources(
            project_root,
            terraform_dir,
            configs_dir,
            mock_aws_clients,
            "vpc-12345678",
            "us-east-2"
        )
        
        # Should exit
        mock_exit.assert_called_once()
    
    @patch('cvat.setup.is_terraform_initialized')
    @patch('rich.console.Console.print')
    def test_import_existing_resources_no_vpc(self, mock_print, mock_is_init, project_root, 
                                               terraform_dir, configs_dir, mock_aws_clients):
        """Test import when VPC ID is None"""
        mock_is_init.return_value = True
        
        import_existing_resources(
            project_root,
            terraform_dir,
            configs_dir,
            mock_aws_clients,
            None,
            "us-east-2"
        )
        
        # Should skip import
        assert True  # No exception raised

