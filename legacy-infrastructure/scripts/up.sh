#!/bin/bash
# DEPRECATED: This script is deprecated. Please use: python scripts/cvat.py up
# This script will be removed in a future version.
#
# Turn infrastructure ON - Start EC2 instances and create ALB

set -e

# Show deprecation warning
echo "⚠️  WARNING: This shell script is deprecated!" >&2
echo "   Please use: python scripts/cvat.py up" >&2
echo "   This script will be removed in a future version." >&2
echo "" >&2
read -p "   Continue with shell script anyway? (y/N): " CONTINUE
if [[ ! "$CONTINUE" =~ ^[Yy]$ ]]; then
  echo "   Exiting. Please use: python scripts/cvat.py up"
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

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 Starting Infrastructure"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if terraform is initialized
if [ ! -d "$TERRAFORM_DIR/.terraform" ]; then
  echo "⚠️  Terraform has not been initialized!"
  echo ""
  read -p "   Would you like to run 'terraform init' now? (Y/n): " RUN_INIT
  if [[ ! "$RUN_INIT" =~ ^[Nn]$ ]]; then
    echo ""
    echo "🔧 Initializing Terraform..."
    if terraform init; then
      echo "   ✅ Terraform initialized!"
      echo ""
    else
      echo "   ❌ Terraform init failed!"
      exit 1
    fi
  else
    echo "   Skipping init. Please run 'cd terraform && terraform init' manually."
    exit 1
  fi
fi

# Check if terraform.tfvars exists
if [ ! -f "$PROJECT_ROOT/configs/terraform.tfvars" ]; then
  echo "❌ Error: configs/terraform.tfvars not found!"
  echo ""
  echo "📋 Please run ./scripts/setup.sh to create your configuration"
  echo ""
  exit 1
fi

# Check if already enabled
if grep -q "^enable_infrastructure = true" "$PROJECT_ROOT/configs/terraform.tfvars"; then
  echo "⚠️  Infrastructure is already enabled!"
  echo ""
fi

# Enable infrastructure in terraform.tfvars
sed -i.bak 's/^enable_infrastructure = false/enable_infrastructure = true/' "$PROJECT_ROOT/configs/terraform.tfvars" 2>/dev/null || \
sed -i.bak 's/^enable_infrastructure *= *false/enable_infrastructure = true/' "$PROJECT_ROOT/configs/terraform.tfvars"
# Move backup file to state directory if it exists
[ -f "$PROJECT_ROOT/configs/terraform.tfvars.bak" ] && mv "$PROJECT_ROOT/configs/terraform.tfvars.bak" "$TERRAFORM_DIR/state/terraform.tfvars.bak" 2>/dev/null || true

echo "📝 Configuration updated: enable_infrastructure = true"
echo ""

# Offer to run plan first
read -p "   Would you like to run 'terraform plan' first to preview changes? (Y/n): " RUN_PLAN
if [[ ! "$RUN_PLAN" =~ ^[Nn]$ ]]; then
  echo ""
  echo "🔍 Running Terraform plan..."
  PLAN_OUTPUT=$(terraform plan -var-file=../configs/terraform.tfvars -state=state/terraform.tfstate 2>&1)
  PLAN_EXIT_CODE=$?
  echo "$PLAN_OUTPUT"
  echo ""
  
  # Check if plan shows resources that might already exist
  if echo "$PLAN_OUTPUT" | grep -qi "will be created" && echo "$PLAN_OUTPUT" | grep -qiE "aws_iam_role|aws_iam_instance_profile|aws_security_group"; then
    echo ""
    echo "⚠️  Plan shows IAM/Security Group resources will be created."
    echo "   These might already exist in AWS (not in Terraform state)."
    read -p "   Would you like to import existing resources now (recommended)? (Y/n): " IMPORT_NOW
    if [[ ! "$IMPORT_NOW" =~ ^[Nn]$ ]]; then
      echo "   → Running setup.sh to import existing resources..."
      cd "$PROJECT_ROOT"
      ./scripts/setup.sh
      echo ""
      read -p "   Would you like to run plan again to see updated changes? (Y/n): " RERUN_PLAN
      if [[ ! "$RERUN_PLAN" =~ ^[Nn]$ ]]; then
        cd "$TERRAFORM_DIR"
        echo ""
        echo "🔍 Running Terraform plan again..."
        terraform plan -var-file=../configs/terraform.tfvars -state=state/terraform.tfstate
        echo ""
      fi
      cd "$TERRAFORM_DIR"
    fi
    echo ""
  fi
  
  read -p "   Continue with apply? (Y/n): " CONTINUE_APPLY
  if [[ "$CONTINUE_APPLY" =~ ^[Nn]$ ]]; then
    echo "   Skipping apply."
    exit 0
  fi
  echo ""
fi

echo "🔧 Applying Terraform configuration..."
echo ""

# Run terraform apply - show output in real-time but capture stderr for error detection
# Use a temp file to capture output for error analysis
TEMP_OUTPUT=$(mktemp)
trap "rm -f $TEMP_OUTPUT" EXIT

# Run terraform apply, showing output in real-time, but also capturing to temp file
terraform apply -var-file=../configs/terraform.tfvars -state=state/terraform.tfstate -auto-approve 2>&1 | tee "$TEMP_OUTPUT"
APPLY_EXIT_CODE=${PIPESTATUS[0]}
APPLY_OUTPUT=$(cat "$TEMP_OUTPUT")

if [ $APPLY_EXIT_CODE -ne 0 ]; then
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "❌ Terraform Apply Failed"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  
  # Check for "EntityAlreadyExists" or "already exists" errors
  if echo "$APPLY_OUTPUT" | grep -qiE "EntityAlreadyExists|already exists"; then
    echo "⚠️  Detected: Resource already exists in AWS but not in Terraform state"
    echo ""
    read -p "   Would you like to run './scripts/setup.sh' to import existing resources? (Y/n): " RUN_SETUP
    if [[ ! "$RUN_SETUP" =~ ^[Nn]$ ]]; then
      echo "   → Running setup.sh to import resources..."
      cd "$PROJECT_ROOT"
      ./scripts/setup.sh
      echo ""
      read -p "   Would you like to retry apply now? (Y/n): " RETRY_APPLY
      if [[ ! "$RETRY_APPLY" =~ ^[Nn]$ ]]; then
        cd "$TERRAFORM_DIR"
        echo ""
        echo "🔧 Retrying Terraform apply..."
        terraform apply -var-file=../configs/terraform.tfvars -state=state/terraform.tfstate -auto-approve && exit 0
      fi
      exit 0
    fi
  fi
  
  echo "🔍 Common issues and solutions:"
  echo ""
  echo "  1. If you see 'Invalid count argument' or dependency errors:"
  read -p "     → Would you like to try running 'terraform init' again? (Y/n): " RETRY_INIT
  if [[ ! "$RETRY_INIT" =~ ^[Nn]$ ]]; then
    echo "     → Running terraform init..."
    if terraform init; then
      echo "     → ✅ Init successful! Would you like to retry apply? (Y/n): "
      read -p "     → " RETRY_APPLY
      if [[ ! "$RETRY_APPLY" =~ ^[Nn]$ ]]; then
        echo ""
        echo "🔧 Retrying Terraform apply..."
        terraform apply -var-file=../configs/terraform.tfvars -state=state/terraform.tfstate -auto-approve && exit 0
      fi
    fi
  fi
  echo "     → Manual steps: cd terraform && terraform init"
  echo ""
  echo "  2. If you see 'Instance cannot be destroyed' or 'prevent_destroy' errors:"
  echo "     → This usually means a resource exists in AWS but Terraform wants to remove it"
  echo "     → Run: cd terraform && terraform -state=state/terraform.tfstate state list"
  echo "     → Check if the resource should be removed from state: terraform -state=state/terraform.tfstate state rm <resource>"
  echo "     → Or adjust the resource configuration in terraform/main.tf"
  echo ""
  echo ""
  echo "  4. If you see credential errors:"
  echo "     → Configure AWS credentials: aws configure"
  echo "     → Or set AWS_PROFILE environment variable"
  echo ""
  echo "  4. For other errors, check the output above for details"
  echo ""
  exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Infrastructure Status: UP"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Automatically clean up extra Elastic IPs (keep only the one tagged cvat-ui-ssh-ip)
REGION=$(grep -E "^aws_region" "$PROJECT_ROOT/configs/terraform.tfvars" 2>/dev/null | sed 's/.*= *"\([^"]*\)".*/\1/' || echo "us-east-2")
echo "🧹 Cleaning up extra Elastic IPs..."
ALL_EIPS=$(aws ec2 describe-addresses --region "$REGION" --query 'Addresses[*].[AllocationId,PublicIp,AssociationId,Tags[?Key==`Name`].Value|[0]]' --output text 2>/dev/null || echo "")

if [ -n "$ALL_EIPS" ]; then
  KEEP_EIP=$(echo "$ALL_EIPS" | grep -E "cvat-ui-ssh-ip" | awk '{print $1}' || echo "")
  CLEANED_COUNT=0
  
  while IFS=$'\t' read -r ALLOC_ID PUBLIC_IP ASSOC_ID TAG_NAME; do
    # Skip the EIP we want to keep
    if [ "$ALLOC_ID" = "$KEEP_EIP" ] || [ -z "$ALLOC_ID" ]; then
      continue
    fi
    
    # Check if associated with ALB network interface (ALBs don't need EIPs)
    if [ -n "$ASSOC_ID" ] && [ "$ASSOC_ID" != "None" ]; then
      NETWORK_INTERFACE=$(aws ec2 describe-addresses --region "$REGION" --allocation-ids "$ALLOC_ID" --query 'Addresses[0].NetworkInterfaceId' --output text 2>/dev/null || echo "")
      if [ -n "$NETWORK_INTERFACE" ] && [ "$NETWORK_INTERFACE" != "None" ]; then
        ENI_DESC=$(aws ec2 describe-network-interfaces --region "$REGION" --network-interface-ids "$NETWORK_INTERFACE" --query 'NetworkInterfaces[0].Description' --output text 2>/dev/null || echo "")
        if echo "$ENI_DESC" | grep -q "ELB"; then
          # Disassociate from ALB network interface
          aws ec2 disassociate-address --association-id "$ASSOC_ID" --region "$REGION" 2>/dev/null || true
          # Release the EIP
          aws ec2 release-address --allocation-id "$ALLOC_ID" --region "$REGION" 2>/dev/null && CLEANED_COUNT=$((CLEANED_COUNT + 1)) || true
          continue
        fi
      fi
    fi
    
    # Clean up unassociated EIPs
    if [ -z "$ASSOC_ID" ] || [ "$ASSOC_ID" = "None" ]; then
      aws ec2 release-address --allocation-id "$ALLOC_ID" --region "$REGION" 2>/dev/null && CLEANED_COUNT=$((CLEANED_COUNT + 1)) || true
    fi
  done <<< "$ALL_EIPS"
  
  if [ "$CLEANED_COUNT" -gt 0 ]; then
    echo "  ✅ Cleaned up $CLEANED_COUNT extra Elastic IP(s)"
  else
    echo "  ✅ No extra Elastic IPs to clean up"
  fi
  echo ""
fi

# Get outputs
ELASTIC_IP=$(terraform output -state=state/terraform.tfstate -raw elastic_ip 2>/dev/null || echo "")
INSTANCE_ID=$(terraform output -state=state/terraform.tfstate -raw instance_id 2>/dev/null || echo "")
STATUS=$(terraform output -state=state/terraform.tfstate -raw infrastructure_status 2>/dev/null || echo "")
DOMAIN=$(terraform output -state=state/terraform.tfstate -raw domain_name 2>/dev/null || echo "")
HTTPS_URL=$(terraform output -state=state/terraform.tfstate -raw https_url 2>/dev/null || echo "")
HTTP_URL=$(terraform output -state=state/terraform.tfstate -raw http_url 2>/dev/null || echo "")
CVAT_URL=$(terraform output -state=state/terraform.tfstate -raw cvat_url_subdomain 2>/dev/null || echo "")
SSH_KEY=$(grep '^ssh_key_name' "$PROJECT_ROOT/configs/terraform.tfvars" 2>/dev/null | sed 's/.*= *"\([^"]*\)".*/\1/' || echo "")

# Infrastructure Details Section
echo "📦 Infrastructure Resources"
echo "────────────────────────────────────────────────────────────────────"
if [ -n "$INSTANCE_ID" ]; then
  echo "  🖥️  EC2 Instance:     $INSTANCE_ID"
fi
if [ -n "$ELASTIC_IP" ]; then
  echo "  🌐 Elastic IP:        $ELASTIC_IP"
fi
if [ -n "$STATUS" ]; then
  echo "  📊 Status:            $STATUS"
fi
echo ""

# Access Information Section
echo "🔗 Access Information"
echo "────────────────────────────────────────────────────────────────────"

# SSH Access
if [ -n "$ELASTIC_IP" ] && [ -n "$SSH_KEY" ]; then
  echo "  🔐 SSH Access:"
  echo "     ssh -i ~/.ssh/${SSH_KEY}.pem ubuntu@${ELASTIC_IP}"
  echo ""
fi

# Web Access
if [ -n "$HTTPS_URL" ]; then
  echo "  🌐 Web Access (HTTPS):"
  echo "     $HTTPS_URL"
  if [ -n "$CVAT_URL" ]; then
    echo "     $CVAT_URL"
  fi
elif [ -n "$HTTP_URL" ]; then
  echo "  🌐 Web Access (HTTP):"
  echo "     $HTTP_URL"
  if [ -n "$CVAT_URL" ]; then
    echo "     $CVAT_URL"
  fi
fi

if [ -n "$DOMAIN" ] && [ -z "$HTTPS_URL" ] && [ -z "$HTTP_URL" ]; then
  echo "  ⚠️  Domain configured but no URL available yet"
  echo "     DNS may still be propagating"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "💡 Next Steps"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  • EC2 instance is starting (may take 1-2 minutes to be ready)"
echo "  • Check status: cd terraform && terraform output -state=state/terraform.tfstate infrastructure_status"
echo "  • To stop infrastructure: ./scripts/down.sh"
echo ""
