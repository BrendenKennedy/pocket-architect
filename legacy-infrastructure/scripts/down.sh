#!/bin/bash
# DEPRECATED: This script is deprecated. Please use: python scripts/cvat.py down
# This script will be removed in a future version.
#
# Turn infrastructure OFF - Stop EC2 instances and destroy ALB

set -e

# Show deprecation warning
echo "⚠️  WARNING: This shell script is deprecated!" >&2
echo "   Please use: python scripts/cvat.py down" >&2
echo "   This script will be removed in a future version." >&2
echo "" >&2
read -p "   Continue with shell script anyway? (y/N): " CONTINUE
if [[ ! "$CONTINUE" =~ ^[Yy]$ ]]; then
  echo "   Exiting. Please use: python scripts/cvat.py down"
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
echo "🛑 Stopping Infrastructure"
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

# Check if already disabled
if grep -q "^enable_infrastructure = false" "$PROJECT_ROOT/configs/terraform.tfvars"; then
  echo "⚠️  Infrastructure is already disabled!"
  echo ""
fi

# Get current instance info before stopping
INSTANCE_ID=$(terraform output -state=state/terraform.tfstate -raw instance_id 2>/dev/null || echo "")
ELASTIC_IP=$(terraform output -state=state/terraform.tfstate -raw elastic_ip 2>/dev/null || echo "")

# Disable infrastructure in terraform.tfvars
sed -i.bak 's/^enable_infrastructure = true/enable_infrastructure = false/' "$PROJECT_ROOT/configs/terraform.tfvars" 2>/dev/null || \
sed -i.bak 's/^enable_infrastructure *= *true/enable_infrastructure = false/' "$PROJECT_ROOT/configs/terraform.tfvars"
# Move backup file to state directory if it exists
[ -f "$PROJECT_ROOT/configs/terraform.tfvars.bak" ] && mv "$PROJECT_ROOT/configs/terraform.tfvars.bak" "$TERRAFORM_DIR/state/terraform.tfvars.bak" 2>/dev/null || true

echo "📝 Configuration updated: enable_infrastructure = false"
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
  
  # Note: When stopping infrastructure, IAM resources may show as "will be created" 
  # if they're not in state, but we're just stopping, not setting up new resources.
  # Skip the import prompt for down.sh - user can run setup.sh separately if needed.
  
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
  
  # Note: When tearing down, if resources already exist but aren't in state,
  # that's actually fine - we're stopping/destroying, not creating.
  # The "EntityAlreadyExists" error during teardown means Terraform tried to create
  # something that already exists, which suggests the resource should be imported
  # if you want to manage it, but for teardown we can just ignore it.
  
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
  echo "  2. If you see 'EntityAlreadyExists' or 'already exists' errors:"
  echo "     → This usually means a resource exists in AWS but not in Terraform state"
  echo "     → For teardown, this is often fine - the resource will remain in AWS"
  echo "     → If you want to manage it with Terraform, run './scripts/setup.sh' to import it"
  echo ""
  echo "  3. If you see credential errors:"
  echo "     → Configure AWS credentials: aws configure"
  echo "     → Or set AWS_PROFILE environment variable"
  echo ""
  echo "  4. For other errors, check the output above for details"
  echo ""
  exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Infrastructure Status: DOWN"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# What was stopped/destroyed
echo "🛑 Resources Stopped/Destroyed"
echo "────────────────────────────────────────────────────────────────────"
if [ -n "$INSTANCE_ID" ]; then
  echo "  🖥️  EC2 Instance:      Stopped (data preserved on EBS volume)"
fi
echo "  ⚖️  Application Load Balancer: Destroyed"
echo "  🔒 Security Groups:     Destroyed (ALB-related)"
echo "  🌐 Route 53 Records:    Removed from Terraform management"
if [ -n "$ELASTIC_IP" ]; then
  echo "  🌐 Elastic IP:          Preserved (will be reused on next up)"
fi
echo ""

# Cost savings
echo "💰 Cost Savings"
echo "────────────────────────────────────────────────────────────────────"
echo "  • EC2 compute charges:     Stopped"
echo "  • ALB charges (~\$16-22/mo): Stopped"
echo "  • EBS storage (~\$1.50/mo):  Still charged (data preserved)"
echo ""

# What's preserved
echo "💾 Data Preservation"
echo "────────────────────────────────────────────────────────────────────"
echo "  • EBS volumes:             Preserved (data safe)"
echo "  • Snapshots:               Preserved (checkpoints intact)"
echo "  • Elastic IP:               Preserved (tagged cvat-ui-ssh-ip, will be reused on next start)"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "💡 To Start Again"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Run: ./scripts/up.sh"
echo ""
