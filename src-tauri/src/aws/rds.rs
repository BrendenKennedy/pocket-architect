// ============================================================================
// RDS SERVICE IMPLEMENTATION
// ============================================================================
// RDS database instance management with real AWS API integration
// ============================================================================

use crate::aws::{AwsClient, AwsResult, AwsError};
use aws_sdk_rds::types::DbInstance;
use serde::{Deserialize, Serialize};
use chrono::Utc;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AwsRdsInstance {
    pub db_instance_identifier: String,
    pub db_instance_class: String,
    pub engine: String,
    pub engine_version: String,
    pub db_instance_status: String,
    pub allocated_storage: i32,
    pub instance_create_time: Option<String>,
    pub availability_zone: String,
    pub backup_retention_period: i32,
    pub db_instance_arn: String,
    pub region: String,
}

impl From<DbInstance> for AwsRdsInstance {
    fn from(instance: DbInstance) -> Self {
        Self {
            db_instance_identifier: instance.db_instance_identifier().unwrap_or_default().to_string(),
            db_instance_class: instance.db_instance_class().unwrap_or_default().to_string(),
            engine: instance.engine().unwrap_or_default().to_string(),
            engine_version: instance.engine_version().unwrap_or_default().to_string(),
            db_instance_status: instance.db_instance_status().unwrap_or_default().to_string(),
            allocated_storage: instance.allocated_storage().unwrap_or(0),
            instance_create_time: instance.instance_create_time().map(|dt| dt.to_string()),
            availability_zone: instance.availability_zone().unwrap_or_default().to_string(),
            backup_retention_period: instance.backup_retention_period().unwrap_or(0),
            db_instance_arn: instance.db_instance_arn().unwrap_or_default().to_string(),
            region: "unknown".to_string(), // Will be set by caller
        }
    }
}

pub struct RdsService {
    client: AwsClient,
}

impl RdsService {
    pub fn new(client: AwsClient) -> Self {
        Self { client }
    }

    /// Collect all RDS instances in the current region
    pub async fn collect_instances(&self) -> AwsResult<Vec<AwsRdsInstance>> {
        tracing::info!("Collecting RDS instances in region: {}", self.client.primary_region());

        let mut instances = Vec::new();

        let response = self.client.rds_client
            .describe_db_instances()
            .send()
            .await
            .map_err(|e| {
                tracing::error!("Failed to describe RDS instances: {:?}", e);
                AwsError::ApiError(format!("Failed to collect RDS instances: {}", e))
            })?;

        if let Some(db_instances) = response.db_instances {
            for db_instance in db_instances {
                let mut rds_instance: AwsRdsInstance = db_instance.into();
                rds_instance.region = self.client.primary_region().to_string();
                instances.push(rds_instance);
            }
        }

        tracing::info!("Collected {} RDS instances", instances.len());
        Ok(instances)
    }

    /// Create a new RDS instance
    pub async fn create_instance(
        &self,
        db_instance_identifier: &str,
        db_instance_class: &str,
        engine: &str,
        master_username: &str,
        master_password: &str,
        allocated_storage: i32,
    ) -> AwsResult<AwsRdsInstance> {
        tracing::info!("Creating RDS instance: {}", db_instance_identifier);

        let response = self.client.rds_client
            .create_db_instance()
            .db_instance_identifier(db_instance_identifier)
            .db_instance_class(db_instance_class)
            .engine(engine)
            .master_username(master_username)
            .master_user_password(master_password)
            .allocated_storage(allocated_storage)
            .send()
            .await
            .map_err(|e| {
                tracing::error!("Failed to create RDS instance: {:?}", e);
                AwsError::ApiError(format!("Failed to create RDS instance: {}", e))
            })?;

        if let Some(db_instance) = response.db_instance {
            let mut rds_instance: AwsRdsInstance = db_instance.into();
            rds_instance.region = self.client.primary_region().to_string();
            Ok(rds_instance)
        } else {
            Err(AwsError::ApiError("RDS instance creation response missing instance data".to_string()))
        }
    }

    /// Delete an RDS instance
    pub async fn delete_instance(&self, db_instance_identifier: &str, skip_final_snapshot: bool) -> AwsResult<()> {
        tracing::info!("Deleting RDS instance: {}", db_instance_identifier);

        let mut request = self.client.rds_client
            .delete_db_instance()
            .db_instance_identifier(db_instance_identifier);

        if skip_final_snapshot {
            request = request.skip_final_snapshot(true);
        } else {
            // Generate a final snapshot name
            let snapshot_name = format!("{}-final-{}", db_instance_identifier, Utc::now().timestamp());
            request = request.final_db_snapshot_identifier(snapshot_name);
        }

        request
            .send()
            .await
            .map_err(|e| {
                tracing::error!("Failed to delete RDS instance: {:?}", e);
                AwsError::ApiError(format!("Failed to delete RDS instance: {}", e))
            })?;

        tracing::info!("RDS instance deletion initiated: {}", db_instance_identifier);
        Ok(())
    }
}