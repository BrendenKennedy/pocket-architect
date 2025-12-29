// ============================================================================
// AWS CONFIGURATION
// ============================================================================
// Load AWS credentials and settings from aws-config.toml
// ============================================================================

use serde::Deserialize;
use std::fs;
use anyhow::{Result, Context};

#[derive(Debug, Clone, Deserialize)]
pub struct AwsCredentials {
    pub access_key_id: String,
    pub secret_access_key: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CostLimits {
    pub monthly_api_limit: u64,
    pub warning_threshold_percent: f64,
}

#[derive(Debug, Clone, Deserialize)]
pub struct Timeouts {
    pub instance_operations_seconds: u64,
    pub bucket_operations_seconds: u64,
    pub iam_operations_seconds: u64,
}

#[derive(Debug, Clone, Deserialize)]
pub struct Regions {
    pub primary: String,
    pub fallback: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct AwsConfigData {
    pub aws: AwsSection,
    pub cost_limits: CostLimits,
    pub timeouts: Timeouts,
    pub regions: Regions,
}

#[derive(Debug, Clone, Deserialize)]
pub struct AwsSection {
    pub access_key_id: String,
    pub secret_access_key: String,
    pub region: String,
    pub refresh_interval_seconds: u64,
    pub enable_cost_tracking: bool,
    pub debug_logging: bool,
}

#[derive(Debug, Clone)]
pub struct AwsConfig {
    pub credentials: AwsCredentials,
    pub region: String,
    pub refresh_interval_seconds: u64,
    pub enable_cost_tracking: bool,
    pub debug_logging: bool,
    pub cost_limits: CostLimits,
    pub timeouts: Timeouts,
    pub regions: Regions,
}

impl AwsConfig {
    pub fn load_from_file() -> Result<Self> {
        let config_path = "aws-config.toml";
        let config_content = fs::read_to_string(config_path)
            .context(format!("Failed to read config file: {}", config_path))?;

        let config_data: AwsConfigData = toml::from_str(&config_content)
            .context("Failed to parse config file")?;

        Ok(Self {
            credentials: AwsCredentials {
                access_key_id: config_data.aws.access_key_id,
                secret_access_key: config_data.aws.secret_access_key,
            },
            region: config_data.aws.region,
            refresh_interval_seconds: config_data.aws.refresh_interval_seconds,
            enable_cost_tracking: config_data.aws.enable_cost_tracking,
            debug_logging: config_data.aws.debug_logging,
            cost_limits: config_data.cost_limits,
            timeouts: config_data.timeouts,
            regions: config_data.regions,
        })
    }

    pub fn primary_region(&self) -> &str {
        &self.regions.primary
    }

    pub fn fallback_region(&self) -> &str {
        &self.regions.fallback
    }
}