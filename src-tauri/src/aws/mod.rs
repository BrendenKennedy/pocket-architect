pub mod client;
pub mod config;
pub mod ec2;
pub mod s3;
pub mod iam;
pub mod rds;
pub mod lambda;
pub mod cache;
pub mod cost;
pub mod types;
pub mod errors;
pub mod health;
pub mod adapters;
pub mod events;

pub use events::{AwsEventEmitter, EventStore, AwsEventPayload};

#[cfg(test)]
mod tests;

pub use client::{AwsClient, test_connection};
pub use config::AwsConfig;
pub use types::*;
pub use errors::*;