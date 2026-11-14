#!/bin/sh
set -e

# Start AWS Emulator in background
aws-emulator -b 0.0.0.0 &
EMULATOR_PID=$!

# Wait for credentials to be generated (up to 10 seconds)
for i in $(seq 1 20); do
    if [ -f /home/emulator/.aws/emulator/9297/emulator_credentials ]; then
        echo "✅ Credentials file created"
        break
    fi
    sleep 0.5
done

# Make all generated files world-readable so host can copy them
chmod -R 755 /home/emulator/.aws/emulator/9297/
echo "✅ Fixed permissions on credentials directory"

# Wait for the emulator process (this keeps the container running)
wait $EMULATOR_PID
