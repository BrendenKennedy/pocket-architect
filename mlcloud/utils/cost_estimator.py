"""Provider-specific pricing lookups and cost estimation."""

from typing import Optional, Dict, Any
from mlcloud.core.types import Provider, CostEstimate
from mlcloud.core.cost import calculate_monthly_projection


class CostEstimator:
    """Estimates costs for different providers and resource types."""

    # AWS pricing (us-east-2, approximate as of 2024)
    AWS_PRICING = {
        "cvat": {
            "instance_type": "t3.xlarge",
            "hourly_usd": 0.1664,  # t3.xlarge on-demand
            "spot_hourly_usd": 0.0500,  # ~30% of on-demand
            "efs_gb_month": 0.30,  # EFS Standard storage
        },
        "worker": {
            "instance_type": "g4dn.xlarge",
            "hourly_usd": 0.526,  # g4dn.xlarge on-demand
            "spot_hourly_usd": 0.158,  # ~30% of on-demand
        },
        "training": {
            "instance_type": "p3.2xlarge",
            "hourly_usd": 3.06,  # p3.2xlarge on-demand
            "spot_hourly_usd": 0.918,  # ~30% of on-demand
        },
        "alb": {
            "hourly_usd": 0.0225,  # ~$16.50/month
        },
    }

    # CoreWeave pricing (approximate)
    COREWEAVE_PRICING = {
        "cvat": {
            "instance_type": "RTX3090",
            "hourly_usd": 0.50,
        },
        "worker": {
            "instance_type": "RTX4090",
            "hourly_usd": 0.75,
        },
        "training": {
            "instance_type": "A100",
            "hourly_usd": 2.50,
        },
    }

    # RunPod pricing (approximate, Secure Cloud)
    RUNPOD_PRICING = {
        "cvat": {
            "instance_type": "RTX 3090",
            "hourly_usd": 0.49,
        },
        "worker": {
            "instance_type": "RTX 4090",
            "hourly_usd": 0.74,
        },
        "training": {
            "instance_type": "A100 40GB",
            "hourly_usd": 2.29,
        },
    }

    @classmethod
    def estimate(
        cls,
        provider: Provider,
        resource_type: str,
        use_spot: bool = True,
        **kwargs: Any,
    ) -> CostEstimate:
        """Estimate cost for a resource.
        
        Args:
            provider: Cloud provider
            resource_type: Type of resource ("cvat", "worker", "training")
            use_spot: Use spot/preemptible instances (if applicable)
            **kwargs: Provider-specific parameters
            
        Returns:
            Cost estimate
        """
        if provider == Provider.AWS:
            return cls._estimate_aws(resource_type, use_spot, **kwargs)
        elif provider == Provider.COREWEAVE:
            return cls._estimate_coreweave(resource_type, **kwargs)
        elif provider == Provider.RUNPOD:
            return cls._estimate_runpod(resource_type, **kwargs)
        elif provider == Provider.LOCAL:
            return cls._estimate_local(resource_type, **kwargs)
        else:
            raise ValueError(f"Unsupported provider: {provider}")

    @classmethod
    def _estimate_aws(
        cls,
        resource_type: str,
        use_spot: bool,
        **kwargs: Any,
    ) -> CostEstimate:
        """Estimate AWS cost."""
        pricing = cls.AWS_PRICING.get(resource_type, {})
        
        if not pricing:
            hourly_rate = 0.0
            details = {"error": "Unknown resource type"}
        else:
            # Use spot pricing if requested and available
            if use_spot and "spot_hourly_usd" in pricing:
                hourly_rate = pricing["spot_hourly_usd"]
                details = {
                    "instance_type": pricing.get("instance_type", "unknown"),
                    "pricing_model": "spot",
                }
            else:
                hourly_rate = pricing.get("hourly_usd", 0.0)
                details = {
                    "instance_type": pricing.get("instance_type", "unknown"),
                    "pricing_model": "on-demand",
                }
            
            # Add storage costs for CVAT if applicable
            if resource_type == "cvat" and "efs_gb_month" in pricing:
                storage_gb = kwargs.get("storage_gb", 100)
                storage_hourly = (pricing["efs_gb_month"] * storage_gb) / 730.0
                hourly_rate += storage_hourly
                details["storage_gb"] = storage_gb
                details["storage_hourly_usd"] = storage_hourly
        
        monthly = calculate_monthly_projection(hourly_rate)
        
        return CostEstimate(
            hourly_rate_usd=hourly_rate,
            monthly_projection_usd=monthly,
            provider=Provider.AWS,
            resource_type=resource_type,
            details=details,
        )

    @classmethod
    def _estimate_coreweave(
        cls,
        resource_type: str,
        **kwargs: Any,
    ) -> CostEstimate:
        """Estimate CoreWeave cost."""
        pricing = cls.COREWEAVE_PRICING.get(resource_type, {})
        
        if not pricing:
            hourly_rate = 0.0
            details = {"error": "Unknown resource type"}
        else:
            hourly_rate = pricing.get("hourly_usd", 0.0)
            details = {
                "instance_type": pricing.get("instance_type", "unknown"),
            }
        
        monthly = calculate_monthly_projection(hourly_rate)
        
        return CostEstimate(
            hourly_rate_usd=hourly_rate,
            monthly_projection_usd=monthly,
            provider=Provider.COREWEAVE,
            resource_type=resource_type,
            details=details,
        )

    @classmethod
    def _estimate_runpod(
        cls,
        resource_type: str,
        **kwargs: Any,
    ) -> CostEstimate:
        """Estimate RunPod cost."""
        pricing = cls.RUNPOD_PRICING.get(resource_type, {})
        
        if not pricing:
            hourly_rate = 0.0
            details = {"error": "Unknown resource type"}
        else:
            hourly_rate = pricing.get("hourly_usd", 0.0)
            details = {
                "instance_type": pricing.get("instance_type", "unknown"),
            }
        
        monthly = calculate_monthly_projection(hourly_rate)
        
        return CostEstimate(
            hourly_rate_usd=hourly_rate,
            monthly_projection_usd=monthly,
            provider=Provider.RUNPOD,
            resource_type=resource_type,
            details=details,
        )

    @classmethod
    def _estimate_local(
        cls,
        resource_type: str,
        **kwargs: Any,
    ) -> CostEstimate:
        """Estimate local cost (always $0)."""
        return CostEstimate(
            hourly_rate_usd=0.0,
            monthly_projection_usd=0.0,
            provider=Provider.LOCAL,
            resource_type=resource_type,
            details={"note": "Local provider has no cloud costs"},
        )

