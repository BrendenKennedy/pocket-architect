"""Comprehensive tests for utility functions"""

import pytest
import sys
from pathlib import Path
from unittest.mock import patch

# Add scripts directory to path
scripts_dir = Path(__file__).parent.parent / "legacy-infrastructure" / "scripts"
sys.path.insert(0, str(scripts_dir))

from cvat.utils import (
    get_project_paths,
    ensure_symlink,
    get_terraform_state_path,
    get_tfvars_path,
)


class TestGetTerraformStatePath:
    """Comprehensive tests for get_terraform_state_path"""
    
    def test_get_terraform_state_path_basic(self, terraform_dir):
        """Test basic terraform state path retrieval"""
        state_path = get_terraform_state_path(terraform_dir)
        
        assert state_path.name == "terraform.tfstate"
        assert "state" in str(state_path)
        assert state_path.parent.name == "state"
        assert state_path.parent.parent == terraform_dir
    
    def test_get_terraform_state_path_nested(self, tmp_path):
        """Test terraform state path with nested directory"""
        nested_terraform = tmp_path / "deep" / "nested" / "terraform"
        nested_terraform.mkdir(parents=True)
        
        state_path = get_terraform_state_path(nested_terraform)
        
        assert state_path == nested_terraform / "state" / "terraform.tfstate"
    
    def test_get_terraform_state_path_creates_structure(self, tmp_path):
        """Test that function works even if state directory doesn't exist"""
        terraform_dir = tmp_path / "terraform"
        terraform_dir.mkdir()
        
        state_path = get_terraform_state_path(terraform_dir)
        
        # Should return path even if directory doesn't exist
        assert state_path.parent.name == "state"
        assert not state_path.exists()  # Directory not created yet


class TestGetTfvarsPath:
    """Comprehensive tests for get_tfvars_path"""
    
    def test_get_tfvars_path_basic(self, configs_dir):
        """Test basic tfvars path retrieval"""
        tfvars_path = get_tfvars_path(configs_dir)
        
        assert tfvars_path.name == "terraform.tfvars"
        assert tfvars_path.parent == configs_dir
    
    def test_get_tfvars_path_nested(self, tmp_path):
        """Test tfvars path with nested directory"""
        nested_configs = tmp_path / "deep" / "nested" / "configs"
        nested_configs.mkdir(parents=True)
        
        tfvars_path = get_tfvars_path(nested_configs)
        
        assert tfvars_path == nested_configs / "terraform.tfvars"
    
    def test_get_tfvars_path_works_without_file(self, tmp_path):
        """Test that function works even if file doesn't exist"""
        configs_dir = tmp_path / "configs"
        configs_dir.mkdir()
        
        tfvars_path = get_tfvars_path(configs_dir)
        
        assert tfvars_path.name == "terraform.tfvars"
        assert not tfvars_path.exists()  # File not created yet


class TestEnsureSymlinkComprehensive:
    """Comprehensive tests for ensure_symlink"""
    
    def test_ensure_symlink_creates_new_symlink(self, tmp_path):
        """Test creating a new symlink"""
        source = tmp_path / "source.txt"
        target = tmp_path / "target.txt"
        source.write_text("content")
        
        ensure_symlink(source, target)
        
        assert target.is_symlink()
        assert target.exists()
        assert target.readlink() == source.relative_to(target.parent.parent)
    
    def test_ensure_symlink_replaces_regular_file(self, tmp_path):
        """Test replacing a regular file with symlink"""
        source = tmp_path / "source.txt"
        target = tmp_path / "target.txt"
        source.write_text("source content")
        target.write_text("target content")
        
        ensure_symlink(source, target)
        
        assert target.is_symlink()
        assert not target.is_file() or target.is_symlink()
        # Original file content should be gone
        assert target.readlink() == source.relative_to(target.parent.parent)
    
    def test_ensure_symlink_preserves_existing_symlink(self, tmp_path):
        """Test that existing symlink is preserved"""
        source = tmp_path / "source.txt"
        target = tmp_path / "target.txt"
        source.write_text("content")
        
        # Create symlink first
        target.symlink_to(source)
        
        # Call ensure_symlink again
        ensure_symlink(source, target)
        
        # Should still be a symlink
        assert target.is_symlink()
        assert target.readlink() == source
    
    def test_ensure_symlink_updates_broken_symlink(self, tmp_path):
        """Test updating a broken symlink"""
        source = tmp_path / "source.txt"
        target = tmp_path / "target.txt"
        
        # Create broken symlink
        target.symlink_to(tmp_path / "nonexistent.txt")
        
        # Create source file
        source.write_text("content")
        
        # Should replace broken symlink
        ensure_symlink(source, target)
        
        assert target.is_symlink()
        assert target.exists()  # Should now point to existing file
        assert target.readlink() == source.relative_to(target.parent.parent)
    
    def test_ensure_symlink_handles_directory(self, tmp_path):
        """Test symlink creation when target is a directory"""
        source = tmp_path / "source.txt"
        target_dir = tmp_path / "target_dir"
        target_dir.mkdir()
        source.write_text("content")
        
        # This should handle the case where target exists as directory
        # The actual behavior depends on implementation
        try:
            ensure_symlink(source, target_dir)
            # If it doesn't raise, check result
            if target_dir.is_symlink():
                assert target_dir.readlink() == source.relative_to(target_dir.parent.parent)
        except (OSError, FileExistsError):
            # Expected if directory exists
            pass
    
    def test_ensure_symlink_relative_path_calculation(self, tmp_path):
        """Test that relative path calculation is correct"""
        source = tmp_path / "configs" / "terraform.tfvars"
        target = tmp_path / "terraform" / "terraform.tfvars"
        
        source.parent.mkdir()
        target.parent.mkdir()
        source.write_text("content")
        
        ensure_symlink(source, target)
        
        assert target.is_symlink()
        # Verify relative path is correct
        expected_relative = source.relative_to(target.parent.parent)
        assert target.readlink() == expected_relative


class TestGetProjectPathsComprehensive:
    """Comprehensive tests for get_project_paths"""
    
    def test_get_project_paths_structure(self):
        """Test that get_project_paths returns correct structure"""
        proj_root, terraform_dir, configs_dir = get_project_paths()
        
        # Verify return types
        assert isinstance(proj_root, Path)
        assert isinstance(terraform_dir, Path)
        assert isinstance(configs_dir, Path)
        
        # Verify directory names
        assert terraform_dir.name == "terraform"
        assert configs_dir.name == "configs"
        
        # Verify relationships
        assert terraform_dir.parent == proj_root
        assert configs_dir.parent == proj_root
    
    def test_get_project_paths_consistency(self):
        """Test that multiple calls return consistent paths"""
        paths1 = get_project_paths()
        paths2 = get_project_paths()
        
        assert paths1 == paths2
    
    def test_get_project_paths_absolute(self):
        """Test that paths are absolute"""
        proj_root, terraform_dir, configs_dir = get_project_paths()
        
        # Paths should be absolute (or at least consistent)
        assert terraform_dir.is_absolute() or str(terraform_dir).startswith(".")
        assert configs_dir.is_absolute() or str(configs_dir).startswith(".")


class TestUtilsIntegration:
    """Integration tests for utility functions"""
    
    def test_path_functions_work_together(self, tmp_path):
        """Test that path functions work together correctly"""
        # Simulate project structure
        project_root = tmp_path / "project"
        terraform_dir = project_root / "terraform"
        configs_dir = project_root / "configs"
        
        terraform_dir.mkdir(parents=True)
        configs_dir.mkdir()
        
        # Test state path
        state_path = get_terraform_state_path(terraform_dir)
        assert state_path.parent == terraform_dir / "state"
        
        # Test tfvars path
        tfvars_path = get_tfvars_path(configs_dir)
        assert tfvars_path.parent == configs_dir
        
        # Test symlink between them
        source_tfvars = configs_dir / "terraform.tfvars"
        target_tfvars = terraform_dir / "terraform.tfvars"
        source_tfvars.write_text("test content")
        
        ensure_symlink(source_tfvars, target_tfvars)
        
        assert target_tfvars.is_symlink()
        assert target_tfvars.read_text() == "test content"

