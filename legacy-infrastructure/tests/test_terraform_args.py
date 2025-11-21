"""Tests for terraform command with additional arguments"""

import pytest
import sys
from pathlib import Path
from unittest.mock import Mock, patch

# Add scripts directory to path
scripts_dir = Path(__file__).parent.parent / "legacy-infrastructure" / "scripts"
sys.path.insert(0, str(scripts_dir))

from cvat.terraform import run_terraform_command


class TestRunTerraformCommandWithArgs:
    """Test run_terraform_command with additional arguments"""
    
    @patch('cvat.terraform.subprocess.run')
    def test_run_terraform_command_with_additional_args(self, mock_run, tmp_path):
        """Test running terraform command with additional arguments"""
        mock_result = Mock()
        mock_result.returncode = 0
        mock_result.stdout = "Success"
        mock_result.stderr = ""
        mock_run.return_value = mock_result
        
        exit_code, stdout, stderr = run_terraform_command(
            tmp_path,
            "plan",
            args=["-out=tfplan", "-detailed-exitcode"],
            capture_output=True
        )
        
        assert exit_code == 0
        call_args = mock_run.call_args[0][0]
        assert "-out=tfplan" in call_args
        assert "-detailed-exitcode" in call_args
    
    @patch('cvat.terraform.subprocess.run')
    def test_run_terraform_command_with_multiple_args(self, mock_run, tmp_path):
        """Test running terraform command with multiple additional arguments"""
        mock_result = Mock()
        mock_result.returncode = 0
        mock_result.stdout = ""
        mock_result.stderr = ""
        mock_run.return_value = mock_result
        
        exit_code, stdout, stderr = run_terraform_command(
            tmp_path,
            "apply",
            args=["-target=aws_instance.cvat", "-refresh=false"],
            capture_output=True
        )
        
        call_args = mock_run.call_args[0][0]
        assert "-target=aws_instance.cvat" in call_args
        assert "-refresh=false" in call_args
    
    @patch('cvat.terraform.subprocess.run')
    def test_run_terraform_command_with_empty_args(self, mock_run, tmp_path):
        """Test running terraform command with empty args list"""
        mock_result = Mock()
        mock_result.returncode = 0
        mock_result.stdout = ""
        mock_result.stderr = ""
        mock_run.return_value = mock_result
        
        exit_code, stdout, stderr = run_terraform_command(
            tmp_path,
            "plan",
            args=[],
            capture_output=True
        )
        
        call_args = mock_run.call_args[0][0]
        # Should only have terraform and command
        assert len(call_args) == 2
        assert call_args[0] == "terraform"
        assert call_args[1] == "plan"
    
    @patch('cvat.terraform.subprocess.Popen')
    def test_run_terraform_command_streaming_with_args(self, mock_popen, tmp_path):
        """Test streaming terraform command with additional arguments"""
        mock_process = Mock()
        mock_process.stdout = iter(["Line 1\n", "Line 2\n"])
        mock_process.wait.return_value = 0
        mock_popen.return_value = mock_process
        
        exit_code, output, stderr = run_terraform_command(
            tmp_path,
            "plan",
            args=["-out=tfplan"],
            capture_output=False
        )
        
        assert exit_code == 0
        call_args = mock_popen.call_args[0][0]
        assert "-out=tfplan" in call_args

