use sqlx::{SqlitePool, query_as, query};
use crate::db::models::{Account, CreateAccountRequest};
use crate::error::Result;

pub struct AccountRepository {
    pool: SqlitePool,
}

impl AccountRepository {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    pub async fn list_all(&self) -> Result<Vec<Account>> {
        let rows = query!(
            r#"
            SELECT id, name, platform, account_id, status, region,
                   is_default, created, last_synced, role_arn, aws_profile
            FROM accounts
            ORDER BY created DESC
            "#
        )
        .fetch_all(&self.pool)
        .await?;

        let accounts = rows.into_iter().map(|row| Account {
            id: row.id,
            name: row.name,
            platform: row.platform,
            account_id: row.account_id,
            status: row.status,
            region: row.region,
            is_default: if row.is_default { 1 } else { 0 },
            created: row.created,
            last_synced: row.last_synced,
            role_arn: row.role_arn,
            aws_profile: row.aws_profile,
        }).collect();

        Ok(accounts)
    }

    pub async fn get_by_id(&self, id: i64) -> Result<Option<Account>> {
        let row = query!(
            r#"
            SELECT id, name, platform, account_id, status, region,
                   is_default, created, last_synced, role_arn, aws_profile
            FROM accounts
            WHERE id = ?
            "#,
            id
        )
        .fetch_optional(&self.pool)
        .await?;

        let account = row.map(|row| Account {
            id: row.id,
            name: row.name,
            platform: row.platform,
            account_id: row.account_id,
            status: row.status,
            region: row.region,
            is_default: if row.is_default { 1 } else { 0 },
            created: row.created,
            last_synced: row.last_synced,
            role_arn: row.role_arn,
            aws_profile: row.aws_profile,
        });

        Ok(account)
    }

    pub async fn create(&self, req: CreateAccountRequest) -> Result<Account> {
        tracing::info!("🗄️ DB create called with: name={}, platform={}, account_id={}, region={}",
            req.name, req.platform, req.account_id, req.region);

        let result = query!(
            r#"
            INSERT INTO accounts (name, platform, account_id, region, is_default, status)
            VALUES (?, ?, ?, ?, 1, 'connected')
            "#,
            req.name,
            req.platform,
            req.account_id,
            req.region
        )
        .execute(&self.pool)
        .await?;

        tracing::info!("✅ DB insert successful, rows affected: {}, last_insert_id: {}",
            result.rows_affected(), result.last_insert_rowid());

        let account = self.get_by_id(result.last_insert_rowid()).await?
            .ok_or_else(|| anyhow::anyhow!("Failed to retrieve created account"))?;

        tracing::info!("📋 Retrieved created account: {:?}", account);
        Ok(account)
    }

    pub async fn update_status(&self, id: i64, status: &str) -> Result<()> {
        query!(
            "UPDATE accounts SET status = ?, last_synced = datetime('now') WHERE id = ?",
            status,
            id
        )
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    pub async fn delete(&self, id: i64) -> Result<()> {
        query!("DELETE FROM accounts WHERE id = ?", id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }
}