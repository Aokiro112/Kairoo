#!/usr/bin/env bash
set -e

echo "🚀 Building HackerAI Dark Security Engine Docker Container..."
docker compose build

echo "⚡ Starting Security Engine daemon..."
docker compose up -d

echo "✅ Security Engine container is running as 'hackerai-security-engine'."
