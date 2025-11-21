"""Tests for Local provider."""

import pytest
from pathlib import Path

from mlcloud.providers.local.client import LocalProvider
from mlcloud.core.types import Provider


@pytest.fixture
def session_id():
    """Test session ID."""
    return "test-session-123"


def test_local_provider_init(session_id):
    """Test LocalProvider initialization."""
    # This will fail if Docker is not available, which is expected
    try:
        provider = LocalProvider(session_id)
        assert provider.provider == Provider.LOCAL
        assert provider.session_id == session_id
    except RuntimeError as e:
        if "Docker is not available" in str(e):
            pytest.skip("Docker not available")
        raise


def test_local_provider_cost_estimate(session_id):
    """Test LocalProvider cost estimation."""
    provider = LocalProvider(session_id)
    estimate = provider.cost_estimate("cvat")
    
    assert estimate.hourly_rate_usd == 0.0
    assert estimate.monthly_projection_usd == 0.0
    assert estimate.provider == Provider.LOCAL

