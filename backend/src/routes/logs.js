import express from 'express';
import { queryItems, scanItems } from '../utils/dynamodb.js';

const router = express.Router();
const TABLE_NAME = 'AuditLogs';

// Get activity logs
router.get('/', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { type, limit = '100' } = req.query;
    
    let logs = await queryItems(TABLE_NAME, 'userId = :userId', { ':userId': userId });
    
    if (type) {
      logs = logs.filter(log => log.eventType === type);
    }
    
    // Sort by timestamp descending
    logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // Apply limit
    logs = logs.slice(0, parseInt(limit, 10));
    
    res.json(logs);
  } catch (error) {
    console.error('Get logs error:', error);
    res.status(500).json({ error: 'Failed to get logs' });
  }
});

export default router;
