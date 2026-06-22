#!/usr/bin/env bash
# One-time setup WITHOUT Docker (Ubuntu/Debian)
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "=== RepoPilot AI — Local setup (no Docker) ==="

# --- PostgreSQL ---
if ! command -v psql &>/dev/null; then
  echo "Installing PostgreSQL..."
  sudo apt update
  sudo apt install -y postgresql postgresql-contrib
  sudo systemctl enable postgresql
  sudo systemctl start postgresql
else
  echo "PostgreSQL already installed."
  sudo systemctl start postgresql 2>/dev/null || true
fi

echo "Creating database user and database..."
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='sdlc'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE USER sdlc WITH PASSWORD 'sdlc_secret';"
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='sdlc_platform'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE DATABASE sdlc_platform OWNER sdlc;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE sdlc_platform TO sdlc;" 2>/dev/null || true

echo "PostgreSQL OK → postgresql://sdlc:sdlc_secret@localhost:5432/sdlc_platform"

# --- Qdrant (binary, no Docker) ---
QDRANT_DIR="$ROOT/.local/qdrant"
QDRANT_BIN="$QDRANT_DIR/qdrant"
mkdir -p "$QDRANT_DIR/storage"

if [ ! -f "$QDRANT_BIN" ]; then
  echo "Downloading Qdrant binary..."
  ARCH=$(uname -m)
  case "$ARCH" in
    x86_64) QDRANT_ARCH="x86_64-unknown-linux-gnu" ;;
    aarch64|arm64) QDRANT_ARCH="aarch64-unknown-linux-gnu" ;;
    *) echo "Unsupported arch: $ARCH"; exit 1 ;;
  esac
  TMP=$(mktemp -d)
  curl -fsSL "https://github.com/qdrant/qdrant/releases/download/v1.12.5/qdrant-${QDRANT_ARCH}.tar.gz" \
    | tar -xz -C "$TMP"
  mv "$TMP/qdrant" "$QDRANT_BIN"
  chmod +x "$QDRANT_BIN"
  rm -rf "$TMP"
  echo "Qdrant binary installed at $QDRANT_BIN"
else
  echo "Qdrant binary already exists."
fi

# Sync backend .env if missing keys
if [ -f "$ROOT/backend/.env" ]; then
  echo "backend/.env exists — OK"
else
  cp "$ROOT/.env.example" "$ROOT/backend/.env" 2>/dev/null || true
fi

echo ""
echo "=== Setup complete ==="
echo "Next: ./start-local.sh"
