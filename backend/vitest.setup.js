// Set up AWS environment variables for emulator
process.env.AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || 'test-access-key';
process.env.AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || 'test-secret-key';
process.env.AWS_REGION = process.env.AWS_REGION || 'us-east-1';
process.env.AWS_ENDPOINT_URL_DYNAMODB = process.env.AWS_ENDPOINT_URL_DYNAMODB || 'http://localhost:8000';
process.env.AWS_ENDPOINT_URL_S3 = process.env.AWS_ENDPOINT_URL_S3 || 'http://localhost:9000';
process.env.AWS_ENDPOINT_URL_SQS = process.env.AWS_ENDPOINT_URL_SQS || 'http://localhost:9324';
