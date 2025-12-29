// ============================================================================
// LAMBDA SERVICE IMPLEMENTATION
// ============================================================================
// AWS Lambda function management with real AWS API integration
// ============================================================================

use crate::aws::{AwsClient, AwsResult, AwsError, AwsLambdaFunction};
use aws_sdk_lambda::types::FunctionConfiguration;
use serde::{Deserialize, Serialize};
use chrono::Utc;

impl From<FunctionConfiguration> for AwsLambdaFunction {
    fn from(func: FunctionConfiguration) -> Self {
        Self {
            function_name: func.function_name().unwrap_or_default().to_string(),
            function_arn: func.function_arn().unwrap_or_default().to_string(),
            runtime: func.runtime().map(|r| r.as_str().to_string()).unwrap_or_default(),
            handler: func.handler().unwrap_or_default().to_string(),
            code_size: func.code_size().unwrap_or(0),
            description: func.description().map(|s| s.to_string()),
            timeout: func.timeout().unwrap_or(3),
            memory_size: func.memory_size().unwrap_or(128),
            last_modified: func.last_modified().unwrap_or_default().to_string(),
            version: func.version().unwrap_or_default().to_string(),
            environment_variables: func.environment()
                .and_then(|env| env.variables().cloned())
                .unwrap_or_default(),
            region: "unknown".to_string(), // Will be set by caller
        }
    }
}

pub struct LambdaService {
    client: AwsClient,
}

impl LambdaService {
    pub fn new(client: AwsClient) -> Self {
        Self { client }
    }

    /// Collect all Lambda functions in the current region
    pub async fn collect_functions(&self) -> AwsResult<Vec<AwsLambdaFunction>> {
        tracing::info!("Collecting Lambda functions");

        let mut functions = Vec::new();
        let mut next_marker = None;

        loop {
            let mut request = self.client.lambda_client.list_functions();

            if let Some(marker) = &next_marker {
                request = request.marker(marker);
            }

            let response = request.send().await
                .map_err(|e| AwsError::ApiError(format!("Failed to list Lambda functions: {}", e)))?;

            if let Some(configs) = response.functions() {
                for config in configs {
                    let mut function: AwsLambdaFunction = config.clone().into();
                    function.region = self.client.config.region.clone();
                    functions.push(function);
                }
            }

            next_marker = response.next_marker().map(|s| s.to_string());
            if next_marker.is_none() {
                break;
            }
        }

        tracing::info!("Collected {} Lambda functions", functions.len());
        Ok(functions)
    }

    /// Create a new Lambda function
    pub async fn create_function(
        &self,
        function_name: &str,
        runtime: &str,
        handler: &str,
        role_arn: &str,
        code_zip: Vec<u8>,
        description: Option<&str>,
    ) -> AwsResult<AwsLambdaFunction> {
        tracing::info!("Creating Lambda function: {}", function_name);

        let mut request = self.client.lambda_client
            .create_function()
            .function_name(function_name)
            .runtime(runtime.parse().map_err(|_| AwsError::ValidationError("Invalid runtime".to_string()))?)
            .handler(handler)
            .role(role_arn)
            .code(
                aws_sdk_lambda::types::FunctionCode::builder()
                    .zip_file(code_zip)
                    .build()
                    .map_err(|e| AwsError::ValidationError(format!("Invalid function code: {}", e)))?
            );

        if let Some(desc) = description {
            request = request.description(desc);
        }

        let response = request.send().await
            .map_err(|e| AwsError::ApiError(format!("Failed to create Lambda function: {}", e)))?;

        let mut function: AwsLambdaFunction = response.into();
        function.region = self.client.config.region.clone();

        tracing::info!("Created Lambda function: {}", function_name);
        Ok(function)
    }

    /// Delete a Lambda function
    pub async fn delete_function(&self, function_name: &str) -> AwsResult<()> {
        tracing::info!("Deleting Lambda function: {}", function_name);

        self.client.lambda_client
            .delete_function()
            .function_name(function_name)
            .send()
            .await
            .map_err(|e| AwsError::ApiError(format!("Failed to delete Lambda function: {}", e)))?;

        tracing::info!("Deleted Lambda function: {}", function_name);
        Ok(())
    }

    /// Get a specific Lambda function
    pub async fn get_function(&self, function_name: &str) -> AwsResult<AwsLambdaFunction> {
        tracing::info!("Getting Lambda function: {}", function_name);

        let response = self.client.lambda_client
            .get_function()
            .function_name(function_name)
            .send()
            .await
            .map_err(|e| AwsError::ApiError(format!("Failed to get Lambda function: {}", e)))?;

        if let Some(config) = response.configuration() {
            let mut function: AwsLambdaFunction = config.clone().into();
            function.region = self.client.config.region.clone();
            Ok(function)
        } else {
            Err(AwsError::NotFound(format!("Function {} not found", function_name)))
        }
    }
}