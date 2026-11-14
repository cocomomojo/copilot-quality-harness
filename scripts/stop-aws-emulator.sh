#!/bin/bash
set -e

# AWS Emulator stop script

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo "🛑 Stopping AWS Emulator..."
cd "$ROOT_DIR"

docker compose down

echo "✅ AWS Emulator stopped"
