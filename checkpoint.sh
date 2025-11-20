#!/bin/bash
# Create a new checkpoint: snapshot the current instance and create an AMI
# This allows you to save your work at checkpoints (e.g., "n8n working", "mlflow working")

set -e

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Get region from terraform.tfvars or use default
REGION=$(grep -E "^aws_region" terraform.tfvars 2>/dev/null | sed 's/.*= *"\([^"]*\)".*/\1/' || echo "us-east-2")

echo "📸 Creating a new checkpoint..."
echo ""

# Get instance ID from terraform state
INSTANCE_ID=$(terraform output -raw instance_id 2>/dev/null || echo "")
if [ -z "$INSTANCE_ID" ]; then
  echo "❌ Error: Could not find instance ID. Make sure terraform apply has been run."
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
read -p "🏷️  Enter a checkpoint name (e.g., 'n8n-working', 'mlflow-setup'): " CHECKPOINT_NAME
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
AMI_NAME="minimal-from-snapshot-${SNAPSHOT_ID: -8}"
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
  --tag-specifications "ResourceType=image,Tags=[{Key=Name,Value=minimal-checkpoint},{Key=SnapshotID,Value=${SNAPSHOT_ID}},{Key=CheckpointPurpose,Value=CVAT Workstation},{Key=CheckpointName,Value=${CHECKPOINT_NAME}}]" \
  --query 'ImageId' \
  --output text 2>/dev/null || echo "")

if [ -z "$AMI_ID" ]; then
  echo "❌ Error: Failed to create AMI from snapshot."
  echo "💡 You can manually create the AMI later or update terraform.tfvars with snapshot ID."
  exit 1
fi

echo "✅ AMI created: ${AMI_ID}"
echo ""

# Update terraform.tfvars
echo "📝 Updating terraform.tfvars with new snapshot ID..."

# Backup the file
cp terraform.tfvars terraform.tfvars.bak

# Update snapshot ID
if grep -q "^root_volume_snapshot_id" terraform.tfvars; then
  sed -i.bak "s|^root_volume_snapshot_id = .*|root_volume_snapshot_id = \"${SNAPSHOT_ID}\"|" terraform.tfvars
else
  echo "" >> terraform.tfvars
  echo "root_volume_snapshot_id = \"${SNAPSHOT_ID}\"" >> terraform.tfvars
fi

# Remove backup files
rm -f terraform.tfvars.bak

echo "✅ Updated terraform.tfvars: root_volume_snapshot_id = \"${SNAPSHOT_ID}\""
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
echo "   1. Run 'terraform plan' to see what will change"
echo "   2. Run 'terraform apply' to use the new checkpoint"
echo "   3. To test the checkpoint, you can:"
echo "      - Destroy the instance: terraform destroy -target=aws_instance.minimal"
echo "      - Recreate it: terraform apply"
echo ""
echo "💡 The snapshot and AMI are now saved. You can switch between checkpoints"
echo "   by updating 'root_volume_snapshot_id' in terraform.tfvars"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

