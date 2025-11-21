"""Cost calculation and normalization."""

from typing import Dict, Any
from mlcloud.core.types import Provider, CostEstimate


def normalize_cost_estimate(estimate: CostEstimate) -> Dict[str, Any]:
    """Normalize cost estimate for display.
    
    Args:
        estimate: Cost estimate to normalize
        
    Returns:
        Normalized cost data dictionary
    """
    return {
        "provider": estimate.provider.value,
        "resource_type": estimate.resource_type,
        "hourly_usd": estimate.hourly_rate_usd,
        "monthly_usd": estimate.monthly_projection_usd,
        "details": estimate.details,
    }


def calculate_monthly_projection(hourly_rate: float) -> float:
    """Calculate monthly cost projection from hourly rate.
    
    Args:
        hourly_rate: Cost per hour in USD
        
    Returns:
        Projected monthly cost (hourly * 730 hours)
    """
    return hourly_rate * 730.0


def format_cost_display(estimate: CostEstimate, include_details: bool = False) -> str:
    """Format cost estimate for Rich display.
    
    Args:
        estimate: Cost estimate to format
        include_details: Include provider-specific details
        
    Returns:
        Formatted cost string
    """
    parts = [
        f"${estimate.hourly_rate_usd:.4f}/hour",
        f"${estimate.monthly_projection_usd:.2f}/month (projected)",
    ]
    
    if include_details and estimate.details:
        details_str = ", ".join(f"{k}: {v}" for k, v in estimate.details.items())
        parts.append(f"({details_str})")
    
    return " | ".join(parts)

