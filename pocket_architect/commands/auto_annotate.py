"""auto-annotate command - fully automatic labeling (images or video frames)."""

import typer
import json
from pathlib import Path
from typing import List, Optional
from rich.console import Console
from rich.progress import Progress, BarColumn, TextColumn
from PIL import Image

try:
    import cv2
    CV2_AVAILABLE = True
except ImportError:
    CV2_AVAILABLE = False

from pocket_architect.core.types import Provider
from pocket_architect.core.session import SessionManager
from pocket_architect.models.inference import InferenceEngine, convert_to_cvat_format
from pocket_architect.models.registry import ModelRegistry
from pocket_architect.utils.rich_ui import display_info, display_success, display_error

app = typer.Typer(name="auto-annotate", help="Fully automatic labeling (images or video frames)")
console = Console()


def extract_video_frames(video_path: Path, output_dir: Path) -> List[Path]:
    """Extract frames from video file.
    
    Args:
        video_path: Path to video file
        output_dir: Directory to save frames
        
    Returns:
        List of frame file paths
        
    Raises:
        ImportError: If opencv-python is not installed
    """
    if not CV2_AVAILABLE:
        raise ImportError(
            "opencv-python is required for video frame extraction. "
            "Install it with: pip install opencv-python"
        )
    
    output_dir.mkdir(parents=True, exist_ok=True)
    frames = []
    
    cap = cv2.VideoCapture(str(video_path))
    frame_count = 0
    
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        
        frame_path = output_dir / f"frame_{frame_count:06d}.jpg"
        cv2.imwrite(str(frame_path), frame)
        frames.append(frame_path)
        frame_count += 1
    
    cap.release()
    return frames


@app.callback(invoke_without_command=True)
def main(
    ctx: typer.Context,
    path: Path = typer.Argument(..., help="Path to images or video file"),
    model: str = typer.Option(
        "sam2",
        "--model",
        "-m",
        help="Model to use (sam2, yolo11-seg, yolo11-obb, grounding-dino, detectron2)",
    ),
    provider: Optional[str] = typer.Option(
        None,
        "--provider",
        "-p",
        help="Cloud provider (aws, coreweave, runpod, local)",
    ),
    output: Optional[Path] = typer.Option(
        None,
        "--output",
        "-o",
        help="Output path for annotations (default: <path>_annotations)",
    ),
) -> None:
    """Fully automatic labeling for images or video frames.
    
    Examples:
        pocket-architect auto-annotate ./images --model sam2
        pocket-architect auto-annotate video.mp4 --model yolo11-seg --provider aws
    """
    if ctx.invoked_subcommand is not None:
        return
    
    # Validate path
    if not path.exists():
        display_error(f"Path does not exist: {path}")
        raise typer.Exit(1)
    
    # Determine output path
    if output is None:
        output = path.parent / f"{path.stem}_annotations"
    
    output.mkdir(parents=True, exist_ok=True)
    
    # Initialize inference engine
    try:
        registry = ModelRegistry()
        registry.get_model(model)  # Validate model exists
        engine = InferenceEngine(registry)
    except ValueError as e:
        display_error(str(e))
        raise typer.Exit(1)
    
    # Determine if path is video or images
    image_extensions = {".jpg", ".jpeg", ".png", ".bmp", ".tiff", ".webp"}
    video_extensions = {".mp4", ".avi", ".mov", ".mkv", ".webm"}
    
    is_video = path.suffix.lower() in video_extensions
    is_image = path.suffix.lower() in image_extensions
    
    if is_video:
        display_info(f"Extracting frames from video: {path}")
        frames_dir = output / "frames"
        frames = extract_video_frames(path, frames_dir)
        display_success(f"Extracted {len(frames)} frames")
        image_paths = frames
    elif is_image:
        image_paths = [path]
    elif path.is_dir():
        # Directory of images
        image_paths = [
            p for p in path.iterdir()
            if p.suffix.lower() in image_extensions
        ]
        if not image_paths:
            display_error(f"No images found in directory: {path}")
            raise typer.Exit(1)
    else:
        display_error(f"Unsupported file type: {path.suffix}")
        raise typer.Exit(1)
    
    # Run inference on all images
    console.print(f"[bold cyan]Running {model} inference on {len(image_paths)} image(s)...[/bold cyan]")
    
    all_annotations = {}
    
    with Progress(
        TextColumn("[progress.description]{task.description}"),
        BarColumn(),
        TextColumn("[progress.percentage]{task.percentage:>3.0f}%"),
        console=console,
    ) as progress:
        task = progress.add_task("Processing images...", total=len(image_paths))
        
        for image_path in image_paths:
            try:
                # Load image
                image = Image.open(image_path)
                
                # Run inference
                predictions = engine.predict(model, image)
                
                # Convert to CVAT format
                model_meta = registry.get_model(model)
                cvat_annotations = convert_to_cvat_format(predictions, model_meta.model_type.value)
                
                # Store annotations
                rel_path = image_path.relative_to(path if path.is_dir() else path.parent)
                all_annotations[str(rel_path)] = cvat_annotations
                
                progress.advance(task)
            except Exception as e:
                console.print(f"[red]Error processing {image_path}: {e}[/red]")
                progress.advance(task)
    
    # Save annotations in CVAT-compatible format (JSON)
    annotations_file = output / "annotations.json"
    annotations_file.write_text(json.dumps(all_annotations, indent=2))
    
    display_success(f"Annotations saved to: {annotations_file}")
    console.print(f"[green]✓[/green] Processed {len(image_paths)} image(s)")
    console.print(f"[green]✓[/green] Generated {sum(len(a) for a in all_annotations.values())} annotation(s)")

