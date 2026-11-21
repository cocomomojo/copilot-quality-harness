import { ReceiveMessageCommand, DeleteMessageCommand } from '@aws-sdk/client-sqs';
import { v4 as uuidv4 } from 'uuid';
import { SQS_QUEUE_URL, TABLES } from '../config.js';
import { getSQSClient } from '../lib/aws.js';
import { putItem } from '../utils/dynamodb.js';

const POLL_INTERVAL_MS = 20000;
const RETRY_INTERVAL_MS = 5000;

export function toAuditLog(body) {
  return {
    logId: uuidv4(),
    userId: body.userId,
    eventType: body.eventType,
    action: body.action,
    resourceId: body.resourceId || null,
    details: body.details || {},
    timestamp: body.timestamp || new Date().toISOString(),
  };
}

async function processMessage(sqsClient, message) {
  const auditLog = toAuditLog(JSON.parse(message.Body));
  await putItem(TABLES.auditLogs, auditLog);
  await sqsClient.send(new DeleteMessageCommand({ QueueUrl: SQS_QUEUE_URL, ReceiptHandle: message.ReceiptHandle }));
  console.log(`Processed audit log: ${auditLog.eventType}`);
}

export async function startSQSListener() {
  console.log('Starting SQS listener...');
  const sqsClient = getSQSClient();

  async function pollMessages() {
    try {
      const response = await sqsClient.send(new ReceiveMessageCommand({
        QueueUrl: SQS_QUEUE_URL,
        MaxNumberOfMessages: 10,
        WaitTimeSeconds: 20,
      }));

      for (const message of response.Messages || []) {
        try {
          await processMessage(sqsClient, message);
        } catch (error) {
          console.error('Error processing message:', error);
        }
      }

      setTimeout(pollMessages, POLL_INTERVAL_MS);
    } catch (error) {
      console.error('SQS listener error:', error);
      setTimeout(pollMessages, RETRY_INTERVAL_MS);
    }
  }

  pollMessages();
}
