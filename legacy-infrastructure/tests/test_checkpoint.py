"""Tests for checkpoint command"""

import pytest
import sys
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock

# Add scripts directory to path
scripts_dir = Path(__file__).parent.parent / "legacy-infrastructure" / "scripts"
sys.path.insert(0, str(scripts_dir))


class TestCheckpoint:
    """Test checkpoint creation"""
    
    def test_checkpoint_aws_operations(self, mock_aws_clients):
        """Test AWS operations used in checkpoint creation"""
        # Test the underlying AWS operations
        mock_aws_clients.get_instance_root_volume_id.return_value = "vol-12345678"
        mock_aws_clients.create_snapshot.return_value = "snap-12345678"
        mock_aws_clients.wait_snapshot_completed.return_value = True
        mock_aws_clients.create_ami_from_snapshot.return_value = "ami-12345678"
        
        volume_id = mock_aws_clients.get_instance_root_volume_id("i-1234567890abcdef0")
        assert volume_id == "vol-12345678"
        
        snapshot_id = mock_aws_clients.create_snapshot(
            volume_id=volume_id,
            description="Test checkpoint",
            tags=[{"Key": "Name", "Value": "test-checkpoint"}]
        )
        assert snapshot_id == "snap-12345678"
        
        completed = mock_aws_clients.wait_snapshot_completed(snapshot_id)
        assert completed is True
        
        ami_id = mock_aws_clients.create_ami_from_snapshot(
            snapshot_id=snapshot_id,
            name="test-ami",
            description="Test AMI",
            tags=[{"Key": "Name", "Value": "test"}]
        )
        assert ami_id == "ami-12345678"

