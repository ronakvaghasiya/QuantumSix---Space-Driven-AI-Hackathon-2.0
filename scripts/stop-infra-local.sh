#!/usr/bin/env bash
# Stop local Qdrant process (no Docker)
PID_FILE="$(cd "$(dirname "$0")" && pwd)/.local/qdrant/qdrant.pid"
if [ -f "$PID_FILE" ]; then
  kill "$(cat "$PID_FILE")" 2>/dev/null && rm -f "$PID_FILE"
  echo "Qdrant stopped."
else
  echo "Qdrant not running."
fi
