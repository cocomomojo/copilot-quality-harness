import { afterEach, describe, expect, test, vi } from 'vitest';

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
  vi.resetModules();
});

describe('AWS SDK configuration', () => {
  test('uses the AWS default credential provider chain in production', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.AWS_ENDPOINT_URL;
    delete process.env.AWS_ACCESS_KEY_ID;
    delete process.env.AWS_SECRET_ACCESS_KEY;

    const { awsConfig } = await import('./aws.js');

    expect(awsConfig.endpoint).toBeUndefined();
    expect(awsConfig.credentials).toBeUndefined();
  });

  test('keeps emulator credentials and endpoint local to development', async () => {
    process.env.NODE_ENV = 'development';
    delete process.env.AWS_ENDPOINT_URL;
    process.env.AWS_ACCESS_KEY_ID = 'local-access-key';
    process.env.AWS_SECRET_ACCESS_KEY = 'local-secret-key';

    const { awsConfig } = await import('./aws.js');

    expect(awsConfig.endpoint).toBe('https://127.0.0.1:9297');
    expect(awsConfig.credentials).toEqual({
      accessKeyId: 'local-access-key',
      secretAccessKey: 'local-secret-key',
    });
  });

  test('does not use emulator credentials for a non-local AWS endpoint', async () => {
    process.env.NODE_ENV = 'production';
    process.env.AWS_ENDPOINT_URL = 'https://dynamodb.us-east-1.amazonaws.com';
    process.env.AWS_ACCESS_KEY_ID = 'must-not-be-used';
    process.env.AWS_SECRET_ACCESS_KEY = 'must-not-be-used';

    const { awsConfig } = await import('./aws.js');

    expect(awsConfig.endpoint).toBe('https://dynamodb.us-east-1.amazonaws.com');
    expect(awsConfig.credentials).toBeUndefined();
  });
});
