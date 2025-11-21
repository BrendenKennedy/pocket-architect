"""Tests for package initialization"""

import pytest
import sys
from pathlib import Path

# Add scripts directory to path
scripts_dir = Path(__file__).parent.parent / "legacy-infrastructure" / "scripts"
sys.path.insert(0, str(scripts_dir))


class TestPackageInit:
    """Test package __init__.py"""
    
    def test_package_imports(self):
        """Test that package can be imported"""
        import cvat
        assert cvat is not None
    
    def test_package_version(self):
        """Test that package has version defined"""
        import cvat
        assert hasattr(cvat, '__version__')
        assert cvat.__version__ == "1.0.0"
    
    def test_package_submodules_importable(self):
        """Test that all submodules can be imported"""
        from cvat import aws
        from cvat import config
        from cvat import terraform
        from cvat import utils
        from cvat import setup
        from cvat import up
        from cvat import down
        from cvat import checkpoint
        
        assert aws is not None
        assert config is not None
        assert terraform is not None
        assert utils is not None
        assert setup is not None
        assert up is not None
        assert down is not None
        assert checkpoint is not None
    
    def test_package_main_classes_importable(self):
        """Test that main classes can be imported"""
        from cvat.aws import AWSClients
        from cvat.config import parse_tfvars, get_config_value, update_config_value, create_tfvars
        from cvat.terraform import (
            run_terraform_command,
            is_terraform_initialized,
            terraform_init,
            terraform_plan,
            terraform_apply,
            terraform_output,
            terraform_import,
            terraform_state_show,
        )
        from cvat.utils import (
            get_project_paths,
            ensure_symlink,
            get_terraform_state_path,
            get_tfvars_path,
        )
        
        # Verify classes are importable
        assert AWSClients is not None
        
        # Verify functions are callable
        assert callable(parse_tfvars)
        assert callable(get_config_value)
        assert callable(update_config_value)
        assert callable(create_tfvars)
        assert callable(run_terraform_command)
        assert callable(is_terraform_initialized)
        assert callable(terraform_init)
        assert callable(terraform_plan)
        assert callable(terraform_apply)
        assert callable(terraform_output)
        assert callable(terraform_import)
        assert callable(terraform_state_show)
        assert callable(get_project_paths)
        assert callable(ensure_symlink)
        assert callable(get_terraform_state_path)
        assert callable(get_tfvars_path)

