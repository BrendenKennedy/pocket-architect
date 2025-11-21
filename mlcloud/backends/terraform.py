"""Terraform backend wrapper with plan parsing and security checker integration."""

import subprocess
import json
import shutil
from pathlib import Path
from typing import Optional, Dict, Any, List
from rich.console import Console

console = Console()


class TerraformBackend:
    """Thin wrapper around Terraform with plan parsing and security checks."""

    def __init__(self, working_dir: Path):
        """Initialize Terraform backend.
        
        Args:
            working_dir: Directory containing Terraform files
        """
        self.working_dir = working_dir
        self._ensure_terraform_available()

    def _ensure_terraform_available(self) -> None:
        """Check if Terraform is available.
        
        Raises:
            RuntimeError: If Terraform is not available
        """
        if not shutil.which("terraform"):
            raise RuntimeError(
                "Terraform is not available. Please install Terraform: https://www.terraform.io/downloads"
            )

    def init(self, upgrade: bool = False) -> subprocess.CompletedProcess:
        """Run terraform init.
        
        Args:
            upgrade: Upgrade modules and providers
            
        Returns:
            Completed process
        """
        cmd = ["terraform", "init"]
        if upgrade:
            cmd.append("-upgrade")
        
        return subprocess.run(
            cmd,
            cwd=self.working_dir,
            check=False,
            capture_output=True,
            text=True,
        )

    def plan(
        self,
        state_file: Optional[Path] = None,
        var_file: Optional[Path] = None,
        **vars: str,
    ) -> Dict[str, Any]:
        """Run terraform plan and parse output.
        
        Args:
            state_file: Path to state file
            var_file: Path to variables file
            **vars: Additional variables as key=value
            
        Returns:
            Parsed plan output
        """
        cmd = ["terraform", "plan", "-out=tfplan", "-no-color"]
        
        if state_file:
            cmd.extend(["-state", str(state_file)])
        
        if var_file:
            cmd.extend(["-var-file", str(var_file)])
        
        for key, value in vars.items():
            cmd.extend(["-var", f"{key}={value}"])
        
        result = subprocess.run(
            cmd,
            cwd=self.working_dir,
            check=False,
            capture_output=True,
            text=True,
        )
        
        if result.returncode != 0:
            return {
                "success": False,
                "error": result.stderr,
                "stdout": result.stdout,
            }
        
        # Parse plan output
        plan_output = self._parse_plan_output(result.stdout)
        
        # Also get JSON plan
        json_plan = self._get_json_plan(state_file)
        
        return {
            "success": True,
            "plan_file": self.working_dir / "tfplan",
            "plan_output": plan_output,
            "json_plan": json_plan,
            "stdout": result.stdout,
        }

    def _parse_plan_output(self, output: str) -> Dict[str, Any]:
        """Parse terraform plan text output.
        
        Args:
            output: Plan output text
            
        Returns:
            Parsed plan data
        """
        # Simple parsing of plan output
        # Count resources to be created/changed/destroyed
        lines = output.split("\n")
        
        plan_data = {
            "add": 0,
            "change": 0,
            "destroy": 0,
        }
        
        for line in lines:
            if "will be created" in line.lower():
                plan_data["add"] += 1
            elif "will be changed" in line.lower() or "must be replaced" in line.lower():
                plan_data["change"] += 1
            elif "will be destroyed" in line.lower():
                plan_data["destroy"] += 1
        
        return plan_data

    def _get_json_plan(
        self,
        state_file: Optional[Path] = None,
    ) -> Optional[Dict[str, Any]]:
        """Get JSON plan output.
        
        Args:
            state_file: Path to state file
            
        Returns:
            JSON plan data or None if unavailable
        """
        plan_file = self.working_dir / "tfplan"
        if not plan_file.exists():
            return None
        
        cmd = ["terraform", "show", "-json", str(plan_file)]
        if state_file:
            cmd.extend(["-state", str(state_file)])
        
        result = subprocess.run(
            cmd,
            cwd=self.working_dir,
            check=False,
            capture_output=True,
            text=True,
        )
        
        if result.returncode != 0:
            return None
        
        try:
            return json.loads(result.stdout)
        except json.JSONDecodeError:
            return None

    def apply(
        self,
        state_file: Optional[Path] = None,
        plan_file: Optional[Path] = None,
        auto_approve: bool = False,
    ) -> subprocess.CompletedProcess:
        """Run terraform apply.
        
        Args:
            state_file: Path to state file
            plan_file: Path to plan file (default: tfplan)
            auto_approve: Skip confirmation
            
        Returns:
            Completed process
        """
        cmd = ["terraform", "apply", "-no-color"]
        
        if state_file:
            cmd.extend(["-state", str(state_file)])
        
        if plan_file:
            cmd.append(str(plan_file))
        else:
            plan_file = self.working_dir / "tfplan"
            if plan_file.exists():
                cmd.append(str(plan_file))
            else:
                if auto_approve:
                    cmd.append("-auto-approve")
        
        return subprocess.run(
            cmd,
            cwd=self.working_dir,
            check=False,
            capture_output=True,
            text=True,
        )

    def destroy(
        self,
        state_file: Optional[Path] = None,
        var_file: Optional[Path] = None,
        auto_approve: bool = False,
        **vars: str,
    ) -> subprocess.CompletedProcess:
        """Run terraform destroy.
        
        Args:
            state_file: Path to state file
            var_file: Path to variables file
            auto_approve: Skip confirmation
            **vars: Additional variables
            
        Returns:
            Completed process
        """
        cmd = ["terraform", "destroy", "-no-color"]
        
        if state_file:
            cmd.extend(["-state", str(state_file)])
        
        if var_file:
            cmd.extend(["-var-file", str(var_file)])
        
        for key, value in vars.items():
            cmd.extend(["-var", f"{key}={value}"])
        
        if auto_approve:
            cmd.append("-auto-approve")
        
        return subprocess.run(
            cmd,
            cwd=self.working_dir,
            check=False,
            capture_output=True,
            text=True,
        )

    def output(
        self,
        state_file: Optional[Path] = None,
        json: bool = True,
    ) -> Optional[Dict[str, Any]]:
        """Get Terraform outputs.
        
        Args:
            state_file: Path to state file
            json: Return JSON output
            
        Returns:
            Output dictionary or None if unavailable
        """
        cmd = ["terraform", "output"]
        if json:
            cmd.append("-json")
        
        if state_file:
            cmd.extend(["-state", str(state_file)])
        
        result = subprocess.run(
            cmd,
            cwd=self.working_dir,
            check=False,
            capture_output=True,
            text=True,
        )
        
        if result.returncode != 0:
            return None
        
        if json:
            try:
                return json.loads(result.stdout)
            except json.JSONDecodeError:
                return None
        else:
            # Parse text output
            outputs = {}
            for line in result.stdout.strip().split("\n"):
                if "=" in line:
                    key, value = line.split("=", 1)
                    outputs[key.strip()] = value.strip().strip('"')
            return outputs

    def validate(self) -> bool:
        """Validate Terraform configuration.
        
        Returns:
            True if valid, False otherwise
        """
        result = subprocess.run(
            ["terraform", "validate"],
            cwd=self.working_dir,
            check=False,
            capture_output=True,
            text=True,
        )
        
        return result.returncode == 0


def run_security_checks(terraform_dir: Path) -> Dict[str, Any]:
    """Run security checks (checkov and tfsec) on Terraform code.
    
    Args:
        terraform_dir: Directory containing Terraform files
        
    Returns:
        Dictionary with security check results
    """
    results = {
        "checkov": None,
        "tfsec": None,
        "passed": True,
    }
    
    # Check checkov
    if shutil.which("checkov"):
        result = subprocess.run(
            ["checkov", "-d", str(terraform_dir), "-o", "json", "--compact"],
            check=False,
            capture_output=True,
            text=True,
        )
        
        if result.returncode == 0:
            try:
                checkov_data = json.loads(result.stdout)
                results["checkov"] = checkov_data
                # Check if there are any failures
                summary = checkov_data.get("summary", {})
                if summary.get("failed", 0) > 0:
                    results["passed"] = False
            except json.JSONDecodeError:
                results["checkov"] = {"error": "Failed to parse checkov output"}
    else:
        console.print("[yellow]⚠[/yellow] checkov not found. Install it for security checks: pip install checkov")
    
    # Check tfsec
    if shutil.which("tfsec"):
        result = subprocess.run(
            ["tfsec", str(terraform_dir), "--format", "json"],
            check=False,
            capture_output=True,
            text=True,
        )
        
        if result.returncode == 0 or result.returncode == 2:  # tfsec returns 2 if issues found
            try:
                tfsec_data = json.loads(result.stdout)
                results["tfsec"] = tfsec_data
                # Check if there are any issues
                results_list = tfsec_data.get("results", [])
                if results_list:
                    results["passed"] = False
            except json.JSONDecodeError:
                results["tfsec"] = {"error": "Failed to parse tfsec output"}
    else:
        console.print("[yellow]⚠[/yellow] tfsec not found. Install it for security checks: brew install tfsec")
    
    return results

