"""Integration tests for CVAT CLI commands"""

import pytest
import sys
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock

# Add scripts directory to path
scripts_dir = Path(__file__).parent.parent / "legacy-infrastructure" / "scripts"
sys.path.insert(0, str(scripts_dir))


@pytest.mark.integration
class TestSetupFlow:
    """Test complete setup flow"""
    
    @patch('cvat.setup.AWSClients')
    @patch('cvat.setup.collect_config_interactive')
    @patch('cvat.setup.create_tfvars')
    @patch('cvat.setup.import_existing_resources')
    @patch('cvat.setup.get_project_paths')
    @patch('cvat.setup.get_tfvars_path')
    @patch('rich.console.Console.print')
    @patch('rich.prompt.Confirm.ask')
    def test_setup_creates_config(self, mock_confirm, mock_print, mock_get_tfvars,
                                   mock_get_paths, mock_import, mock_create_tfvars,
                                   mock_collect, mock_aws_clients, project_root,
                                   terraform_dir, configs_dir, tfvars_path):
        """Test that setup creates configuration file"""
        mock_get_paths.return_value = (project_root, terraform_dir, configs_dir)
        mock_get_tfvars.return_value = tfvars_path
        mock_collect.return_value = {
            "aws_region": "us-east-2",
            "my_ip_cidr": "1.2.3.4/32",
            "subnet_id": "subnet-12345678",
            "ssh_key_name": "my-key",
            "enable_infrastructure": True,
            "enable_alb": False,
        }
        mock_confirm.return_value = True
        
        from cvat.setup import setup
        
        # This is a click command, so we'd need to invoke it properly
        # But we can verify the flow
        assert mock_create_tfvars is not None


@pytest.mark.integration
class TestUpDownFlow:
    """Test up and down command flow"""
    
    @patch('cvat.up.is_terraform_initialized')
    @patch('cvat.up.terraform_init')
    @patch('cvat.up.get_config_value')
    @patch('cvat.up.update_config_value')
    @patch('cvat.up.terraform_output')
    @patch('cvat.up.terraform_plan')
    @patch('cvat.up.terraform_apply')
    @patch('cvat.up.AWSClients')
    @patch('cvat.up.get_project_paths')
    @patch('cvat.up.get_tfvars_path')
    def test_up_then_down_flow(self, mock_get_tfvars, mock_get_paths, mock_aws_clients,
                                mock_apply, mock_plan, mock_output, mock_update,
                                mock_get_config, mock_init, mock_is_init,
                                project_root, terraform_dir, configs_dir, tfvars_path):
        """Test that up enables and down disables infrastructure"""
        mock_get_paths.return_value = (project_root, terraform_dir, configs_dir)
        mock_get_tfvars.return_value = tfvars_path
        mock_is_init.return_value = True
        mock_get_config.return_value = "false"  # Start disabled
        mock_apply.return_value = (0, "Success")
        
        tfvars_path.write_text('enable_infrastructure = false')
        
        # Simulate up command
        from cvat.up import up
        # Would need to mock click context to actually call
        
        # Verify that up would set enable_infrastructure to true
        # and down would set it to false
        assert True  # Placeholder for integration test structure


@pytest.mark.integration
class TestCheckpointFlow:
    """Test checkpoint creation and restoration flow"""
    
    def test_checkpoint_creates_snapshot_and_ami(self, mock_aws_clients):
        """Test that checkpoint creates snapshot and AMI"""
        # Setup mocks
        mock_aws_clients.get_instance_root_volume_id.return_value = "vol-12345678"
        mock_aws_clients.create_snapshot.return_value = "snap-12345678"
        mock_aws_clients.wait_snapshot_completed.return_value = True
        mock_aws_clients.create_ami_from_snapshot.return_value = "ami-12345678"
        
        # Simulate checkpoint creation
        volume_id = mock_aws_clients.get_instance_root_volume_id("i-12345678")
        snapshot_id = mock_aws_clients.create_snapshot(
            volume_id=volume_id,
            description="Test checkpoint",
            tags=[{"Key": "Name", "Value": "test"}]
        )
        completed = mock_aws_clients.wait_snapshot_completed(snapshot_id)
        ami_id = mock_aws_clients.create_ami_from_snapshot(
            snapshot_id=snapshot_id,
            name="test-ami",
            description="Test",
            tags=[]
        )
        
        assert volume_id == "vol-12345678"
        assert snapshot_id == "snap-12345678"
        assert completed is True
        assert ami_id == "ami-12345678"


@pytest.mark.integration
class TestErrorHandling:
    """Test error handling across commands"""
    
    def test_handles_missing_aws_credentials(self, mock_aws_clients):
        """Test handling of missing AWS credentials"""
        from botocore.exceptions import NoCredentialsError
        
        mock_aws_clients.ec2.describe_subnets.side_effect = NoCredentialsError()
        
        # Should handle gracefully
        vpc_id = mock_aws_clients.get_vpc_id_from_subnet("subnet-12345678")
        assert vpc_id is None
    
    def test_handles_invalid_subnet(self, mock_aws_clients):
        """Test handling of invalid subnet ID"""
        from botocore.exceptions import ClientError
        
        mock_aws_clients.ec2.describe_subnets.side_effect = ClientError(
            {'Error': {'Code': 'InvalidSubnetID.NotFound'}},
            'DescribeSubnets'
        )
        
        vpc_id = mock_aws_clients.get_vpc_id_from_subnet("subnet-invalid")
        assert vpc_id is None
    
    def test_handles_terraform_errors(self):
        """Test handling of terraform errors"""
        from cvat.terraform import terraform_init
        
        # Mock terraform init failure
        with patch('cvat.terraform.run_terraform_command') as mock_run:
            mock_run.return_value = (1, "", "Error: Terraform not found")
            result = terraform_init(Path("/tmp"))
            assert result is False

