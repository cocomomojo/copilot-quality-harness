#!/bin/bash
set -e

# AWS Emulator health check script

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
CERTS_DIR="$ROOT_DIR/certs"
CA_PEM="$CERTS_DIR/ca.pem"

if [ ! -f "$CA_PEM" ]; then
  echo "❌ Certificate not found at $CA_PEM"
  echo "   Please run: npm run dev:aws"
  exit 1
fi

export NODE_EXTRA_CA_CERTS="$CA_PEM"

echo "🔍 Checking AWS Emulator health..."

# Check if container is running
if ! docker compose ps aws-emulator | grep -q "Up"; then
  echo "❌ AWS Emulator container is not running"
  exit 1
fi

# Check if endpoint is responding
if curl -f -k -s https://127.0.0.1:9297/health >/dev/null 2>&1; then
  echo "✅ AWS Emulator is healthy at https://127.0.0.1:9297"
  exit 0
else
  echo "❌ AWS Emulator is not responding"
  docker compose logs aws-emulator | tail -20
  exit 1
fi
