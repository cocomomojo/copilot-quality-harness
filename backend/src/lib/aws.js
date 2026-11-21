import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { S3Client } from '@aws-sdk/client-s3';
import { SQSClient } from '@aws-sdk/client-sqs';
import fs from 'fs';
import https from 'https';
import path from 'path';
import { isLocalAwsEndpoint } from '../config.js';

const DEFAULT_ENDPOINT = 'https://127.0.0.1:9297';
const repoRoot = path.resolve(process.cwd(), '..');
const defaultCertsDir = path.join(repoRoot, 'certs');

function errorMessage(err) {
  return err instanceof Error ? err.message : String(err);
}

function resolveExistingFile(envValue, defaultPath) {
  return envValue || (fs.existsSync(defaultPath) ? defaultPath : undefined);
}

function fallbackCredentials() {
  return {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test-key',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test-secret',
  };
}

// Per AWS Emulator docs: AWS_SHARED_CREDENTIALS_FILE points to the auto-generated emulator_credentials file.
function loadEmulatorCredentials() {
  const credentialsFile = resolveExistingFile(
    process.env.AWS_SHARED_CREDENTIALS_FILE,
    path.join(defaultCertsDir, 'emulator_credentials')
  );

  if (!credentialsFile) {
    console.warn('⚠️  AWS_SHARED_CREDENTIALS_FILE not set. Using environment variables or placeholders.');
    return fallbackCredentials();
  }

  try {
    const content = fs.readFileSync(credentialsFile, 'utf-8');
    const accessKeyMatch = content.match(/aws_access_key_id\s*=\s*(.+)/);
    const secretKeyMatch = content.match(/aws_secret_access_key\s*=\s*(.+)/);

    if (!accessKeyMatch || !secretKeyMatch) {
      throw new Error('Invalid credentials file format');
    }

    console.log('✅ Loaded AWS Emulator credentials from:', credentialsFile);
    return {
      accessKeyId: accessKeyMatch[1].trim(),
      secretAccessKey: secretKeyMatch[1].trim(),
    };
  } catch (err) {
    console.warn('⚠️  Failed to load credentials from', credentialsFile, ':', errorMessage(err));
    console.warn('   Falling back to environment variables or placeholders.');
    return fallbackCredentials();
  }
}

const awsConfig = {
  endpoint: process.env.AWS_ENDPOINT_URL || DEFAULT_ENDPOINT,
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: loadEmulatorCredentials(),
  disableHostPrefix: true, // Required for AWS SDK v3 with emulator
};

function buildClientConfig() {
  const config = { ...awsConfig };

  // Local AWS Emulator uses self-signed certificates
  if (isLocalAwsEndpoint() && process.env.NODE_TLS_REJECT_UNAUTHORIZED !== '0') {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    console.log('✅ Disabled TLS certificate verification for local AWS Emulator');
  }

  const caPath = resolveExistingFile(process.env.NODE_EXTRA_CA_CERTS, path.join(defaultCertsDir, 'ca.pem'));
  if (caPath) {
    try {
      config.requestHandler = {
        httpsAgent: new https.Agent({ ca: fs.readFileSync(caPath), rejectUnauthorized: false }),
      };
      console.log(`✅ Loaded CA certificate from: ${caPath}`);
    } catch (err) {
      console.warn(`⚠️  Failed to load CA certificate from ${caPath}:`, errorMessage(err));
    }
  }

  return config;
}

function lazyClient(ClientClass) {
  let client = null;
  return () => {
    client ??= new ClientClass(buildClientConfig());
    return client;
  };
}

export const getDynamoDBClient = lazyClient(DynamoDBClient);
export const getS3Client = lazyClient(S3Client);
export const getSQSClient = lazyClient(SQSClient);

export { awsConfig };
