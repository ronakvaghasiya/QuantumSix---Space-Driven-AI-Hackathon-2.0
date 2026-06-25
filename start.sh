#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

echo "==> Starting Docker (postgres, qdrant, n8n)..."
docker-compose up -d

echo "==> Starting Backend (3001) + Frontend (3100)..."
npm run dev
