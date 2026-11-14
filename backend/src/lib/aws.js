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
  const config = {
    ...awsConfig,
  };

  // For AWS Emulator, disable certificate verification since it uses self-signed certs
  // Per AWS SDK v3 docs: rejectUnauthorized: false is needed for self-signed certificates
  const caPath = process.env.NODE_EXTRA_CA_CERTS || process.env.AWS_CA_BUNDLE;
  
  if (caPath) {
    try {
      const caCert = fs.readFileSync(caPath);
      config.requestHandler = {
        httpsAgent: new https.Agent({
          ca: caCert,
          rejectUnauthorized: false,
        }),
      };
      console.log(`✅ Loaded CA certificate from: ${caPath}`);
    } catch (err) {
      // Fall back to just disabling cert verification
      console.warn(`⚠️  Failed to load CA certificate from ${caPath}:`, err instanceof Error ? err.message : String(err));
      console.log('   Falling back to disabling certificate verification');
      config.requestHandler = {
        httpsAgent: new https.Agent({
          rejectUnauthorized: false,
        }),
      };
    }
  } else if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0') {
    // If NODE_TLS_REJECT_UNAUTHORIZED is already set, use that
    console.log('✅ Using NODE_TLS_REJECT_UNAUTHORIZED=0 setting');
    config.requestHandler = {
      httpsAgent: new https.Agent({
        rejectUnauthorized: false,
      }),
    };
  }

  return config;
}

// Lazy-load clients to avoid connection issues
let dynamodbClient = null;
let s3Client = null;
let sqsClient = null;

export function getDynamoDBClient() {
  if (!dynamodbClient) {
    dynamodbClient = new DynamoDBClient(buildClientConfig());
  }
  return dynamodbClient;
}

export function getS3Client() {
  if (!s3Client) {
    s3Client = new S3Client(buildClientConfig());
  }
  return s3Client;
}

export function getSQSClient() {
  if (!sqsClient) {
    sqsClient = new SQSClient(buildClientConfig());
  }
  return sqsClient;
}

export { awsConfig };
