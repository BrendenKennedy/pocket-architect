#!/bin/bash
# DEPRECATED: This script is deprecated. Please use: python scripts/cvat.py setup
# This script will be removed in a future version.
#
# Interactive setup script for CVAT Infrastructure
# Collects all required values and sets up Terraform configuration

set -e

# Show deprecation warning
echo "⚠️  WARNING: This shell script is deprecated!" >&2
echo "   Please use: python scripts/cvat.py setup" >&2
echo "   This script will be removed in a future version." >&2
echo "" >&2
read -p "   Continue with shell script anyway? (y/N): " CONTINUE
if [[ ! "$CONTINUE" =~ ^[Yy]$ ]]; then
  echo "   Exiting. Please use: python scripts/cvat.py setup"
  exit 0
fi
echo ""

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Get project root (one level up from scripts/)
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
# Terraform directory
TERRAFORM_DIR="$PROJECT_ROOT/terraform"
cd "$TERRAFORM_DIR"

# Check if terraform.tfvars already exists
IMPORT_ONLY=false
HAS_EXISTING_RESOURCES=false

if [ -f "$PROJECT_ROOT/configs/terraform.tfvars" ]; then
  echo "✅ configs/terraform.tfvars already exists!"
  echo ""
  
  # Ensure symlink exists
  if [ ! -f "$TERRAFORM_DIR/terraform.tfvars" ]; then
    ln -sf ../configs/terraform.tfvars "$TERRAFORM_DIR/terraform.tfvars"
  fi
  
  # Try to get region and subnet from existing file to check for resources
  EXISTING_REGION=$(grep -E "^aws_region" "$PROJECT_ROOT/configs/terraform.tfvars" 2>/dev/null | sed 's/.*= *"\([^"]*\)".*/\1/' || echo "us-east-2")
  EXISTING_SUBNET=$(grep -E "^subnet_id" "$PROJECT_ROOT/configs/terraform.tfvars" 2>/dev/null | sed 's/.*= *"\([^"]*\)".*/\1/' || echo "")
  
  # Check for existing resources if we have subnet info
  if [ -n "$EXISTING_SUBNET" ]; then
    EXISTING_VPC=$(aws ec2 describe-subnets --subnet-ids "$EXISTING_SUBNET" --region "$EXISTING_REGION" --query 'Subnets[0].VpcId' --output text 2>/dev/null || echo "")
    
    if [ -n "$EXISTING_VPC" ] && [ "$EXISTING_VPC" != "None" ]; then
      # Quick check for common resources
      if aws iam get-role --role-name "cvat-ec2-ssm-role" >/dev/null 2>&1 || \
         aws ec2 describe-security-groups --filters "Name=group-name,Values=cvat-ui-server" "Name=vpc-id,Values=$EXISTING_VPC" --region "$EXISTING_REGION" --query 'SecurityGroups[0].GroupId' --output text 2>/dev/null | grep -q "sg-" || \
         aws ec2 describe-addresses --filters "Name=tag:Name,Values=cvat-ui-ssh-ip" --region "$EXISTING_REGION" --query 'Addresses[0].AllocationId' --output text 2>/dev/null | grep -q "eipalloc-"; then
        HAS_EXISTING_RESOURCES=true
      fi
    fi
  fi
  
  # If we found existing resources, ask about importing first
  if [ "$HAS_EXISTING_RESOURCES" = "true" ]; then
    read -p "   Found existing AWS resources. Would you like to import them into Terraform state? (Y/n): " IMPORT
    if [[ ! "$IMPORT" =~ ^[Nn]$ ]]; then
      IMPORT_ONLY=true
    else
      # If they don't want to import, ask about overwriting
      echo ""
      read -p "   Do you want to overwrite configs/terraform.tfvars? (y/N): " OVERWRITE
      if [[ ! "$OVERWRITE" =~ ^[Yy]$ ]]; then
        echo "   Exiting (no changes made)"
        exit 0
      fi
      # Will continue to create new config
      IMPORT_ONLY=false
    fi
  else
    # No existing resources found, ask about overwriting
    read -p "   Do you want to overwrite configs/terraform.tfvars? (y/N): " OVERWRITE
    if [[ ! "$OVERWRITE" =~ ^[Yy]$ ]]; then
      echo "   Keeping existing configs/terraform.tfvars"
      echo ""
      read -p "   Would you like to check for and import existing resources? (Y/n): " IMPORT
      if [[ "$IMPORT" =~ ^[Nn]$ ]]; then
        echo "   Exiting (no changes made)"
        exit 0
      fi
      IMPORT_ONLY=true
    else
      echo "   Will create new configs/terraform.tfvars"
      echo ""
    fi
  fi
fi

# Show title if we're creating a new config (not importing only)
if [ "$IMPORT_ONLY" != "true" ]; then
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "🚀 CVAT Infrastructure Setup"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "📋 Let's collect the required configuration values..."
  echo ""

  # AWS Region
  echo "1️⃣  AWS Region"
  echo "   Default: us-east-2"
  read -p "   Enter AWS region: " AWS_REGION
  AWS_REGION=${AWS_REGION:-us-east-2}
  echo "   ✅ Using region: $AWS_REGION"
  echo ""

  # Subnet ID
  echo "2️⃣  Subnet ID (REQUIRED)"
  echo "   This must be a public subnet with an Internet Gateway"
  echo "   Find it in: AWS Console → VPC → Subnets"
  echo "   Format: subnet-xxxxxxxxxxxxxxxxx"
  while [ -z "$SUBNET_ID" ]; do
    read -p "   Enter subnet ID: " SUBNET_ID
    if [ -z "$SUBNET_ID" ]; then
      echo "   ❌ Subnet ID is required!"
    elif [[ ! "$SUBNET_ID" =~ ^subnet- ]]; then
      echo "   ⚠️  Warning: Subnet ID should start with 'subnet-'"
      read -p "   Continue anyway? (y/N): " CONTINUE
      if [[ ! "$CONTINUE" =~ ^[Yy]$ ]]; then
        SUBNET_ID=""
      fi
    fi
  done
  echo "   ✅ Subnet ID: $SUBNET_ID"
  echo ""

  # Validate subnet exists and get VPC ID
  echo "   🔍 Validating subnet..."
  VPC_ID=$(aws ec2 describe-subnets --subnet-ids "$SUBNET_ID" --region "$AWS_REGION" --query 'Subnets[0].VpcId' --output text 2>/dev/null || echo "")
  if [ -z "$VPC_ID" ] || [ "$VPC_ID" = "None" ]; then
    echo "   ❌ Error: Could not find subnet $SUBNET_ID in region $AWS_REGION"
    echo "   Please verify the subnet ID and AWS credentials"
    exit 1
  fi
  echo "   ✅ Found subnet in VPC: $VPC_ID"
  echo ""

  # SSH Key Name
  echo "3️⃣  EC2 Key Pair Name (REQUIRED)"
  echo "   This is the name of an existing EC2 Key Pair"
  echo "   Find it in: AWS Console → EC2 → Key Pairs"
  echo "   Or create one: EC2 → Key Pairs → Create Key Pair"
  while [ -z "$SSH_KEY_NAME" ]; do
    read -p "   Enter SSH key pair name: " SSH_KEY_NAME
    if [ -z "$SSH_KEY_NAME" ]; then
      echo "   ❌ SSH key pair name is required!"
    fi
  done
  echo "   ✅ SSH key name: $SSH_KEY_NAME"
  echo ""

  # Validate key pair exists
  echo "   🔍 Validating key pair..."
  if ! aws ec2 describe-key-pairs --key-names "$SSH_KEY_NAME" --region "$AWS_REGION" >/dev/null 2>&1; then
    echo "   ⚠️  Warning: Key pair '$SSH_KEY_NAME' not found in region $AWS_REGION"
    echo "   You may need to create it first, or it may be in a different region"
    read -p "   Continue anyway? (y/N): " CONTINUE
    if [[ ! "$CONTINUE" =~ ^[Yy]$ ]]; then
      exit 1
    fi
  else
    echo "   ✅ Key pair found"
  fi
  echo ""

  # Public IP
  echo "4️⃣  Your Public IP Address (REQUIRED)"
  echo "   This is used to restrict SSH and service access to your IP only"
  echo "   We'll try to detect it automatically..."
  DETECTED_IP=$(curl -s ifconfig.me 2>/dev/null || echo "")
  if [ -n "$DETECTED_IP" ]; then
    echo "   Detected IP: $DETECTED_IP"
    read -p "   Use detected IP? (Y/n): " USE_DETECTED
    if [[ ! "$USE_DETECTED" =~ ^[Nn]$ ]]; then
      MY_IP_CIDR="${DETECTED_IP}/32"
    else
      read -p "   Enter your public IP address: " MANUAL_IP
      MY_IP_CIDR="${MANUAL_IP}/32"
    fi
  else
    read -p "   Enter your public IP address: " MANUAL_IP
    MY_IP_CIDR="${MANUAL_IP}/32"
  fi
  echo "   ✅ Using IP: $MY_IP_CIDR"
  echo ""

  # Note: Elastic IP is automatically created by Terraform for SSH access
  echo "5️⃣  Elastic IP"
  echo "   ✅ Elastic IP will be automatically created for SSH access"
  echo "   This provides a static IP that persists across instance replacements"
  echo ""

  # Optional: Domain Name
  echo "6️⃣  Domain Name (OPTIONAL)"
  echo "   Required only if you want DNS/SSL setup"
  echo "   Must have a Route 53 hosted zone for this domain"
  read -p "   Enter domain name (or press Enter to skip): " DOMAIN_NAME
  if [ -n "$DOMAIN_NAME" ]; then
    echo "   ✅ Domain: $DOMAIN_NAME"
    # Check if hosted zone exists
    echo "   🔍 Checking for Route 53 hosted zone..."
    if aws route53 list-hosted-zones-by-name --dns-name "$DOMAIN_NAME" --query "HostedZones[?Name=='${DOMAIN_NAME}.']" --output text --region "$AWS_REGION" >/dev/null 2>&1; then
      echo "   ✅ Hosted zone found"
    else
      echo "   ⚠️  Warning: No Route 53 hosted zone found for $DOMAIN_NAME"
      echo "   You'll need to create one before using DNS features"
    fi
  else
    DOMAIN_NAME=""
    echo "   ✅ DNS/SSL disabled"
  fi
  echo ""

  # Optional: Snapshot ID
  echo "7️⃣  Snapshot ID for Restore (OPTIONAL)"
  echo "   Leave empty to create a fresh instance"
  echo "   Find it in: AWS Console → EC2 → Snapshots"
  echo "   Format: snap-xxxxxxxxxxxxxxxxx"
  read -p "   Enter snapshot ID (or press Enter to skip): " SNAPSHOT_ID
  if [ -n "$SNAPSHOT_ID" ]; then
    echo "   ✅ Will restore from snapshot: $SNAPSHOT_ID"
  else
    SNAPSHOT_ID=""
    echo "   ✅ Will create fresh instance"
  fi
  echo ""

  # Infrastructure control
  echo "8️⃣  Infrastructure Control"
  echo "   Set to 'true' to enable infrastructure immediately"
  read -p "   Enable infrastructure now? (Y/n): " ENABLE_INFRA
  if [[ "$ENABLE_INFRA" =~ ^[Nn]$ ]]; then
    ENABLE_INFRA="false"
  else
    ENABLE_INFRA="true"
  fi
  echo "   ✅ enable_infrastructure = $ENABLE_INFRA"
  echo ""

  # ALB control
  if [ -n "$DOMAIN_NAME" ]; then
    echo "9️⃣  Application Load Balancer (ALB)"
    echo "   Enable HTTPS/SSL via ALB (~\$16-22/month when running)"
    echo "   Requires domain_name (which you've provided)"
    read -p "   Enable ALB? (y/N): " ENABLE_ALB
    if [[ "$ENABLE_ALB" =~ ^[Yy]$ ]]; then
      ENABLE_ALB="true"
    else
      ENABLE_ALB="false"
    fi
    echo "   ✅ enable_alb = $ENABLE_ALB"
  else
    ENABLE_ALB="false"
    echo "9️⃣  Application Load Balancer (ALB)"
    echo "   ⚠️  Skipped (requires domain_name)"
    echo "   ✅ enable_alb = false"
  fi
  echo ""

  # Create terraform.tfvars
  echo "📝 Creating configs/terraform.tfvars..."
  cat > "$PROJECT_ROOT/configs/terraform.tfvars" <<EOF
aws_region = "$AWS_REGION"
my_ip_cidr = "$MY_IP_CIDR"

# REQUIRED: Subnet ID where the EC2 instance will be launched
# Must be a public subnet with internet gateway attached
subnet_id = "$SUBNET_ID"

# REQUIRED: SSH Key Pair name for EC2 instance access
ssh_key_name = "$SSH_KEY_NAME"

# Elastic IP is automatically created by Terraform for SSH access
# No configuration needed - it will be created/reused automatically
EOF

  cat >> "$PROJECT_ROOT/configs/terraform.tfvars" <<EOF

# Optional: Domain name for Route 53 DNS and ACM certificate
# Leave empty to disable DNS/SSL setup (no domain needed)
EOF

  if [ -n "$DOMAIN_NAME" ]; then
    echo "domain_name = \"$DOMAIN_NAME\"" >> "$PROJECT_ROOT/configs/terraform.tfvars"
  else
    echo "# domain_name = \"\"" >> "$PROJECT_ROOT/configs/terraform.tfvars"
  fi

  cat >> "$PROJECT_ROOT/configs/terraform.tfvars" <<EOF

# Optional: Restore from a snapshot checkpoint
# Leave empty or omit to create a fresh instance
EOF

  if [ -n "$SNAPSHOT_ID" ]; then
    echo "root_volume_snapshot_id = \"$SNAPSHOT_ID\"" >> "$PROJECT_ROOT/configs/terraform.tfvars"
  else
    echo "# root_volume_snapshot_id = \"\"" >> "$PROJECT_ROOT/configs/terraform.tfvars"
  fi

  cat >> "$PROJECT_ROOT/configs/terraform.tfvars" <<EOF

# Infrastructure Control
# Set to false to stop EC2 instances and destroy ALB (saves compute costs)
# EC2 instances will be stopped (not terminated) - data preserved
# Run ./scripts/down.sh to stop, ./scripts/up.sh to start
enable_infrastructure = $ENABLE_INFRA

# ALB Control
# Set to true to enable ALB with HTTPS (~\$16-22/month when infrastructure is running)
# Requires domain_name to be set. Set to false to disable ALB (HTTP only, saves money)
# Only applies when enable_infrastructure = true
enable_alb = $ENABLE_ALB
EOF

  echo "   ✅ configs/terraform.tfvars created!"
  echo ""
  
  # Create symlink in terraform directory for convenience
  if [ ! -f "$TERRAFORM_DIR/terraform.tfvars" ]; then
    ln -sf ../configs/terraform.tfvars "$TERRAFORM_DIR/terraform.tfvars"
    echo "   ✅ Created symlink: terraform/terraform.tfvars → ../configs/terraform.tfvars"
    echo ""
  fi
  
  # Ask about importing if we just created a new config
  if [ "$IMPORT_ONLY" != "true" ]; then
    echo ""
    read -p "   Would you like to check for and import existing resources? (Y/n): " CHECK_IMPORT
    if [[ "$CHECK_IMPORT" =~ ^[Nn]$ ]]; then
      echo "   Skipping resource import."
      echo ""
      exit 0
    fi
    echo ""
  fi
fi

# Import existing resources
# Show title before import section
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 CVAT Infrastructure Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 Checking for existing resources to import..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# If IMPORT_ONLY is false, we already asked after creating the config (see above)
# If IMPORT_ONLY is true, we already asked the user earlier, so proceed directly

# Check if terraform is initialized
if [ ! -d "$TERRAFORM_DIR/.terraform" ]; then
  echo "⚠️  Terraform not initialized yet."
  echo ""
  read -p "   Would you like to run 'terraform init' now? (Y/n): " RUN_INIT
  if [[ ! "$RUN_INIT" =~ ^[Nn]$ ]]; then
    echo ""
    echo "🔧 Initializing Terraform..."
    if terraform init; then
      echo "   ✅ Terraform initialized!"
      echo ""
    else
      echo "   ❌ Terraform init failed! Skipping resource import."
      echo "   You can run this script again later to import existing resources."
      exit 0
    fi
  else
    echo "   Skipping init and resource import."
    echo "   Run 'cd terraform && terraform init' first, then run this script again to import existing resources"
    echo ""
    exit 0
  fi
fi

# Get VPC ID if not already set
if [ -z "$VPC_ID" ]; then
  if [ -f "$PROJECT_ROOT/configs/terraform.tfvars" ]; then
    SUBNET_ID_FROM_FILE=$(grep -E "^subnet_id" "$PROJECT_ROOT/configs/terraform.tfvars" | sed 's/.*= *"\([^"]*\)".*/\1/' || echo "")
    AWS_REGION_FROM_FILE=$(grep -E "^aws_region" "$PROJECT_ROOT/configs/terraform.tfvars" | sed 's/.*= *"\([^"]*\)".*/\1/' || echo "us-east-2")
    if [ -n "$SUBNET_ID_FROM_FILE" ]; then
      VPC_ID=$(aws ec2 describe-subnets --subnet-ids "$SUBNET_ID_FROM_FILE" --region "$AWS_REGION_FROM_FILE" --query 'Subnets[0].VpcId' --output text 2>/dev/null || echo "")
    fi
  fi
fi

if [ -z "$VPC_ID" ]; then
  echo "⚠️  Could not determine VPC ID. Skipping resource import."
  echo "   You may need to manually import resources if you get 'already exists' errors"
else
  # Get region from terraform.tfvars
  REGION=$(grep -E "^aws_region" "$PROJECT_ROOT/configs/terraform.tfvars" 2>/dev/null | sed 's/.*= *"\([^"]*\)".*/\1/' || echo "us-east-2")

  # Check and import CVAT security group
  CVAT_SG_ID=$(aws ec2 describe-security-groups \
    --filters "Name=group-name,Values=cvat-ui-server" "Name=vpc-id,Values=$VPC_ID" \
    --region "$REGION" \
    --query 'SecurityGroups[0].GroupId' \
    --output text 2>/dev/null || echo "")

  if [ -n "$CVAT_SG_ID" ] && [ "$CVAT_SG_ID" != "None" ]; then
    echo "📦 Found existing CVAT security group: $CVAT_SG_ID"
    if ! terraform state show -state=state/terraform.tfstate "aws_security_group.cvat[0]" >/dev/null 2>&1; then
      echo "   Importing into Terraform state..."
      if terraform import -state=state/terraform.tfstate 'aws_security_group.cvat[0]' "$CVAT_SG_ID" 2>/dev/null; then
        echo "   ✅ Imported"
      else
        echo "   ⚠️  Import failed (may need terraform init first)"
      fi
    else
      echo "   ✅ Already in Terraform state"
    fi
  else
    echo "ℹ️  CVAT security group not found (will be created)"
  fi

  # Check and import ALB security group
  ALB_SG_ID=$(aws ec2 describe-security-groups \
    --filters "Name=group-name,Values=cvat-ui-server-alb" "Name=vpc-id,Values=$VPC_ID" \
    --region "$REGION" \
    --query 'SecurityGroups[0].GroupId' \
    --output text 2>/dev/null || echo "")

  if [ -n "$ALB_SG_ID" ] && [ "$ALB_SG_ID" != "None" ]; then
    echo "📦 Found existing ALB security group: $ALB_SG_ID"
    if ! terraform state show -state=state/terraform.tfstate "aws_security_group.alb[0]" >/dev/null 2>&1; then
      echo "   Importing into Terraform state..."
      if terraform import -state=state/terraform.tfstate 'aws_security_group.alb[0]' "$ALB_SG_ID" 2>/dev/null; then
        echo "   ✅ Imported"
      else
        echo "   ⚠️  Import failed (may need terraform init first)"
      fi
    else
      echo "   ✅ Already in Terraform state"
    fi
  else
    echo "ℹ️  ALB security group not found (will be created)"
  fi

  # Check and import IAM role (only if enable_infrastructure=true, since it's conditional)
  ENABLE_INFRA=$(grep -E "^enable_infrastructure" "$PROJECT_ROOT/configs/terraform.tfvars" 2>/dev/null | sed 's/.*= *\([^ ]*\).*/\1/' | tr -d ' ' || echo "true")
  if [ "$ENABLE_INFRA" = "true" ]; then
    IAM_ROLE_NAME="cvat-ec2-ssm-role"
    if aws iam get-role --role-name "$IAM_ROLE_NAME" >/dev/null 2>&1; then
      echo "📦 Found existing IAM role: $IAM_ROLE_NAME"
      if ! terraform state show -state=state/terraform.tfstate "aws_iam_role.ec2_ssm_role[0]" >/dev/null 2>&1; then
        echo "   Importing into Terraform state..."
        # IAM role import: terraform import aws_iam_role.NAME ROLE_NAME
        if terraform import -state=state/terraform.tfstate 'aws_iam_role.ec2_ssm_role[0]' "$IAM_ROLE_NAME" 2>/dev/null; then
          echo "   ✅ Imported"
        else
          echo "   ⚠️  Import failed (ensure enable_infrastructure=true in terraform.tfvars)"
        fi
      else
        echo "   ✅ Already in Terraform state"
      fi
    else
      echo "ℹ️  IAM role not found (will be created when enable_infrastructure=true)"
    fi

    # Check and import IAM instance profile (only if enable_infrastructure=true)
    IAM_PROFILE_NAME="cvat-ec2-ssm-profile"
    if aws iam get-instance-profile --instance-profile-name "$IAM_PROFILE_NAME" >/dev/null 2>&1; then
      echo "📦 Found existing IAM instance profile: $IAM_PROFILE_NAME"
      if ! terraform state show -state=state/terraform.tfstate "aws_iam_instance_profile.ec2_ssm_profile[0]" >/dev/null 2>&1; then
        echo "   Importing into Terraform state..."
        # IAM instance profile import: terraform import aws_iam_instance_profile.NAME PROFILE_NAME
        if terraform import -state=state/terraform.tfstate 'aws_iam_instance_profile.ec2_ssm_profile[0]' "$IAM_PROFILE_NAME" 2>/dev/null; then
          echo "   ✅ Imported"
        else
          echo "   ⚠️  Import failed (ensure enable_infrastructure=true in terraform.tfvars)"
        fi
      else
        echo "   ✅ Already in Terraform state"
      fi
    else
      echo "ℹ️  IAM instance profile not found (will be created when enable_infrastructure=true)"
    fi
  else
    echo "ℹ️  Skipping IAM resource import (enable_infrastructure=false - resources are conditional)"
  fi

  # Check and import Route 53 records (if domain_name is set)
  if [ -f "$PROJECT_ROOT/configs/terraform.tfvars" ]; then
    DOMAIN_NAME_FROM_FILE=$(grep -E "^domain_name" "$PROJECT_ROOT/configs/terraform.tfvars" | sed 's/.*= *"\([^"]*\)".*/\1/' || echo "")
    if [ -n "$DOMAIN_NAME_FROM_FILE" ] && [ "$DOMAIN_NAME_FROM_FILE" != "" ]; then
      echo ""
      echo "📦 Checking for existing Route 53 records..."
      ZONE_ID=$(aws route53 list-hosted-zones-by-name --dns-name "$DOMAIN_NAME_FROM_FILE" --query "HostedZones[?Name=='${DOMAIN_NAME_FROM_FILE}.'].Id" --output text --region "$REGION" 2>/dev/null | sed 's|/hostedzone/||' || echo "")
      
      if [ -n "$ZONE_ID" ] && [ "$ZONE_ID" != "None" ]; then
        echo "📦 Checking for existing Route 53 records in zone $ZONE_ID..."
        # Note: Route 53 record imports use format: ZONEID_RECORDNAME_TYPE
        # Record names must include trailing dot for import
        
        # Import main domain record
        MAIN_RECORD=$(aws route53 list-resource-record-sets --hosted-zone-id "$ZONE_ID" --query "ResourceRecordSets[?Name=='${DOMAIN_NAME_FROM_FILE}.' && Type=='A'].Name" --output text --region "$REGION" 2>/dev/null || echo "")
        if [ -n "$MAIN_RECORD" ] && [ "$MAIN_RECORD" != "None" ]; then
          echo "📦 Found existing Route 53 record: $DOMAIN_NAME_FROM_FILE"
          if ! terraform state show -state=state/terraform.tfstate "aws_route53_record.main[0]" >/dev/null 2>&1; then
            echo "   Importing into Terraform state..."
            # Import format: ZONEID_RECORDNAME_TYPE (record name must have trailing dot)
            IMPORT_ID="${ZONE_ID}_${DOMAIN_NAME_FROM_FILE}._A"
            if terraform import -state=state/terraform.tfstate "aws_route53_record.main[0]" "$IMPORT_ID" 2>/dev/null; then
              echo "   ✅ Imported"
            else
              echo "   ⚠️  Import failed (record will be managed with allow_overwrite=true)"
            fi
          else
            echo "   ✅ Already in Terraform state"
          fi
        fi

        # Import subdomain records
        for SUBDOMAIN in "cvat"; do
          SUBDOMAIN_NAME="${SUBDOMAIN}.${DOMAIN_NAME_FROM_FILE}"
          SUBDOMAIN_RECORD=$(aws route53 list-resource-record-sets --hosted-zone-id "$ZONE_ID" --query "ResourceRecordSets[?Name=='${SUBDOMAIN_NAME}.' && Type=='A'].Name" --output text --region "$REGION" 2>/dev/null || echo "")
          if [ -n "$SUBDOMAIN_RECORD" ] && [ "$SUBDOMAIN_RECORD" != "None" ]; then
            echo "📦 Found existing Route 53 record: $SUBDOMAIN_NAME"
            RESOURCE_NAME="${SUBDOMAIN}_subdomain"
            if ! terraform state show -state=state/terraform.tfstate "aws_route53_record.${RESOURCE_NAME}[0]" >/dev/null 2>&1; then
              echo "   Importing into Terraform state..."
              # Import format: ZONEID_RECORDNAME_TYPE (record name must have trailing dot)
              IMPORT_ID="${ZONE_ID}_${SUBDOMAIN_NAME}._A"
              if terraform import -state=state/terraform.tfstate "aws_route53_record.${RESOURCE_NAME}[0]" "$IMPORT_ID" 2>/dev/null; then
                echo "   ✅ Imported"
              else
                echo "   ⚠️  Import failed (record will be managed with allow_overwrite=true)"
              fi
            else
              echo "   ✅ Already in Terraform state"
            fi
          fi
        done
      fi
    fi
  fi
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Setup Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Next steps:"
echo ""
echo "1. Initialize Terraform (if not already done):"
echo "   cd terraform && terraform init"
echo ""
echo "2. Review the plan:"
echo "   cd terraform && terraform plan -var-file=../configs/terraform.tfvars -state=state/terraform.tfstate"
echo ""
echo "3. Apply the configuration:"
echo "   cd terraform && terraform apply -var-file=../configs/terraform.tfvars -state=state/terraform.tfstate"
echo ""
echo "   Or use the convenience scripts:"
echo "   ./scripts/up.sh    # Start infrastructure"
echo "   ./scripts/down.sh  # Stop infrastructure"
echo ""
echo "💡 If you encounter 'already exists' errors, run this script again"
echo "   or manually import resources with: terraform import <resource> <id>"
echo ""
