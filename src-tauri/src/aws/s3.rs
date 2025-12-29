// ============================================================================
// S3 SERVICE IMPLEMENTATION
// ============================================================================
// S3 bucket management with real AWS API integration
// ============================================================================

use crate::aws::{AwsClient, AwsBucket, AwsResult, AwsError};
use aws_config::{BehaviorVersion, Region};
use aws_credential_types::Credentials;
use aws_sdk_s3::types::{Bucket as AwsSdkBucket, StorageClass};
use chrono::{DateTime, Utc};
use uuid::Uuid;

pub struct S3Service {
    client: AwsClient,
}

impl S3Service {
    pub fn new(client: AwsClient) -> Self {
        Self { client }
    }

    /// Collect all S3 buckets across all regions with cross-region fallback
    pub async fn collect_buckets(&self) -> AwsResult<Vec<AwsBucket>> {
        tracing::info!("Starting S3 bucket collection across all regions");

        let mut all_buckets = Vec::new();

        // Try primary region first
        match self.collect_buckets_cross_region(self.client.primary_region()).await {
            Ok(mut buckets) => {
                all_buckets.append(&mut buckets);
                tracing::debug!("Collected {} buckets from primary region {}", all_buckets.len(), self.client.primary_region());
            }
            Err(e) => {
                tracing::warn!("Failed to collect buckets from primary region {}: {:?}", self.client.primary_region(), e);

                // Try fallback region with cross-region client
                match self.collect_buckets_cross_region(self.client.fallback_region()).await {
                    Ok(mut buckets) => {
                        all_buckets.append(&mut buckets);
                        tracing::info!("Successfully collected {} buckets from fallback region {} using cross-region fallback", all_buckets.len(), self.client.fallback_region());
                    }
                    Err(e2) => {
                        tracing::error!("Failed to collect buckets from both primary and fallback regions: primary={}, fallback={}", e, e2);
                        return Err(AwsError::RegionError(format!("Failed to collect buckets from both regions: primary={}, fallback={}", e, e2)));
                    }
                }
            }
        }

        tracing::info!("Successfully collected {} S3 buckets total", all_buckets.len());
        Ok(all_buckets)
    }

    /// Collect S3 buckets using cross-region fallback client
    async fn collect_buckets_cross_region(&self, region: &str) -> AwsResult<Vec<AwsBucket>> {
        tracing::debug!("Attempting cross-region collection for S3 buckets in region: {}", region);

        // Create a new client for the fallback region
        use crate::aws::AwsConfig;
        use aws_config::{BehaviorVersion, Region};
        use aws_credential_types::Credentials;
        use aws_sdk_s3::Client as S3Client;

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

        let s3_client = S3Client::new(&aws_config);

        // Test the fallback connection
        s3_client
            .list_buckets()
            .send()
            .await
            .map_err(|e| {
                tracing::error!("Cross-region fallback connection test failed for region {}: {:?}", region, e);
                AwsError::NetworkError(format!("Cross-region connection failed: {}", e))
            })?;

        // Now collect buckets with the fallback client
        let response = s3_client
            .list_buckets()
            .send()
            .await
            .map_err(|e| -> AwsError {
                tracing::error!("Failed to list buckets in fallback region {}: {:?}", region, e);
                AwsError::from(aws_sdk_s3::Error::from(e))
            })?;

        let mut buckets = Vec::new();

        for bucket in response.buckets().iter() {
            if let Some(mapped_bucket) = self.map_aws_bucket_fallback(bucket, region, &s3_client).await {
                buckets.push(mapped_bucket);
            }
        }

        tracing::info!("Successfully collected {} buckets using cross-region fallback in {}", buckets.len(), region);
        Ok(buckets)
    }

    /// Map AWS SDK bucket using fallback client for additional operations
    async fn map_aws_bucket_fallback(&self, bucket: &aws_sdk_s3::types::Bucket, region: &str, s3_client: &aws_sdk_s3::Client) -> Option<AwsBucket> {
        let name = bucket.name().unwrap_or("unknown").to_string();

        // Get bucket location using the fallback client
        let bucket_region = self.get_bucket_location_fallback(&name, s3_client).await.unwrap_or_else(|_| region.to_string());

        // Get bucket analytics using the fallback client
        let (object_count, total_size_bytes) = self.get_bucket_analytics_fallback(&name, &bucket_region, s3_client).await.unwrap_or((0, 0));

        let total_size_gb = total_size_bytes as f64 / (1024.0 * 1024.0 * 1024.0);

        let last_modified = bucket.creation_date()
            .map(|dt| dt.to_string())
            .unwrap_or_else(|| Utc::now().to_rfc3339());

        let storage_class = "STANDARD".to_string();
        let versioning_enabled = self.get_bucket_versioning_fallback(&name, &bucket_region, s3_client).await.unwrap_or(false);
        let public_access_block = self.get_public_access_block_fallback(&name, &bucket_region, s3_client).await.unwrap_or(false);

        Some(AwsBucket {
            name,
            region: bucket_region,
            platform: "aws".to_string(),
            object_count: object_count as i64,
            total_size_bytes: total_size_bytes as i64,
            total_size_gb,
            last_modified: Some(last_modified),
            storage_class,
            versioning_enabled,
            encryption: None,
            public_access_block,
        })
    }

    /// Get bucket location using fallback client
    async fn get_bucket_location_fallback(&self, bucket_name: &str, s3_client: &aws_sdk_s3::Client) -> AwsResult<String> {
        let response = s3_client
            .get_bucket_location()
            .bucket(bucket_name)
            .send()
            .await
            .map_err(|e| -> AwsError {
                tracing::warn!("Failed to get location for bucket {} (fallback): {:?}", bucket_name, e);
                AwsError::from(aws_sdk_s3::Error::from(e))
            })?;

        let region = response.location_constraint()
            .map(|rc| format!("{:?}", rc).to_lowercase())
            .unwrap_or_else(|| "us-east-1".to_string());

        Ok(region)
    }

    /// Get bucket analytics using fallback client
    async fn get_bucket_analytics_fallback(&self, bucket_name: &str, region: &str, s3_client: &aws_sdk_s3::Client) -> AwsResult<(i64, i64)> {
        let response = s3_client
            .list_objects_v2()
            .bucket(bucket_name)
            .max_keys(1000)
            .send()
            .await
            .map_err(|e| -> AwsError {
                tracing::warn!("Failed to get analytics for bucket {} (fallback): {:?}", bucket_name, e);
                AwsError::from(aws_sdk_s3::Error::from(e))
            })?;

        let object_count = response.key_count().unwrap_or(0) as i64;
        let total_size_bytes = response.contents()
            .iter()
            .map(|obj| obj.size().unwrap_or(0) as i64)
            .sum::<i64>();

        Ok((object_count, total_size_bytes))
    }

    /// Get bucket versioning using fallback client
    async fn get_bucket_versioning_fallback(&self, bucket_name: &str, region: &str, s3_client: &aws_sdk_s3::Client) -> AwsResult<bool> {
        let response = s3_client
            .get_bucket_versioning()
            .bucket(bucket_name)
            .send()
            .await
            .map_err(|e| -> AwsError {
                tracing::warn!("Failed to get versioning for bucket {} (fallback): {:?}", bucket_name, e);
                AwsError::from(aws_sdk_s3::Error::from(e))
            })?;

        Ok(response.status() == Some(&aws_sdk_s3::types::BucketVersioningStatus::Enabled))
    }

    /// Get public access block using fallback client
    async fn get_public_access_block_fallback(&self, bucket_name: &str, region: &str, s3_client: &aws_sdk_s3::Client) -> AwsResult<bool> {
        let response = s3_client
            .get_public_access_block()
            .bucket(bucket_name)
            .send()
            .await
            .map_err(|e| -> AwsError { AwsError::from(aws_sdk_s3::Error::from(e)) })?;

        let config = response.public_access_block_configuration();
        let (block_public_acls, block_public_policy, ignore_public_acls, restrict_public_buckets) = config
            .map(|c| (
                c.block_public_acls().unwrap_or(false),
                c.block_public_policy().unwrap_or(false),
                c.ignore_public_acls().unwrap_or(false),
                c.restrict_public_buckets().unwrap_or(false),
            ))
            .unwrap_or((false, false, false, false));

        Ok(block_public_acls || block_public_policy || ignore_public_acls || restrict_public_buckets)
    }

    /// Get bucket versioning status
    async fn get_bucket_versioning(&self, bucket_name: &str, region: &str) -> AwsResult<bool> {
        let s3_client = &self.client.s3_client;

        let response = s3_client
            .get_bucket_versioning()
            .bucket(bucket_name)
            .send()
            .await
            .map_err(|e| -> AwsError {
                tracing::warn!("Failed to get versioning for bucket {}: {:?}", bucket_name, e);
                AwsError::from(aws_sdk_s3::Error::from(e))
            })?;

        Ok(response.status() == Some(&aws_sdk_s3::types::BucketVersioningStatus::Enabled))
    }

    /// Get public access block status
    async fn get_public_access_block(&self, bucket_name: &str, region: &str) -> AwsResult<bool> {
        let s3_client = &self.client.s3_client;

        let response = s3_client
            .get_public_access_block()
            .bucket(bucket_name)
            .send()
            .await
            .map_err(|e| -> AwsError {
                tracing::warn!("Failed to get public access block for bucket {}: {:?}", bucket_name, e);
                AwsError::from(aws_sdk_s3::Error::from(e))
            })?;

        let config = response.public_access_block_configuration();
        let (block_public_acls, block_public_policy, ignore_public_acls, restrict_public_buckets) = config
            .map(|c| (
                c.block_public_acls().unwrap_or(false),
                c.block_public_policy().unwrap_or(false),
                c.ignore_public_acls().unwrap_or(false),
                c.restrict_public_buckets().unwrap_or(false),
            ))
            .unwrap_or((false, false, false, false));

        Ok(block_public_acls || block_public_policy || ignore_public_acls || restrict_public_buckets)
    }

    /// Create a new S3 bucket with timestamp naming
    pub async fn create_bucket(
        &self,
        bucket_name: Option<&str>,
        region: Option<&str>,
    ) -> AwsResult<String> {
        let region = region.unwrap_or(self.client.primary_region());

        let bucket_name = bucket_name.map(|s| s.to_string()).unwrap_or_else(|| {
            let timestamp = Utc::now().format("%Y%m%d-%H%M%S");
            let unique_id = Uuid::new_v4().simple().to_string()[..8].to_string();
            format!("pocket-architect-{}-{}", timestamp, unique_id)
        });

        tracing::info!("Creating S3 bucket: {} in region {}", bucket_name, region);

        let s3_client = &self.client.s3_client;

        let mut request = s3_client
            .create_bucket()
            .bucket(&bucket_name);

        // Set location constraint if not us-east-1
        if region != "us-east-1" {
            request = request.create_bucket_configuration(
                aws_sdk_s3::types::CreateBucketConfiguration::builder()
                    .location_constraint(aws_sdk_s3::types::BucketLocationConstraint::from(region))
                    .build()
            );
        }

        request
            .send()
            .await
            .map_err(|e| -> AwsError {
                tracing::error!("Failed to list buckets in fallback region {}: {:?}", region, e);
                AwsError::from(aws_sdk_s3::Error::from(e))
            })?;

        // Add tags for tracking
        self.tag_bucket(&bucket_name, region).await?;

        tracing::info!("Successfully created S3 bucket: {}", bucket_name);
        Ok(bucket_name)
    }

    /// Tag bucket for tracking
    async fn tag_bucket(&self, bucket_name: &str, region: &str) -> AwsResult<()> {
        let s3_client = &self.client.s3_client;

        let tags = vec![
            aws_sdk_s3::types::Tag::builder()
                .key("CreatedBy")
                .value("PocketArchitect")
                .build()
                .map_err(|e| AwsError::GenericError(anyhow::anyhow!("Build error: {:?}", e)))?,
            aws_sdk_s3::types::Tag::builder()
                .key("CreationTime")
                .value(Utc::now().to_rfc3339())
                .build()
                .map_err(|e| AwsError::GenericError(anyhow::anyhow!("Build error: {:?}", e)))?,
        ];

        let tagging = aws_sdk_s3::types::Tagging::builder()
            .set_tag_set(Some(tags))
            .build()
            .map_err(|e| AwsError::GenericError(anyhow::anyhow!("Build error: {:?}", e)))?;

        s3_client
            .put_bucket_tagging()
            .bucket(bucket_name)
            .tagging(tagging)
            .send()
            .await
            .map_err(|e| -> AwsError {
                tracing::warn!("Failed to tag bucket {}: {:?}", bucket_name, e);
                AwsError::from(aws_sdk_s3::Error::from(e))
            })?;

        Ok(())
    }

    /// Delete an S3 bucket (must be empty)
    pub async fn delete_bucket(&self, bucket_name: &str) -> AwsResult<()> {
        tracing::info!("Deleting S3 bucket: {}", bucket_name);

        let s3_client = &self.client.s3_client;

        s3_client
            .delete_bucket()
            .bucket(bucket_name)
            .send()
            .await
            .map_err(|e| -> AwsError {
                tracing::error!("Failed to delete S3 bucket {}: {:?}", bucket_name, e);
                AwsError::from(aws_sdk_s3::Error::from(e))
            })?;

        tracing::info!("Successfully deleted S3 bucket: {}", bucket_name);
        Ok(())
    }

    /// Get bucket location
    async fn get_bucket_location(&self, bucket_name: &str) -> AwsResult<String> {
        let s3_client = &self.client.s3_client;

        let response = s3_client
            .get_bucket_location()
            .bucket(bucket_name)
            .send()
            .await
            .map_err(|e| -> AwsError { AwsError::from(aws_sdk_s3::Error::from(e)) })?;

        let region = response.location_constraint()
            .map(|rc| format!("{:?}", rc).to_lowercase())
            .unwrap_or_else(|| "us-east-1".to_string());

        Ok(region)
    }

    /// Get detailed information about a specific bucket
    pub async fn get_bucket_details(&self, bucket_name: &str) -> AwsResult<Option<AwsBucket>> {
        tracing::debug!("Getting details for S3 bucket: {}", bucket_name);

        let s3_client = &self.client.s3_client;

        // Check if bucket exists
        let response = s3_client
            .head_bucket()
            .bucket(bucket_name)
            .send()
            .await;

        if response.is_err() {
            tracing::debug!("Bucket {} not found or not accessible", bucket_name);
            return Ok(None);
        }

        // Get bucket location
        let region = self.get_bucket_location(bucket_name).await.unwrap_or_else(|_| "us-east-1".to_string());

        // Create a dummy bucket object for mapping
        let dummy_bucket = AwsSdkBucket::builder()
            .name(bucket_name)
            .creation_date(std::time::SystemTime::now().into())
            .build();

        let bucket = self.map_aws_bucket_fallback(&dummy_bucket, &region, s3_client).await;

        Ok(bucket)
    }
}