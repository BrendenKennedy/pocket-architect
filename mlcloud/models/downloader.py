"""Model downloader with caching."""

import hashlib
from pathlib import Path
from typing import Optional
from rich.progress import Progress, BarColumn, TextColumn, DownloadColumn, TransferSpeedColumn
import requests

from mlcloud.models.registry import ModelRegistry, ModelMetadata
from mlcloud.utils.rich_ui import console


class ModelDownloader:
    """Downloads and caches models."""

    def __init__(self, registry: Optional[ModelRegistry] = None):
        """Initialize model downloader.
        
        Args:
            registry: Model registry instance
        """
        if registry is None:
            registry = ModelRegistry()
        self.registry = registry

    def download_model(self, model_name: str, force: bool = False) -> Path:
        """Download model weights if not cached.
        
        Args:
            model_name: Model name
            force: Force re-download even if cached
            
        Returns:
            Path to downloaded weights file
        """
        model = self.registry.get_model(model_name)
        weights_path = self.registry.get_model_weights_path(model_name)
        
        # Check if already cached
        if weights_path.exists() and not force:
            console.print(f"[green]✓[/green] Model {model_name} already cached: {weights_path}")
            return weights_path
        
        console.print(f"[yellow]Downloading model {model_name}...[/yellow]")
        
        # Model-specific download logic
        if model.model_type.value == "sam2":
            return self._download_sam2(model, weights_path)
        elif model.model_type.value.startswith("yolo11"):
            return self._download_yolo11(model, weights_path)
        elif model.model_type.value == "grounding-dino":
            return self._download_grounding_dino(model, weights_path)
        elif model.model_type.value == "detectron2":
            return self._download_detectron2(model, weights_path)
        else:
            raise ValueError(f"Unknown model type: {model.model_type}")

    def _download_sam2(self, model: ModelMetadata, weights_path: Path) -> Path:
        """Download SAM 2.1 model.
        
        Args:
            model: Model metadata
            weights_path: Destination path
            
        Returns:
            Path to downloaded weights
        """
        # SAM 2.1 is typically downloaded via Python package
        # For now, placeholder
        console.print("[yellow]SAM 2.1 download via segment-anything-2 package not yet implemented[/yellow]")
        return weights_path

    def _download_yolo11(self, model: ModelMetadata, weights_path: Path) -> Path:
        """Download YOLO11 model.
        
        Args:
            model: Model metadata
            weights_path: Destination path
            
        Returns:
            Path to downloaded weights
        """
        # YOLO11 is typically auto-downloaded by ultralytics
        # For now, placeholder
        console.print(f"[yellow]YOLO11 {model.weights_file} download via ultralytics package not yet implemented[/yellow]")
        return weights_path

    def _download_grounding_dino(self, model: ModelMetadata, weights_path: Path) -> Path:
        """Download Grounding DINO model.
        
        Args:
            model: Model metadata
            weights_path: Destination path
            
        Returns:
            Path to downloaded weights
        """
        # Grounding DINO download logic
        console.print("[yellow]Grounding DINO download not yet implemented[/yellow]")
        return weights_path

    def _download_detectron2(self, model: ModelMetadata, weights_path: Path) -> Path:
        """Download Detectron2 model.
        
        Args:
            model: Model metadata
            weights_path: Destination path
            
        Returns:
            Path to downloaded weights
        """
        # Detectron2 models are typically auto-downloaded
        console.print("[yellow]Detectron2 download via detectron2 package not yet implemented[/yellow]")
        return weights_path

    def _download_file(
        self,
        url: str,
        dest_path: Path,
        expected_hash: Optional[str] = None,
    ) -> Path:
        """Download a file with progress bar.
        
        Args:
            url: Download URL
            dest_path: Destination path
            expected_hash: Expected SHA256 hash (optional)
            
        Returns:
            Path to downloaded file
        """
        dest_path.parent.mkdir(parents=True, exist_ok=True)
        
        with requests.get(url, stream=True, timeout=300) as response:
            response.raise_for_status()
            total_size = int(response.headers.get("content-length", 0))
            
            with Progress(
                TextColumn("[progress.description]{task.description}"),
                BarColumn(),
                DownloadColumn(),
                TransferSpeedColumn(),
                console=console,
            ) as progress:
                task = progress.add_task(f"Downloading {dest_path.name}", total=total_size)
                
                with open(dest_path, "wb") as f:
                    for chunk in response.iter_content(chunk_size=8192):
                        if chunk:
                            f.write(chunk)
                            progress.update(task, advance=len(chunk))
        
        # Verify hash if provided
        if expected_hash:
            actual_hash = self._calculate_sha256(dest_path)
            if actual_hash != expected_hash:
                dest_path.unlink()
                raise RuntimeError(f"Hash mismatch for {url}")
        
        return dest_path

    def _calculate_sha256(self, file_path: Path) -> str:
        """Calculate SHA256 hash of a file.
        
        Args:
            file_path: Path to file
            
        Returns:
            SHA256 hash
        """
        sha256 = hashlib.sha256()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                sha256.update(chunk)
        return sha256.hexdigest()

