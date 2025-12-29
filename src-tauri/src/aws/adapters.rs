// ============================================================================
// DATA ADAPTERS
// ============================================================================
// Transform AWS backend data structures to frontend expectations
// ============================================================================

use crate::aws::types::*;
use crate::aws::cost::CostStatus;
use chrono::{DateTime, Utc, Duration};

// ============================================================================
// INSTANCE ADAPTERS
// ============================================================================

/// Frontend Instance interface (matching frontend/src/types/models.ts)
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct Instance {
    pub id: i64,
    pub name: String,
    pub project_id: i64,
    pub project_name: String,
    pub project_color: String,
    pub status: String, // 'healthy' | 'degraded' | 'stopped' | 'error'
    pub instance_type: String,
    pub platform: String,
    pub region: String,
    pub public_ip: Option<String>,
    pub private_ip: String,
    pub created: String,
    pub uptime: String,
    pub monthly_cost: f64,
    pub storage: i64,
    pub security_config: String,
    pub ssh_key: String,
    pub tags: Vec<String>,
}

/// Convert AwsInstance to frontend Instance
pub fn aws_instance_to_frontend(aws_instance: AwsInstance, project_id: i64, project_name: String, project_color: String) -> Instance {
    let id = generate_instance_id(&aws_instance.instance_id);
    let name = generate_instance_name(&aws_instance.instance_id, &aws_instance.tags);
    let status = map_aws_state_to_frontend_status(&aws_instance.state);
    let created = aws_instance.launch_time.clone();
    let uptime = calculate_uptime(&aws_instance.launch_time);
    let monthly_cost = estimate_monthly_cost(&aws_instance);
    let storage = (aws_instance.storage_gb * 1024.0 * 1024.0 * 1024.0) as i64; // Convert GB to bytes
    let security_config = format_security_config(&aws_instance.security_groups);
    let ssh_key = aws_instance.key_pairs.first().cloned().unwrap_or_else(|| "default".to_string());
    let tags = aws_instance.tags.into_iter().map(|(k, v)| format!("{}={}", k, v)).collect();

    Instance {
        id,
        name,
        project_id,
        project_name,
        project_color,
        status,
        instance_type: aws_instance.instance_type,
        platform: aws_instance.platform,
        region: aws_instance.region,
        public_ip: aws_instance.public_ip,
        private_ip: aws_instance.private_ip.unwrap_or_else(|| "unknown".to_string()),
        created,
        uptime,
        monthly_cost,
        storage,
        security_config,
        ssh_key,
        tags,
    }
}

/// Generate a numeric ID from AWS instance ID
fn generate_instance_id(aws_instance_id: &str) -> i64 {
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};

    let mut hasher = DefaultHasher::new();
    aws_instance_id.hash(&mut hasher);
    let hash = hasher.finish();

    // Convert hash to positive i64, ensuring it's not too large
    (hash % i64::MAX as u64) as i64
}

/// Generate human-readable instance name from AWS data
fn generate_instance_name(aws_instance_id: &str, tags: &std::collections::HashMap<String, String>) -> String {
    // Check for Name tag first
    if let Some(name) = tags.get("Name") {
        if !name.is_empty() {
            return name.clone();
        }
    }

    // Fallback to instance ID
    aws_instance_id.to_string()
}

/// Map AWS instance state to frontend status
fn map_aws_state_to_frontend_status(aws_state: &str) -> String {
    match aws_state.to_lowercase().as_str() {
        "running" => "healthy".to_string(),
        "stopped" | "stopping" => "stopped".to_string(),
        "pending" | "shutting-down" => "degraded".to_string(),
        "terminated" => "error".to_string(),
        _ => "unknown".to_string(),
    }
}

/// Calculate uptime from launch time
fn calculate_uptime(launch_time: &str) -> String {
    if let Ok(launch_dt) = DateTime::parse_from_rfc3339(launch_time) {
        let now = Utc::now();
        let duration = now.signed_duration_since(launch_dt.with_timezone(&Utc));

        if duration.num_days() > 0 {
            format!("{}d {}h", duration.num_days(), duration.num_hours() % 24)
        } else if duration.num_hours() > 0 {
            format!("{}h {}m", duration.num_hours(), duration.num_minutes() % 60)
        } else {
            format!("{}m", duration.num_minutes())
        }
    } else {
        "unknown".to_string()
    }
}

/// Estimate monthly cost for an instance (simplified)
fn estimate_monthly_cost(instance: &AwsInstance) -> f64 {
    // Basic cost estimation based on instance type
    // In a real implementation, this would use AWS pricing API
    let base_cost_per_hour = match instance.instance_type.as_str() {
        "t2.micro" => 0.0116,
        "t2.small" => 0.023,
        "t2.medium" => 0.0464,
        "t3.micro" => 0.0104,
        "t3.small" => 0.0208,
        "t3.medium" => 0.0416,
        "m5.large" => 0.096,
        "m5.xlarge" => 0.192,
        "c5.large" => 0.085,
        _ => 0.05, // Default fallback
    };

    // Assume 730 hours per month (24 * 30.4)
    base_cost_per_hour * 730.0
}

/// Format security groups for display
fn format_security_config(security_groups: &[AwsSecurityGroup]) -> String {
    if security_groups.is_empty() {
        return "default".to_string();
    }

    security_groups.iter()
        .map(|sg| sg.group_name.clone())
        .collect::<Vec<String>>()
        .join(", ")
}

// ============================================================================
// COST ADAPTERS
// ============================================================================

/// Frontend CostSummary interface
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct CostSummary {
    pub current_month: f64,
    pub last_month: f64,
    pub projected_month: f64,
    pub by_service: Vec<CostByService>,
    pub daily_data: Vec<CostData>,
}

/// Frontend CostByService interface
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct CostByService {
    pub service: String,
    pub cost: f64,
    pub percentage: f64,
}

/// Frontend CostData interface
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct CostData {
    pub date: String,
    pub compute: f64,
    pub storage: f64,
    pub network: f64,
    pub other: f64,
}

/// Convert CostStatus to CostSummary
pub fn cost_status_to_summary(cost_status: CostStatus) -> CostSummary {
    let current_month = cost_status.estimated_cost_usd;
    let last_month = 0.0; // We don't track historical data yet
    let projected_month = current_month * 1.1; // Simple projection

    let by_service = vec![
        CostByService {
            service: "EC2".to_string(),
            cost: current_month * 0.7, // Assume 70% EC2
            percentage: 70.0,
        },
        CostByService {
            service: "S3".to_string(),
            cost: current_month * 0.2, // Assume 20% S3
            percentage: 20.0,
        },
        CostByService {
            service: "Other".to_string(),
            cost: current_month * 0.1, // Assume 10% other
            percentage: 10.0,
        },
    ];

    // Generate mock daily data for the last 30 days
    let mut daily_data = Vec::new();
    let base_daily_cost = current_month / 30.0;

    for i in 0..30 {
        let date = (Utc::now() - Duration::days(29 - i)).format("%Y-%m-%d").to_string();
        daily_data.push(CostData {
            date,
            compute: base_daily_cost * 0.7,
            storage: base_daily_cost * 0.2,
            network: base_daily_cost * 0.05,
            other: base_daily_cost * 0.05,
        });
    }

    CostSummary {
        current_month,
        last_month,
        projected_month,
        by_service,
        daily_data,
    }
}

// ============================================================================
// PROJECT ADAPTERS (Placeholder - Project entity not yet implemented)
// ============================================================================

/// Frontend Project interface (simplified)
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct Project {
    pub id: i64,
    pub name: String,
    pub description: String,
    pub status: String,
    pub instance_count: i32,
    pub color: String,
    pub instances: Vec<i64>,
    pub created: String,
    pub monthly_cost: f64,
    pub vpc: String,
    pub platform: String,
    pub region: String,
    pub last_modified: String,
    pub tags: Vec<String>,
    pub cost_month_to_date: f64,
    pub cost_lifetime: f64,
    pub cost_limit: f64,
    pub uptime_days: f64,
}

/// Create a mock project for instances without project assignment
pub fn create_default_project_for_instances(instances: &[AwsInstance]) -> Project {
    let project_id = 1; // Default project ID
    let instance_ids: Vec<i64> = instances.iter()
        .map(|i| generate_instance_id(&i.instance_id))
        .collect();

    Project {
        id: project_id,
        name: "Default AWS Project".to_string(),
        description: "Default project for discovered AWS instances".to_string(),
        status: "healthy".to_string(),
        instance_count: instances.len() as i32,
        color: "#3B82F6".to_string(), // Blue
        instances: instance_ids,
        created: Utc::now().to_rfc3339(),
        monthly_cost: instances.iter().map(|i| estimate_monthly_cost(i)).sum(),
        vpc: "default".to_string(),
        platform: "aws".to_string(),
        region: instances.first().map(|i| i.region.clone()).unwrap_or_else(|| "us-east-1".to_string()),
        last_modified: Utc::now().to_rfc3339(),
        tags: vec!["auto-generated".to_string()],
        cost_month_to_date: instances.iter().map(|i| estimate_monthly_cost(i) / 30.0).sum(),
        cost_lifetime: instances.iter().map(|i| estimate_monthly_cost(i)).sum(),
        cost_limit: 100.0, // Default $100 limit
        uptime_days: 30.0, // Assume 30 days
    }
}

// ============================================================================
// PAGINATION ADAPTERS
// ============================================================================

/// Frontend ListOptions interface
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ListOptions {
    pub page: Option<i32>,
    pub page_size: Option<i32>,
    pub sort_by: Option<String>,
    pub sort_order: Option<String>,
    pub search: Option<String>,
    pub filters: Option<std::collections::HashMap<String, serde_json::Value>>,
}

/// Frontend PaginatedResponse interface
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct PaginatedResponse<T> {
    pub success: bool,
    pub data: Vec<T>,
    pub pagination: PaginationInfo,
}

/// Frontend PaginationInfo interface
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct PaginationInfo {
    pub page: i32,
    pub page_size: i32,
    pub total_pages: i32,
    pub total_items: i32,
}

/// Apply pagination to a vector of items
pub fn paginate_items<T: Clone>(items: Vec<T>, options: Option<ListOptions>) -> PaginatedResponse<T> {
    let options = options.unwrap_or_default();

    let page = options.page.unwrap_or(1).max(1);
    let page_size = options.page_size.unwrap_or(20).max(1).min(100);

    let total_items = items.len() as i32;
    let total_pages = ((total_items as f64) / (page_size as f64)).ceil() as i32;

    let start_idx = ((page - 1) * page_size) as usize;
    let end_idx = (start_idx + page_size as usize).min(items.len());

    let data = if start_idx < items.len() {
        items[start_idx..end_idx].to_vec()
    } else {
        Vec::new()
    };

    PaginatedResponse {
        success: true,
        data,
        pagination: PaginationInfo {
            page,
            page_size,
            total_pages,
            total_items,
        },
    }
}

impl Default for ListOptions {
    fn default() -> Self {
        Self {
            page: Some(1),
            page_size: Some(20),
            sort_by: None,
            sort_order: Some("asc".to_string()),
            search: None,
            filters: None,
        }
    }
}