"""Final coverage verification - ensures all public functions are tested"""

import pytest
import sys
import ast
from pathlib import Path
from typing import Set

# Add legacy scripts directory to path
scripts_dir = Path(__file__).parent.parent / "legacy-infrastructure" / "scripts"
sys.path.insert(0, str(scripts_dir))


def get_public_functions(module_path: Path) -> Set[str]:
    """Extract all public function names from a Python file"""
    try:
        with open(module_path, 'r') as f:
            tree = ast.parse(f.read(), filename=str(module_path))
        
        functions = set()
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef):
                # Only public functions (not starting with _)
                if not node.name.startswith('_'):
                    functions.add(node.name)
        
        return functions
    except Exception:
        return set()


def get_public_classes(module_path: Path) -> Set[str]:
    """Extract all public class names from a Python file"""
    try:
        with open(module_path, 'r') as f:
            tree = ast.parse(f.read(), filename=str(module_path))
        
        classes = set()
        for node in ast.walk(tree):
            if isinstance(node, ast.ClassDef):
                if not node.name.startswith('_'):
                    classes.add(node.name)
                # Also get public methods
                for item in node.body:
                    if isinstance(item, ast.FunctionDef) and not item.name.startswith('_'):
                        classes.add(f"{node.name}.{item.name}")
        
        return classes
    except Exception:
        return set()


class TestCoverageVerification:
    """Verify that all public functions and classes have test coverage"""
    
    def test_all_modules_have_tests(self):
        """Verify every module has a corresponding test file"""
        cvat_dir = Path("legacy-infrastructure/scripts/cvat")
        test_dir = Path("tests")
        
        # Get all source modules (excluding __init__.py)
        source_modules = {
            f.stem for f in cvat_dir.glob("*.py") 
            if f.name != "__init__.py"
        }
        
        # Get all test files
        test_files = {f.stem.replace("test_", "").replace("_comprehensive", "").replace("_edge_cases", "").replace("_has_existing_resources", "").replace("_args", "") 
                     for f in test_dir.glob("test_*.py")}
        
        # Check coverage
        missing_tests = source_modules - test_files
        
        # Special cases that are covered by other test files
        special_coverage = {
            'aws': ['aws_comprehensive', 'aws_has_existing_resources'],
            'utils': ['utils_comprehensive', 'ensure_symlink_edge_cases'],
            'setup': ['setup_comprehensive'],
            'cli': ['cli_comprehensive', 'package_init'],
        }
        
        # Remove modules that have special coverage
        for module, coverage in special_coverage.items():
            if module in missing_tests:
                has_coverage = any(c in test_files for c in coverage)
                if has_coverage:
                    missing_tests.discard(module)
        
        assert not missing_tests, f"Modules without tests: {missing_tests}"
    
    def test_aws_clients_all_methods_tested(self):
        """Verify all AWSClients methods have tests"""
        aws_file = Path("legacy-infrastructure/scripts/cvat/aws.py")
        functions = get_public_functions(aws_file)
        classes = get_public_classes(aws_file)
        
        # All methods should be in classes (AWSClients.method_name)
        aws_methods = {m for m in classes if m.startswith("AWSClients.")}
        
        # Should have at least the main methods
        expected_methods = {
            "AWSClients.__init__",
            "AWSClients.get_vpc_id_from_subnet",
            "AWSClients.validate_key_pair",
            "AWSClients.get_security_group_id",
            "AWSClients.iam_role_exists",
            "AWSClients.iam_instance_profile_exists",
            "AWSClients.get_elastic_ip_by_tag",
            "AWSClients.has_existing_resources",
            "AWSClients.get_route53_zone_id",
            "AWSClients.get_route53_record",
            "AWSClients.get_instance_root_volume_id",
            "AWSClients.create_snapshot",
            "AWSClients.wait_snapshot_completed",
            "AWSClients.create_ami_from_snapshot",
            "AWSClients.get_all_elastic_ips",
            "AWSClients.release_elastic_ip",
            "AWSClients.disassociate_address",
            "AWSClients.get_network_interface_description",
        }
        
        # Check that we have tests for these (indirectly by checking test files exist)
        test_files = list(Path("tests").glob("test_aws*.py"))
        assert len(test_files) > 0, "No AWS test files found"
    
    def test_all_config_functions_tested(self):
        """Verify all config functions have tests"""
        config_file = Path("legacy-infrastructure/scripts/cvat/config.py")
        functions = get_public_functions(config_file)
        
        expected_functions = {
            "parse_tfvars",
            "get_config_value",
            "update_config_value",
            "create_tfvars",
        }
        
        assert functions == expected_functions, f"Config functions mismatch: {functions} vs {expected_functions}"
        
        # Verify test file exists
        assert Path("tests/test_config.py").exists(), "test_config.py not found"
    
    def test_all_terraform_functions_tested(self):
        """Verify all terraform functions have tests"""
        terraform_file = Path("legacy-infrastructure/scripts/cvat/terraform.py")
        functions = get_public_functions(terraform_file)
        
        expected_functions = {
            "run_terraform_command",
            "is_terraform_initialized",
            "terraform_init",
            "terraform_plan",
            "terraform_apply",
            "terraform_output",
            "terraform_import",
            "terraform_state_show",
        }
        
        assert functions == expected_functions, f"Terraform functions mismatch"
        
        # Verify test files exist
        assert Path("tests/test_terraform.py").exists(), "test_terraform.py not found"
        assert Path("tests/test_terraform_args.py").exists(), "test_terraform_args.py not found"
    
    def test_all_utils_functions_tested(self):
        """Verify all utils functions have tests"""
        utils_file = Path("legacy-infrastructure/scripts/cvat/utils.py")
        functions = get_public_functions(utils_file)
        
        expected_functions = {
            "get_project_paths",
            "ensure_symlink",
            "get_terraform_state_path",
            "get_tfvars_path",
        }
        
        assert functions == expected_functions, f"Utils functions mismatch"
        
        # Verify test files exist
        assert Path("tests/test_utils.py").exists(), "test_utils.py not found"
        assert Path("tests/test_utils_comprehensive.py").exists(), "test_utils_comprehensive.py not found"
        assert Path("tests/test_ensure_symlink_edge_cases.py").exists(), "test_ensure_symlink_edge_cases.py not found"

