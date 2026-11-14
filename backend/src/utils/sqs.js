import { getSQSClient } from '../lib/aws.js';
import { SendMessageCommand } from '@aws-sdk/client-sqs';

const QUEUE_URL = process.env.SQS_QUEUE_URL || 'https://127.0.0.1:9297/000000000000/task-notification-queue';

export async function sendTaskNotification(eventType, userId, resourceId, action, details = {}) {
  try {
    const sqsClient = getSQSClient();
    const message = {
      eventType,
      userId,
      resourceId,
      action,
      details,
      timestamp: new Date().toISOString(),
    };
    
    const command = new SendMessageCommand({
      QueueUrl: QUEUE_URL,
      MessageBody: JSON.stringify(message),
    });
    
    await sqsClient.send(command);
  } catch (error) {
    console.error('Failed to send SQS message:', error);
  }
}
