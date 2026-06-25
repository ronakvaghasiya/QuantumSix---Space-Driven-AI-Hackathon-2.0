#!/usr/bin/env bash
# Run everything WITHOUT Docker
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

if [ ! -f "$ROOT/.local/qdrant/qdrant" ]; then
  echo "First time? Run: ./scripts/setup-local.sh"
  exit 1
fi

"$ROOT/scripts/start-infra-local.sh"

echo "==> Starting Backend (3001) + Frontend (3100)..."
"$ROOT/scripts/kill-dev-ports.sh"
npm run dev
