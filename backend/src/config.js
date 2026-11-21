export const TABLES = {
  users: 'Users',
  todos: 'Todos',
  files: 'FileMetadata',
  auditLogs: 'AuditLogs',
};

export const S3_BUCKET = 'app-uploads-bucket';
export const PRESIGNED_URL_EXPIRES_IN = 3600;

export const SQS_QUEUE_URL = process.env.SQS_QUEUE_URL || 'https://127.0.0.1:9297/000000000000/task-notification-queue';

export function isLocalAwsEndpoint(endpoint = process.env.AWS_ENDPOINT_URL) {
  return Boolean(endpoint && (endpoint.includes('localhost') || endpoint.includes('127.0.0.1')));
}
