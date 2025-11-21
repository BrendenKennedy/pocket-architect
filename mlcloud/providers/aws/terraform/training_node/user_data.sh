#!/bin/bash
set -e

# Install Docker and NVIDIA Container Toolkit
apt-get update
apt-get install -y docker.io docker-compose-plugin

distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -s -L https://nvidia.github.io/nvidia-docker/gpgkey | apt-key add -
curl -s -L https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list | tee /etc/apt/sources.list.d/nvidia-docker.list
apt-get update
apt-get install -y nvidia-container-toolkit
systemctl restart docker

# Mount EFS if provided
if [ -n "${efs_id}" ]; then
    apt-get install -y amazon-efs-utils
    mkdir -p /mnt/efs
    mount -t efs -o tls ${efs_id}:/ /mnt/efs
    echo "${efs_id}:/ /mnt/efs efs defaults,_netdev,tls" >> /etc/fstab
fi

# Install Python and ML frameworks
apt-get install -y python3 python3-pip
pip3 install torch torchvision ultralytics detectron2

# Install JupyterLab
pip3 install jupyterlab
mkdir -p /opt/jupyter
cat > /etc/systemd/system/jupyter.service <<EOF
[Unit]
Description=JupyterLab
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/opt/jupyter
ExecStart=/usr/local/bin/jupyter lab --ip=0.0.0.0 --port=8888 --no-browser --allow-root
Restart=always

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable jupyter
systemctl start jupyter

