terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    null = {
      source  = "hashicorp/null"
      version = "~> 3.0"
    }
    external = {
      source  = "hashicorp/external"
      version = "~> 2.0"
    }
  }
}

provider "aws" {
  region  = var.aws_region
  profile = "terraform"
}

# Use existing subnet
data "aws_subnet" "target" {
  id = var.subnet_id
}

data "aws_vpc" "target" {
  id = data.aws_subnet.target.vpc_id
}

# Get available AZs in the region
data "aws_availability_zones" "vpc_azs" {
  state = "available"
  filter {
    name   = "region-name"
    values = [var.aws_region]
  }
}

# Find an AZ different from the target subnet's AZ
locals {
  target_az = data.aws_subnet.target.availability_zone
  # Get first AZ that's different from target subnet's AZ
  alternate_az = [
    for az in data.aws_availability_zones.vpc_azs.names :
    az if az != local.target_az
  ][0]
}

# Get Elastic IP details (only if allocation ID is provided)
data "aws_eip" "minimal" {
  count = var.elastic_ip_allocation_id != "" ? 1 : 0
  id    = var.elastic_ip_allocation_id
}

# Get Route 53 hosted zone for the domain (only if domain is provided)
data "aws_route53_zone" "main" {
  count        = var.domain_name != "" ? 1 : 0
  name         = var.domain_name
  private_zone = false
}

# Get availability zones for load balancer
data "aws_availability_zones" "available" {
  state = "available"
}

# Get Ubuntu 22.04 AMI
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# IAM Role for SSM Access
resource "aws_iam_role" "ec2_ssm_role" {
  name = "minimal-ec2-ssm-role"

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
}

resource "aws_iam_role_policy_attachment" "ssm_managed_instance_core" {
  role       = aws_iam_role.ec2_ssm_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_instance_profile" "ec2_ssm_profile" {
  name = "minimal-ec2-ssm-profile"
  role = aws_iam_role.ec2_ssm_role.name
}

# Security Group for CVAT UI server
resource "aws_security_group" "minimal" {
  name        = "cvat-ui-server"
  description = var.enable_alb ? "Security group for CVAT UI server (SSH from my IP only, web traffic ONLY from ALB)" : "Security group for CVAT UI server (SSH, CVAT UI, MLflow, n8n from my IP)"
  vpc_id      = data.aws_vpc.target.id

  # SSH access from your IP only (always allowed)
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.my_ip_cidr]
    description = "SSH from my IP only"
  }

  # Direct access from your IP (only when ALB is disabled)
  # When ALB is enabled, EC2 only accepts traffic from ALB security group
  dynamic "ingress" {
    for_each = var.enable_alb ? [] : [1]
    content {
      from_port   = 8080
      to_port     = 8080
      protocol    = "tcp"
      cidr_blocks = [var.my_ip_cidr]
      description = "CVAT UI HTTP from my IP only (direct access)"
    }
  }

  dynamic "ingress" {
    for_each = var.enable_alb ? [] : [1]
    content {
      from_port   = 5000
      to_port     = 5000
      protocol    = "tcp"
      cidr_blocks = [var.my_ip_cidr]
      description = "MLflow HTTP from my IP only (direct access)"
    }
  }

  dynamic "ingress" {
    for_each = var.enable_alb ? [] : [1]
    content {
      from_port   = 5678
      to_port     = 5678
      protocol    = "tcp"
      cidr_blocks = [var.my_ip_cidr]
      description = "n8n HTTP from my IP only (direct access)"
    }
  }

  # Allow traffic ONLY from ALB security group (when ALB is enabled)
  # This ensures EC2 is not directly exposed to the internet
  dynamic "ingress" {
    for_each = var.enable_infrastructure && var.enable_alb ? [1] : []
    content {
      from_port       = 8080
      to_port         = 8080
      protocol        = "tcp"
      security_groups = [aws_security_group.alb[0].id]
      description     = "CVAT UI HTTP from ALB only (hardened)"
    }
  }

  dynamic "ingress" {
    for_each = var.enable_infrastructure && var.enable_alb ? [1] : []
    content {
      from_port       = 5000
      to_port         = 5000
      protocol        = "tcp"
      security_groups = [aws_security_group.alb[0].id]
      description     = "MLflow HTTP from ALB only (hardened)"
    }
  }

  dynamic "ingress" {
    for_each = var.enable_infrastructure && var.enable_alb ? [1] : []
    content {
      from_port       = 5678
      to_port         = 5678
      protocol        = "tcp"
      security_groups = [aws_security_group.alb[0].id]
      description     = "n8n HTTP from ALB only (hardened)"
    }
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "All outbound"
  }

  tags = {
    Name = "cvat-ui-server"
  }

  lifecycle {
    create_before_destroy = false # Prevent replacement conflicts with name
    ignore_changes        = [description] # Allow description updates without replacement
  }
}

# Security Group for Application Load Balancer (only when enabled)
# NOTE: ALB must accept traffic from anywhere (0.0.0.0/0) to be publicly accessible
# Security hardening is done via:
# 1. SSL/TLS termination at ALB (HTTPS only)
# 2. EC2 only accepts traffic from ALB security group (not directly from internet)
# 3. Consider adding AWS WAF for additional protection (DDoS, SQL injection, etc.)
resource "aws_security_group" "alb" {
  count       = var.enable_alb ? 1 : 0
  name        = "cvat-ui-server-alb"
  description = "Security group for Application Load Balancer (HTTPS/HTTP from internet, forwards to EC2)"
  vpc_id      = data.aws_vpc.target.id

  lifecycle {
    create_before_destroy = false # Prevent replacement conflicts with name
    ignore_changes        = [description] # Allow description updates without replacement
  }

  # HTTPS from anywhere (required for public-facing ALB)
  # Traffic is encrypted and terminates at ALB
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTPS from internet (TLS terminates at ALB)"
  }

  # HTTP from anywhere (redirects to HTTPS)
  # Necessary for automatic redirect to HTTPS
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTP from internet (redirects to HTTPS)"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "All outbound"
  }

  tags = {
    Name = "cvat-ui-server-alb"
  }
}

# Get snapshot details if provided
data "aws_ebs_snapshot" "root_snapshot" {
  count        = var.root_volume_snapshot_id != "" ? 1 : 0
  snapshot_ids = [var.root_volume_snapshot_id]
}

# Check if AMI already exists for this snapshot (to avoid creating duplicates)
# Use external data source to safely check without causing errors
data "external" "ami_exists" {
  count = var.root_volume_snapshot_id != "" ? 1 : 0
  program = ["bash", "-c", <<-EOT
    AMI_NAME="minimal-from-snapshot-${substr(var.root_volume_snapshot_id, -8, -1)}"
    AMI_ID=$(aws ec2 describe-images \
      --owners self \
      --filters "Name=name,Values=$AMI_NAME" "Name=state,Values=available" \
      --query 'Images | sort_by(@, &CreationDate) | [-1].ImageId' \
      --output text \
      --region ${var.aws_region} 2>/dev/null || echo "")
    
    if [ -z "$AMI_ID" ] || [ "$AMI_ID" = "None" ]; then
      echo '{"exists":"false","ami_id":""}'
    else
      echo "{\"exists\":\"true\",\"ami_id\":\"$AMI_ID\"}"
    fi
  EOT
  ]
}

# Local values for AMI management
locals {
  ami_exists_result = var.root_volume_snapshot_id != "" ? data.external.ami_exists[0].result : { exists = "false", ami_id = "" }
  existing_ami_id   = local.ami_exists_result.exists == "true" ? local.ami_exists_result.ami_id : ""
  should_create_ami = var.root_volume_snapshot_id != "" && local.existing_ami_id == ""
}

# Create AMI from snapshot only if one doesn't already exist
# This prevents creating duplicate AMIs on every terraform apply
resource "aws_ami" "from_snapshot" {
  count = local.should_create_ami ? 1 : 0

  name                = "minimal-from-snapshot-${substr(var.root_volume_snapshot_id, -8, -1)}"
  virtualization_type = "hvm"
  root_device_name    = "/dev/sda1"
  architecture        = "x86_64"
  ena_support         = true # Required for t3.large instance type

  ebs_block_device {
    device_name = "/dev/sda1"
    snapshot_id = var.root_volume_snapshot_id
    # Don't specify volume_size here - it will use snapshot's size
    # We'll override it in the instance root_block_device
    volume_type           = "gp3"
    delete_on_termination = true
  }

  tags = {
    Name              = "minimal-checkpoint"
    SnapshotID        = var.root_volume_snapshot_id
    CheckpointPurpose = "CVAT Workstation"
  }

  lifecycle {
    # Only recreate if snapshot_id changes (which will happen when you update tfvars)
    create_before_destroy = true
  }
}

# Local value to get the AMI ID (either existing or newly created)
locals {
  snapshot_ami_id = var.root_volume_snapshot_id != "" ? (
    local.existing_ami_id != "" ? local.existing_ami_id : aws_ami.from_snapshot[0].id
  ) : null
}

# EC2 Instance (always created, but can be stopped when infrastructure disabled)
resource "aws_instance" "minimal" {
  # Use AMI from snapshot if provided, otherwise use Ubuntu AMI
  ami           = var.root_volume_snapshot_id != "" ? local.snapshot_ami_id : data.aws_ami.ubuntu.id
  instance_type = "t3.xlarge"
  subnet_id     = data.aws_subnet.target.id

  vpc_security_group_ids      = [aws_security_group.minimal.id]
  associate_public_ip_address = true
  iam_instance_profile        = aws_iam_instance_profile.ec2_ssm_profile.name
  key_name = var.ssh_key_name

  # Root block device configuration
  # When using snapshot: volume_size uses snapshot's size (can only increase, not decrease)
  # When fresh instance: volume_size is 60GB
  root_block_device {
    volume_size = var.root_volume_snapshot_id != "" ? data.aws_ebs_snapshot.root_snapshot[0].volume_size : 60
    volume_type = "gp3"
  }

  # Automatically remove old SSH host key when instance is created/replaced
  provisioner "local-exec" {
    command = var.elastic_ip_allocation_id != "" ? "ssh-keygen -R ${data.aws_eip.minimal[0].public_ip} 2>/dev/null && echo '✓ Removed old SSH host key for ${data.aws_eip.minimal[0].public_ip}' || echo 'No existing host key found for ${data.aws_eip.minimal[0].public_ip}'" : "ssh-keygen -R ${self.public_ip} 2>/dev/null && echo '✓ Removed old SSH host key for ${self.public_ip}' || echo 'No existing host key found for ${self.public_ip}'"
  }

  tags = {
    Name = "minimal-instance"
  }

  lifecycle {
    # Don't prevent destroy - allows instance to be recreated when AMI changes
    # Instance data is preserved in snapshots, so recreation is safe
    # Use ./down.sh to stop instead of destroy
  }
}

# Control EC2 instance start/stop based on enable_infrastructure
resource "null_resource" "instance_control" {
  # Trigger when enable_infrastructure changes or instance is created
  triggers = {
    enable_infrastructure = var.enable_infrastructure ? "true" : "false"
    instance_id           = aws_instance.minimal.id
    aws_region            = var.aws_region
  }

  # Start or stop instance based on enable_infrastructure
  # This runs when the resource is created or recreated (when triggers change)
  provisioner "local-exec" {
    command = <<-EOT
      if [ "${var.enable_infrastructure}" = "true" ]; then
        echo "🚀 Starting EC2 instance ${aws_instance.minimal.id}..."
        aws ec2 start-instances --instance-ids ${aws_instance.minimal.id} --region ${var.aws_region} 2>/dev/null || true
        aws ec2 wait instance-running --instance-ids ${aws_instance.minimal.id} --region ${var.aws_region} 2>/dev/null || true
        echo "✅ Instance is running"
      else
        echo "🛑 Stopping EC2 instance ${aws_instance.minimal.id}..."
        aws ec2 stop-instances --instance-ids ${aws_instance.minimal.id} --region ${var.aws_region} 2>/dev/null || true
        aws ec2 wait instance-stopped --instance-ids ${aws_instance.minimal.id} --region ${var.aws_region} 2>/dev/null || true
        echo "✅ Instance is stopped"
      fi
    EOT
  }
}

# Associate existing Elastic IP (only if allocation ID is provided)
resource "aws_eip_association" "minimal" {
  count        = var.elastic_ip_allocation_id != "" ? 1 : 0
  allocation_id = var.elastic_ip_allocation_id
  instance_id   = aws_instance.minimal.id

  # Automatically remove old SSH host key when instance is replaced
  provisioner "local-exec" {
    command = "ssh-keygen -R ${data.aws_eip.minimal[0].public_ip} 2>/dev/null || true"
  }
}

# ACM Certificate - Free SSL/TLS certificate with wildcard for subdomains (only when ALB enabled, infrastructure is up, and domain is provided)
resource "aws_acm_certificate" "main" {
  count                     = var.enable_infrastructure && var.enable_alb && var.domain_name != "" ? 1 : 0
  domain_name               = var.domain_name
  subject_alternative_names = ["*.${var.domain_name}"]
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name = "${var.domain_name}-certificate"
  }
}

# Route 53 validation record for ACM certificate (only when ALB enabled, infrastructure is up, and domain is provided)
resource "aws_route53_record" "cert_validation" {
  for_each = var.enable_infrastructure && var.enable_alb && var.domain_name != "" ? {
    for dvo in aws_acm_certificate.main[0].domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  } : {}

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = data.aws_route53_zone.main[0].zone_id
}

# Validate ACM certificate (only when ALB enabled, infrastructure is up, and domain is provided)
resource "aws_acm_certificate_validation" "main" {
  count                   = var.enable_infrastructure && var.enable_alb && var.domain_name != "" ? 1 : 0
  certificate_arn         = aws_acm_certificate.main[0].arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
}

# Get all subnets in the VPC for load balancer (need at least 2 in different AZs)
data "aws_subnets" "vpc_subnets" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.target.id]
  }
}

# Get subnet details to find one in a different AZ
data "aws_subnet" "vpc_subnets" {
  for_each = toset(data.aws_subnets.vpc_subnets.ids)
  id       = each.value
}

# Find subnets in different AZs for ALB
locals {
  # Get all subnets grouped by AZ
  subnets_by_az = {
    for subnet_id, subnet in data.aws_subnet.vpc_subnets :
    subnet.availability_zone => subnet_id...
  }
  
  # Get unique AZs from existing subnets
  availability_zones = keys(local.subnets_by_az)
  
  # Count unique AZs from existing subnets
  # This will include alternate subnet if it already exists, so we need to check before creating it
  # If alternate subnet exists, we'll have 2+ AZs, so we don't need to create it
  # If it doesn't exist and we only have 1 AZ, we need to create it
  unique_az_count = length(local.availability_zones)
  
  # Check if we need alternate subnet: create if we have < 2 AZs (not counting alternate we might create)
  # We check this by seeing if we have exactly 1 AZ and it's the target subnet's AZ
  needs_alternate_subnet = length(local.availability_zones) < 2 && !contains(local.availability_zones, local.alternate_az)
  
  # Get all subnets grouped by AZ (including alternate if it exists or will be created)
  all_subnets_by_az = merge(
    local.subnets_by_az,
    length(aws_subnet.alb_alternate) > 0 ? {
      (aws_subnet.alb_alternate[0].availability_zone) = concat(
        try(local.subnets_by_az[aws_subnet.alb_alternate[0].availability_zone], []),
        [aws_subnet.alb_alternate[0].id]
      )
    } : {}
  )

  # Final list of AZs including alternate if it exists or will be created
  final_availability_zones = distinct(concat(
    local.availability_zones,
    length(aws_subnet.alb_alternate) > 0 ? [aws_subnet.alb_alternate[0].availability_zone] : []
  ))

  # Get subnets from first two different AZs
  # ALB requires at least 2 subnets in 2 different AZs
  # Only evaluate when ALB is enabled (to avoid referencing non-existent resources)
  alb_subnets = var.enable_alb && var.enable_infrastructure ? (
    length(local.final_availability_zones) >= 2 ? concat(
      [local.all_subnets_by_az[local.final_availability_zones[0]][0]],
      [local.all_subnets_by_az[local.final_availability_zones[1]][0]]
    ) : (
      # If only one subnet/AZ exists, use alternate subnet if it exists or will be created
      length(aws_subnet.alb_alternate) > 0 ? [
        data.aws_subnet.target.id,
        aws_subnet.alb_alternate[0].id
      ] : [
        data.aws_subnet.target.id,
        data.aws_subnet.target.id
      ]
    )
  ) : []
  
  # For the condition: create alternate subnet if we have < 2 AZs OR if it already exists (keep it)
  # We check unique AZs - if alternate already exists, count will be 2+, so we keep it
  # If alternate doesn't exist yet, count will be 1, so we create it
  should_create_alternate = local.unique_az_count < 2
}

# Get the main route table for the VPC (usually for public subnets)
data "aws_route_tables" "vpc_route_tables" {
  vpc_id = data.aws_vpc.target.id
  filter {
    name   = "association.main"
    values = ["true"]
  }
}

# Get route table details
data "aws_route_table" "main" {
  count          = length(data.aws_route_tables.vpc_route_tables.ids) > 0 ? 1 : 0
  route_table_id = data.aws_route_tables.vpc_route_tables.ids[0]
}

# Create a subnet in a different AZ for ALB (if needed and ALB is enabled and infrastructure is up)
# Create if ALB is enabled - we need at least 2 AZs for ALB
# Check if we have fewer than 2 AZs from existing subnets (excluding alternate)
# Once alternate is created, it will appear in data.aws_subnets, so we need to exclude it
# from the count check, or just always create it if ALB is enabled and it doesn't exist
resource "aws_subnet" "alb_alternate" {
  count             = var.enable_infrastructure && var.enable_alb ? 1 : 0
  vpc_id            = data.aws_vpc.target.id
  cidr_block        = cidrsubnet(data.aws_vpc.target.cidr_block, 8, 200)
  availability_zone = local.alternate_az

  map_public_ip_on_launch = true

  tags = {
    Name = "cvat-alb-alternate-subnet"
  }
}

# Associate the new subnet with the main route table (for internet access)
resource "aws_route_table_association" "alb_alternate" {
  count          = var.enable_infrastructure && var.enable_alb && length(aws_subnet.alb_alternate) > 0 && length(data.aws_route_tables.vpc_route_tables.ids) > 0 ? 1 : 0
  subnet_id      = aws_subnet.alb_alternate[0].id
  route_table_id = data.aws_route_table.main[0].route_table_id
}

# Application Load Balancer (only when enabled and infrastructure is up)
resource "aws_lb" "main" {
  count              = var.enable_infrastructure && var.enable_alb ? 1 : 0
  name               = "cvat-ui-server-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb[0].id]
  subnets            = local.alb_subnets

  enable_deletion_protection = false

  tags = {
    Name = "cvat-ui-server-alb"
  }
}

# Target Group for CVAT UI (port 8080) - only when ALB enabled and infrastructure is up
resource "aws_lb_target_group" "cvat_ui" {
  count    = var.enable_infrastructure && var.enable_alb ? 1 : 0
  name     = "cvat-ui-tg"
  port     = 8080
  protocol = "HTTP"
  vpc_id   = data.aws_vpc.target.id

  health_check {
    enabled             = true
    healthy_threshold   = 2
    unhealthy_threshold = 2
    timeout             = 5
    interval            = 30
    path                = "/"
    protocol            = "HTTP"
    matcher             = "200"
  }

  tags = {
    Name = "cvat-ui-target-group"
  }
}

# Target Group for MLflow (port 5000) - only when ALB enabled and infrastructure is up
resource "aws_lb_target_group" "mlflow" {
  count    = var.enable_infrastructure && var.enable_alb ? 1 : 0
  name     = "mlflow-tg"
  port     = 5000
  protocol = "HTTP"
  vpc_id   = data.aws_vpc.target.id

  health_check {
    enabled             = true
    healthy_threshold   = 2
    unhealthy_threshold = 2
    timeout             = 5
    interval            = 30
    path                = "/"
    protocol            = "HTTP"
    matcher             = "200"
  }

  tags = {
    Name = "mlflow-target-group"
  }
}

# Target Group for n8n (port 5678) - only when ALB enabled and infrastructure is up
resource "aws_lb_target_group" "n8n" {
  count    = var.enable_infrastructure && var.enable_alb ? 1 : 0
  name     = "n8n-tg"
  port     = 5678
  protocol = "HTTP"
  vpc_id   = data.aws_vpc.target.id

  health_check {
    enabled             = true
    healthy_threshold   = 2
    unhealthy_threshold = 2
    timeout             = 5
    interval            = 30
    path                = "/"
    protocol            = "HTTP"
    matcher             = "200"
  }

  tags = {
    Name = "n8n-target-group"
  }
}

# Attach EC2 instance to target groups (only when ALB enabled and infrastructure is up)
resource "aws_lb_target_group_attachment" "cvat_ui" {
  count            = var.enable_infrastructure && var.enable_alb ? 1 : 0
  target_group_arn = aws_lb_target_group.cvat_ui[0].arn
  target_id        = aws_instance.minimal.id
  port             = 8080
}

resource "aws_lb_target_group_attachment" "mlflow" {
  count            = var.enable_infrastructure && var.enable_alb ? 1 : 0
  target_group_arn = aws_lb_target_group.mlflow[0].arn
  target_id        = aws_instance.minimal.id
  port             = 5000
}

resource "aws_lb_target_group_attachment" "n8n" {
  count            = var.enable_infrastructure && var.enable_alb ? 1 : 0
  target_group_arn = aws_lb_target_group.n8n[0].arn
  target_id        = aws_instance.minimal.id
  port             = 5678
}

# ALB Listener - HTTPS (port 443) - only when ALB enabled, infrastructure is up, and domain is provided
resource "aws_lb_listener" "https" {
  count             = var.enable_infrastructure && var.enable_alb && var.domain_name != "" ? 1 : 0
  load_balancer_arn = aws_lb.main[0].arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = aws_acm_certificate_validation.main[0].certificate_arn

  # Default action: return 404 (only /cvat path and subdomain are routed)
  default_action {
    type = "fixed-response"
    fixed_response {
      content_type = "text/plain"
      message_body = var.domain_name != "" ? "Service not found. Use /cvat path or cvat.${var.domain_name} subdomain" : "Service not found"
      status_code  = "404"
    }
  }
}

# ALB Listener Rule - CVAT UI via path /cvat* (only when ALB enabled, infrastructure is up, and domain is provided)
resource "aws_lb_listener_rule" "cvat_path" {
  count        = var.enable_infrastructure && var.enable_alb && var.domain_name != "" ? 1 : 0
  listener_arn = aws_lb_listener.https[0].arn
  priority     = 100

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.cvat_ui[0].arn
  }

  condition {
    path_pattern {
      values = ["/cvat*", "/cvat"]
    }
  }

  condition {
    host_header {
      values = [var.domain_name, "www.${var.domain_name}"]
    }
  }
}

# ALB Listener Rule - CVAT UI via subdomain cvat.* (only when ALB enabled, infrastructure is up, and domain is provided)
resource "aws_lb_listener_rule" "cvat_subdomain" {
  count        = var.enable_infrastructure && var.enable_alb && var.domain_name != "" ? 1 : 0
  listener_arn = aws_lb_listener.https[0].arn
  priority     = 200

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.cvat_ui[0].arn
  }

  condition {
    host_header {
      values = ["cvat.${var.domain_name}"]
    }
  }
}

# ALB Listener Rule - MLflow via subdomain mlflow.* (only when ALB enabled, infrastructure is up, and domain is provided)
resource "aws_lb_listener_rule" "mlflow_subdomain" {
  count        = var.enable_infrastructure && var.enable_alb && var.domain_name != "" ? 1 : 0
  listener_arn = aws_lb_listener.https[0].arn
  priority     = 300

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.mlflow[0].arn
  }

  condition {
    host_header {
      values = ["mlflow.${var.domain_name}"]
    }
  }
}

# ALB Listener Rule - n8n via subdomain n8n.* (only when ALB enabled, infrastructure is up, and domain is provided)
resource "aws_lb_listener_rule" "n8n_subdomain" {
  count        = var.enable_infrastructure && var.enable_alb && var.domain_name != "" ? 1 : 0
  listener_arn = aws_lb_listener.https[0].arn
  priority     = 400

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.n8n[0].arn
  }

  condition {
    host_header {
      values = ["n8n.${var.domain_name}"]
    }
  }
}

# Optional: ALB Listener Rules for other services (commented out - uncomment if needed)

# ALB Listener Rule - MLflow (if you want /mlflow* path to go to MLflow)
# resource "aws_lb_listener_rule" "mlflow" {
#   listener_arn = aws_lb_listener.https.arn
#   priority     = 300
#
#   action {
#     type             = "forward"
#     target_group_arn = aws_lb_target_group.mlflow.arn
#   }
#
#   condition {
#     path_pattern {
#       values = ["/mlflow*"]
#     }
#   }
# }

# ALB Listener Rule - n8n (if you want /n8n* path to go to n8n)
# resource "aws_lb_listener_rule" "n8n" {
#   listener_arn = aws_lb_listener.https.arn
#   priority     = 400
#
#   action {
#     type             = "forward"
#     target_group_arn = aws_lb_target_group.n8n.arn
#   }
#
#   condition {
#     path_pattern {
#       values = ["/n8n*"]
#     }
#   }
# }

# ALB Listener - HTTP (port 80) - Redirect to HTTPS (only when ALB enabled, infrastructure is up, and domain is provided)
resource "aws_lb_listener" "http" {
  count             = var.enable_infrastructure && var.enable_alb && var.domain_name != "" ? 1 : 0
  load_balancer_arn = aws_lb.main[0].arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type = "redirect"

    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

# Route 53 DNS record - point domain to Load Balancer (when ALB enabled) or Elastic IP (when disabled)
# Only created if domain_name is provided
resource "aws_route53_record" "main" {
  count   = var.domain_name != "" ? 1 : 0
  zone_id = data.aws_route53_zone.main[0].zone_id
  name    = var.domain_name
  type    = "A"

  dynamic "alias" {
    for_each = var.enable_infrastructure && var.enable_alb ? [1] : []
    content {
      name                   = aws_lb.main[0].dns_name
      zone_id                = aws_lb.main[0].zone_id
      evaluate_target_health = true
    }
  }

  records = (var.enable_infrastructure && var.enable_alb) ? null : (var.elastic_ip_allocation_id != "" ? [data.aws_eip.minimal[0].public_ip] : [aws_instance.minimal.public_ip])
  ttl     = (var.enable_infrastructure && var.enable_alb) ? null : 300
}

# Route 53 DNS record - point CVAT subdomain to Load Balancer (when ALB enabled) or Elastic IP (when disabled)
# Only created if domain_name is provided
resource "aws_route53_record" "cvat_subdomain" {
  count   = var.domain_name != "" ? 1 : 0
  zone_id = data.aws_route53_zone.main[0].zone_id
  name    = "cvat.${var.domain_name}"
  type    = "A"

  dynamic "alias" {
    for_each = var.enable_infrastructure && var.enable_alb ? [1] : []
    content {
      name                   = aws_lb.main[0].dns_name
      zone_id                = aws_lb.main[0].zone_id
      evaluate_target_health = true
    }
  }

  records = (var.enable_infrastructure && var.enable_alb) ? null : (var.elastic_ip_allocation_id != "" ? [data.aws_eip.minimal[0].public_ip] : [aws_instance.minimal.public_ip])
  ttl     = (var.enable_infrastructure && var.enable_alb) ? null : 300
}

# Route 53 DNS record - point MLflow subdomain to Load Balancer (when ALB enabled) or Elastic IP (when disabled)
# Only created if domain_name is provided
resource "aws_route53_record" "mlflow_subdomain" {
  count   = var.domain_name != "" ? 1 : 0
  zone_id = data.aws_route53_zone.main[0].zone_id
  name    = "mlflow.${var.domain_name}"
  type    = "A"

  dynamic "alias" {
    for_each = var.enable_infrastructure && var.enable_alb ? [1] : []
    content {
      name                   = aws_lb.main[0].dns_name
      zone_id                = aws_lb.main[0].zone_id
      evaluate_target_health = true
    }
  }

  records = (var.enable_infrastructure && var.enable_alb) ? null : (var.elastic_ip_allocation_id != "" ? [data.aws_eip.minimal[0].public_ip] : [aws_instance.minimal.public_ip])
  ttl     = (var.enable_infrastructure && var.enable_alb) ? null : 300
}

# Route 53 DNS record - point n8n subdomain to Load Balancer (when ALB enabled) or Elastic IP (when disabled)
# Only created if domain_name is provided
resource "aws_route53_record" "n8n_subdomain" {
  count   = var.domain_name != "" ? 1 : 0
  zone_id = data.aws_route53_zone.main[0].zone_id
  name    = "n8n.${var.domain_name}"
  type    = "A"

  dynamic "alias" {
    for_each = var.enable_infrastructure && var.enable_alb ? [1] : []
    content {
      name                   = aws_lb.main[0].dns_name
      zone_id                = aws_lb.main[0].zone_id
      evaluate_target_health = true
    }
  }

  records = (var.enable_infrastructure && var.enable_alb) ? null : (var.elastic_ip_allocation_id != "" ? [data.aws_eip.minimal[0].public_ip] : [aws_instance.minimal.public_ip])
  ttl     = (var.enable_infrastructure && var.enable_alb) ? null : 300
}

# Outputs
output "instance_id" {
  description = "EC2 instance ID"
  value       = aws_instance.minimal.id
}

output "public_ip" {
  description = "Public IP address of the instance"
  value       = aws_instance.minimal.public_ip
}

output "domain_name" {
  description = "Domain name pointing to the load balancer (only when domain_name is provided)"
  value       = var.domain_name != "" && length(aws_route53_record.main) > 0 ? aws_route53_record.main[0].fqdn : null
}

output "load_balancer_dns" {
  description = "DNS name of the Application Load Balancer (only when ALB enabled and infrastructure is up)"
  value       = var.enable_infrastructure && var.enable_alb ? aws_lb.main[0].dns_name : null
}

output "certificate_arn" {
  description = "ARN of the ACM certificate (only when ALB enabled, infrastructure is up, and domain_name is provided)"
  value       = var.enable_infrastructure && var.enable_alb && var.domain_name != "" ? aws_acm_certificate_validation.main[0].certificate_arn : null
}

output "https_url" {
  description = "HTTPS URL for the application (only when ALB enabled, infrastructure is up, and domain_name is provided)"
  value       = var.enable_infrastructure && var.enable_alb && var.domain_name != "" && length(aws_route53_record.main) > 0 ? "https://${aws_route53_record.main[0].fqdn}" : null
}

output "http_url" {
  description = "HTTP URL when ALB is disabled or infrastructure is down (points directly to IP)"
  value = var.enable_infrastructure && var.enable_alb ? null : (
    var.elastic_ip_allocation_id != "" ? "http://${data.aws_eip.minimal[0].public_ip}:8080 (CVAT), http://${data.aws_eip.minimal[0].public_ip}:5000 (MLflow), http://${data.aws_eip.minimal[0].public_ip}:5678 (n8n)" : "http://${aws_instance.minimal.public_ip}:8080 (CVAT), http://${aws_instance.minimal.public_ip}:5000 (MLflow), http://${aws_instance.minimal.public_ip}:5678 (n8n)"
  )
}

output "infrastructure_status" {
  description = "Current infrastructure status"
  value       = var.enable_infrastructure ? "UP (EC2 running, ALB: ${var.enable_alb ? "enabled" : "disabled"})" : "DOWN (EC2 stopped, ALB destroyed)"
}

output "cvat_url_subdomain" {
  description = "CVAT URL via subdomain routing (only when domain_name is provided)"
  value = var.domain_name != "" ? (
    var.enable_infrastructure && var.enable_alb ? "https://cvat.${var.domain_name}" : "http://cvat.${var.domain_name}:8080"
  ) : (
    var.elastic_ip_allocation_id != "" ? "http://${data.aws_eip.minimal[0].public_ip}:8080" : "http://${aws_instance.minimal.public_ip}:8080"
  )
}

output "mlflow_url_subdomain" {
  description = "MLflow URL via subdomain routing (only when domain_name is provided)"
  value = var.domain_name != "" ? (
    var.enable_infrastructure && var.enable_alb ? "https://mlflow.${var.domain_name}" : "http://mlflow.${var.domain_name}:5000"
  ) : (
    var.elastic_ip_allocation_id != "" ? "http://${data.aws_eip.minimal[0].public_ip}:5000" : "http://${aws_instance.minimal.public_ip}:5000"
  )
}

output "n8n_url_subdomain" {
  description = "n8n URL via subdomain routing (only when domain_name is provided)"
  value = var.domain_name != "" ? (
    var.enable_infrastructure && var.enable_alb ? "https://n8n.${var.domain_name}" : "http://n8n.${var.domain_name}:5678"
  ) : (
    var.elastic_ip_allocation_id != "" ? "http://${data.aws_eip.minimal[0].public_ip}:5678" : "http://${aws_instance.minimal.public_ip}:5678"
  )
}

