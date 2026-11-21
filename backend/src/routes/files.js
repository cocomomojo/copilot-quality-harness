import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PRESIGNED_URL_EXPIRES_IN, S3_BUCKET, TABLES } from '../config.js';
import { getS3Client } from '../lib/aws.js';
import { putItem, getItem, queryByUser, deleteItem } from '../utils/dynamodb.js';
import { sendTaskNotification } from '../utils/sqs.js';
import { asyncRoute } from '../utils/http.js';

const router = express.Router();

function s3KeyOf(file) {
  return file.s3Key || file.key;
}

function presign(command) {
  return getSignedUrl(getS3Client(), command, { expiresIn: PRESIGNED_URL_EXPIRES_IN });
}

async function findFile(req, res) {
  const file = await getItem(TABLES.files, { userId: req.user.userId, fileId: req.params.fileId });
  if (!file) {
    res.status(404).json({ error: 'File not found' });
  }
  return file;
}

const handlePresignedUpload = asyncRoute('Get presigned URL error', 'Failed to get presigned URL', async (req, res) => {
  const filename = req.body?.filename || req.body?.fileName;
  const contentType = req.body?.contentType || req.body?.fileType;

  if (!filename || !contentType) {
    return res.status(400).json({ error: 'filename and contentType are required' });
  }

  const fileId = uuidv4();
  const key = `${req.user.userId}/${fileId}/${filename}`;
  const presignedUrl = await presign(new PutObjectCommand({ Bucket: S3_BUCKET, Key: key, ContentType: contentType }));

  res.json({ presignedUrl, fileId, key });
});

router.post('/presigned-url', handlePresignedUpload);
// Backward-compatible alias used by frontend/api client
router.post('/presigned-upload', handlePresignedUpload);

router.post('/record-upload', asyncRoute('Record upload error', 'Failed to record upload', async (req, res) => {
  const userId = req.user.userId;
  const { fileName, fileSize, fileType, fileId, key } = req.body || {};

  if (!fileName || !fileType || !fileId || !key) {
    return res.status(400).json({ error: 'fileName, fileType, fileId and key are required' });
  }

  const item = {
    userId,
    fileId,
    fileName,
    fileSize: Number(fileSize || 0),
    fileType,
    key,
    s3Key: key,
    uploadedAt: new Date().toISOString(),
  };

  await putItem(TABLES.files, item);
  await sendTaskNotification('file_uploaded', userId, fileId, 'create', { fileName });

  res.status(201).json(item);
}));

router.get('/', asyncRoute('Get files error', 'Failed to get files', async (req, res) => {
  res.json(await queryByUser(TABLES.files, req.user.userId));
}));

router.get('/:fileId', asyncRoute('Get file error', 'Failed to get file', async (req, res) => {
  const file = await findFile(req, res);
  if (file) res.json(file);
}));

router.delete('/:fileId', asyncRoute('Delete file error', 'Failed to delete file', async (req, res) => {
  const file = await findFile(req, res);
  if (!file) return;

  const { userId } = req.user;
  const { fileId } = req.params;
  await getS3Client().send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: s3KeyOf(file) }));
  await deleteItem(TABLES.files, { userId, fileId });
  await sendTaskNotification('file_deleted', userId, fileId, 'delete', { fileName: file.fileName || file.filename });

  res.status(204).end();
}));

router.get('/:fileId/presigned-url', asyncRoute('Get download presigned URL error', 'Failed to get download URL', async (req, res) => {
  const file = await findFile(req, res);
  if (!file) return;

  const presignedUrl = await presign(new GetObjectCommand({ Bucket: S3_BUCKET, Key: s3KeyOf(file) }));
  res.json({ presignedUrl });
}));

export default router;
