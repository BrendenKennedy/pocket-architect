use tauri::State;
use database::DbPool;

#[cfg(feature = "aws-sdk")]
use aws::{test_connection, AwsClient};

#[cfg(not(feature = "aws-sdk"))]
mod credential_validation {
    pub async fn test_connection(access_key: &str, secret_key: &str) -> Result<(), String> {
        // Basic validation when AWS SDK is not available
        if access_key.is_empty() || secret_key.is_empty() {
            return Err("AWS credentials are required but not configured. Please set valid AWS access key and secret key.".to_string());
        }

        if access_key.len() < 16 || access_key.len() > 128 {
            return Err("AWS access key appears to be invalid. Access keys are typically 16-128 characters long.".to_string());
        }

        if secret_key.len() < 32 || secret_key.len() > 128 {
            return Err("AWS secret key appears to be invalid. Secret keys are typically 32-128 characters long.".to_string());
        }

        if !access_key.starts_with("AKIA") && !access_key.starts_with("ASIA") {
            return Err("AWS access key should start with 'AKIA' (IAM user) or 'ASIA' (temporary credentials). Please verify your access key.".to_string());
        }

        // Note: This is basic validation. Full validation requires AWS SDK.
        Ok(())
    }

    pub async fn validate_credentials_for_operation(access_key: &str, secret_key: &str, region: &str) -> Result<(), String> {
        // Test basic credential format
        test_connection(access_key, secret_key).await?;

        // Additional validation that would normally be done by AWS SDK
        if region.is_empty() {
            return Err("AWS region is required. Please specify a valid AWS region.".to_string());
        }

        // Valid AWS regions (subset for validation)
        let valid_regions = [
            "us-east-1", "us-east-2", "us-west-1", "us-west-2",
            "eu-west-1", "eu-central-1", "ap-southeast-1", "ap-northeast-1"
        ];

        if !valid_regions.contains(&region) {
            return Err(format!("AWS region '{}' may not be valid. Please verify the region code.", region));
        }

        Err("AWS SDK not available. To use live AWS data, build with: cargo build --features aws-sdk (requires Linux/Mac or compatible compiler)".to_string())
    }
}

#[cfg(feature = "aws-sdk")]
pub use aws::{test_connection, AwsClient};

#[cfg(not(feature = "aws-sdk"))]
pub use credential_validation::{test_connection, validate_credentials_for_operation};



// Declare modules
mod database;

#[cfg(feature = "aws-sdk")]
mod aws;

// Re-export for main.rs
pub use database::init_database_sync;

// App state
pub struct AppState {
    pub db: std::sync::Arc<tokio::sync::Mutex<DbPool>>,
}

// Placeholder commands - these need to be implemented
#[tauri::command]
fn greet(name: String) -> Result<String, String> {
    Ok(format!("Hello, {}!", name))
}

// ============================================================================
// ACCOUNT MANAGEMENT COMMANDS
// ============================================================================

#[tauri::command]
async fn get_accounts(state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    let db_guard = state.db.lock().await;
    match database::get_accounts(&*db_guard).await {
        Ok(accounts) => Ok(serde_json::json!({
            "success": true,
            "data": accounts
        })),
        Err(e) => Ok(serde_json::json!({
            "success": false,
            "message": format!("Failed to get accounts: {}", e)
        }))
    }
}

#[tauri::command]
async fn get_account(id: i64, state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    let db_guard = state.db.lock().await;
    match database::get_account(&*db_guard, id).await {
        Ok(Some(account)) => Ok(serde_json::json!({
            "success": true,
            "data": account
        })),
        Ok(None) => Ok(serde_json::json!({
            "success": false,
            "message": "Account not found"
        })),
        Err(e) => Ok(serde_json::json!({
            "success": false,
            "message": format!("Failed to get account: {}", e)
        }))
    }
}

#[tauri::command]
async fn create_account(
    request: serde_json::Value,
    state: State<'_, AppState>
) -> Result<serde_json::Value, String> {
    let db_guard = state.db.lock().await;
    match serde_json::from_value::<database::CreateAccountRequest>(request) {
        Ok(req) => match database::create_account(&*db_guard, req).await {
            Ok(account) => Ok(serde_json::json!({
                "success": true,
                "data": account
            })),
            Err(e) => Ok(serde_json::json!({
                "success": false,
                "message": format!("Failed to create account: {}", e)
            }))
        },
        Err(e) => Ok(serde_json::json!({
            "success": false,
            "message": format!("Invalid request format: {}", e)
        }))
    }
}

#[tauri::command]
async fn update_account(
    id: i64,
    request: serde_json::Value,
    state: State<'_, AppState>
) -> Result<serde_json::Value, String> {
    let db_guard = state.db.lock().await;
    match serde_json::from_value::<database::CreateAccountRequest>(request) {
        Ok(req) => match database::update_account(&*db_guard, id, req).await {
            Ok(Some(account)) => Ok(serde_json::json!({
                "success": true,
                "data": account
            })),
            Ok(None) => Ok(serde_json::json!({
                "success": false,
                "message": "Account not found"
            })),
            Err(e) => Ok(serde_json::json!({
                "success": false,
                "message": format!("Failed to update account: {}", e)
            }))
        },
        Err(e) => Ok(serde_json::json!({
            "success": false,
            "message": format!("Invalid request format: {}", e)
        }))
    }
}

#[tauri::command]
async fn delete_account(id: i64, state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    let db_guard = state.db.lock().await;
    match database::delete_account(&*db_guard, id).await {
        Ok(true) => Ok(serde_json::json!({
            "success": true,
            "message": "Account deleted successfully"
        })),
        Ok(false) => Ok(serde_json::json!({
            "success": false,
            "message": "Account not found"
        })),
        Err(e) => Ok(serde_json::json!({
            "success": false,
            "message": format!("Failed to delete account: {}", e)
        }))
    }
}

#[tauri::command]
async fn test_account_connection(
    id: i64,
    state: State<'_, AppState>
) -> Result<serde_json::Value, String> {
    let db_guard = state.db.lock().await;

    // Get account credentials
    let account = match database::get_account(&*db_guard, id).await {
        Ok(Some(account)) => account,
        Ok(None) => {
            return Ok(serde_json::json!({
                "success": false,
                "message": "AWS account not found. Please check your account configuration.",
                "data": { "status": "failed", "error_type": "account_not_found" }
            }));
        }
        Err(e) => {
            return Ok(serde_json::json!({
                "success": false,
                "message": format!("Database error: {}. Please check your database configuration.", e),
                "data": { "status": "failed", "error_type": "database_error" }
            }));
        }
    };

    // Get credentials for AWS access
    let credentials = match database::get_account_credentials(&*db_guard, id).await {
        Ok(creds) => creds,
        Err(e) => {
            return Ok(serde_json::json!({
                "success": false,
                "message": format!("Failed to retrieve AWS credentials: {}. Please check your account configuration.", e),
                "data": { "status": "failed", "error_type": "credentials_retrieval_error" }
            }));
        }
    };

    let access_key = credentials.access_key.as_deref().unwrap_or("");
    let secret_key = credentials.secret_key.as_deref().unwrap_or("");

    if access_key.is_empty() || secret_key.is_empty() {
        return Ok(serde_json::json!({
            "success": false,
            "message": "AWS credentials are required but not configured. Please set valid AWS access key and secret key.",
            "data": { "status": "failed", "error_type": "missing_credentials" }
        }));
    }

    #[cfg(feature = "aws-sdk")]
    {
        match test_connection(access_key, secret_key).await {
            Ok(_) => Ok(serde_json::json!({
                "success": true,
                "message": "AWS credentials validated successfully with AWS API. Your account is ready to use.",
                "data": { "status": "connected", "region": account.region.unwrap_or_else(|| "us-east-1".to_string()) }
            })),
            Err(e) => Ok(serde_json::json!({
                "success": false,
                "message": format!("AWS credential validation failed: {}. Please verify your access key and secret key are correct.", e),
                "data": { "status": "failed", "error_type": "credential_validation_error" }
            }))
        }
    }

    #[cfg(not(feature = "aws-sdk"))]
    {
        match test_connection(access_key, secret_key).await {
            Ok(_) => Ok(serde_json::json!({
                "success": true,
                "message": "AWS credentials format validated successfully. To test actual connectivity, build with: cargo build --features aws-sdk",
                "data": { "status": "format_valid", "region": account.region.unwrap_or_else(|| "us-east-1".to_string()) }
            })),
            Err(e) => Ok(serde_json::json!({
                "success": false,
                "message": e,
                "data": { "status": "failed", "error_type": "format_validation_error" }
            }))
        }
    }
}

// #[tauri::command]
// async fn sync_account(id: i64, state: State<'_, AppState>) -> Result<serde_json::Value, String> {
#[tauri::command]
async fn sync_account(id: i64, state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    let db_guard = state.db.lock().await;

    // Get account credentials
    let account = match database::get_account(&*db_guard, id).await {
        Ok(Some(account)) => account,
        Ok(None) => {
            return Ok(serde_json::json!({
                "success": false,
                "message": "Account not found",
                "data": { "synced": 0 }
            }));
        }
        Err(e) => {
            return Ok(serde_json::json!({
                "success": false,
                "message": format!("Failed to get account: {}", e),
                "data": { "synced": 0 }
            }));
        }
    };

    // Get credentials for AWS access
    let credentials = match database::get_account_credentials(&*db_guard, id).await {
        Ok(creds) => creds,
        Err(e) => {
            return Ok(serde_json::json!({
                "success": false,
                "message": format!("Failed to get credentials: {}", e),
                "data": { "synced": 0 }
            }));
        }
    };

    let access_key = credentials.access_key.as_deref().unwrap_or("");
    let secret_key = credentials.secret_key.as_deref().unwrap_or("");
    let region = account.region.as_deref().unwrap_or("us-east-1");

    if access_key.is_empty() || secret_key.is_empty() {
        return Ok(serde_json::json!({
            "success": false,
            "message": "AWS credentials are required but not configured. Please set valid AWS access key and secret key.",
            "data": { "synced": 0 }
        }));
    }

    #[cfg(feature = "aws-sdk")]
    let aws_client = match AwsClient::new(access_key, secret_key, region).await {
        Ok(client) => client,
        Err(e) => {
            return Ok(serde_json::json!({
                "success": false,
                "message": format!("Failed to validate AWS credentials: {}. Please verify your access key and secret key are correct.", e),
                "data": { "synced": 0 }
            }));
        }
    };

    #[cfg(not(feature = "aws-sdk"))]
    {
        // Validate credentials format without AWS SDK
        match validate_credentials_for_operation(access_key, secret_key, region).await {
            Ok(_) => return Ok(serde_json::json!({
                "success": false,
                "message": "AWS SDK not available. To sync real AWS data, build with: cargo build --features aws-sdk (requires Linux/Mac or compatible compiler)",
                "data": { "synced": 0 }
            })),
            Err(e) => return Ok(serde_json::json!({
                "success": false,
                "message": e,
                "data": { "synced": 0 }
            }))
        }
    }

    let mut synced_count = 0;
    let mut sync_results = Vec::new();

    #[cfg(feature = "aws-sdk")]
    {
        // Sync EC2 instances
        match aws_client.collect_instances().await {
            Ok(instances) => {
                let instance_count = instances.len();
                synced_count += instance_count;
                sync_results.push(format!("Synced {} EC2 instances", instance_count));

                // Store instances in database
                for instance in instances {
                    let instance_request = database::CreateInstanceRequest {
                        name: instance.instance_id.clone(),
                        project_id: id,
                        instance_type: instance.instance_type.clone(),
                        platform: "aws".to_string(),
                        region: instance.region.clone(),
                        storage_gb: instance.storage_gb as i32,
                        security_config: None,
                        ssh_key: None,
                        tags: Some(instance.tags.into_iter().map(|(k, v)| format!("{}={}", k, v)).collect()),
                    };

                    if let Err(e) = database::create_instance(&*db_guard, instance_request).await {
                        sync_results.push(format!("Failed to store instance {}: {}", instance.instance_id, e));
                    }
                }
            }
            Err(e) => {
                sync_results.push(format!("Failed to sync EC2 instances: {}", e));
            }
        }

        // Sync S3 buckets
        match aws_client.collect_buckets().await {
            Ok(buckets) => {
                let bucket_count = buckets.len();
                synced_count += bucket_count;
                sync_results.push(format!("Synced {} S3 buckets", bucket_count));
            }
            Err(e) => {
                sync_results.push(format!("Failed to sync S3 buckets: {}", e));
            }
        }

        // Sync Lambda functions
        match aws_client.collect_lambda_functions().await {
            Ok(functions) => {
                let function_count = functions.len();
                synced_count += function_count;
                sync_results.push(format!("Synced {} Lambda functions", function_count));
            }
            Err(e) => {
                sync_results.push(format!("Failed to sync Lambda functions: {}", e));
            }
        }
    }

    #[cfg(not(feature = "aws-sdk"))]
    {
        sync_results.push("AWS SDK not available - cannot sync real AWS data".to_string());
    }

    // Update account last sync time
    let update_request = database::UpdateAccountRequest {
        name: None,
        access_key: None,
        secret_key: None,
        region: None,
        last_sync: Some(chrono::Utc::now().to_rfc3339()),
    };

    if let Err(e) = database::update_account_fields(&*db_guard, id, update_request).await {
        sync_results.push(format!("Failed to update last sync time: {}", e));
    }

    Ok(serde_json::json!({
        "success": true,
        "message": "Account sync completed",
        "data": {
            "synced": synced_count,
            "results": sync_results
        }
    }))
}

// ============================================================================
// PROJECT MANAGEMENT COMMANDS
// ============================================================================

#[tauri::command]
async fn get_projects(state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    let db_guard = state.db.lock().await;
    let options = database::ProjectListOptions::default();
    match database::get_projects(&*db_guard, options).await {
        Ok(projects) => Ok(serde_json::json!({
            "success": true,
            "data": projects
        })),
        Err(e) => Ok(serde_json::json!({
            "success": false,
            "message": format!("Failed to get projects: {}", e)
        }))
    }
}

#[tauri::command]
async fn get_project(id: i64, state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    let db_guard = state.db.lock().await;
    match database::get_project(&*db_guard, id).await {
        Ok(Some(project)) => Ok(serde_json::json!({
            "success": true,
            "data": project
        })),
        Ok(None) => Ok(serde_json::json!({
            "success": false,
            "message": "Project not found"
        })),
        Err(e) => Ok(serde_json::json!({
            "success": false,
            "message": format!("Failed to get project: {}", e)
        }))
    }
}

#[tauri::command]
async fn create_project(
    request: serde_json::Value,
    state: State<'_, AppState>
) -> Result<serde_json::Value, String> {
    let db_guard = state.db.lock().await;
    match serde_json::from_value::<database::CreateProjectRequest>(request) {
        Ok(req) => match database::create_project(&*db_guard, req).await {
            Ok(project) => Ok(serde_json::json!({
                "success": true,
                "data": project
            })),
            Err(e) => Ok(serde_json::json!({
                "success": false,
                "message": format!("Failed to create project: {}", e)
            }))
        },
        Err(e) => Ok(serde_json::json!({
            "success": false,
            "message": format!("Invalid request format: {}", e)
        }))
    }
}

#[tauri::command]
async fn update_project(
    id: i64,
    request: serde_json::Value,
    state: State<'_, AppState>
) -> Result<serde_json::Value, String> {
    let db_guard = state.db.lock().await;
    match serde_json::from_value::<database::UpdateProjectRequest>(request) {
        Ok(req) => match database::update_project(&*db_guard, id, req).await {
            Ok(Some(project)) => Ok(serde_json::json!({
                "success": true,
                "data": project
            })),
            Ok(None) => Ok(serde_json::json!({
                "success": false,
                "message": "Project not found"
            })),
            Err(e) => Ok(serde_json::json!({
                "success": false,
                "message": format!("Failed to update project: {}", e)
            }))
        },
        Err(e) => Ok(serde_json::json!({
            "success": false,
            "message": format!("Invalid request format: {}", e)
        }))
    }
}

#[tauri::command]
async fn delete_project(id: i64, state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    let db_guard = state.db.lock().await;
    match database::delete_project(&*db_guard, id).await {
        Ok(true) => Ok(serde_json::json!({
            "success": true,
            "message": "Project deleted successfully"
        })),
        Ok(false) => Ok(serde_json::json!({
            "success": false,
            "message": "Project not found"
        })),
        Err(e) => Ok(serde_json::json!({
            "success": false,
            "message": format!("Failed to delete project: {}", e)
        }))
    }
}

// ============================================================================
// INSTANCE MANAGEMENT COMMANDS
// ============================================================================

#[tauri::command]
async fn get_instances(state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    let db_guard = state.db.lock().await;
    match database::get_instances(&*db_guard).await {
        Ok(instances) => Ok(serde_json::json!({
            "success": true,
            "data": instances
        })),
        Err(e) => Ok(serde_json::json!({
            "success": false,
            "message": format!("Failed to get instances: {}", e)
        }))
    }
}

#[tauri::command]
async fn get_instance(id: i64, state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    let db_guard = state.db.lock().await;
    match database::get_instance(&*db_guard, id).await {
        Ok(Some(instance)) => Ok(serde_json::json!({
            "success": true,
            "data": instance
        })),
        Ok(None) => Ok(serde_json::json!({
            "success": false,
            "message": "Instance not found"
        })),
        Err(e) => Ok(serde_json::json!({
            "success": false,
            "message": format!("Failed to get instance: {}", e)
        }))
    }
}

#[tauri::command]
async fn create_instance(
    request: serde_json::Value,
    state: State<'_, AppState>
) -> Result<serde_json::Value, String> {
    let db_guard = state.db.lock().await;
    match serde_json::from_value::<database::CreateInstanceRequest>(request) {
        Ok(req) => match database::create_instance(&*db_guard, req).await {
            Ok(instance) => Ok(serde_json::json!({
                "success": true,
                "data": instance
            })),
            Err(e) => Ok(serde_json::json!({
                "success": false,
                "message": format!("Failed to create instance: {}", e)
            }))
        },
        Err(e) => Ok(serde_json::json!({
            "success": false,
            "message": format!("Invalid request format: {}", e)
        }))
    }
}

#[tauri::command]
async fn update_instance(
    id: i64,
    request: serde_json::Value,
    state: State<'_, AppState>
) -> Result<serde_json::Value, String> {
    let db_guard = state.db.lock().await;
    match serde_json::from_value::<database::UpdateInstanceRequest>(request) {
        Ok(req) => match database::update_instance(&*db_guard, id, req).await {
            Ok(Some(instance)) => Ok(serde_json::json!({
                "success": true,
                "data": instance
            })),
            Ok(None) => Ok(serde_json::json!({
                "success": false,
                "message": "Instance not found"
            })),
            Err(e) => Ok(serde_json::json!({
                "success": false,
                "message": format!("Failed to update instance: {}", e)
            }))
        },
        Err(e) => Ok(serde_json::json!({
            "success": false,
            "message": format!("Invalid request format: {}", e)
        }))
    }
}

#[tauri::command]
async fn delete_instance(id: i64, state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    let db_guard = state.db.lock().await;
    match database::delete_instance(&*db_guard, id).await {
        Ok(true) => Ok(serde_json::json!({
            "success": true,
            "message": "Instance deleted successfully"
        })),
        Ok(false) => Ok(serde_json::json!({
            "success": false,
            "message": "Instance not found"
        })),
        Err(e) => Ok(serde_json::json!({
            "success": false,
            "message": format!("Failed to delete instance: {}", e)
        }))
    }
}

#[tauri::command]
async fn start_instance(id: i64, state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    let db_guard = state.db.lock().await;
    match database::start_instance(&*db_guard, id).await {
        Ok(Some(instance)) => Ok(serde_json::json!({
            "success": true,
            "data": instance,
            "message": "Instance started successfully"
        })),
        Ok(None) => Ok(serde_json::json!({
            "success": false,
            "message": "Instance not found"
        })),
        Err(e) => Ok(serde_json::json!({
            "success": false,
            "message": format!("Failed to start instance: {}", e)
        }))
    }
}

#[tauri::command]
async fn stop_instance(id: i64, state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    let db_guard = state.db.lock().await;
    match database::stop_instance(&*db_guard, id).await {
        Ok(Some(instance)) => Ok(serde_json::json!({
            "success": true,
            "data": instance,
            "message": "Instance stopped successfully"
        })),
        Ok(None) => Ok(serde_json::json!({
            "success": false,
            "message": "Instance not found"
        })),
        Err(e) => Ok(serde_json::json!({
            "success": false,
            "message": format!("Failed to stop instance: {}", e)
        }))
    }
}

#[tauri::command]
async fn restart_instance(id: i64, state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    let db_guard = state.db.lock().await;
    match database::restart_instance(&*db_guard, id).await {
        Ok(Some(instance)) => Ok(serde_json::json!({
            "success": true,
            "data": instance,
            "message": "Instance restarted successfully"
        })),
        Ok(None) => Ok(serde_json::json!({
            "success": false,
            "message": "Instance not found"
        })),
        Err(e) => Ok(serde_json::json!({
            "success": false,
            "message": format!("Failed to restart instance: {}", e)
        }))
    }
}

// ============================================================================
// BLUEPRINT MANAGEMENT COMMANDS
// ============================================================================

#[tauri::command]
async fn get_blueprints(state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    let db_guard = state.db.lock().await;
    match database::get_blueprints(&*db_guard).await {
        Ok(blueprints) => Ok(serde_json::json!({
            "success": true,
            "data": blueprints
        })),
        Err(e) => Ok(serde_json::json!({
            "success": false,
            "message": format!("Failed to get blueprints: {}", e)
        }))
    }
}

#[tauri::command]
async fn get_blueprint(id: i64, state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    let db_guard = state.db.lock().await;
    match database::get_blueprint(&*db_guard, id).await {
        Ok(Some(blueprint)) => Ok(serde_json::json!({
            "success": true,
            "data": blueprint
        })),
        Ok(None) => Ok(serde_json::json!({
            "success": false,
            "message": "Blueprint not found"
        })),
        Err(e) => Ok(serde_json::json!({
            "success": false,
            "message": format!("Failed to get blueprint: {}", e)
        }))
    }
}

#[tauri::command]
async fn create_blueprint(
    request: serde_json::Value,
    state: State<'_, AppState>
) -> Result<serde_json::Value, String> {
    let db_guard = state.db.lock().await;
    match serde_json::from_value::<database::CreateBlueprintRequest>(request) {
        Ok(req) => match database::create_blueprint(&*db_guard, req).await {
            Ok(blueprint) => Ok(serde_json::json!({
                "success": true,
                "data": blueprint
            })),
            Err(e) => Ok(serde_json::json!({
                "success": false,
                "message": format!("Failed to create blueprint: {}", e)
            }))
        },
        Err(e) => Ok(serde_json::json!({
            "success": false,
            "message": format!("Invalid request format: {}", e)
        }))
    }
}

#[tauri::command]
async fn update_blueprint(
    id: i64,
    request: serde_json::Value,
    state: State<'_, AppState>
) -> Result<serde_json::Value, String> {
    let db_guard = state.db.lock().await;
    match serde_json::from_value::<database::UpdateBlueprintRequest>(request) {
        Ok(req) => match database::update_blueprint(&*db_guard, id, req).await {
            Ok(Some(blueprint)) => Ok(serde_json::json!({
                "success": true,
                "data": blueprint
            })),
            Ok(None) => Ok(serde_json::json!({
                "success": false,
                "message": "Blueprint not found"
            })),
            Err(e) => Ok(serde_json::json!({
                "success": false,
                "message": format!("Failed to update blueprint: {}", e)
            }))
        },
        Err(e) => Ok(serde_json::json!({
            "success": false,
            "message": format!("Invalid request format: {}", e)
        }))
    }
}

#[tauri::command]
async fn delete_blueprint(id: i64, state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    let db_guard = state.db.lock().await;
    match database::delete_blueprint(&*db_guard, id).await {
        Ok(true) => Ok(serde_json::json!({
            "success": true,
            "message": "Blueprint deleted successfully"
        })),
        Ok(false) => Ok(serde_json::json!({
            "success": false,
            "message": "Blueprint not found"
        })),
        Err(e) => Ok(serde_json::json!({
            "success": false,
            "message": format!("Failed to delete blueprint: {}", e)
        }))
    }
}

#[tauri::command]
async fn deploy_blueprint(
    blueprint_id: i64,
    project_id: i64,
    instance_name: String,
    state: State<'_, AppState>
) -> Result<serde_json::Value, String> {
    let db_guard = state.db.lock().await;
    match database::deploy_blueprint(&*db_guard, blueprint_id, project_id, instance_name).await {
        Ok(instance) => Ok(serde_json::json!({
            "success": true,
            "data": instance,
            "message": "Blueprint deployed successfully"
        })),
        Err(e) => Ok(serde_json::json!({
            "success": false,
            "message": format!("Failed to deploy blueprint: {}", e)
        }))
    }
}

// ============================================================================
// SECURITY CONFIG MANAGEMENT COMMANDS
// ============================================================================

#[tauri::command]
async fn get_security_configs(state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    let db_guard = state.db.lock().await;
    match database::get_security_configs(&*db_guard).await {
        Ok(security_configs) => Ok(serde_json::json!({
            "success": true,
            "data": security_configs
        })),
        Err(e) => Ok(serde_json::json!({
            "success": false,
            "message": format!("Failed to get security configs: {}", e)
        }))
    }
}

#[tauri::command]
async fn get_security_config(id: i64, state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    let db_guard = state.db.lock().await;
    match database::get_security_config(&*db_guard, id).await {
        Ok(Some(security_config)) => Ok(serde_json::json!({
            "success": true,
            "data": security_config
        })),
        Ok(None) => Ok(serde_json::json!({
            "success": false,
            "message": "Security config not found"
        })),
        Err(e) => Ok(serde_json::json!({
            "success": false,
            "message": format!("Failed to get security config: {}", e)
        }))
    }
}

#[tauri::command]
async fn create_security_config(
    request: serde_json::Value,
    state: State<'_, AppState>
) -> Result<serde_json::Value, String> {
    let db_guard = state.db.lock().await;
    match serde_json::from_value::<database::CreateSecurityConfigRequest>(request) {
        Ok(req) => match database::create_security_config(&*db_guard, req).await {
            Ok(security_config) => Ok(serde_json::json!({
                "success": true,
                "data": security_config
            })),
            Err(e) => Ok(serde_json::json!({
                "success": false,
                "message": format!("Failed to create security config: {}", e)
            }))
        },
        Err(e) => Ok(serde_json::json!({
            "success": false,
            "message": format!("Invalid request format: {}", e)
        }))
    }
}

#[tauri::command]
async fn update_security_config(
    id: i64,
    request: serde_json::Value,
    state: State<'_, AppState>
) -> Result<serde_json::Value, String> {
    let db_guard = state.db.lock().await;
    match serde_json::from_value::<database::CreateSecurityConfigRequest>(request) {
        Ok(req) => match database::update_security_config(&*db_guard, id, req).await {
            Ok(Some(security_config)) => Ok(serde_json::json!({
                "success": true,
                "data": security_config
            })),
            Ok(None) => Ok(serde_json::json!({
                "success": false,
                "message": "Security config not found"
            })),
            Err(e) => Ok(serde_json::json!({
                "success": false,
                "message": format!("Failed to update security config: {}", e)
            }))
        },
        Err(e) => Ok(serde_json::json!({
            "success": false,
            "message": format!("Invalid request format: {}", e)
        }))
    }
}

#[tauri::command]
async fn delete_security_config(id: i64, state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    let db_guard = state.db.lock().await;
    match database::delete_security_config(&*db_guard, id).await {
        Ok(true) => Ok(serde_json::json!({
            "success": true,
            "message": "Security config deleted successfully"
        })),
        Ok(false) => Ok(serde_json::json!({
            "success": false,
            "message": "Security config not found"
        })),
        Err(e) => Ok(serde_json::json!({
            "success": false,
            "message": format!("Failed to delete security config: {}", e)
        }))
    }
}

// ============================================================================
// DIRECT AWS OPERATIONS
// ============================================================================

#[tauri::command]
async fn collect_ec2_instances(
    options: serde_json::Value,
    state: State<'_, AppState>
) -> Result<serde_json::Value, String> {
    // Get account ID from options
    let account_id = options.get("account_id")
        .and_then(|v| v.as_i64())
        .ok_or("Missing account_id in options")?;

    let db_guard = state.db.lock().await;

    // Get account credentials
    let credentials = match database::get_account_credentials(&*db_guard, account_id).await {
        Ok(creds) => creds,
        Err(e) => {
            return Ok(serde_json::json!({
                "success": false,
                "message": format!("Failed to get credentials: {}", e),
                "data": []
            }));
        }
    };

    let account = match database::get_account(&*db_guard, account_id).await {
        Ok(Some(account)) => account,
        Ok(None) => {
            return Ok(serde_json::json!({
                "success": false,
                "message": "Account not found",
                "data": []
            }));
        }
        Err(e) => {
            return Ok(serde_json::json!({
                "success": false,
                "message": format!("Failed to get account: {}", e),
                "data": []
            }));
        }
    };

    let access_key = credentials.access_key.as_deref().unwrap_or("");
    let secret_key = credentials.secret_key.as_deref().unwrap_or("");
    let region = account.region.as_deref().unwrap_or("us-east-1");

    if access_key.is_empty() || secret_key.is_empty() {
        return Ok(serde_json::json!({
            "success": false,
            "message": "AWS credentials are required but not configured. Please set valid AWS access key and secret key.",
            "data": []
        }));
    }

    #[cfg(feature = "aws-sdk")]
    {
        // Create AWS client
        let aws_client = match AwsClient::new(access_key, secret_key, region).await {
            Ok(client) => client,
            Err(e) => {
                return Ok(serde_json::json!({
                    "success": false,
                    "message": format!("Failed to validate AWS credentials: {}. Please verify your access key and secret key are correct.", e),
                    "data": []
                }));
            }
        };

        // Collect instances
        match aws_client.collect_instances().await {
            Ok(instances) => Ok(serde_json::json!({
                "success": true,
                "message": format!("Successfully collected {} EC2 instances from AWS", instances.len()),
                "data": instances
            })),
            Err(e) => Ok(serde_json::json!({
                "success": false,
                "message": format!("Failed to collect EC2 instances: {}. Please check your AWS credentials and permissions.", e),
                "data": []
            }))
        }
    }

    #[cfg(not(feature = "aws-sdk"))]
    {
        // Validate credentials format without AWS SDK
        return match validate_credentials_for_operation(access_key, secret_key, region).await {
            Ok(_) => Ok(serde_json::json!({
                "success": false,
                "message": "AWS SDK not available. To collect real EC2 instances, build with: cargo build --features aws-sdk (requires Linux/Mac or compatible compiler)",
                "data": []
            })),
            Err(e) => Ok(serde_json::json!({
                "success": false,
                "message": e,
                "data": []
            }))
        };
    }
}

#[tauri::command]
async fn create_ec2_instance(
    instance_data: serde_json::Value,
    state: State<'_, AppState>
) -> Result<serde_json::Value, String> {
    // Extract required parameters
    let account_id = instance_data.get("account_id")
        .and_then(|v| v.as_i64())
        .ok_or("Missing account_id")?;

    let instance_type = instance_data.get("instance_type")
        .and_then(|v| v.as_str())
        .ok_or("Missing instance_type")?;

    let image_id = instance_data.get("image_id")
        .and_then(|v| v.as_str())
        .ok_or("Missing image_id")?;

    let instance_name = instance_data.get("name")
        .and_then(|v| v.as_str())
        .unwrap_or("pocket-architect-instance");

    let db_guard = state.db.lock().await;

    // Get account credentials
    let credentials = match database::get_account_credentials(&*db_guard, account_id).await {
        Ok(creds) => creds,
        Err(e) => {
            return Ok(serde_json::json!({
                "success": false,
                "message": format!("Failed to get credentials: {}", e),
                "data": null
            }));
        }
    };

    let account = match database::get_account(&*db_guard, account_id).await {
        Ok(Some(account)) => account,
        Ok(None) => {
            return Ok(serde_json::json!({
                "success": false,
                "message": "Account not found",
                "data": null
            }));
        }
        Err(e) => {
            return Ok(serde_json::json!({
                "success": false,
                "message": format!("Failed to get account: {}", e),
                "data": null
            }));
        }
    };

    let access_key = credentials.access_key.as_deref().unwrap_or("");
    let secret_key = credentials.secret_key.as_deref().unwrap_or("");
    let region = account.region.as_deref().unwrap_or("us-east-1");

    if access_key.is_empty() || secret_key.is_empty() {
        return Ok(serde_json::json!({
            "success": false,
            "message": "Missing AWS credentials",
            "data": null
        }));
    }

    // Create AWS client
    let aws_client = match AwsClient::new(access_key, secret_key, region).await {
        Ok(client) => client,
        Err(e) => {
            return Ok(serde_json::json!({
                "success": false,
                "message": format!("Failed to create AWS client: {}", e),
                "data": null
            }));
        }
    };

    // Create instance
    match aws_client.create_instance(instance_type, image_id, instance_name).await {
        Ok(instance) => Ok(serde_json::json!({
            "success": true,
            "message": "EC2 instance created successfully",
            "data": instance
        })),
        Err(e) => Ok(serde_json::json!({
            "success": false,
            "message": format!("Failed to create instance: {}", e),
            "data": null
        }))
    }
}

#[tauri::command]
async fn delete_ec2_instance(
    instance_id: String,
    state: State<'_, AppState>
) -> Result<serde_json::Value, String> {
    // Extract account_id from instance data
    let instance = database::get_instance_by_aws_id(&*state.db.lock().await, &instance_id).await
        .map_err(|e| format!("Failed to find instance: {}", e))?
        .ok_or("Instance not found")?;

    let account_id = if instance.project_id > 0 { instance.project_id } else {
        return Ok(serde_json::json!({ "success": false, "message": "Instance not associated with an account" }));
    };

    let db_guard = state.db.lock().await;

    // Get account credentials
    let credentials = match database::get_account_credentials(&*db_guard, account_id).await {
        Ok(creds) => creds,
        Err(e) => {
            return Ok(serde_json::json!({
                "success": false,
                "message": format!("Failed to get credentials: {}", e)
            }));
        }
    };

    let account = match database::get_account(&*db_guard, account_id).await {
        Ok(Some(account)) => account,
        Ok(None) => {
            return Ok(serde_json::json!({
                "success": false,
                "message": "Account not found"
            }));
        }
        Err(e) => {
            return Ok(serde_json::json!({
                "success": false,
                "message": format!("Failed to get account: {}", e)
            }));
        }
    };

    let access_key = credentials.access_key.as_deref().unwrap_or("");
    let secret_key = credentials.secret_key.as_deref().unwrap_or("");
    let region = account.region.as_deref().unwrap_or("us-east-1");

    if access_key.is_empty() || secret_key.is_empty() {
        return Ok(serde_json::json!({
            "success": false,
            "message": "Missing AWS credentials"
        }));
    }

    // Create AWS client
    let aws_client = match AwsClient::new(access_key, secret_key, region).await {
        Ok(client) => client,
        Err(e) => {
            return Ok(serde_json::json!({
                "success": false,
                "message": format!("Failed to create AWS client: {}", e)
            }));
        }
    };

    // Delete instance
    match aws_client.delete_instance(&instance_id).await {
        Ok(_) => Ok(serde_json::json!({
            "success": true,
            "message": "EC2 instance deleted successfully"
        })),
        Err(e) => Ok(serde_json::json!({
            "success": false,
            "message": format!("Failed to delete instance: {}", e)
        }))
    }
}

#[tauri::command]
async fn start_ec2_instance(
    instance_id: String,
    state: State<'_, AppState>
) -> Result<serde_json::Value, String> {
    // Get account from instance
    let db_guard = state.db.lock().await;
    let instance = match database::get_instance_by_aws_id(&*db_guard, &instance_id).await {
        Ok(Some(instance)) => instance,
        Ok(None) => {
            return Ok(serde_json::json!({
                "success": false,
                "message": "Instance not found"
            }));
        }
        Err(e) => {
            return Ok(serde_json::json!({
                "success": false,
                "message": format!("Failed to find instance: {}", e)
            }));
        }
    };

    let account_id = if instance.project_id > 0 { instance.project_id } else { return Ok(serde_json::json!({ "success": false, "message": "Instance not associated with an account" })); };

    // Get account credentials
    let credentials = match database::get_account_credentials(&*db_guard, account_id).await {
        Ok(creds) => creds,
        Err(e) => {
            return Ok(serde_json::json!({
                "success": false,
                "message": format!("Failed to get credentials: {}", e)
            }));
        }
    };

    let account = match database::get_account(&*db_guard, account_id).await {
        Ok(Some(account)) => account,
        Ok(None) => {
            return Ok(serde_json::json!({
                "success": false,
                "message": "Account not found"
            }));
        }
        Err(e) => {
            return Ok(serde_json::json!({
                "success": false,
                "message": format!("Failed to get account: {}", e)
            }));
        }
    };

    let access_key = credentials.access_key.as_deref().unwrap_or("");
    let secret_key = credentials.secret_key.as_deref().unwrap_or("");
    let region = account.region.as_deref().unwrap_or("us-east-1");

    if access_key.is_empty() || secret_key.is_empty() {
        return Ok(serde_json::json!({
            "success": false,
            "message": "Missing AWS credentials"
        }));
    }

    // Create AWS client
    let aws_client = match AwsClient::new(access_key, secret_key, region).await {
        Ok(client) => client,
        Err(e) => {
            return Ok(serde_json::json!({
                "success": false,
                "message": format!("Failed to create AWS client: {}", e)
            }));
        }
    };

    // Start instance
    match aws_client.start_instance(&instance_id).await {
        Ok(_) => Ok(serde_json::json!({
            "success": true,
            "message": "EC2 instance started successfully"
        })),
        Err(e) => Ok(serde_json::json!({
            "success": false,
            "message": format!("Failed to start instance: {}", e)
        }))
    }
}

#[tauri::command]
async fn stop_ec2_instance(
    instance_id: String,
    state: State<'_, AppState>
) -> Result<serde_json::Value, String> {
    // Get account from instance
    let db_guard = state.db.lock().await;
    let instance = match database::get_instance_by_aws_id(&*db_guard, &instance_id).await {
        Ok(Some(instance)) => instance,
        Ok(None) => {
            return Ok(serde_json::json!({
                "success": false,
                "message": "Instance not found"
            }));
        }
        Err(e) => {
            return Ok(serde_json::json!({
                "success": false,
                "message": format!("Failed to find instance: {}", e)
            }));
        }
    };

    let account_id = if instance.project_id > 0 { instance.project_id } else { return Ok(serde_json::json!({ "success": false, "message": "Instance not associated with an account" })); };

    // Get account credentials
    let credentials = match database::get_account_credentials(&*db_guard, account_id).await {
        Ok(creds) => creds,
        Err(e) => {
            return Ok(serde_json::json!({
                "success": false,
                "message": format!("Failed to get credentials: {}", e)
            }));
        }
    };

    let account = match database::get_account(&*db_guard, account_id).await {
        Ok(Some(account)) => account,
        Ok(None) => {
            return Ok(serde_json::json!({
                "success": false,
                "message": "Account not found"
            }));
        }
        Err(e) => {
            return Ok(serde_json::json!({
                "success": false,
                "message": format!("Failed to get account: {}", e)
            }));
        }
    };

    let access_key = credentials.access_key.as_deref().unwrap_or("");
    let secret_key = credentials.secret_key.as_deref().unwrap_or("");
    let region = account.region.as_deref().unwrap_or("us-east-1");

    if access_key.is_empty() || secret_key.is_empty() {
        return Ok(serde_json::json!({
            "success": false,
            "message": "Missing AWS credentials"
        }));
    }

    // Create AWS client
    let aws_client = match AwsClient::new(access_key, secret_key, region).await {
        Ok(client) => client,
        Err(e) => {
            return Ok(serde_json::json!({
                "success": false,
                "message": format!("Failed to create AWS client: {}", e)
            }));
        }
    };

    // Stop instance
    match aws_client.stop_instance(&instance_id).await {
        Ok(_) => Ok(serde_json::json!({
            "success": true,
            "message": "EC2 instance stopped successfully"
        })),
        Err(e) => Ok(serde_json::json!({
            "success": false,
            "message": format!("Failed to stop instance: {}", e)
        }))
    }
}

#[tauri::command]
async fn restart_ec2_instance(
    instance_id: String,
    state: State<'_, AppState>
) -> Result<serde_json::Value, String> {
    // Get account from instance
    let db_guard = state.db.lock().await;
    let instance = match database::get_instance_by_aws_id(&*db_guard, &instance_id).await {
        Ok(Some(instance)) => instance,
        Ok(None) => {
            return Ok(serde_json::json!({
                "success": false,
                "message": "Instance not found"
            }));
        }
        Err(e) => {
            return Ok(serde_json::json!({
                "success": false,
                "message": format!("Failed to find instance: {}", e)
            }));
        }
    };

    let account_id = if instance.project_id > 0 { instance.project_id } else { return Ok(serde_json::json!({ "success": false, "message": "Instance not associated with an account" })); };

    // Get account credentials
    let credentials = match database::get_account_credentials(&*db_guard, account_id).await {
        Ok(creds) => creds,
        Err(e) => {
            return Ok(serde_json::json!({
                "success": false,
                "message": format!("Failed to get credentials: {}", e)
            }));
        }
    };

    let account = match database::get_account(&*db_guard, account_id).await {
        Ok(Some(account)) => account,
        Ok(None) => {
            return Ok(serde_json::json!({
                "success": false,
                "message": "Account not found"
            }));
        }
        Err(e) => {
            return Ok(serde_json::json!({
                "success": false,
                "message": format!("Failed to get account: {}", e)
            }));
        }
    };

    let access_key = credentials.access_key.as_deref().unwrap_or("");
    let secret_key = credentials.secret_key.as_deref().unwrap_or("");
    let region = account.region.as_deref().unwrap_or("us-east-1");

    if access_key.is_empty() || secret_key.is_empty() {
        return Ok(serde_json::json!({
            "success": false,
            "message": "Missing AWS credentials"
        }));
    }

    // Create AWS client
    let aws_client = match AwsClient::new(access_key, secret_key, region).await {
        Ok(client) => client,
        Err(e) => {
            return Ok(serde_json::json!({
                "success": false,
                "message": format!("Failed to create AWS client: {}", e)
            }));
        }
    };

    // Restart instance
    match aws_client.restart_instance(&instance_id).await {
        Ok(_) => Ok(serde_json::json!({
            "success": true,
            "message": "EC2 instance restarted successfully"
        })),
        Err(e) => Ok(serde_json::json!({
            "success": false,
            "message": format!("Failed to restart instance: {}", e)
        }))
    }
}

#[tauri::command]
async fn get_ec2_instance_details(
    instance_id: String,
    state: State<'_, AppState>
) -> Result<serde_json::Value, String> {
    // Get account from instance
    let db_guard = state.db.lock().await;
    let instance = match database::get_instance_by_aws_id(&*db_guard, &instance_id).await {
        Ok(Some(instance)) => instance,
        Ok(None) => {
            return Ok(serde_json::json!({
                "success": false,
                "message": "Instance not found",
                "data": {}
            }));
        }
        Err(e) => {
            return Ok(serde_json::json!({
                "success": false,
                "message": format!("Failed to find instance: {}", e),
                "data": {}
            }));
        }
    };

    let account_id = if instance.project_id > 0 { instance.project_id } else { return Ok(serde_json::json!({ "success": false, "message": "Instance not associated with an account" })); };

    // Get account credentials
    let credentials = match database::get_account_credentials(&*db_guard, account_id).await {
        Ok(creds) => creds,
        Err(e) => {
            return Ok(serde_json::json!({
                "success": false,
                "message": format!("Failed to get credentials: {}", e),
                "data": {}
            }));
        }
    };

    let account = match database::get_account(&*db_guard, account_id).await {
        Ok(Some(account)) => account,
        Ok(None) => {
            return Ok(serde_json::json!({
                "success": false,
                "message": "Account not found",
                "data": {}
            }));
        }
        Err(e) => {
            return Ok(serde_json::json!({
                "success": false,
                "message": format!("Failed to get account: {}", e),
                "data": {}
            }));
        }
    };

    let access_key = credentials.access_key.as_deref().unwrap_or("");
    let secret_key = credentials.secret_key.as_deref().unwrap_or("");
    let region = account.region.as_deref().unwrap_or("us-east-1");

    if access_key.is_empty() || secret_key.is_empty() {
        return Ok(serde_json::json!({
            "success": false,
            "message": "Missing AWS credentials",
            "data": {}
        }));
    }

    // Create AWS client
    let aws_client = match AwsClient::new(access_key, secret_key, region).await {
        Ok(client) => client,
        Err(e) => {
            return Ok(serde_json::json!({
                "success": false,
                "message": format!("Failed to create AWS client: {}", e),
                "data": {}
            }));
        }
    };

    // Get instance details
    match aws_client.get_instance_details(&instance_id).await {
        Ok(details) => Ok(serde_json::json!({
            "success": true,
            "message": "EC2 instance details retrieved successfully",
            "data": details
        })),
        Err(e) => Ok(serde_json::json!({
            "success": false,
            "message": format!("Failed to get instance details: {}", e),
            "data": {}
        }))
    }
}

#[tauri::command]
async fn get_ec2_instance_ssh_config(
    instance_id: String,
    state: State<'_, AppState>
) -> Result<serde_json::Value, String> {
    // Get account from instance
    let db_guard = state.db.lock().await;
    let instance = match database::get_instance_by_aws_id(&*db_guard, &instance_id).await {
        Ok(Some(instance)) => instance,
        Ok(None) => {
            return Ok(serde_json::json!({
                "success": false,
                "message": "Instance not found",
                "data": { "config": "" }
            }));
        }
        Err(e) => {
            return Ok(serde_json::json!({
                "success": false,
                "message": format!("Failed to find instance: {}", e),
                "data": { "config": "" }
            }));
        }
    };

    let account_id = if instance.project_id > 0 { instance.project_id } else { return Ok(serde_json::json!({ "success": false, "message": "Instance not associated with an account" })); };

    // Get account credentials
    let credentials = match database::get_account_credentials(&*db_guard, account_id).await {
        Ok(creds) => creds,
        Err(e) => {
            return Ok(serde_json::json!({
                "success": false,
                "message": format!("Failed to get credentials: {}", e),
                "data": { "config": "" }
            }));
        }
    };

    let account = match database::get_account(&*db_guard, account_id).await {
        Ok(Some(account)) => account,
        Ok(None) => {
            return Ok(serde_json::json!({
                "success": false,
                "message": "Account not found",
                "data": { "config": "" }
            }));
        }
        Err(e) => {
            return Ok(serde_json::json!({
                "success": false,
                "message": format!("Failed to get account: {}", e),
                "data": { "config": "" }
            }));
        }
    };

    let access_key = credentials.access_key.as_deref().unwrap_or("");
    let secret_key = credentials.secret_key.as_deref().unwrap_or("");
    let region = account.region.as_deref().unwrap_or("us-east-1");

    if access_key.is_empty() || secret_key.is_empty() {
        return Ok(serde_json::json!({
            "success": false,
            "message": "Missing AWS credentials",
            "data": { "config": "" }
        }));
    }

    // Create AWS client
    let aws_client = match AwsClient::new(access_key, secret_key, region).await {
        Ok(client) => client,
        Err(e) => {
            return Ok(serde_json::json!({
                "success": false,
                "message": format!("Failed to create AWS client: {}", e),
                "data": { "config": "" }
            }));
        }
    };

    // Get SSH config
    match aws_client.get_instance_ssh_config(&instance_id).await {
        Ok(config) => Ok(serde_json::json!({
            "success": true,
            "message": "SSH config generated successfully",
            "data": { "config": config }
        })),
        Err(e) => Ok(serde_json::json!({
            "success": false,
            "message": format!("Failed to generate SSH config: {}", e),
            "data": { "config": "" }
        }))
    }
}

// ============================================================================
// S3 OPERATIONS
// ============================================================================

#[tauri::command]
async fn collect_s3_buckets(state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    let db_guard = state.db.lock().await;

    // Get first available account for S3 access
    let accounts = match database::get_accounts(&*db_guard).await {
        Ok(accounts) => accounts,
        Err(e) => {
            return Ok(serde_json::json!({
                "success": false,
                "message": format!("Failed to get accounts: {}", e),
                "data": []
            }));
        }
    };

    if accounts.is_empty() {
        return Ok(serde_json::json!({
            "success": false,
            "message": "No AWS accounts configured",
            "data": []
        }));
    }

    let account = &accounts[0];
    let account_id = account.id;

    // Get account credentials
    let credentials = match database::get_account_credentials(&*db_guard, account_id).await {
        Ok(creds) => creds,
        Err(e) => {
            return Ok(serde_json::json!({
                "success": false,
                "message": format!("Failed to get credentials: {}", e),
                "data": []
            }));
        }
    };

    let access_key = credentials.access_key.as_deref().unwrap_or("");
    let secret_key = credentials.secret_key.as_deref().unwrap_or("");
    let region = account.region.as_deref().unwrap_or("us-east-1");

    if access_key.is_empty() || secret_key.is_empty() {
        return Ok(serde_json::json!({
            "success": false,
            "message": "Missing AWS credentials",
            "data": []
        }));
    }

    // Create AWS client
    let aws_client = match AwsClient::new(access_key, secret_key, region).await {
        Ok(client) => client,
        Err(e) => {
            return Ok(serde_json::json!({
                "success": false,
                "message": format!("Failed to create AWS client: {}", e),
                "data": []
            }));
        }
    };

    // Collect buckets
    match aws_client.collect_buckets().await {
        Ok(buckets) => Ok(serde_json::json!({
            "success": true,
            "message": format!("Collected {} S3 buckets", buckets.len()),
            "data": buckets
        })),
        Err(e) => Ok(serde_json::json!({
            "success": false,
            "message": format!("Failed to collect buckets: {}", e),
            "data": []
        }))
    }
}

#[tauri::command]
async fn create_s3_bucket(
    bucket_name: String,
    region: String,
    state: State<'_, AppState>
) -> Result<serde_json::Value, String> {
    let db_guard = state.db.lock().await;

    // Get first available account for S3 access
    let accounts = match database::get_accounts(&*db_guard).await {
        Ok(accounts) => accounts,
        Err(e) => {
            return Ok(serde_json::json!({
                "success": false,
                "message": format!("Failed to get accounts: {}", e),
                "data": null
            }));
        }
    };

    if accounts.is_empty() {
        return Ok(serde_json::json!({
            "success": false,
            "message": "No AWS accounts configured",
            "data": null
        }));
    }

    let account = &accounts[0];
    let account_id = account.id;

    // Get account credentials
    let credentials = match database::get_account_credentials(&*db_guard, account_id).await {
        Ok(creds) => creds,
        Err(e) => {
            return Ok(serde_json::json!({
                "success": false,
                "message": format!("Failed to get credentials: {}", e),
                "data": null
            }));
        }
    };

    let access_key = credentials.access_key.as_deref().unwrap_or("");
    let secret_key = credentials.secret_key.as_deref().unwrap_or("");
    let default_region = account.region.as_deref().unwrap_or("us-east-1");

    if access_key.is_empty() || secret_key.is_empty() {
        return Ok(serde_json::json!({
            "success": false,
            "message": "Missing AWS credentials",
            "data": null
        }));
    }

    // Create AWS client
    let aws_client = match AwsClient::new(access_key, secret_key, default_region).await {
        Ok(client) => client,
        Err(e) => {
            return Ok(serde_json::json!({
                "success": false,
                "message": format!("Failed to create AWS client: {}", e),
                "data": null
            }));
        }
    };

    // Create bucket
    match aws_client.create_bucket(&bucket_name, &region).await {
        Ok(bucket) => Ok(serde_json::json!({
            "success": true,
            "message": "S3 bucket created successfully",
            "data": bucket
        })),
        Err(e) => Ok(serde_json::json!({
            "success": false,
            "message": format!("Failed to create bucket: {}", e),
            "data": null
        }))
    }
}

#[tauri::command]
async fn delete_s3_bucket(
    bucket_name: String,
    state: State<'_, AppState>
) -> Result<serde_json::Value, String> {
    let db_guard = state.db.lock().await;

    // Get first available account for S3 access
    let accounts = match database::get_accounts(&*db_guard).await {
        Ok(accounts) => accounts,
        Err(e) => {
            return Ok(serde_json::json!({
                "success": false,
                "message": format!("Failed to get accounts: {}", e)
            }));
        }
    };

    if accounts.is_empty() {
        return Ok(serde_json::json!({
            "success": false,
            "message": "No AWS accounts configured"
        }));
    }

    let account = &accounts[0];
    let account_id = account.id;

    // Get account credentials
    let credentials = match database::get_account_credentials(&*db_guard, account_id).await {
        Ok(creds) => creds,
        Err(e) => {
            return Ok(serde_json::json!({
                "success": false,
                "message": format!("Failed to get credentials: {}", e)
            }));
        }
    };

    let access_key = credentials.access_key.as_deref().unwrap_or("");
    let secret_key = credentials.secret_key.as_deref().unwrap_or("");
    let region = account.region.as_deref().unwrap_or("us-east-1");

    if access_key.is_empty() || secret_key.is_empty() {
        return Ok(serde_json::json!({
            "success": false,
            "message": "Missing AWS credentials"
        }));
    }

    // Create AWS client
    let aws_client = match AwsClient::new(access_key, secret_key, region).await {
        Ok(client) => client,
        Err(e) => {
            return Ok(serde_json::json!({
                "success": false,
                "message": format!("Failed to create AWS client: {}", e)
            }));
        }
    };

    // Delete bucket
    match aws_client.delete_bucket(&bucket_name).await {
        Ok(_) => Ok(serde_json::json!({
            "success": true,
            "message": "S3 bucket deleted successfully"
        })),
        Err(e) => Ok(serde_json::json!({
            "success": false,
            "message": format!("Failed to delete bucket: {}", e)
        }))
    }
}

#[tauri::command]
async fn get_s3_bucket_details(
    bucket_name: String,
    state: State<'_, AppState>
) -> Result<serde_json::Value, String> {
    let db_guard = state.db.lock().await;

    // Get first available account for S3 access
    let accounts = match database::get_accounts(&*db_guard).await {
        Ok(accounts) => accounts,
        Err(e) => {
            return Ok(serde_json::json!({
                "success": false,
                "message": format!("Failed to get accounts: {}", e),
                "data": {}
            }));
        }
    };

    if accounts.is_empty() {
        return Ok(serde_json::json!({
            "success": false,
            "message": "No AWS accounts configured",
            "data": {}
        }));
    }

    let account = &accounts[0];
    let account_id = account.id;

    // Get account credentials
    let credentials = match database::get_account_credentials(&*db_guard, account_id).await {
        Ok(creds) => creds,
        Err(e) => {
            return Ok(serde_json::json!({
                "success": false,
                "message": format!("Failed to get credentials: {}", e),
                "data": {}
            }));
        }
    };

    let access_key = credentials.access_key.as_deref().unwrap_or("");
    let secret_key = credentials.secret_key.as_deref().unwrap_or("");
    let region = account.region.as_deref().unwrap_or("us-east-1");

    if access_key.is_empty() || secret_key.is_empty() {
        return Ok(serde_json::json!({
            "success": false,
            "message": "Missing AWS credentials",
            "data": {}
        }));
    }

    // Create AWS client
    let aws_client = match AwsClient::new(access_key, secret_key, region).await {
        Ok(client) => client,
        Err(e) => {
            return Ok(serde_json::json!({
                "success": false,
                "message": format!("Failed to create AWS client: {}", e),
                "data": {}
            }));
        }
    };

    // Get bucket details
    match aws_client.get_bucket_details(&bucket_name).await {
        Ok(details) => Ok(serde_json::json!({
            "success": true,
            "message": "S3 bucket details retrieved successfully",
            "data": details
        })),
        Err(e) => Ok(serde_json::json!({
            "success": false,
            "message": format!("Failed to get bucket details: {}", e),
            "data": {}
        }))
    }
}

// ============================================================================
// IAM OPERATIONS
// ============================================================================

#[tauri::command]
async fn collect_iam_users(state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    let db_guard = state.db.lock().await;

    // Get first available account for IAM access
    let accounts = match database::get_accounts(&*db_guard).await {
        Ok(accounts) => accounts,
        Err(e) => {
            return Ok(serde_json::json!({
                "success": false,
                "message": format!("Failed to get accounts: {}", e),
                "data": []
            }));
        }
    };

    if accounts.is_empty() {
        return Ok(serde_json::json!({
            "success": false,
            "message": "No AWS accounts configured",
            "data": []
        }));
    }

    let account = &accounts[0];
    let account_id = account.id;

    // Get account credentials
    let credentials = match database::get_account_credentials(&*db_guard, account_id).await {
        Ok(creds) => creds,
        Err(e) => {
            return Ok(serde_json::json!({
                "success": false,
                "message": format!("Failed to get credentials: {}", e),
                "data": []
            }));
        }
    };

    let access_key = credentials.access_key.as_deref().unwrap_or("");
    let secret_key = credentials.secret_key.as_deref().unwrap_or("");
    let region = account.region.as_deref().unwrap_or("us-east-1");

    if access_key.is_empty() || secret_key.is_empty() {
        return Ok(serde_json::json!({
            "success": false,
            "message": "Missing AWS credentials",
            "data": []
        }));
    }

    // Create AWS client
    let aws_client = match AwsClient::new(access_key, secret_key, region).await {
        Ok(client) => client,
        Err(e) => {
            return Ok(serde_json::json!({
                "success": false,
                "message": format!("Failed to create AWS client: {}", e),
                "data": []
            }));
        }
    };

    // Collect IAM users
    match aws_client.collect_iam_users().await {
        Ok(users) => Ok(serde_json::json!({
            "success": true,
            "message": format!("Collected {} IAM users", users.len()),
            "data": users
        })),
        Err(e) => Ok(serde_json::json!({
            "success": false,
            "message": format!("Failed to collect IAM users: {}", e),
            "data": []
        }))
    }
}

#[tauri::command]
async fn collect_iam_roles(state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    let db_guard = state.db.lock().await;

    // Get first available account for IAM access
    let accounts = match database::get_accounts(&*db_guard).await {
        Ok(accounts) => accounts,
        Err(e) => {
            return Ok(serde_json::json!({
                "success": false,
                "message": format!("Failed to get accounts: {}", e),
                "data": []
            }));
        }
    };

    if accounts.is_empty() {
        return Ok(serde_json::json!({
            "success": false,
            "message": "No AWS accounts configured",
            "data": []
        }));
    }

    let account = &accounts[0];
    let account_id = account.id;

    // Get account credentials
    let credentials = match database::get_account_credentials(&*db_guard, account_id).await {
        Ok(creds) => creds,
        Err(e) => {
            return Ok(serde_json::json!({
                "success": false,
                "message": format!("Failed to get credentials: {}", e),
                "data": []
            }));
        }
    };

    let access_key = credentials.access_key.as_deref().unwrap_or("");
    let secret_key = credentials.secret_key.as_deref().unwrap_or("");
    let region = account.region.as_deref().unwrap_or("us-east-1");

    if access_key.is_empty() || secret_key.is_empty() {
        return Ok(serde_json::json!({
            "success": false,
            "message": "Missing AWS credentials",
            "data": []
        }));
    }

    // Create AWS client
    let aws_client = match AwsClient::new(access_key, secret_key, region).await {
        Ok(client) => client,
        Err(e) => {
            return Ok(serde_json::json!({
                "success": false,
                "message": format!("Failed to create AWS client: {}", e),
                "data": []
            }));
        }
    };

    // Collect IAM roles
    match aws_client.collect_iam_roles().await {
        Ok(roles) => Ok(serde_json::json!({
            "success": true,
            "message": format!("Collected {} IAM roles", roles.len()),
            "data": roles
        })),
        Err(e) => Ok(serde_json::json!({
            "success": false,
            "message": format!("Failed to collect IAM roles: {}", e),
            "data": []
        }))
    }
}

#[tauri::command]
async fn get_iam_user_details(
    user_name: String,
    state: State<'_, AppState>
) -> Result<serde_json::Value, String> {
    let db_guard = state.db.lock().await;

    // Get first available account for IAM access
    let accounts = match database::get_accounts(&*db_guard).await {
        Ok(accounts) => accounts,
        Err(e) => {
            return Ok(serde_json::json!({
                "success": false,
                "message": format!("Failed to get accounts: {}", e),
                "data": {}
            }));
        }
    };

    if accounts.is_empty() {
        return Ok(serde_json::json!({
            "success": false,
            "message": "No AWS accounts configured",
            "data": {}
        }));
    }

    let account = &accounts[0];
    let account_id = account.id;

    // Get account credentials
    let credentials = match database::get_account_credentials(&*db_guard, account_id).await {
        Ok(creds) => creds,
        Err(e) => {
            return Ok(serde_json::json!({
                "success": false,
                "message": format!("Failed to get credentials: {}", e),
                "data": {}
            }));
        }
    };

    let access_key = credentials.access_key.as_deref().unwrap_or("");
    let secret_key = credentials.secret_key.as_deref().unwrap_or("");
    let region = account.region.as_deref().unwrap_or("us-east-1");

    if access_key.is_empty() || secret_key.is_empty() {
        return Ok(serde_json::json!({
            "success": false,
            "message": "Missing AWS credentials",
            "data": {}
        }));
    }

    // Create AWS client
    let aws_client = match AwsClient::new(access_key, secret_key, region).await {
        Ok(client) => client,
        Err(e) => {
            return Ok(serde_json::json!({
                "success": false,
                "message": format!("Failed to create AWS client: {}", e),
                "data": {}
            }));
        }
    };

    // Get IAM user details
    match aws_client.get_iam_user_details(&user_name).await {
        Ok(details) => Ok(serde_json::json!({
            "success": true,
            "message": "IAM user details retrieved successfully",
            "data": details
        })),
        Err(e) => Ok(serde_json::json!({
            "success": false,
            "message": format!("Failed to get IAM user details: {}", e),
            "data": {}
        }))
    }
}

// ============================================================================
// COST MANAGEMENT
// ============================================================================

#[tauri::command]
async fn get_cost_summary(
    start_date: String,
    end_date: String,
    state: State<'_, AppState>
) -> Result<serde_json::Value, String> {
    let db_guard = state.db.lock().await;

    // Get first available account for cost access
    let accounts = match database::get_accounts(&*db_guard).await {
        Ok(accounts) => accounts,
        Err(e) => {
            return Ok(serde_json::json!({
                "success": false,
                "message": format!("Database error: {}. Please check your database configuration.", e),
                "data": { "total_cost": 0.0, "services": [] }
            }));
        }
    };

    if accounts.is_empty() {
        return Ok(serde_json::json!({
            "success": false,
            "message": "No AWS accounts configured. Please create an AWS account in Pocket Architect first.",
            "data": { "total_cost": 0.0, "services": [] }
        }));
    }

    let account = &accounts[0];
    let account_id = account.id;

    // Get account credentials
    let credentials = match database::get_account_credentials(&*db_guard, account_id).await {
        Ok(creds) => creds,
        Err(e) => {
            return Ok(serde_json::json!({
                "success": false,
                "message": format!("Failed to retrieve AWS credentials: {}. Please check your account configuration.", e),
                "data": { "total_cost": 0.0, "services": [] }
            }));
        }
    };

    let account = match database::get_account(&*db_guard, account_id).await {
        Ok(Some(account)) => account,
        Ok(None) => {
            return Ok(serde_json::json!({
                "success": false,
                "message": "AWS account not found. Please reconfigure your account.",
                "data": { "total_cost": 0.0, "services": [] }
            }));
        }
        Err(e) => {
            return Ok(serde_json::json!({
                "success": false,
                "message": format!("Database error accessing account: {}. Please check your database.", e),
                "data": { "total_cost": 0.0, "services": [] }
            }));
        }
    };

    let access_key = credentials.access_key.as_deref().unwrap_or("");
    let secret_key = credentials.secret_key.as_deref().unwrap_or("");
    let region = account.region.as_deref().unwrap_or("us-east-1");

    if access_key.is_empty() || secret_key.is_empty() {
        return Ok(serde_json::json!({
            "success": false,
            "message": "AWS credentials are required but not configured. Please set valid AWS access key and secret key in your account settings.",
            "data": { "total_cost": 0.0, "services": [] }
        }));
    }

    #[cfg(feature = "aws-sdk")]
    {
        // Create AWS client
        let aws_client = match AwsClient::new(access_key, secret_key, region).await {
            Ok(client) => client,
            Err(e) => {
                return Ok(serde_json::json!({
                    "success": false,
                    "message": format!("Failed to validate AWS credentials: {}. Please verify your access key and secret key are correct.", e),
                    "data": { "total_cost": 0.0, "services": [] }
                }));
            }
        };

        // Get cost summary
        match aws_client.get_cost_summary(&start_date, &end_date).await {
            Ok(cost_summary) => Ok(serde_json::json!({
                "success": true,
                "message": "Cost summary retrieved successfully from AWS Cost Explorer",
                "data": cost_summary
            })),
            Err(e) => Ok(serde_json::json!({
                "success": false,
                "message": format!("Failed to retrieve cost data from AWS: {}. Please check your AWS credentials have Cost Explorer permissions.", e),
                "data": { "total_cost": 0.0, "services": [] }
            }))
        }
    }

    #[cfg(not(feature = "aws-sdk"))]
    {
        // Validate credentials format without AWS SDK
        return match validate_credentials_for_operation(access_key, secret_key, region).await {
            Ok(_) => Ok(serde_json::json!({
                "success": false,
                "message": "AWS SDK not available. To retrieve real cost data from AWS Cost Explorer, build with: cargo build --features aws-sdk (requires Linux/Mac or compatible compiler)",
                "data": { "total_cost": 0.0, "services": [] }
            })),
            Err(e) => Ok(serde_json::json!({
                "success": false,
                "message": e,
                "data": { "total_cost": 0.0, "services": [] }
            }))
        };
    }
}

#[tauri::command]
async fn get_budget_alerts(state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    let db_guard = state.db.lock().await;

    // Get first available account for budget access
    let accounts = match database::get_accounts(&*db_guard).await {
        Ok(accounts) => accounts,
        Err(e) => {
            return Ok(serde_json::json!({
                "success": false,
                "message": format!("Failed to get accounts: {}", e),
                "data": []
            }));
        }
    };

    if accounts.is_empty() {
        return Ok(serde_json::json!({
            "success": false,
            "message": "No AWS accounts configured",
            "data": []
        }));
    }

    let account = &accounts[0];
    let account_id = account.id;

    // Get account credentials
    let credentials = match database::get_account_credentials(&*db_guard, account_id).await {
        Ok(creds) => creds,
        Err(e) => {
            return Ok(serde_json::json!({
                "success": false,
                "message": format!("Failed to get credentials: {}", e),
                "data": []
            }));
        }
    };

    let access_key = credentials.access_key.as_deref().unwrap_or("");
    let secret_key = credentials.secret_key.as_deref().unwrap_or("");
    let region = account.region.as_deref().unwrap_or("us-east-1");

    if access_key.is_empty() || secret_key.is_empty() {
        return Ok(serde_json::json!({
            "success": false,
            "message": "Missing AWS credentials",
            "data": []
        }));
    }

    // Create AWS client
    let aws_client = match AwsClient::new(access_key, secret_key, region).await {
        Ok(client) => client,
        Err(e) => {
            return Ok(serde_json::json!({
                "success": false,
                "message": format!("Failed to create AWS client: {}", e),
                "data": []
            }));
        }
    };

    // Get budget alerts
    match aws_client.get_budget_alerts().await {
        Ok(alerts) => Ok(serde_json::json!({
            "success": true,
            "message": format!("Retrieved {} budget alerts", alerts.len()),
            "data": alerts
        })),
        Err(e) => Ok(serde_json::json!({
            "success": false,
            "message": format!("Failed to get budget alerts: {}", e),
            "data": []
        }))
    }
}

#[tauri::command]
async fn create_budget_alert(
    request: serde_json::Value,
    state: State<'_, AppState>
) -> Result<serde_json::Value, String> {
    let db_guard = state.db.lock().await;

    // Get first available account for budget access
    let accounts = match database::get_accounts(&*db_guard).await {
        Ok(accounts) => accounts,
        Err(e) => {
            return Ok(serde_json::json!({
                "success": false,
                "message": format!("Failed to get accounts: {}", e),
                "data": {}
            }));
        }
    };

    if accounts.is_empty() {
        return Ok(serde_json::json!({
            "success": false,
            "message": "No AWS accounts configured",
            "data": {}
        }));
    }

    let account = &accounts[0];
    let account_id = account.id;

    // Get account credentials
    let credentials = match database::get_account_credentials(&*db_guard, account_id).await {
        Ok(creds) => creds,
        Err(e) => {
            return Ok(serde_json::json!({
                "success": false,
                "message": format!("Failed to get credentials: {}", e),
                "data": {}
            }));
        }
    };

    let access_key = credentials.access_key.as_deref().unwrap_or("");
    let secret_key = credentials.secret_key.as_deref().unwrap_or("");
    let region = account.region.as_deref().unwrap_or("us-east-1");

    if access_key.is_empty() || secret_key.is_empty() {
        return Ok(serde_json::json!({
            "success": false,
            "message": "Missing AWS credentials",
            "data": {}
        }));
    }

    // Create AWS client
    let aws_client = match AwsClient::new(access_key, secret_key, region).await {
        Ok(client) => client,
        Err(e) => {
            return Ok(serde_json::json!({
                "success": false,
                "message": format!("Failed to create AWS client: {}", e),
                "data": {}
            }));
        }
    };

    // Create budget alert
    match aws_client.create_budget_alert(&request).await {
        Ok(alert) => Ok(serde_json::json!({
            "success": true,
            "message": "Budget alert created successfully",
            "data": alert
        })),
        Err(e) => Ok(serde_json::json!({
            "success": false,
            "message": format!("Failed to create budget alert: {}", e),
            "data": {}
        }))
    }
}

#[tauri::command]
async fn update_budget_alert(
    id: i64,
    request: serde_json::Value,
    state: State<'_, AppState>
) -> Result<serde_json::Value, String> {
    let db_guard = state.db.lock().await;

    // Get first available account for budget access
    let accounts = match database::get_accounts(&*db_guard).await {
        Ok(accounts) => accounts,
        Err(e) => {
            return Ok(serde_json::json!({
                "success": false,
                "message": format!("Failed to get accounts: {}", e),
                "data": {}
            }));
        }
    };

    if accounts.is_empty() {
        return Ok(serde_json::json!({
            "success": false,
            "message": "No AWS accounts configured",
            "data": {}
        }));
    }

    let account = &accounts[0];
    let account_id = account.id;

    // Get account credentials
    let credentials = match database::get_account_credentials(&*db_guard, account_id).await {
        Ok(creds) => creds,
        Err(e) => {
            return Ok(serde_json::json!({
                "success": false,
                "message": format!("Failed to get credentials: {}", e),
                "data": {}
            }));
        }
    };

    let access_key = credentials.access_key.as_deref().unwrap_or("");
    let secret_key = credentials.secret_key.as_deref().unwrap_or("");
    let region = account.region.as_deref().unwrap_or("us-east-1");

    if access_key.is_empty() || secret_key.is_empty() {
        return Ok(serde_json::json!({
            "success": false,
            "message": "Missing AWS credentials",
            "data": {}
        }));
    }

    // Create AWS client
    let aws_client = match AwsClient::new(access_key, secret_key, region).await {
        Ok(client) => client,
        Err(e) => {
            return Ok(serde_json::json!({
                "success": false,
                "message": format!("Failed to create AWS client: {}", e),
                "data": {}
            }));
        }
    };

    // Update budget alert
    let alert_id = format!("budget-alert-{}", id);
    match aws_client.update_budget_alert(&alert_id, &request).await {
        Ok(alert) => Ok(serde_json::json!({
            "success": true,
            "message": "Budget alert updated successfully",
            "data": alert
        })),
        Err(e) => Ok(serde_json::json!({
            "success": false,
            "message": format!("Failed to update budget alert: {}", e),
            "data": {}
        }))
    }
}

#[tauri::command]
async fn delete_budget_alert(
    id: i64,
    state: State<'_, AppState>
) -> Result<serde_json::Value, String> {
    let db_guard = state.db.lock().await;

    // Get first available account for budget access
    let accounts = match database::get_accounts(&*db_guard).await {
        Ok(accounts) => accounts,
        Err(e) => {
            return Ok(serde_json::json!({
                "success": false,
                "message": format!("Failed to get accounts: {}", e)
            }));
        }
    };

    if accounts.is_empty() {
        return Ok(serde_json::json!({
            "success": false,
            "message": "No AWS accounts configured"
        }));
    }

    let account = &accounts[0];
    let account_id = account.id;

    // Get account credentials
    let credentials = match database::get_account_credentials(&*db_guard, account_id).await {
        Ok(creds) => creds,
        Err(e) => {
            return Ok(serde_json::json!({
                "success": false,
                "message": format!("Failed to get credentials: {}", e)
            }));
        }
    };

    let access_key = credentials.access_key.as_deref().unwrap_or("");
    let secret_key = credentials.secret_key.as_deref().unwrap_or("");
    let region = account.region.as_deref().unwrap_or("us-east-1");

    if access_key.is_empty() || secret_key.is_empty() {
        return Ok(serde_json::json!({
            "success": false,
            "message": "Missing AWS credentials"
        }));
    }

    // Create AWS client
    let aws_client = match AwsClient::new(access_key, secret_key, region).await {
        Ok(client) => client,
        Err(e) => {
            return Ok(serde_json::json!({
                "success": false,
                "message": format!("Failed to create AWS client: {}", e)
            }));
        }
    };

    // Delete budget alert
    let alert_id = format!("budget-alert-{}", id);
    match aws_client.delete_budget_alert(&alert_id).await {
        Ok(_) => Ok(serde_json::json!({
            "success": true,
            "message": "Budget alert deleted successfully"
        })),
        Err(e) => Ok(serde_json::json!({
            "success": false,
            "message": format!("Failed to delete budget alert: {}", e)
        }))
    }
}

#[tauri::command]
async fn get_cost_status(state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    let db_guard = state.db.lock().await;

    // Get first available account for cost access
    let accounts = match database::get_accounts(&*db_guard).await {
        Ok(accounts) => accounts,
        Err(e) => {
            return Ok(serde_json::json!({
                "success": false,
                "message": format!("Failed to get accounts: {}", e),
                "data": {}
            }));
        }
    };

    if accounts.is_empty() {
        return Ok(serde_json::json!({
            "success": false,
            "message": "No AWS accounts configured",
            "data": {}
        }));
    }

    let account = &accounts[0];
    let account_id = account.id;

    // Get account credentials
    let credentials = match database::get_account_credentials(&*db_guard, account_id).await {
        Ok(creds) => creds,
        Err(e) => {
            return Ok(serde_json::json!({
                "success": false,
                "message": format!("Failed to get credentials: {}", e),
                "data": {}
            }));
        }
    };

    let access_key = credentials.access_key.as_deref().unwrap_or("");
    let secret_key = credentials.secret_key.as_deref().unwrap_or("");
    let region = account.region.as_deref().unwrap_or("us-east-1");

    if access_key.is_empty() || secret_key.is_empty() {
        return Ok(serde_json::json!({
            "success": false,
            "message": "Missing AWS credentials",
            "data": {}
        }));
    }

    // Create AWS client
    let aws_client = match AwsClient::new(access_key, secret_key, region).await {
        Ok(client) => client,
        Err(e) => {
            return Ok(serde_json::json!({
                "success": false,
                "message": format!("Failed to create AWS client: {}", e),
                "data": {}
            }));
        }
    };

    // Get cost status
    match aws_client.get_cost_status().await {
        Ok(status) => Ok(serde_json::json!({
            "success": true,
            "message": "Cost status retrieved successfully",
            "data": status
        })),
        Err(e) => Ok(serde_json::json!({
            "success": false,
            "message": format!("Failed to get cost status: {}", e),
            "data": {}
        }))
    }
}

#[tauri::command]
async fn reset_cost_tracking(state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    let db_guard = state.db.lock().await;

    // Get first available account for cost access
    let accounts = match database::get_accounts(&*db_guard).await {
        Ok(accounts) => accounts,
        Err(e) => {
            return Ok(serde_json::json!({
                "success": false,
                "message": format!("Failed to get accounts: {}", e)
            }));
        }
    };

    if accounts.is_empty() {
        return Ok(serde_json::json!({
            "success": false,
            "message": "No AWS accounts configured"
        }));
    }

    let account = &accounts[0];
    let account_id = account.id;

    // Get account credentials
    let credentials = match database::get_account_credentials(&*db_guard, account_id).await {
        Ok(creds) => creds,
        Err(e) => {
            return Ok(serde_json::json!({
                "success": false,
                "message": format!("Failed to get credentials: {}", e)
            }));
        }
    };

    let access_key = credentials.access_key.as_deref().unwrap_or("");
    let secret_key = credentials.secret_key.as_deref().unwrap_or("");
    let region = account.region.as_deref().unwrap_or("us-east-1");

    if access_key.is_empty() || secret_key.is_empty() {
        return Ok(serde_json::json!({
            "success": false,
            "message": "Missing AWS credentials"
        }));
    }

    // Create AWS client
    let aws_client = match AwsClient::new(access_key, secret_key, region).await {
        Ok(client) => client,
        Err(e) => {
            return Ok(serde_json::json!({
                "success": false,
                "message": format!("Failed to create AWS client: {}", e)
            }));
        }
    };

    // Reset cost tracking
    match aws_client.reset_cost_tracking().await {
        Ok(_) => Ok(serde_json::json!({
            "success": true,
            "message": "Cost tracking reset successfully"
        })),
        Err(e) => Ok(serde_json::json!({
            "success": false,
            "message": format!("Failed to reset cost tracking: {}", e)
        }))
    }
}

// ============================================================================
// SYSTEM MANAGEMENT
// ============================================================================

#[tauri::command]
async fn get_cache_stats(state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    let db_guard = state.db.lock().await;

    // Get first available account for system access
    let accounts = match database::get_accounts(&*db_guard).await {
        Ok(accounts) => accounts,
        Err(e) => {
            return Ok(serde_json::json!({
                "success": false,
                "message": format!("Failed to get accounts: {}", e),
                "data": { "entries": 0, "size": 0 }
            }));
        }
    };

    if accounts.is_empty() {
        return Ok(serde_json::json!({
            "success": false,
            "message": "No AWS accounts configured",
            "data": { "entries": 0, "size": 0 }
        }));
    }

    let account = &accounts[0];
    let account_id = account.id;

    // Get account credentials
    let credentials = match database::get_account_credentials(&*db_guard, account_id).await {
        Ok(creds) => creds,
        Err(e) => {
            return Ok(serde_json::json!({
                "success": false,
                "message": format!("Failed to get credentials: {}", e),
                "data": { "entries": 0, "size": 0 }
            }));
        }
    };

    let access_key = credentials.access_key.as_deref().unwrap_or("");
    let secret_key = credentials.secret_key.as_deref().unwrap_or("");
    let region = account.region.as_deref().unwrap_or("us-east-1");

    if access_key.is_empty() || secret_key.is_empty() {
        return Ok(serde_json::json!({
            "success": false,
            "message": "Missing AWS credentials",
            "data": { "entries": 0, "size": 0 }
        }));
    }

    // Create AWS client
    let aws_client = match AwsClient::new(access_key, secret_key, region).await {
        Ok(client) => client,
        Err(e) => {
            return Ok(serde_json::json!({
                "success": false,
                "message": format!("Failed to create AWS client: {}", e),
                "data": { "entries": 0, "size": 0 }
            }));
        }
    };

    // Get cache stats
    match aws_client.get_cache_stats().await {
        Ok(stats) => Ok(serde_json::json!({
            "success": true,
            "message": "Cache statistics retrieved successfully",
            "data": stats
        })),
}
}

#[tauri::command]
async fn invalidate_cache(state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    let db_guard = state.db.lock().await;

    // Get first available account for system access
    let accounts = match database::get_accounts(&*db_guard).await {
        Ok(accounts) => accounts,
        Err(e) => {
            return Ok(serde_json::json!({
                "success": false,
                "message": format!("Failed to get accounts: {}", e)
            }));
        }
    };

    if accounts.is_empty() {
        return Ok(serde_json::json!({
            "success": false,
            "message": "No AWS accounts configured"
        }));
    }

    let account = &accounts[0];
    let account_id = account.id;

    // Get account credentials
    let credentials = match database::get_account_credentials(&*db_guard, account_id).await {
        Ok(creds) => creds,
        Err(e) => {
            return Ok(serde_json::json!({
                "success": false,
                "message": format!("Failed to get credentials: {}", e)
            }));
        }
    };

    let access_key = credentials.access_key.as_deref().unwrap_or("");
    let secret_key = credentials.secret_key.as_deref().unwrap_or("");
    let region = account.region.as_deref().unwrap_or("us-east-1");

    if access_key.is_empty() || secret_key.is_empty() {
        return Ok(serde_json::json!({
            "success": false,
            "message": "Missing AWS credentials"
        }));
    }

    // Create AWS client
    let aws_client = match AwsClient::new(access_key, secret_key, region).await {
        Ok(client) => client,
        Err(e) => {
            return Ok(serde_json::json!({
                "success": false,
                "message": format!("Failed to create AWS client: {}", e)
            }));
        }
    };

    // Invalidate cache
    match aws_client.invalidate_cache().await {
        Ok(_) => Ok(serde_json::json!({
            "success": true,
            "message": "Cache invalidated successfully"
        })),
        Err(e) => Ok(serde_json::json!({
            "success": false,
            "message": format!("Failed to invalidate cache: {}", e)
        }))
    }
}

#[tauri::command]
async fn invalidate_cache_region(
    region: String,
    state: State<'_, AppState>
) -> Result<serde_json::Value, String> {
    let db_guard = state.db.lock().await;

    // Get first available account for system access
    let accounts = match database::get_accounts(&*db_guard).await {
        Ok(accounts) => accounts,
        Err(e) => {
            return Ok(serde_json::json!({
                "success": false,
                "message": format!("Failed to get accounts: {}", e)
            }));
        }
    };

    if accounts.is_empty() {
        return Ok(serde_json::json!({
            "success": false,
            "message": "No AWS accounts configured"
        }));
    }

    let account = &accounts[0];
    let account_id = account.id;

    // Get account credentials
    let credentials = match database::get_account_credentials(&*db_guard, account_id).await {
        Ok(creds) => creds,
        Err(e) => {
            return Ok(serde_json::json!({
                "success": false,
                "message": format!("Failed to get credentials: {}", e)
            }));
        }
    };

    let access_key = credentials.access_key.as_deref().unwrap_or("");
    let secret_key = credentials.secret_key.as_deref().unwrap_or("");
    let default_region = account.region.as_deref().unwrap_or("us-east-1");

    if access_key.is_empty() || secret_key.is_empty() {
        return Ok(serde_json::json!({
            "success": false,
            "message": "Missing AWS credentials"
        }));
    }

    // Create AWS client
    let aws_client = match AwsClient::new(access_key, secret_key, default_region).await {
        Ok(client) => client,
        Err(e) => {
            return Ok(serde_json::json!({
                "success": false,
                "message": format!("Failed to create AWS client: {}", e)
            }));
        }
    };

    // Invalidate cache region
    match aws_client.invalidate_cache_region(&region).await {
        Ok(_) => Ok(serde_json::json!({
            "success": true,
            "message": format!("Cache region '{}' invalidated successfully", region)
        })),
        Err(e) => Ok(serde_json::json!({
            "success": false,
            "message": format!("Failed to invalidate cache region: {}", e)
        }))
    }
}

#[tauri::command]
async fn get_aws_health_status(state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    let db_guard = state.db.lock().await;

    // Get first available account for system access
    let accounts = match database::get_accounts(&*db_guard).await {
        Ok(accounts) => accounts,
        Err(e) => {
            return Ok(serde_json::json!({
                "success": false,
                "message": format!("Failed to get accounts: {}", e),
                "data": {}
            }));
        }
    };

    if accounts.is_empty() {
        return Ok(serde_json::json!({
            "success": false,
            "message": "No AWS accounts configured",
            "data": {}
        }));
    }

    let account = &accounts[0];
    let account_id = account.id;

    // Get account credentials
    let credentials = match database::get_account_credentials(&*db_guard, account_id).await {
        Ok(creds) => creds,
        Err(e) => {
            return Ok(serde_json::json!({
                "success": false,
                "message": format!("Failed to get credentials: {}", e),
                "data": {}
            }));
        }
    };

    let access_key = credentials.access_key.as_deref().unwrap_or("");
    let secret_key = credentials.secret_key.as_deref().unwrap_or("");
    let region = account.region.as_deref().unwrap_or("us-east-1");

    if access_key.is_empty() || secret_key.is_empty() {
        return Ok(serde_json::json!({
            "success": false,
            "message": "Missing AWS credentials",
            "data": {}
        }));
    }

    // Create AWS client
    let aws_client = match AwsClient::new(access_key, secret_key, region).await {
        Ok(client) => client,
        Err(e) => {
            return Ok(serde_json::json!({
                "success": false,
                "message": format!("Failed to create AWS client: {}", e),
                "data": {}
            }));
        }
    };

    // Get AWS health status
    match aws_client.get_aws_health_status().await {
        Ok(status) => Ok(serde_json::json!({
            "success": true,
            "message": "AWS health status retrieved successfully",
            "data": status
        })),
        Err(e) => Ok(serde_json::json!({
            "success": false,
            "message": format!("Failed to get AWS health status: {}", e),
            "data": {}
        }))
    }
}

#[tauri::command]
async fn force_aws_health_check(state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    let db_guard = state.db.lock().await;

    // Get first available account for system access
    let accounts = match database::get_accounts(&*db_guard).await {
        Ok(accounts) => accounts,
        Err(e) => {
            return Ok(serde_json::json!({
                "success": false,
                "message": format!("Failed to get accounts: {}", e),
                "data": {}
            }));
        }
    };

    if accounts.is_empty() {
        return Ok(serde_json::json!({
            "success": false,
            "message": "No AWS accounts configured",
            "data": {}
        }));
    }

    let account = &accounts[0];
    let account_id = account.id;

    // Get account credentials
    let credentials = match database::get_account_credentials(&*db_guard, account_id).await {
        Ok(creds) => creds,
        Err(e) => {
            return Ok(serde_json::json!({
                "success": false,
                "message": format!("Failed to get credentials: {}", e),
                "data": {}
            }));
        }
    };

    let access_key = credentials.access_key.as_deref().unwrap_or("");
    let secret_key = credentials.secret_key.as_deref().unwrap_or("");
    let region = account.region.as_deref().unwrap_or("us-east-1");

    if access_key.is_empty() || secret_key.is_empty() {
        return Ok(serde_json::json!({
            "success": false,
            "message": "Missing AWS credentials",
            "data": {}
        }));
    }

    // Create AWS client
    let aws_client = match AwsClient::new(access_key, secret_key, region).await {
        Ok(client) => client,
        Err(e) => {
            return Ok(serde_json::json!({
                "success": false,
                "message": format!("Failed to create AWS client: {}", e),
                "data": {}
            }));
        }
    };

    // Force AWS health check
    match aws_client.force_aws_health_check().await {
        Ok(result) => Ok(serde_json::json!({
            "success": true,
            "message": "AWS health check completed successfully",
            "data": result
        })),
        Err(e) => Ok(serde_json::json!({
            "success": false,
            "message": format!("Failed to perform AWS health check: {}", e),
            "data": {}
        }))
    }
}

#[tauri::command]
async fn get_aws_health_report(state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    let db_guard = state.db.lock().await;

    // Get first available account for system access
    let accounts = match database::get_accounts(&*db_guard).await {
        Ok(accounts) => accounts,
        Err(e) => {
            return Ok(serde_json::json!({
                "success": false,
                "message": format!("Failed to get accounts: {}", e),
                "data": {}
            }));
        }
    };

    if accounts.is_empty() {
        return Ok(serde_json::json!({
            "success": false,
            "message": "No AWS accounts configured",
            "data": {}
        }));
    }

    let account = &accounts[0];
    let account_id = account.id;

    // Get account credentials
    let credentials = match database::get_account_credentials(&*db_guard, account_id).await {
        Ok(creds) => creds,
        Err(e) => {
            return Ok(serde_json::json!({
                "success": false,
                "message": format!("Failed to get credentials: {}", e),
                "data": {}
            }));
        }
    };

    let access_key = credentials.access_key.as_deref().unwrap_or("");
    let secret_key = credentials.secret_key.as_deref().unwrap_or("");
    let region = account.region.as_deref().unwrap_or("us-east-1");

    if access_key.is_empty() || secret_key.is_empty() {
        return Ok(serde_json::json!({
            "success": false,
            "message": "Missing AWS credentials",
            "data": {}
        }));
    }

    // Create AWS client
    let aws_client = match AwsClient::new(access_key, secret_key, region).await {
        Ok(client) => client,
        Err(e) => {
            return Ok(serde_json::json!({
                "success": false,
                "message": format!("Failed to create AWS client: {}", e),
                "data": {}
            }));
        }
    };

    // Get AWS health report
    match aws_client.get_aws_health_report().await {
        Ok(report) => Ok(serde_json::json!({
            "success": true,
            "message": "AWS health report retrieved successfully",
            "data": report
        })),
        Err(e) => Ok(serde_json::json!({
            "success": false,
            "message": format!("Failed to get AWS health report: {}", e),
            "data": {}
        }))
    }
}

#[tauri::command]
async fn get_recent_aws_events(
    since: String,
    state: State<'_, AppState>
) -> Result<serde_json::Value, String> {
    let db_guard = state.db.lock().await;

    // Get first available account for system access
    let accounts = match database::get_accounts(&*db_guard).await {
        Ok(accounts) => accounts,
        Err(e) => {
            return Ok(serde_json::json!({
                "success": false,
                "message": format!("Failed to get accounts: {}", e),
                "data": []
            }));
        }
    };

    if accounts.is_empty() {
        return Ok(serde_json::json!({
            "success": false,
            "message": "No AWS accounts configured",
            "data": []
        }));
    }

    let account = &accounts[0];
    let account_id = account.id;

    // Get account credentials
    let credentials = match database::get_account_credentials(&*db_guard, account_id).await {
        Ok(creds) => creds,
        Err(e) => {
            return Ok(serde_json::json!({
                "success": false,
                "message": format!("Failed to get credentials: {}", e),
                "data": []
            }));
        }
    };

    let access_key = credentials.access_key.as_deref().unwrap_or("");
    let secret_key = credentials.secret_key.as_deref().unwrap_or("");
    let region = account.region.as_deref().unwrap_or("us-east-1");

    if access_key.is_empty() || secret_key.is_empty() {
        return Ok(serde_json::json!({
            "success": false,
            "message": "Missing AWS credentials",
            "data": []
        }));
    }

    // Create AWS client
    let aws_client = match AwsClient::new(access_key, secret_key, region).await {
        Ok(client) => client,
        Err(e) => {
            return Ok(serde_json::json!({
                "success": false,
                "message": format!("Failed to create AWS client: {}", e),
                "data": []
            }));
        }
    };

    // Get recent AWS events
    match aws_client.get_recent_aws_events(&since).await {
        Ok(events) => Ok(serde_json::json!({
            "success": true,
            "message": format!("Retrieved {} recent AWS events", events.len()),
            "data": events
        })),
        Err(e) => Ok(serde_json::json!({
            "success": false,
            "message": format!("Failed to get recent AWS events: {}", e),
            "data": []
        }))
    }
}

pub async fn start_backend_server() {
    // Placeholder for backend server
    println!("Backend server started");
}