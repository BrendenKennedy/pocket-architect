"""Tests for down command"""

import pytest
import sys
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock

# Add scripts directory to path
scripts_dir = Path(__file__).parent.parent / "legacy-infrastructure" / "scripts"
sys.path.insert(0, str(scripts_dir))

from cvat.down import down


class TestDownCommand:
    """Test down command functionality"""
    
    @patch('cvat.down.is_terraform_initialized')
    @patch('cvat.down.terraform_init')
    @patch('cvat.down.get_config_value')
    @patch('cvat.down.update_config_value')
    @patch('cvat.down.terraform_output')
    @patch('cvat.down.terraform_plan')
    @patch('cvat.down.terraform_apply')
    @patch('cvat.down.get_project_paths')
    @patch('cvat.down.get_tfvars_path')
    @patch('rich.console.Console.print')
    @patch('rich.prompt.Confirm.ask')
    @patch('sys.exit')
    def test_down_command_success(self, mock_exit, mock_confirm, mock_print, 
                                   mock_get_tfvars, mock_get_paths, mock_apply,
                                   mock_plan, mock_output, mock_update, mock_get_config,
                                   mock_init, mock_is_init, project_root, terraform_dir, 
                                   configs_dir, tfvars_path):
        """Test successful down command execution"""
        # Setup mocks
        mock_get_paths.return_value = (project_root, terraform_dir, configs_dir)
        mock_get_tfvars.return_value = tfvars_path
        mock_is_init.return_value = True
        mock_get_config.return_value = "true"
        mock_output.side_effect = ["i-12345678", "1.2.3.4"]
        mock_confirm.return_value = True
        mock_apply.return_value = (0, "Success")
        
        # Create tfvars file
        tfvars_path.write_text('enable_infrastructure = true')
        
        # Execute command (will exit, so we catch it)
        try:
            down()
        except SystemExit:
            pass
        
        # Verify calls
        mock_update.assert_called_once_with(tfvars_path, "enable_infrastructure", "false")
        mock_apply.assert_called_once()
    
    @patch('cvat.down.is_terraform_initialized')
    @patch('cvat.down.terraform_init')
    @patch('cvat.down.get_project_paths')
    @patch('cvat.down.get_tfvars_path')
    @patch('rich.console.Console.print')
    @patch('rich.prompt.Confirm.ask')
    @patch('sys.exit')
    def test_down_command_not_initialized(self, mock_exit, mock_confirm, mock_print,
                                          mock_get_tfvars, mock_get_paths, mock_init,
                                          mock_is_init, project_root, terraform_dir,
                                          configs_dir, tfvars_path):
        """Test down command when terraform not initialized"""
        mock_get_paths.return_value = (project_root, terraform_dir, configs_dir)
        mock_get_tfvars.return_value = tfvars_path
        mock_is_init.return_value = False
        mock_confirm.return_value = False  # Don't init
        
        try:
            down()
        except SystemExit as e:
            assert e.code == 1
    
    @patch('cvat.down.is_terraform_initialized')
    @patch('cvat.down.get_project_paths')
    @patch('cvat.down.get_tfvars_path')
    @patch('rich.console.Console.print')
    @patch('sys.exit')
    def test_down_command_no_tfvars(self, mock_exit, mock_print, mock_get_tfvars,
                                     mock_get_paths, mock_is_init, project_root,
                                     terraform_dir, configs_dir):
        """Test down command when tfvars file doesn't exist"""
        mock_get_paths.return_value = (project_root, terraform_dir, configs_dir)
        tfvars_path = configs_dir / "terraform.tfvars"
        mock_get_tfvars.return_value = tfvars_path
        mock_is_init.return_value = True
        
        try:
            down()
        except SystemExit as e:
            assert e.code == 1
    
    @patch('cvat.down.is_terraform_initialized')
    @patch('cvat.down.terraform_init')
    @patch('cvat.down.get_config_value')
    @patch('cvat.down.update_config_value')
    @patch('cvat.down.terraform_output')
    @patch('cvat.down.terraform_plan')
    @patch('cvat.down.terraform_apply')
    @patch('cvat.down.get_project_paths')
    @patch('cvat.down.get_tfvars_path')
    @patch('rich.console.Console.print')
    @patch('rich.prompt.Confirm.ask')
    @patch('sys.exit')
    def test_down_command_already_disabled(self, mock_exit, mock_confirm, mock_print,
                                           mock_get_tfvars, mock_get_paths, mock_apply,
                                           mock_plan, mock_output, mock_update, mock_get_config,
                                           mock_init, mock_is_init, project_root, terraform_dir,
                                           configs_dir, tfvars_path):
        """Test down command when infrastructure already disabled"""
        mock_get_paths.return_value = (project_root, terraform_dir, configs_dir)
        mock_get_tfvars.return_value = tfvars_path
        mock_is_init.return_value = True
        mock_get_config.return_value = "false"  # Already disabled
        mock_output.side_effect = ["i-12345678", "1.2.3.4"]
        mock_confirm.return_value = True
        mock_apply.return_value = (0, "Success")
        
        tfvars_path.write_text('enable_infrastructure = false')
        
        try:
            down()
        except SystemExit:
            pass
        
        # Should still update and apply
        mock_update.assert_called_once()
        mock_apply.assert_called_once()
    
    @patch('cvat.down.is_terraform_initialized')
    @patch('cvat.down.terraform_init')
    @patch('cvat.down.get_config_value')
    @patch('cvat.down.update_config_value')
    @patch('cvat.down.terraform_output')
    @patch('cvat.down.terraform_plan')
    @patch('cvat.down.terraform_apply')
    @patch('cvat.down.get_project_paths')
    @patch('cvat.down.get_tfvars_path')
    @patch('rich.console.Console.print')
    @patch('rich.prompt.Confirm.ask')
    @patch('sys.exit')
    def test_down_command_skip_plan(self, mock_exit, mock_confirm, mock_print,
                                     mock_get_tfvars, mock_get_paths, mock_apply,
                                     mock_plan, mock_output, mock_update, mock_get_config,
                                     mock_init, mock_is_init, project_root, terraform_dir,
                                     configs_dir, tfvars_path):
        """Test down command skipping plan"""
        mock_get_paths.return_value = (project_root, terraform_dir, configs_dir)
        mock_get_tfvars.return_value = tfvars_path
        mock_is_init.return_value = True
        mock_get_config.return_value = "true"
        mock_output.side_effect = ["i-12345678", "1.2.3.4"]
        # First confirm: skip plan, second: continue with apply
        mock_confirm.side_effect = [False, True]
        mock_apply.return_value = (0, "Success")
        
        tfvars_path.write_text('enable_infrastructure = true')
        
        try:
            down()
        except SystemExit:
            pass
        
        # Plan should not be called
        mock_plan.assert_not_called()
        mock_apply.assert_called_once()
    
    @patch('cvat.down.is_terraform_initialized')
    @patch('cvat.down.terraform_init')
    @patch('cvat.down.get_config_value')
    @patch('cvat.down.update_config_value')
    @patch('cvat.down.terraform_output')
    @patch('cvat.down.terraform_plan')
    @patch('cvat.down.terraform_apply')
    @patch('cvat.down.get_project_paths')
    @patch('cvat.down.get_tfvars_path')
    @patch('rich.console.Console.print')
    @patch('rich.prompt.Confirm.ask')
    @patch('sys.exit')
    def test_down_command_apply_failure(self, mock_exit, mock_confirm, mock_print,
                                        mock_get_tfvars, mock_get_paths, mock_apply,
                                        mock_plan, mock_output, mock_update, mock_get_config,
                                        mock_init, mock_is_init, project_root, terraform_dir,
                                        configs_dir, tfvars_path):
        """Test down command when apply fails"""
        mock_get_paths.return_value = (project_root, terraform_dir, configs_dir)
        mock_get_tfvars.return_value = tfvars_path
        mock_is_init.return_value = True
        mock_get_config.return_value = "true"
        mock_output.side_effect = ["i-12345678", "1.2.3.4"]
        mock_confirm.return_value = True
        mock_apply.return_value = (1, "Error: Apply failed")
        
        tfvars_path.write_text('enable_infrastructure = true')
        
        try:
            down()
        except SystemExit as e:
            assert e.code == 1

