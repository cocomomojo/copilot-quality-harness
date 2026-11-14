import { createApp } from './app.js';
import { startSQSListener } from './workers/sqs-listener.js';

const port = Number(process.env.PORT || 3000);
const app = createApp();

app.listen(port, () => console.log(`Quality harness API listening on ${port}`));

// Start SQS listener worker
if (process.env.ENABLE_SQS_WORKER !== 'false') {
  startSQSListener();
}
