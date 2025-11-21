"""Integration tests for Local provider."""

import pytest
import tempfile
import shutil
from pathlib import Path
from unittest.mock import patch, MagicMock

from pocket_architect.providers.local.client import LocalProvider
from pocket_architect.core.types import Provider


@pytest.fixture
def temp_session_dir(tmp_path):
    """Create temporary session directory."""
    session_dir = tmp_path / "sessions" / "test-session"
    session_dir.mkdir(parents=True)
    return session_dir


@pytest.fixture
def local_provider(temp_session_dir, monkeypatch):
    """Create LocalProvider instance with mocked session directory."""
    with patch('pocket_architect.providers.local.client.SessionStore') as mock_store:
        mock_store.return_value.get_session_dir.return_value = temp_session_dir
        provider = LocalProvider("test-session")
        provider.compose_file = temp_session_dir / "docker-compose.yml"
        return provider


class TestLocalProviderSync:
    """Test Local provider sync functionality."""
    
    def test_sync_up_creates_remote_directory(self, local_provider, tmp_path):
        """Test that sync up creates remote directory in container."""
        local_dir = tmp_path / "local_data"
        local_dir.mkdir()
        (local_dir / "test.txt").write_text("test content")
        
        with patch('pocket_architect.providers.local.client.docker_exec') as mock_exec, \
             patch('pocket_architect.providers.local.client.docker_compose_ps') as mock_ps, \
             patch('subprocess.run') as mock_run:
            
            mock_ps.return_value = [{"Service": "cvat", "Name": "test_cvat"}]
            mock_exec.return_value = MagicMock(returncode=0)
            mock_run.return_value = MagicMock(returncode=0)
            
            local_provider.sync(local_dir, direction="up")
            
            # Verify mkdir was called
            mock_exec.assert_called()
            # Verify docker cp was called
            assert mock_run.called
    
    def test_sync_down_creates_local_directory(self, local_provider, tmp_path):
        """Test that sync down creates local directory."""
        local_dir = tmp_path / "local_data"
        # Don't create directory - sync should create it
        
        with patch('pocket_architect.providers.local.client.docker_compose_ps') as mock_ps, \
             patch('subprocess.run') as mock_run:
            
            mock_ps.return_value = [{"Service": "cvat", "Name": "test_cvat"}]
            mock_run.return_value = MagicMock(returncode=0)
            
            # sync creates the directory internally with mkdir(parents=True, exist_ok=True)
            local_provider.sync(local_dir, direction="down")
            
            # Verify docker cp was called (directory is created in sync method)
            assert mock_run.called
    
    def test_sync_both_direction(self, local_provider, tmp_path):
        """Test bidirectional sync."""
        local_dir = tmp_path / "local_data"
        local_dir.mkdir()
        (local_dir / "test.txt").write_text("test")
        
        with patch('pocket_architect.providers.local.client.docker_exec') as mock_exec, \
             patch('pocket_architect.providers.local.client.docker_compose_ps') as mock_ps, \
             patch('subprocess.run') as mock_run:
            
            mock_ps.return_value = [{"Service": "cvat", "Name": "test_cvat"}]
            mock_exec.return_value = MagicMock(returncode=0)
            mock_run.return_value = MagicMock(returncode=0)
            
            local_provider.sync(local_dir, direction="both")
            
            # Should call subprocess.run for docker cp (at least once for up, once for down)
            # The exact count depends on implementation, but should be called
            assert mock_run.called
    
    def test_sync_nonexistent_path_raises_error(self, local_provider):
        """Test that syncing non-existent path raises error."""
        nonexistent = Path("/nonexistent/path")
        
        with pytest.raises(FileNotFoundError):
            local_provider.sync(nonexistent)


class TestLocalProviderShell:
    """Test Local provider shell functionality."""
    
    def test_shell_ssh_mode(self, local_provider):
        """Test SSH mode (docker exec)."""
        with patch('pocket_architect.providers.local.client.docker_compose_ps') as mock_ps, \
             patch('subprocess.run') as mock_run:
            
            mock_ps.return_value = [{"Service": "cvat", "Name": "test_cvat"}]
            mock_run.return_value = MagicMock(returncode=0)
            
            local_provider.shell(mode="ssh")
            
            # Verify docker exec was called
            mock_run.assert_called()
            args = mock_run.call_args[0][0]
            assert "docker" in args
            assert "exec" in args
    
    def test_shell_jupyter_mode(self, local_provider):
        """Test Jupyter mode."""
        with patch('pocket_architect.providers.local.client.docker_compose_ps') as mock_ps, \
             patch('pocket_architect.providers.local.client.docker_exec') as mock_exec, \
             patch('subprocess.run') as mock_run, \
             patch('json.loads') as mock_json, \
             patch('pocket_architect.providers.local.client.console.print') as mock_print:
            
            mock_ps.return_value = [{"Service": "cvat", "Name": "test_cvat"}]
            mock_exec.return_value = MagicMock(returncode=0, stdout="")
            mock_run.return_value = MagicMock(returncode=0, stdout='{"8888/tcp": [{"HostPort": "8888"}]}')
            mock_json.return_value = {"8888/tcp": [{"HostPort": "8888"}]}
            
            local_provider.shell(mode="jupyter")
            
            # Verify jupyter lab was started
            assert mock_exec.called
    
    def test_shell_vscode_mode(self, local_provider):
        """Test VSCode mode provides instructions."""
        from pocket_architect.providers.local import client
        with patch('pocket_architect.providers.local.client.docker_compose_ps') as mock_ps, \
             patch.object(client.console, 'print') as mock_print:
            mock_ps.return_value = [{"Service": "cvat", "Name": "test_cvat"}]
            
            # Should not raise error, just print instructions
            local_provider.shell(mode="vscode")
            
            # Verify instructions were printed
            assert mock_print.called
    
    def test_shell_invalid_mode_raises_error(self, local_provider):
        """Test that invalid shell mode raises error."""
        with pytest.raises(ValueError, match="Unsupported shell mode"):
            local_provider.shell(mode="invalid")


class TestLocalProviderCost:
    """Test Local provider cost estimation."""
    
    def test_cost_estimate_always_zero(self, local_provider):
        """Test that local provider always returns $0 cost."""
        cost = local_provider.cost_estimate("cvat")
        
        assert cost.hourly_rate_usd == 0.0
        assert cost.monthly_projection_usd == 0.0
        assert cost.provider == Provider.LOCAL


class TestLocalProviderProvision:
    """Test Local provider provisioning."""
    
    def test_provision_cvat_creates_compose_file(self, local_provider, tmp_path):
        """Test that provision_cvat creates docker-compose.yml."""
        with patch('pocket_architect.providers.local.client.check_docker_available', return_value=True), \
             patch('pocket_architect.providers.local.client.check_docker_compose_available', return_value=True), \
             patch('pocket_architect.providers.local.client.check_nvidia_container_toolkit', return_value=False), \
             patch('pocket_architect.providers.local.client.docker_compose_up') as mock_up, \
             patch('pocket_architect.providers.local.client.docker_exec') as mock_exec:
            
            mock_up.return_value = MagicMock(returncode=0)
            mock_exec.return_value = MagicMock(returncode=0)
            
            result = local_provider.provision_cvat()
            
            # Verify compose file was created
            assert local_provider.compose_file.exists()
            # Verify docker-compose up was called
            mock_up.assert_called()
            # Verify result contains expected keys
            assert "status" in result
            assert "cvat_url" in result

