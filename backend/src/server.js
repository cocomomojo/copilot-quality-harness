// For AWS Emulator with self-signed certificates (local dev/test only)
// AWS SDK clients will be connecting to https://localhost:9297
// This must be set BEFORE importing AWS SDK modules
if (process.env.AWS_ENDPOINT_URL?.includes('localhost') || process.env.AWS_ENDPOINT_URL?.includes('127.0.0.1')) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

import { createApp } from './app.js';
import { startSQSListener } from './workers/sqs-listener.js';

const port = Number(process.env.PORT || 3000);
const app = createApp();

app.listen(port, () => console.log(`Quality harness API listening on ${port}`));

// Start SQS listener worker
// Delay initialization to ensure AWS config is fully set up
if (process.env.ENABLE_SQS_WORKER !== 'false') {
  // Delay by 2 seconds to allow AWS SDK to initialize properly
  setTimeout(() => {
    startSQSListener();
  }, 2000);
}
