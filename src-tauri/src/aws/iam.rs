// ============================================================================
// IAM SERVICE IMPLEMENTATION
// ============================================================================
// IAM user and role management with read-only operations for safety
// ============================================================================

use crate::aws::{AwsClient, AwsIamUser, AwsAccessKey, AwsPolicy, AwsResult, AwsError};
use aws_sdk_iam::types::{User as AwsSdkUser, AccessKeyMetadata};
use chrono::Utc;

pub struct IamService {
    client: AwsClient,
}

impl IamService {
    pub fn new(client: AwsClient) -> Self {
        Self { client }
    }

    /// Collect all IAM users with their access keys and policies
    pub async fn collect_users(&self) -> AwsResult<Vec<AwsIamUser>> {
        tracing::info!("Starting IAM user collection");

        let iam_client = &self.client.iam_client;

        let response = iam_client
            .list_users()
            .send()
            .await
            .map_err(|e| {
                tracing::error!("Failed to list IAM users: {:?}", e);
                AwsError::from(aws_sdk_iam::Error::from(e))
            })?;

        let mut users = Vec::new();

        for user in response.users() {
            if let Some(mapped_user) = self.map_aws_user(user).await {
                users.push(mapped_user);
            }
        }

        tracing::info!("Successfully collected {} IAM users", users.len());
        Ok(users)
    }

    /// Map AWS SDK user to our custom AwsIamUser type
    async fn map_aws_user(&self, user: &AwsSdkUser) -> Option<AwsIamUser> {
        let user_name = user.user_name().to_string();
        let user_id = user.user_id().to_string();
        let arn = user.arn().to_string();

        let create_date = user.create_date().to_string();

        let password_last_used = user.password_last_used()
            .map(|dt| dt.to_string());

        // Get access keys for this user
        let access_keys = self.get_user_access_keys(&user_name).await.unwrap_or_default();

        // Get attached policies for this user
        let attached_policies = self.get_user_policies(&user_name).await.unwrap_or_default();

        // Get groups for this user
        let groups = self.get_user_groups(&user_name).await.unwrap_or_default();

        Some(AwsIamUser {
            user_name,
            user_id,
            arn,
            create_date,
            password_last_used,
            access_keys,
            attached_policies,
            groups,
        })
    }

    /// Get access keys for a specific user
    async fn get_user_access_keys(&self, user_name: &str) -> AwsResult<Vec<AwsAccessKey>> {
        let iam_client = &self.client.iam_client;

        let response = iam_client
            .list_access_keys()
            .user_name(user_name)
            .send()
            .await
            .map_err(|e| {
                tracing::warn!("Failed to get access keys for user {}: {:?}", user_name, e);
                AwsError::from(aws_sdk_iam::Error::from(e))
            })?;

        let mut access_keys = Vec::new();

        for key_metadata in response.access_key_metadata() {
            if let Some(access_key) = self.map_access_key_metadata(key_metadata) {
                access_keys.push(access_key);
            }
        }

        Ok(access_keys)
    }

    /// Map access key metadata to our custom type
    fn map_access_key_metadata(&self, metadata: &AccessKeyMetadata) -> Option<AwsAccessKey> {
        let access_key_id = metadata.access_key_id().unwrap_or("unknown").to_string();
        let status = match metadata.status() {
            Some(status) => format!("{:?}", status).to_lowercase(),
            None => "unknown".to_string(),
        };

        let create_date = metadata.create_date().unwrap().to_string();

        // Last used information is not available in ListAccessKeys
        // Would need to call GetAccessKeyLastUsed for each key (expensive)
        let last_used = None;

        Some(AwsAccessKey {
            access_key_id,
            status,
            create_date,
            last_used,
        })
    }

    /// Get attached policies for a specific user
    async fn get_user_policies(&self, user_name: &str) -> AwsResult<Vec<AwsPolicy>> {
        let iam_client = &self.client.iam_client;

        let response = iam_client
            .list_attached_user_policies()
            .user_name(user_name)
            .send()
            .await
            .map_err(|e| {
                tracing::warn!("Failed to get attached policies for user {}: {:?}", user_name, e);
                AwsError::from(aws_sdk_iam::Error::from(e))
            })?;

        let mut policies = Vec::new();

        for attached_policy in response.attached_policies() {
            if let Some(policy) = self.map_attached_policy(attached_policy) {
                policies.push(policy);
            }
        }

        Ok(policies)
    }

    /// Map attached policy to our custom type
    fn map_attached_policy(&self, attached_policy: &aws_sdk_iam::types::AttachedPolicy) -> Option<AwsPolicy> {
        let policy_name = attached_policy.policy_name()?.to_string();
        let policy_arn = attached_policy.policy_arn()?.to_string();

        // For attached policies, we don't get the type directly
        // Most attached policies are managed policies
        let policy_type = "Managed".to_string();

        Some(AwsPolicy {
            policy_name,
            policy_arn,
            policy_type,
        })
    }

    /// Get groups for a specific user
    async fn get_user_groups(&self, user_name: &str) -> AwsResult<Vec<String>> {
        let iam_client = &self.client.iam_client;

        let response = iam_client
            .list_groups_for_user()
            .user_name(user_name)
            .send()
            .await
            .map_err(|e| {
                tracing::warn!("Failed to get groups for user {}: {:?}", user_name, e);
                AwsError::from(aws_sdk_iam::Error::from(e))
            })?;

        let groups = response.groups()
            .iter()
            .map(|group| group.group_name().to_string())
            .collect();

        Ok(groups)
    }

    /// Collect IAM roles (limited for safety)
    pub async fn collect_roles(&self) -> AwsResult<Vec<String>> {
        tracing::info!("Starting IAM role collection (limited for safety)");

        let iam_client = &self.client.iam_client;

        let response = iam_client
            .list_roles()
            .max_items(50) // Limited for safety and performance
            .send()
            .await
            .map_err(|e| {
                tracing::error!("Failed to list IAM roles: {:?}", e);
                AwsError::from(aws_sdk_iam::Error::from(e))
            })?;

        let roles: Vec<String> = response.roles()
            .iter()
            .map(|role| role.role_name().to_string())
            .collect();

        tracing::info!("Successfully collected {} IAM roles (limited)", roles.len());
        Ok(roles)
    }

    /// Get detailed information about a specific user
    pub async fn get_user_details(&self, user_name: &str) -> AwsResult<Option<AwsIamUser>> {
        tracing::debug!("Getting details for IAM user: {}", user_name);

        let iam_client = &self.client.iam_client;

        let response = iam_client
            .get_user()
            .user_name(user_name)
            .send()
            .await;

        match response {
            Ok(result) => {
                if let Some(user) = result.user() {
                    Ok(self.map_aws_user(user).await)
                } else {
                    Ok(None)
                }
            }
            Err(e) => {
                tracing::debug!("User {} not found: {:?}", user_name, e);
                Ok(None)
            }
        }
    }

    /// Check if current user has specific permissions (basic check)
    pub async fn check_permissions(&self) -> AwsResult<Vec<String>> {
        tracing::info!("Checking IAM permissions");

        let iam_client = &self.client.iam_client;

        // Try to list users (basic permission check)
        let can_list_users = iam_client
            .list_users()
            .max_items(1)
            .send()
            .await
            .is_ok();

        // Try to list roles
        let can_list_roles = iam_client
            .list_roles()
            .max_items(1)
            .send()
            .await
            .is_ok();

        // Try to list policies
        let can_list_policies = iam_client
            .list_policies()
            .max_items(1)
            .send()
            .await
            .is_ok();

        let mut permissions = Vec::new();

        if can_list_users {
            permissions.push("iam:ListUsers".to_string());
        }
        if can_list_roles {
            permissions.push("iam:ListRoles".to_string());
        }
        if can_list_policies {
            permissions.push("iam:ListPolicies".to_string());
        }

        tracing::info!("User has {} verified IAM permissions", permissions.len());
        Ok(permissions)
    }

    /// Get account summary (safe read-only operation)
    pub async fn get_account_summary(&self) -> AwsResult<std::collections::HashMap<String, i32>> {
        tracing::info!("Getting IAM account summary");

        let iam_client = &self.client.iam_client;

        let response = iam_client
            .get_account_summary()
            .send()
            .await
            .map_err(|e| {
                tracing::error!("Failed to get account summary: {:?}", e);
                AwsError::from(aws_sdk_iam::Error::from(e))
            })?;

        let mut summary = std::collections::HashMap::new();

        if let Some(summary_map) = response.summary_map() {
            for (key, value) in summary_map.iter() {
                summary.insert(key.to_string(), *value as i32);
            }
        }

        tracing::info!("Successfully retrieved IAM account summary with {} metrics", summary.len());
        Ok(summary)
    }
}