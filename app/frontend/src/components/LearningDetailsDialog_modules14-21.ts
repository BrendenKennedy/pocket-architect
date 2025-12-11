// Additional module content for modules 14-21
// Import this into LearningDetailsDialog.tsx

export const additionalModules = {
  14: {
    overview: `Multi-cloud strategies enable you to leverage the best features of AWS, GCP, and Azure. While Pocket Architect focuses on AWS, understanding how to architect ML workloads across multiple cloud providers provides flexibility, avoids vendor lock-in, and enables geographic optimization. Each cloud provider offers unique ML services and pricing models that can be strategically combined.`,
    keyPoints: [
      'AWS SageMaker, GCP Vertex AI, and Azure ML offer different ML capabilities',
      'GPU pricing and availability varies significantly across providers',
      'Data transfer costs between clouds can be substantial',
      'Each provider has regional strengths and compliance certifications',
      'Multi-cloud orchestration requires unified tooling and monitoring'
    ],
    bestPractices: [
      'Start with one primary cloud provider, expand strategically',
      'Use containerized workloads (Docker) for portability across clouds',
      'Store data in cloud-neutral formats (S3-compatible object storage)',
      'Implement infrastructure-as-code (Terraform) for multi-cloud deployment',
      'Compare GPU pricing: AWS p3 vs GCP A2 vs Azure NCv3 instances',
      'Consider data sovereignty requirements when choosing regions',
      'Use managed Kubernetes (EKS/GKE/AKS) for cloud-agnostic orchestration',
      'Monitor costs across all cloud providers with unified dashboards'
    ],
    codeExample: `# Multi-Cloud ML Infrastructure Comparison

**AWS (via Pocket Architect):**
- Instance: p3.2xlarge (V100 GPU)
- Cost: $3.06/hour
- ML Service: SageMaker
- Storage: S3 ($0.023/GB/month)

**GCP:**
- Instance: n1-standard-8 + V100
- Cost: $2.48/hour (preemptible)
- ML Service: Vertex AI
- Storage: GCS ($0.020/GB/month)

**Azure:**
- Instance: NC6s_v3 (V100)
- Cost: $3.06/hour
- ML Service: Azure ML
- Storage: Blob ($0.018/GB/month)

# Terraform Multi-Cloud Example
provider "aws" {
  region = "us-west-2"
}

resource "aws_instance" "training" {
  ami           = "ami-deep-learning"
  instance_type = "p3.2xlarge"
}`,
    resources: [
      { title: 'Terraform Multi-Cloud', url: 'terraform.io/docs/providers' },
      { title: 'Cloud GPU Pricing', url: 'cloud-gpus.com' },
      { title: 'GCP Vertex AI', url: 'cloud.google.com/vertex-ai' },
      { title: 'Azure ML', url: 'azure.microsoft.com/services/machine-learning' }
    ]
  },
  15: {
    overview: `High availability (HA) ensures your ML systems remain operational despite failures. For ML workloads, this includes resilient training pipelines, redundant inference endpoints, and disaster recovery strategies. While training jobs can often tolerate failures with checkpointing, inference services require true high availability to meet SLA requirements.`,
    keyPoints: [
      'Multi-region deployment provides geographic redundancy',
      'Load balancing distributes traffic across inference endpoints',
      'Health checks detect and route around failed instances',
      'Automated failover minimizes downtime during outages',
      'Regular backups and disaster recovery testing are essential'
    ],
    bestPractices: [
      'Deploy inference endpoints in multiple AWS regions via Pocket Architect',
      'Use Application Load Balancer (ALB) with health checks',
      'Implement circuit breakers for graceful degradation',
      'Store models in S3 with cross-region replication enabled',
      'Use Auto Scaling Groups for automatic instance replacement',
      'Set up CloudWatch alarms for critical metrics and incidents',
      'Test failover procedures regularly using chaos engineering',
      'Document runbooks for common incident response scenarios'
    ],
    codeExample: `# High Availability Architecture

# Multi-Region Deployment
regions = ['us-west-2', 'us-east-1', 'eu-west-1']

for region in regions:
    # Launch via Pocket Architect
    instance = launch_instance(
        region=region,
        instance_type='g5.xlarge',
        blueprint='ml-inference'
    )

# Health Check Endpoint
from fastapi import FastAPI

app = FastAPI()

@app.get("/health")
async def health_check():
    if model_loaded and gpu_available:
        return {
            "status": "healthy",
            "gpu": torch.cuda.is_available()
        }
    return Response(status_code=503)`,
    resources: [
      { title: 'AWS High Availability', url: 'aws.amazon.com/architecture/well-architected' },
      { title: 'Load Balancing', url: 'docs.aws.amazon.com/elasticloadbalancing' },
      { title: 'Auto Scaling', url: 'docs.aws.amazon.com/autoscaling' },
      { title: 'Chaos Engineering', url: 'principlesofchaos.org' }
    ]
  },
  16: {
    overview: `Hyperparameter tuning is essential for achieving optimal model performance, but it can be extremely compute-intensive. Running hundreds or thousands of experiments in parallel requires careful orchestration, resource management, and result tracking. Modern approaches like Bayesian optimization and early stopping dramatically reduce the search space compared to naive grid search.`,
    keyPoints: [
      'Bayesian optimization is more efficient than grid or random search',
      'Early stopping terminates underperforming trials to save compute',
      'Parallel trials maximize GPU utilization across instances',
      'Population-based training adapts hyperparameters during training',
      'Automated tools like Ray Tune and Optuna handle orchestration complexity'
    ],
    bestPractices: [
      'Start with broad random search, then refine with Bayesian optimization',
      'Use early stopping to kill bad trials (median stopping rule)',
      'Leverage Pocket Architect Spot instances for cost-effective tuning',
      'Implement checkpointing to resume interrupted trials',
      'Track all trials with MLflow or Weights & Biases for analysis',
      'Parallelize across multiple Pocket Architect instances',
      'Define reasonable hyperparameter bounds based on domain knowledge',
      'Consider multi-fidelity optimization (train on subset of data first)'
    ],
    codeExample: `# Hyperparameter Tuning with Ray Tune

import ray
from ray import tune
from ray.tune.schedulers import ASHAScheduler

ray.init(address='auto')  # Connect to cluster

# Search space
config = {
    'lr': tune.loguniform(1e-5, 1e-2),
    'batch_size': tune.choice([16, 32, 64]),
    'hidden_size': tune.choice([128, 256, 512])
}

# Early stopping
scheduler = ASHAScheduler(
    max_t=100,
    grace_period=10,
    reduction_factor=3
)

# Run tuning across Pocket Architect instances
analysis = tune.run(
    train_model,
    config=config,
    num_samples=100,
    scheduler=scheduler,
    resources_per_trial={
        'gpu': 1
    }
)

best = analysis.get_best_config(metric="val_loss")`,
    resources: [
      { title: 'Ray Tune Docs', url: 'docs.ray.io/en/latest/tune' },
      { title: 'Optuna', url: 'optuna.readthedocs.io' },
      { title: 'Bayesian Optimization', url: 'arxiv.org/abs/1807.02811' },
      { title: 'Population-Based Training', url: 'deepmind.com/blog/population-based-training' }
    ]
  },
  17: {
    overview: `MLOps brings DevOps practices to machine learning, automating the end-to-end ML lifecycle from data preparation through model deployment. This includes CI/CD pipelines for model training, automated testing for data and model quality, monitoring for model drift, and orchestrated retraining. Proper MLOps reduces manual work, catches errors early, and ensures production models remain accurate.`,
    keyPoints: [
      'CI/CD pipelines automate training, testing, and deployment workflows',
      'Data validation catches quality issues before training begins',
      'Model testing includes performance, bias, and robustness checks',
      'Monitoring detects model drift and triggers automatic retraining',
      'Infrastructure-as-code enables reproducible deployments'
    ],
    bestPractices: [
      'Version everything: code, data, models, and configurations',
      'Implement automated testing at every pipeline stage',
      'Use feature stores to share and version features across teams',
      'Monitor both model performance metrics and business KPIs',
      'Set up alerts for significant performance degradation',
      'Implement gradual rollout (canary deployments) for new models',
      'Maintain model cards documenting intended use and limitations',
      'Use Pocket Architect Projects to organize pipeline infrastructure'
    ],
    codeExample: `# MLOps Pipeline Automation

import mlflow
import great_expectations as ge

# 1. Data Validation
def validate_data(data_path):
    df = ge.read_csv(data_path)
    df.expect_column_values_to_not_be_null('features')
    df.expect_table_row_count_to_be_between(10000, 1000000)
    results = df.validate()
    if not results['success']:
        raise ValueError("Data validation failed")

# 2. Training Pipeline
def training_pipeline(config):
    validate_data(config['data_path'])
    
    with mlflow.start_run():
        model = train_model(config)
        mlflow.log_params(config)
        mlflow.log_metrics({
            'accuracy': model.accuracy
        })
        mlflow.pytorch.log_model(model, 'model')
    
    return model

# 3. Deploy with Canary
def canary_deploy(model_path, traffic_split=0.1):
    # 10% traffic to new model
    deploy_model(model_path, endpoint='canary')
    # Monitor for 24h then full rollout`,
    resources: [
      { title: 'MLOps Principles', url: 'ml-ops.org' },
      { title: 'Great Expectations', url: 'greatexpectations.io' },
      { title: 'Evidently AI', url: 'evidentlyai.com' },
      { title: 'MLflow Production', url: 'mlflow.org/docs/latest/production' }
    ]
  },
  18: {
    overview: `Choosing the right deep learning framework is a foundational decision that affects development velocity, performance, deployment options, and ecosystem support. PyTorch and TensorFlow dominate production ML, while JAX is gaining traction in research. ONNX provides framework interoperability for deployment flexibility. Understanding the strengths and tradeoffs of each framework helps you make informed choices.`,
    keyPoints: [
      'PyTorch offers intuitive Python-first development and strong research adoption',
      'TensorFlow provides mature production tooling and mobile/edge deployment',
      'JAX enables high-performance research with automatic differentiation',
      'ONNX allows framework-agnostic model deployment and inference',
      'Framework choice impacts team productivity and hiring capabilities'
    ],
    bestPractices: [
      'Use PyTorch for research and rapid prototyping workflows',
      'Consider TensorFlow for large-scale production deployment',
      'Export models to ONNX for framework-independent inference',
      'Leverage pre-trained models from framework-specific hubs',
      'Stay on latest stable versions for security and performance',
      'Use framework-specific optimization tools (TorchScript, TF-TRT)',
      'Consider team expertise when choosing frameworks',
      'Test framework performance on your specific workload before committing'
    ],
    codeExample: `# Framework Comparison

# PyTorch - Research-Friendly
import torch
import torch.nn as nn

class PyTorchModel(nn.Module):
    def __init__(self):
        super().__init__()
        self.fc = nn.Linear(784, 10)
    
    def forward(self, x):
        return self.fc(x)

model = PyTorchModel().cuda()

# TensorFlow/Keras - Production
import tensorflow as tf

model = tf.keras.Sequential([
    tf.keras.layers.Dense(128, activation='relu'),
    tf.keras.layers.Dense(10, activation='softmax')
])

model.compile(optimizer='adam', loss='sparse_categorical_crossentropy')

# Export to ONNX for deployment
torch.onnx.export(
    pytorch_model,
    dummy_input,
    'model.onnx'
)`,
    resources: [
      { title: 'PyTorch Docs', url: 'pytorch.org/docs' },
      { title: 'TensorFlow Guide', url: 'tensorflow.org/guide' },
      { title: 'JAX Docs', url: 'jax.readthedocs.io' },
      { title: 'ONNX Runtime', url: 'onnxruntime.ai' }
    ]
  },
  19: {
    overview: `ML datasets often reach petabyte scale, requiring specialized storage architectures. The choice between S3, EFS, and EBS affects both performance and cost. Optimized data formats like Parquet and partitioning strategies enable efficient access patterns. Data lakes organize raw and processed data for analytics and ML training. Proper storage design prevents data becoming a bottleneck while controlling costs.`,
    keyPoints: [
      'S3 provides unlimited scalable object storage for data lakes',
      'EFS offers shared file system access across multiple instances',
      'EBS provides high-performance block storage for active training',
      'Columnar formats (Parquet) dramatically reduce storage and I/O costs',
      'Data partitioning enables efficient querying of large datasets'
    ],
    bestPractices: [
      'Use S3 as primary data lake for raw and processed data',
      'Store training data in Parquet format for compression and speed',
      'Partition large datasets by date, category, or experiment ID',
      'Use EBS volumes on Pocket Architect instances for active training data',
      'Implement S3 Lifecycle policies to archive old data to Glacier',
      'Enable S3 versioning for critical datasets and model artifacts',
      'Use S3 Select for efficient data filtering without full downloads',
      'Monitor storage costs and set up billing alerts'
    ],
    codeExample: `# Large-Scale Data Storage

import pandas as pd
import pyarrow.parquet as pq

# Convert CSV to Parquet
def convert_to_parquet(csv_path, parquet_path):
    df = pd.read_csv(csv_path)
    df.to_parquet(
        parquet_path,
        engine='pyarrow',
        compression='snappy'
    )

# Partitioned Dataset
df.to_parquet(
    's3://ml-data/train',
    partition_cols=['date', 'category'],
    compression='snappy'
)

# Query specific partition
df = pd.read_parquet(
    's3://ml-data/train',
    filters=[
        ('category', '=', 'cat'),
        ('date', '>=', '2024-01-01')
    ]
)

# S3 Lifecycle Policy
lifecycle_config = {
    'Rules': [{
        'Transitions': [{
            'Days': 90,
            'StorageClass': 'GLACIER'
        }]
    }]
}`,
    resources: [
      { title: 'S3 Best Practices', url: 'docs.aws.amazon.com/s3/userguide/optimizing' },
      { title: 'Apache Parquet', url: 'parquet.apache.org' },
      { title: 'DVC', url: 'dvc.org' },
      { title: 'AWS Data Lake', url: 'aws.amazon.com/solutions/data-lake' }
    ]
  },
  20: {
    overview: `Real-time ML inference requires sub-second latency while maintaining high throughput. Unlike batch inference, real-time systems must handle unpredictable request patterns while meeting strict SLA requirements. This demands careful attention to model optimization, caching strategies, serving architecture, and autoscaling. Pocket Architect's instance management helps deploy scalable inference infrastructure.`,
    keyPoints: [
      'Latency is the primary metric for real-time inference systems',
      'Model optimization (quantization, distillation) reduces inference time',
      'Caching frequent requests avoids redundant computation',
      'Asynchronous processing improves perceived responsiveness',
      'Autoscaling handles variable load patterns efficiently'
    ],
    bestPractices: [
      'Use GPU instances (g5) for real-time deep learning inference',
      'Implement request batching to maximize GPU utilization',
      'Cache predictions for common inputs (e.g., popular products)',
      'Use async inference for non-critical paths to improve UX',
      'Monitor P50, P95, P99 latency percentiles, not just averages',
      'Implement request timeouts and circuit breakers',
      'Deploy with autoscaling based on request queue depth',
      'Use CDN for model artifact distribution'
    ],
    codeExample: `# Real-Time Inference Server

from fastapi import FastAPI
import torch
import asyncio
from collections import deque

app = FastAPI()

class InferenceEngine:
    def __init__(self, model_path):
        self.model = torch.jit.load(model_path).cuda()
        self.batch_queue = deque()
        self.max_batch_size = 32
        asyncio.create_task(self.process_batches())
    
    async def process_batches(self):
        while True:
            await asyncio.sleep(0.01)  # 10ms timeout
            
            if not self.batch_queue:
                continue
            
            # Collect batch
            batch = []
            while self.batch_queue and len(batch) < self.max_batch_size:
                input_data, future = self.batch_queue.popleft()
                batch.append(input_data)
            
            # Run inference
            with torch.no_grad():
                outputs = self.model(torch.stack(batch).cuda())

engine = InferenceEngine('model.pt')

@app.post("/predict")
async def predict(data: bytes):
    result = await engine.add_request(data)
    return {
        "prediction": result
    }`,
    resources: [
      { title: 'FastAPI Docs', url: 'fastapi.tiangolo.com' },
      { title: 'TorchServe', url: 'pytorch.org/serve' },
      { title: 'NVIDIA Triton', url: 'github.com/triton-inference-server' },
      { title: 'Redis Caching', url: 'redis.io/docs' }
    ]
  },
  21: {
    overview: `Network configuration is critical for ML workloads, especially distributed training which requires high-bandwidth, low-latency communication between nodes. VPC design, subnet configuration, security groups, and specialized networking like Elastic Fabric Adapter (EFA) all impact ML performance. Proper network architecture also affects costs, security, and access patterns to data stores.`,
    keyPoints: [
      'VPC isolation provides security boundaries for ML workloads',
      'Placement groups reduce inter-instance latency for distributed training',
      'Elastic Fabric Adapter (EFA) enables high-performance multi-node communication',
      'VPC endpoints reduce costs and improve security for S3 access',
      'Network bandwidth can be the bottleneck in distributed training jobs'
    ],
    bestPractices: [
      'Use cluster placement groups for distributed training instances',
      'Enable enhanced networking on all ML instances for better performance',
      'Use EFA for large-scale multi-node training (8+ GPUs)',
      'Create VPC endpoints for S3 to avoid data transfer costs',
      'Separate training and inference VPCs for security isolation',
      'Use private subnets for training instances, public for load balancers',
      'Monitor network throughput with CloudWatch during training',
      'Test network bandwidth before starting expensive distributed training'
    ],
    codeExample: `# Network Configuration for ML

import boto3

# Create VPC for ML workloads
def create_ml_vpc():
    ec2 = boto3.client('ec2')
    
    vpc = ec2.create_vpc(CidrBlock='10.0.0.0/16')
    vpc_id = vpc['Vpc']['VpcId']
    
    # Private subnet for training
    private_subnet = ec2.create_subnet(
        VpcId=vpc_id,
        CidrBlock='10.0.10.0/24'
    )
    
    # S3 VPC Endpoint (no internet costs!)
    ec2.create_vpc_endpoint(
        VpcId=vpc_id,
        ServiceName='com.amazonaws.us-west-2.s3',
        VpcEndpointType='Gateway'
    )
    
    return vpc_id

# Placement Group for low latency
def create_placement_group():
    ec2 = boto3.client('ec2')
    
    ec2.create_placement_group(
        GroupName='ml-training-cluster',
        Strategy='cluster'  # Low latency
    )

# Launch instances with EFA
response = ec2.run_instances(
    InstanceType='p3.8xlarge',
    MinCount=4,
    Placement={
        'GroupName': 'ml-training-cluster'
    },
    NetworkInterfaces=[{
        'InterfaceType': 'efa'  # High-performance
    }]
)`,
    resources: [
      { title: 'AWS VPC Docs', url: 'docs.aws.amazon.com/vpc' },
      { title: 'Elastic Fabric Adapter', url: 'aws.amazon.com/hpc/efa' },
      { title: 'VPC Endpoints', url: 'docs.aws.amazon.com/vpc/endpoints' },
      { title: 'Placement Groups', url: 'docs.aws.amazon.com/ec2/placement-groups' }
    ]
  }
};
