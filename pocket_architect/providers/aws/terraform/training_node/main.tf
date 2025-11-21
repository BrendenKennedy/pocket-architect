terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

variable "aws_region" {
  description = "AWS region"
  type        = string
}

variable "subnet_id" {
  description = "Subnet ID for training node"
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

variable "instance_type" {
  description = "EC2 instance type (GPU instance for training)"
  type        = string
  default     = "p3.2xlarge"
}

variable "use_spot" {
  description = "Use EC2 Spot instances"
  type        = bool
  default     = true
}

variable "efs_id" {
  description = "EFS file system ID for shared data"
  type        = string
  default     = ""
}

# Data sources
data "aws_subnet" "target" {
  id = var.subnet_id
}

data "aws_vpc" "target" {
  id = data.aws_subnet.target.vpc_id
}

data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"]

  filter {
    name   = "name"
    values = ["ubuntu/images/hub/ubuntu-jammy-22.04-amd64-server-*"]
  }
}

# Security Group
resource "aws_security_group" "training" {
  name        = "pocket-architect-training-${var.session_id}"
  description = "Security group for pocket-architect training node"
  vpc_id      = data.aws_vpc.target.id

  ingress {
    description = "SSH from my IP"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.my_ip_cidr]
  }

  ingress {
    description = "Jupyter from my IP"
    from_port   = 8888
    to_port     = 8888
    protocol    = "tcp"
    cidr_blocks = [var.my_ip_cidr]
  }

  egress {
    description = "Allow all outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name      = "pocket-architect-training-${var.session_id}"
    CreatedBy = "pocket-architect"
    SessionID = var.session_id
  }
}

# IAM Role
resource "aws_iam_role" "training" {
  name = "pocket-architect-training-${var.session_id}"

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

resource "aws_iam_instance_profile" "training" {
  name = "pocket-architect-training-${var.session_id}"
  role = aws_iam_role.training.name
}

# EC2 Instance
resource "aws_instance" "training" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = var.instance_type

  subnet_id              = var.subnet_id
  vpc_security_group_ids = [aws_security_group.training.id]
  key_name               = var.ssh_key_name

  iam_instance_profile = aws_iam_instance_profile.training.name

  instance_market_options {
    market_type = var.use_spot ? "spot" : "on-demand"
    spot_options {
      spot_instance_type             = "one-time"
      instance_interruption_behavior = "terminate"
    }
  }

  user_data = base64encode(templatefile("${path.module}/user_data.sh", {
    efs_id = var.efs_id
  }))

  tags = {
    Name      = "pocket-architect-training-${var.session_id}"
    CreatedBy = "pocket-architect"
    SessionID = var.session_id
  }
}

output "instance_id" {
  description = "EC2 instance ID"
  value       = aws_instance.training.id
}

output "public_ip" {
  description = "Public IP address"
  value       = aws_instance.training.public_ip
}

