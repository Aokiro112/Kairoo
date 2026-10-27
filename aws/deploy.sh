#!/usr/bin/env bash
# ==============================================================================
# 🚀 Kairo Deploy to AWS ECS
# ==============================================================================
# Builds Docker images, pushes to ECR, and deploys to ECS Fargate Spot.
# Prerequisites: Run aws/setup-infra.sh first
# Usage: chmod +x aws/deploy.sh && ./aws/deploy.sh
# ==============================================================================

set -euo pipefail

# Load infra config if exists
SCRIPT_DIR="$(dirname "$0")"
if [ -f "$SCRIPT_DIR/.infra-config" ]; then
  source "$SCRIPT_DIR/.infra-config"
else
  ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
  REGION="ap-south-1"
  CLUSTER_NAME="kairo-cluster"
fi

# Derive from config
ECR_BACKEND="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/kairo-backend"
ECR_SECURITY="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/kairo-security-engine"
SERVICE_NAME="kairo-backend-service"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
IMAGE_TAG="v-${TIMESTAMP}"

echo "═══════════════════════════════════════════════════"
echo "🚀 Kairo AWS Deployment"
echo "   Account:  ${ACCOUNT_ID}"
echo "   Region:   ${REGION}"
echo "   Cluster:  ${CLUSTER_NAME}"
echo "   Tag:      ${IMAGE_TAG}"
echo "═══════════════════════════════════════════════════"

# ─────────────────────────────────────────────────────
# 1. Authenticate with ECR
# ─────────────────────────────────────────────────────
echo ""
echo "🔐 Step 1/5: Logging into ECR..."
aws ecr get-login-password --region "$REGION" | \
  docker login --username AWS --password-stdin "${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"
echo "   ✅ ECR login successful"

# ─────────────────────────────────────────────────────
# 2. Build & Push Backend
# ─────────────────────────────────────────────────────
echo ""
echo "🏗️  Step 2/5: Building Backend image..."
docker build -t kairo-backend -f Backend/Dockerfile Backend/

docker tag kairo-backend:latest "${ECR_BACKEND}:latest"
docker tag kairo-backend:latest "${ECR_BACKEND}:${IMAGE_TAG}"

echo "   📤 Pushing to ECR..."
docker push "${ECR_BACKEND}:latest"
docker push "${ECR_BACKEND}:${IMAGE_TAG}"
echo "   ✅ Backend pushed: ${IMAGE_TAG}"

# ─────────────────────────────────────────────────────
# 3. Build & Push SecurityEngine
# ─────────────────────────────────────────────────────
echo ""
echo "🛡️  Step 3/5: Building SecurityEngine image..."
docker build -t kairo-security-engine -f SecurityEngine/Dockerfile SecurityEngine/

docker tag kairo-security-engine:latest "${ECR_SECURITY}:latest"
docker tag kairo-security-engine:latest "${ECR_SECURITY}:${IMAGE_TAG}"

echo "   📤 Pushing to ECR..."
docker push "${ECR_SECURITY}:latest"
docker push "${ECR_SECURITY}:${IMAGE_TAG}"
echo "   ✅ SecurityEngine pushed: ${IMAGE_TAG}"

# ─────────────────────────────────────────────────────
# 4. Update Task Definition (inject real values)
# ─────────────────────────────────────────────────────
echo ""
echo "📋 Step 4/5: Registering task definition..."

# Replace placeholders in task definition
TASK_DEF=$(cat aws/task-definition.json)
TASK_DEF=$(echo "$TASK_DEF" | sed "s|ACCOUNT_ID|${ACCOUNT_ID}|g")

if [ -n "${EFS_ID:-}" ]; then
  TASK_DEF=$(echo "$TASK_DEF" | sed "s|EFS_FILE_SYSTEM_ID|${EFS_ID}|g")
fi

# Write resolved task definition
echo "$TASK_DEF" > /tmp/kairo-task-def-resolved.json

aws ecs register-task-definition \
  --cli-input-json file:///tmp/kairo-task-def-resolved.json \
  --region "$REGION" &>/dev/null
echo "   ✅ Task definition registered"

rm -f /tmp/kairo-task-def-resolved.json

# ─────────────────────────────────────────────────────
# 5. Deploy / Update ECS Service
# ─────────────────────────────────────────────────────
echo ""
echo "🔄 Step 5/5: Deploying to ECS..."

# Check if service exists
if aws ecs describe-services --cluster "$CLUSTER_NAME" --services "$SERVICE_NAME" --region "$REGION" \
  --query "services[?status=='ACTIVE'].serviceName" --output text 2>/dev/null | grep -q "$SERVICE_NAME"; then

  # Service exists → force new deployment
  aws ecs update-service \
    --cluster "$CLUSTER_NAME" \
    --service "$SERVICE_NAME" \
    --force-new-deployment \
    --region "$REGION" &>/dev/null
  echo "   ✅ Service updated with new deployment"
else
  # Service doesn't exist → create it
  if [ -z "${SUBNET_1:-}" ] || [ -z "${SG_ID:-}" ]; then
    echo "   ❌ Missing SUBNET_1 or SG_ID. Run setup-infra.sh first!"
    exit 1
  fi

  aws ecs create-service \
    --cluster "$CLUSTER_NAME" \
    --service-name "$SERVICE_NAME" \
    --task-definition kairo-backend \
    --desired-count 1 \
    --capacity-provider-strategy capacityProvider=FARGATE_SPOT,weight=4,base=1 capacityProvider=FARGATE,weight=1 \
    --network-configuration "awsvpcConfiguration={subnets=[${SUBNET_1},${SUBNET_2}],securityGroups=[${SG_ID}],assignPublicIp=ENABLED}" \
    --deployment-configuration "maximumPercent=200,minimumHealthyPercent=100,deploymentCircuitBreaker={enable=true,rollback=true}" \
    --region "$REGION" &>/dev/null
  echo "   ✅ Service created: $SERVICE_NAME"
fi

# ─────────────────────────────────────────────────────
# Done!
# ─────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════"
echo "✅ Deployment complete!"
echo "═══════════════════════════════════════════════════"
echo ""
echo "📊 Monitor deployment:"
echo "   aws ecs describe-services --cluster $CLUSTER_NAME --services $SERVICE_NAME --region $REGION --query 'services[0].{Status:status,Running:runningCount,Desired:desiredCount,Deployments:deployments[*].{Status:status,Running:runningCount}}'"
echo ""
echo "📋 View logs:"
echo "   aws logs tail /ecs/kairo-backend --region $REGION --follow"
echo ""
echo "🌐 Get task public IP:"
echo "   TASK_ARN=\$(aws ecs list-tasks --cluster $CLUSTER_NAME --service-name $SERVICE_NAME --region $REGION --query 'taskArns[0]' --output text)"
echo "   ENI=\$(aws ecs describe-tasks --cluster $CLUSTER_NAME --tasks \$TASK_ARN --region $REGION --query 'tasks[0].attachments[0].details[?name==\`networkInterfaceId\`].value' --output text)"
echo "   aws ec2 describe-network-interfaces --network-interface-ids \$ENI --region $REGION --query 'NetworkInterfaces[0].Association.PublicIp' --output text"
