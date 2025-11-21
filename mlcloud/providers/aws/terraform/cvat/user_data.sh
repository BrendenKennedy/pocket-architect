#!/bin/bash
set -e

# Install Docker
apt-get update
apt-get install -y docker.io docker-compose-plugin

# Install NVIDIA Container Toolkit if GPU instance
if lspci | grep -i nvidia > /dev/null; then
    distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
    curl -s -L https://nvidia.github.io/nvidia-docker/gpgkey | apt-key add -
    curl -s -L https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list | tee /etc/apt/sources.list.d/nvidia-docker.list
    apt-get update
    apt-get install -y nvidia-container-toolkit
    systemctl restart docker
fi

# Mount EFS if enabled
if [ -n "${efs_id}" ]; then
    apt-get install -y amazon-efs-utils
    mkdir -p /mnt/efs
    mount -t efs -o tls ${efs_id}:/ /mnt/efs
    echo "${efs_id}:/ /mnt/efs efs defaults,_netdev,tls" >> /etc/fstab
fi

# Install CVAT
mkdir -p /opt/cvat
cd /opt/cvat
git clone https://github.com/opencv/cvat.git .
docker-compose up -d

# Wait for CVAT to be ready
timeout 300 bash -c 'until curl -f http://localhost:8080/api/server/health; do sleep 5; done'

