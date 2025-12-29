use std::sync::Arc;
use tokio::sync::Mutex;
use app_lib::{AppState, greet, get_accounts, create_account, test_account_connection, sync_account, collect_ec2_instances};
use database::init_database_sync;
use serde_json::json;

#[cfg(test)]
mod tests {
    use super::*;

    async fn setup_test_db() -> AppState {
        let db_pool = init_database_sync(None).expect("Failed to init database");
        AppState {
            db: Arc::new(Mutex::new(db_pool)),
        }
    }

    #[tokio::test]
    async fn test_data_flow_greet() {
        let result = greet("Test User".to_string());
        assert_eq!(result, Ok("Hello, Test User!".to_string()));
        println!("✅ Greet command works: {:?}", result);
    }

    #[tokio::test]
    async fn test_data_flow_get_accounts_empty() {
        let state = setup_test_db().await;
        let result = get_accounts(tauri::State::new(state)).await;

        // Should return empty array initially
        let response: serde_json::Value = serde_json::from_str(&result.unwrap()).unwrap();
        assert!(response["data"].is_array());
        assert_eq!(response["data"].as_array().unwrap().len(), 0);
        println!("✅ Get accounts command works (empty): {:?}", response);
    }

    #[tokio::test]
    async fn test_data_flow_create_account() {
        let state = setup_test_db().await;

        // Create account data
        let account_data = json!({
            "name": "Test Account",
            "access_key": "test_access_key",
            "secret_key": "test_secret_key",
            "region": "us-east-1"
        });

        let result = create_account(account_data, tauri::State::new(state)).await;
        let response: serde_json::Value = serde_json::from_str(&result.unwrap()).unwrap();

        assert_eq!(response["success"], true);
        assert!(response["data"]["id"].is_number());
        assert_eq!(response["data"]["name"], "Test Account");
        println!("✅ Create account command works: {:?}", response);
    }

    #[tokio::test]
    async fn test_data_flow_test_connection() {
        let state = setup_test_db().await;

        // First create an account
        let account_data = json!({
            "name": "Test Account",
            "access_key": "test_access_key",
            "secret_key": "test_secret_key",
            "region": "us-east-1"
        });

        let create_result = create_account(account_data, tauri::State::new(state.clone())).await;
        let create_response: serde_json::Value = serde_json::from_str(&create_result.unwrap()).unwrap();
        let account_id = create_response["data"]["id"].as_i64().unwrap();

        // Test connection
        let result = test_account_connection(account_id, tauri::State::new(state)).await;
        let response: serde_json::Value = serde_json::from_str(&result.unwrap()).unwrap();

        assert_eq!(response["success"], true);
        assert_eq!(response["data"]["status"], "connected");
        println!("✅ Test account connection command works: {:?}", response);
    }

    #[tokio::test]
    async fn test_data_flow_collect_ec2_instances() {
        let state = setup_test_db().await;

        // First create an account
        let account_data = json!({
            "name": "Test Account",
            "access_key": "test_access_key",
            "secret_key": "test_secret_key",
            "region": "us-east-1"
        });

        let create_result = create_account(account_data, tauri::State::new(state.clone())).await;
        let create_response: serde_json::Value = serde_json::from_str(&create_result.unwrap()).unwrap();
        let account_id = create_response["data"]["id"].as_i64().unwrap();

        // Collect EC2 instances
        let options = json!({ "account_id": account_id });
        let result = collect_ec2_instances(options, tauri::State::new(state)).await;
        let response: serde_json::Value = serde_json::from_str(&result.unwrap()).unwrap();

        assert_eq!(response["success"], true);
        assert!(response["data"].is_array());
        assert_eq!(response["data"].as_array().unwrap().len(), 2); // Mock returns 2 instances
        assert_eq!(response["data"][0]["id"], "i-1234567890abcdef0");
        println!("✅ Collect EC2 instances command works: {:?}", response);
    }

    #[tokio::test]
    async fn test_data_flow_sync_account() {
        let state = setup_test_db().await;

        // First create an account
        let account_data = json!({
            "name": "Test Account",
            "access_key": "test_access_key",
            "secret_key": "test_secret_key",
            "region": "us-east-1"
        });

        let create_result = create_account(account_data, tauri::State::new(state.clone())).await;
        let create_response: serde_json::Value = serde_json::from_str(&create_result.unwrap()).unwrap();
        let account_id = create_response["data"]["id"].as_i64().unwrap();

        // Sync account
        let result = sync_account(account_id, tauri::State::new(state)).await;
        let response: serde_json::Value = serde_json::from_str(&result.unwrap()).unwrap();

        assert_eq!(response["success"], true);
        assert!(response["data"]["synced"].is_number());
        assert!(response["data"]["results"].is_array());
        println!("✅ Sync account command works: {:?}", response);
    }
}