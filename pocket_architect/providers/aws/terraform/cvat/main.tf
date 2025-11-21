terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Variables
variable "aws_region" {
  description = "AWS region"
  type        = string
}

variable "subnet_id" {
  description = "Subnet ID for CVAT instance"
  type        = string
}

variable "ssh_key_name" {
  description = "EC2 Key Pair name"
  type        = string
}

variable "my_ip_cidr" {
  description = "Your IP address in CIDR notation"
  type        = string
}

variable "session_id" {
  description = "pocket-architect session ID"
  type        = string
}

variable "enable_https" {
  description = "Enable HTTPS with ALB"
  type        = bool
  default     = true
}

variable "domain_name" {
  description = "Domain name for HTTPS (required if enable_https = true)"
  type        = string
  default     = ""
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.xlarge"
}

variable "use_spot" {
  description = "Use EC2 Spot instances"
  type        = bool
  default     = true
}

variable "efs_enabled" {
  description = "Enable EFS for persistent storage"
  type        = bool
  default     = true
}

# Data sources
data "aws_subnet" "target" {
  id = var.subnet_id
}

data "aws_vpc" "target" {
  id = data.aws_subnet.target.vpc_id
}

data "aws_availability_zones" "available" {
  state = "available"
}

# Security Group for CVAT
resource "aws_security_group" "cvat" {
  name        = "pocket-architect-cvat-${var.session_id}"
  description = "Security group for pocket-architect CVAT instance"
  vpc_id      = data.aws_vpc.target.id

  ingress {
    description = "SSH from my IP"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.my_ip_cidr]
  }

  ingress {
    description     = "CVAT HTTP from ALB or direct"
    from_port       = 8080
    to_port         = 8080
    protocol        = "tcp"
    security_groups = var.enable_https ? [aws_security_group.alb[0].id] : []
    cidr_blocks     = var.enable_https ? [] : [var.my_ip_cidr]
  }

  egress {
    description = "Allow all outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name      = "pocket-architect-cvat-${var.session_id}"
    CreatedBy = "pocket-architect"
    SessionID = var.session_id
  }
}

# IAM Role for EC2 instance
resource "aws_iam_role" "cvat" {
  name = "pocket-architect-cvat-${var.session_id}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    CreatedBy = "pocket-architect"
    SessionID = var.session_id
  }
}

resource "aws_iam_instance_profile" "cvat" {
  name = "pocket-architect-cvat-${var.session_id}"
  role = aws_iam_role.cvat.name
}

# EFS File System
resource "aws_efs_file_system" "cvat" {
  count            = var.efs_enabled ? 1 : 0
  creation_token   = "pocket-architect-cvat-${var.session_id}"
  performance_mode = "generalPurpose"
  throughput_mode  = "bursting"

  tags = {
    Name      = "pocket-architect-cvat-${var.session_id}"
    CreatedBy = "pocket-architect"
    SessionID = var.session_id
  }
}

resource "aws_efs_mount_target" "cvat" {
  count           = var.efs_enabled ? length(data.aws_availability_zones.available.names) : 0
  file_system_id  = aws_efs_file_system.cvat[0].id
  subnet_id       = data.aws_subnet.target.id
  security_groups = [aws_security_group.efs[0].id]
}

resource "aws_security_group" "efs" {
  count       = var.efs_enabled ? 1 : 0
  name        = "pocket-architect-efs-${var.session_id}"
  description = "Security group for EFS"
  vpc_id      = data.aws_vpc.target.id

  ingress {
    description     = "NFS from CVAT instance"
    from_port       = 2049
    to_port         = 2049
    protocol        = "tcp"
    security_groups = [aws_security_group.cvat.id]
  }

  egress {
    description = "Allow all outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name      = "pocket-architect-efs-${var.session_id}"
    CreatedBy = "pocket-architect"
    SessionID = var.session_id
  }
}

# EC2 Instance for CVAT
resource "aws_instance" "cvat" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = var.instance_type

  subnet_id              = var.subnet_id
  vpc_security_group_ids = [aws_security_group.cvat.id]
  key_name               = var.ssh_key_name

  iam_instance_profile = aws_iam_instance_profile.cvat.name

  # Spot instance configuration
  instance_market_options {
    market_type = var.use_spot ? "spot" : "on-demand"
    spot_options {
      spot_instance_type             = "one-time"
      instance_interruption_behavior = "terminate"
    }
  }

  user_data = base64encode(templatefile("${path.module}/user_data.sh", {
    efs_id = var.efs_enabled ? aws_efs_file_system.cvat[0].id : ""
  }))

  tags = {
    Name      = "pocket-architect-cvat-${var.session_id}"
    CreatedBy = "pocket-architect"
    SessionID = var.session_id
  }

  lifecycle {
    create_before_destroy = true
  }
}

# Ubuntu 22.04 AMI
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hub/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# ALB for HTTPS (optional)
resource "aws_lb" "cvat" {
  count              = var.enable_https ? 1 : 0
  name               = "pocket-architect-cvat-${var.session_id}"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb[0].id]
  subnets            = [var.subnet_id]

  tags = {
    Name      = "pocket-architect-cvat-${var.session_id}"
    CreatedBy = "pocket-architect"
    SessionID = var.session_id
  }
}

resource "aws_security_group" "alb" {
  count       = var.enable_https ? 1 : 0
  name        = "pocket-architect-alb-${var.session_id}"
  description = "Security group for ALB"
  vpc_id      = data.aws_vpc.target.id

  ingress {
    description = "HTTPS from internet"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTP redirect to HTTPS"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description     = "Allow all outbound"
    from_port       = 0
    to_port         = 0
    protocol        = "-1"
    security_groups = [aws_security_group.cvat.id]
  }

  tags = {
    Name      = "pocket-architect-alb-${var.session_id}"
    CreatedBy = "pocket-architect"
    SessionID = var.session_id
  }
}

# Outputs
output "instance_id" {
  description = "EC2 instance ID"
  value       = aws_instance.cvat.id
}

output "public_ip" {
  description = "Public IP address"
  value       = aws_instance.cvat.public_ip
}

output "cvat_url" {
  description = "CVAT URL"
  value       = var.enable_https ? "https://${var.domain_name}" : "http://${aws_instance.cvat.public_ip}:8080"
}

output "efs_id" {
  description = "EFS file system ID"
  value       = var.efs_enabled ? aws_efs_file_system.cvat[0].id : ""
}

