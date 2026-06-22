#!/usr/bin/env bash
# Start Postgres check + Qdrant binary (no Docker)
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
QDRANT_BIN="$ROOT/.local/qdrant/qdrant"
QDRANT_STORAGE="$ROOT/.local/qdrant/storage"
PID_FILE="$ROOT/.local/qdrant/qdrant.pid"

# PostgreSQL
if ! pg_isready -h localhost -p 5432 &>/dev/null; then
  echo "PostgreSQL not running. Try: sudo systemctl start postgresql"
  exit 1
fi
echo "PostgreSQL: running"

# Qdrant
if [ ! -f "$QDRANT_BIN" ]; then
  echo "Qdrant not installed. Run: ./scripts/setup-local.sh"
  exit 1
fi

if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
  echo "Qdrant: already running (pid $(cat "$PID_FILE"))"
else
  mkdir -p "$QDRANT_STORAGE"
  QDRANT__STORAGE__STORAGE_PATH="$QDRANT_STORAGE" \
    "$QDRANT_BIN" > "$ROOT/.local/qdrant/qdrant.log" 2>&1 &
  echo $! > "$PID_FILE"
  sleep 2
  echo "Qdrant: started (pid $(cat "$PID_FILE")) → http://localhost:6333"
fi

echo "Infrastructure ready (no Docker). n8n skipped — optional for Phase 1."
