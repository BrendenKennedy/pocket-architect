"""Tests for CLI commands."""

import pytest
from typer.testing import CliRunner

from pocket_architect.cli import app


@pytest.fixture
def runner():
    """CLI test runner."""
    return CliRunner()


def test_version(runner):
    """Test version command."""
    result = runner.invoke(app, ["--version"])
    assert result.exit_code == 0
    assert "pocket-architect version 1.0.0" in result.stdout


def test_help(runner):
    """Test help command."""
    result = runner.invoke(app, ["--help"])
    assert result.exit_code == 0
    assert "pocket-architect" in result.stdout


def test_cvat_help(runner):
    """Test CVAT command help."""
    result = runner.invoke(app, ["cvat", "--help"])
    assert result.exit_code == 0
    assert "cvat" in result.stdout.lower()


def test_auto_annotate_help(runner):
    """Test auto-annotate command help."""
    result = runner.invoke(app, ["auto-annotate", "--help"])
    assert result.exit_code == 0
    assert "auto-annotate" in result.stdout.lower()

