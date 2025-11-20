#!/bin/bash
# Turn infrastructure ON - Start EC2 instances and create ALB

set -e

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🚀 Starting infrastructure..."
echo ""

# Check if already enabled
if grep -q "^enable_infrastructure = true" terraform.tfvars; then
  echo "⚠️  Infrastructure is already enabled!"
  echo ""
fi

# Enable infrastructure in terraform.tfvars
sed -i.bak 's/^enable_infrastructure = false/enable_infrastructure = true/' terraform.tfvars 2>/dev/null || \
sed -i.bak 's/^enable_infrastructure *= *false/enable_infrastructure = true/' terraform.tfvars

echo "✅ Updated terraform.tfvars: enable_infrastructure = true"
echo ""
echo "📋 Running terraform apply..."
echo ""

terraform apply -auto-approve

echo ""
echo "✅ Infrastructure is UP!"
echo ""
echo "EC2 instances are starting (if they were stopped)."
echo "ALB will be created if enable_alb = true"
echo ""
echo "Check status with: terraform output infrastructure_status"
