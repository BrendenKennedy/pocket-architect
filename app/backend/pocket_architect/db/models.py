"""
SQLAlchemy database models for local persistence.
Stores project and instance metadata locally in SQLite.
"""

from datetime import datetime
from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    Boolean,
    DateTime,
    ForeignKey,
    Text,
    JSON,
)
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


class ProjectDB(Base):
    """Project database model."""

    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    status = Column(String(50), default="healthy")  # healthy, degraded, stopped, error
    color = Column(String(50), default="#3b82f6")
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
    instances = relationship(
        "InstanceDB", back_populates="project", cascade="all, delete-orphan"
    )

    def __repr__(self):
        return (
            f"<Project(id={self.id}, name='{self.name}', platform='{self.platform}')>"
        )


class InstanceDB(Base):
    """Instance database model."""

    __tablename__ = "instances"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    status = Column(String(50), default="stopped")  # healthy, degraded, stopped, error
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
        return (
            f"<Instance(id={self.id}, name='{self.name}', type='{self.instance_type}')>"
        )


class AccountDB(Base):
    """Cloud account/credential database model."""

    __tablename__ = "accounts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    platform = Column(String(50), nullable=False)  # aws, gcp, azure
    account_id = Column(String(255), nullable=False)
    status = Column(
        String(50), default="disconnected"
    )  # connected, disconnected, error
    region = Column(String(100), nullable=False)
    is_default = Column(Boolean, default=False)
    created = Column(DateTime, default=datetime.utcnow)
    last_synced = Column(DateTime)

    # Security and role-based fields
    role_arn = Column(String(500))  # IAM role ARN for role assumption
    migrated_from_cli = Column(Boolean, default=False)  # Migration tracking
    last_access = Column(DateTime)  # Audit trail
    access_count = Column(Integer, default=0)  # Usage tracking

    # AWS-specific fields
    aws_profile = Column(String(255))  # AWS CLI profile name (legacy)

    # GCP-specific fields
    gcp_project_id = Column(String(255))
    gcp_service_account_email = Column(String(255))

    # Azure-specific fields
    azure_subscription_id = Column(String(255))
    azure_tenant_id = Column(String(255))

    # Relationships
    dashboard_cache = relationship(
        "DashboardCache", back_populates="account", cascade="all, delete-orphan"
    )
    activity_logs = relationship(
        "ActivityLog", back_populates="account", cascade="all, delete-orphan"
    )
    ssh_sessions = relationship(
        "SSHSession", back_populates="account", cascade="all, delete-orphan"
    )

    def __repr__(self):
        return (
            f"<Account(id={self.id}, name='{self.name}', platform='{self.platform}')>"
        )


class BlueprintDB(Base):
    """Blueprint/template database model."""

    __tablename__ = "blueprints"

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
        return (
            f"<Blueprint(id={self.id}, name='{self.name}', category='{self.category}')>"
        )


class SecurityConfigDB(Base):
    """Security configuration database model."""

    __tablename__ = "security_configs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    type = Column(String(50), default="user")  # built-in, user
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

    __tablename__ = "images"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    image_id = Column(String(255), nullable=False)  # AMI ID, Image ID, etc.
    platform = Column(String(50), nullable=False)
    region = Column(String(100), nullable=False)
    os = Column(String(100))
    architecture = Column(String(50))  # x86_64, arm64
    size = Column(Integer)  # GB
    status = Column(String(50), default="pending")  # available, pending, failed
    public = Column(Boolean, default=False)
    source_instance_id = Column(Integer, ForeignKey("instances.id"))
    tags = Column(JSON, default=list)
    created = Column(DateTime, default=datetime.utcnow)
    last_modified = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f"<Image(id={self.id}, name='{self.name}', image_id='{self.image_id}')>"


class KeyPairDB(Base):
    """SSH key pair database model."""

    __tablename__ = "key_pairs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False, unique=True)
    description = Column(Text)
    key_type = Column(String(50), default="ed25519")  # rsa, ed25519
    fingerprint = Column(String(255))
    private_key_path = Column(String(500))  # Local path to private key file
    created = Column(DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"<KeyPair(id={self.id}, name='{self.name}')>"


class SecurityGroupDB(Base):
    """Security group database model."""

    __tablename__ = "security_groups"

    id = Column(Integer, primary_key=True, autoincrement=True)
    group_id = Column(String(255), nullable=False, unique=True)  # AWS security group ID
    name = Column(String(255), nullable=False)
    description = Column(Text)
    vpc_id = Column(String(255))
    inbound_rules = Column(JSON, default=list)  # Array of rule configurations
    outbound_rules = Column(JSON, default=list)  # Array of rule configurations
    created = Column(DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"<SecurityGroup(id={self.id}, name='{self.name}', group_id='{self.group_id}')>"


class IAMRoleDB(Base):
    """IAM role database model."""

    __tablename__ = "iam_roles"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False, unique=True)
    description = Column(Text)
    trust_policy = Column(Text, nullable=False)  # JSON trust policy
    managed_policies = Column(JSON, default=list)  # Array of managed policy ARNs
    inline_policy = Column(Text)  # JSON inline policy document
    arn = Column(String(500), nullable=False)
    created = Column(DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"<IAMRole(id={self.id}, name='{self.name}')>"


class CertificateDB(Base):
    """SSL certificate database model."""

    __tablename__ = "certificates"

    id = Column(Integer, primary_key=True, autoincrement=True)
    arn = Column(String(500), nullable=False, unique=True)
    domain = Column(String(255), nullable=False)
    additional_domains = Column(JSON, default=list)  # Array of additional domains
    validation_method = Column(String(50), default="DNS")  # DNS, EMAIL
    status = Column(String(50), default="PENDING_VALIDATION")
    created = Column(DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"<Certificate(id={self.id}, domain='{self.domain}')>"


class DashboardCache(Base):
    """Dashboard data cache for expensive AWS API calls."""

    __tablename__ = "dashboard_cache"

    id = Column(Integer, primary_key=True, autoincrement=True)
    data_type = Column(
        String(50), nullable=False, index=True
    )  # 'instances', 'quotas', 'costs', 'health', 'ssh_sessions'
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=False, index=True)
    region = Column(String(50), nullable=False, index=True)
    data = Column(JSON, nullable=False)  # Cached data as JSON
    data_hash = Column(String(64), nullable=False)  # SHA256 hash for change detection
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )
    expires_at = Column(DateTime, nullable=False)  # TTL expiration time

    # Relationships
    account = relationship("AccountDB", back_populates="dashboard_cache")

    def __repr__(self):
        return f"<DashboardCache(id={self.id}, type='{self.data_type}', account={self.account_id}, region='{self.region}')>"


class ActivityLog(Base):
    """Activity log for recent dashboard activity."""

    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=False, index=True)
    activity_type = Column(
        String(50), nullable=False
    )  # 'instance_start', 'instance_stop', 'cost_alert', etc.
    resource_type = Column(
        String(50), nullable=False
    )  # 'instance', 'project', 'cost', etc.
    resource_id = Column(String(100), nullable=False)  # AWS resource ID or local ID
    description = Column(Text, nullable=False)
    extra_data = Column(JSON, default=dict)  # Additional context data
    severity = Column(
        String(20), default="info"
    )  # 'info', 'warning', 'error', 'success'
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    # Relationships
    account = relationship("AccountDB", back_populates="activity_logs")

    def __repr__(self):
        return f"<ActivityLog(id={self.id}, type='{self.activity_type}', resource='{self.resource_id}')>"


class SSHSession(Base):
    """SSH session tracking for active connections."""

    __tablename__ = "ssh_sessions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=False, index=True)
    instance_id = Column(String(100), nullable=False, index=True)
    user = Column(String(100), nullable=False)
    remote_ip = Column(String(45), nullable=False)  # IPv4/IPv6
    local_port = Column(Integer, nullable=False)
    remote_port = Column(Integer, nullable=False)
    started_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    ended_at = Column(DateTime, nullable=True)
    status = Column(String(20), default="active")  # 'active', 'ended', 'error'
    session_id = Column(String(100), nullable=True)  # SSH session identifier

    # Relationships
    account = relationship("AccountDB", back_populates="ssh_sessions")

    def __repr__(self):
        return f"<SSHSession(id={self.id}, instance='{self.instance_id}', user='{self.user}', status='{self.status}')>"
