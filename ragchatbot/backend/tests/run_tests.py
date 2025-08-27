#!/usr/bin/env python3
"""
Test runner script for RAG chatbot diagnostics.
Runs all tests and generates a detailed report to identify failing components.
"""
import json
import os
import subprocess
import sys
from datetime import datetime

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def run_pytest_with_output():
    """Run pytest and capture detailed output"""
    print("=" * 80)
    print("RAG CHATBOT SYSTEM DIAGNOSTIC TEST SUITE")
    print("=" * 80)
    print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()

    # Change to backend directory to run tests
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    os.chdir(backend_dir)

    # Run pytest with detailed output
    cmd = [
        sys.executable,
        "-m",
        "pytest",
        "tests/",
        "-v",  # Verbose output
        "--tb=long",  # Long traceback format
        "--capture=no",  # Don't capture stdout/stderr
        "--junit-xml=test_results.xml",  # XML output for parsing
        "--durations=10",  # Show 10 slowest tests
    ]

    print("Running command:", " ".join(cmd))
    print("-" * 80)

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)

        print("STDOUT:")
        print(result.stdout)
        print()

        if result.stderr:
            print("STDERR:")
            print(result.stderr)
            print()

        print("-" * 80)
        print(f"Test run completed with exit code: {result.returncode}")

        # Generate summary report
        generate_summary_report(result)

        return result.returncode == 0

    except subprocess.TimeoutExpired:
        print("ERROR: Tests timed out after 5 minutes")
        return False
    except Exception as e:
        print(f"ERROR: Failed to run tests: {e}")
        return False


def generate_summary_report(result):
    """Generate a summary report of test results"""
    print("\n" + "=" * 80)
    print("TEST SUMMARY REPORT")
    print("=" * 80)

    # Parse pytest output for component-wise results
    output_lines = result.stdout.split("\n")

    # Look for test results by component
    components = {
        "CourseSearchTool": {"passed": 0, "failed": 0, "errors": []},
        "AIGenerator": {"passed": 0, "failed": 0, "errors": []},
        "VectorStore": {"passed": 0, "failed": 0, "errors": []},
        "RAGSystem": {"passed": 0, "failed": 0, "errors": []},
    }

    current_test = None
    in_failure = False
    failure_details = []

    for line in output_lines:
        # Detect test names
        if "test_" in line and "::" in line:
            if "PASSED" in line:
                for component in components:
                    if component.lower() in line.lower():
                        components[component]["passed"] += 1
                        break
            elif "FAILED" in line or "ERROR" in line:
                for component in components:
                    if component.lower() in line.lower():
                        components[component]["failed"] += 1
                        test_name = line.split("::")[-1].split()[0]
                        components[component]["errors"].append(test_name)
                        break

        # Capture failure details
        if "FAILURES" in line or "ERRORS" in line:
            in_failure = True
        elif in_failure and line.startswith("="):
            in_failure = False
            if failure_details:
                print(f"\nFAILURE DETAILS:\n{''.join(failure_details)}")
                failure_details = []
        elif in_failure:
            failure_details.append(line + "\n")

    # Print component-wise summary
    print("\nCOMPONENT TEST RESULTS:")
    print("-" * 40)

    total_issues = 0
    for component, results in components.items():
        total_tests = results["passed"] + results["failed"]
        if total_tests > 0:
            success_rate = (results["passed"] / total_tests) * 100
            status = "✓ HEALTHY" if results["failed"] == 0 else "✗ ISSUES DETECTED"

            print(
                f"{component:15} | {results['passed']:2d} passed, {results['failed']:2d} failed | {success_rate:5.1f}% | {status}"
            )

            if results["failed"] > 0:
                total_issues += results["failed"]
                print(f"                  Failed tests: {', '.join(results['errors'])}")

    print("-" * 40)

    if total_issues == 0:
        print("✓ ALL COMPONENTS HEALTHY - No issues detected")
        print("\nThis suggests the 'query failed' error may be:")
        print("- Related to external dependencies (Anthropic API, ChromaDB)")
        print("- Configuration issues (missing API key, invalid paths)")
        print("- Runtime environment problems")
    else:
        print(f"✗ {total_issues} ISSUES DETECTED across components")
        print("\nRecommended next steps:")
        print("1. Fix failing unit tests first")
        print("2. Check component integration")
        print("3. Verify external dependencies")
        print("4. Test with real data")

    # Check for specific error patterns
    if result.stderr or "ConnectionError" in result.stdout:
        print("\n⚠️  CONNECTION ISSUES DETECTED:")
        print("- Check ChromaDB installation and permissions")
        print("- Verify Anthropic API key is valid")
        print("- Ensure network connectivity")

    if "ImportError" in result.stdout or "ModuleNotFoundError" in result.stdout:
        print("\n⚠️  DEPENDENCY ISSUES DETECTED:")
        print("- Run: uv sync")
        print("- Check Python path configuration")
        print("- Verify all required packages are installed")


def check_prerequisites():
    """Check if all prerequisites are met"""
    print("Checking prerequisites...")

    # Check if pytest is available
    try:
        import pytest

        print(f"✓ pytest available (version: {pytest.__version__})")
    except ImportError:
        print("✗ pytest not available - run: uv add pytest")
        return False

    # Check if required modules can be imported
    required_modules = ["anthropic", "chromadb", "sentence_transformers", "fastapi"]
    missing_modules = []

    for module in required_modules:
        try:
            __import__(module)
            print(f"✓ {module} available")
        except ImportError:
            print(f"✗ {module} not available")
            missing_modules.append(module)

    if missing_modules:
        print(f"\nMissing modules: {', '.join(missing_modules)}")
        print("Run: uv sync to install dependencies")
        return False

    return True


def main():
    """Main test runner function"""
    if not check_prerequisites():
        print("\nPrerequisites not met. Please install missing dependencies.")
        return 1

    print("\nStarting comprehensive RAG system test suite...")
    success = run_pytest_with_output()

    if success:
        print("\n✓ All tests passed!")
        return 0
    else:
        print("\n✗ Some tests failed. See details above.")
        return 1


if __name__ == "__main__":
    exit(main())
