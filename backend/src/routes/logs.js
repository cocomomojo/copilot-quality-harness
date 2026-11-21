import express from 'express';
import { TABLES } from '../config.js';
import { queryByUser, scanItems } from '../utils/dynamodb.js';
import { asyncRoute } from '../utils/http.js';

const router = express.Router();

async function fetchUserLogs(userId) {
  try {
    return await queryByUser(TABLES.auditLogs, userId);
  } catch {
    return scanItems(TABLES.auditLogs, 'userId = :userId', { ':userId': userId });
  }
}

router.get('/', asyncRoute('Get logs error', 'Failed to get logs', async (req, res) => {
  const { type, limit = '100' } = req.query;
  const logs = (await fetchUserLogs(req.user.userId))
    .filter((log) => !type || log.eventType === type)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, parseInt(limit, 10));

  res.json(logs);
}));

export default router;
