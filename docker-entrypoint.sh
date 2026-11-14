#!/bin/sh
set -e

# Start AWS Emulator in background
echo "🚀 Starting AWS Emulator..."
aws-emulator -b 0.0.0.0 &
EMULATOR_PID=$!

# Wait for credentials to be generated
echo "⏳ Waiting for credentials..."
max_attempts=20
attempt=0

while [ $attempt -lt $max_attempts ]; do
  if [ -f /home/emulator/.aws/emulator/9297/emulator_credentials ]; then
    echo "✅ Credentials file created"
    break
  fi
  attempt=$((attempt + 1))
  sleep 0.5
done

# Make all generated files world-readable
echo "🔐 Fixing permissions on credentials directory..."
chmod -R 755 /home/emulator/.aws/emulator/9297/
echo "✅ Permissions fixed"

# Wait for the emulator process
echo "⏳ Keeping emulator running..."
wait $EMULATOR_PID
