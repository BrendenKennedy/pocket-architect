"""
SQLAlchemy database models for local persistence.
Stores project and instance metadata locally in SQLite.
"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


class ProjectDB(Base):
    """Project database model."""
    __tablename__ = 'projects'

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    status = Column(String(50), default='healthy')  # healthy, degraded, stopped, error
    color = Column(String(50), default='#3b82f6')
    vpc = Column(String(255))
    platform = Column(String(50), nullable=False)  # aws, gcp, azure
    region = Column(String(100), nullable=False)
    cost_limit = Column(Float, default=0.0)
    cost_month_to_date = Column(Float, default=0.0)
    cost_lifetime = Column(Float, default=0.0)
    monthly_cost = Column(Float, default=0.0)
    uptime_days = Column(Integer, default=0)
    tags = Column(JSON, default=list)  # Store as JSON array
    created = Column(DateTime, default=datetime.utcnow)
    last_modified = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    instances = relationship("InstanceDB", back_populates="project", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Project(id={self.id}, name='{self.name}', platform='{self.platform}')>"


class InstanceDB(Base):
    """Instance database model."""
    __tablename__ = 'instances'

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    project_id = Column(Integer, ForeignKey('projects.id'), nullable=False)
    status = Column(String(50), default='stopped')  # healthy, degraded, stopped, error
    instance_type = Column(String(100), nullable=False)
    platform = Column(String(50), nullable=False)  # aws, gcp, azure
    region = Column(String(100), nullable=False)
    public_ip = Column(String(50))
    private_ip = Column(String(50))
    storage = Column(Integer, default=20)  # GB
    security_config = Column(String(255))
    ssh_key = Column(String(255))
    monthly_cost = Column(Float, default=0.0)
    tags = Column(JSON, default=list)  # Store as JSON array
    created = Column(DateTime, default=datetime.utcnow)

    # AWS-specific fields
    aws_instance_id = Column(String(255))  # i-xxxxx
    aws_ami_id = Column(String(255))

    # GCP-specific fields
    gcp_instance_name = Column(String(255))
    gcp_machine_type = Column(String(255))

    # Azure-specific fields
    azure_vm_id = Column(String(255))
    azure_vm_name = Column(String(255))

    # Relationships
    project = relationship("ProjectDB", back_populates="instances")

    def __repr__(self):
        return f"<Instance(id={self.id}, name='{self.name}', type='{self.instance_type}')>"


class AccountDB(Base):
    """Cloud account/credential database model."""
    __tablename__ = 'accounts'

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    platform = Column(String(50), nullable=False)  # aws, gcp, azure
    account_id = Column(String(255), nullable=False)
    status = Column(String(50), default='disconnected')  # connected, disconnected, error
    region = Column(String(100), nullable=False)
    is_default = Column(Boolean, default=False)
    created = Column(DateTime, default=datetime.utcnow)
    last_synced = Column(DateTime)

    # AWS-specific fields
    aws_profile = Column(String(255))  # AWS CLI profile name

    # GCP-specific fields
    gcp_project_id = Column(String(255))
    gcp_service_account_email = Column(String(255))

    # Azure-specific fields
    azure_subscription_id = Column(String(255))
    azure_tenant_id = Column(String(255))

    def __repr__(self):
        return f"<Account(id={self.id}, name='{self.name}', platform='{self.platform}')>"


class BlueprintDB(Base):
    """Blueprint/template database model."""
    __tablename__ = 'blueprints'

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    use_case = Column(String(255))
    category = Column(String(50))  # web, compute, database, storage, development
    platform = Column(String(50), nullable=False)
    region = Column(String(100), nullable=False)
    instance_type = Column(String(100), nullable=False)
    storage = Column(Integer, default=20)
    workload_type = Column(String(50))  # general, compute, memory, storage, gpu
    security_config_id = Column(Integer)
    usage_count = Column(Integer, default=0)
    tags = Column(JSON, default=list)
    created = Column(DateTime, default=datetime.utcnow)
    last_modified = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f"<Blueprint(id={self.id}, name='{self.name}', category='{self.category}')>"


class SecurityConfigDB(Base):
    """Security configuration database model."""
    __tablename__ = 'security_configs'

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    type = Column(String(50), default='user')  # built-in, user
    key_pair = Column(String(255))
    cert_type = Column(String(50))  # acm, none, custom
    security_groups = Column(JSON, default=list)  # Array of security group IDs
    iam_role = Column(String(255))
    load_balancer = Column(Boolean, default=False)
    public_ip = Column(Boolean, default=True)
    inbound_ports = Column(JSON, default=list)  # Array of port configurations
    outbound_rules = Column(Text)
    tags = Column(JSON, default=list)
    created = Column(DateTime, default=datetime.utcnow)
    last_modified = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f"<SecurityConfig(id={self.id}, name='{self.name}')>"


class ImageDB(Base):
    """Custom image/AMI database model."""
    __tablename__ = 'images'

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    image_id = Column(String(255), nullable=False)  # AMI ID, Image ID, etc.
    platform = Column(String(50), nullable=False)
    region = Column(String(100), nullable=False)
    os = Column(String(100))
    architecture = Column(String(50))  # x86_64, arm64
    size = Column(Integer)  # GB
    status = Column(String(50), default='pending')  # available, pending, failed
    public = Column(Boolean, default=False)
    source_instance_id = Column(Integer, ForeignKey('instances.id'))
    tags = Column(JSON, default=list)
    created = Column(DateTime, default=datetime.utcnow)
    last_modified = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f"<Image(id={self.id}, name='{self.name}', image_id='{self.image_id}')>"
