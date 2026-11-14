import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getS3Client } from '../lib/aws.js';
import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { putItem, getItem, queryItems, deleteItem } from '../utils/dynamodb.js';
import { sendTaskNotification } from '../utils/sqs.js';

const router = express.Router();
const S3_BUCKET = 'app-uploads-bucket';
const DYNAMODB_TABLE = 'FileMetadata';

function generateFileId() {
  return uuidv4();
}

// Get presigned URL for upload
router.post('/presigned-url', async (req, res) => {
  try {
    const { filename, contentType } = req.body;
    
    if (!filename || !contentType) {
      return res.status(400).json({ error: 'filename and contentType are required' });
    }
    
    const userId = req.user.userId;
    const fileId = generateFileId();
    const key = `${userId}/${fileId}/${filename}`;
    
    const s3Client = getS3Client();
    const command = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      ContentType: contentType,
    });
    
    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    
    res.json({ presignedUrl, fileId, key });
  } catch (error) {
    console.error('Get presigned URL error:', error);
    res.status(500).json({ error: 'Failed to get presigned URL' });
  }
});

// Get files list
router.get('/', async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const files = await queryItems(DYNAMODB_TABLE, 'userId = :userId', { ':userId': userId });
    
    res.json(files);
  } catch (error) {
    console.error('Get files error:', error);
    res.status(500).json({ error: 'Failed to get files' });
  }
});

// Get file details
router.get('/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const userId = req.user.userId;
    
    const file = await getItem(DYNAMODB_TABLE, { userId, fileId });
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    res.json(file);
  } catch (error) {
    console.error('Get file error:', error);
    res.status(500).json({ error: 'Failed to get file' });
  }
});

// Delete file
router.delete('/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const userId = req.user.userId;
    
    const fileMetadata = await getItem(DYNAMODB_TABLE, { userId, fileId });
    if (!fileMetadata) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    const s3Client = getS3Client();
    const deleteCommand = new DeleteObjectCommand({
      Bucket: S3_BUCKET,
      Key: fileMetadata.s3Key || fileMetadata.key,
    });
    
    await s3Client.send(deleteCommand);
    await deleteItem(DYNAMODB_TABLE, { userId, fileId });
    await sendTaskNotification('file_deleted', userId, fileId, 'delete', { fileName: fileMetadata.filename });
    
    res.status(204).end();
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

// Get presigned URL for download
router.get('/:fileId/presigned-url', async (req, res) => {
  try {
    const { fileId } = req.params;
    const userId = req.user.userId;
    
    const fileMetadata = await getItem(DYNAMODB_TABLE, { userId, fileId });
    if (!fileMetadata) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    const s3Client = getS3Client();
    const command = new GetObjectCommand({
      Bucket: S3_BUCKET,
      Key: fileMetadata.s3Key || fileMetadata.key,
    });
    
    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    
    res.json({ presignedUrl });
  } catch (error) {
    console.error('Get download presigned URL error:', error);
    res.status(500).json({ error: 'Failed to get download URL' });
  }
});

export default router;
