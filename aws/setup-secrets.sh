#!/usr/bin/env bash
# ==============================================================================
# 🔑 Kairo AWS Secrets Setup
# ==============================================================================
# Interactive script to store all secrets in AWS SSM Parameter Store (FREE tier).
# Usage: chmod +x aws/setup-secrets.sh && ./aws/setup-secrets.sh
# ==============================================================================

set -euo pipefail

REGION="ap-south-1"

echo "═══════════════════════════════════════════════════"
echo "🔑 Kairo Secrets Setup (SSM Parameter Store)"
echo "═══════════════════════════════════════════════════"
echo ""
echo "Enter your secret values below."
echo "Press Enter to skip optional fields."
echo ""

# Helper function
store_secret() {
  local name=$1
  local value=$2
  local description=$3

  if [ -z "$value" ]; then
    echo "   ⏭️  Skipped: $name"
    return
  fi

  aws ssm put-parameter \
    --name "$name" \
    --value "$value" \
    --type SecureString \
    --description "$description" \
    --overwrite \
    --region "$REGION" &>/dev/null

  echo "   ✅ Stored: $name"
}

# Groq API Keys (Required)
echo "── Groq API Keys (Required) ──"
read -rp "   GROQ_API_KEY_1: " GROQ_KEY_1
read -rp "   GROQ_API_KEY_2 (optional backup): " GROQ_KEY_2

store_secret "/kairo/groq-key-1" "$GROQ_KEY_1" "Groq API primary key"
store_secret "/kairo/groq-key-2" "${GROQ_KEY_2:-}" "Groq API backup key"

echo ""

# DeepSeek (Optional)
echo "── DeepSeek API (Optional) ──"
read -rp "   DEEPSEEK_API_KEY: " DEEPSEEK_KEY

store_secret "/kairo/deepseek-key" "${DEEPSEEK_KEY:-}" "DeepSeek API key"

echo ""

# IP Hash Salt
echo "── Security ──"
read -rp "   IP_HASH_SALT [kairo_deepseek_ip_salt_v1]: " IP_SALT
IP_SALT="${IP_SALT:-kairo_deepseek_ip_salt_v1}"

store_secret "/kairo/ip-hash-salt" "$IP_SALT" "SHA-256 salt for IP hashing"

echo ""

# Google OAuth (Optional)
echo "── Google OAuth (Optional) ──"
read -rp "   GOOGLE_CLIENT_ID: " GOOGLE_ID
read -rp "   GOOGLE_CLIENT_SECRET: " GOOGLE_SECRET

store_secret "/kairo/google-client-id" "${GOOGLE_ID:-}" "Google OAuth client ID"
store_secret "/kairo/google-client-secret" "${GOOGLE_SECRET:-}" "Google OAuth client secret"

echo ""

# E2B (Optional)
echo "── E2B Cloud Sandbox (Optional) ──"
read -rp "   E2B_API_KEY: " E2B_KEY

store_secret "/kairo/e2b-key" "${E2B_KEY:-}" "E2B cloud microVM API key"

echo ""
echo "═══════════════════════════════════════════════════"
echo "✅ All secrets stored in SSM Parameter Store!"
echo "   Region: $REGION"
echo "   Cost:   $0.00/mo (Standard tier is FREE)"
echo "═══════════════════════════════════════════════════"
