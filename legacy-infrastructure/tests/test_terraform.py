"""Tests for terraform module"""

import pytest
import sys
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock

# Add legacy scripts directory to path
scripts_dir = Path(__file__).parent.parent / "legacy-infrastructure" / "scripts"
sys.path.insert(0, str(scripts_dir))

from cvat.terraform import (
    run_terraform_command,
    is_terraform_initialized,
    terraform_init,
    terraform_plan,
    terraform_apply,
    terraform_output,
    terraform_import,
    terraform_state_show,
)


class TestRunTerraformCommand:
    """Test terraform command execution"""
    
    @patch('cvat.terraform.subprocess.run')
    def test_run_terraform_command_capture_output(self, mock_run, tmp_path):
        """Test running terraform command with captured output"""
        mock_result = Mock()
        mock_result.returncode = 0
        mock_result.stdout = "Success"
        mock_result.stderr = ""
        mock_run.return_value = mock_result
        
        exit_code, stdout, stderr = run_terraform_command(
            tmp_path,
            "init",
            capture_output=True
        )
        
        assert exit_code == 0
        assert stdout == "Success"
        assert stderr == ""
        mock_run.assert_called_once()
    
    @patch('cvat.terraform.subprocess.Popen')
    def test_run_terraform_command_streaming(self, mock_popen, tmp_path):
        """Test running terraform command with streaming output"""
        mock_process = Mock()
        mock_process.stdout = iter(["Line 1\n", "Line 2\n"])
        mock_process.wait.return_value = 0
        mock_popen.return_value = mock_process
        
        exit_code, output, stderr = run_terraform_command(
            tmp_path,
            "plan",
            capture_output=False
        )
        
        assert exit_code == 0
        assert "Line 1" in output
        assert "Line 2" in output
    
    @patch('cvat.terraform.subprocess.run')
    def test_run_terraform_command_with_state_file(self, mock_run, tmp_path):
        """Test running terraform command with state file"""
        mock_result = Mock()
        mock_result.returncode = 0
        mock_result.stdout = ""
        mock_result.stderr = ""
        mock_run.return_value = mock_result
        
        state_file = tmp_path / "terraform.tfstate"
        run_terraform_command(
            tmp_path,
            "plan",
            state_file=state_file,
            capture_output=True
        )
        
        call_args = mock_run.call_args[0][0]
        assert "-state" in call_args
        assert str(state_file) in call_args
    
    @patch('cvat.terraform.subprocess.run')
    def test_run_terraform_command_with_var_file(self, mock_run, tmp_path):
        """Test running terraform command with var file"""
        mock_result = Mock()
        mock_result.returncode = 0
        mock_result.stdout = ""
        mock_result.stderr = ""
        mock_run.return_value = mock_result
        
        var_file = tmp_path / "terraform.tfvars"
        run_terraform_command(
            tmp_path,
            "plan",
            var_file=var_file,
            capture_output=True
        )
        
        call_args = mock_run.call_args[0][0]
        assert "-var-file" in call_args
        assert str(var_file) in call_args
    
    @patch('cvat.terraform.subprocess.run')
    def test_run_terraform_command_auto_approve(self, mock_run, tmp_path):
        """Test running terraform command with auto-approve"""
        mock_result = Mock()
        mock_result.returncode = 0
        mock_result.stdout = ""
        mock_result.stderr = ""
        mock_run.return_value = mock_result
        
        run_terraform_command(
            tmp_path,
            "apply",
            auto_approve=True,
            capture_output=True
        )
        
        call_args = mock_run.call_args[0][0]
        assert "-auto-approve" in call_args


class TestIsTerraformInitialized:
    """Test terraform initialization check"""
    
    def test_is_terraform_initialized_true(self, tmp_path):
        """Test when terraform is initialized"""
        (tmp_path / ".terraform").mkdir()
        assert is_terraform_initialized(tmp_path) is True
    
    def test_is_terraform_initialized_false(self, tmp_path):
        """Test when terraform is not initialized"""
        assert is_terraform_initialized(tmp_path) is False


class TestTerraformInit:
    """Test terraform init"""
    
    @patch('cvat.terraform.run_terraform_command')
    def test_terraform_init_success(self, mock_run, tmp_path):
        """Test successful terraform init"""
        mock_run.return_value = (0, "", "")
        result = terraform_init(tmp_path)
        assert result is True
        mock_run.assert_called_once_with(
            tmp_path,
            "init",
            capture_output=True
        )
    
    @patch('cvat.terraform.run_terraform_command')
    def test_terraform_init_failure(self, mock_run, tmp_path):
        """Test failed terraform init"""
        mock_run.return_value = (1, "", "Error")
        result = terraform_init(tmp_path)
        assert result is False


class TestTerraformPlan:
    """Test terraform plan"""
    
    @patch('cvat.terraform.run_terraform_command')
    def test_terraform_plan_success(self, mock_run, tmp_path):
        """Test successful terraform plan"""
        state_file = tmp_path / "terraform.tfstate"
        var_file = tmp_path / "terraform.tfvars"
        mock_run.return_value = (0, "Plan output", "")
        
        exit_code, output = terraform_plan(tmp_path, state_file, var_file)
        
        assert exit_code == 0
        assert "Plan output" in output
        mock_run.assert_called_once()
    
    @patch('cvat.terraform.run_terraform_command')
    def test_terraform_plan_capture_output(self, mock_run, tmp_path):
        """Test terraform plan with captured output"""
        state_file = tmp_path / "terraform.tfstate"
        var_file = tmp_path / "terraform.tfvars"
        mock_run.return_value = (0, "Captured", "")
        
        exit_code, output = terraform_plan(
            tmp_path,
            state_file,
            var_file,
            capture_output=True
        )
        
        assert exit_code == 0
        assert "Captured" in output


class TestTerraformApply:
    """Test terraform apply"""
    
    @patch('cvat.terraform.run_terraform_command')
    def test_terraform_apply_success(self, mock_run, tmp_path):
        """Test successful terraform apply"""
        state_file = tmp_path / "terraform.tfstate"
        var_file = tmp_path / "terraform.tfvars"
        mock_run.return_value = (0, "Apply output", "")
        
        exit_code, output = terraform_apply(tmp_path, state_file, var_file)
        
        assert exit_code == 0
        assert "Apply output" in output
        call_kwargs = mock_run.call_args[1]
        assert call_kwargs['auto_approve'] is True


class TestTerraformOutput:
    """Test terraform output"""
    
    @patch('cvat.terraform.run_terraform_command')
    def test_terraform_output_success(self, mock_run, tmp_path):
        """Test successful terraform output retrieval"""
        state_file = tmp_path / "terraform.tfstate"
        mock_run.return_value = (0, "output-value\n", "")
        
        value = terraform_output(tmp_path, state_file, "instance_id")
        
        assert value == "output-value"
        call_args = mock_run.call_args
        assert "-raw" in call_args[1]['args']
        assert "instance_id" in call_args[1]['args']
    
    @patch('cvat.terraform.run_terraform_command')
    def test_terraform_output_not_found(self, mock_run, tmp_path):
        """Test terraform output when not found"""
        state_file = tmp_path / "terraform.tfstate"
        mock_run.return_value = (1, "", "Error")
        
        value = terraform_output(tmp_path, state_file, "nonexistent")
        
        assert value is None
    
    @patch('cvat.terraform.run_terraform_command')
    def test_terraform_output_raw_false(self, mock_run, tmp_path):
        """Test terraform output without raw flag"""
        state_file = tmp_path / "terraform.tfstate"
        mock_run.return_value = (0, '{\n  "value": "output-value"\n}', "")
        
        value = terraform_output(tmp_path, state_file, "instance_id", raw=False)
        
        assert value is not None
        call_args = mock_run.call_args
        assert "-raw" not in call_args[1]['args']


class TestTerraformImport:
    """Test terraform import"""
    
    @patch('cvat.terraform.run_terraform_command')
    def test_terraform_import_success(self, mock_run, tmp_path):
        """Test successful terraform import"""
        state_file = tmp_path / "terraform.tfstate"
        mock_run.return_value = (0, "", "")
        
        result = terraform_import(
            tmp_path,
            state_file,
            "aws_iam_role.ec2_ssm_role[0]",
            "cvat-ec2-ssm-role"
        )
        
        assert result is True
        call_args = mock_run.call_args
        assert call_args[1]['args'][0] == "aws_iam_role.ec2_ssm_role[0]"
        assert call_args[1]['args'][1] == "cvat-ec2-ssm-role"
    
    @patch('cvat.terraform.run_terraform_command')
    def test_terraform_import_failure(self, mock_run, tmp_path):
        """Test failed terraform import"""
        state_file = tmp_path / "terraform.tfstate"
        mock_run.return_value = (1, "", "Error")
        
        result = terraform_import(
            tmp_path,
            state_file,
            "aws_iam_role.ec2_ssm_role[0]",
            "nonexistent-role"
        )
        
        assert result is False


class TestTerraformStateShow:
    """Test terraform state show"""
    
    @patch('cvat.terraform.run_terraform_command')
    def test_terraform_state_show_exists(self, mock_run, tmp_path):
        """Test terraform state show when resource exists"""
        state_file = tmp_path / "terraform.tfstate"
        mock_run.return_value = (0, "Resource data", "")
        
        result = terraform_state_show(
            tmp_path,
            state_file,
            "aws_iam_role.ec2_ssm_role[0]"
        )
        
        assert result is True
    
    @patch('cvat.terraform.run_terraform_command')
    def test_terraform_state_show_not_exists(self, mock_run, tmp_path):
        """Test terraform state show when resource doesn't exist"""
        state_file = tmp_path / "terraform.tfstate"
        mock_run.return_value = (1, "", "Error")
        
        result = terraform_state_show(
            tmp_path,
            state_file,
            "aws_iam_role.nonexistent[0]"
        )
        
        assert result is False

