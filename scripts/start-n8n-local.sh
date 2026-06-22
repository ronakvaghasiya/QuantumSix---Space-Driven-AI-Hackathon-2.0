#!/usr/bin/env bash
# Start n8n locally (no Docker) — backend on localhost:3001
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export N8N_HOST=localhost
export N8N_PORT=5678
export N8N_PROTOCOL=http
export WEBHOOK_URL=http://localhost:5678/
export N8N_BASIC_AUTH_ACTIVE=false

echo "Starting n8n at http://localhost:5678"
echo "Backend API expected at http://localhost:3001"
echo ""
echo "After start:"
echo "  1. Import workflows from n8n/workflows/*.json"
echo "  2. Activate each workflow (toggle ON)"
echo "  3. Add OpenAI credentials in n8n for AI agent nodes"
echo ""

if ! command -v n8n &>/dev/null; then
  echo "n8n not found globally — using npx n8n"
  exec npx n8n
else
  exec n8n
fi
