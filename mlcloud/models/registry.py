"""Model registry with hard-coded v1.0 models and download caching."""

from pathlib import Path
from typing import Dict, Any, Optional
from enum import Enum
from pydantic import BaseModel, Field

from mlcloud.config.settings import settings


class ModelType(str, Enum):
    """Model type enumeration."""

    SAM2 = "sam2"
    YOLO11_SEG = "yolo11-seg"
    YOLO11_OBB = "yolo11-obb"
    GROUNDING_DINO = "grounding-dino"
    DETECTRON2 = "detectron2"


class ModelMetadata(BaseModel):
    """Model metadata."""

    name: str = Field(..., description="Model name")
    model_type: ModelType = Field(..., description="Model type")
    version: str = Field(..., description="Model version")
    description: str = Field(..., description="Model description")
    download_url: Optional[str] = Field(None, description="Download URL (if applicable)")
    checkpoint_path: Optional[str] = Field(None, description="Local checkpoint path")
    framework: str = Field(..., description="Framework (pytorch, ultralytics, detectron2)")
    weights_file: Optional[str] = Field(None, description="Weights filename")
    config_file: Optional[str] = Field(None, description="Config filename")


# Hard-coded v1.0 model registry
MODEL_REGISTRY: Dict[str, ModelMetadata] = {
    "sam2": ModelMetadata(
        name="SAM 2.1 hiera-large",
        model_type=ModelType.SAM2,
        version="2.1",
        description="Segment Anything Model 2.1 with hiera-large architecture",
        download_url=None,  # Will be downloaded via segment-anything-2 package
        checkpoint_path=None,
        framework="pytorch",
        weights_file="sam2_hiera_large.pth",
        config_file=None,
    ),
    "yolo11-seg": ModelMetadata(
        name="YOLO11x-seg",
        model_type=ModelType.YOLO11_SEG,
        version="11.0",
        description="YOLOv11x segmentation model",
        download_url=None,  # Will be downloaded via ultralytics package
        checkpoint_path=None,
        framework="ultralytics",
        weights_file="yolo11x-seg.pt",
        config_file=None,
    ),
    "yolo11-obb": ModelMetadata(
        name="YOLO11x-obb",
        model_type=ModelType.YOLO11_OBB,
        version="11.0",
        description="YOLOv11x oriented bounding box model",
        download_url=None,  # Will be downloaded via ultralytics package
        checkpoint_path=None,
        framework="ultralytics",
        weights_file="yolo11x-obb.pt",
        config_file=None,
    ),
    "grounding-dino": ModelMetadata(
        name="Grounding DINO 1.5 + SAM 2",
        model_type=ModelType.GROUNDING_DINO,
        version="1.5",
        description="Grounding DINO 1.5 with SAM 2 integration",
        download_url=None,  # Will be downloaded via groundingdino package
        checkpoint_path=None,
        framework="pytorch",
        weights_file="groundingdino_swinb_cogcoor.pth",
        config_file="GroundingDINO_SwinB.cfg.py",
    ),
    "detectron2": ModelMetadata(
        name="Detectron2 Mask R-CNN (pretrained)",
        model_type=ModelType.DETECTRON2,
        version="R-50-FPN",
        description="Detectron2 Mask R-CNN with ResNet-50-FPN backbone (pretrained on COCO)",
        download_url=None,  # Will be downloaded via detectron2 package
        checkpoint_path=None,
        framework="detectron2",
        weights_file="R-50.pkl",
        config_file="COCO-InstanceSegmentation/mask_rcnn_R_50_FPN_3x.yaml",
    ),
}


class ModelRegistry:
    """Model registry with download caching."""

    def __init__(self, models_dir: Optional[Path] = None):
        """Initialize model registry.
        
        Args:
            models_dir: Directory for model cache (default: ~/.mlcloud/models)
        """
        if models_dir is None:
            models_dir = settings.models_dir
        self.models_dir = models_dir
        self.models_dir.mkdir(parents=True, exist_ok=True)

    def get_model(self, model_name: str) -> ModelMetadata:
        """Get model metadata.
        
        Args:
            model_name: Model name or alias
            
        Returns:
            Model metadata
            
        Raises:
            ValueError: If model not found
        """
        # Normalize model name
        model_name = model_name.lower().replace("_", "-")
        
        if model_name not in MODEL_REGISTRY:
            # Try fuzzy matching
            for key in MODEL_REGISTRY.keys():
                if model_name in key or key in model_name:
                    return MODEL_REGISTRY[key]
            
            available = ", ".join(MODEL_REGISTRY.keys())
            raise ValueError(
                f"Model '{model_name}' not found. Available models: {available}"
            )
        
        return MODEL_REGISTRY[model_name]

    def list_models(self) -> Dict[str, ModelMetadata]:
        """List all registered models.
        
        Returns:
            Dictionary of model name -> metadata
        """
        return MODEL_REGISTRY.copy()

    def get_model_cache_dir(self, model_name: str) -> Path:
        """Get cache directory for a model.
        
        Args:
            model_name: Model name
            
        Returns:
            Path to model cache directory
        """
        model = self.get_model(model_name)
        cache_dir = self.models_dir / model.model_type.value / model.version
        cache_dir.mkdir(parents=True, exist_ok=True)
        return cache_dir

    def get_model_weights_path(self, model_name: str) -> Path:
        """Get path to model weights file.
        
        Args:
            model_name: Model name
            
        Returns:
            Path to weights file
        """
        model = self.get_model(model_name)
        cache_dir = self.get_model_cache_dir(model_name)
        
        if model.weights_file:
            return cache_dir / model.weights_file
        else:
            return cache_dir / "weights.pth"  # Default

    def is_model_cached(self, model_name: str) -> bool:
        """Check if model is cached.
        
        Args:
            model_name: Model name
            
        Returns:
            True if model is cached
        """
        weights_path = self.get_model_weights_path(model_name)
        return weights_path.exists()

