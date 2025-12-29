// ============================================================================
// AWS HEALTH MONITORING
// ============================================================================
// AWS connectivity and service health monitoring
// ============================================================================

use crate::aws::{AwsClient, AwsResult, AwsError, AwsHealthReport};
use std::sync::Arc;
use tokio::sync::RwLock;
use chrono::{DateTime, Utc, Duration};
use serde::{Serialize, Deserialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AwsHealthStatus {
    pub overall_status: String, // "healthy", "degraded", "unhealthy"
    pub last_check: DateTime<Utc>,
    pub services: Vec<AwsHealthReport>,
    pub connectivity_status: ConnectivityStatus,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectivityStatus {
    pub can_connect: bool,
    pub last_successful_connection: Option<DateTime<Utc>>,
    pub consecutive_failures: u32,
    pub error_message: Option<String>,
}

#[derive(Clone)]
pub struct AwsHealthMonitor {
    client: AwsClient,
    status: Arc<RwLock<AwsHealthStatus>>,
    check_interval_seconds: i64,
    event_emitter: Arc<crate::aws::events::AwsEventEmitter>,
}

impl AwsHealthMonitor {
    pub fn new(client: AwsClient, check_interval_seconds: i64, event_emitter: Arc<crate::aws::events::AwsEventEmitter>) -> Self {
        let initial_status = AwsHealthStatus {
            overall_status: "unknown".to_string(),
            last_check: Utc::now(),
            services: Vec::new(),
            connectivity_status: ConnectivityStatus {
                can_connect: false,
                last_successful_connection: None,
                consecutive_failures: 0,
                error_message: Some("Not yet checked".to_string()),
            },
        };

        Self {
            client,
            status: Arc::new(RwLock::new(initial_status)),
            check_interval_seconds,
            event_emitter,
        }
    }

    /// Perform a comprehensive health check
    pub async fn perform_health_check(&self) -> AwsResult<AwsHealthStatus> {
        tracing::debug!("Performing AWS health check");

        let mut services = Vec::new();
        let mut overall_status = "healthy".to_string();
        let mut connectivity_status = ConnectivityStatus {
            can_connect: false,
            last_successful_connection: None,
            consecutive_failures: 0,
            error_message: None,
        };

        // Check basic connectivity
        match self.check_connectivity().await {
            Ok(last_success) => {
                connectivity_status.can_connect = true;
                connectivity_status.last_successful_connection = Some(last_success);
                connectivity_status.consecutive_failures = 0;
                services.push(AwsHealthReport {
                    service: "connectivity".to_string(),
                    status: "healthy".to_string(),
                    details: vec!["AWS API connectivity successful".to_string()],
                    last_check: Utc::now().to_rfc3339(),
                });
            }
            Err(e) => {
                connectivity_status.can_connect = false;
                connectivity_status.consecutive_failures = self.get_current_failures().await + 1;
                connectivity_status.error_message = Some(format!("Connectivity check failed: {}", e));
                overall_status = "unhealthy".to_string();
                services.push(AwsHealthReport {
                    service: "connectivity".to_string(),
                    status: "unhealthy".to_string(),
                    details: vec![format!("AWS API connectivity failed: {}", e)],
                    last_check: Utc::now().to_rfc3339(),
                });
            }
        }

        // Only check other services if we can connect
        if connectivity_status.can_connect {
            // Check EC2 service
            match self.check_ec2_health().await {
                Ok(report) => services.push(report),
                Err(e) => {
                    tracing::warn!("EC2 health check failed: {:?}", e);
                    overall_status = "degraded".to_string();
                    services.push(AwsHealthReport {
                        service: "ec2".to_string(),
                        status: "unhealthy".to_string(),
                        details: vec![format!("EC2 health check failed: {}", e)],
                        last_check: Utc::now().to_rfc3339(),
                    });
                }
            }

            // Check S3 service
            match self.check_s3_health().await {
                Ok(report) => services.push(report),
                Err(e) => {
                    tracing::warn!("S3 health check failed: {:?}", e);
                    overall_status = "degraded".to_string();
                    services.push(AwsHealthReport {
                        service: "s3".to_string(),
                        status: "unhealthy".to_string(),
                        details: vec![format!("S3 health check failed: {}", e)],
                        last_check: Utc::now().to_rfc3339(),
                    });
                }
            }

            // Check IAM service
            match self.check_iam_health().await {
                Ok(report) => services.push(report),
                Err(e) => {
                    tracing::warn!("IAM health check failed: {:?}", e);
                    overall_status = "degraded".to_string();
                    services.push(AwsHealthReport {
                        service: "iam".to_string(),
                        status: "unhealthy".to_string(),
                        details: vec![format!("IAM health check failed: {}", e)],
                        last_check: Utc::now().to_rfc3339(),
                    });
                }
            }
        }

        let new_status = AwsHealthStatus {
            overall_status,
            last_check: Utc::now(),
            services,
            connectivity_status,
        };

        // Update stored status
        {
            let mut status = self.status.write().await;
            *status = new_status.clone();
        }

        tracing::debug!("Health check completed: {}", new_status.overall_status);
        Ok(new_status)
    }

    /// Check basic AWS connectivity
    async fn check_connectivity(&self) -> AwsResult<DateTime<Utc>> {
        let ec2_client = &self.client.ec2_client;

        // Simple connectivity test - describe regions
        let start_time = Utc::now();
        ec2_client
            .describe_regions()
            .send()
            .await
            .map_err(|e| {
                tracing::debug!("Connectivity test failed: {:?}", e);
                AwsError::NetworkError(format!("Connectivity test failed: {}", e))
            })?;

        Ok(start_time)
    }

    /// Check EC2 service health
    async fn check_ec2_health(&self) -> AwsResult<AwsHealthReport> {
        let ec2_client = &self.client.ec2_client;

        // Try to describe instances (limited to avoid costs)
        let response = ec2_client
            .describe_instances()
            .max_results(5)
            .send()
            .await
            .map_err(|e| AwsError::from(aws_sdk_ec2::Error::from(e)))?;

        let instance_count = response.reservations()
            .iter()
            .map(|r| r.instances().len())
            .sum::<usize>();

        Ok(AwsHealthReport {
            service: "ec2".to_string(),
            status: "healthy".to_string(),
            details: vec![
                format!("Successfully queried EC2 instances"),
                format!("Found {} instances in response", instance_count),
            ],
            last_check: Utc::now().to_rfc3339(),
        })
    }

    /// Check S3 service health
    async fn check_s3_health(&self) -> AwsResult<AwsHealthReport> {
        let s3_client = &self.client.s3_client;

        // Try to list buckets
        let response = s3_client
            .list_buckets()
            .send()
            .await
            .map_err(|e| AwsError::from(aws_sdk_s3::Error::from(e)))?;

        let bucket_count = response.buckets().len();

        Ok(AwsHealthReport {
            service: "s3".to_string(),
            status: "healthy".to_string(),
            details: vec![
                format!("Successfully queried S3 buckets"),
                format!("Found {} buckets", bucket_count),
            ],
            last_check: Utc::now().to_rfc3339(),
        })
    }

    /// Check IAM service health
    async fn check_iam_health(&self) -> AwsResult<AwsHealthReport> {
        let iam_client = &self.client.iam_client;

        // Try to get account summary (safe, read-only operation)
        let response = iam_client
            .get_account_summary()
            .send()
            .await
            .map_err(|e| AwsError::from(aws_sdk_iam::Error::from(e)))?;

        let summary_items = response.summary_map()
            .map(|m| m.len())
            .unwrap_or(0);

        Ok(AwsHealthReport {
            service: "iam".to_string(),
            status: "healthy".to_string(),
            details: vec![
                format!("Successfully queried IAM account summary"),
                format!("Account has {} summary metrics", summary_items),
            ],
            last_check: Utc::now().to_rfc3339(),
        })
    }

    /// Get current health status
    pub async fn get_health_status(&self) -> AwsHealthStatus {
        let status = self.status.read().await;
        status.clone()
    }

    /// Get current consecutive failures count
    async fn get_current_failures(&self) -> u32 {
        let status = self.status.read().await;
        status.connectivity_status.consecutive_failures
    }

    /// Check if health check is needed (based on interval)
    pub async fn needs_health_check(&self) -> bool {
        let status = self.status.read().await;
        let now = Utc::now();
        let time_since_last_check = now - status.last_check;
        time_since_last_check > Duration::seconds(self.check_interval_seconds)
    }

    /// Start background health monitoring
    pub fn start_background_monitoring(self) {
        let interval_seconds = self.check_interval_seconds;
        tokio::spawn(async move {
            let interval = std::time::Duration::from_secs(interval_seconds as u64);
            loop {
                tokio::time::sleep(interval).await;

                if let Err(e) = self.perform_health_check().await {
                    tracing::error!("Background health check failed: {:?}", e);
                }
            }
        });
        tracing::info!("Started background AWS health monitoring (interval: {}s)", interval_seconds);
    }

    /// Force a health check and return the result
    pub async fn force_health_check(&self) -> AwsResult<AwsHealthStatus> {
        tracing::info!("Forcing AWS health check");
        self.perform_health_check().await
    }

    /// Get detailed service status
    pub async fn get_service_status(&self, service_name: &str) -> Option<AwsHealthReport> {
        let status = self.status.read().await;
        status.services
            .iter()
            .find(|s| s.service == service_name)
            .cloned()
    }

    /// Check if AWS services are accessible
    pub async fn is_accessible(&self) -> bool {
        let status = self.status.read().await;
        status.connectivity_status.can_connect
    }
}

/// Integration point for main health system (to be implemented)
/// For now, provides AWS health status directly
pub struct HealthIntegration {
    aws_monitor: AwsHealthMonitor,
}

impl HealthIntegration {
    pub fn new(aws_monitor: AwsHealthMonitor) -> Self {
        Self { aws_monitor }
    }

    /// Get AWS health status as a formatted report
    pub async fn get_aws_health_report(&self) -> String {
        let aws_status = self.aws_monitor.get_health_status().await;

        let mut report = format!("AWS Services Health Report\n");
        report.push_str(&format!("Overall Status: {}\n", aws_status.overall_status));
        report.push_str(&format!("Last Check: {}\n", aws_status.last_check.format("%Y-%m-%d %H:%M:%S UTC")));
        report.push_str(&format!("Connectivity: {}\n", if aws_status.connectivity_status.can_connect { "OK" } else { "FAILED" }));

        if let Some(error) = &aws_status.connectivity_status.error_message {
            report.push_str(&format!("Connection Error: {}\n", error));
        }

        report.push_str("\nService Details:\n");
        for service in &aws_status.services {
            report.push_str(&format!("- {}: {}\n", service.service, service.status));
            for detail in &service.details {
                report.push_str(&format!("  {}\n", detail));
            }
        }

        report
    }

    /// Force AWS health check
    pub async fn force_aws_health_check(&self) -> AwsResult<AwsHealthStatus> {
        self.aws_monitor.force_health_check().await
    }

    /// Get raw AWS health status for integration
    pub async fn get_aws_health_status(&self) -> AwsHealthStatus {
        self.aws_monitor.get_health_status().await
    }
}