// ============================================================================
// AWS ERRORS
// ============================================================================
// Comprehensive error handling for AWS operations
// ============================================================================

use thiserror::Error;

#[derive(Error, Debug)]
pub enum AwsError {
    #[error("AWS SDK error: {0}")]
    SdkError(#[from] aws_sdk_ec2::Error),

    #[error("AWS S3 SDK error: {0}")]
    S3SdkError(#[from] aws_sdk_s3::Error),

    #[error("AWS IAM SDK error: {0}")]
    IamSdkError(#[from] aws_sdk_iam::Error),

    #[error("Configuration error: {0}")]
    ConfigError(String),

    #[error("Authentication error: {0}")]
    AuthError(String),

    #[error("Region error: {0}")]
    RegionError(String),

    #[error("Timeout error: {0}")]
    TimeoutError(String),

    #[error("Rate limit exceeded: {0}")]
    RateLimitError(String),

    #[error("Permission denied: {0}")]
    PermissionError(String),

    #[error("Network error: {0}")]
    NetworkError(String),

    #[error("Cost limit exceeded: {0}")]
    CostLimitError(String),

    #[error("Operation failed: {0}")]
    OperationError(String),

    #[error("Cache error: {0}")]
    CacheError(String),

    #[error("Serialization error: {0}")]
    SerializationError(#[from] serde_json::Error),

    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),

    #[error("TOML parsing error: {0}")]
    TomlError(#[from] toml::de::Error),

    #[error("Generic error: {0}")]
    GenericError(#[from] anyhow::Error),

    #[error("Build error: {0}")]
    BuildError(String),
}

pub type AwsResult<T> = Result<T, AwsError>;