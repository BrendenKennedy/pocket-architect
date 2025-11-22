"""Built-in blueprints."""

from pocket_architect.models import Blueprint


def _get_jupyter_user_data() -> str:
    """User data script to install and configure Jupyter Lab."""
    return """#!/bin/bash
set -e

# Detect OS and set variables
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
else
    OS="unknown"
fi

# Set user based on OS
if [ "$OS" = "ubuntu" ]; then
    USER_NAME="ubuntu"
    PKG_MGR="apt-get"
    UPDATE_CMD="apt-get update -y"
    INSTALL_CMD="apt-get install -y"
else
    USER_NAME="ec2-user"
    PKG_MGR="yum"
    UPDATE_CMD="yum update -y"
    INSTALL_CMD="yum install -y"
fi

HOME_DIR="/home/$USER_NAME"

# Update system
sudo $UPDATE_CMD

# Install Python 3 and pip
if [ "$OS" = "ubuntu" ]; then
    sudo $INSTALL_CMD python3 python3-pip git
else
    sudo $INSTALL_CMD python3 python3-pip git
fi

# Install Jupyter Lab
sudo python3 -m pip install --upgrade pip
sudo python3 -m pip install jupyterlab notebook

# Create Jupyter config directory
sudo -u $USER_NAME mkdir -p $HOME_DIR/.jupyter

# Generate Jupyter config with token authentication
sudo -u $USER_NAME jupyter lab --generate-config
sudo -u $USER_NAME bash -c "echo 'c.ServerApp.token = \"\"' >> $HOME_DIR/.jupyter/jupyter_lab_config.py"
sudo -u $USER_NAME bash -c "echo 'c.ServerApp.password = \"\"' >> $HOME_DIR/.jupyter/jupyter_lab_config.py"
sudo -u $USER_NAME bash -c "echo 'c.ServerApp.ip = \"0.0.0.0\"' >> $HOME_DIR/.jupyter/jupyter_lab_config.py"
sudo -u $USER_NAME bash -c "echo 'c.ServerApp.open_browser = False' >> $HOME_DIR/.jupyter/jupyter_lab_config.py"
sudo -u $USER_NAME bash -c "echo 'c.ServerApp.allow_root = True' >> $HOME_DIR/.jupyter/jupyter_lab_config.py"

# Create systemd service for Jupyter
sudo tee /etc/systemd/system/jupyter.service > /dev/null <<EOF
[Unit]
Description=Jupyter Lab Server
After=network.target

[Service]
Type=simple
User=$USER_NAME
WorkingDirectory=$HOME_DIR
ExecStart=/usr/local/bin/jupyter lab --config=$HOME_DIR/.jupyter/jupyter_lab_config.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Start Jupyter service
sudo systemctl daemon-reload
sudo systemctl enable jupyter
sudo systemctl start jupyter

echo "Jupyter Lab installed and started on port 8888"
"""


def _get_ml_training_user_data() -> str:
    """User data script for ML training with PyTorch and TensorFlow."""
    return """#!/bin/bash
set -e

# Detect OS and set variables
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
else
    OS="unknown"
fi

# Set user based on OS
if [ "$OS" = "ubuntu" ]; then
    USER_NAME="ubuntu"
    PKG_MGR="apt-get"
    UPDATE_CMD="apt-get update -y"
    INSTALL_CMD="apt-get install -y"
else
    USER_NAME="ec2-user"
    PKG_MGR="yum"
    UPDATE_CMD="yum update -y"
    INSTALL_CMD="yum install -y"
fi

HOME_DIR="/home/$USER_NAME"

# Update system
sudo $UPDATE_CMD

# Install Python 3 and pip
if [ "$OS" = "ubuntu" ]; then
    sudo $INSTALL_CMD python3 python3-pip git
else
    sudo $INSTALL_CMD python3 python3-pip git
fi

# Install ML frameworks
sudo python3 -m pip install --upgrade pip
sudo python3 -m pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
sudo python3 -m pip install tensorflow[and-cuda]
sudo python3 -m pip install numpy pandas scikit-learn matplotlib seaborn

# Install Jupyter Lab
sudo python3 -m pip install jupyterlab notebook

# Create Jupyter config directory
sudo -u $USER_NAME mkdir -p $HOME_DIR/.jupyter

# Generate Jupyter config with token authentication
sudo -u $USER_NAME jupyter lab --generate-config
sudo -u $USER_NAME bash -c "echo 'c.ServerApp.token = \"\"' >> $HOME_DIR/.jupyter/jupyter_lab_config.py"
sudo -u $USER_NAME bash -c "echo 'c.ServerApp.password = \"\"' >> $HOME_DIR/.jupyter/jupyter_lab_config.py"
sudo -u $USER_NAME bash -c "echo 'c.ServerApp.ip = \"0.0.0.0\"' >> $HOME_DIR/.jupyter/jupyter_lab_config.py"
sudo -u $USER_NAME bash -c "echo 'c.ServerApp.open_browser = False' >> $HOME_DIR/.jupyter/jupyter_lab_config.py"
sudo -u $USER_NAME bash -c "echo 'c.ServerApp.allow_root = True' >> $HOME_DIR/.jupyter/jupyter_lab_config.py"

# Create systemd service for Jupyter
sudo tee /etc/systemd/system/jupyter.service > /dev/null <<EOF
[Unit]
Description=Jupyter Lab Server
After=network.target

[Service]
Type=simple
User=$USER_NAME
WorkingDirectory=$HOME_DIR
ExecStart=/usr/local/bin/jupyter lab --config=$HOME_DIR/.jupyter/jupyter_lab_config.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Start Jupyter service
sudo systemctl daemon-reload
sudo systemctl enable jupyter
sudo systemctl start jupyter

# Verify GPU availability
nvidia-smi || echo "Note: GPU check failed - may need to install NVIDIA drivers on non-DL-AMI instances"

echo "ML training environment ready with PyTorch, TensorFlow, and Jupyter Lab"
"""


def _get_mlflow_user_data() -> str:
    """User data script to install and configure MLflow server."""
    return """#!/bin/bash
set -e

# Detect OS and set variables
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
else
    OS="unknown"
fi

# Set user based on OS
if [ "$OS" = "ubuntu" ]; then
    USER_NAME="ubuntu"
    PKG_MGR="apt-get"
    UPDATE_CMD="apt-get update -y"
    INSTALL_CMD="apt-get install -y"
else
    USER_NAME="ec2-user"
    PKG_MGR="yum"
    UPDATE_CMD="yum update -y"
    INSTALL_CMD="yum install -y"
fi

HOME_DIR="/home/$USER_NAME"

# Update system
sudo $UPDATE_CMD

# Install Python 3 and pip
if [ "$OS" = "ubuntu" ]; then
    sudo $INSTALL_CMD python3 python3-pip git
else
    sudo $INSTALL_CMD python3 python3-pip git
fi

# Install MLflow and dependencies
sudo python3 -m pip install --upgrade pip
sudo python3 -m pip install mlflow boto3 psycopg2-binary

# Create MLflow directory
sudo -u $USER_NAME mkdir -p $HOME_DIR/mlflow

# Create systemd service for MLflow
sudo tee /etc/systemd/system/mlflow.service > /dev/null <<EOF
[Unit]
Description=MLflow Tracking Server
After=network.target

[Service]
Type=simple
User=$USER_NAME
WorkingDirectory=$HOME_DIR/mlflow
Environment="MLFLOW_BACKEND_STORE_URI=file://$HOME_DIR/mlflow/mlruns"
Environment="MLFLOW_DEFAULT_ARTIFACT_ROOT=s3://mlflow-artifacts"
ExecStart=/usr/local/bin/mlflow server --host 0.0.0.0 --port 5000 --default-artifact-root s3://mlflow-artifacts
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Start MLflow service
sudo systemctl daemon-reload
sudo systemctl enable mlflow
sudo systemctl start mlflow

echo "MLflow server installed and started on port 5000"
echo "Note: Configure S3 bucket for artifacts in MLFLOW_DEFAULT_ARTIFACT_ROOT"
"""


def _get_ml_serving_user_data() -> str:
    """User data script for model serving with FastAPI."""
    return """#!/bin/bash
set -e

# Detect OS and set variables
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
else
    OS="unknown"
fi

# Set user based on OS
if [ "$OS" = "ubuntu" ]; then
    USER_NAME="ubuntu"
    PKG_MGR="apt-get"
    UPDATE_CMD="apt-get update -y"
    INSTALL_CMD="apt-get install -y"
else
    USER_NAME="ec2-user"
    PKG_MGR="yum"
    UPDATE_CMD="yum update -y"
    INSTALL_CMD="yum install -y"
fi

HOME_DIR="/home/$USER_NAME"

# Update system
sudo $UPDATE_CMD

# Install Python 3 and pip
if [ "$OS" = "ubuntu" ]; then
    sudo $INSTALL_CMD python3 python3-pip git
else
    sudo $INSTALL_CMD python3 python3-pip git
fi

# Install serving frameworks
sudo python3 -m pip install --upgrade pip
sudo python3 -m pip install fastapi uvicorn[standard] pydantic
sudo python3 -m pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
sudo python3 -m pip install tensorflow-cpu

# Create example serving directory
sudo -u $USER_NAME mkdir -p $HOME_DIR/model-serving

# Create example FastAPI app
sudo -u $USER_NAME tee $HOME_DIR/model-serving/app.py > /dev/null <<'PYEOF'
from fastapi import FastAPI
from pydantic import BaseModel
import torch
import numpy as np

app = FastAPI(title="ML Model Serving API")

class PredictionRequest(BaseModel):
    data: list

@app.get("/")
def root():
    return {"message": "ML Model Serving API", "status": "ready"}

@app.get("/health")
def health():
    return {"status": "healthy"}

@app.post("/predict")
def predict(request: PredictionRequest):
    # Example prediction endpoint
    # Replace with your actual model loading and inference
    return {"prediction": "model_not_loaded", "input": request.data}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
PYEOF

# Create systemd service for FastAPI
sudo tee /etc/systemd/system/ml-serving.service > /dev/null <<EOF
[Unit]
Description=ML Model Serving API
After=network.target

[Service]
Type=simple
User=$USER_NAME
WorkingDirectory=$HOME_DIR/model-serving
ExecStart=/usr/local/bin/uvicorn app:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Start serving service
sudo systemctl daemon-reload
sudo systemctl enable ml-serving
sudo systemctl start ml-serving

echo "ML serving API installed and started on port 8000"
echo "Edit $HOME_DIR/model-serving/app.py to add your model"
"""


def _get_ml_pipeline_user_data() -> str:
    """User data script for complete ML pipeline environment."""
    return """#!/bin/bash
set -e

# Detect OS and set variables
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
else
    OS="unknown"
fi

# Set user based on OS
if [ "$OS" = "ubuntu" ]; then
    USER_NAME="ubuntu"
    PKG_MGR="apt-get"
    UPDATE_CMD="apt-get update -y"
    INSTALL_CMD="apt-get install -y"
else
    USER_NAME="ec2-user"
    PKG_MGR="yum"
    UPDATE_CMD="yum update -y"
    INSTALL_CMD="yum install -y"
fi

HOME_DIR="/home/$USER_NAME"

# Update system
sudo $UPDATE_CMD

# Install Python 3 and pip
if [ "$OS" = "ubuntu" ]; then
    sudo $INSTALL_CMD python3 python3-pip git
else
    sudo $INSTALL_CMD python3 python3-pip git
fi

# Install ML frameworks
sudo python3 -m pip install --upgrade pip
sudo python3 -m pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
sudo python3 -m pip install tensorflow[and-cuda]
sudo python3 -m pip install numpy pandas scikit-learn matplotlib seaborn

# Install Jupyter Lab
sudo python3 -m pip install jupyterlab notebook

# Install MLflow
sudo python3 -m pip install mlflow boto3

# Install serving frameworks
sudo python3 -m pip install fastapi uvicorn[standard] pydantic

# Create Jupyter config
sudo -u $USER_NAME mkdir -p $HOME_DIR/.jupyter
sudo -u $USER_NAME jupyter lab --generate-config
sudo -u $USER_NAME bash -c "echo 'c.ServerApp.token = \"\"' >> $HOME_DIR/.jupyter/jupyter_lab_config.py"
sudo -u $USER_NAME bash -c "echo 'c.ServerApp.password = \"\"' >> $HOME_DIR/.jupyter/jupyter_lab_config.py"
sudo -u $USER_NAME bash -c "echo 'c.ServerApp.ip = \"0.0.0.0\"' >> $HOME_DIR/.jupyter/jupyter_lab_config.py"
sudo -u $USER_NAME bash -c "echo 'c.ServerApp.open_browser = False' >> $HOME_DIR/.jupyter/jupyter_lab_config.py"
sudo -u $USER_NAME bash -c "echo 'c.ServerApp.allow_root = True' >> $HOME_DIR/.jupyter/jupyter_lab_config.py"

# Create MLflow directory
sudo -u $USER_NAME mkdir -p $HOME_DIR/mlflow

# Create Jupyter service
sudo tee /etc/systemd/system/jupyter.service > /dev/null <<EOF
[Unit]
Description=Jupyter Lab Server
After=network.target

[Service]
Type=simple
User=$USER_NAME
WorkingDirectory=$HOME_DIR
ExecStart=/usr/local/bin/jupyter lab --config=$HOME_DIR/.jupyter/jupyter_lab_config.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Create MLflow service
sudo tee /etc/systemd/system/mlflow.service > /dev/null <<EOF
[Unit]
Description=MLflow Tracking Server
After=network.target

[Service]
Type=simple
User=$USER_NAME
WorkingDirectory=$HOME_DIR/mlflow
Environment="MLFLOW_BACKEND_STORE_URI=file://$HOME_DIR/mlflow/mlruns"
Environment="MLFLOW_DEFAULT_ARTIFACT_ROOT=s3://mlflow-artifacts"
ExecStart=/usr/local/bin/mlflow server --host 0.0.0.0 --port 5000 --default-artifact-root s3://mlflow-artifacts
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Start services
sudo systemctl daemon-reload
sudo systemctl enable jupyter mlflow
sudo systemctl start jupyter mlflow

# Verify GPU availability
nvidia-smi || echo "Note: GPU check failed - may need to install NVIDIA drivers on non-DL-AMI instances"

echo "Complete ML pipeline environment ready"
echo "Jupyter Lab: http://<ip>:8888"
echo "MLflow UI: http://<ip>:5000"
"""


def get_builtin_blueprints() -> dict[str, Blueprint]:
    """
    Get all built-in blueprints.

    Returns:
        Dictionary mapping blueprint names to Blueprint objects
    """
    return {
        "basic-web": Blueprint(
            name="basic-web",
            description="Basic web server with t3.large, ports 22+8080, optional ALB or Elastic IP",
            provider="aws",
            resources={
                "instance_type": "t3.large",
                "ports": [22, 8080],
                "use_alb": False,
                "use_eip": True,
                "certificate_arn": None,  # Set in blueprint wizard or edit YAML
                "target_port": 8080,
            },
        ),
        "bare-metal": Blueprint(
            name="bare-metal",
            description="Bare EC2 instance with SSH access, t3.medium, Elastic IP",
            provider="aws",
            resources={
                "instance_type": "t3.medium",
                "ports": [22],
                "use_alb": False,
                "use_eip": True,
                "certificate_arn": None,
                "target_port": 8080,
            },
        ),
        # ML Training Blueprints
        "ml-training-gpu": Blueprint(
            name="ml-training-gpu",
            description="GPU instance for ML model training with Jupyter access (g4dn.xlarge, NVIDIA T4)",
            provider="aws",
            resources={
                "instance_type": "g4dn.xlarge",
                "ports": [22, 8888],
                "use_alb": False,
                "use_eip": True,
                "certificate_arn": None,
                "target_port": 8080,
                "ami_name": "Deep Learning Base OSS Nvidia Driver AMI (Ubuntu 22.04) *",
                "ami_owner": "amazon",
                "use_iam_role": True,
                "user_data": _get_ml_training_user_data(),
            },
            metadata={
                "category": "ml-training",
                "gpu_required": True,
                "use_case": "single_gpu_training",
            },
        ),
        "ml-training-multi-gpu": Blueprint(
            name="ml-training-multi-gpu",
            description="Multi-GPU instance for distributed training (g4dn.4xlarge, 4x NVIDIA T4)",
            provider="aws",
            resources={
                "instance_type": "g4dn.4xlarge",
                "ports": [22, 8888],
                "use_alb": False,
                "use_eip": True,
                "certificate_arn": None,
                "target_port": 8080,
                "ami_name": "Deep Learning Base OSS Nvidia Driver AMI (Ubuntu 22.04) *",
                "ami_owner": "amazon",
                "use_iam_role": True,
                "user_data": _get_ml_training_user_data(),
            },
            metadata={
                "category": "ml-training",
                "gpu_required": True,
                "use_case": "multi_gpu_training",
            },
        ),
        # ML Serving Blueprints
        "ml-serving-api": Blueprint(
            name="ml-serving-api",
            description="API endpoint for model serving with ALB (t3.large, FastAPI on port 8000)",
            provider="aws",
            resources={
                "instance_type": "t3.large",
                "ports": [22, 8000],
                "use_alb": True,
                "use_eip": False,
                "certificate_arn": None,
                "target_port": 8000,
                "use_iam_role": True,
                "user_data": _get_ml_serving_user_data(),
            },
            metadata={
                "category": "ml-serving",
                "gpu_required": False,
                "use_case": "model_api",
            },
        ),
        # ML Development Blueprints
        "ml-jupyter-server": Blueprint(
            name="ml-jupyter-server",
            description="Jupyter Lab server for experimentation (t3.large, CPU-based)",
            provider="aws",
            resources={
                "instance_type": "t3.large",
                "ports": [22, 8888],
                "use_alb": False,
                "use_eip": True,
                "certificate_arn": None,
                "target_port": 8080,
                "use_iam_role": True,
                "user_data": _get_jupyter_user_data(),
            },
            metadata={
                "category": "ml-development",
                "gpu_required": False,
                "use_case": "notebook_server",
            },
        ),
        "ml-mlflow-server": Blueprint(
            name="ml-mlflow-server",
            description="MLflow tracking server for experiment management (t3.medium, port 5000)",
            provider="aws",
            resources={
                "instance_type": "t3.medium",
                "ports": [22, 5000],
                "use_alb": False,
                "use_eip": True,
                "certificate_arn": None,
                "target_port": 8080,
                "use_iam_role": True,
                "user_data": _get_mlflow_user_data(),
            },
            metadata={
                "category": "ml-ops",
                "gpu_required": False,
                "use_case": "experiment_tracking",
            },
        ),
        # Complete ML Pipeline
        "ml-pipeline-full": Blueprint(
            name="ml-pipeline-full",
            description="Complete ML environment with training, tracking, and serving capabilities (g4dn.xlarge)",
            provider="aws",
            resources={
                "instance_type": "g4dn.xlarge",
                "ports": [22, 8888, 5000],
                "use_alb": False,
                "use_eip": True,
                "certificate_arn": None,
                "target_port": 8080,
                "ami_name": "Deep Learning Base OSS Nvidia Driver AMI (Ubuntu 22.04) *",
                "ami_owner": "amazon",
                "use_iam_role": True,
                "user_data": _get_ml_pipeline_user_data(),
            },
            metadata={
                "category": "ml-pipeline",
                "gpu_required": True,
                "use_case": "complete_ml_stack",
            },
        ),
    }
