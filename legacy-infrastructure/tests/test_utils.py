"""Tests for utils module"""

import pytest
import sys
from pathlib import Path

# Add scripts directory to path
scripts_dir = Path(__file__).parent.parent / "legacy-infrastructure" / "scripts"
sys.path.insert(0, str(scripts_dir))

from cvat.utils import (
    get_project_paths,
    ensure_symlink,
    get_terraform_state_path,
    get_tfvars_path,
)


class TestGetProjectPaths:
    """Test project path resolution"""
    
    def test_get_project_paths_structure(self):
        """Test that get_project_paths returns correct structure"""
        # This test verifies the function returns the expected tuple structure
        # The actual paths depend on where the test is run from
        proj_root, terraform_dir, configs_dir = get_project_paths()
        
        # Verify return types
        assert isinstance(proj_root, Path)
        assert isinstance(terraform_dir, Path)
        assert isinstance(configs_dir, Path)
        
        # Verify directory names
        assert terraform_dir.name == "terraform"
        assert configs_dir.name == "configs"


class TestEnsureSymlink:
    """Test symlink creation"""
    
    def test_ensure_symlink_creates_new(self, tmp_path):
        """Test creating new symlink"""
        source = tmp_path / "source.txt"
        target = tmp_path / "target.txt"
        source.write_text("content")
        
        ensure_symlink(source, target)
        
        assert target.is_symlink()
        assert target.readlink() == source.relative_to(target.parent.parent)
    
    def test_ensure_symlink_replaces_existing_file(self, tmp_path):
        """Test replacing existing file with symlink"""
        source = tmp_path / "source.txt"
        target = tmp_path / "target.txt"
        source.write_text("content")
        target.write_text("old content")
        
        ensure_symlink(source, target)
        
        assert target.is_symlink()
        assert not target.is_file() or target.is_symlink()
    
    def test_ensure_symlink_preserves_existing_symlink(self, tmp_path):
        """Test preserving existing symlink"""
        source = tmp_path / "source.txt"
        target = tmp_path / "target.txt"
        source.write_text("content")
        
        # Create symlink first
        target.symlink_to(source)
        
        # Call ensure_symlink again
        ensure_symlink(source, target)
        
        # Should still be a symlink
        assert target.is_symlink()


class TestGetTerraformStatePath:
    """Test terraform state path resolution"""
    
    def test_get_terraform_state_path(self, terraform_dir):
        """Test getting terraform state path"""
        state_path = get_terraform_state_path(terraform_dir)
        
        assert state_path.name == "terraform.tfstate"
        assert "state" in str(state_path)


class TestGetTfvarsPath:
    """Test terraform.tfvars path resolution"""
    
    def test_get_tfvars_path(self, configs_dir):
        """Test getting terraform.tfvars path"""
        tfvars_path = get_tfvars_path(configs_dir)
        
        assert tfvars_path.name == "terraform.tfvars"
        assert tfvars_path.parent == configs_dir

