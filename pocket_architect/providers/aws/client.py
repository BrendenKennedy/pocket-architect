"""AWS provider implementation using EC2 Spot + EFS."""

import boto3
from typing import Optional, Dict, Any
from pathlib import Path
from rich.console import Console

from pocket_architect.providers.base import BaseProvider
from pocket_architect.core.types import Provider, CostEstimate
from pocket_architect.backends.terraform import TerraformBackend, run_security_checks
from pocket_architect.providers.aws.blueprints import AWSBlueprint
from pocket_architect.utils.sso import check_first_run, authenticate_provider
from pocket_architect.security.sandbox import CredentialValidator
from pocket_architect.utils.cost_estimator import CostEstimator
from pocket_architect.config.settings import settings
from pocket_architect.utils.keyring import CredentialStore

console = Console()


class AWSProvider(BaseProvider):
    """AWS provider using EC2 Spot instances and EFS."""

    def __init__(self, session_id: str):
        """Initialize AWS provider.
        
        Args:
            session_id: Session identifier
        """
        super().__init__(session_id)
        self.blueprint = AWSBlueprint(session_id)
        self._ensure_authenticated()

    def _ensure_authenticated(self) -> None:
        """Ensure AWS credentials are configured."""
        if check_first_run(Provider.AWS):
            console.print("[yellow]First run detected. Authenticating with AWS...[/yellow]")
            auth_data = authenticate_provider(Provider.AWS)
            
            # Validate credentials if access keys provided
            if "access_key_id" in auth_data and "secret_access_key" in auth_data:
                validator = CredentialValidator()
                validator.validate_aws_credentials(
                    auth_data["access_key_id"],
                    auth_data["secret_access_key"],
                )
        
        # Configure boto3 session
        profile = settings.aws_profile
        if profile:
            self.session = boto3.Session(profile_name=profile)
        else:
            self.session = boto3.Session()
        
        self.region = settings.aws_region
        self.ec2 = self.session.client("ec2", region_name=self.region)
        self.efs = self.session.client("efs", region_name=self.region)

    @property
    def provider(self) -> Provider:
        """Get provider type."""
        return Provider.AWS

    def provision_cvat(
        self,
        https: bool = True,
        **kwargs: Any,
    ) -> Dict[str, Any]:
        """Provision CVAT instance on AWS.
        
        Args:
            https: Enable HTTPS with ALB
            **kwargs: Provider-specific options
                - subnet_id: Subnet ID (required)
                - ssh_key_name: SSH key pair name (required)
                - my_ip_cidr: IP in CIDR notation (required)
                - domain_name: Domain name for HTTPS (required if https=True)
                - instance_type: EC2 instance type (default: t3.xlarge)
                - use_spot: Use Spot instances (default: True)
        
        Returns:
            Dictionary with provisioned resource information
        """
        # Required parameters
        subnet_id = kwargs.get("subnet_id")
        ssh_key_name = kwargs.get("ssh_key_name")
        my_ip_cidr = kwargs.get("my_ip_cidr")
        domain_name = kwargs.get("domain_name", "")
        
        if not subnet_id or not ssh_key_name or not my_ip_cidr:
            raise ValueError("subnet_id, ssh_key_name, and my_ip_cidr are required")
        
        if https and not domain_name:
            raise ValueError("domain_name is required when https=True")
        
        console.print("[bold cyan]Provisioning CVAT on AWS...[/bold cyan]")
        
        # Prepare Terraform module
        module_dir = self.blueprint.prepare_cvat_module(
            aws_region=self.region,
            subnet_id=subnet_id,
            ssh_key_name=ssh_key_name,
            my_ip_cidr=my_ip_cidr,
            enable_https=https,
            domain_name=domain_name,
            **kwargs,
        )
        
        # Initialize Terraform
        tf = TerraformBackend(module_dir)
        
        console.print("[yellow]Initializing Terraform...[/yellow]")
        init_result = tf.init()
        if init_result.returncode != 0:
            raise RuntimeError(f"Terraform init failed: {init_result.stderr}")
        
        # Run security checks
        console.print("[yellow]Running security checks...[/yellow]")
        security_results = run_security_checks(module_dir)
        if not security_results["passed"]:
            console.print("[red]⚠ Security checks failed! Review issues before proceeding.[/red]")
            # Don't block, but warn user
        
        # Plan
        console.print("[yellow]Planning Terraform deployment...[/yellow]")
        state_file = module_dir / "terraform.tfstate"
        plan_result = tf.plan(state_file=state_file, var_file=module_dir / "terraform.tfvars")
        
        if not plan_result["success"]:
            raise RuntimeError(f"Terraform plan failed: {plan_result.get('error', 'Unknown error')}")
        
        # Show cost estimate
        cost_estimate = self.cost_estimate("cvat", **kwargs)
        console.print(f"[green]Estimated cost:[/green] ${cost_estimate.hourly_rate_usd:.4f}/hour (${cost_estimate.monthly_projection_usd:.2f}/month)")
        
        # Apply
        console.print("[yellow]Applying Terraform configuration...[/yellow]")
        apply_result = tf.apply(state_file=state_file, auto_approve=True)
        
        if apply_result.returncode != 0:
            raise RuntimeError(f"Terraform apply failed: {apply_result.stderr}")
        
        # Get outputs
        outputs = tf.output(state_file=state_file, json=True)
        
        # Generate and store CVAT password
        password = CredentialStore.generate_cvat_password()
        CredentialStore.store_cvat_password(self.session_id, password)
        
        return {
            "status": "running",
            "instance_id": outputs.get("instance_id", {}).get("value", ""),
            "public_ip": outputs.get("public_ip", {}).get("value", ""),
            "cvat_url": outputs.get("cvat_url", {}).get("value", ""),
            "efs_id": outputs.get("efs_id", {}).get("value", ""),
            "password_stored": True,
        }

    def provision_worker(
        self,
        instance_type: Optional[str] = None,
        **kwargs: Any,
    ) -> Dict[str, Any]:
        """Provision worker node for auto-annotation.
        
        Args:
            instance_type: EC2 instance type (default: g4dn.xlarge)
            **kwargs: Provider-specific options
            
        Returns:
            Dictionary with provisioned resource information
        """
        # Required parameters
        subnet_id = kwargs.get("subnet_id")
        ssh_key_name = kwargs.get("ssh_key_name")
        my_ip_cidr = kwargs.get("my_ip_cidr")
        efs_id = kwargs.get("efs_id", "")
        
        if not subnet_id or not ssh_key_name or not my_ip_cidr:
            raise ValueError("subnet_id, ssh_key_name, and my_ip_cidr are required")
        
        if instance_type is None:
            instance_type = "g4dn.xlarge"
        
        console.print("[bold cyan]Provisioning auto-annotation worker on AWS...[/bold cyan]")
        
        # Prepare Terraform module
        module_dir = self.blueprint.prepare_auto_annotate_module(
            aws_region=self.region,
            subnet_id=subnet_id,
            ssh_key_name=ssh_key_name,
            my_ip_cidr=my_ip_cidr,
            efs_id=efs_id,
            instance_type=instance_type,
            **kwargs,
        )
        
        # Initialize and apply
        tf = TerraformBackend(module_dir)
        tf.init()
        
        state_file = module_dir / "terraform.tfstate"
        plan_result = tf.plan(state_file=state_file, var_file=module_dir / "terraform.tfvars")
        
        if not plan_result["success"]:
            raise RuntimeError(f"Terraform plan failed: {plan_result.get('error')}")
        
        # Show cost estimate
        cost_estimate = self.cost_estimate("worker", instance_type=instance_type, **kwargs)
        console.print(f"[green]Estimated cost:[/green] ${cost_estimate.hourly_rate_usd:.4f}/hour")
        
        apply_result = tf.apply(state_file=state_file, auto_approve=True)
        
        if apply_result.returncode != 0:
            raise RuntimeError(f"Terraform apply failed: {apply_result.stderr}")
        
        outputs = tf.output(state_file=state_file, json=True)
        
        return {
            "status": "running",
            "instance_id": outputs.get("instance_id", {}).get("value", ""),
            "public_ip": outputs.get("public_ip", {}).get("value", ""),
        }

    def sync(
        self,
        local_path: Path,
        remote_path: Optional[str] = None,
        direction: str = "both",
    ) -> None:
        """Sync files with CVAT instance using EFS or direct copy.
        
        Args:
            local_path: Local directory path
            remote_path: Remote path on CVAT instance (default: /home/ubuntu/data)
            direction: Sync direction: "up", "down", or "both"
        """
        # Get CVAT instance info from Terraform state
        module_dir = self.blueprint.terraform_dir / "cvat"
        state_file = module_dir / "terraform.tfstate"
        
        if not state_file.exists():
            raise RuntimeError("CVAT instance not provisioned. Run 'pocket-architect cvat up' first.")
        
        tf = TerraformBackend(module_dir)
        outputs = tf.output(state_file=state_file, json=True)
        
        if not outputs:
            raise RuntimeError("Could not read Terraform outputs")
        
        instance_id = outputs.get("instance_id", {}).get("value")
        public_ip = outputs.get("public_ip", {}).get("value")
        ssh_key_name = outputs.get("ssh_key_name", {}).get("value")
        
        if not instance_id:
            raise RuntimeError("CVAT instance ID not found")
        
        if remote_path is None:
            remote_path = "/home/ubuntu/data"
        
        console.print(f"[yellow]Syncing files with CVAT instance {instance_id}...[/yellow]")
        
        # Try SSM Session Manager first (no SSH key needed)
        if self._try_ssm_sync(instance_id, local_path, remote_path, direction):
            return
        
        # Fallback to SSH if SSM fails or not available
        if not public_ip:
            raise RuntimeError("Cannot sync: no public IP and SSM not available")
        
        if not ssh_key_name:
            console.print("[yellow]⚠ SSH key name not found. Trying to find SSH key...[/yellow]")
            # Try to find SSH key from user's ~/.ssh directory
            ssh_key_path = self._find_ssh_key(ssh_key_name or "default")
            if not ssh_key_path:
                raise RuntimeError(
                    "Cannot sync: SSH key required. "
                    "Either enable SSM Session Manager or provide SSH key path."
                )
        else:
            ssh_key_path = self._find_ssh_key(ssh_key_name)
        
        if not ssh_key_path:
            raise RuntimeError(f"Cannot find SSH key: {ssh_key_name}")
        
        # Use rsync over SSH
        self._rsync_sync(public_ip, ssh_key_path, local_path, remote_path, direction)
    
    def _try_ssm_sync(
        self,
        instance_id: str,
        local_path: Path,
        remote_path: str,
        direction: str,
    ) -> bool:
        """Try to sync using AWS Systems Manager Session Manager.
        
        Returns:
            True if sync succeeded, False otherwise
        """
        try:
            import subprocess
            import shutil
            
            # Check if aws cli and session-manager-plugin are available
            if not shutil.which("aws"):
                return False
            
            # Try to use aws ssm start-session with port forwarding
            # For file sync, we'll use aws ssm send-command
            console.print("[yellow]Attempting SSM-based sync...[/yellow]")
            
            # For now, SSM file sync is complex - fall back to SSH
            # In the future, we could use SSM Run Command with a sync script
            return False
        except Exception:
            return False
    
    def _find_ssh_key(self, key_name: str) -> Optional[Path]:
        """Find SSH key file.
        
        Args:
            key_name: SSH key name or identifier
            
        Returns:
            Path to SSH key file, or None if not found
        """
        from pathlib import Path
        import os
        
        # Common locations
        ssh_dir = Path.home() / ".ssh"
        possible_names = [
            key_name,
            f"{key_name}.pem",
            f"id_rsa",
            f"id_ed25519",
        ]
        
        for name in possible_names:
            key_path = ssh_dir / name
            if key_path.exists() and os.access(key_path, os.R_OK):
                return key_path
        
        return None
    
    def _rsync_sync(
        self,
        host: str,
        ssh_key_path: Path,
        local_path: Path,
        remote_path: str,
        direction: str,
    ) -> None:
        """Sync files using rsync over SSH.
        
        Args:
            host: Remote host (IP or hostname)
            ssh_key_path: Path to SSH private key
            local_path: Local directory path
            remote_path: Remote directory path
            direction: Sync direction
        """
        import subprocess
        import shutil
        
        if not shutil.which("rsync"):
            raise RuntimeError(
                "rsync is not available. Install it: "
                "macOS: brew install rsync, Linux: apt-get install rsync"
            )
        
        user = "ubuntu"  # Default EC2 user
        
        # Build rsync command
        rsync_cmd = [
            "rsync",
            "-avz",
            "-e", f"ssh -i {ssh_key_path} -o StrictHostKeyChecking=no",
        ]
        
        if direction in ("up", "both"):
            # Local -> Remote
            console.print(f"[green]Syncing up: {local_path} -> {user}@{host}:{remote_path}[/green]")
            cmd = rsync_cmd + [f"{local_path}/", f"{user}@{host}:{remote_path}/"]
            result = subprocess.run(cmd, capture_output=True, text=True, check=False)
            if result.returncode != 0:
                raise RuntimeError(f"Failed to sync up: {result.stderr}")
        
        if direction in ("down", "both"):
            # Remote -> Local
            console.print(f"[green]Syncing down: {user}@{host}:{remote_path} -> {local_path}[/green]")
            local_path.mkdir(parents=True, exist_ok=True)
            cmd = rsync_cmd + [f"{user}@{host}:{remote_path}/", f"{local_path}/"]
            result = subprocess.run(cmd, capture_output=True, text=True, check=False)
            if result.returncode != 0:
                raise RuntimeError(f"Failed to sync down: {result.stderr}")
        
        console.print("[green]✓[/green] Sync completed successfully")

    def shell(
        self,
        mode: str = "ssh",
    ) -> None:
        """Get shell access to GPU node.
        
        Args:
            mode: Connection mode: "ssh", "vscode", or "jupyter"
        """
        # Get instance info from Terraform state
        module_dir = self.blueprint.terraform_dir / "cvat"
        state_file = module_dir / "terraform.tfstate"
        
        if not state_file.exists():
            raise RuntimeError("CVAT instance not provisioned. Run 'pocket-architect cvat up' first.")
        
        tf = TerraformBackend(module_dir)
        outputs = tf.output(state_file=state_file, json=True)
        
        if not outputs:
            raise RuntimeError("Could not read Terraform outputs")
        
        instance_id = outputs.get("instance_id", {}).get("value")
        public_ip = outputs.get("public_ip", {}).get("value")
        ssh_key_name = outputs.get("ssh_key_name", {}).get("value")
        
        if mode == "ssh":
            # Try SSM first (no SSH key needed)
            if self._try_ssm_shell(instance_id):
                return
            
            # Fallback to SSH
            if not public_ip:
                raise RuntimeError("Cannot connect: no public IP and SSM not available")
            
            ssh_key_path = self._find_ssh_key(ssh_key_name or "default")
            if not ssh_key_path:
                console.print("[yellow]⚠ SSH key not found. Trying SSM...[/yellow]")
                if not self._try_ssm_shell(instance_id):
                    raise RuntimeError(
                        "Cannot connect: SSH key required or enable SSM Session Manager"
                    )
                return
            
            console.print(f"[yellow]Connecting to instance {instance_id} via SSH...[/yellow]")
            import subprocess
            subprocess.run([
                "ssh",
                "-i", str(ssh_key_path),
                "-o", "StrictHostKeyChecking=no",
                f"ubuntu@{public_ip}",
            ])
        
        elif mode == "vscode":
            if not public_ip:
                raise RuntimeError("VSCode Remote requires public IP or SSM")
            
            ssh_key_path = self._find_ssh_key(ssh_key_name or "default")
            if ssh_key_path:
                console.print(f"[bold cyan]VSCode Remote SSH Configuration[/bold cyan]")
                console.print(f"\n[yellow]Host:[/yellow] {instance_id}")
                console.print(f"[yellow]HostName:[/yellow] {public_ip}")
                console.print(f"[yellow]User:[/yellow] ubuntu")
                console.print(f"[yellow]IdentityFile:[/yellow] {ssh_key_path}")
                console.print(f"\n[green]Add to ~/.ssh/config:[/green]")
                console.print(f"\nHost {instance_id}")
                console.print(f"  HostName {public_ip}")
                console.print(f"  User ubuntu")
                console.print(f"  IdentityFile {ssh_key_path}")
                console.print(f"\nThen connect: [green]ssh {instance_id}[/green]")
            else:
                console.print("[yellow]VSCode Remote SSH requires SSH key configuration[/yellow]")
        
        elif mode == "jupyter":
            # Launch JupyterLab on the instance
            console.print("[yellow]Setting up JupyterLab on instance...[/yellow]")
            if not public_ip:
                raise RuntimeError("Jupyter requires public IP or SSM")
            
            ssh_key_path = self._find_ssh_key(ssh_key_name or "default")
            if not ssh_key_path:
                raise RuntimeError("Jupyter setup requires SSH key")
            
            # Install and start JupyterLab via SSH
            import subprocess
            setup_cmd = [
                "ssh",
                "-i", str(ssh_key_path),
                "-o", "StrictHostKeyChecking=no",
                f"ubuntu@{public_ip}",
                "bash -c 'pip install --user jupyterlab && nohup jupyter lab --ip=0.0.0.0 --port=8888 --no-browser --allow-root > /tmp/jupyter.log 2>&1 &'"
            ]
            result = subprocess.run(setup_cmd, capture_output=True, text=True, check=False)
            if result.returncode == 0:
                # Get token
                token_cmd = [
                    "ssh",
                    "-i", str(ssh_key_path),
                    "-o", "StrictHostKeyChecking=no",
                    f"ubuntu@{public_ip}",
                    "jupyter lab list | grep http | head -1"
                ]
                token_result = subprocess.run(token_cmd, capture_output=True, text=True, check=False)
                console.print(f"[green]✓[/green] JupyterLab started")
                console.print(f"[green]Access at:[/green] http://{public_ip}:8888")
                if token_result.stdout:
                    console.print(f"[green]Token:[/green] {token_result.stdout.strip()}")
            else:
                raise RuntimeError(f"Failed to start JupyterLab: {result.stderr}")
        
        else:
            raise ValueError(f"Unsupported shell mode: {mode}. Must be: ssh, vscode, or jupyter")
    
    def _try_ssm_shell(self, instance_id: str) -> bool:
        """Try to connect via AWS Systems Manager Session Manager.
        
        Returns:
            True if connection succeeded, False otherwise
        """
        try:
            import subprocess
            import shutil
            
            if not shutil.which("aws"):
                return False
            
            # Check if session-manager-plugin is installed
            if not shutil.which("session-manager-plugin"):
                console.print("[yellow]⚠ session-manager-plugin not found. Install it:[/yellow]")
                console.print("[yellow]  https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-install-plugin.html[/yellow]")
                return False
            
            console.print(f"[yellow]Connecting to {instance_id} via SSM Session Manager...[/yellow]")
            subprocess.run([
                "aws", "ssm", "start-session",
                "--target", instance_id,
                "--region", self.region,
            ])
            return True
        except Exception as e:
            console.print(f"[yellow]SSM connection failed: {e}[/yellow]")
            return False

    def deploy_training_script(
        self,
        instance_id: str,
        script_content: str,
        script_path: str = "/tmp/train.py",
    ) -> None:
        """Deploy training script to AWS instance.
        
        Args:
            instance_id: EC2 instance ID
            script_content: Python script content
            script_path: Remote path to save script
        """
        # Get instance info
        module_dir = self.blueprint.terraform_dir / "training"
        if not module_dir.exists():
            module_dir = self.blueprint.terraform_dir / "auto_annotate"
        
        state_file = module_dir / "terraform.tfstate"
        if not state_file.exists():
            raise RuntimeError("Training instance not found in Terraform state")
        
        tf = TerraformBackend(module_dir)
        outputs = tf.output(state_file=state_file, json=True)
        public_ip = outputs.get("public_ip", {}).get("value")
        ssh_key_name = outputs.get("ssh_key_name", {}).get("value")
        
        if not public_ip:
            raise RuntimeError("Cannot deploy script: no public IP")
        
        ssh_key_path = self._find_ssh_key(ssh_key_name or "default")
        if not ssh_key_path:
            raise RuntimeError("Cannot deploy script: SSH key required")
        
        # Write script to temp file and copy
        import tempfile
        with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
            f.write(script_content)
            temp_script = Path(f.name)
        
        try:
            # Copy script to instance
            import subprocess
            user = "ubuntu"
            result = subprocess.run([
                "scp",
                "-i", str(ssh_key_path),
                "-o", "StrictHostKeyChecking=no",
                str(temp_script),
                f"{user}@{public_ip}:{script_path}",
            ], capture_output=True, text=True, check=False)
            
            if result.returncode != 0:
                raise RuntimeError(f"Failed to deploy script: {result.stderr}")
            
            # Make script executable
            subprocess.run([
                "ssh",
                "-i", str(ssh_key_path),
                "-o", "StrictHostKeyChecking=no",
                f"{user}@{public_ip}",
                f"chmod +x {script_path}",
            ], capture_output=True, text=True, check=False)
            
            console.print(f"[green]✓[/green] Training script deployed to {script_path}")
        finally:
            temp_script.unlink()
    
    def start_training_job(
        self,
        instance_id: str,
        script_path: str,
    ) -> Optional[str]:
        """Start training job on AWS instance.
        
        Args:
            instance_id: EC2 instance ID
            script_path: Path to training script on instance
            
        Returns:
            Job ID (process ID on instance)
        """
        # Get instance info
        module_dir = self.blueprint.terraform_dir / "training"
        if not module_dir.exists():
            module_dir = self.blueprint.terraform_dir / "auto_annotate"
        
        state_file = module_dir / "terraform.tfstate"
        if not state_file.exists():
            raise RuntimeError("Training instance not found in Terraform state")
        
        tf = TerraformBackend(module_dir)
        outputs = tf.output(state_file=state_file, json=True)
        public_ip = outputs.get("public_ip", {}).get("value")
        ssh_key_name = outputs.get("ssh_key_name", {}).get("value")
        
        if not public_ip:
            raise RuntimeError("Cannot start job: no public IP")
        
        ssh_key_path = self._find_ssh_key(ssh_key_name or "default")
        if not ssh_key_path:
            raise RuntimeError("Cannot start job: SSH key required")
        
        # Start training in background with nohup
        import subprocess
        user = "ubuntu"
        cmd = f"nohup python3 {script_path} > /tmp/training.log 2>&1 & echo $!"
        result = subprocess.run([
            "ssh",
            "-i", str(ssh_key_path),
            "-o", "StrictHostKeyChecking=no",
            f"{user}@{public_ip}",
            cmd,
        ], capture_output=True, text=True, check=False)
        
        if result.returncode != 0:
            raise RuntimeError(f"Failed to start training job: {result.stderr}")
        
        job_id = result.stdout.strip()
        console.print(f"[green]✓[/green] Training job started (PID: {job_id})")
        console.print(f"[yellow]Monitor logs:[/yellow] ssh -i {ssh_key_path} {user}@{public_ip} 'tail -f /tmp/training.log'")
        
        return job_id

    def destroy(self, force: bool = False) -> None:
        """Destroy all AWS resources.
        
        Args:
            force: Skip confirmation prompts
        """
        if not force:
            import typer
            confirm = typer.confirm(
                "This will destroy all AWS resources for this session. Continue?",
                default=False,
            )
            if not confirm:
                return
        
        console.print("[bold yellow]Destroying AWS resources...[/bold yellow]")
        
        # Destroy all modules in session
        modules = ["cvat", "training", "auto_annotate"]
        
        for module_name in modules:
            module_dir = self.blueprint.terraform_dir / module_name
            if not module_dir.exists():
                continue
            
            state_file = module_dir / "terraform.tfstate"
            if not state_file.exists():
                continue
            
            console.print(f"[yellow]Destroying {module_name} module...[/yellow]")
            
            tf = TerraformBackend(module_dir)
            destroy_result = tf.destroy(
                state_file=state_file,
                var_file=module_dir / "terraform.tfvars",
                auto_approve=True,
            )
            
            if destroy_result.returncode != 0:
                console.print(f"[red]Warning: Failed to destroy {module_name}: {destroy_result.stderr}[/red]")
        
        console.print("[green]✓ Resources destroyed[/green]")

    def cost_estimate(
        self,
        resource_type: str,
        **kwargs: Any,
    ) -> CostEstimate:
        """Estimate cost for AWS resources.
        
        Args:
            resource_type: Type of resource ("cvat", "worker", "training")
            **kwargs: Provider-specific parameters
            
        Returns:
            Cost estimate
        """
        use_spot = kwargs.get("use_spot", True)
        instance_type = kwargs.get("instance_type")
        
        return CostEstimator.estimate(
            Provider.AWS,
            resource_type,
            use_spot=use_spot,
            instance_type=instance_type,
            **kwargs,
        )

