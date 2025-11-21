variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-2"
}

variable "my_ip_cidr" {
  description = "Your IP address in CIDR notation (e.g., 1.2.3.4/32)"
  type        = string
}

variable "subnet_id" {
  description = "Subnet ID where the EC2 instance will be launched (must be in a public subnet with internet gateway)"
  type        = string
}

variable "elastic_ip_allocation_id" {
  description = "Optional Elastic IP allocation ID to associate with the instance. Leave empty to use auto-assigned public IP."
  type        = string
  default     = ""
}

variable "ssh_key_name" {
  description = "Name of the AWS EC2 Key Pair to use for SSH access"
  type        = string
}

variable "domain_name" {
  description = "Optional domain name for Route 53 DNS and ACM certificate. Leave empty to disable DNS/SSL setup."
  type        = string
  default     = ""
}

variable "root_volume_snapshot_id" {
  description = "Optional EBS snapshot ID to restore the root volume from. Leave empty or omit to create a fresh instance."
  type        = string
  default     = ""
}

variable "enable_alb" {
  description = "Enable Application Load Balancer with HTTPS/SSL. When disabled, Route 53 points directly to Elastic IP (HTTP only). Requires domain_name to be set. Set to false to save costs (~$16-22/month)."
  type        = bool
  default     = false
}

variable "enable_infrastructure" {
  description = "Enable all infrastructure (EC2 instances, ALB, etc.). When false, EC2 instances are stopped and ALB is destroyed. Set to false to save costs when not in use."
  type        = bool
  default     = true
}

