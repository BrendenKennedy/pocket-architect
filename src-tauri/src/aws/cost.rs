// ============================================================================
// COST TRACKING SERVICE
// ============================================================================
// API usage monitoring with cost tracking and alerts
// ============================================================================

use crate::aws::{AwsClient, CostAlert, AwsResult, AwsError};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use tokio::sync::RwLock;
use chrono::{DateTime, Utc};

#[derive(Clone)]
pub struct CostTracker {
    client: AwsClient,
    api_call_count: Arc<AtomicU64>,
    estimated_cost_usd: Arc<AtomicU64>, // Stored as micro-dollars (millionths of a dollar)
    cost_limit_usd: f64,
    alert_threshold_percent: f64,
    start_time: DateTime<Utc>,
}

impl CostTracker {
    pub fn new(client: AwsClient, cost_limit_usd: f64, alert_threshold_percent: f64) -> Self {
        Self {
            client,
            api_call_count: Arc::new(AtomicU64::new(0)),
            estimated_cost_usd: Arc::new(AtomicU64::new(0)),
            cost_limit_usd,
            alert_threshold_percent,
            start_time: Utc::now(),
        }
    }

    /// Record an API call and update cost estimates
    pub async fn record_api_call(&self, service: &str, operation: &str) -> AwsResult<()> {
        let call_count = self.api_call_count.fetch_add(1, Ordering::Relaxed) + 1;

        // Estimate cost based on service and operation
        let cost_micros = self.estimate_operation_cost(service, operation);
        let total_cost_micros = self.estimated_cost_usd.fetch_add(cost_micros, Ordering::Relaxed) + cost_micros;

        let total_cost_usd = total_cost_micros as f64 / 1_000_000.0;

        tracing::debug!(
            "API call recorded: {}::{} (call #{}, total cost: ${:.6})",
            service, operation, call_count, total_cost_usd
        );

        // Check if we've exceeded the alert threshold
        let threshold_usd = self.cost_limit_usd * (self.alert_threshold_percent / 100.0);
        if total_cost_usd > threshold_usd {
            tracing::warn!(
                "Cost alert triggered: ${:.6} > ${:.6} ({}% of limit ${:.2})",
                total_cost_usd, threshold_usd, self.alert_threshold_percent, self.cost_limit_usd
            );
        }

        Ok(())
    }

    /// Estimate cost for a specific operation (simplified pricing)
    fn estimate_operation_cost(&self, service: &str, operation: &str) -> u64 {
        // AWS pricing in USD per operation (converted to micro-dollars)
        // These are simplified estimates - real pricing would be more complex
        match (service, operation) {
            // EC2 operations
            ("ec2", "DescribeInstances") => 2_000, // ~$0.002 per call
            ("ec2", "RunInstances") => 100_000,   // ~$0.10 per instance launched
            ("ec2", "TerminateInstances") => 2_000, // ~$0.002 per call

            // S3 operations
            ("s3", "ListBuckets") => 1_000,       // ~$0.001 per call
            ("s3", "CreateBucket") => 5_000,      // ~$0.005 per bucket
            ("s3", "DeleteBucket") => 1_000,      // ~$0.001 per call
            ("s3", "ListObjectsV2") => 500,       // ~$0.0005 per 1000 objects

            // IAM operations
            ("iam", "ListUsers") => 2_000,        // ~$0.002 per call
            ("iam", "ListRoles") => 2_000,        // ~$0.002 per call
            ("iam", "GetUser") => 1_000,          // ~$0.001 per call

            // Default fallback
            _ => 1_000, // ~$0.001 per unknown operation
        }
    }

    /// Get current cost status
    pub async fn get_cost_status(&self) -> AwsResult<CostStatus> {
        let call_count = self.api_call_count.load(Ordering::Relaxed);
        let total_cost_micros = self.estimated_cost_usd.load(Ordering::Relaxed);
        let total_cost_usd = total_cost_micros as f64 / 1_000_000.0;

        let threshold_usd = self.cost_limit_usd * (self.alert_threshold_percent / 100.0);
        let percent_used = if self.cost_limit_usd > 0.0 {
            (total_cost_usd / self.cost_limit_usd) * 100.0
        } else {
            0.0
        };

        let alerts = if total_cost_usd > threshold_usd {
            vec![CostAlert {
                alert_type: "cost_threshold_exceeded".to_string(),
                message: format!(
                    "Estimated cost ${:.6} exceeds {}% threshold (${:.6})",
                    total_cost_usd, self.alert_threshold_percent, threshold_usd
                ),
                severity: "warning".to_string(),
            }]
        } else {
            vec![]
        };

        Ok(CostStatus {
            total_api_calls: call_count,
            estimated_cost_usd: total_cost_usd,
            cost_limit_usd: self.cost_limit_usd,
            percent_used,
            alerts,
            tracking_start: self.start_time.to_rfc3339(),
        })
    }

    /// Check if cost limit would be exceeded by a proposed operation
    pub async fn check_cost_limit(&self, service: &str, operation: &str) -> AwsResult<bool> {
        let current_cost_micros = self.estimated_cost_usd.load(Ordering::Relaxed);
        let current_cost_usd = current_cost_micros as f64 / 1_000_000.0;

        let operation_cost_micros = self.estimate_operation_cost(service, operation);
        let operation_cost_usd = operation_cost_micros as f64 / 1_000_000.0;

        let projected_cost_usd = current_cost_usd + operation_cost_usd;

        let would_exceed = projected_cost_usd > self.cost_limit_usd;

        if would_exceed {
            tracing::warn!(
                "Operation {}::{} would exceed cost limit: current=${:.6}, operation=${:.6}, projected=${:.6}, limit=${:.2}",
                service, operation, current_cost_usd, operation_cost_usd, projected_cost_usd, self.cost_limit_usd
            );
        }

        Ok(would_exceed)
    }

    /// Reset cost tracking (for new sessions)
    pub async fn reset_tracking(&self) {
        self.api_call_count.store(0, Ordering::Relaxed);
        self.estimated_cost_usd.store(0, Ordering::Relaxed);
        tracing::info!("Cost tracking reset");
    }

    /// Get cost limit
    pub fn cost_limit(&self) -> f64 {
        self.cost_limit_usd
    }

    /// Get alert threshold percentage
    pub fn alert_threshold(&self) -> f64 {
        self.alert_threshold_percent
    }
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct CostStatus {
    pub total_api_calls: u64,
    pub estimated_cost_usd: f64,
    pub cost_limit_usd: f64,
    pub percent_used: f64,
    pub alerts: Vec<CostAlert>,
    pub tracking_start: String,
}

/// Cost tracking wrapper that can be shared across services
#[derive(Clone)]
pub struct SharedCostTracker {
    inner: Arc<RwLock<CostTracker>>,
}

impl SharedCostTracker {
    pub fn new(client: AwsClient, cost_limit_usd: f64, alert_threshold_percent: f64) -> Self {
        Self {
            inner: Arc::new(RwLock::new(CostTracker::new(client, cost_limit_usd, alert_threshold_percent))),
        }
    }

    pub async fn record_api_call(&self, service: &str, operation: &str) -> AwsResult<()> {
        let tracker = self.inner.read().await;
        tracker.record_api_call(service, operation).await
    }

    pub async fn get_cost_status(&self) -> AwsResult<CostStatus> {
        let tracker = self.inner.read().await;
        tracker.get_cost_status().await
    }

    pub async fn check_cost_limit(&self, service: &str, operation: &str) -> AwsResult<bool> {
        let tracker = self.inner.read().await;
        tracker.check_cost_limit(service, operation).await
    }

    pub async fn reset_tracking(&self) {
        let tracker = self.inner.read().await;
        tracker.reset_tracking().await
    }
}