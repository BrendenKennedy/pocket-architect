"""Tests for config module"""

import pytest
import sys
from pathlib import Path

# Add scripts directory to path
scripts_dir = Path(__file__).parent.parent / "legacy-infrastructure" / "scripts"
sys.path.insert(0, str(scripts_dir))

from cvat.config import (
    parse_tfvars,
    get_config_value,
    update_config_value,
    create_tfvars,
)


class TestParseTfvars:
    """Test terraform.tfvars parsing"""
    
    def test_parse_tfvars_basic(self, tmp_path):
        """Test parsing basic terraform.tfvars file"""
        tfvars_file = tmp_path / "terraform.tfvars"
        tfvars_file.write_text('''aws_region = "us-east-2"
my_ip_cidr = "1.2.3.4/32"
subnet_id = "subnet-12345678"
''')
        
        config = parse_tfvars(tfvars_file)
        assert config["aws_region"] == "us-east-2"
        assert config["my_ip_cidr"] == "1.2.3.4/32"
        assert config["subnet_id"] == "subnet-12345678"
    
    def test_parse_tfvars_with_comments(self, tmp_path):
        """Test parsing file with comments"""
        tfvars_file = tmp_path / "terraform.tfvars"
        tfvars_file.write_text('''# This is a comment
aws_region = "us-east-2"
# Another comment
subnet_id = "subnet-12345678"
''')
        
        config = parse_tfvars(tfvars_file)
        assert "aws_region" in config
        assert "subnet_id" in config
        assert len(config) == 2
    
    def test_parse_tfvars_with_quotes(self, tmp_path):
        """Test parsing values with quotes"""
        tfvars_file = tmp_path / "terraform.tfvars"
        tfvars_file.write_text('''aws_region = "us-east-2"
domain_name = "example.com"
''')
        
        config = parse_tfvars(tfvars_file)
        assert config["aws_region"] == "us-east-2"
        assert config["domain_name"] == "example.com"
    
    def test_parse_tfvars_without_quotes(self, tmp_path):
        """Test parsing values without quotes"""
        tfvars_file = tmp_path / "terraform.tfvars"
        tfvars_file.write_text('''enable_infrastructure = true
enable_alb = false
''')
        
        config = parse_tfvars(tfvars_file)
        assert config["enable_infrastructure"] == "true"
        assert config["enable_alb"] == "false"
    
    def test_parse_tfvars_empty_file(self, tmp_path):
        """Test parsing empty file"""
        tfvars_file = tmp_path / "terraform.tfvars"
        tfvars_file.write_text('')
        
        config = parse_tfvars(tfvars_file)
        assert config == {}
    
    def test_parse_tfvars_nonexistent_file(self, tmp_path):
        """Test parsing nonexistent file"""
        tfvars_file = tmp_path / "nonexistent.tfvars"
        config = parse_tfvars(tfvars_file)
        assert config == {}


class TestGetConfigValue:
    """Test getting specific config values"""
    
    def test_get_config_value_exists(self, sample_tfvars_file):
        """Test getting existing config value"""
        value = get_config_value(sample_tfvars_file, "aws_region")
        assert value == "us-east-2"
    
    def test_get_config_value_with_default(self, sample_tfvars_file):
        """Test getting config value with default"""
        value = get_config_value(sample_tfvars_file, "nonexistent", "default-value")
        assert value == "default-value"
    
    def test_get_config_value_no_default(self, sample_tfvars_file):
        """Test getting nonexistent config value without default"""
        value = get_config_value(sample_tfvars_file, "nonexistent")
        assert value is None


class TestUpdateConfigValue:
    """Test updating config values"""
    
    def test_update_config_value_existing(self, sample_tfvars_file):
        """Test updating existing config value"""
        update_config_value(sample_tfvars_file, "aws_region", "us-west-2")
        
        config = parse_tfvars(sample_tfvars_file)
        assert config["aws_region"] == "us-west-2"
    
    def test_update_config_value_new(self, sample_tfvars_file):
        """Test adding new config value"""
        update_config_value(sample_tfvars_file, "new_key", "new_value")
        
        config = parse_tfvars(sample_tfvars_file)
        assert config["new_key"] == "new_value"
    
    def test_update_config_value_new_file(self, tmp_path):
        """Test updating config value in new file"""
        tfvars_file = tmp_path / "terraform.tfvars"
        update_config_value(tfvars_file, "aws_region", "us-east-2")
        
        assert tfvars_file.exists()
        config = parse_tfvars(tfvars_file)
        assert config["aws_region"] == "us-east-2"


class TestCreateTfvars:
    """Test creating terraform.tfvars file"""
    
    def test_create_tfvars_basic(self, tmp_path):
        """Test creating basic terraform.tfvars"""
        tfvars_file = tmp_path / "terraform.tfvars"
        
        create_tfvars(
            tfvars_file,
            aws_region="us-east-2",
            my_ip_cidr="1.2.3.4/32",
            subnet_id="subnet-12345678",
            ssh_key_name="my-key"
        )
        
        assert tfvars_file.exists()
        config = parse_tfvars(tfvars_file)
        assert config["aws_region"] == "us-east-2"
        assert config["my_ip_cidr"] == "1.2.3.4/32"
        assert config["subnet_id"] == "subnet-12345678"
        assert config["ssh_key_name"] == "my-key"
    
    def test_create_tfvars_with_domain(self, tmp_path):
        """Test creating terraform.tfvars with domain"""
        tfvars_file = tmp_path / "terraform.tfvars"
        
        create_tfvars(
            tfvars_file,
            aws_region="us-east-2",
            my_ip_cidr="1.2.3.4/32",
            subnet_id="subnet-12345678",
            ssh_key_name="my-key",
            domain_name="example.com"
        )
        
        config = parse_tfvars(tfvars_file)
        assert config["domain_name"] == "example.com"
    
    def test_create_tfvars_with_snapshot(self, tmp_path):
        """Test creating terraform.tfvars with snapshot"""
        tfvars_file = tmp_path / "terraform.tfvars"
        
        create_tfvars(
            tfvars_file,
            aws_region="us-east-2",
            my_ip_cidr="1.2.3.4/32",
            subnet_id="subnet-12345678",
            ssh_key_name="my-key",
            root_volume_snapshot_id="snap-12345678"
        )
        
        config = parse_tfvars(tfvars_file)
        assert config["root_volume_snapshot_id"] == "snap-12345678"
    
    def test_create_tfvars_with_flags(self, tmp_path):
        """Test creating terraform.tfvars with enable flags"""
        tfvars_file = tmp_path / "terraform.tfvars"
        
        create_tfvars(
            tfvars_file,
            aws_region="us-east-2",
            my_ip_cidr="1.2.3.4/32",
            subnet_id="subnet-12345678",
            ssh_key_name="my-key",
            enable_infrastructure=True,
            enable_alb=True
        )
        
        config = parse_tfvars(tfvars_file)
        assert config["enable_infrastructure"] == "true"
        assert config["enable_alb"] == "true"
    
    def test_create_tfvars_without_domain(self, tmp_path):
        """Test creating terraform.tfvars without domain"""
        tfvars_file = tmp_path / "terraform.tfvars"
        
        create_tfvars(
            tfvars_file,
            aws_region="us-east-2",
            my_ip_cidr="1.2.3.4/32",
            subnet_id="subnet-12345678",
            ssh_key_name="my-key",
            domain_name=None
        )
        
        config = parse_tfvars(tfvars_file)
        # Domain should not be in config or commented out
        assert "domain_name" not in config or config.get("domain_name") == ""

