"""
Custom exceptions for Pocket Architect.
"""


class PocketArchitectException(Exception):
    """Base exception for all Pocket Architect errors."""
    pass


class AWSException(PocketArchitectException):
    """AWS-specific errors."""
    pass


class GCPException(PocketArchitectException):
    """GCP-specific errors."""
    pass


class AzureException(PocketArchitectException):
    """Azure-specific errors."""
    pass


class ConfigurationError(PocketArchitectException):
    """Configuration errors (missing credentials, invalid config, etc.)."""
    pass


class ResourceNotFoundError(PocketArchitectException):
    """Resource not found error."""

    def __init__(self, resource_type: str, resource_id: str):
        self.resource_type = resource_type
        self.resource_id = resource_id
        super().__init__(f"{resource_type} with ID '{resource_id}' not found")


class ValidationError(PocketArchitectException):
    """Validation errors for user input or data."""
    pass


class DatabaseError(PocketArchitectException):
    """Database operation errors."""
    pass


class ProviderError(PocketArchitectException):
    """Cloud provider operation errors."""
    pass
