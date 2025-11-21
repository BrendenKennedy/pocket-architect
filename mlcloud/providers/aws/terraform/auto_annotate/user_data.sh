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

# Install Python and ML frameworks for auto-annotation
apt-get install -y python3 python3-pip
pip3 install torch torchvision ultralytics segment-anything-2 groundingdino detectron2

# Auto-annotation service will be started by mlcloud

