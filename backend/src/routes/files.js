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
router.post('/presigned-upload', async (req, res) => {
  try {
    const { fileName, fileType } = req.body;
    
    if (!fileName || !fileType) {
      return res.status(400).json({ error: 'fileName and fileType are required' });
    }
    
    const userId = req.user.userId;
    const fileId = generateFileId();
    const key = `${userId}/${fileId}/${fileName}`;
    
    const s3Client = getS3Client();
    const command = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      ContentType: fileType,
    });
    
    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    
    res.json({ presignedUrl, fileId, key });
  } catch (error) {
    console.error('Get presigned URL error:', error);
    res.status(500).json({ error: 'Failed to get presigned URL' });
  }
});

// Record file metadata after upload
router.post('/record-upload', async (req, res) => {
  try {
    const { fileName, fileSize, fileType, fileId, key } = req.body;
    const userId = req.user.userId;
    
    if (!fileName || !fileId || !key) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const now = new Date().toISOString();
    
    const fileMetadata = {
      userId,
      fileId,
      fileName,
      fileSize: fileSize || 0,
      fileType: fileType || 'application/octet-stream',
      s3Key: key,
      uploadedAt: now,
      updatedAt: now,
    };
    
    await putItem(DYNAMODB_TABLE, fileMetadata);
    await sendTaskNotification('file_uploaded', userId, fileId, 'upload', { fileName, fileSize });
    
    res.json(fileMetadata);
  } catch (error) {
    console.error('Record upload error:', error);
    res.status(500).json({ error: 'Failed to record upload' });
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
      Key: fileMetadata.s3Key,
    });
    
    await s3Client.send(deleteCommand);
    await deleteItem(DYNAMODB_TABLE, { userId, fileId });
    await sendTaskNotification('file_deleted', userId, fileId, 'delete', { fileName: fileMetadata.fileName });
    
    res.json({ success: true });
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
      Key: fileMetadata.s3Key,
    });
    
    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    
    res.json({ presignedUrl });
  } catch (error) {
    console.error('Get download presigned URL error:', error);
    res.status(500).json({ error: 'Failed to get download URL' });
  }
});

export default router;
