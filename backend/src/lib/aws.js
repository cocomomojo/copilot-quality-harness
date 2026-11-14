import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { S3Client } from '@aws-sdk/client-s3';
import { SQSClient } from '@aws-sdk/client-sqs';
import fs from 'fs';
import https from 'https';

// Load AWS Emulator credentials from the auto-generated credentials file
// Per AWS Emulator official docs: use AWS_SHARED_CREDENTIALS_FILE pointing to emulator_credentials
function loadEmulatorCredentials() {
  const credentialsFile = process.env.AWS_SHARED_CREDENTIALS_FILE;
  
  if (!credentialsFile) {
    console.warn('⚠️  AWS_SHARED_CREDENTIALS_FILE not set. Using environment variables or placeholders.');
    return {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test-key',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test-secret',
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
    console.warn('   Falling back to environment variables or placeholders.');
    return {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test-key',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test-secret',
    };
  }
}

const emulatorCredentials = loadEmulatorCredentials();

// Read configuration from environment
const awsConfig = {
  endpoint: process.env.AWS_ENDPOINT_URL,
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: emulatorCredentials,
  disableHostPrefix: true, // Required for AWS SDK v3 with emulator
};

// Build client config with certificate support
function buildClientConfig() {
  const config = {
    ...awsConfig,
  };

  // For local AWS Emulator, disable TLS certificate verification for self-signed certs
  if (process.env.AWS_ENDPOINT_URL?.includes('localhost') || process.env.AWS_ENDPOINT_URL?.includes('127.0.0.1')) {
    if (process.env.NODE_TLS_REJECT_UNAUTHORIZED !== '0') {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    }
    console.log('✅ Disabled TLS certificate verification for local AWS Emulator');
  }

  // Try to load CA certificate if available
  const caPath = process.env.NODE_EXTRA_CA_CERTS;
  
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
      console.warn(`⚠️  Failed to load CA certificate from ${caPath}:`, err instanceof Error ? err.message : String(err));
    }
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
