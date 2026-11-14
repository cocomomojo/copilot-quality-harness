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

// Load AWS Emulator credentials from the auto-generated credentials file
// Per AWS Emulator official docs: use AWS_SHARED_CREDENTIALS_FILE pointing to emulator_credentials
function loadEmulatorCredentials(): { accessKeyId: string; secretAccessKey: string } {
  const credentialsFile = process.env.AWS_SHARED_CREDENTIALS_FILE;
  
  if (!credentialsFile) {
    console.warn('⚠️  AWS_SHARED_CREDENTIALS_FILE not set. Using placeholder credentials.');
    return {
      accessKeyId: 'test-key',
      secretAccessKey: 'test-secret',
    };
  }

  try {
    const content = fs.readFileSync(credentialsFile, 'utf-8');
    // AWS credentials file format: [profile]\naws_access_key_id=...\naws_secret_access_key=...
    const accessKeyMatch = content.match(/aws_access_key_id\s*=\s*(.+)/);
    const secretKeyMatch = content.match(/aws_secret_access_key\s*=\s*(.+)/);
    
    if (!accessKeyMatch || !secretKeyMatch) {
      throw new Error('Invalid credentials file format');
    }

    const credentials = {
      accessKeyId: accessKeyMatch[1].trim(),
      secretAccessKey: secretKeyMatch[1].trim(),
    };
    console.log('✅ Loaded AWS Emulator credentials from:', credentialsFile);
    return credentials;
  } catch (err) {
    console.warn('⚠️  Failed to load credentials from', credentialsFile, ':', err instanceof Error ? err.message : String(err));
    console.warn('   Falling back to placeholder credentials.');
    return {
      accessKeyId: 'test-key',
      secretAccessKey: 'test-secret',
    };
  }
}

const emulatorCredentials = loadEmulatorCredentials();

// Configuration from environment variables
const awsConfig: any = {
  endpoint: process.env.AWS_ENDPOINT_URL || 'https://127.0.0.1:9297',
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: emulatorCredentials,
};

// SSL certificate configuration per AWS SDK for JavaScript docs
// AWS_CA_BUNDLE environment variable is read by AWS SDK v3 automatically
// But we also set it explicitly to clients

const clientConfig: any = {
  ...awsConfig,
  disableHostPrefix: true, // Required for AWS SDK v3 with emulator (prevents host prefix injection)
};

// Add CA certificate handling and disable certificate verification for self-signed certs
// AWS SDK v3 automatically reads AWS_CA_BUNDLE, but we also set it on HTTP agents for robustness
const caCertPath = process.env.AWS_CA_BUNDLE || process.env.NODE_EXTRA_CA_CERTS;

if (caCertPath) {
  try {
    const caCert = fs.readFileSync(caCertPath);
    clientConfig.httpAgent = new (require('http').Agent)({
      ca: caCert,
      rejectUnauthorized: false,
    });
    clientConfig.httpsAgent = new https.Agent({
      ca: caCert,
      rejectUnauthorized: false,
    });
    console.log('✅ CA certificate loaded from:', caCertPath);
  } catch (err) {
    console.warn('⚠️  Failed to load CA certificate from', caCertPath, ':', err instanceof Error ? err.message : String(err));
    // Fall back to disabling verification
    clientConfig.httpsAgent = new https.Agent({
      rejectUnauthorized: false,
    });
  }
} else {
  // No CA certificate configured, disable verification for local testing
  clientConfig.httpsAgent = new https.Agent({
    rejectUnauthorized: false,
  });
  console.log('⚠️  AWS_CA_BUNDLE and NODE_EXTRA_CA_CERTS not set; disabling certificate verification');
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
