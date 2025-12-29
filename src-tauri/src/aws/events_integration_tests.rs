// ============================================================================
// AWS EVENT SYSTEM INTEGRATION TESTS
// ============================================================================
// End-to-end tests for the real-time event system
// ============================================================================

#[cfg(test)]
mod integration_tests {
    use super::*;
    use std::sync::Arc;
    use tokio::sync::Mutex;

    #[test]
    fn test_complete_event_flow() {
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            // Create event infrastructure
            let event_store = Arc::new(EventStore::new(100));
            let app_handle = tauri::test::mock_app_handle();
            let event_emitter = Arc::new(AwsEventEmitter::new(app_handle, event_store.clone()));

            // Simulate instance creation flow
            let optimistic_instance = create_optimistic_instance("t2.micro", "ami-12345", Some("us-east-1"));

            // 1. Emit optimistic creation event
            event_emitter.emit_instance_created(optimistic_instance.clone()).await;

            // Verify event was stored
            let events = event_store.get_recent_events(None).await;
            assert_eq!(events.len(), 1);
            assert_eq!(events[0].event_type, "instance_created");

            // 2. Simulate successful API response
            use crate::aws::types::*;
            let real_aws_instance = AwsInstance {
                instance_id: "i-real123".to_string(),
                instance_type: "t2.micro".to_string(),
                state: "running".to_string(),
                region: "us-east-1".to_string(),
                availability_zone: "us-east-1a".to_string(),
                platform: "aws".to_string(),
                cpu_count: 1,
                memory_gb: 1.0,
                storage_gb: 8.0,
                network_performance: "Low to Moderate".to_string(),
                public_ip: Some("1.2.3.4".to_string()),
                private_ip: Some("10.0.0.1".to_string()),
                security_groups: vec![],
                key_pairs: vec!["my-key".to_string()],
                tags: [("Name".to_string(), "real-instance".to_string())].into(),
                launch_time: Utc::now().to_rfc3339(),
                monitoring_enabled: false,
                ebs_optimized: false,
                virtualization_type: "hvm".to_string(),
                architecture: "x86_64".to_string(),
            };

            let real_frontend_instance = aws_instance_to_frontend(
                real_aws_instance,
                1,
                "Default AWS Project".to_string(),
                "#3B82F6".to_string()
            );

            // 3. Emit real data update
            event_emitter.emit_instance_updated(real_frontend_instance.clone()).await;

            // Verify we now have 2 events
            let events = event_store.get_recent_events(None).await;
            assert_eq!(events.len(), 2);
            assert_eq!(events[0].event_type, "instance_created");
            assert_eq!(events[1].event_type, "instance_updated");

            // 4. Test event filtering by time
            let one_minute_ago = Utc::now() - chrono::Duration::minutes(1);
            let recent_events = event_store.get_recent_events(Some(one_minute_ago)).await;
            assert_eq!(recent_events.len(), 2); // Both events are recent

            let future_time = Utc::now() + chrono::Duration::hours(1);
            let future_events = event_store.get_recent_events(Some(future_time)).await;
            assert_eq!(future_events.len(), 0); // No events in the future
        });
    }

    #[test]
    fn test_error_handling_and_rollback() {
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            // Create event infrastructure
            let event_store = Arc::new(EventStore::new(100));
            let app_handle = tauri::test::mock_app_handle();
            let event_emitter = Arc::new(AwsEventEmitter::new(app_handle, event_store.clone()));

            // Simulate failed operation
            let operation = "create_instance";
            let error = "AWS API rate limit exceeded";
            let context = serde_json::json!({
                "instance_type": "t2.micro",
                "region": "us-east-1"
            });

            // Emit error event
            event_emitter.emit_operation_failed(operation, error, context.clone()).await;

            // Verify error event was stored
            let events = event_store.get_recent_events(None).await;
            assert_eq!(events.len(), 1);
            assert_eq!(events[0].event_type, "operation_failed");

            // Verify error context
            if let Some(data_obj) = events[0].data.as_object() {
                assert_eq!(data_obj.get("operation").unwrap().as_str().unwrap(), operation);
                assert_eq!(data_obj.get("error").unwrap().as_str().unwrap(), error);
                assert_eq!(data_obj.get("context").unwrap(), &context);
            } else {
                panic!("Error event data should be an object");
            }
        });
    }

    #[test]
    fn test_debounced_cache_events() {
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            // Create event infrastructure
            let event_store = Arc::new(EventStore::new(100));
            let app_handle = tauri::test::mock_app_handle();
            let event_emitter = Arc::new(AwsEventEmitter::new(app_handle, event_store.clone()));

            // Test debouncing with multiple rapid events
            let mut debounce_emitter = DebouncedEmitter::new(std::time::Duration::from_millis(100));

            // First event should emit immediately
            assert!(debounce_emitter.should_emit());

            // Rapid events should be debounced
            for _ in 0..5 {
                std::thread::sleep(std::time::Duration::from_millis(50));
                assert!(!debounce_emitter.should_emit());
            }

            // Wait for debounce period
            std::thread::sleep(std::time::Duration::from_millis(110));

            // Next event should emit
            assert!(debounce_emitter.should_emit());
        });
    }

    #[test]
    fn test_event_store_capacity_management() {
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            let capacity = 5;
            let event_store = EventStore::new(capacity);

            // Add events up to capacity
            for i in 0..capacity {
                let event = AwsEventPayload {
                    event_type: format!("event_{}", i),
                    timestamp: Utc::now(),
                    data: serde_json::json!({ "index": i }),
                    request_id: None,
                };
                event_store.store_event(event).await;
            }

            // Verify capacity is respected
            let events = event_store.get_recent_events(None).await;
            assert_eq!(events.len(), capacity);

            // Add one more event
            let final_event = AwsEventPayload {
                event_type: "final_event".to_string(),
                timestamp: Utc::now(),
                data: serde_json::json!({ "final": true }),
                request_id: None,
            };
            event_store.store_event(final_event).await;

            // Should still be at capacity, with oldest event removed
            let events = event_store.get_recent_events(None).await;
            assert_eq!(events.len(), capacity);
            assert_eq!(events[0].event_type, "event_1"); // event_0 was removed
            assert_eq!(events[capacity - 1].event_type, "final_event");
        });
    }
}