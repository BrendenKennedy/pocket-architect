// ============================================================================
// DATABASE MODULE
// ============================================================================
// SQLite database setup with SQLx and migrations
// ============================================================================

use sqlx::{sqlite::SqlitePool, migrate::MigrateDatabase};
use anyhow::{Result, Context};
use tauri::AppHandle;
use keyring::{Entry, Result as KeyringResult};

// Database connection pool
pub type DbPool = SqlitePool;

// ============================================================================
// DATABASE INITIALIZATION
// ============================================================================

// Synchronous database initialization for Tauri setup
pub fn init_database_sync(app_handle: Option<&AppHandle>) -> Result<DbPool> {
    // Create runtime for async operations
    let rt = tokio::runtime::Runtime::new()?;
    rt.block_on(async {
        init_database(app_handle).await
    })
}

pub async fn init_database(_app_handle: Option<&AppHandle>) -> Result<DbPool> {
    // Use current directory for database (will be in backend/)
    let db_path = std::path::Path::new("pocket-architect.db");
    let db_url = format!("sqlite:{}", db_path.display());

    // Create database if it doesn't exist
    if !sqlx::Sqlite::database_exists(&db_url).await.unwrap_or(false) {
        println!("Creating database {}", db_url);
        sqlx::Sqlite::create_database(&db_url)
            .await
            .context("Failed to create database")?;
    } else {
        println!("Database already exists");
    }

    // Create connection pool
    let pool = SqlitePool::connect(&db_url)
        .await
        .context("Failed to connect to database")?;

    // Run migrations
    run_migrations(&pool).await?;

    println!("Database initialized successfully");
    Ok(pool)
}

// ============================================================================
// MIGRATIONS
// ============================================================================

async fn run_migrations(pool: &DbPool) -> Result<()> {
    // Create migrations table if it doesn't exist
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS _sqlx_migrations (
            version INTEGER PRIMARY KEY,
            description TEXT NOT NULL,
            installed_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
            success BOOLEAN NOT NULL,
            checksum BLOB NOT NULL,
            execution_time INTEGER NOT NULL
        );
        "#,
    )
    .execute(pool)
    .await
    .context("Failed to create migrations table")?;

    // Run project migrations
    run_project_migrations(pool).await?;

    Ok(())
}

async fn run_project_migrations(pool: &DbPool) -> Result<()> {
    // Projects table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            region TEXT NOT NULL,
            platform TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        "#,
    )
    .execute(pool)
    .await
    .context("Failed to create projects table")?;

    // Create indexes
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_projects_platform ON projects(platform);",
    )
    .execute(pool)
    .await
    .context("Failed to create projects platform index")?;

    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);",
    )
    .execute(pool)
    .await
    .context("Failed to create projects status index")?;

    // Accounts table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS accounts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            platform TEXT NOT NULL,
            region TEXT,
            project_id TEXT,
            subscription_id TEXT,
            tenant_id TEXT,
            client_id TEXT,
            status TEXT NOT NULL DEFAULT 'active',
            encrypted BOOLEAN NOT NULL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        "#,
    )
    .execute(pool)
    .await
    .context("Failed to create accounts table")?;

    // Create indexes for accounts
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_accounts_platform ON accounts(platform);",
    )
    .execute(pool)
    .await
    .context("Failed to create accounts platform index")?;

    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_accounts_status ON accounts(status);",
    )
    .execute(pool)
    .await
    .context("Failed to create accounts status index")?;

    // Instances table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS instances (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            project_id INTEGER NOT NULL,
            instance_type TEXT NOT NULL,
            platform TEXT NOT NULL,
            region TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            public_ip TEXT,
            private_ip TEXT,
            storage_gb INTEGER NOT NULL,
            security_config TEXT,
            ssh_key TEXT,
            tags TEXT, -- JSON array of tag objects
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
        );
        "#,
    )
    .execute(pool)
    .await
    .context("Failed to create instances table")?;

    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_instances_project_id ON instances(project_id);",
    )
    .execute(pool)
    .await
    .context("Failed to create instances project_id index")?;

    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_instances_status ON instances(status);",
    )
    .execute(pool)
    .await
    .context("Failed to create instances status index")?;

    // Blueprints table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS blueprints (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            instance_type TEXT NOT NULL,
            platform TEXT NOT NULL,
            region TEXT NOT NULL,
            storage_gb INTEGER NOT NULL,
            security_config TEXT,
            tags TEXT, -- JSON array of tag objects
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        "#,
    )
    .execute(pool)
    .await
    .context("Failed to create blueprints table")?;

    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_blueprints_platform ON blueprints(platform);",
    )
    .execute(pool)
    .await
    .context("Failed to create blueprints platform index")?;

    // Security configs table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS security_configs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            platform TEXT NOT NULL,
            rules TEXT NOT NULL, -- JSON array of security rules
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        "#,
    )
    .execute(pool)
    .await
    .context("Failed to create security_configs table")?;

    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_security_configs_platform ON security_configs(platform);",
    )
    .execute(pool)
    .await
    .context("Failed to create security_configs platform index")?;

    // Images table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS images (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            platform TEXT NOT NULL,
            region TEXT NOT NULL,
            source_instance_id INTEGER,
            image_id TEXT NOT NULL, -- AWS AMI ID or similar
            status TEXT NOT NULL DEFAULT 'available',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (source_instance_id) REFERENCES instances(id) ON DELETE SET NULL
        );
        "#,
    )
    .execute(pool)
    .await
    .context("Failed to create images table")?;

    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_images_platform ON images(platform);",
    )
    .execute(pool)
    .await
    .context("Failed to create images platform index")?;

    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_images_status ON images(status);",
    )
    .execute(pool)
    .await
    .context("Failed to create images status index")?;

    println!("All migrations completed");
    Ok(())
}

// ============================================================================
// PROJECT MODEL
// ============================================================================

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, sqlx::FromRow)]
pub struct Project {
    pub id: i64,
    pub name: String,
    pub description: Option<String>,
    pub region: String,
    pub platform: String,
    pub status: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct CreateProjectRequest {
    pub name: String,
    pub description: Option<String>,
    pub region: String,
    pub platform: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct UpdateProjectRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub region: Option<String>,
    pub platform: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, Default)]
pub struct ProjectListOptions {
    pub platform: Option<String>,
    pub status: Option<String>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

// ============================================================================
// ACCOUNT MODEL
// ============================================================================

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, sqlx::FromRow)]
pub struct Account {
    pub id: i64,
    pub name: String,
    pub platform: String,
    // Sensitive credentials are stored in OS keyring, not in database
    pub region: Option<String>,
    pub project_id: Option<String>,
    pub subscription_id: Option<String>,
    pub tenant_id: Option<String>,
    pub client_id: Option<String>,
    pub status: String,
    pub created_at: String,
    pub updated_at: String,
    // Encryption flag
    pub encrypted: bool,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct CreateAccountRequest {
    pub name: String,
    pub access_key: Option<String>,
    pub secret_key: Option<String>,
    pub region: Option<String>,
    pub client_id: Option<String>,
    pub client_secret: Option<String>,
    pub encrypted: bool,
    pub platform: Option<String>,
    pub project_id: Option<i64>,
    pub subscription_id: Option<String>,
    pub tenant_id: Option<String>,
    pub service_account_key: Option<String>,
}

pub struct UpdateAccountRequest {
    pub name: Option<String>,
    pub access_key: Option<String>,
    pub secret_key: Option<String>,
    pub region: Option<String>,
    pub last_sync: Option<String>,
}

// ============================================================================
// KEYRING UTILITIES
// ============================================================================

fn get_keyring_service_name() -> &'static str {
    "pocket-architect"
}

fn store_credential(account_id: i64, key: &str, value: &str) -> KeyringResult<()> {
    let service = get_keyring_service_name();
    let username = format!("account-{}-{}", account_id, key);
    let entry = Entry::new(service, &username)?;
    entry.set_password(value)?;
    Ok(())
}

fn retrieve_credential(account_id: i64, key: &str) -> KeyringResult<String> {
    let service = get_keyring_service_name();
    let username = format!("account-{}-{}", account_id, key);
    let entry = Entry::new(service, &username)?;
    entry.get_password()
}

fn delete_credential(account_id: i64, key: &str) -> KeyringResult<()> {
    let service = get_keyring_service_name();
    let username = format!("account-{}-{}", account_id, key);
    let entry = Entry::new(service, &username)?;
    entry.delete_password()?;
    Ok(())
}

// ============================================================================
// PROJECT DATABASE OPERATIONS
// ============================================================================

pub async fn get_projects(
    pool: &DbPool,
    options: ProjectListOptions,
) -> Result<Vec<Project>> {
    let mut query = "SELECT * FROM projects WHERE 1=1".to_string();
    let mut params = Vec::new();
    let mut param_count = 0;

    // Add filters
    if let Some(platform) = options.platform {
        param_count += 1;
        query.push_str(&format!(" AND platform = ?{}", param_count));
        params.push(platform);
    }

    if let Some(status) = options.status {
        param_count += 1;
        query.push_str(&format!(" AND status = ?{}", param_count));
        params.push(status);
    }

    // Add ordering and pagination
    query.push_str(" ORDER BY created_at DESC");

    if let Some(limit) = options.limit {
        param_count += 1;
        query.push_str(&format!(" LIMIT ?{}", param_count));
        params.push(limit.to_string());
    }

    if let Some(offset) = options.offset {
        param_count += 1;
        query.push_str(&format!(" OFFSET ?{}", param_count));
        params.push(offset.to_string());
    }

    // Execute query
    let mut query_builder = sqlx::query_as::<_, Project>(&query);

    for param in params {
        query_builder = query_builder.bind(param);
    }

    let projects = query_builder
        .fetch_all(pool)
        .await
        .context("Failed to fetch projects")?;

    Ok(projects)
}

pub async fn get_project(pool: &DbPool, id: i64) -> Result<Option<Project>> {
    let project = sqlx::query_as::<_, Project>(
        "SELECT * FROM projects WHERE id = ?",
    )
    .bind(id)
    .fetch_optional(pool)
    .await
    .context("Failed to fetch project")?;

    Ok(project)
}

pub async fn create_project(
    pool: &DbPool,
    request: CreateProjectRequest,
) -> Result<Project> {
    let result = sqlx::query(
        r#"
        INSERT INTO projects (name, description, region, platform, status)
        VALUES (?, ?, ?, ?, 'active')
        "#,
    )
    .bind(&request.name)
    .bind(&request.description)
    .bind(&request.region)
    .bind(&request.platform)
    .execute(pool)
    .await
    .context("Failed to create project")?;

    let id = result.last_insert_rowid();

    // Fetch the created project
    get_project(pool, id)
        .await?
        .ok_or_else(|| anyhow::anyhow!("Failed to retrieve created project"))
}

pub async fn update_project(
    pool: &DbPool,
    id: i64,
    request: UpdateProjectRequest,
) -> Result<Option<Project>> {
    // Build dynamic update query
    let mut query = "UPDATE projects SET updated_at = CURRENT_TIMESTAMP".to_string();
    let mut params = Vec::new();
    let mut param_count = 0;

    if let Some(name) = request.name {
        param_count += 1;
        query.push_str(&format!(", name = ?{}", param_count));
        params.push(name);
    }

    if let Some(description) = request.description {
        param_count += 1;
        query.push_str(&format!(", description = ?{}", param_count));
        params.push(description);
    }

    if let Some(region) = request.region {
        param_count += 1;
        query.push_str(&format!(", region = ?{}", param_count));
        params.push(region);
    }

    if let Some(platform) = request.platform {
        param_count += 1;
        query.push_str(&format!(", platform = ?{}", param_count));
        params.push(platform);
    }

    if let Some(status) = request.status {
        param_count += 1;
        query.push_str(&format!(", status = ?{}", param_count));
        params.push(status);
    }

    query.push_str(&format!(" WHERE id = ?{}", param_count + 1));
    params.push(id.to_string());

    // Execute update
    let result = sqlx::query(&query);
    let mut query_builder = result;

    for param in params {
        query_builder = query_builder.bind(param);
    }

    query_builder
        .execute(pool)
        .await
        .context("Failed to update project")?;

    // Fetch updated project
    get_project(pool, id).await
}

pub async fn delete_project(pool: &DbPool, id: i64) -> Result<bool> {
    let result = sqlx::query("DELETE FROM projects WHERE id = ?")
        .bind(id)
        .execute(pool)
        .await
        .context("Failed to delete project")?;

    Ok(result.rows_affected() > 0)
}

// ============================================================================
// ACCOUNT FUNCTIONS
// ============================================================================

pub async fn get_accounts(pool: &DbPool) -> Result<Vec<Account>> {
    let accounts = sqlx::query_as::<_, Account>(
        "SELECT * FROM accounts ORDER BY created_at DESC"
    )
    .fetch_all(pool)
    .await
    .context("Failed to fetch accounts")?;

    Ok(accounts)
}

pub async fn get_account(pool: &DbPool, id: i64) -> Result<Option<Account>> {
    let account = sqlx::query_as::<_, Account>(
        "SELECT * FROM accounts WHERE id = ?"
    )
    .bind(id)
    .fetch_optional(pool)
    .await
    .context("Failed to fetch account")?;

    Ok(account)
}

pub async fn create_account(pool: &DbPool, request: CreateAccountRequest) -> Result<Account> {
    let result = sqlx::query(
        r#"
        INSERT INTO accounts (
            name, platform, region, project_id, subscription_id,
            tenant_id, client_id, encrypted
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        "#,
    )
    .bind(&request.name)
    .bind(&request.platform)
    .bind(&request.region)
    .bind(&request.project_id)
    .bind(&request.subscription_id)
    .bind(&request.tenant_id)
    .bind(&request.client_id)
    .bind(request.encrypted)
    .execute(pool)
    .await
    .context("Failed to create account")?;

    let account_id = result.last_insert_rowid();

    // Store sensitive credentials in keyring if encryption is enabled
    if request.encrypted {
        if let Some(access_key) = &request.access_key {
            store_credential(account_id, "access_key", access_key)
                .context("Failed to store access key in keyring")?;
        }
        if let Some(secret_key) = &request.secret_key {
            store_credential(account_id, "secret_key", secret_key)
                .context("Failed to store secret key in keyring")?;
        }
        if let Some(service_account_key) = &request.service_account_key {
            store_credential(account_id, "service_account_key", service_account_key)
                .context("Failed to store service account key in keyring")?;
        }
        if let Some(client_secret) = &request.client_secret {
            store_credential(account_id, "client_secret", client_secret)
                .context("Failed to store client secret in keyring")?;
        }
    }

    // Fetch the created account
    get_account(pool, account_id)
        .await?
        .ok_or_else(|| anyhow::anyhow!("Failed to retrieve created account"))
}

pub async fn update_account(pool: &DbPool, id: i64, request: CreateAccountRequest) -> Result<Option<Account>> {
    let result = sqlx::query(
        r#"
        UPDATE accounts SET
            name = ?, platform = ?, access_key = ?, secret_key = ?, region = ?,
            project_id = ?, service_account_key = ?, subscription_id = ?,
            tenant_id = ?, client_id = ?, client_secret = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        "#,
    )
    .bind(&request.name)
    .bind(&request.platform)
    .bind(&request.access_key)
    .bind(&request.secret_key)
    .bind(&request.region)
    .bind(&request.project_id)
    .bind(&request.service_account_key)
    .bind(&request.subscription_id)
    .bind(&request.tenant_id)
    .bind(&request.client_id)
    .bind(&request.client_secret)
    .bind(id)
    .execute(pool)
    .await
    .context("Failed to update account")?;

    if result.rows_affected() > 0 {
        get_account(pool, id).await
    } else {
        Ok(None)
    }
}

pub async fn update_account_fields(pool: &DbPool, id: i64, request: UpdateAccountRequest) -> Result<Option<Account>> {
    // Only update last_sync for now - keep it simple
    if let Some(last_sync) = &request.last_sync {
        let result = sqlx::query("UPDATE accounts SET last_sync = ? WHERE id = ?")
            .bind(last_sync)
            .bind(id)
            .execute(pool)
            .await
            .context("Failed to update account last sync")?;

        if result.rows_affected() > 0 {
            return get_account(pool, id).await;
        }
    }

    Ok(None)
}

pub async fn delete_account(pool: &DbPool, id: i64) -> Result<bool> {
    // First, delete credentials from keyring if they exist
    let _ = delete_credential(id, "access_key"); // Ignore errors if credential doesn't exist
    let _ = delete_credential(id, "secret_key");
    let _ = delete_credential(id, "service_account_key");
    let _ = delete_credential(id, "client_secret");

    let result = sqlx::query("DELETE FROM accounts WHERE id = ?")
        .bind(id)
        .execute(pool)
        .await
        .context("Failed to delete account")?;

    Ok(result.rows_affected() > 0)
}

// ============================================================================
// CREDENTIAL RETRIEVAL FUNCTIONS
// ============================================================================

pub async fn get_account_credentials(pool: &DbPool, account_id: i64) -> Result<AccountCredentials> {
    let account = get_account(pool, account_id)
        .await?
        .ok_or_else(|| anyhow::anyhow!("Account not found"))?;

    let mut credentials = AccountCredentials {
        access_key: None,
        secret_key: None,
        service_account_key: None,
        client_secret: None,
    };

    if account.encrypted {
        // Retrieve from keyring
        if let Ok(access_key) = retrieve_credential(account_id, "access_key") {
            credentials.access_key = Some(access_key);
        }
        if let Ok(secret_key) = retrieve_credential(account_id, "secret_key") {
            credentials.secret_key = Some(secret_key);
        }
        if let Ok(service_account_key) = retrieve_credential(account_id, "service_account_key") {
            credentials.service_account_key = Some(service_account_key);
        }
        if let Ok(client_secret) = retrieve_credential(account_id, "client_secret") {
            credentials.client_secret = Some(client_secret);
        }
    }

    Ok(credentials)
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct AccountCredentials {
    pub access_key: Option<String>,
    pub secret_key: Option<String>,
    pub service_account_key: Option<String>,
    pub client_secret: Option<String>,
}

// ============================================================================
// INSTANCE MODEL
// ============================================================================

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, sqlx::FromRow)]
pub struct Instance {
    pub id: i64,
    pub name: String,
    pub project_id: i64,
    pub instance_type: String,
    pub platform: String,
    pub region: String,
    pub status: String,
    pub public_ip: Option<String>,
    pub private_ip: Option<String>,
    pub storage_gb: i64,
    pub security_config: Option<String>,
    pub ssh_key: Option<String>,
    pub tags: Option<String>, // JSON
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct CreateInstanceRequest {
    pub name: String,
    pub project_id: i64,
    pub instance_type: String,
    pub platform: String,
    pub region: String,
    pub storage_gb: i64,
    pub security_config: Option<String>,
    pub ssh_key: Option<String>,
    pub tags: Option<Vec<String>>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct UpdateInstanceRequest {
    pub name: Option<String>,
    pub instance_type: Option<String>,
    pub storage_gb: Option<i64>,
    pub security_config: Option<String>,
    pub ssh_key: Option<String>,
    pub tags: Option<Vec<String>>,
}

// ============================================================================
// BLUEPRINT MODEL
// ============================================================================

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, sqlx::FromRow)]
pub struct Blueprint {
    pub id: i64,
    pub name: String,
    pub description: Option<String>,
    pub instance_type: String,
    pub platform: String,
    pub region: String,
    pub storage_gb: i64,
    pub security_config: Option<String>,
    pub tags: Option<String>, // JSON
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct CreateBlueprintRequest {
    pub name: String,
    pub description: Option<String>,
    pub instance_type: String,
    pub platform: String,
    pub region: String,
    pub storage_gb: i64,
    pub security_config: Option<String>,
    pub tags: Option<Vec<String>>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct UpdateBlueprintRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub instance_type: Option<String>,
    pub storage_gb: Option<i64>,
    pub security_config: Option<String>,
    pub tags: Option<Vec<String>>,
}

// ============================================================================
// SECURITY CONFIG MODEL
// ============================================================================

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, sqlx::FromRow)]
pub struct SecurityConfig {
    pub id: i64,
    pub name: String,
    pub description: Option<String>,
    pub platform: String,
    pub rules: String, // JSON
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct CreateSecurityConfigRequest {
    pub name: String,
    pub description: Option<String>,
    pub platform: String,
    pub rules: Vec<SecurityRule>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct SecurityRule {
    pub rule_type: String,
    pub port: Option<i32>,
    pub protocol: Option<String>,
    pub source: String,
    pub description: Option<String>,
}

// ============================================================================
// IMAGE MODEL
// ============================================================================

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, sqlx::FromRow)]
pub struct Image {
    pub id: i64,
    pub name: String,
    pub description: Option<String>,
    pub platform: String,
    pub region: String,
    pub source_instance_id: Option<i64>,
    pub image_id: String,
    pub status: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct CreateImageRequest {
    pub name: String,
    pub description: Option<String>,
    pub platform: String,
    pub region: String,
    pub source_instance_id: Option<i64>,
}

// ============================================================================
// INSTANCE FUNCTIONS
// ============================================================================

pub async fn get_instances(pool: &DbPool) -> Result<Vec<Instance>> {
    sqlx::query_as::<_, Instance>("SELECT * FROM instances ORDER BY created_at DESC")
        .fetch_all(pool)
        .await
        .context("Failed to fetch instances")
}

pub async fn get_instance(pool: &DbPool, id: i64) -> Result<Option<Instance>> {
    sqlx::query_as::<_, Instance>("SELECT * FROM instances WHERE id = ?")
        .bind(id)
        .fetch_optional(pool)
        .await
        .context("Failed to fetch instance")
}

pub async fn get_instance_by_aws_id(pool: &DbPool, aws_instance_id: &str) -> Result<Option<Instance>> {
    sqlx::query_as::<_, Instance>("SELECT * FROM instances WHERE aws_instance_id = ?")
        .bind(aws_instance_id)
        .fetch_optional(pool)
        .await
        .context("Failed to fetch instance by AWS ID")
}

pub async fn create_instance(pool: &DbPool, request: CreateInstanceRequest) -> Result<Instance> {
    let tags_json = request.tags.as_ref().map(|tags| serde_json::to_string(tags).unwrap_or_default());

    let result = sqlx::query(
        r#"
        INSERT INTO instances (
            name, project_id, instance_type, platform, region, status,
            storage_gb, security_config, ssh_key, tags
        )
        VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)
        "#,
    )
    .bind(&request.name)
    .bind(request.project_id)
    .bind(&request.instance_type)
    .bind(&request.platform)
    .bind(&request.region)
    .bind(request.storage_gb)
    .bind(&request.security_config)
    .bind(&request.ssh_key)
    .bind(&tags_json)
    .execute(pool)
    .await
    .context("Failed to create instance")?;

    let instance_id = result.last_insert_rowid();

    get_instance(pool, instance_id)
        .await?
        .ok_or_else(|| anyhow::anyhow!("Failed to retrieve created instance"))
}

pub async fn update_instance(pool: &DbPool, id: i64, request: UpdateInstanceRequest) -> Result<Option<Instance>> {
    let tags_json = request.tags.as_ref().map(|tags| serde_json::to_string(tags).unwrap_or_default());

    let result = sqlx::query(
        r#"
        UPDATE instances SET
            name = COALESCE(?, name),
            instance_type = COALESCE(?, instance_type),
            storage_gb = COALESCE(?, storage_gb),
            security_config = COALESCE(?, security_config),
            ssh_key = COALESCE(?, ssh_key),
            tags = COALESCE(?, tags),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        "#,
    )
    .bind(&request.name)
    .bind(&request.instance_type)
    .bind(request.storage_gb)
    .bind(&request.security_config)
    .bind(&request.ssh_key)
    .bind(&tags_json)
    .bind(id)
    .execute(pool)
    .await
    .context("Failed to update instance")?;

    if result.rows_affected() > 0 {
        get_instance(pool, id).await
    } else {
        Ok(None)
    }
}

pub async fn delete_instance(pool: &DbPool, id: i64) -> Result<bool> {
    let result = sqlx::query("DELETE FROM instances WHERE id = ?")
        .bind(id)
        .execute(pool)
        .await
        .context("Failed to delete instance")?;

    Ok(result.rows_affected() > 0)
}

pub async fn start_instance(pool: &DbPool, id: i64) -> Result<Option<Instance>> {
    let result = sqlx::query(
        "UPDATE instances SET status = 'starting', updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    )
    .bind(id)
    .execute(pool)
    .await
    .context("Failed to start instance")?;

    if result.rows_affected() > 0 {
        get_instance(pool, id).await
    } else {
        Ok(None)
    }
}

pub async fn stop_instance(pool: &DbPool, id: i64) -> Result<Option<Instance>> {
    let result = sqlx::query(
        "UPDATE instances SET status = 'stopping', updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    )
    .bind(id)
    .execute(pool)
    .await
    .context("Failed to stop instance")?;

    if result.rows_affected() > 0 {
        get_instance(pool, id).await
    } else {
        Ok(None)
    }
}

pub async fn restart_instance(pool: &DbPool, id: i64) -> Result<Option<Instance>> {
    let result = sqlx::query(
        "UPDATE instances SET status = 'restarting', updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    )
    .bind(id)
    .execute(pool)
    .await
    .context("Failed to restart instance")?;

    if result.rows_affected() > 0 {
        get_instance(pool, id).await
    } else {
        Ok(None)
    }
}

// ============================================================================
// BLUEPRINT FUNCTIONS
// ============================================================================

pub async fn get_blueprints(pool: &DbPool) -> Result<Vec<Blueprint>> {
    sqlx::query_as::<_, Blueprint>("SELECT * FROM blueprints ORDER BY created_at DESC")
        .fetch_all(pool)
        .await
        .context("Failed to fetch blueprints")
}

pub async fn get_blueprint(pool: &DbPool, id: i64) -> Result<Option<Blueprint>> {
    sqlx::query_as::<_, Blueprint>("SELECT * FROM blueprints WHERE id = ?")
        .bind(id)
        .fetch_optional(pool)
        .await
        .context("Failed to fetch blueprint")
}

pub async fn create_blueprint(pool: &DbPool, request: CreateBlueprintRequest) -> Result<Blueprint> {
    let tags_json = request.tags.as_ref().map(|tags| serde_json::to_string(tags).unwrap_or_default());

    let result = sqlx::query(
        r#"
        INSERT INTO blueprints (
            name, description, instance_type, platform, region,
            storage_gb, security_config, tags
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        "#,
    )
    .bind(&request.name)
    .bind(&request.description)
    .bind(&request.instance_type)
    .bind(&request.platform)
    .bind(&request.region)
    .bind(request.storage_gb)
    .bind(&request.security_config)
    .bind(&tags_json)
    .execute(pool)
    .await
    .context("Failed to create blueprint")?;

    let blueprint_id = result.last_insert_rowid();

    get_blueprint(pool, blueprint_id)
        .await?
        .ok_or_else(|| anyhow::anyhow!("Failed to retrieve created blueprint"))
}

pub async fn update_blueprint(pool: &DbPool, id: i64, request: UpdateBlueprintRequest) -> Result<Option<Blueprint>> {
    let tags_json = request.tags.as_ref().map(|tags| serde_json::to_string(tags).unwrap_or_default());

    let result = sqlx::query(
        r#"
        UPDATE blueprints SET
            name = COALESCE(?, name),
            description = COALESCE(?, description),
            instance_type = COALESCE(?, instance_type),
            storage_gb = COALESCE(?, storage_gb),
            security_config = COALESCE(?, security_config),
            tags = COALESCE(?, tags),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        "#,
    )
    .bind(&request.name)
    .bind(&request.description)
    .bind(&request.instance_type)
    .bind(request.storage_gb)
    .bind(&request.security_config)
    .bind(&tags_json)
    .bind(id)
    .execute(pool)
    .await
    .context("Failed to update blueprint")?;

    if result.rows_affected() > 0 {
        get_blueprint(pool, id).await
    } else {
        Ok(None)
    }
}

pub async fn delete_blueprint(pool: &DbPool, id: i64) -> Result<bool> {
    let result = sqlx::query("DELETE FROM blueprints WHERE id = ?")
        .bind(id)
        .execute(pool)
        .await
        .context("Failed to delete blueprint")?;

    Ok(result.rows_affected() > 0)
}

pub async fn deploy_blueprint(pool: &DbPool, blueprint_id: i64, project_id: i64, instance_name: String) -> Result<Instance> {
    let blueprint = get_blueprint(pool, blueprint_id)
        .await?
        .ok_or_else(|| anyhow::anyhow!("Blueprint not found"))?;

    let create_request = CreateInstanceRequest {
        name: instance_name,
        project_id,
        instance_type: blueprint.instance_type.clone(),
        platform: blueprint.platform.clone(),
        region: blueprint.region.clone(),
        storage_gb: blueprint.storage_gb,
        security_config: blueprint.security_config.clone(),
        ssh_key: None, // Could be derived from project or user preferences
        tags: blueprint.tags.as_ref().and_then(|t| serde_json::from_str(t).ok()),
    };

    create_instance(pool, create_request).await
}

// ============================================================================
// SECURITY CONFIG FUNCTIONS
// ============================================================================

pub async fn get_security_configs(pool: &DbPool) -> Result<Vec<SecurityConfig>> {
    sqlx::query_as::<_, SecurityConfig>("SELECT * FROM security_configs ORDER BY created_at DESC")
        .fetch_all(pool)
        .await
        .context("Failed to fetch security configs")
}

pub async fn get_security_config(pool: &DbPool, id: i64) -> Result<Option<SecurityConfig>> {
    sqlx::query_as::<_, SecurityConfig>("SELECT * FROM security_configs WHERE id = ?")
        .bind(id)
        .fetch_optional(pool)
        .await
        .context("Failed to fetch security config")
}

pub async fn create_security_config(pool: &DbPool, request: CreateSecurityConfigRequest) -> Result<SecurityConfig> {
    let rules_json = serde_json::to_string(&request.rules)
        .context("Failed to serialize security rules")?;

    let result = sqlx::query(
        r#"
        INSERT INTO security_configs (name, description, platform, rules)
        VALUES (?, ?, ?, ?)
        "#,
    )
    .bind(&request.name)
    .bind(&request.description)
    .bind(&request.platform)
    .bind(&rules_json)
    .execute(pool)
    .await
    .context("Failed to create security config")?;

    let config_id = result.last_insert_rowid();

    get_security_config(pool, config_id)
        .await?
        .ok_or_else(|| anyhow::anyhow!("Failed to retrieve created security config"))
}

pub async fn update_security_config(pool: &DbPool, id: i64, request: CreateSecurityConfigRequest) -> Result<Option<SecurityConfig>> {
    let rules_json = serde_json::to_string(&request.rules)
        .context("Failed to serialize security rules")?;

    let result = sqlx::query(
        r#"
        UPDATE security_configs SET
            name = ?,
            description = ?,
            rules = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        "#,
    )
    .bind(&request.name)
    .bind(&request.description)
    .bind(&rules_json)
    .bind(id)
    .execute(pool)
    .await
    .context("Failed to update security config")?;

    if result.rows_affected() > 0 {
        get_security_config(pool, id).await
    } else {
        Ok(None)
    }
}

pub async fn delete_security_config(pool: &DbPool, id: i64) -> Result<bool> {
    let result = sqlx::query("DELETE FROM security_configs WHERE id = ?")
        .bind(id)
        .execute(pool)
        .await
        .context("Failed to delete security config")?;

    Ok(result.rows_affected() > 0)
}

// ============================================================================
// IMAGE FUNCTIONS
// ============================================================================

pub async fn get_images(pool: &DbPool) -> Result<Vec<Image>> {
    sqlx::query_as::<_, Image>("SELECT * FROM images ORDER BY created_at DESC")
        .fetch_all(pool)
        .await
        .context("Failed to fetch images")
}

pub async fn get_image(pool: &DbPool, id: i64) -> Result<Option<Image>> {
    sqlx::query_as::<_, Image>("SELECT * FROM images WHERE id = ?")
        .bind(id)
        .fetch_optional(pool)
        .await
        .context("Failed to fetch image")
}

pub async fn create_image(pool: &DbPool, request: CreateImageRequest) -> Result<Image> {
    let result = sqlx::query(
        r#"
        INSERT INTO images (name, description, platform, region, source_instance_id, image_id, status)
        VALUES (?, ?, ?, ?, ?, ?, 'pending')
        "#,
    )
    .bind(&request.name)
    .bind(&request.description)
    .bind(&request.platform)
    .bind(&request.region)
    .bind(request.source_instance_id)
    .bind(format!("ami-{}", chrono::Utc::now().timestamp())) // Generate a placeholder AMI ID
    .execute(pool)
    .await
    .context("Failed to create image")?;

    let image_id = result.last_insert_rowid();

    get_image(pool, image_id)
        .await?
        .ok_or_else(|| anyhow::anyhow!("Failed to retrieve created image"))
}

pub async fn delete_image(pool: &DbPool, id: i64) -> Result<bool> {
    let result = sqlx::query("DELETE FROM images WHERE id = ?")
        .bind(id)
        .execute(pool)
        .await
        .context("Failed to delete image")?;

    Ok(result.rows_affected() > 0)
}

pub async fn create_image_from_instance(pool: &DbPool, instance_id: i64, name: String, description: Option<String>) -> Result<Image> {
    let instance = get_instance(pool, instance_id)
        .await?
        .ok_or_else(|| anyhow::anyhow!("Instance not found"))?;

    let request = CreateImageRequest {
        name,
        description,
        platform: instance.platform.clone(),
        region: instance.region.clone(),
        source_instance_id: Some(instance_id),
    };

    create_image(pool, request).await
}