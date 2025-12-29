// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use app_lib::{AppState, run};
use database::init_database_sync;
use std::sync::Arc;
use tokio::sync::Mutex;

fn main() -> Result<(), anyhow::Error> {
    // Initialize tracing
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .init();

    let args: Vec<String> = std::env::args().collect();

    if args.contains(&"--backend".to_string()) {
        // Run backend HTTP server only
        let rt = tokio::runtime::Runtime::new()?;
        rt.block_on(async {
            app_lib::start_backend_server().await;
            Ok(())
        })
    } else {
        // Run full Tauri application
        run_with_database()?;
        Ok(())
    }
}

fn run_with_database() -> Result<(), anyhow::Error> {
    // Initialize database
    let db_pool = init_database_sync(None)?;

    // Create app state
    let app_state = AppState {
        db: Arc::new(Mutex::new(db_pool)),
    };

    // Run Tauri app with state
    tauri::Builder::default()
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![
            app_lib::greet,
            app_lib::get_accounts,
            app_lib::get_account,
            app_lib::create_account,
            app_lib::update_account,
            app_lib::delete_account,
            app_lib::test_account_connection,
            app_lib::sync_account,
            app_lib::get_projects,
            app_lib::get_project,
            app_lib::create_project,
            app_lib::update_project,
            app_lib::delete_project,
            app_lib::get_instances,
            app_lib::get_instance,
            app_lib::create_instance,
            app_lib::update_instance,
            app_lib::delete_instance,
            app_lib::start_instance,
            app_lib::stop_instance,
            app_lib::restart_instance,
            app_lib::get_blueprints,
            app_lib::get_blueprint,
            app_lib::create_blueprint,
            app_lib::update_blueprint,
            app_lib::delete_blueprint,
            app_lib::deploy_blueprint,
            app_lib::get_security_configs,
            app_lib::get_security_config,
            app_lib::create_security_config,
            app_lib::update_security_config,
            app_lib::delete_security_config,
            app_lib::collect_ec2_instances,
            app_lib::create_ec2_instance,
            app_lib::delete_ec2_instance,
            app_lib::start_ec2_instance,
            app_lib::stop_ec2_instance,
            app_lib::restart_ec2_instance,
            app_lib::get_ec2_instance_details,
            app_lib::get_ec2_instance_ssh_config,
            app_lib::collect_s3_buckets,
            app_lib::create_s3_bucket,
            app_lib::delete_s3_bucket,
            app_lib::get_s3_bucket_details,
            app_lib::collect_iam_users,
            app_lib::collect_iam_roles,
            app_lib::get_iam_user_details,
            app_lib::get_cost_summary,
            app_lib::get_budget_alerts,
            app_lib::create_budget_alert,
            app_lib::update_budget_alert,
            app_lib::delete_budget_alert,
            app_lib::get_cost_status,
            app_lib::reset_cost_tracking,
            app_lib::get_cache_stats,
            app_lib::invalidate_cache,
            app_lib::invalidate_cache_region,
            app_lib::get_aws_health_status,
            app_lib::force_aws_health_check,
            app_lib::get_aws_health_report,
            app_lib::get_recent_aws_events,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");

    Ok(())
}
