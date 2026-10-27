#!/usr/bin/env bash
# ==============================================================================
# 🏗️  Kairo AWS Infrastructure Setup (One-Time)
# ==============================================================================
# Run this once to create all AWS resources needed for Kairo.
# Prerequisites: AWS CLI configured with ap-south-1 region
# Usage: chmod +x aws/setup-infra.sh && ./aws/setup-infra.sh
# ==============================================================================

set -euo pipefail

REGION="ap-south-1"
PROJECT="kairo"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

echo "═══════════════════════════════════════════════════"
echo "🚀 Kairo AWS Infrastructure Setup"
echo "   Account: ${ACCOUNT_ID}"
echo "   Region:  ${REGION}"
echo "═══════════════════════════════════════════════════"

# ─────────────────────────────────────────────────────
# 1. ECR Repositories
# ─────────────────────────────────────────────────────
echo ""
echo "📦 Step 1/7: Creating ECR repositories..."

for repo in kairo-backend kairo-security-engine; do
  if aws ecr describe-repositories --repository-names "$repo" --region "$REGION" &>/dev/null; then
    echo "   ✅ ECR repo '$repo' already exists"
  else
    aws ecr create-repository \
      --repository-name "$repo" \
      --region "$REGION" \
      --image-scanning-configuration scanOnPush=true \
      --encryption-configuration encryptionType=AES256 \
      --output text --query 'repository.repositoryUri'
    echo "   ✅ Created ECR repo: $repo"
  fi

  # Apply lifecycle policy for cost savings
  aws ecr put-lifecycle-policy \
    --repository-name "$repo" \
    --lifecycle-policy-text file://aws/ecr-lifecycle-policy.json \
    --region "$REGION" &>/dev/null
  echo "   🔄 Lifecycle policy applied to $repo"
done

# ─────────────────────────────────────────────────────
# 2. VPC & Networking (use default VPC for cost savings)
# ─────────────────────────────────────────────────────
echo ""
echo "🌐 Step 2/7: Configuring networking (default VPC)..."

DEFAULT_VPC_ID=$(aws ec2 describe-vpcs --filters "Name=isDefault,Values=true" --query "Vpcs[0].VpcId" --output text --region "$REGION")
echo "   VPC: ${DEFAULT_VPC_ID}"

# Get first 2 subnets from default VPC
SUBNET_IDS=$(aws ec2 describe-subnets \
  --filters "Name=vpc-id,Values=${DEFAULT_VPC_ID}" "Name=default-for-az,Values=true" \
  --query "Subnets[0:2].SubnetId" --output text --region "$REGION")
SUBNET_1=$(echo "$SUBNET_IDS" | awk '{print $1}')
SUBNET_2=$(echo "$SUBNET_IDS" | awk '{print $2}')
echo "   Subnets: ${SUBNET_1}, ${SUBNET_2}"

# Create security group for ECS
SG_NAME="kairo-ecs-sg"
EXISTING_SG=$(aws ec2 describe-security-groups \
  --filters "Name=group-name,Values=${SG_NAME}" "Name=vpc-id,Values=${DEFAULT_VPC_ID}" \
  --query "SecurityGroups[0].GroupId" --output text --region "$REGION" 2>/dev/null || echo "None")

if [ "$EXISTING_SG" != "None" ] && [ "$EXISTING_SG" != "" ]; then
  SG_ID="$EXISTING_SG"
  echo "   ✅ Security group already exists: ${SG_ID}"
else
  SG_ID=$(aws ec2 create-security-group \
    --group-name "$SG_NAME" \
    --description "Kairo ECS Fargate security group" \
    --vpc-id "$DEFAULT_VPC_ID" \
    --query "GroupId" --output text --region "$REGION")

  # Allow inbound on port 5000 (backend)
  aws ec2 authorize-security-group-ingress \
    --group-id "$SG_ID" \
    --protocol tcp --port 5000 \
    --cidr 0.0.0.0/0 \
    --region "$REGION" &>/dev/null

  # Allow inbound on port 443 (HTTPS)
  aws ec2 authorize-security-group-ingress \
    --group-id "$SG_ID" \
    --protocol tcp --port 443 \
    --cidr 0.0.0.0/0 \
    --region "$REGION" &>/dev/null

  # Allow NFS for EFS (port 2049)
  aws ec2 authorize-security-group-ingress \
    --group-id "$SG_ID" \
    --protocol tcp --port 2049 \
    --source-group "$SG_ID" \
    --region "$REGION" &>/dev/null

  echo "   ✅ Created security group: ${SG_ID}"
fi

# ─────────────────────────────────────────────────────
# 3. EFS (for SQLite persistence)
# ─────────────────────────────────────────────────────
echo ""
echo "💾 Step 3/7: Creating EFS filesystem..."

EXISTING_EFS=$(aws efs describe-file-systems \
  --query "FileSystems[?Tags[?Key=='Name'&&Value=='kairo-db']].FileSystemId" \
  --output text --region "$REGION" 2>/dev/null)

if [ -n "$EXISTING_EFS" ] && [ "$EXISTING_EFS" != "" ]; then
  EFS_ID="$EXISTING_EFS"
  echo "   ✅ EFS already exists: ${EFS_ID}"
else
  EFS_ID=$(aws efs create-file-system \
    --performance-mode generalPurpose \
    --throughput-mode bursting \
    --encrypted \
    --tags Key=Name,Value=kairo-db \
    --query "FileSystemId" --output text --region "$REGION")
  echo "   ✅ Created EFS: ${EFS_ID}"

  # Wait for EFS to be available
  echo "   ⏳ Waiting for EFS to become available..."
  aws efs describe-file-systems --file-system-id "$EFS_ID" --region "$REGION" &>/dev/null
  sleep 10

  # Create mount targets in each subnet
  for subnet in $SUBNET_1 $SUBNET_2; do
    aws efs create-mount-target \
      --file-system-id "$EFS_ID" \
      --subnet-id "$subnet" \
      --security-groups "$SG_ID" \
      --region "$REGION" &>/dev/null || true
    echo "   📂 Mount target created in $subnet"
  done
fi

# ─────────────────────────────────────────────────────
# 4. IAM Roles
# ─────────────────────────────────────────────────────
echo ""
echo "🔐 Step 4/7: Creating IAM roles..."

# ECS Task Execution Role (pulls images, reads secrets)
EXEC_ROLE_NAME="kairoEcsExecutionRole"
if aws iam get-role --role-name "$EXEC_ROLE_NAME" &>/dev/null; then
  echo "   ✅ Execution role already exists"
else
  aws iam create-role \
    --role-name "$EXEC_ROLE_NAME" \
    --assume-role-policy-document '{
      "Version": "2012-10-17",
      "Statement": [{
        "Effect": "Allow",
        "Principal": {"Service": "ecs-tasks.amazonaws.com"},
        "Action": "sts:AssumeRole"
      }]
    }' --output text --query 'Role.Arn' &>/dev/null

  aws iam attach-role-policy \
    --role-name "$EXEC_ROLE_NAME" \
    --policy-arn "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"

  # Allow reading SSM parameters (for secrets)
  aws iam put-role-policy \
    --role-name "$EXEC_ROLE_NAME" \
    --policy-name "KairoSSMReadPolicy" \
    --policy-document '{
      "Version": "2012-10-17",
      "Statement": [{
        "Effect": "Allow",
        "Action": [
          "ssm:GetParameters",
          "ssm:GetParameter"
        ],
        "Resource": "arn:aws:ssm:'"$REGION"':'"$ACCOUNT_ID"':parameter/kairo/*"
      }]
    }'

  echo "   ✅ Created execution role: $EXEC_ROLE_NAME"
fi

# ECS Task Role (what the container can do at runtime)
TASK_ROLE_NAME="kairoEcsTaskRole"
if aws iam get-role --role-name "$TASK_ROLE_NAME" &>/dev/null; then
  echo "   ✅ Task role already exists"
else
  aws iam create-role \
    --role-name "$TASK_ROLE_NAME" \
    --assume-role-policy-document '{
      "Version": "2012-10-17",
      "Statement": [{
        "Effect": "Allow",
        "Principal": {"Service": "ecs-tasks.amazonaws.com"},
        "Action": "sts:AssumeRole"
      }]
    }' --output text --query 'Role.Arn' &>/dev/null

  # Allow EFS access
  aws iam put-role-policy \
    --role-name "$TASK_ROLE_NAME" \
    --policy-name "KairoEFSPolicy" \
    --policy-document '{
      "Version": "2012-10-17",
      "Statement": [{
        "Effect": "Allow",
        "Action": [
          "elasticfilesystem:ClientMount",
          "elasticfilesystem:ClientWrite",
          "elasticfilesystem:ClientRootAccess"
        ],
        "Resource": "*"
      }]
    }'

  echo "   ✅ Created task role: $TASK_ROLE_NAME"
fi

# ─────────────────────────────────────────────────────
# 5. SSM Parameter Store (Secrets — FREE tier)
# ─────────────────────────────────────────────────────
echo ""
echo "🔑 Step 5/7: Setting up secrets in SSM Parameter Store..."
echo "   ⚠️  You need to manually set your actual secret values!"
echo ""
echo "   Run these commands with your actual keys:"
echo "   ─────────────────────────────────────────"
echo "   aws ssm put-parameter --name '/kairo/groq-key-1' --value 'gsk_YOUR_KEY' --type SecureString --region $REGION"
echo "   aws ssm put-parameter --name '/kairo/groq-key-2' --value 'gsk_YOUR_KEY' --type SecureString --region $REGION"
echo "   aws ssm put-parameter --name '/kairo/deepseek-key' --value 'sk-YOUR_KEY' --type SecureString --region $REGION"
echo "   aws ssm put-parameter --name '/kairo/ip-hash-salt' --value 'YOUR_SALT' --type SecureString --region $REGION"
echo "   aws ssm put-parameter --name '/kairo/google-client-id' --value 'YOUR_ID' --type SecureString --region $REGION"
echo "   aws ssm put-parameter --name '/kairo/google-client-secret' --value 'YOUR_SECRET' --type SecureString --region $REGION"
echo ""

# ─────────────────────────────────────────────────────
# 6. ECS Cluster
# ─────────────────────────────────────────────────────
echo ""
echo "🏭 Step 6/7: Creating ECS cluster..."

CLUSTER_NAME="kairo-cluster"
if aws ecs describe-clusters --clusters "$CLUSTER_NAME" --region "$REGION" --query "clusters[?status=='ACTIVE'].clusterName" --output text | grep -q "$CLUSTER_NAME"; then
  echo "   ✅ Cluster already exists"
else
  aws ecs create-cluster \
    --cluster-name "$CLUSTER_NAME" \
    --capacity-providers FARGATE_SPOT FARGATE \
    --default-capacity-provider-strategy \
      capacityProvider=FARGATE_SPOT,weight=4,base=1 \
      capacityProvider=FARGATE,weight=1 \
    --setting name=containerInsights,value=disabled \
    --region "$REGION" &>/dev/null
  echo "   ✅ Created cluster: $CLUSTER_NAME (Fargate Spot priority)"
fi

# ─────────────────────────────────────────────────────
# 7. CloudWatch Log Groups (7-day retention for cost)
# ─────────────────────────────────────────────────────
echo ""
echo "📊 Step 7/7: Creating CloudWatch log groups..."

for log_group in /ecs/kairo-backend /ecs/kairo-security-engine; do
  aws logs create-log-group --log-group-name "$log_group" --region "$REGION" 2>/dev/null || true
  aws logs put-retention-policy --log-group-name "$log_group" --retention-in-days 7 --region "$REGION"
  echo "   ✅ Log group: $log_group (7-day retention)"
done

# ─────────────────────────────────────────────────────
# Summary
# ─────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════"
echo "✅ Infrastructure setup complete!"
echo "═══════════════════════════════════════════════════"
echo ""
echo "📝 Resources created:"
echo "   • ECR repos:    kairo-backend, kairo-security-engine"
echo "   • VPC:          ${DEFAULT_VPC_ID} (default)"
echo "   • Subnets:      ${SUBNET_1}, ${SUBNET_2}"
echo "   • Security Grp: ${SG_ID}"
echo "   • EFS:          ${EFS_ID}"
echo "   • IAM Roles:    ${EXEC_ROLE_NAME}, ${TASK_ROLE_NAME}"
echo "   • ECS Cluster:  ${CLUSTER_NAME}"
echo ""
echo "📋 Next steps:"
echo "   1. Set your secrets in SSM (commands printed above)"
echo "   2. Update aws/task-definition.json:"
echo "      - Replace ACCOUNT_ID with: ${ACCOUNT_ID}"
echo "      - Replace EFS_FILE_SYSTEM_ID with: ${EFS_ID}"
echo "   3. Run: ./aws/deploy.sh"
echo ""

# Save config for deploy script
cat > aws/.infra-config <<EOF
ACCOUNT_ID=${ACCOUNT_ID}
REGION=${REGION}
VPC_ID=${DEFAULT_VPC_ID}
SUBNET_1=${SUBNET_1}
SUBNET_2=${SUBNET_2}
SG_ID=${SG_ID}
EFS_ID=${EFS_ID}
CLUSTER_NAME=${CLUSTER_NAME}
EOF
echo "💾 Config saved to aws/.infra-config"
