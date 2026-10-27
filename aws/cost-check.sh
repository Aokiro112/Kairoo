#!/usr/bin/env bash
# ==============================================================================
# 📊 Kairo AWS Cost Monitor
# ==============================================================================
# Quick check of current month's AWS spending.
# Usage: chmod +x aws/cost-check.sh && ./aws/cost-check.sh
# ==============================================================================

set -euo pipefail

REGION="ap-south-1"
START_DATE=$(date -d "$(date +%Y-%m-01)" +%Y-%m-%d)
END_DATE=$(date +%Y-%m-%d)

echo "═══════════════════════════════════════════════════"
echo "💰 Kairo AWS Cost Report"
echo "   Period: ${START_DATE} → ${END_DATE}"
echo "═══════════════════════════════════════════════════"
echo ""

# Total cost this month
TOTAL=$(aws ce get-cost-and-usage \
  --time-period Start="$START_DATE",End="$END_DATE" \
  --granularity MONTHLY \
  --metrics "BlendedCost" \
  --query 'ResultsByTime[0].Total.BlendedCost.Amount' \
  --output text 2>/dev/null || echo "N/A")

echo "📊 Total spend this month: \$${TOTAL}"
echo ""

# Cost by service
echo "📋 Breakdown by service:"
aws ce get-cost-and-usage \
  --time-period Start="$START_DATE",End="$END_DATE" \
  --granularity MONTHLY \
  --metrics "BlendedCost" \
  --group-by Type=DIMENSION,Key=SERVICE \
  --query 'ResultsByTime[0].Groups[?Metrics.BlendedCost.Amount!=`0`].{Service:Keys[0],Cost:Metrics.BlendedCost.Amount}' \
  --output table 2>/dev/null || echo "   (Cost Explorer API not enabled or no data yet)"

echo ""

# ECS tasks running
echo "🏭 Running ECS tasks:"
RUNNING=$(aws ecs list-tasks --cluster kairo-cluster --region "$REGION" --query 'taskArns' --output text 2>/dev/null || echo "None")
if [ "$RUNNING" = "None" ] || [ -z "$RUNNING" ]; then
  echo "   No tasks running (✅ no compute cost)"
else
  echo "   $RUNNING"
fi

echo ""
echo "═══════════════════════════════════════════════════"
echo "💡 Tips to keep costs low:"
echo "   • Keep Fargate Spot (70% cheaper)"
echo "   • CloudWatch logs: 7-day retention ✅"
echo "   • ECR lifecycle: auto-cleanup old images ✅"
echo "   • No NAT Gateway ✅"
echo "   • No RDS (SQLite on EFS) ✅"
echo "═══════════════════════════════════════════════════"
