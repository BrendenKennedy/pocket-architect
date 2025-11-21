"""train command - launch YOLO/SAM/Detectron2 training job."""

import typer
import yaml
from pathlib import Path
from typing import Optional
from rich.console import Console

from pocket_architect.core.types import Provider, SessionState
from pocket_architect.core.session import SessionManager
from pocket_architect.providers import get_provider
from pocket_architect.utils.rich_ui import display_success, display_error, display_info, display_cost_warning
from pocket_architect.utils.cost_estimator import CostEstimator
from pocket_architect.config.settings import settings

app = typer.Typer(name="train", help="Launch YOLO/SAM/Detectron2 training job")
console = Console()


def _generate_training_script(
    framework: str,
    dataset_path: str,
    epochs: int,
    batch_size: int,
    output_path: str,
) -> str:
    """Generate training script for specified framework.
    
    Args:
        framework: Framework name (yolo, detectron2, sam)
        dataset_path: Path to dataset
        epochs: Number of training epochs
        batch_size: Batch size
        output_path: Path to save model outputs
        
    Returns:
        Python script content as string
    """
    if framework == "yolo":
        return f"""#!/usr/bin/env python3
\"\"\"YOLO training script.\"\"\"

from ultralytics import YOLO
import os

# Load model
model = YOLO('yolo11n-seg.pt')  # Start from pretrained

# Train
results = model.train(
    data='{dataset_path}',
    epochs={epochs},
    batch={batch_size},
    imgsz=640,
    project='{output_path}',
    name='yolo_training',
)

print(f"Training complete! Model saved to {{results.save_dir}}")
"""
    elif framework == "detectron2":
        return f"""#!/usr/bin/env python3
\"\"\"Detectron2 training script.\"\"\"

from detectron2.engine import DefaultTrainer
from detectron2.config import get_cfg
from detectron2 import model_zoo
import os

# Setup config
cfg = get_cfg()
cfg.merge_from_file(model_zoo.get_config_file("COCO-InstanceSegmentation/mask_rcnn_R_50_FPN_3x.yaml"))
cfg.DATASETS.TRAIN = ("{dataset_path}",)
cfg.DATASETS.TEST = ()
cfg.DATALOADER.NUM_WORKERS = 2
cfg.MODEL.WEIGHTS = model_zoo.get_checkpoint_url("COCO-InstanceSegmentation/mask_rcnn_R_50_FPN_3x.yaml")
cfg.SOLVER.IMS_PER_BATCH = {batch_size}
cfg.SOLVER.BASE_LR = 0.00025
cfg.SOLVER.MAX_ITER = {epochs * 100}  # Approximate
cfg.OUTPUT_DIR = "{output_path}"

# Train
trainer = DefaultTrainer(cfg)
trainer.resume_or_load(resume=False)
trainer.train()

print(f"Training complete! Model saved to {cfg.OUTPUT_DIR}")
"""
    else:
        # Generic template
        return f"""#!/usr/bin/env python3
\"\"\"Training script for {framework}.\"\"\"

import os

dataset_path = "{dataset_path}"
output_path = "{output_path}"
epochs = {epochs}
batch_size = {batch_size}

# TODO: Implement {framework} training logic
print(f"Training {framework} model...")
print(f"Dataset: {{dataset_path}}")
print(f"Output: {{output_path}}")
print(f"Epochs: {{epochs}}, Batch size: {{batch_size}}")
"""


def _get_provider_from_string(provider_str: Optional[str]) -> Provider:
    """Convert provider string to Provider enum."""
    if provider_str is None:
        default = settings.default_provider
        if default:
            try:
                return Provider(default.lower())
            except ValueError:
                pass
        return Provider.LOCAL
    
    try:
        return Provider(provider_str.lower())
    except ValueError:
        raise typer.BadParameter(
            f"Invalid provider: {provider_str}. Must be one of: aws, coreweave, runpod, local"
        )


@app.command()
def train(
    config: Path = typer.Argument(..., help="Training configuration YAML file"),
    provider: Optional[str] = typer.Option(
        None,
        "--provider",
        "-p",
        help="Cloud provider (aws, coreweave, runpod, local)",
    ),
) -> None:
    """Launch YOLO/SAM/Detectron2 training job.
    
    Examples:
        pocket-architect train config.yaml --provider aws
        pocket-architect train training-config.yml --provider coreweave
    """
    # Validate config file
    if not config.exists():
        display_error(f"Config file not found: {config}")
        raise typer.Exit(1)
    
    # Load config
    try:
        with open(config, "r") as f:
            train_config = yaml.safe_load(f)
    except Exception as e:
        display_error(f"Failed to load config file: {e}")
        raise typer.Exit(1)
    
    provider_enum = _get_provider_from_string(provider)
    
    console.print(f"[bold cyan]Launching training job on {provider_enum.value}...[/bold cyan]")
    
    # Show cost estimate
    instance_type = train_config.get("instance_type", "p3.2xlarge")
    cost_estimate = CostEstimator.estimate(
        provider_enum,
        "training",
        instance_type=instance_type,
        use_spot=True,
    )
    console.print(f"[green]Estimated cost:[/green] ${cost_estimate.hourly_rate_usd:.4f}/hour (${cost_estimate.monthly_projection_usd:.2f}/month)")
    display_cost_warning(cost_estimate, settings.cost_warning_threshold_usd)
    
    # Create session
    session_manager = SessionManager()
    session = session_manager.create_session(provider_enum, metadata={"training_config": str(config)})
    
    try:
        provider_client = get_provider(provider_enum, session.session_id)
        
        # Provision training node
        console.print("[yellow]Provisioning training node...[/yellow]")
        result = provider_client.provision_worker(
            instance_type=instance_type,
            **train_config,
        )
        
        instance_id = result.get("instance_id", "")
        public_ip = result.get("public_ip", "")
        
        # Update session
        session.training_job_id = instance_id
        session.worker_node_id = instance_id
        session.state = SessionState.ACTIVE
        session.estimated_hourly_cost = cost_estimate.hourly_rate_usd
        session_manager.update_session(session)
        
        display_success("Training node provisioned successfully!")
        console.print(f"[green]Training node ID:[/green] {instance_id}")
        
        # Deploy and execute training script
        framework = train_config.get("framework", "yolo").lower()
        dataset_path = train_config.get("dataset_path", "/mnt/efs/datasets")
        epochs = train_config.get("epochs", 100)
        batch_size = train_config.get("batch_size", 16)
        output_path = train_config.get("output_path", "/mnt/efs/models")
        
        console.print("[yellow]Deploying training script...[/yellow]")
        
        # Generate training script based on framework
        training_script = _generate_training_script(
            framework=framework,
            dataset_path=dataset_path,
            epochs=epochs,
            batch_size=batch_size,
            output_path=output_path,
        )
        
        # Deploy script to instance
        try:
            provider_client.deploy_training_script(
                instance_id=instance_id,
                script_content=training_script,
                script_path="/tmp/train.py",
            )
            
            # Execute training
            console.print("[yellow]Starting training job...[/yellow]")
            job_id = provider_client.start_training_job(
                instance_id=instance_id,
                script_path="/tmp/train.py",
            )
            
            session.training_job_id = job_id or instance_id
            session_manager.update_session(session)
            
            display_success("Training job started!")
            console.print(f"[green]Job ID:[/green] {session.training_job_id}")
            console.print(f"[green]Monitor logs:[/green] pocket-architect train status --provider {provider_enum.value}")
            
        except NotImplementedError:
            # Provider doesn't support script deployment yet
            console.print("[yellow]⚠ Script deployment not yet implemented for this provider[/yellow]")
            console.print(f"[yellow]Connect to instance manually:[/yellow] pocket-architect shell --provider {provider_enum.value}")
            console.print("[yellow]Training script will need to be deployed manually[/yellow]")
        
    except Exception as e:
        display_error(f"Failed to launch training job: {e}")
        session.state = SessionState.ERROR
        session_manager.update_session(session)
        raise typer.Exit(1)

