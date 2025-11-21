#!/usr/bin/env python3
"""
Automated test runner for CVAT Infrastructure Management CLI
Runs all tests with sample data and generates comprehensive reports
"""

import sys
import subprocess
import json
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Tuple

# Colors for terminal output
class Colors:
    RED = '\033[0;31m'
    GREEN = '\033[0;32m'
    YELLOW = '\033[1;33m'
    BLUE = '\033[0;34m'
    CYAN = '\033[0;36m'
    NC = '\033[0m'  # No Color


def print_header(text: str):
    """Print formatted header"""
    print(f"\n{Colors.CYAN}{'='*60}{Colors.NC}")
    print(f"{Colors.CYAN}{text:^60}{Colors.NC}")
    print(f"{Colors.CYAN}{'='*60}{Colors.NC}\n")


def run_command(cmd: List[str], capture: bool = False) -> Tuple[int, str]:
    """Run a shell command"""
    try:
        if capture:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                check=False
            )
            return result.returncode, result.stdout + result.stderr
        else:
            result = subprocess.run(cmd, check=False)
            return result.returncode, ""
    except Exception as e:
        return 1, str(e)


def check_dependencies() -> bool:
    """Check if required dependencies are installed"""
    print(f"{Colors.BLUE}📋 Checking dependencies...{Colors.NC}")
    
    # Check pytest
    exit_code, _ = run_command(["pytest", "--version"], capture=True)
    if exit_code != 0:
        print(f"{Colors.RED}❌ pytest not found. Install with: pip install -r tests/requirements.txt{Colors.NC}")
        return False
    
    print(f"{Colors.GREEN}✅ pytest is installed{Colors.NC}")
    return True


def get_test_files() -> List[Path]:
    """Get all test files"""
    test_dir = Path("tests")
    if not test_dir.exists():
        return []
    
    return sorted(test_dir.glob("test_*.py"))


def run_test_category(name: str, test_files: List[str]) -> Tuple[bool, str]:
    """Run a category of tests"""
    print(f"{Colors.CYAN}{'─'*60}{Colors.NC}")
    print(f"{Colors.BLUE}🧪 Running: {name}{Colors.NC}")
    print(f"{Colors.CYAN}{'─'*60}{Colors.NC}")
    
    cmd = ["pytest", "-v", "--tb=short"] + test_files
    exit_code, output = run_command(cmd, capture=True)
    
    success = exit_code == 0
    status = f"{Colors.GREEN}✅{Colors.NC}" if success else f"{Colors.RED}❌{Colors.NC}"
    print(f"{status} {name}: {'PASSED' if success else 'FAILED'}\n")
    
    return success, output


def generate_summary(results: Dict[str, bool], output_file: Path):
    """Generate test summary file"""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    passed = sum(1 for v in results.values() if v)
    failed = sum(1 for v in results.values() if not v)
    total = len(results)
    
    summary = f"""CVAT Infrastructure Management CLI - Test Summary
Generated: {timestamp}

Test Execution Summary
=====================
Total Categories: {total}
Passed: {passed}
Failed: {failed}
Pass Rate: {(passed/total*100):.1f}%

Category Results
================
"""
    
    for category, success in results.items():
        status = "✅ PASSED" if success else "❌ FAILED"
        summary += f"{status}: {category}\n"
    
    if failed > 0:
        summary += "\nFailed Categories:\n"
        for category, success in results.items():
            if not success:
                summary += f"  - {category}\n"
    
    output_file.write_text(summary)
    print(f"{Colors.GREEN}📄 Summary saved to: {output_file}{Colors.NC}")


def main():
    """Main test runner"""
    print_header("CVAT Infrastructure Management CLI - Test Suite Runner")
    
    # Check dependencies
    if not check_dependencies():
        sys.exit(1)
    
    # Create output directory
    output_dir = Path("test_output")
    output_dir.mkdir(exist_ok=True)
    
    # Get test files
    test_files = get_test_files()
    if not test_files:
        print(f"{Colors.RED}❌ No test files found in tests/ directory{Colors.NC}")
        sys.exit(1)
    
    print(f"{Colors.BLUE}📊 Found {len(test_files)} test files{Colors.NC}\n")
    
    # Define test categories
    categories = {
        "Core Module Tests": [
            "tests/test_aws.py",
            "tests/test_config.py",
            "tests/test_terraform.py",
            "tests/test_utils.py",
        ],
        "Comprehensive Core Tests": [
            "tests/test_aws_comprehensive.py",
            "tests/test_utils_comprehensive.py",
            "tests/test_ensure_symlink_edge_cases.py",
        ],
        "Command Tests": [
            "tests/test_setup.py",
            "tests/test_setup_comprehensive.py",
            "tests/test_up.py",
            "tests/test_down.py",
            "tests/test_checkpoint.py",
        ],
        "CLI and Package Tests": [
            "tests/test_cli.py",
            "tests/test_cli_comprehensive.py",
            "tests/test_package_init.py",
        ],
        "Integration Tests": [
            "tests/test_integration.py",
        ],
        "Edge Case Tests": [
            "tests/test_edge_cases.py",
        ],
    }
    
    # Run tests
    results = {}
    all_output = []
    
    for category, files in categories.items():
        # Filter to only existing files
        existing_files = [f for f in files if Path(f).exists()]
        if existing_files:
            success, output = run_test_category(category, existing_files)
            results[category] = success
            all_output.append(f"\n{'='*60}\n{category}\n{'='*60}\n{output}")
    
    # Run all tests together for final verification
    print_header("Final Verification: Running All Tests")
    exit_code, final_output = run_command(
        ["pytest", "-v", "--tb=short"],
        capture=True
    )
    all_output.append(f"\n{'='*60}\nFinal Verification\n{'='*60}\n{final_output}")
    
    # Save results
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    results_file = output_dir / f"test_results_{timestamp}.txt"
    results_file.write_text("\n".join(all_output))
    
    # Generate summary
    summary_file = output_dir / f"test_summary_{timestamp}.txt"
    generate_summary(results, summary_file)
    
    # Final report
    print_header("Test Execution Summary")
    passed = sum(1 for v in results.values() if v)
    failed = sum(1 for v in results.values() if not v)
    total = len(results)
    
    print(f"{Colors.BLUE}📊 Results:{Colors.NC}")
    print(f"   Total Categories: {total}")
    print(f"   {Colors.GREEN}Passed: {passed}{Colors.NC}")
    print(f"   {Colors.RED}Failed: {failed}{Colors.NC}")
    print(f"   Pass Rate: {(passed/total*100):.1f}%")
    print()
    
    if failed > 0:
        print(f"{Colors.RED}❌ Failed Categories:{Colors.NC}")
        for category, success in results.items():
            if not success:
                print(f"   {Colors.RED}❌ {category}{Colors.NC}")
        print()
    
    print(f"{Colors.GREEN}📄 Detailed results: {results_file}{Colors.NC}")
    print(f"{Colors.GREEN}📄 Summary: {summary_file}{Colors.NC}")
    print()
    
    if exit_code == 0 and failed == 0:
        print(f"{Colors.GREEN}✅ All tests passed!{Colors.NC}")
        sys.exit(0)
    else:
        print(f"{Colors.RED}❌ Some tests failed{Colors.NC}")
        sys.exit(1)


if __name__ == "__main__":
    main()

