import { getSQSClient } from '../lib/aws.js';
import { ReceiveMessageCommand, DeleteMessageCommand } from '@aws-sdk/client-sqs';
import { putItem } from '../utils/dynamodb.js';
import { v4 as uuidv4 } from 'uuid';

const QUEUE_URL = process.env.SQS_QUEUE_URL || 'https://127.0.0.1:9297/000000000000/task-notification-queue';
const AUDIT_LOGS_TABLE = 'AuditLogs';

function generateLogId() {
  return uuidv4();
}

export async function startSQSListener() {
  console.log('Starting SQS listener...');
  
  const sqsClient = getSQSClient();
  
  async function pollMessages() {
    try {
      const command = new ReceiveMessageCommand({
        QueueUrl: QUEUE_URL,
        MaxNumberOfMessages: 10,
        WaitTimeSeconds: 20,
      });
      
      const response = await sqsClient.send(command);
      
      if (response.Messages) {
        for (const message of response.Messages) {
          try {
            const body = JSON.parse(message.Body);
            
            const auditLog = {
              logId: generateLogId(),
              userId: body.userId,
              eventType: body.eventType,
              action: body.action,
              resourceId: body.resourceId || null,
              details: body.details || {},
              timestamp: body.timestamp || new Date().toISOString(),
            };
            
            await putItem(AUDIT_LOGS_TABLE, auditLog);
            
            // Delete message from queue
            const deleteCommand = new DeleteMessageCommand({
              QueueUrl: QUEUE_URL,
              ReceiptHandle: message.ReceiptHandle,
            });
            
            await sqsClient.send(deleteCommand);
            
            console.log(`Processed audit log: ${auditLog.eventType}`);
          } catch (error) {
            console.error('Error processing message:', error);
          }
        }
      }
      
      // Poll again after a delay
      setTimeout(pollMessages, 20000);
    } catch (error) {
      console.error('SQS listener error:', error);
      // Retry after delay
      setTimeout(pollMessages, 5000);
    }
  }
  
  // Start polling
  pollMessages();
}
