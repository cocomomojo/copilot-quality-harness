#!/usr/bin/env ts-node

import { 
  DynamoDBClient, 
  CreateTableCommand, 
  ListTablesCommand,
  DescribeTableCommand
} from '@aws-sdk/client-dynamodb';
import { 
  S3Client, 
  CreateBucketCommand, 
  HeadBucketCommand,
  PutBucketCorsCommand
} from '@aws-sdk/client-s3';
import { 
  SQSClient, 
  CreateQueueCommand, 
  ListQueuesCommand 
} from '@aws-sdk/client-sqs';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';

// Configuration from environment variables
const awsConfig = {
  endpoint: process.env.AWS_ENDPOINT_URL || 'https://127.0.0.1:9297',
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test',
  },
};

// SSL certificate configuration
const clientConfig: any = {
  ...awsConfig,
};

// Add CA certificate if NODE_EXTRA_CA_CERTS is set
if (process.env.NODE_EXTRA_CA_CERTS) {
  try {
    const caCert = fs.readFileSync(process.env.NODE_EXTRA_CA_CERTS);
    clientConfig.requestHandler = {
      httpsAgent: new https.Agent({
        ca: caCert,
        rejectUnauthorized: false,
      }),
    };
  } catch (err) {
    console.warn('⚠️  Failed to load CA certificate:', err instanceof Error ? err.message : String(err));
  }
}

const dynamodbClient = new DynamoDBClient(clientConfig);
const s3Client = new S3Client(clientConfig);
const sqsClient = new SQSClient(clientConfig);

interface DynamoDBTableConfig {
  name: string;
  keySchema: Array<{ AttributeName: string; KeyType: 'HASH' | 'RANGE' }>;
  attributeDefinitions: Array<{ AttributeName: string; AttributeType: 'S' | 'N' | 'B' }>;
}

async function checkTableExists(tableName: string): Promise<boolean> {
  try {
    await dynamodbClient.send(
      new DescribeTableCommand({ TableName: tableName })
    );
    return true;
  } catch (err) {
    if ((err as any)?.name === 'ResourceNotFoundException') {
      return false;
    }
    throw err;
  }
}

async function createDynamoDBTable(table: DynamoDBTableConfig): Promise<void> {
  const exists = await checkTableExists(table.name);
  
  if (exists) {
    console.log(`✅ DynamoDB table '${table.name}' already exists`);
    return;
  }

  try {
    await dynamodbClient.send(
      new CreateTableCommand({
        TableName: table.name,
        KeySchema: table.keySchema,
        AttributeDefinitions: table.attributeDefinitions,
        BillingMode: 'PAY_PER_REQUEST',
      })
    );
    console.log(`✅ Created DynamoDB table '${table.name}'`);
  } catch (err) {
    console.error(`❌ Failed to create table '${table.name}':`, err instanceof Error ? err.message : String(err));
    throw err;
  }
}

async function checkBucketExists(bucketName: string): Promise<boolean> {
  try {
    await s3Client.send(new HeadBucketCommand({ Bucket: bucketName }));
    return true;
  } catch (err) {
    if ((err as any)?.name === 'NotFound') {
      return false;
    }
    throw err;
  }
}

async function createS3Bucket(bucketName: string): Promise<void> {
  const exists = await checkBucketExists(bucketName);
  
  if (exists) {
    console.log(`✅ S3 bucket '${bucketName}' already exists`);
    return;
  }

  try {
    await s3Client.send(
      new CreateBucketCommand({ Bucket: bucketName })
    );
    console.log(`✅ Created S3 bucket '${bucketName}'`);

    // Set CORS for S3 bucket
    await s3Client.send(
      new PutBucketCorsCommand({
        Bucket: bucketName,
        CORSConfiguration: {
          CORSRules: [
            {
              AllowedHeaders: ['*'],
              AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE'],
              AllowedOrigins: ['*'],
              MaxAgeSeconds: 3000,
            },
          ],
        },
      })
    );
    console.log(`✅ Configured CORS for S3 bucket '${bucketName}'`);
  } catch (err) {
    console.error(`❌ Failed to create S3 bucket '${bucketName}':`, err instanceof Error ? err.message : String(err));
    throw err;
  }
}

async function checkQueueExists(queueName: string): Promise<boolean> {
  try {
    const result = await sqsClient.send(new ListQueuesCommand({}));
    if (!result.QueueUrls) return false;
    return result.QueueUrls.some((url: string) => url.includes(queueName));
  } catch (err) {
    if ((err as any)?.name === 'QueueDoesNotExist') {
      return false;
    }
    throw err;
  }
}

async function createSQSQueue(queueName: string): Promise<void> {
  const exists = await checkQueueExists(queueName);
  
  if (exists) {
    console.log(`✅ SQS queue '${queueName}' already exists`);
    return;
  }

  try {
    await sqsClient.send(
      new CreateQueueCommand({ QueueName: queueName })
    );
    console.log(`✅ Created SQS queue '${queueName}'`);
  } catch (err) {
    console.error(`❌ Failed to create SQS queue '${queueName}':`, err instanceof Error ? err.message : String(err));
    throw err;
  }
}

async function initializeAWSResources(): Promise<void> {
  console.log('🚀 Initializing AWS Emulator resources...');
  console.log(`   Endpoint: ${awsConfig.endpoint}`);
  console.log(`   Region: ${awsConfig.region}`);
  console.log('');

  // DynamoDB Tables Configuration
  const dynamoDBTables: DynamoDBTableConfig[] = [
    {
      name: 'Users',
      keySchema: [
        { AttributeName: 'userId', KeyType: 'HASH' },
      ],
      attributeDefinitions: [
        { AttributeName: 'userId', AttributeType: 'S' },
      ],
    },
    {
      name: 'Todos',
      keySchema: [
        { AttributeName: 'userId', KeyType: 'HASH' },
        { AttributeName: 'todoId', KeyType: 'RANGE' },
      ],
      attributeDefinitions: [
        { AttributeName: 'userId', AttributeType: 'S' },
        { AttributeName: 'todoId', AttributeType: 'S' },
      ],
    },
    {
      name: 'AuditLogs',
      keySchema: [
        { AttributeName: 'logId', KeyType: 'HASH' },
      ],
      attributeDefinitions: [
        { AttributeName: 'logId', AttributeType: 'S' },
      ],
    },
  ];

  console.log('📊 Creating DynamoDB tables...');
  for (const table of dynamoDBTables) {
    await createDynamoDBTable(table);
  }
  console.log('');

  // S3 Buckets
  console.log('📦 Creating S3 buckets...');
  await createS3Bucket('app-uploads-bucket');
  console.log('');

  // SQS Queues
  console.log('📨 Creating SQS queues...');
  await createSQSQueue('task-notification-queue');
  console.log('');

  console.log('✅ All AWS resources initialized successfully!');
}

// Main execution
initializeAWSResources().catch((err) => {
  console.error('❌ Failed to initialize AWS resources:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
