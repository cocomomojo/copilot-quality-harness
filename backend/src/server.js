import { createApp } from './app.js';
import { startSQSListener } from './workers/sqs-listener.js';

// Delay before starting the SQS worker so the AWS SDK config is fully initialised.
const SQS_WORKER_START_DELAY_MS = 2000;

const port = Number(process.env.PORT || 3000);
const app = createApp();

app.listen(port, () => console.log(`Quality harness API listening on ${port}`));

if (process.env.ENABLE_SQS_WORKER !== 'false') {
  setTimeout(startSQSListener, SQS_WORKER_START_DELAY_MS);
}
