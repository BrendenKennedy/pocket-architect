#!/bin/bash
# DEPRECATED: This script is deprecated. Please use: python scripts/cvat.py checkpoint
# This script will be removed in a future version.
#
# Create a new checkpoint: snapshot the current instance and create an AMI
# This allows you to save your work at checkpoints

set -e

# Show deprecation warning
echo "⚠️  WARNING: This shell script is deprecated!" >&2
echo "   Please use: python scripts/cvat.py checkpoint" >&2
echo "   This script will be removed in a future version." >&2
echo "" >&2
read -p "   Continue with shell script anyway? (y/N): " CONTINUE
if [[ ! "$CONTINUE" =~ ^[Yy]$ ]]; then
  echo "   Exiting. Please use: python scripts/cvat.py checkpoint"
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

# Get region from terraform.tfvars or use default
REGION=$(grep -E "^aws_region" "$PROJECT_ROOT/configs/terraform.tfvars" 2>/dev/null | sed 's/.*= *"\([^"]*\)".*/\1/' || echo "us-east-2")

echo "📸 Creating a new checkpoint..."
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

# Get instance ID from terraform state
INSTANCE_ID=$(terraform output -state=state/terraform.tfstate -raw instance_id 2>/dev/null || echo "")
if [ -z "$INSTANCE_ID" ]; then
  echo "❌ Error: Could not find instance ID. Make sure infrastructure is running."
  echo ""
  echo "💡 Run './scripts/up.sh' to start the infrastructure first."
  exit 1
fi

# Get volume ID from instance
echo "📋 Getting root volume ID for instance ${INSTANCE_ID}..."
VOLUME_ID=$(aws ec2 describe-instances \
  --instance-ids "$INSTANCE_ID" \
  --region "$REGION" \
  --query 'Reservations[0].Instances[0].BlockDeviceMappings[?DeviceName==`/dev/sda1`].Ebs.VolumeId' \
  --output text 2>/dev/null || echo "")

if [ -z "$VOLUME_ID" ]; then
  echo "❌ Error: Could not find root volume for instance ${INSTANCE_ID}."
  exit 1
fi

echo "✅ Found volume: ${VOLUME_ID}"
echo ""

# Prompt for checkpoint name
read -p "🏷️  Enter a checkpoint name (e.g., 'cvat-configured', 'annotations-complete'): " CHECKPOINT_NAME
if [ -z "$CHECKPOINT_NAME" ]; then
  CHECKPOINT_NAME="checkpoint-$(date +%Y%m%d-%H%M%S)"
fi

echo ""
echo "📸 Creating snapshot: ${CHECKPOINT_NAME}..."

# Create snapshot
SNAPSHOT_ID=$(aws ec2 create-snapshot \
  --volume-id "$VOLUME_ID" \
  --description "Checkpoint: ${CHECKPOINT_NAME} - $(date)" \
  --tag-specifications "ResourceType=snapshot,Tags=[{Key=Name,Value=${CHECKPOINT_NAME}},{Key=CheckpointPurpose,Value=CVAT Workstation}]" \
  --region "$REGION" \
  --query 'SnapshotId' \
  --output text)

if [ -z "$SNAPSHOT_ID" ]; then
  echo "❌ Error: Failed to create snapshot."
  exit 1
fi

echo "✅ Snapshot created: ${SNAPSHOT_ID}"
echo ""
echo "⏳ Waiting for snapshot to complete (this may take a few minutes)..."

# Wait for snapshot to complete
aws ec2 wait snapshot-completed \
  --snapshot-ids "$SNAPSHOT_ID" \
  --region "$REGION"

echo "✅ Snapshot completed!"
echo ""

# Create AMI from snapshot
AMI_NAME="cvat-from-snapshot-${SNAPSHOT_ID: -8}"
echo "🖼️  Creating AMI: ${AMI_NAME}..."

AMI_ID=$(aws ec2 register-image \
  --name "$AMI_NAME" \
  --description "Checkpoint AMI: ${CHECKPOINT_NAME}" \
  --architecture x86_64 \
  --virtualization-type hvm \
  --ena-support \
  --root-device-name /dev/sda1 \
  --block-device-mappings "[
    {
      \"DeviceName\": \"/dev/sda1\",
      \"Ebs\": {
        \"SnapshotId\": \"${SNAPSHOT_ID}\",
        \"VolumeType\": \"gp3\",
        \"DeleteOnTermination\": true
      }
    }
  ]" \
  --region "$REGION" \
  --tag-specifications "ResourceType=image,Tags=[{Key=Name,Value=cvat-checkpoint},{Key=SnapshotID,Value=${SNAPSHOT_ID}},{Key=CheckpointPurpose,Value=CVAT Workstation},{Key=CheckpointName,Value=${CHECKPOINT_NAME}}]" \
  --query 'ImageId' \
  --output text 2>/dev/null || echo "")

if [ -z "$AMI_ID" ]; then
  echo "❌ Error: Failed to create AMI from snapshot."
  echo "💡 You can manually create the AMI later or update $PROJECT_ROOT/configs/terraform.tfvars with snapshot ID."
  exit 1
fi

echo "✅ AMI created: ${AMI_ID}"
echo ""

# Update terraform.tfvars
echo "📝 Updating configs/terraform.tfvars with new snapshot ID..."

# Backup the file
cp "$PROJECT_ROOT/configs/terraform.tfvars" "$TERRAFORM_DIR/state/terraform.tfvars.bak"

# Update snapshot ID
if grep -q "^root_volume_snapshot_id" "$PROJECT_ROOT/configs/terraform.tfvars"; then
  sed -i.bak "s|^root_volume_snapshot_id = .*|root_volume_snapshot_id = \"${SNAPSHOT_ID}\"|" "$PROJECT_ROOT/configs/terraform.tfvars"
  # Move backup file to state directory if it exists
  [ -f "$PROJECT_ROOT/configs/terraform.tfvars.bak" ] && mv "$PROJECT_ROOT/configs/terraform.tfvars.bak" "$TERRAFORM_DIR/state/terraform.tfvars.bak" 2>/dev/null || true
else
  echo "" >> "$PROJECT_ROOT/configs/terraform.tfvars"
  echo "root_volume_snapshot_id = \"${SNAPSHOT_ID}\"" >> "$PROJECT_ROOT/configs/terraform.tfvars"
fi

echo "✅ Updated configs/terraform.tfvars: root_volume_snapshot_id = \"${SNAPSHOT_ID}\""
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Checkpoint created successfully!"
echo ""
echo "📋 Summary:"
echo "   Checkpoint Name: ${CHECKPOINT_NAME}"
echo "   Snapshot ID:     ${SNAPSHOT_ID}"
echo "   AMI ID:          ${AMI_ID}"
echo ""
echo "📝 Next steps:"
echo "   1. Run 'cd terraform && terraform -var-file=../configs/terraform.tfvars -state=state/terraform.tfstate plan' to see what will change"
echo "   2. Run 'cd terraform && terraform -var-file=../configs/terraform.tfvars -state=state/terraform.tfstate apply' to use the new checkpoint"
echo "   3. To test the checkpoint, you can:"
echo "      - Destroy the instance: cd terraform && terraform -var-file=../configs/terraform.tfvars -state=state/terraform.tfstate destroy -target=aws_instance.cvat"
echo "      - Recreate it: cd terraform && terraform -var-file=../configs/terraform.tfvars -state=state/terraform.tfstate apply"
echo ""
echo "💡 The snapshot and AMI are now saved. You can switch between checkpoints"
echo "   by updating 'root_volume_snapshot_id' in configs/terraform.tfvars"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

