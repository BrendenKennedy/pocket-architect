// ============================================================================
// EC2 SERVICE IMPLEMENTATION
// ============================================================================
// EC2 instance management with real AWS API integration
// ============================================================================

use crate::aws::{AwsClient, AwsInstance, AwsSecurityGroup, AwsResult, AwsError};
use aws_config::{BehaviorVersion, Region};
use aws_credential_types::Credentials;
use aws_sdk_ec2::types::{Instance as AwsSdkInstance, InstanceStateName, InstanceType};
use std::collections::HashMap;
use chrono::Utc;
use uuid::Uuid;

pub struct Ec2Service {
    client: AwsClient,
}

impl Ec2Service {
    pub fn new(client: AwsClient) -> Self {
        Self { client }
    }

    /// Collect all EC2 instances across all regions with cross-region fallback
    pub async fn collect_instances(&self) -> AwsResult<Vec<AwsInstance>> {
        tracing::info!("Starting EC2 instance collection across all regions");

        let mut all_instances = Vec::new();

        // Try primary region first
        match self.collect_instances_in_region(self.client.primary_region()).await {
            Ok(mut instances) => {
                all_instances.append(&mut instances);
                tracing::debug!("Collected {} instances from primary region {}", all_instances.len(), self.client.primary_region());
            }
            Err(e) => {
                tracing::warn!("Failed to collect instances from primary region {}: {:?}", self.client.primary_region(), e);

                // Try fallback region with cross-region client
                match self.collect_instances_cross_region(self.client.fallback_region()).await {
                    Ok(mut instances) => {
                        all_instances.append(&mut instances);
                        tracing::info!("Successfully collected {} instances from fallback region {} using cross-region fallback", all_instances.len(), self.client.fallback_region());
                    }
                    Err(e2) => {
                        tracing::error!("Failed to collect instances from both primary and fallback regions: primary={}, fallback={}", e, e2);
                        return Err(AwsError::RegionError(format!("Failed to collect instances from both regions: primary={}, fallback={}", e, e2)));
                    }
                }
            }
        }

        tracing::info!("Successfully collected {} EC2 instances total", all_instances.len());
        Ok(all_instances)
    }

    /// Collect EC2 instances using cross-region fallback client
    async fn collect_instances_cross_region(&self, region: &str) -> AwsResult<Vec<AwsInstance>> {
        tracing::debug!("Attempting cross-region collection for EC2 instances in region: {}", region);

        // Create a new client for the fallback region
        use crate::aws::AwsConfig;
        use aws_config::{BehaviorVersion, Region};
        use aws_sdk_ec2::Client as Ec2Client;

        let config = AwsConfig::load_from_file().map_err(|e| {
            tracing::error!("Failed to load AWS config for cross-region fallback: {:?}", e);
            AwsError::ConfigError(format!("Config load failed: {}", e))
        })?;

        let credentials = Credentials::new(
            config.credentials.access_key_id.clone(),
            config.credentials.secret_access_key.clone(),
            None, // session token
            None, // expiry
            "pocket-architect",
        );

        let aws_config = aws_config::defaults(BehaviorVersion::v2025_08_07())
            .region(Region::new(region.to_string()))
            .credentials_provider(credentials)
            .load()
            .await;

        let ec2_client = Ec2Client::new(&aws_config);

        // Test the fallback connection
        ec2_client
            .describe_regions()
            .send()
            .await
            .map_err(|e| {
                tracing::error!("Cross-region fallback connection test failed for region {}: {:?}", region, e);
                AwsError::NetworkError(format!("Cross-region connection failed: {}", e))
            })?;

        // Now collect instances with the fallback client
        let response = ec2_client
            .describe_instances()
            .send()
            .await
            .map_err(|e| {
                tracing::error!("Failed to describe instances in fallback region {}: {:?}", region, e);
                AwsError::SdkError(e.into())
            })?;

        let mut instances = Vec::new();

        for reservation in response.reservations().iter() {
            for instance in reservation.instances().iter() {
                if let Some(mapped_instance) = self.map_aws_instance(instance, region) {
                    instances.push(mapped_instance);
                }
            }
        }

        tracing::info!("Successfully collected {} instances using cross-region fallback in {}", instances.len(), region);
        Ok(instances)
    }

    /// Collect EC2 instances in a specific region
    async fn collect_instances_in_region(&self, region: &str) -> AwsResult<Vec<AwsInstance>> {
        tracing::debug!("Collecting EC2 instances in region: {}", region);

        let ec2_client = &self.client.ec2_client;

        let response = ec2_client
            .describe_instances()
            .send()
            .await
            .map_err(|e| {
                tracing::error!("Failed to describe instances in region {}: {:?}", region, e);
                AwsError::SdkError(e.into())
            })?;

        let mut instances = Vec::new();

        for reservation in response.reservations().iter() {
            for instance in reservation.instances().iter() {
                if let Some(mapped_instance) = self.map_aws_instance(instance, region) {
                    instances.push(mapped_instance);
                }
            }
        }

        tracing::debug!("Collected {} instances from region {}", instances.len(), region);
        Ok(instances)
    }

    /// Map AWS SDK instance to our custom AwsInstance type
    fn map_aws_instance(&self, instance: &AwsSdkInstance, region: &str) -> Option<AwsInstance> {
        let instance_id = instance.instance_id().unwrap_or("unknown").to_string();

        let instance_type = match instance.instance_type() {
            Some(it) => format!("{:?}", it),
            None => "unknown".to_string(),
        };

        let state = match instance.state() {
            Some(state) => match state.name() {
                Some(InstanceStateName::Running) => "running".to_string(),
                Some(InstanceStateName::Stopped) => "stopped".to_string(),
                Some(InstanceStateName::Terminated) => "terminated".to_string(),
                Some(InstanceStateName::Pending) => "pending".to_string(),
                Some(InstanceStateName::Stopping) => "stopping".to_string(),
                _ => "unknown".to_string(),
            },
            None => "unknown".to_string(),
        };

        let availability_zone = instance.placement()
            .and_then(|p| p.availability_zone())
            .unwrap_or("unknown")
            .to_string();

        let cpu_count = instance.cpu_options()
            .and_then(|cpu| cpu.core_count())
            .unwrap_or(1) as i32;

        let memory_gb = instance.instance_type()
            .map(|it| self.instance_type_memory_gb(it.clone()))
            .unwrap_or(1.0);

        let storage_gb = 0.0; // TODO: Calculate actual EBS storage size

        let network_performance = instance.instance_type()
            .map(|it| self.instance_type_network_performance(it.clone()))
            .unwrap_or("unknown".to_string());

        let public_ip = instance.public_ip_address().map(|s| s.to_string());
        let private_ip = instance.private_ip_address().map(|s| s.to_string());

        let security_groups = instance.security_groups()
            .iter()
            .map(|sg| AwsSecurityGroup {
                group_id: sg.group_id().unwrap_or("unknown").to_string(),
                group_name: sg.group_name().unwrap_or("unknown").to_string(),
                description: None,
            })
            .collect();

        let key_pairs = instance.key_name()
            .map(|kn| vec![kn.to_string()])
            .unwrap_or_default();

        let tags = instance.tags()
            .iter()
            .filter_map(|tag| {
                Some((
                    tag.key().unwrap_or("unknown").to_string(),
                    tag.value().unwrap_or("").to_string(),
                ))
            })
            .collect::<HashMap<String, String>>();

        let launch_time = instance.launch_time()
            .map(|dt| dt.to_string())
            .unwrap_or_else(|| Utc::now().to_rfc3339());

        let monitoring_enabled = instance.monitoring()
            .map(|m| m.state() == Some(&aws_sdk_ec2::types::MonitoringState::Enabled))
            .unwrap_or(false);

        let ebs_optimized = instance.ebs_optimized().unwrap_or(false);

        let virtualization_type = instance.virtualization_type()
            .map(|vt| vt.to_string())
            .unwrap_or_else(|| "unknown".to_string());

        let architecture = instance.architecture()
            .map(|arch| format!("{:?}", arch))
            .unwrap_or("unknown".to_string());

        Some(AwsInstance {
            instance_id,
            instance_type,
            state,
            region: region.to_string(),
            availability_zone,
            platform: "aws".to_string(),
            cpu_count,
            memory_gb,
            storage_gb,
            network_performance,
            public_ip,
            private_ip,
            security_groups,
            key_pairs,
            tags,
            launch_time,
            monitoring_enabled,
            ebs_optimized,
            virtualization_type,
            architecture,
        })
    }

    /// Get memory in GB for instance type (simplified mapping)
    fn instance_type_memory_gb(&self, instance_type: InstanceType) -> f64 {
        match instance_type {
            InstanceType::T2Micro => 1.0,
            InstanceType::T2Small => 2.0,
            InstanceType::T2Medium => 4.0,
            InstanceType::T2Large => 8.0,
            InstanceType::T2Xlarge => 16.0,
            InstanceType::T22xlarge => 32.0,
            InstanceType::T3Micro => 1.0,
            InstanceType::T3Small => 2.0,
            InstanceType::T3Medium => 4.0,
            InstanceType::T3Large => 8.0,
            InstanceType::T3Xlarge => 16.0,
            InstanceType::T32xlarge => 32.0,
            InstanceType::M5Large => 8.0,
            InstanceType::M5Xlarge => 16.0,
            InstanceType::M52xlarge => 32.0,
            InstanceType::M54xlarge => 64.0,
            InstanceType::M58xlarge => 128.0,
            InstanceType::M5a12xlarge => 192.0,
            InstanceType::M5a16xlarge => 256.0,
            InstanceType::M5a24xlarge => 384.0,
            InstanceType::M5aLarge => 8.0,
            InstanceType::M5aXlarge => 16.0,
            InstanceType::M5a2xlarge => 32.0,
            InstanceType::M5a4xlarge => 64.0,
            InstanceType::M5a8xlarge => 128.0,
            InstanceType::M5a12xlarge => 192.0,
            InstanceType::M5a16xlarge => 256.0,
            InstanceType::M5a24xlarge => 384.0,
            InstanceType::C5Large => 4.0,
            InstanceType::C5Xlarge => 8.0,
            InstanceType::C52xlarge => 16.0,
            InstanceType::C54xlarge => 32.0,
            InstanceType::C59xlarge => 72.0,
            InstanceType::C512xlarge => 96.0,
            InstanceType::C518xlarge => 144.0,
            InstanceType::C524xlarge => 192.0,
            _ => 8.0, // Default fallback
        }
    }

    /// Get network performance for instance type
    fn instance_type_network_performance(&self, instance_type: InstanceType) -> String {
        match instance_type {
            InstanceType::T2Micro | InstanceType::T2Small | InstanceType::T2Medium => "Low to Moderate".to_string(),
            InstanceType::T2Large | InstanceType::T2Xlarge | InstanceType::T22xlarge => "Moderate".to_string(),
            InstanceType::T3Micro | InstanceType::T3Small | InstanceType::T3Medium => "Low to Moderate".to_string(),
            InstanceType::T3Large | InstanceType::T3Xlarge | InstanceType::T32xlarge => "Moderate".to_string(),
            InstanceType::M5Large | InstanceType::M5Xlarge => "Up to 10 Gigabit".to_string(),
            InstanceType::M52xlarge | InstanceType::M54xlarge => "Up to 10 Gigabit".to_string(),
            InstanceType::M58xlarge | InstanceType::M5a12xlarge => "10 Gigabit".to_string(),
            InstanceType::M5a16xlarge | InstanceType::M5a24xlarge => "20 Gigabit".to_string(),
            InstanceType::C5Large | InstanceType::C5Xlarge => "Up to 10 Gigabit".to_string(),
            InstanceType::C52xlarge | InstanceType::C54xlarge => "Up to 10 Gigabit".to_string(),
            InstanceType::C59xlarge | InstanceType::C512xlarge => "10 Gigabit".to_string(),
            InstanceType::C518xlarge | InstanceType::C524xlarge => "20 Gigabit".to_string(),
            _ => "Moderate".to_string(),
        }
    }

    /// Create a new EC2 instance with timestamp naming
    pub async fn create_instance(
        &self,
        instance_type: &str,
        ami_id: &str,
        key_name: Option<&str>,
        security_group_ids: Vec<String>,
        region: Option<&str>,
    ) -> AwsResult<String> {
        let region = region.unwrap_or(self.client.primary_region());
        tracing::info!("Creating EC2 instance in region {}: type={}, ami={}", region, instance_type, ami_id);

        let timestamp = Utc::now().format("%Y%m%d-%H%M%S");
        let unique_id = Uuid::new_v4().simple().to_string()[..8].to_string();
        let instance_name = format!("pocket-architect-{}-{}", timestamp, unique_id);

        let ec2_client = &self.client.ec2_client;

        let mut request = ec2_client
            .run_instances()
            .image_id(ami_id)
            .instance_type(aws_sdk_ec2::types::InstanceType::from(instance_type))
            .min_count(1)
            .max_count(1)
            .tag_specifications(
                aws_sdk_ec2::types::TagSpecification::builder()
                    .resource_type(aws_sdk_ec2::types::ResourceType::Instance)
                    .tags(
                        aws_sdk_ec2::types::Tag::builder()
                            .key("Name")
                            .value(&instance_name)
                            .build()
                    )
                    .tags(
                        aws_sdk_ec2::types::Tag::builder()
                            .key("CreatedBy")
                            .value("PocketArchitect")
                            .build()
                    )
                    .tags(
                        aws_sdk_ec2::types::Tag::builder()
                            .key("CreationTime")
                            .value(Utc::now().to_rfc3339())
                            .build()
                    )
                    .build()
            );

        if let Some(key) = key_name {
            request = request.key_name(key);
        }

        for sg_id in security_group_ids {
            request = request.security_group_ids(sg_id);
        }

        let response = request
            .send()
            .await
            .map_err(|e| {
                tracing::error!("Failed to create EC2 instance: {:?}", e);
                AwsError::SdkError(e.into())
            })?;

        let instance_id = response.instances()
            .first()
            .and_then(|i| i.instance_id())
            .ok_or_else(|| {
                tracing::error!("No instance ID returned from create operation");
                AwsError::OperationError("Failed to get instance ID after creation".to_string())
            })?;

        tracing::info!("Successfully created EC2 instance: {} ({})", instance_id, instance_name);
        Ok(instance_id.to_string())
    }

    /// Delete (terminate) an EC2 instance
    pub async fn delete_instance(&self, instance_id: &str) -> AwsResult<()> {
        tracing::info!("Terminating EC2 instance: {}", instance_id);

        let ec2_client = &self.client.ec2_client;

        ec2_client
            .terminate_instances()
            .instance_ids(instance_id)
            .send()
            .await
            .map_err(|e| {
                tracing::error!("Failed to terminate EC2 instance {}: {:?}", instance_id, e);
                AwsError::SdkError(e.into())
            })?;

        tracing::info!("Successfully initiated termination of EC2 instance: {}", instance_id);
        Ok(())
    }

    /// Get detailed information about a specific instance
    pub async fn get_instance_details(&self, instance_id: &str) -> AwsResult<Option<AwsInstance>> {
        tracing::debug!("Getting details for EC2 instance: {}", instance_id);

        let ec2_client = &self.client.ec2_client;

        let response = ec2_client
            .describe_instances()
            .instance_ids(instance_id)
            .send()
            .await
            .map_err(|e| {
                tracing::error!("Failed to get instance details for {}: {:?}", instance_id, e);
                AwsError::SdkError(e.into())
            })?;

        for reservation in response.reservations().iter() {
            for instance in reservation.instances().iter() {
                if instance.instance_id() == Some(instance_id) {
                    let region = self.client.primary_region();
                    return Ok(self.map_aws_instance(instance, region));
                }
            }
        }

        tracing::debug!("Instance {} not found", instance_id);
        Ok(None)
    }

    /// Start an EC2 instance
    pub async fn start_instance(&self, instance_id: &str) -> AwsResult<()> {
        tracing::info!("Starting EC2 instance: {}", instance_id);

        let ec2_client = &self.client.ec2_client;

        ec2_client
            .start_instances()
            .instance_ids(instance_id)
            .send()
            .await
            .map_err(|e| {
                tracing::error!("Failed to start EC2 instance {}: {:?}", instance_id, e);
                AwsError::SdkError(e.into())
            })?;

        tracing::info!("Successfully initiated start of EC2 instance: {}", instance_id);
        Ok(())
    }

    /// Stop an EC2 instance
    pub async fn stop_instance(&self, instance_id: &str) -> AwsResult<()> {
        tracing::info!("Stopping EC2 instance: {}", instance_id);

        let ec2_client = &self.client.ec2_client;

        ec2_client
            .stop_instances()
            .instance_ids(instance_id)
            .send()
            .await
            .map_err(|e| {
                tracing::error!("Failed to stop EC2 instance {}: {:?}", instance_id, e);
                AwsError::SdkError(e.into())
            })?;

        tracing::info!("Successfully initiated stop of EC2 instance: {}", instance_id);
        Ok(())
    }

    /// Restart (reboot) an EC2 instance
    pub async fn restart_instance(&self, instance_id: &str) -> AwsResult<()> {
        tracing::info!("Restarting EC2 instance: {}", instance_id);

        let ec2_client = &self.client.ec2_client;

        ec2_client
            .reboot_instances()
            .instance_ids(instance_id)
            .send()
            .await
            .map_err(|e| {
                tracing::error!("Failed to restart EC2 instance {}: {:?}", instance_id, e);
                AwsError::SdkError(e.into())
            })?;

        tracing::info!("Successfully initiated restart of EC2 instance: {}", instance_id);
        Ok(())
    }

    /// Get SSH configuration for an instance
    pub async fn get_ssh_config(&self, instance_id: &str) -> AwsResult<serde_json::Value> {
        tracing::debug!("Getting SSH config for EC2 instance: {}", instance_id);

        let instance_details = self.get_instance_details(instance_id).await?;

        match instance_details {
            Some(instance) => {
                let ssh_config = serde_json::json!({
                    "host": instance.public_ip.or_else(|| instance.private_ip).unwrap_or_else(|| "unknown".to_string()),
                    "user": "ec2-user", // Default for Amazon Linux 2
                    "keyPath": instance.key_pairs.first().map(|k| format!("~/.ssh/{}.pem", k)).unwrap_or_else(|| "~/.ssh/default.pem".to_string()),
                    "port": 22,
                    "instanceId": instance.instance_id,
                    "region": instance.region,
                    "availabilityZone": instance.availability_zone
                });

                Ok(ssh_config)
            }
            None => Err(AwsError::OperationError(format!("Instance {} not found", instance_id)))
        }
    }
}