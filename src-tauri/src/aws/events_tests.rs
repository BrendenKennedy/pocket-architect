// ============================================================================
// AWS EVENT SYSTEM TESTS
// ============================================================================
// Unit tests for the real-time event system
// ============================================================================

#[cfg(test)]
mod event_system_tests {
    use super::*;
    use std::sync::Arc;
    use tokio::sync::Mutex;

    #[test]
    fn test_event_store_basic_operations() {
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            let store = EventStore::new(10);

            // Test empty store
            let events = store.get_recent_events(None).await;
            assert_eq!(events.len(), 0);

            // Add an event
            let event = AwsEventPayload {
                event_type: "test_event".to_string(),
                timestamp: Utc::now(),
                data: serde_json::json!({"test": "data"}),
                request_id: Some("test-123".to_string()),
            };

            store.store_event(event.clone()).await;

            // Verify event was stored
            let events = store.get_recent_events(None).await;
            assert_eq!(events.len(), 1);
            assert_eq!(events[0].event_type, "test_event");
        });
    }

    #[test]
    fn test_event_store_capacity_limit() {
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            let store = EventStore::new(3); // Only store 3 events

            // Add 5 events
            for i in 0..5 {
                let event = AwsEventPayload {
                    event_type: format!("event_{}", i),
                    timestamp: Utc::now(),
                    data: serde_json::json!({}),
                    request_id: None,
                };
                store.store_event(event).await;
            }

            // Should only have 3 events (most recent)
            let events = store.get_recent_events(None).await;
            assert_eq!(events.len(), 3);
            assert_eq!(events[0].event_type, "event_2"); // Oldest remaining
            assert_eq!(events[2].event_type, "event_4"); // Newest
        });
    }

    #[test]
    fn test_debounced_emitter() {
        let mut emitter = DebouncedEmitter::new(std::time::Duration::from_millis(100));

        // First call should emit
        assert!(emitter.should_emit());

        // Immediate second call should not emit (within debounce period)
        assert!(!emitter.should_emit());

        // Wait longer than debounce period
        std::thread::sleep(std::time::Duration::from_millis(150));

        // Now it should emit again
        assert!(emitter.should_emit());
    }

    #[test]
    fn test_optimistic_instance_creation() {
        let instance = create_optimistic_instance("t2.micro", "ami-12345", Some("us-east-1"));

        assert_eq!(instance.instance_type, "t2.micro");
        assert!(instance.name.contains("creating"));
        assert!(instance.name.contains("t2.micro"));
        assert_eq!(instance.status, "creating");
        assert!(instance.id.starts_with("temp-"));
        assert_eq!(instance.project_id, 1);
        assert_eq!(instance.project_name, "Default AWS Project");
        assert_eq!(instance.region, "us-east-1");
        assert!(instance.tags.iter().any(|tag| tag.contains("ami=ami-12345")));
    }

    #[test]
    fn test_instance_adapter_transformation() {
        use crate::aws::types::*;

        let aws_instance = AwsInstance {
            instance_id: "i-1234567890abcdef0".to_string(),
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
            security_groups: vec![AwsSecurityGroup {
                group_id: "sg-12345".to_string(),
                group_name: "default".to_string(),
                description: Some("Default security group".to_string()),
            }],
            key_pairs: vec!["my-key".to_string()],
            tags: [("Name".to_string(), "test-instance".to_string()), ("Environment".to_string(), "dev".to_string())].into(),
            launch_time: "2024-01-01T00:00:00Z".to_string(),
            monitoring_enabled: false,
            ebs_optimized: false,
            virtualization_type: "hvm".to_string(),
            architecture: "x86_64".to_string(),
        };

        let frontend_instance = aws_instance_to_frontend(
            aws_instance,
            1,
            "Test Project".to_string(),
            "#3B82F6".to_string()
        );

        // Verify transformation
        assert_eq!(frontend_instance.instance_type, "t2.micro");
        assert_eq!(frontend_instance.status, "healthy"); // "running" -> "healthy"
        assert_eq!(frontend_instance.name, "test-instance"); // From Name tag
        assert_eq!(frontend_instance.platform, "aws");
        assert_eq!(frontend_instance.region, "us-east-1");
        assert_eq!(frontend_instance.public_ip, Some("1.2.3.4".to_string()));
        assert_eq!(frontend_instance.private_ip, "10.0.0.1");
        assert_eq!(frontend_instance.project_id, 1);
        assert_eq!(frontend_instance.project_name, "Test Project");
        assert_eq!(frontend_instance.project_color, "#3B82F6");
        assert_eq!(frontend_instance.security_config, "default");
        assert_eq!(frontend_instance.ssh_key, "my-key");
        assert_eq!(frontend_instance.tags, vec!["Name=test-instance".to_string(), "Environment=dev".to_string()]);
        assert!(frontend_instance.uptime.contains("days"));
        assert!(frontend_instance.monthly_cost > 0.0);
    }

    #[test]
    fn test_event_payload_serialization() {
        let payload = AwsEventPayload {
            event_type: "instance_created".to_string(),
            timestamp: Utc::now(),
            data: serde_json::json!({
                "id": "test-123",
                "name": "test-instance",
                "status": "creating"
            }),
            request_id: Some("req-456".to_string()),
        };

        // Test serialization
        let json = serde_json::to_string(&payload).unwrap();
        assert!(json.contains("instance_created"));
        assert!(json.contains("test-123"));
        assert!(json.contains("req-456"));

        // Test deserialization
        let deserialized: AwsEventPayload = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.event_type, "instance_created");
        assert_eq!(deserialized.request_id, Some("req-456".to_string()));

        // Verify data structure
        if let Some(data_obj) = deserialized.data.as_object() {
            assert_eq!(data_obj.get("id").unwrap().as_str().unwrap(), "test-123");
            assert_eq!(data_obj.get("name").unwrap().as_str().unwrap(), "test-instance");
            assert_eq!(data_obj.get("status").unwrap().as_str().unwrap(), "creating");
        } else {
            panic!("Data should be an object");
        }
    }
}