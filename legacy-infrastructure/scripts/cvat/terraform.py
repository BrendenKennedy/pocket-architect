"""Terraform command execution wrapper"""

import subprocess
import sys
from pathlib import Path
from typing import Optional, List, Tuple


def run_terraform_command(
    terraform_dir: Path,
    command: str,
    args: Optional[List[str]] = None,
    state_file: Optional[Path] = None,
    var_file: Optional[Path] = None,
    auto_approve: bool = False,
    capture_output: bool = False,
) -> Tuple[int, str, str]:
    """Run a terraform command.
    
    Args:
        terraform_dir: Directory containing terraform files
        command: Terraform command (init, plan, apply, output, import, etc.)
        args: Additional arguments to pass to terraform
        state_file: Path to state file (relative to terraform_dir)
        var_file: Path to var file (relative to terraform_dir)
        auto_approve: Add -auto-approve flag for apply/destroy
        capture_output: If True, capture output instead of streaming
        
    Returns:
        Tuple of (exit_code, stdout, stderr)
    """
    cmd = ["terraform", command]
    
    if state_file:
        cmd.extend(["-state", str(state_file)])
    
    if var_file:
        cmd.extend(["-var-file", str(var_file)])
    
    if auto_approve:
        cmd.append("-auto-approve")
    
    if args:
        cmd.extend(args)
    
    if capture_output:
        result = subprocess.run(
            cmd,
            cwd=str(terraform_dir),
            capture_output=True,
            text=True,
        )
        return result.returncode, result.stdout, result.stderr
    else:
        # Stream output in real-time
        process = subprocess.Popen(
            cmd,
            cwd=str(terraform_dir),
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
        )
        
        output_lines = []
        for line in process.stdout:
            print(line, end='')
            output_lines.append(line)
        
        process.wait()
        output = ''.join(output_lines)
        return process.returncode, output, ""


def is_terraform_initialized(terraform_dir: Path) -> bool:
    """Check if terraform is initialized.
    
    Args:
        terraform_dir: Directory containing terraform files
        
    Returns:
        True if .terraform directory exists
    """
    return (terraform_dir / ".terraform").exists()


def terraform_init(terraform_dir: Path) -> bool:
    """Initialize terraform.
    
    Args:
        terraform_dir: Directory containing terraform files
        
    Returns:
        True if initialization succeeded
    """
    exit_code, _, _ = run_terraform_command(terraform_dir, "init", capture_output=True)
    return exit_code == 0


def terraform_plan(
    terraform_dir: Path,
    state_file: Path,
    var_file: Path,
    capture_output: bool = False,
) -> Tuple[int, str]:
    """Run terraform plan.
    
    Args:
        terraform_dir: Directory containing terraform files
        state_file: Path to state file
        var_file: Path to var file
        capture_output: If True, capture output instead of streaming
        
    Returns:
        Tuple of (exit_code, output)
    """
    exit_code, stdout, stderr = run_terraform_command(
        terraform_dir,
        "plan",
        state_file=state_file,
        var_file=var_file,
        capture_output=capture_output,
    )
    return exit_code, stdout + stderr


def terraform_apply(
    terraform_dir: Path,
    state_file: Path,
    var_file: Path,
    capture_output: bool = False,
) -> Tuple[int, str]:
    """Run terraform apply.
    
    Args:
        terraform_dir: Directory containing terraform files
        state_file: Path to state file
        var_file: Path to var file
        capture_output: If True, capture output instead of streaming
        
    Returns:
        Tuple of (exit_code, output)
    """
    exit_code, stdout, stderr = run_terraform_command(
        terraform_dir,
        "apply",
        state_file=state_file,
        var_file=var_file,
        auto_approve=True,
        capture_output=capture_output,
    )
    return exit_code, stdout + stderr


def terraform_output(
    terraform_dir: Path,
    state_file: Path,
    output_name: str,
    raw: bool = True,
) -> Optional[str]:
    """Get terraform output value.
    
    Args:
        terraform_dir: Directory containing terraform files
        state_file: Path to state file
        output_name: Name of output to retrieve
        raw: Use -raw flag
        
    Returns:
        Output value or None if not found
    """
    args = ["-raw"] if raw else []
    args.append(output_name)
    
    exit_code, stdout, stderr = run_terraform_command(
        terraform_dir,
        "output",
        args=args,
        state_file=state_file,
        capture_output=True,
    )
    
    if exit_code == 0:
        return stdout.strip()
    return None


def terraform_import(
    terraform_dir: Path,
    state_file: Path,
    resource_address: str,
    resource_id: str,
) -> bool:
    """Import a resource into terraform state.
    
    Args:
        terraform_dir: Directory containing terraform files
        state_file: Path to state file
        resource_address: Terraform resource address (e.g., "aws_iam_role.ec2_ssm_role[0]")
        resource_id: AWS resource ID to import
        
    Returns:
        True if import succeeded
    """
    exit_code, _, _ = run_terraform_command(
        terraform_dir,
        "import",
        args=[resource_address, resource_id],
        state_file=state_file,
        capture_output=True,
    )
    return exit_code == 0


def terraform_state_show(
    terraform_dir: Path,
    state_file: Path,
    resource_address: str,
) -> bool:
    """Check if resource exists in terraform state.
    
    Args:
        terraform_dir: Directory containing terraform files
        state_file: Path to state file
        resource_address: Terraform resource address
        
    Returns:
        True if resource exists in state
    """
    exit_code, _, _ = run_terraform_command(
        terraform_dir,
        "state",
        args=["show", resource_address],
        state_file=state_file,
        capture_output=True,
    )
    return exit_code == 0

