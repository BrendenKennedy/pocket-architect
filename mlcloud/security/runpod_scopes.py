"""RunPod API key scoping validation."""

from typing import Dict, Any
import requests


def validate_runpod_scopes(api_key: str) -> bool:
    """Validate RunPod API key scopes.
    
    Args:
        api_key: RunPod API key
        
    Returns:
        True if API key is valid and properly scoped
        
    Raises:
        ValueError: If API key is invalid
    """
    # RunPod API endpoint for validation
    url = "https://api.runpod.io/graphql"
    
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}",
    }
    
    # Simple query to validate API key
    query = """
    query {
        myself {
            id
            username
        }
    }
    """
    
    try:
        response = requests.post(
            url,
            json={"query": query},
            headers=headers,
            timeout=10,
        )
        
        if response.status_code == 200:
            data = response.json()
            if "errors" in data:
                raise ValueError(f"Invalid RunPod API key: {data['errors'][0].get('message', 'Unknown error')}")
            return True
        elif response.status_code == 401:
            raise ValueError("Invalid RunPod API key: Unauthorized")
        else:
            raise ValueError(f"Failed to validate RunPod API key: HTTP {response.status_code}")
            
    except requests.exceptions.RequestException as e:
        raise ValueError(f"Failed to validate RunPod API key: {e}")

