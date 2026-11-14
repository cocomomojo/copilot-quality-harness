#!/bin/bash
set -e

# AWS Emulator startup script using docker-compose
# AWS Emulator auto-generates credentials and CA certificate on startup
# This script waits for those files to be created and makes them accessible to the host

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
CERTS_DIR="$ROOT_DIR/certs"
CA_PEM="$CERTS_DIR/ca.pem"
CREDENTIALS_FILE="$CERTS_DIR/emulator_credentials"

# Create certificates directory if it doesn't exist
mkdir -p "$CERTS_DIR"

echo "🚀 Starting AWS Emulator..."
cd "$ROOT_DIR"

# Build and start docker compose
docker compose up -d --build aws-emulator

# Wait for container to be healthy
echo "⏳ Waiting for AWS Emulator to be healthy..."
max_attempts=60
attempt=0

while [ $attempt -lt $max_attempts ]; do
  if docker compose exec -T aws-emulator curl -f -k https://127.0.0.1:9297/__admin/health >/dev/null 2>&1; then
    echo "✅ AWS Emulator is healthy"
    break
  fi
  attempt=$((attempt + 1))
  echo "  Attempt $attempt/$max_attempts..."
  sleep 1
done

if [ $attempt -eq $max_attempts ]; then
  echo "❌ AWS Emulator failed to become healthy within timeout"
  echo ""
  echo "📋 Container logs:"
  docker compose logs aws-emulator | tail -30
  exit 1
fi

# Wait for credentials and CA certificate to be generated in container
echo "⏳ Waiting for AWS Emulator to generate credentials and certificate..."
max_attempts=30
attempt=0

while [ $attempt -lt $max_attempts ]; do
  if docker compose exec -T aws-emulator test -f /home/emulator/.aws/emulator/9297/emulator_credentials >/dev/null 2>&1; then
    echo "✅ Credentials file generated"
    break
  fi
  attempt=$((attempt + 1))
  sleep 0.5
done

# Copy credentials and certificate from container to host
echo "📋 Copying credentials and certificate from container..."
docker compose cp "aws-emulator:/home/emulator/.aws/emulator/9297/ca.pem" "$CA_PEM"
docker compose cp "aws-emulator:/home/emulator/.aws/emulator/9297/emulator_credentials" "$CREDENTIALS_FILE"

echo "✅ Certificate copied to $CA_PEM"
echo "✅ Credentials copied to $CREDENTIALS_FILE"
chmod 644 "$CA_PEM" "$CREDENTIALS_FILE"

# Export environment variables for use
export NODE_EXTRA_CA_CERTS="$CA_PEM"
export AWS_SHARED_CREDENTIALS_FILE="$CREDENTIALS_FILE"
export AWS_ENDPOINT_URL="https://127.0.0.1:9297"
export AWS_REGION="us-east-1"

echo ""
echo "✅ AWS Emulator started successfully!"
echo ""
echo "📝 Set these environment variables to use AWS services:"
echo "   export NODE_EXTRA_CA_CERTS=$CA_PEM"
echo "   export AWS_SHARED_CREDENTIALS_FILE=$CREDENTIALS_FILE"
echo "   export AWS_ENDPOINT_URL=$AWS_ENDPOINT_URL"
echo "   export AWS_REGION=$AWS_REGION"
echo ""

