// ============================================================================
// AWS DATA TYPES
// ============================================================================
// Comprehensive data models matching frontend expectations
// ============================================================================

use serde::{Deserialize, Serialize};

// ============================================================================
// EC2 TYPES
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AwsInstance {
    pub instance_id: String,
    pub instance_type: String,
    pub state: String,
    pub region: String,
    pub availability_zone: String,
    pub platform: String, // Always "aws"
    pub cpu_count: i32,
    pub memory_gb: f64,
    pub storage_gb: f64,
    pub network_performance: String,
    pub public_ip: Option<String>,
    pub private_ip: Option<String>,
    pub security_groups: Vec<AwsSecurityGroup>,
    pub key_pairs: Vec<String>,
    pub tags: std::collections::HashMap<String, String>,
    pub launch_time: String,
    pub monitoring_enabled: bool,
    pub ebs_optimized: bool,
    pub virtualization_type: String,
    pub architecture: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AwsSecurityGroup {
    pub group_id: String,
    pub group_name: String,
    pub description: Option<String>,
}

// ============================================================================
// S3 TYPES
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AwsBucket {
    pub name: String,
    pub region: String,
    pub platform: String, // Always "aws"
    pub object_count: i64,
    pub total_size_bytes: i64,
    pub total_size_gb: f64,
    pub last_modified: Option<String>,
    pub storage_class: String,
    pub versioning_enabled: bool,
    pub encryption: Option<String>,
    pub public_access_block: bool,
}

// ============================================================================
// IAM TYPES
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AwsIamUser {
    pub user_name: String,
    pub user_id: String,
    pub arn: String,
    pub create_date: String,
    pub password_last_used: Option<String>,
    pub access_keys: Vec<AwsAccessKey>,
    pub attached_policies: Vec<AwsPolicy>,
    pub groups: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AwsAccessKey {
    pub access_key_id: String,
    pub status: String,
    pub create_date: String,
    pub last_used: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AwsPolicy {
    pub policy_name: String,
    pub policy_arn: String,
    pub policy_type: String,
}

// ============================================================================
// LAMBDA TYPES
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AwsLambdaFunction {
    pub function_name: String,
    pub function_arn: String,
    pub runtime: String,
    pub handler: String,
    pub code_size: i64,
    pub description: Option<String>,
    pub timeout: i32,
    pub memory_size: i32,
    pub last_modified: String,
    pub version: String,
    pub environment_variables: std::collections::HashMap<String, String>,
    pub region: String,
}

// ============================================================================
// COST TRACKING TYPES
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CostAlert {
    pub alert_type: String,
    pub message: String,
    pub severity: String, // "warning", "critical"
}

// ============================================================================
// HEALTH TYPES
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AwsHealthReport {
    pub service: String,
    pub status: String, // "healthy", "degraded", "unhealthy"
    pub details: Vec<String>,
    pub last_check: String,
}