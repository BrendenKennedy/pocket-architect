"""Unified inference interface with model-specific adapters."""

from pathlib import Path
from typing import List, Dict, Any, Optional, Union
from PIL import Image
import numpy as np

from pocket_architect.models.registry import ModelRegistry, ModelMetadata
from pocket_architect.models.downloader import ModelDownloader


class InferenceEngine:
    """Unified inference engine for all models."""

    def __init__(self, registry: Optional[ModelRegistry] = None):
        """Initialize inference engine.
        
        Args:
            registry: Model registry instance
        """
        if registry is None:
            registry = ModelRegistry()
        self.registry = registry
        self.downloader = ModelDownloader(registry)
        self._loaded_models: Dict[str, Any] = {}

    def load_model(self, model_name: str) -> Any:
        """Load model into memory.
        
        Args:
            model_name: Model name
            
        Returns:
            Loaded model object
        """
        if model_name in self._loaded_models:
            return self._loaded_models[model_name]
        
        model = self.registry.get_model(model_name)
        
        # Download if not cached
        if not self.registry.is_model_cached(model_name):
            self.downloader.download_model(model_name)
        
        # Load model based on type
        if model.model_type.value == "sam2":
            from pocket_architect.models.adapters.sam2 import SAM2Adapter
            adapter = SAM2Adapter(model)
        elif model.model_type.value.startswith("yolo11"):
            from pocket_architect.models.adapters.yolo import YOLO11Adapter
            adapter = YOLO11Adapter(model)
        elif model.model_type.value == "grounding-dino":
            from pocket_architect.models.adapters.grounding_dino import GroundingDINOAdapter
            adapter = GroundingDINOAdapter(model)
        elif model.model_type.value == "detectron2":
            from pocket_architect.models.adapters.detectron2 import Detectron2Adapter
            adapter = Detectron2Adapter(model)
        else:
            raise ValueError(f"Unknown model type: {model.model_type}")
        
        loaded_model = adapter.load()
        self._loaded_models[model_name] = loaded_model
        return loaded_model

    def predict(
        self,
        model_name: str,
        image: Union[Image.Image, Path, str],
        **kwargs: Any,
    ) -> Dict[str, Any]:
        """Run inference on an image.
        
        Args:
            model_name: Model name
            image: Input image (PIL Image, Path, or file path)
            **kwargs: Model-specific parameters
            
        Returns:
            Prediction results dictionary
        """
        model = self.load_model(model_name)
        metadata = self.registry.get_model(model_name)
        
        # Load image if path provided
        if isinstance(image, (str, Path)):
            image = Image.open(image)
        
        # Get adapter and run inference
        if metadata.model_type.value == "sam2":
            from pocket_architect.models.adapters.sam2 import SAM2Adapter
            adapter = SAM2Adapter(metadata)
        elif metadata.model_type.value.startswith("yolo11"):
            from pocket_architect.models.adapters.yolo import YOLO11Adapter
            adapter = YOLO11Adapter(metadata)
        elif metadata.model_type.value == "grounding-dino":
            from pocket_architect.models.adapters.grounding_dino import GroundingDINOAdapter
            adapter = GroundingDINOAdapter(metadata)
        elif metadata.model_type.value == "detectron2":
            from pocket_architect.models.adapters.detectron2 import Detectron2Adapter
            adapter = Detectron2Adapter(metadata)
        else:
            raise ValueError(f"Unknown model type: {metadata.model_type}")
        
        return adapter.predict(model, image, **kwargs)


def convert_to_cvat_format(predictions: Dict[str, Any], model_type: str) -> List[Dict[str, Any]]:
    """Convert model predictions to CVAT-compatible format.
    
    Args:
        predictions: Raw model predictions
        model_type: Model type
        
    Returns:
        List of CVAT annotations
    """
    # CVAT format conversion logic
    # This would convert model-specific output to CVAT annotation format
    annotations = []
    
    if model_type in ("sam2", "detectron2"):
        # Segmentation masks
        masks = predictions.get("masks", [])
        for mask in masks:
            annotations.append({
                "type": "polygon",
                "points": mask["points"],
                "label": mask.get("label", "object"),
            })
    
    elif model_type.startswith("yolo11"):
        # Bounding boxes or segmentation
        boxes = predictions.get("boxes", [])
        for box in boxes:
            annotations.append({
                "type": "rectangle" if model_type.endswith("obb") else "polygon",
                "points": box["points"],
                "label": box.get("label", "object"),
                "confidence": box.get("confidence", 1.0),
            })
    
    return annotations

