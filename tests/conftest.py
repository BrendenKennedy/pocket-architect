"""Pytest configuration and shared fixtures."""

import pytest
from pathlib import Path
from typing import Generator
import tempfile
import shutil


@pytest.fixture
def temp_dir() -> Generator[Path, None, None]:
    """Create a temporary directory for tests."""
    temp_path = Path(tempfile.mkdtemp())
    yield temp_path
    shutil.rmtree(temp_path, ignore_errors=True)


@pytest.fixture
def sample_blueprint_yaml(temp_dir: Path) -> Path:
    """Create a sample blueprint YAML file."""
    blueprint_path = temp_dir / "test-blueprint.yaml"
    blueprint_path.write_text(
        """aws_region: us-east-2
subnet_id: subnet-0123456789abcdef0
ssh_key_name: test-key
my_ip_cidr: 1.2.3.4/32
enable_https: true
domain_name: test.example.com
instance_type: t3.xlarge
use_spot: true
efs_enabled: true
"""
    )
    return blueprint_path


@pytest.fixture
def sample_blueprint_json(temp_dir: Path) -> Path:
    """Create a sample blueprint JSON file."""
    blueprint_path = temp_dir / "test-blueprint.json"
    blueprint_path.write_text(
        """{
  "aws_region": "us-east-2",
  "subnet_id": "subnet-0123456789abcdef0",
  "ssh_key_name": "test-key",
  "my_ip_cidr": "1.2.3.4/32",
  "enable_https": true,
  "domain_name": "test.example.com",
  "instance_type": "t3.xlarge",
  "use_spot": true,
  "efs_enabled": true
}
"""
    )
    return blueprint_path

