// ============================================================================
// AWS CLIENT
// ============================================================================
// AWS SDK client initialization and configuration
// ============================================================================

use crate::aws::{AwsConfig, AwsError, AwsResult};
use aws_config::{BehaviorVersion, Region};
use aws_credential_types::Credentials;
use aws_sdk_ec2::Client as Ec2Client;
use aws_sdk_s3::Client as S3Client;
use aws_sdk_iam::Client as IamClient;
use aws_sdk_rds::Client as RdsClient;
use aws_sdk_lambda::Client as LambdaClient;


#[derive(Clone)]
pub struct AwsClient {
    pub config: AwsConfig,
    pub ec2_client: Ec2Client,
    pub s3_client: S3Client,
    pub iam_client: IamClient,
    pub rds_client: RdsClient,
    pub lambda_client: LambdaClient,
}

impl AwsClient {
    pub async fn new(config: AwsConfig) -> AwsResult<Self> {
        tracing::info!("Initializing AWS client for region: {}", config.region);

        let region = Region::new(config.region.clone());

        let credentials = Credentials::new(
            config.credentials.access_key_id.clone(),
            config.credentials.secret_access_key.clone(),
            None, // session token
            None, // expiry
            "pocket-architect",
        );

        let aws_config = aws_config::defaults(BehaviorVersion::v2025_08_07())
            .region(region)
            .credentials_provider(credentials)
            .load()
            .await;

        let ec2_client = Ec2Client::new(&aws_config);
        let s3_client = S3Client::new(&aws_config);
        let iam_client = IamClient::new(&aws_config);
        let rds_client = RdsClient::new(&aws_config);
        let lambda_client = LambdaClient::new(&aws_config);

        // Test the connection
        Self::test_connection(&ec2_client).await?;

        tracing::info!("AWS client initialized successfully");
        Ok(Self {
            config,
            ec2_client,
            s3_client,
            iam_client,
            rds_client,
            lambda_client,
        })
    }

    async fn test_connection(ec2_client: &Ec2Client) -> AwsResult<()> {
        tracing::debug!("Testing AWS connection with describe-regions");

        ec2_client
            .describe_regions()
            .send()
            .await
            .map_err(|e| {
                tracing::error!("AWS connection test failed: {:?}", e);
                AwsError::AuthError(format!("Failed to connect to AWS: {}", e))
            })?;

        tracing::debug!("AWS connection test successful");
    Ok(())
}

    pub fn primary_region(&self) -> &str {
        self.config.primary_region()
    }

    pub fn fallback_region(&self) -> &str {
        self.config.fallback_region()
    }

    /// Collect EC2 instances using the EC2 service
    pub async fn collect_instances(&self) -> AwsResult<Vec<crate::aws::AwsInstance>> {
        let ec2_service = crate::aws::ec2::Ec2Service::new(self.clone());
        ec2_service.collect_instances().await
    }

    /// Collect S3 buckets using the S3 service
    pub async fn collect_buckets(&self) -> AwsResult<Vec<crate::aws::AwsBucket>> {
        let s3_service = crate::aws::s3::S3Service::new(self.clone());
        s3_service.collect_buckets().await
    }

    /// Collect Lambda functions using the Lambda service
    pub async fn collect_lambda_functions(&self) -> AwsResult<Vec<crate::aws::AwsLambdaFunction>> {
        let lambda_service = crate::aws::lambda::LambdaService::new(self.clone());
        lambda_service.collect_functions().await
    }
}

// Public test connection function that takes credentials
pub async fn test_connection(access_key: &str, secret_key: &str) -> AwsResult<()> {
    tracing::debug!("Testing AWS connection with provided credentials");

    // Create a temporary client just for testing
    let region = Region::new("us-east-1"); // Use us-east-1 for basic connectivity test
    let credentials = Credentials::new(access_key, secret_key, None, None, "test");

    let config = aws_config::defaults(BehaviorVersion::latest())
        .region(region)
        .credentials_provider(credentials)
        .load()
        .await;

    let ec2_client = Ec2Client::new(&config);

    // Test connection by describing regions
    ec2_client
        .describe_regions()
        .send()
        .await
        .map_err(|e| {
            tracing::error!("AWS connection test failed: {:?}", e);
            AwsError::AuthError(format!("Failed to connect to AWS: {}", e))
        })?;

    tracing::debug!("AWS connection test successful");
    Ok(())
}