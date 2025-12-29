// ============================================================================
// AWS INTEGRATION TESTS
// ============================================================================
// Basic compilation and import tests for AWS services
// ============================================================================

#[cfg(test)]
mod aws_integration_tests {
    use super::*;
    use crate::aws::{AwsClient, AwsConfig, ec2::Ec2Service, s3::S3Service, iam::IamService, cost::SharedCostTracker, adapters::*};

    #[test]
    fn test_aws_service_creation() {
        // This test validates that our service structs can be created
        // Note: This doesn't test actual AWS API calls, just struct creation

        // Create a mock config (won't connect to AWS)
        let config = AwsConfig {
            credentials: crate::aws::AwsCredentials {
                access_key_id: "test".to_string(),
                secret_access_key: "test".to_string(),
            },
            primary_region: "us-east-1".to_string(),
            fallback_region: "us-east-2".to_string(),
        };

        // Test that services can be instantiated
        let _ec2_service = Ec2Service::new(AwsClient {
            config: config.clone(),
            ec2_client: aws_sdk_ec2::Client::new(&aws_config::SdkConfig::builder().build()),
            s3_client: aws_sdk_s3::Client::new(&aws_config::SdkConfig::builder().build()),
            iam_client: aws_sdk_iam::Client::new(&aws_config::SdkConfig::builder().build()),
        });

        let _s3_service = S3Service::new(AwsClient {
            config: config.clone(),
            ec2_client: aws_sdk_ec2::Client::new(&aws_config::SdkConfig::builder().build()),
            s3_client: aws_sdk_s3::Client::new(&aws_config::SdkConfig::builder().build()),
            iam_client: aws_sdk_iam::Client::new(&aws_config::SdkConfig::builder().build()),
        });

        let _iam_service = IamService::new(AwsClient {
            config: config.clone(),
            ec2_client: aws_sdk_ec2::Client::new(&aws_config::SdkConfig::builder().build()),
            s3_client: aws_sdk_s3::Client::new(&aws_config::SdkConfig::builder().build()),
            iam_client: aws_sdk_iam::Client::new(&aws_config::SdkConfig::builder().build()),
        });

        // Test cost tracker creation
        let _cost_tracker = SharedCostTracker::new(AwsClient {
            config,
            ec2_client: aws_sdk_ec2::Client::new(&aws_config::SdkConfig::builder().build()),
            s3_client: aws_sdk_s3::Client::new(&aws_config::SdkConfig::builder().build()),
            iam_client: aws_sdk_iam::Client::new(&aws_config::SdkConfig::builder().build()),
        }, 1.0, 50.0);
    }

    #[test]
    fn test_data_type_serialization() {
        // Test that our data types can be serialized (important for Tauri commands)
        use crate::aws::types::*;

        let instance = AwsInstance {
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
            tags: [("Name".to_string(), "test-instance".to_string())].into(),
            launch_time: "2024-01-01T00:00:00Z".to_string(),
            monitoring_enabled: false,
            ebs_optimized: false,
            virtualization_type: "hvm".to_string(),
            architecture: "x86_64".to_string(),
        };

        // Test serialization
        let json = serde_json::to_string(&instance).unwrap();
        assert!(json.contains("instance_id"));
        assert!(json.contains("i-1234567890abcdef0"));

        // Test deserialization
        let deserialized: AwsInstance = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.instance_id, instance.instance_id);
    }

    #[test]
    fn test_instance_adapter() {
        // Test the AWS instance to frontend instance adapter
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
            tags: [("Name".to_string(), "test-instance".to_string())].into(),
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

        // Verify the transformation
        assert_eq!(frontend_instance.instance_type, "t2.micro");
        assert_eq!(frontend_instance.status, "healthy"); // "running" -> "healthy"
        assert_eq!(frontend_instance.platform, "aws");
        assert_eq!(frontend_instance.region, "us-east-1");
        assert_eq!(frontend_instance.public_ip, Some("1.2.3.4".to_string()));
        assert_eq!(frontend_instance.private_ip, "10.0.0.1");
        assert_eq!(frontend_instance.project_id, 1);
        assert_eq!(frontend_instance.project_name, "Test Project");
        assert_eq!(frontend_instance.project_color, "#3B82F6");
        assert_eq!(frontend_instance.security_config, "default");
        assert_eq!(frontend_instance.ssh_key, "my-key");
        assert_eq!(frontend_instance.tags, vec!["Name=test-instance".to_string()]);
        assert!(frontend_instance.uptime.contains("days") || frontend_instance.uptime.contains("unknown"));
        assert!(frontend_instance.monthly_cost > 0.0);
    }

    #[test]
    fn test_cost_adapter() {
        // Test the CostStatus to CostSummary adapter
        use crate::aws::cost::CostStatus;

        let cost_status = CostStatus {
            total_api_calls: 100,
            estimated_cost_usd: 2.5,
            cost_limit_usd: 10.0,
            percent_used: 25.0,
            alerts: vec![],
            tracking_start: "2024-01-01T00:00:00Z".to_string(),
        };

        let cost_summary = cost_status_to_summary(cost_status);

        assert_eq!(cost_summary.current_month, 2.5);
        assert_eq!(cost_summary.by_service.len(), 3); // EC2, S3, Other
        assert!(cost_summary.daily_data.len() > 0);
        assert!(cost_summary.by_service.iter().any(|s| s.service == "EC2"));
        assert!(cost_summary.by_service.iter().any(|s| s.service == "S3"));
        assert!(cost_summary.by_service.iter().any(|s| s.service == "Other"));
    }

    #[test]
    fn test_pagination() {
        // Test pagination functionality
        let instances = vec![
            Instance {
                id: 1,
                name: "instance-1".to_string(),
                project_id: 1,
                project_name: "Test Project".to_string(),
                project_color: "#3B82F6".to_string(),
                status: "healthy".to_string(),
                instance_type: "t2.micro".to_string(),
                platform: "aws".to_string(),
                region: "us-east-1".to_string(),
                public_ip: Some("1.2.3.4".to_string()),
                private_ip: "10.0.0.1".to_string(),
                created: "2024-01-01T00:00:00Z".to_string(),
                uptime: "30d 0h".to_string(),
                monthly_cost: 10.0,
                storage: 8,
                security_config: "default".to_string(),
                ssh_key: "my-key".to_string(),
                tags: vec![],
            },
            Instance {
                id: 2,
                name: "instance-2".to_string(),
                project_id: 1,
                project_name: "Test Project".to_string(),
                project_color: "#3B82F6".to_string(),
                status: "stopped".to_string(),
                instance_type: "t2.small".to_string(),
                platform: "aws".to_string(),
                region: "us-east-1".to_string(),
                public_ip: None,
                private_ip: "10.0.0.2".to_string(),
                created: "2024-01-02T00:00:00Z".to_string(),
                uptime: "29d 0h".to_string(),
                monthly_cost: 15.0,
                storage: 16,
                security_config: "default".to_string(),
                ssh_key: "my-key".to_string(),
                tags: vec![],
            },
        ];

        // Test pagination with page size 1
        let options = Some(ListOptions {
            page: Some(1),
            page_size: Some(1),
            sort_by: None,
            sort_order: None,
            search: None,
            filters: None,
        });

        let paginated = paginate_items(instances, options);

        assert_eq!(paginated.data.len(), 1);
        assert_eq!(paginated.pagination.total_items, 2);
        assert_eq!(paginated.pagination.total_pages, 2);
        assert_eq!(paginated.pagination.page, 1);
        assert_eq!(paginated.pagination.page_size, 1);
        assert_eq!(paginated.data[0].name, "instance-1");
    }

    #[test]
    fn test_default_project_creation() {
        // Test default project creation for instances
        use crate::aws::types::*;

        let instances = vec![
            AwsInstance {
                instance_id: "i-123".to_string(),
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
                key_pairs: vec![],
                tags: std::collections::HashMap::new(),
                launch_time: "2024-01-01T00:00:00Z".to_string(),
                monitoring_enabled: false,
                ebs_optimized: false,
                virtualization_type: "hvm".to_string(),
                architecture: "x86_64".to_string(),
            }
        ];

        let project = create_default_project_for_instances(&instances);

        assert_eq!(project.id, 1);
        assert_eq!(project.name, "Default AWS Project");
        assert_eq!(project.instance_count, 1);
        assert_eq!(project.instances.len(), 1);
        assert_eq!(project.platform, "aws");
        assert_eq!(project.region, "us-east-1");
        assert!(project.monthly_cost > 0.0);
        assert_eq!(project.cost_limit, 100.0);
    }
}