import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { S3Client } from '@aws-sdk/client-s3';
import { SQSClient } from '@aws-sdk/client-sqs';
import fs from 'fs';
import https from 'https';
import path from 'path';
import { isLocalAwsEndpoint } from '../config.js';

const DEFAULT_LOCAL_ENDPOINT = 'https://127.0.0.1:9297';
const repoRoot = path.resolve(process.cwd(), '..');
const defaultCertsDir = path.join(repoRoot, 'certs');
const LOCAL_EMULATOR_ACCESS_ID = 'emulator-placeholder-access-id';
const LOCAL_EMULATOR_SECRET_VALUE = 'emulator-placeholder-secret-value';

function errorMessage(err) {
  return err instanceof Error ? err.message : String(err);
}

function resolveExistingFile(envValue, defaultPath) {
  return envValue || (fs.existsSync(defaultPath) ? defaultPath : undefined);
}

function fallbackEmulatorCredentials() {
  return {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || LOCAL_EMULATOR_ACCESS_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || LOCAL_EMULATOR_SECRET_VALUE,
  };
}

// Emulator credentials are local-only. On AWS, leave `credentials` unset so
// the SDK uses its default provider chain (task role, instance profile, etc.).
function loadEmulatorCredentials() {
  const credentialsFile = resolveExistingFile(
    process.env.AWS_SHARED_CREDENTIALS_FILE,
    path.join(defaultCertsDir, 'emulator_credentials')
  );

  if (!credentialsFile) {
    console.warn('⚠️  AWS Emulator credentials file not found. Using local placeholder credentials.');
    return fallbackEmulatorCredentials();
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
    console.warn('⚠️  Failed to load AWS Emulator credentials from', credentialsFile, ':', errorMessage(err));
    console.warn('   Falling back to local placeholder credentials.');
    return fallbackEmulatorCredentials();
  }
}

const isProduction = process.env.NODE_ENV === 'production';
const endpoint = process.env.AWS_ENDPOINT_URL || (isProduction ? undefined : DEFAULT_LOCAL_ENDPOINT);
const usesLocalEmulator = isLocalAwsEndpoint(endpoint);

const awsConfig = {
  ...(endpoint ? { endpoint } : {}),
  region: process.env.AWS_REGION || 'us-east-1',
  ...(usesLocalEmulator ? { credentials: loadEmulatorCredentials() } : {}),
  disableHostPrefix: true, // Required for AWS SDK v3 with emulator
};

function buildClientConfig() {
  const config = { ...awsConfig };

  if (usesLocalEmulator) {
    const caPath = resolveExistingFile(process.env.NODE_EXTRA_CA_CERTS, path.join(defaultCertsDir, 'ca.pem'));
    if (caPath) {
      try {
        config.requestHandler = {
          httpsAgent: new https.Agent({ ca: fs.readFileSync(caPath), rejectUnauthorized: true }),
        };
        console.log(`✅ Loaded AWS Emulator CA certificate from: ${caPath}`);
      } catch (err) {
        console.warn(`⚠️  Failed to load CA certificate from ${caPath}:`, errorMessage(err));
      }
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

export { awsConfig, buildClientConfig };
