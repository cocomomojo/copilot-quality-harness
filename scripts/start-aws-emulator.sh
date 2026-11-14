#!/bin/bash
set -e

# AWS Emulator startup script using docker-compose

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
CERTS_DIR="$ROOT_DIR/certs"
CA_PEM="$CERTS_DIR/ca.pem"

# Create certificates directory if it doesn't exist
mkdir -p "$CERTS_DIR"

echo "🚀 Starting AWS Emulator..."
cd "$ROOT_DIR"

# Ensure home directory exists for emulator data
mkdir -p ~/.aws/emulator

# Build and start docker compose
docker compose up -d --build aws-emulator

# Wait for container to be healthy
echo "⏳ Waiting for AWS Emulator to be healthy..."
max_attempts=60
attempt=0

while [ $attempt -lt $max_attempts ]; do
  if docker compose exec -T aws-emulator curl -f -k https://127.0.0.1:9297/health >/dev/null 2>&1; then
    echo "✅ AWS Emulator is healthy"
    break
  fi
  attempt=$((attempt + 1))
  echo "  Attempt $attempt/$max_attempts..."
  sleep 2
done

if [ $attempt -eq $max_attempts ]; then
  echo "❌ AWS Emulator failed to become healthy within timeout"
  echo ""
  echo "📋 Container logs:"
  docker compose logs aws-emulator | tail -30
  exit 1
fi

# Extract certificate from container (AWS Emulator generates certificates)
echo "📜 Extracting certificate from AWS Emulator..."
if docker compose exec -T aws-emulator test -f /.aws-emulator/ca.pem >/dev/null 2>&1; then
  docker compose cp "aws-emulator:/.aws-emulator/ca.pem" "$CA_PEM"
  echo "✅ Certificate extracted to $CA_PEM"
  chmod 644 "$CA_PEM"
elif docker compose exec -T aws-emulator test -f /home/emulator/.aws/emulator/ca.pem >/dev/null 2>&1; then
  docker compose cp "aws-emulator:/home/emulator/.aws/emulator/ca.pem" "$CA_PEM"
  echo "✅ Certificate extracted to $CA_PEM"
  chmod 644 "$CA_PEM"
else
  echo "⚠️  CA certificate not found in expected locations"
fi

# Export environment variables for use
export NODE_EXTRA_CA_CERTS="$CA_PEM"
export AWS_ENDPOINT_URL="https://127.0.0.1:9297"
export AWS_REGION="us-east-1"
export AWS_ACCESS_KEY_ID="test"
export AWS_SECRET_ACCESS_KEY="test"

echo ""
echo "✅ AWS Emulator started successfully!"
echo ""
echo "📝 Set these environment variables to use AWS services:"
echo "   export NODE_EXTRA_CA_CERTS=$CA_PEM"
echo "   export AWS_ENDPOINT_URL=$AWS_ENDPOINT_URL"
echo "   export AWS_REGION=$AWS_REGION"
echo "   export AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID"
echo "   export AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY"
echo ""

