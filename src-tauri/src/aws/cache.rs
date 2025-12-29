// ============================================================================
// CACHE SYSTEM
// ============================================================================
// 3-minute auto-refresh cache with invalidation for AWS resources
// ============================================================================

use crate::aws::AwsResult;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::{RwLock, Mutex};
use chrono::{DateTime, Utc, Duration};
use serde::{Serialize, Deserialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CacheEntry<T> {
    pub data: T,
    pub timestamp: DateTime<Utc>,
    pub ttl_seconds: i64,
}

impl<T> CacheEntry<T> {
    pub fn new(data: T, ttl_seconds: i64) -> Self {
        Self {
            data,
            timestamp: Utc::now(),
            ttl_seconds,
        }
    }

    pub fn is_expired(&self) -> bool {
        let now = Utc::now();
        let expiry = self.timestamp + Duration::seconds(self.ttl_seconds);
        now > expiry
    }

    pub fn age_seconds(&self) -> i64 {
        let now = Utc::now();
        (now - self.timestamp).num_seconds()
    }
}

#[derive(Clone)]
pub struct AwsCache {
    ec2_instances: Arc<RwLock<HashMap<String, CacheEntry<Vec<crate::aws::AwsInstance>>>>>,
    s3_buckets: Arc<RwLock<HashMap<String, CacheEntry<Vec<crate::aws::AwsBucket>>>>>,
    iam_users: Arc<RwLock<Option<CacheEntry<Vec<crate::aws::AwsIamUser>>>>>,
    iam_roles: Arc<RwLock<Option<CacheEntry<Vec<String>>>>>,
    default_ttl_seconds: i64,
}

impl AwsCache {
    pub fn new(default_ttl_seconds: i64) -> Self {
        Self {
            ec2_instances: Arc::new(RwLock::new(HashMap::new())),
            s3_buckets: Arc::new(RwLock::new(HashMap::new())),
            iam_users: Arc::new(RwLock::new(None)),
            iam_roles: Arc::new(RwLock::new(None)),
            default_ttl_seconds,
        }
    }

    /// Get cached EC2 instances for a region, or None if expired/missing
    pub async fn get_ec2_instances(&self, region: &str) -> Option<Vec<crate::aws::AwsInstance>> {
        let cache = self.ec2_instances.read().await;
        if let Some(entry) = cache.get(region) {
            if !entry.is_expired() {
                tracing::debug!("Cache hit for EC2 instances in region {} (age: {}s)", region, entry.age_seconds());
                return Some(entry.data.clone());
            } else {
                tracing::debug!("Cache expired for EC2 instances in region {} (age: {}s > {}s)", region, entry.age_seconds(), entry.ttl_seconds);
            }
        }
        None
    }

    /// Cache EC2 instances for a region
    pub async fn put_ec2_instances(&self, region: String, instances: Vec<crate::aws::AwsInstance>) {
        let mut cache = self.ec2_instances.write().await;
        let entry = CacheEntry::new(instances, self.default_ttl_seconds);
        cache.insert(region.clone(), entry);
        tracing::debug!("Cached EC2 instances for region {}", region);
    }

    /// Get cached S3 buckets for a region, or None if expired/missing
    pub async fn get_s3_buckets(&self, region: &str) -> Option<Vec<crate::aws::AwsBucket>> {
        let cache = self.s3_buckets.read().await;
        if let Some(entry) = cache.get(region) {
            if !entry.is_expired() {
                tracing::debug!("Cache hit for S3 buckets in region {} (age: {}s)", region, entry.age_seconds());
                return Some(entry.data.clone());
            } else {
                tracing::debug!("Cache expired for S3 buckets in region {} (age: {}s > {}s)", region, entry.age_seconds(), entry.ttl_seconds);
            }
        }
        None
    }

    /// Cache S3 buckets for a region
    pub async fn put_s3_buckets(&self, region: String, buckets: Vec<crate::aws::AwsBucket>) {
        let mut cache = self.s3_buckets.write().await;
        let entry = CacheEntry::new(buckets, self.default_ttl_seconds);
        cache.insert(region.clone(), entry);
        tracing::debug!("Cached S3 buckets for region {}", region);
    }

    /// Get cached IAM users, or None if expired/missing
    pub async fn get_iam_users(&self) -> Option<Vec<crate::aws::AwsIamUser>> {
        let cache = self.iam_users.read().await;
        if let Some(entry) = cache.as_ref() {
            if !entry.is_expired() {
                tracing::debug!("Cache hit for IAM users (age: {}s)", entry.age_seconds());
                return Some(entry.data.clone());
            } else {
                tracing::debug!("Cache expired for IAM users (age: {}s > {}s)", entry.age_seconds(), entry.ttl_seconds);
            }
        }
        None
    }

    /// Cache IAM users
    pub async fn put_iam_users(&self, users: Vec<crate::aws::AwsIamUser>) {
        let mut cache = self.iam_users.write().await;
        let entry = CacheEntry::new(users, self.default_ttl_seconds);
        *cache = Some(entry);
        tracing::debug!("Cached IAM users");
    }

    /// Get cached IAM roles, or None if expired/missing
    pub async fn get_iam_roles(&self) -> Option<Vec<String>> {
        let cache = self.iam_roles.read().await;
        if let Some(entry) = cache.as_ref() {
            if !entry.is_expired() {
                tracing::debug!("Cache hit for IAM roles (age: {}s)", entry.age_seconds());
                return Some(entry.data.clone());
            } else {
                tracing::debug!("Cache expired for IAM roles (age: {}s > {}s)", entry.age_seconds(), entry.ttl_seconds);
            }
        }
        None
    }

    /// Cache IAM roles
    pub async fn put_iam_roles(&self, roles: Vec<String>) {
        let mut cache = self.iam_roles.write().await;
        let entry = CacheEntry::new(roles, self.default_ttl_seconds);
        *cache = Some(entry);
        tracing::debug!("Cached IAM roles");
    }

    /// Invalidate all cached data
    pub async fn invalidate_all(&self) {
        let mut ec2_cache = self.ec2_instances.write().await;
        ec2_cache.clear();

        let mut s3_cache = self.s3_buckets.write().await;
        s3_cache.clear();

        let mut iam_users_cache = self.iam_users.write().await;
        *iam_users_cache = None;

        let mut iam_roles_cache = self.iam_roles.write().await;
        *iam_roles_cache = None;

        tracing::info!("Invalidated all AWS cache entries");
    }

    /// Invalidate cache for a specific region
    pub async fn invalidate_region(&self, region: &str) {
        let mut ec2_cache = self.ec2_instances.write().await;
        ec2_cache.remove(region);

        let mut s3_cache = self.s3_buckets.write().await;
        s3_cache.remove(region);

        tracing::info!("Invalidated cache for region {}", region);
    }

    /// Invalidate specific cache types
    pub async fn invalidate_type(&self, cache_type: CacheType) {
        match cache_type {
            CacheType::Ec2Instances => {
                let mut cache = self.ec2_instances.write().await;
                cache.clear();
                tracing::info!("Invalidated EC2 instances cache");
            }
            CacheType::S3Buckets => {
                let mut cache = self.s3_buckets.write().await;
                cache.clear();
                tracing::info!("Invalidated S3 buckets cache");
            }
            CacheType::IamUsers => {
                let mut cache = self.iam_users.write().await;
                *cache = None;
                tracing::info!("Invalidated IAM users cache");
            }
            CacheType::IamRoles => {
                let mut cache = self.iam_roles.write().await;
                *cache = None;
                tracing::info!("Invalidated IAM roles cache");
            }
        }
    }

    /// Get cache statistics
    pub async fn get_stats(&self) -> CacheStats {
        let ec2_entries = self.ec2_instances.read().await.len();
        let s3_entries = self.s3_buckets.read().await.len();
        let iam_users_cached = self.iam_users.read().await.is_some();
        let iam_roles_cached = self.iam_roles.read().await.is_some();

        CacheStats {
            ec2_regions_cached: ec2_entries,
            s3_regions_cached: s3_entries,
            iam_users_cached,
            iam_roles_cached,
            default_ttl_seconds: self.default_ttl_seconds,
        }
    }

    /// Clean up expired entries
    pub async fn cleanup_expired(&self) {
        let mut cleaned_count = 0;

        // Clean EC2 cache
        {
            let mut ec2_cache = self.ec2_instances.write().await;
            let regions: Vec<String> = ec2_cache.keys().cloned().collect();
            for region in regions {
                if let Some(entry) = ec2_cache.get(&region) {
                    if entry.is_expired() {
                        ec2_cache.remove(&region);
                        cleaned_count += 1;
                        tracing::debug!("Cleaned expired EC2 cache for region {}", region);
                    }
                }
            }
        }

        // Clean S3 cache
        {
            let mut s3_cache = self.s3_buckets.write().await;
            let regions: Vec<String> = s3_cache.keys().cloned().collect();
            for region in regions {
                if let Some(entry) = s3_cache.get(&region) {
                    if entry.is_expired() {
                        s3_cache.remove(&region);
                        cleaned_count += 1;
                        tracing::debug!("Cleaned expired S3 cache for region {}", region);
                    }
                }
            }
        }

        // Clean IAM caches
        {
            let mut iam_users_cache = self.iam_users.write().await;
            if let Some(entry) = iam_users_cache.as_ref() {
                if entry.is_expired() {
                    *iam_users_cache = None;
                    cleaned_count += 1;
                    tracing::debug!("Cleaned expired IAM users cache");
                }
            }
        }

        {
            let mut iam_roles_cache = self.iam_roles.write().await;
            if let Some(entry) = iam_roles_cache.as_ref() {
                if entry.is_expired() {
                    *iam_roles_cache = None;
                    cleaned_count += 1;
                    tracing::debug!("Cleaned expired IAM roles cache");
                }
            }
        }

        if cleaned_count > 0 {
            tracing::info!("Cleaned {} expired cache entries", cleaned_count);
        }
    }
}

#[derive(Debug, Clone)]
pub enum CacheType {
    Ec2Instances,
    S3Buckets,
    IamUsers,
    IamRoles,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CacheStats {
    pub ec2_regions_cached: usize,
    pub s3_regions_cached: usize,
    pub iam_users_cached: bool,
    pub iam_roles_cached: bool,
    pub default_ttl_seconds: i64,
}

/// Background cache refresh task with debounced events
pub struct CacheRefresher {
    cache: AwsCache,
    ec2_service: crate::aws::ec2::Ec2Service,
    s3_service: crate::aws::s3::S3Service,
    iam_service: crate::aws::iam::IamService,
    event_emitter: std::sync::Arc<crate::aws::events::AwsEventEmitter>,
    debounce_instances: Mutex<crate::aws::events::DebouncedEmitter>,
    debounce_costs: Mutex<crate::aws::events::DebouncedEmitter>,
}

impl CacheRefresher {
    pub fn new(
        cache: AwsCache,
        ec2_service: crate::aws::ec2::Ec2Service,
        s3_service: crate::aws::s3::S3Service,
        iam_service: crate::aws::iam::IamService,
        event_emitter: std::sync::Arc<crate::aws::events::AwsEventEmitter>,
    ) -> Self {
        Self {
            cache,
            ec2_service,
            s3_service,
            iam_service,
            event_emitter,
            debounce_instances: Mutex::new(crate::aws::events::DebouncedEmitter::new(std::time::Duration::from_secs(30))),
            debounce_costs: Mutex::new(crate::aws::events::DebouncedEmitter::new(std::time::Duration::from_secs(30))),
        }
    }

    /// Refresh all cached data with debounced event emission
    pub async fn refresh_all(&self) -> AwsResult<()> {
        tracing::info!("Starting cache refresh for all AWS resources");

        // Refresh EC2 instances
        match self.ec2_service.collect_instances().await {
            Ok(instances) => {
                // Group by region and cache
                let mut region_instances: HashMap<String, Vec<crate::aws::AwsInstance>> = HashMap::new();
                for instance in instances {
                    region_instances.entry(instance.region.clone()).or_insert_with(Vec::new).push(instance);
                }

                // Convert and emit debounced events
                for (region, aws_instances) in &region_instances {
                    let frontend_instances: Vec<crate::aws::adapters::Instance> = aws_instances.iter()
                        .map(|aws_instance| crate::aws::adapters::aws_instance_to_frontend(
                            aws_instance.clone(),
                            1, // Default project
                            "Default AWS Project".to_string(),
                            "#3B82F6".to_string()
                        ))
                        .collect();

                    self.cache.put_ec2_instances(region.clone(), aws_instances.clone()).await;

                    // Emit debounced event
                    if self.debounce_instances.lock().await.should_emit() {
                        self.event_emitter.emit_instances_updated(frontend_instances).await;
                        self.event_emitter.emit_cache_refreshed("ec2_instances").await;
                    }
                }
                tracing::debug!("Refreshed EC2 instances cache");
            }
            Err(e) => {
                tracing::warn!("Failed to refresh EC2 instances cache: {:?}", e);
            }
        }

        // Refresh S3 buckets
        match self.s3_service.collect_buckets().await {
            Ok(buckets) => {
                // Group by region and cache
                let mut region_buckets: HashMap<String, Vec<crate::aws::AwsBucket>> = HashMap::new();
                for bucket in buckets {
                    region_buckets.entry(bucket.region.clone()).or_insert_with(Vec::new).push(bucket);
                }

                for (region, buckets) in region_buckets {
                    self.cache.put_s3_buckets(region, buckets).await;
                }

                // Emit debounced cache refresh event
                if self.debounce_instances.lock().await.should_emit() {
                    self.event_emitter.emit_cache_refreshed("s3_buckets").await;
                }

                tracing::debug!("Refreshed S3 buckets cache");
            }
            Err(e) => {
                tracing::warn!("Failed to refresh S3 buckets cache: {:?}", e);
            }
        }

        // Note: IAM data is not typically emitted as events since it's less frequently changing
        // and users don't need real-time updates for IAM changes

        tracing::info!("Completed cache refresh for all AWS resources");
        Ok(())
    }

    /// Start background refresh task
    pub fn start_background_refresh(self, interval_seconds: u64) {
        tokio::spawn(async move {
            let interval = std::time::Duration::from_secs(interval_seconds);
            loop {
                tokio::time::sleep(interval).await;

                if let Err(e) = self.refresh_all().await {
                    tracing::error!("Background cache refresh failed: {:?}", e);
                }

                // Clean up expired entries
                self.cache.cleanup_expired().await;
            }
        });
        tracing::info!("Started background cache refresh task (interval: {}s)", interval_seconds);
    }
}