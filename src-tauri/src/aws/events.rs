// ============================================================================
// AWS EVENT SYSTEM
// ============================================================================
// Real-time event-driven updates with optimistic UI updates
// ============================================================================

use crate::aws::types::*;
use chrono::{DateTime, Utc};
use serde::{Serialize, Deserialize};
use std::collections::VecDeque;
use std::sync::Arc;
use tauri::Emitter;
use tokio::sync::Mutex;

// ============================================================================
// EVENT TYPES & PAYLOADS
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AwsEventPayload {
    pub event_type: String,
    pub timestamp: DateTime<Utc>,
    pub data: serde_json::Value,
    pub request_id: Option<String>,
}

#[derive(Debug, Clone)]
pub enum AwsEventType {
    InstanceCreated,
    InstanceUpdated,
    InstanceDeleted,
    InstancesCollected,
    InstanceStarted,
    InstanceStopped,
    InstanceRestarted,
    OperationFailed,
    CostAlert,
    CostUpdated,
    HealthChanged,
    CacheRefreshed,
}

// ============================================================================
// EVENT STORE FOR PERSISTENCE
// ============================================================================

pub struct EventStore {
    max_events: usize,
    events: Arc<Mutex<VecDeque<AwsEventPayload>>>,
}

impl EventStore {
    pub fn new(max_events: usize) -> Self {
        Self {
            max_events,
            events: Arc::new(Mutex::new(VecDeque::new())),
        }
    }

    pub async fn store_event(&self, event: AwsEventPayload) {
        let mut events = self.events.lock().await;
        events.push_back(event);

        // Keep only recent events
        while events.len() > self.max_events {
            events.pop_front();
        }
    }

    pub async fn get_recent_events(&self, since: Option<DateTime<Utc>>) -> Vec<AwsEventPayload> {
        let events = self.events.lock().await;
        if let Some(since_time) = since {
            events.iter()
                .filter(|e| e.timestamp > since_time)
                .cloned()
                .collect()
        } else {
            events.iter().cloned().collect()
        }
    }

    pub async fn get_event_count(&self) -> usize {
        let events = self.events.lock().await;
        events.len()
    }
}

// ============================================================================
// EVENT EMITTER WITH FULL PAYLOADS
// ============================================================================

#[derive(Clone)]
pub struct AwsEventEmitter {
    app_handle: tauri::AppHandle,
    event_store: Arc<EventStore>,
}

impl AwsEventEmitter {
    pub fn new(app_handle: tauri::AppHandle, event_store: Arc<EventStore>) -> Self {
        Self { app_handle, event_store }
    }

    // Instance events with full data payloads
    pub async fn emit_instance_created(&self, instance: crate::aws::adapters::Instance) {
        let payload = AwsEventPayload {
            event_type: "instance_created".to_string(),
            timestamp: Utc::now(),
            data: serde_json::to_value(instance).unwrap(),
            request_id: None,
        };
        self.emit_and_store(payload).await;
    }

    pub async fn emit_instance_updated(&self, instance: crate::aws::adapters::Instance) {
        let payload = AwsEventPayload {
            event_type: "instance_updated".to_string(),
            timestamp: Utc::now(),
            data: serde_json::to_value(instance).unwrap(),
            request_id: None,
        };
        self.emit_and_store(payload).await;
    }

    pub async fn emit_instance_deleted(&self, instance_id: String) {
        let payload = AwsEventPayload {
            event_type: "instance_deleted".to_string(),
            timestamp: Utc::now(),
            data: serde_json::json!({ "instance_id": instance_id }),
            request_id: None,
        };
        self.emit_and_store(payload).await;
    }

    pub async fn emit_instances_updated(&self, instances: Vec<crate::aws::adapters::Instance>) {
        let payload = AwsEventPayload {
            event_type: "instances_updated".to_string(),
            timestamp: Utc::now(),
            data: serde_json::to_value(instances).unwrap(),
            request_id: None,
        };
        self.emit_and_store(payload).await;
    }

    pub async fn emit_instance_status_change(&self, instance_id: &str, new_status: &str) {
        let payload = AwsEventPayload {
            event_type: "instance_status_changed".to_string(),
            timestamp: Utc::now(),
            data: serde_json::json!({
                "instance_id": instance_id,
                "status": new_status
            }),
            request_id: None,
        };
        self.emit_and_store(payload).await;
    }

    // Cost events with full data
    pub async fn emit_cost_alert(&self, alert: crate::aws::CostAlert) {
        let payload = AwsEventPayload {
            event_type: "cost_alert".to_string(),
            timestamp: Utc::now(),
            data: serde_json::to_value(alert).unwrap(),
            request_id: None,
        };
        self.emit_and_store(payload).await;
    }

    pub async fn emit_cost_updated(&self, cost_summary: crate::aws::adapters::CostSummary) {
        let payload = AwsEventPayload {
            event_type: "cost_updated".to_string(),
            timestamp: Utc::now(),
            data: serde_json::to_value(cost_summary).unwrap(),
            request_id: None,
        };
        self.emit_and_store(payload).await;
    }

    // Error events
    pub async fn emit_operation_failed(&self, operation: &str, error: &str, context: serde_json::Value) {
        let payload = AwsEventPayload {
            event_type: "operation_failed".to_string(),
            timestamp: Utc::now(),
            data: serde_json::json!({
                "operation": operation,
                "error": error,
                "context": context
            }),
            request_id: None,
        };
        self.emit_and_store(payload).await;
    }

    // Health events
    pub async fn emit_health_changed(&self, status: crate::aws::health::AwsHealthStatus) {
        let payload = AwsEventPayload {
            event_type: "health_changed".to_string(),
            timestamp: Utc::now(),
            data: serde_json::to_value(status).unwrap(),
            request_id: None,
        };
        self.emit_and_store(payload).await;
    }

    // Background refresh events (debounced)
    pub async fn emit_cache_refreshed(&self, data_type: &str) {
        let payload = AwsEventPayload {
            event_type: "cache_refreshed".to_string(),
            timestamp: Utc::now(),
            data: serde_json::json!({ "data_type": data_type }),
            request_id: None,
        };
        self.emit_and_store(payload).await;
    }

    // Future feature events
    pub async fn emit_blueprint_created(&self, blueprint: serde_json::Value) {
        let payload = AwsEventPayload {
            event_type: "blueprint_created".to_string(),
            timestamp: Utc::now(),
            data: blueprint,
            request_id: None,
        };
        self.emit_and_store(payload).await;
    }

    pub async fn emit_security_config_updated(&self, config: serde_json::Value) {
        let payload = AwsEventPayload {
            event_type: "security_config_updated".to_string(),
            timestamp: Utc::now(),
            data: config,
            request_id: None,
        };
        self.emit_and_store(payload).await;
    }

    pub async fn emit_account_connected(&self, account: serde_json::Value) {
        let payload = AwsEventPayload {
            event_type: "account_connected".to_string(),
            timestamp: Utc::now(),
            data: account,
            request_id: None,
        };
        self.emit_and_store(payload).await;
    }

    pub async fn emit_resource_limit_warning(&self, resource_type: &str, current: i64, limit: i64) {
        let payload = AwsEventPayload {
            event_type: "resource_limit_warning".to_string(),
            timestamp: Utc::now(),
            data: serde_json::json!({
                "resource_type": resource_type,
                "current": current,
                "limit": limit,
                "percentage": (current as f64 / limit as f64) * 100.0
            }),
            request_id: None,
        };
        self.emit_and_store(payload).await;
    }

    pub async fn emit_performance_metrics(&self, metrics: serde_json::Value) {
        let payload = AwsEventPayload {
            event_type: "performance_metrics".to_string(),
            timestamp: Utc::now(),
            data: metrics,
            request_id: None,
        };
        self.emit_and_store(payload).await;
    }

    async fn emit_and_store(&self, payload: AwsEventPayload) {
        tracing::debug!("Emitting AWS event: {} at {}", payload.event_type, payload.timestamp);

        // Emit to frontend
        let event_name = format!("aws:{}", payload.event_type);
        let _ = self.app_handle.emit(&event_name, &payload);

        // Store for persistence
        self.event_store.store_event(payload).await;
    }
}

// ============================================================================
// OPTIMISTIC INSTANCE CREATION
// ============================================================================

pub fn create_optimistic_instance(instance_type: &str, ami_id: &str, region: Option<&str>) -> crate::aws::adapters::Instance {
    use crate::aws::adapters::Instance;

    let temp_id = format!("temp-{}", uuid::Uuid::new_v4().simple());
    let temp_name = format!("creating-{}-{}", instance_type, chrono::Utc::now().format("%H%M%S"));

    Instance {
        id: generate_temp_instance_id(&temp_id),
        name: temp_name,
        project_id: 1, // Default project
        project_name: "Default AWS Project".to_string(),
        project_color: "#3B82F6".to_string(),
        status: "creating".to_string(),
        instance_type: instance_type.to_string(),
        platform: "aws".to_string(),
        region: region.unwrap_or("us-east-1").to_string(),
        public_ip: None,
        private_ip: "creating...".to_string(),
        created: chrono::Utc::now().to_rfc3339(),
        uptime: "0s".to_string(),
        monthly_cost: 0.0, // Will be calculated after creation
        storage: 8, // Default
        security_config: "default".to_string(),
        ssh_key: "default".to_string(),
        tags: vec![format!("ami={}", ami_id)],
    }
}

fn generate_temp_instance_id(temp_id: &str) -> i64 {
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};

    let mut hasher = DefaultHasher::new();
    temp_id.hash(&mut hasher);
    (hasher.finish() % i64::MAX as u64) as i64
}

// ============================================================================
// DEBOUNCED EMITTER
// ============================================================================

pub struct DebouncedEmitter {
    last_emit: std::time::Instant,
    min_interval: std::time::Duration,
}

impl DebouncedEmitter {
    pub fn new(min_interval: std::time::Duration) -> Self {
        Self {
            last_emit: std::time::Instant::now() - min_interval, // Allow immediate first emit
            min_interval,
        }
    }

    pub fn should_emit(&mut self) -> bool {
        let now = std::time::Instant::now();
        if now.duration_since(self.last_emit) >= self.min_interval {
            self.last_emit = now;
            true
        } else {
            false
        }
    }
}

#[cfg(test)]
mod tests {
    include!("events_tests.rs");
}

#[cfg(test)]
mod integration_tests {
    include!("events_integration_tests.rs");
}