"""
Pydantic data models mirroring TypeScript types from frontend.
These models ensure type safety and validation across the Python-JavaScript boundary.
"""

from pydantic import BaseModel
from typing import Optional, List, Literal, Any, Dict


# ============================================================================
# COMMON TYPES
# ============================================================================

Platform = Literal["aws", "gcp", "azure"]
Status = Literal["healthy", "degraded", "stopped", "error"]
WorkloadType = Literal["general", "compute", "memory", "storage", "gpu"]
IsolationType = Literal["public", "private", "hybrid"]
BlueprintCategory = Literal["web", "compute", "database", "storage", "development"]
Architecture = Literal["x86_64", "arm64"]
ImageStatus = Literal["available", "pending", "failed"]
AccountStatus = Literal["connected", "disconnected", "error"]
CertType = Literal["acm", "none", "custom"]
SecurityConfigType = Literal["built-in", "user"]
BudgetPeriod = Literal["daily", "weekly", "monthly"]
Difficulty = Literal["Beginner", "Intermediate", "Advanced"]
LearningStatus = Literal["not-started", "in-progress", "completed"]
SortOrder = Literal["asc", "desc"]


class Region(BaseModel):
    """Region configuration."""

    value: str
    label: str


class Tag(BaseModel):
    """Tag key-value pair."""

    key: str
    value: str


# ============================================================================
# PROJECT
# ============================================================================


class Project(BaseModel):
    """Project model matching TypeScript interface."""

    id: int
    name: str
    description: str
    status: Status
    instanceCount: int
    color: str
    instances: List[int]  # Array of instance IDs
    created: str
    monthlyCost: float
    vpc: str
    platform: Platform
    region: str
    lastModified: str
    tags: List[str]
    costMonthToDate: float
    costLifetime: float
    costLimit: float
    uptimeDays: int


class CreateProjectRequest(BaseModel):
    """Request to create a new project."""

    name: str
    description: str
    platform: Platform
    region: str
    vpc: Optional[str] = None
    color: Optional[str] = None
    tags: Optional[List[str]] = None
    costLimit: Optional[float] = None


class UpdateProjectRequest(BaseModel):
    """Request to update an existing project."""

    name: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[List[str]] = None
    costLimit: Optional[float] = None


# ============================================================================
# INSTANCE
# ============================================================================


class Instance(BaseModel):
    """Instance model matching TypeScript interface."""

    id: int
    name: str
    projectId: int
    projectName: str
    projectColor: str
    status: Status
    instanceType: str
    platform: Platform
    region: str
    publicIp: Optional[str] = None
    privateIp: str
    created: str
    uptime: str
    monthlyCost: float
    storage: int
    securityConfig: str
    sshKey: Optional[str] = None
    tags: List[str]


class CreateInstanceRequest(BaseModel):
    """Request to create a new instance."""

    name: str
    projectId: int
    instanceType: str
    platform: Platform
    region: str
    storage: int
    securityConfigId: int
    sshKey: Optional[str] = None
    publicIp: Optional[bool] = False
    tags: Optional[List[str]] = None


class UpdateInstanceRequest(BaseModel):
    """Request to update an existing instance."""

    name: Optional[str] = None
    instanceType: Optional[str] = None
    storage: Optional[int] = None
    tags: Optional[List[str]] = None


# ============================================================================
# BLUEPRINT
# ============================================================================


class Blueprint(BaseModel):
    """Blueprint model matching TypeScript interface."""

    id: int
    name: str
    description: str
    useCase: str
    category: BlueprintCategory
    platform: Platform
    region: str
    instanceType: str
    storage: int
    workloadType: WorkloadType
    created: str
    lastModified: str
    usageCount: int
    tags: List[str]
    securityConfigId: Optional[int] = None


class CreateBlueprintRequest(BaseModel):
    """Request to create a new blueprint."""

    name: str
    description: str
    useCase: str
    category: str
    platform: Platform
    region: str
    instanceType: str
    storage: int
    workloadType: WorkloadType
    securityConfigId: Optional[int] = None
    tags: Optional[List[str]] = None


class UpdateBlueprintRequest(BaseModel):
    """Request to update an existing blueprint."""

    name: Optional[str] = None
    description: Optional[str] = None
    useCase: Optional[str] = None
    instanceType: Optional[str] = None
    storage: Optional[int] = None
    tags: Optional[List[str]] = None


# ============================================================================
# SECURITY CONFIGURATION
# ============================================================================


class InboundPort(BaseModel):
    """Inbound port configuration."""

    port: int | str
    protocol: str
    description: str


class NetworkConfig(BaseModel):
    """Network configuration."""

    useDefaultVpc: bool
    customCidr: Optional[str] = None
    isolation: IsolationType


class StorageAccess(BaseModel):
    """Storage access configuration."""

    s3: bool
    description: str


class SecurityConfig(BaseModel):
    """Security configuration model matching TypeScript interface."""

    id: int
    name: str
    description: str
    type: SecurityConfigType
    keyPair: str
    certType: CertType
    securityGroups: List[str]
    iamRole: Optional[str] = None
    network: Optional[NetworkConfig] = None
    loadBalancer: Optional[bool] = None
    publicIp: Optional[bool] = None
    inboundPorts: Optional[List[InboundPort]] = None
    outboundRules: Optional[str] = None
    storageAccess: Optional[StorageAccess] = None
    tags: Optional[List[str]] = None


class CreateSecurityConfigRequest(BaseModel):
    """Request to create a new security configuration."""

    name: str
    description: str
    keyPair: str
    certType: CertType
    securityGroups: List[str]
    iamRole: Optional[str] = None
    network: Optional[NetworkConfig] = None
    loadBalancer: Optional[bool] = None
    publicIp: Optional[bool] = None
    inboundPorts: Optional[List[InboundPort]] = None
    outboundRules: Optional[str] = None
    storageAccess: Optional[StorageAccess] = None
    tags: Optional[List[str]] = None


# ============================================================================
# IMAGE (AMI/Custom Images)
# ============================================================================


class Image(BaseModel):
    """Image/AMI model matching TypeScript interface."""

    id: int
    name: str
    description: str
    imageId: str
    platform: Platform
    region: str
    os: str
    architecture: Architecture
    size: int
    created: str
    lastModified: str
    status: ImageStatus
    tags: List[str]
    public: bool
    sourceInstanceId: Optional[int] = None


class CreateImageRequest(BaseModel):
    """Request to create a new image."""

    name: str
    description: str
    platform: Platform
    region: str
    sourceInstanceId: Optional[int] = None
    tags: Optional[List[str]] = None


# ============================================================================
# ACCOUNT
# ============================================================================


class ResourceCount(BaseModel):
    """Resource count for an account."""

    projects: int
    instances: int
    images: int


class Account(BaseModel):
    """Account model matching TypeScript interface."""

    id: int
    name: str
    platform: Platform
    accountId: str
    status: AccountStatus
    region: str
    accessKey: Optional[str] = None
    isDefault: bool
    created: str
    lastSynced: str
    resourceCount: ResourceCount
    accountAlias: Optional[str] = None


class CreateAccountRequest(BaseModel):
    """Request to create a new account."""

    name: str
    platform: Platform
    accountId: str
    region: str
    accessKey: str
    secretKey: str
    profile: Optional[str] = None  # AWS CLI profile name
    isDefault: Optional[bool] = False


# ============================================================================
# COST MANAGEMENT
# ============================================================================


class CostData(BaseModel):
    """Cost data for a specific date."""

    date: str
    compute: float
    storage: float
    network: float
    other: float


class BudgetAlert(BaseModel):
    """Budget alert configuration."""

    id: int
    name: str
    threshold: float
    currentSpend: float
    period: BudgetPeriod
    enabled: bool


class CostByService(BaseModel):
    """Cost breakdown by service."""

    service: str
    cost: float
    percentage: float


class CostSummary(BaseModel):
    """Cost summary data."""

    currentMonth: float
    lastMonth: float
    projectedMonth: float
    byService: List[CostByService]
    dailyData: List[CostData]


# ============================================================================
# LEARNING
# ============================================================================


class LearningModule(BaseModel):
    """Learning module model."""

    id: int
    title: str
    description: str
    category: str
    difficulty: Difficulty
    duration: str
    progress: int
    status: LearningStatus
    icon: Any  # Icon component data
    topics: List[str]


# ============================================================================
# API RESPONSE WRAPPERS
# ============================================================================


class ApiResponse(BaseModel):
    """Generic API response wrapper."""

    success: bool
    data: Optional[Any] = None
    error: Optional[str] = None
    message: Optional[str] = None


class Pagination(BaseModel):
    """Pagination metadata."""

    page: int
    pageSize: int
    totalPages: int
    totalItems: int


class PaginatedResponse(BaseModel):
    """Paginated response wrapper."""

    success: bool
    data: List[Any]
    pagination: Pagination


class ListOptions(BaseModel):
    """Options for listing entities."""

    page: Optional[int] = 1
    pageSize: Optional[int] = 50
    sortBy: Optional[str] = None
    sortOrder: Optional[SortOrder] = "asc"
    search: Optional[str] = None
    filters: Optional[dict[str, Any]] = None


# ============================================================================
# SECURITY
# ============================================================================


class CreateKeyPairRequest(BaseModel):
    """SSH key pair creation request."""

    name: str
    description: Optional[str] = None
    keyType: str = "ed25519"


class CreateSecurityGroupRequest(BaseModel):
    """Security group creation request."""

    name: str
    description: str
    vpcId: Optional[str] = None
    inboundRules: Optional[List[Dict[str, Any]]] = None
    outboundRules: Optional[List[Dict[str, Any]]] = None


class CreateIAMRoleRequest(BaseModel):
    """IAM role creation request."""

    name: str
    description: Optional[str] = None
    trustPolicy: str
    managedPolicies: Optional[List[str]] = None
    inlinePolicy: Optional[str] = None


class CreateCertificateRequest(BaseModel):
    """SSL certificate creation request."""

    domain: str
    additionalDomains: Optional[List[str]] = None
    validationMethod: str = "DNS"


# ============================================================================
# PERMISSIONS
# ============================================================================


class PermissionStatus(BaseModel):
    """Individual permission status."""

    action: str  # e.g., "ec2:DescribeInstances"
    status: str  # "allowed" | "denied" | "unknown"
    description: str  # User-friendly description
    critical: bool  # Whether this permission is critical
    featureImpact: Optional[str] = None  # What feature won't work


class ServicePermissions(BaseModel):
    """Permissions grouped by AWS service."""

    service: str  # e.g., "EC2", "IAM"
    total: int  # Total permissions for service
    allowed: int  # Number allowed
    denied: int  # Number denied
    unknown: int  # Number unknown
    permissions: List[PermissionStatus]


class PermissionCheckResult(BaseModel):
    """Complete permission check result."""

    accountId: int
    checkedAt: str  # ISO timestamp
    services: List[ServicePermissions]
    canSimulate: bool  # Whether IAM simulator was available
    overallStatus: str  # "full" | "partial" | "none" | "unknown"
    minimalPolicy: Optional[str] = (
        None  # Generated IAM policy JSON for denied permissions
    )
