#!/usr/bin/env bash
# Free ports 3000 (frontend) and 3001 (backend) before npm run dev
for port in 3000 3001; do
  if fuser -n tcp "$port" &>/dev/null; then
    echo "Killing process on port $port..."
    fuser -k -n tcp "$port" &>/dev/null || true
    sleep 1
  fi
done
echo "Ports 3000 and 3001 are free."
