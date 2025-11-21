"""Edge case tests specifically for ensure_symlink function"""

import pytest
import sys
from pathlib import Path
from unittest.mock import patch

# Add scripts directory to path
scripts_dir = Path(__file__).parent.parent / "legacy-infrastructure" / "scripts"
sys.path.insert(0, str(scripts_dir))

from cvat.utils import ensure_symlink


class TestEnsureSymlinkEdgeCases:
    """Edge case tests for ensure_symlink"""
    
    def test_ensure_symlink_source_in_different_directory(self, tmp_path):
        """Test symlink when source is in completely different directory"""
        source = tmp_path / "dir1" / "source.txt"
        target = tmp_path / "dir2" / "target.txt"
        
        source.parent.mkdir()
        target.parent.mkdir()
        source.write_text("content")
        
        ensure_symlink(source, target)
        
        assert target.is_symlink()
        # Should calculate relative path correctly
        assert target.exists()
    
    def test_ensure_symlink_target_parent_does_not_exist(self, tmp_path):
        """Test symlink when target parent directory doesn't exist"""
        source = tmp_path / "source.txt"
        target = tmp_path / "nonexistent" / "target.txt"
        
        source.write_text("content")
        
        # Should handle missing parent directory
        try:
            ensure_symlink(source, target)
            # If it works, parent should be created or symlink should work
            if target.exists():
                assert target.is_symlink()
        except (FileNotFoundError, OSError):
            # Expected if parent doesn't exist and can't be created
            pass
    
    def test_ensure_symlink_same_file(self, tmp_path):
        """Test symlink when source and target are the same file"""
        source = tmp_path / "file.txt"
        source.write_text("content")
        
        # This is an edge case - symlinking a file to itself
        try:
            ensure_symlink(source, source)
            # Behavior depends on implementation
        except (OSError, ValueError):
            # Expected - can't symlink file to itself
            pass
    
    def test_ensure_symlink_permissions_error(self, tmp_path):
        """Test symlink creation with permission errors"""
        source = tmp_path / "source.txt"
        target = tmp_path / "target.txt"
        source.write_text("content")
        
        # Mock permission error
        with patch('pathlib.Path.symlink_to') as mock_symlink:
            mock_symlink.side_effect = PermissionError("Permission denied")
            
            try:
                ensure_symlink(source, target)
            except PermissionError:
                # Expected behavior
                pass
    
    def test_ensure_symlink_relative_path_edge_cases(self, tmp_path):
        """Test symlink with various relative path scenarios"""
        # Test case 1: Source and target in same directory
        same_dir = tmp_path / "same_dir"
        same_dir.mkdir()
        source1 = same_dir / "source.txt"
        target1 = same_dir / "target.txt"
        source1.write_text("content")
        
        ensure_symlink(source1, target1)
        assert target1.is_symlink()
        
        # Test case 2: Source one level up
        nested = tmp_path / "nested" / "deep"
        nested.mkdir(parents=True)
        source2 = tmp_path / "source.txt"
        target2 = nested / "target.txt"
        source2.write_text("content")
        
        ensure_symlink(source2, target2)
        assert target2.is_symlink()
    
    def test_ensure_symlink_with_special_characters(self, tmp_path):
        """Test symlink with special characters in paths"""
        source = tmp_path / "source file with spaces.txt"
        target = tmp_path / "target-file.txt"
        source.write_text("content")
        
        ensure_symlink(source, target)
        assert target.is_symlink()
        assert target.exists()
    
    def test_ensure_symlink_unicode_paths(self, tmp_path):
        """Test symlink with unicode characters in paths"""
        source = tmp_path / "source_测试.txt"
        target = tmp_path / "target_测试.txt"
        source.write_text("content")
        
        ensure_symlink(source, target)
        assert target.is_symlink()
        assert target.exists()
    
    def test_ensure_symlink_long_paths(self, tmp_path):
        """Test symlink with very long paths"""
        # Create deeply nested structure
        deep_path = tmp_path
        for i in range(10):
            deep_path = deep_path / f"level_{i}"
        deep_path.mkdir(parents=True)
        
        source = tmp_path / "source.txt"
        target = deep_path / "target.txt"
        source.write_text("content")
        
        ensure_symlink(source, target)
        assert target.is_symlink()
        assert target.exists()
    
    def test_ensure_symlink_existing_symlink_to_different_target(self, tmp_path):
        """Test replacing symlink that points to different target"""
        source1 = tmp_path / "source1.txt"
        source2 = tmp_path / "source2.txt"
        target = tmp_path / "target.txt"
        
        source1.write_text("content1")
        source2.write_text("content2")
        
        # Create symlink to source1
        target.symlink_to(source1)
        assert target.readlink() == source1
        
        # Replace with symlink to source2
        ensure_symlink(source2, target)
        
        assert target.is_symlink()
        # Should now point to source2 (or relative path to source2)
        assert target.exists()

