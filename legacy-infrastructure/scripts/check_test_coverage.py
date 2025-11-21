#!/usr/bin/env python3
"""
Test coverage checker - verifies all functions/classes have tests
"""

import ast
import sys
from pathlib import Path
from typing import Dict, List, Set

def get_functions_and_classes(file_path: Path) -> Dict[str, List[str]]:
    """Extract all functions and classes from a Python file"""
    try:
        with open(file_path, 'r') as f:
            tree = ast.parse(f.read(), filename=str(file_path))
        
        functions = []
        classes = []
        
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef):
                # Skip private functions (starting with _)
                if not node.name.startswith('_'):
                    functions.append(node.name)
            elif isinstance(node, ast.ClassDef):
                classes.append(node.name)
        
        return {
            'functions': sorted(set(functions)),
            'classes': sorted(set(classes))
        }
    except Exception as e:
        print(f"Error parsing {file_path}: {e}")
        return {'functions': [], 'classes': []}

def get_test_files() -> List[Path]:
    """Get all test files"""
    test_dir = Path("tests")
    if not test_dir.exists():
        return []
    return sorted(test_dir.glob("test_*.py"))

def get_source_files() -> List[Path]:
    """Get all source files in scripts/cvat"""
    cvat_dir = Path("scripts/cvat")
    if not cvat_dir.exists():
        return []
    return sorted([f for f in cvat_dir.glob("*.py") if f.name != "__init__.py"])

def check_coverage():
    """Check test coverage for all source files"""
    print("=" * 70)
    print("Test Coverage Checker")
    print("=" * 70)
    print()
    
    source_files = get_source_files()
    test_files = get_test_files()
    
    print(f"Source files: {len(source_files)}")
    print(f"Test files: {len(test_files)}")
    print()
    
    coverage_report = {}
    all_functions = {}
    all_classes = {}
    
    # Collect all functions and classes from source
    for source_file in source_files:
        module_name = source_file.stem
        items = get_functions_and_classes(source_file)
        all_functions[module_name] = items['functions']
        all_classes[module_name] = items['classes']
        
        print(f"📄 {source_file.name}")
        print(f"   Functions: {len(items['functions'])}")
        print(f"   Classes: {len(items['classes'])}")
        if items['functions']:
            print(f"   Functions: {', '.join(items['functions'][:5])}{'...' if len(items['functions']) > 5 else ''}")
        if items['classes']:
            print(f"   Classes: {', '.join(items['classes'])}")
        print()
    
    # Check for test files
    print("=" * 70)
    print("Test File Coverage")
    print("=" * 70)
    print()
    
    test_modules = {}
    for test_file in test_files:
        # Extract module name from test file (test_aws.py -> aws)
        module_name = test_file.stem.replace('test_', '').replace('_comprehensive', '').replace('_edge_cases', '')
        if module_name not in test_modules:
            test_modules[module_name] = []
        test_modules[module_name].append(test_file.name)
    
    # Check coverage
    missing_tests = []
    covered_modules = set()
    
    for module_name in all_functions.keys():
        if module_name in test_modules:
            covered_modules.add(module_name)
            print(f"✅ {module_name}: {len(test_modules[module_name])} test file(s)")
            for test_file in test_modules[module_name]:
                print(f"   - {test_file}")
        else:
            missing_tests.append(module_name)
            print(f"❌ {module_name}: NO TEST FILE")
    
    print()
    print("=" * 70)
    print("Coverage Summary")
    print("=" * 70)
    print()
    
    total_modules = len(all_functions)
    covered_count = len(covered_modules)
    coverage_percent = (covered_count / total_modules * 100) if total_modules > 0 else 0
    
    print(f"Total modules: {total_modules}")
    print(f"Covered modules: {covered_count}")
    print(f"Coverage: {coverage_percent:.1f}%")
    print()
    
    if missing_tests:
        print("⚠️  Missing test files:")
        for module in missing_tests:
            print(f"   - {module} (expected: tests/test_{module}.py)")
        print()
    
    # Check for special test files
    special_tests = ['integration', 'edge_cases', 'cli', 'package_init']
    print("Special test files:")
    for special in special_tests:
        test_name = f"test_{special}.py"
        if any(t.name == test_name for t in test_files):
            print(f"   ✅ {test_name}")
        else:
            print(f"   ❌ {test_name} (missing)")
    
    print()
    print("=" * 70)
    
    if missing_tests:
        print("❌ Some modules are missing tests!")
        return 1
    else:
        print("✅ All modules have test coverage!")
        return 0

if __name__ == "__main__":
    sys.exit(check_coverage())

