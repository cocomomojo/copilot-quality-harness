import { getSQSClient } from '../lib/aws.js';
import { SendMessageCommand } from '@aws-sdk/client-sqs';
import { SQS_QUEUE_URL } from '../config.js';

export async function sendTaskNotification(eventType, userId, resourceId, action, details = {}) {
  try {
    const message = {
      eventType,
      userId,
      resourceId,
      action,
      details,
      timestamp: new Date().toISOString(),
    };
    await getSQSClient().send(new SendMessageCommand({
      QueueUrl: SQS_QUEUE_URL,
      MessageBody: JSON.stringify(message),
    }));
  } catch (error) {
    console.error('Failed to send SQS message:', error);
  }
}
