#!/bin/bash
# Turn infrastructure OFF - Stop EC2 instances and destroy ALB

set -e

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🛑 Stopping infrastructure..."
echo ""

# Check if already disabled
if grep -q "^enable_infrastructure = false" terraform.tfvars; then
  echo "⚠️  Infrastructure is already disabled!"
  echo ""
fi

# Disable infrastructure in terraform.tfvars
sed -i.bak 's/^enable_infrastructure = true/enable_infrastructure = false/' terraform.tfvars 2>/dev/null || \
sed -i.bak 's/^enable_infrastructure *= *true/enable_infrastructure = false/' terraform.tfvars

echo "✅ Updated terraform.tfvars: enable_infrastructure = false"
echo ""
echo "📋 Running terraform apply..."
echo ""

terraform apply -auto-approve

echo ""
echo "✅ Infrastructure is DOWN!"
echo ""
echo "EC2 instances have been stopped (data preserved)."
echo "ALB has been destroyed."
echo ""
echo "💰 Cost Savings: You're no longer paying for EC2 compute or ALB."
echo ""
echo "To start again, run: ./up.sh"
