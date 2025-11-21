"""CoreWeave Kubernetes RBAC templates."""

from typing import Dict, Any


def create_coreweave_rbac(namespace: str = "mlcloud") -> Dict[str, Any]:
    """Create Kubernetes RBAC resources for CoreWeave.
    
    Args:
        namespace: Kubernetes namespace
        
    Returns:
        Dictionary with RBAC resource definitions
    """
    return {
        "apiVersion": "v1",
        "kind": "Namespace",
        "metadata": {
            "name": namespace,
            "labels": {
                "created-by": "mlcloud",
            },
        },
    }
    # Additional RBAC resources (Role, RoleBinding, ServiceAccount) would be added here


def create_coreweave_service_account(namespace: str = "mlcloud") -> Dict[str, Any]:
    """Create Kubernetes ServiceAccount for CoreWeave.
    
    Args:
        namespace: Kubernetes namespace
        
    Returns:
        ServiceAccount resource definition
    """
    return {
        "apiVersion": "v1",
        "kind": "ServiceAccount",
        "metadata": {
            "name": "mlcloud-service-account",
            "namespace": namespace,
            "labels": {
                "created-by": "mlcloud",
            },
        },
    }

