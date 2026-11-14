import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { S3Client } from '@aws-sdk/client-s3';
import { SQSClient } from '@aws-sdk/client-sqs';
import fs from 'fs';
import https from 'https';

// Read configuration from environment
const awsConfig = {
  endpoint: process.env.AWS_ENDPOINT_URL,
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test',
  },
};

// Build client config with certificate support
function buildClientConfig() {
  const config: any = {
    ...awsConfig,
  };

  // Add CA certificate if NODE_EXTRA_CA_CERTS is set
  if (process.env.NODE_EXTRA_CA_CERTS) {
    try {
      const caCert = fs.readFileSync(process.env.NODE_EXTRA_CA_CERTS);
      config.requestHandler = {
        httpsAgent: new https.Agent({
          ca: caCert,
          rejectUnauthorized: false,
        }),
      };
    } catch (err) {
      console.warn('Warning: Failed to load CA certificate:', err instanceof Error ? err.message : String(err));
    }
  }

  return config;
}

// Lazy-load clients to avoid connection issues
let dynamodbClient: DynamoDBClient | null = null;
let s3Client: S3Client | null = null;
let sqsClient: SQSClient | null = null;

export function getDynamoDBClient(): DynamoDBClient {
  if (!dynamodbClient) {
    dynamodbClient = new DynamoDBClient(buildClientConfig());
  }
  return dynamodbClient;
}

export function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client(buildClientConfig());
  }
  return s3Client;
}

export function getSQSClient(): SQSClient {
  if (!sqsClient) {
    sqsClient = new SQSClient(buildClientConfig());
  }
  return sqsClient;
}

export { awsConfig };
