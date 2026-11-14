import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { generateToken } from '../middleware/auth.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { putItem, getItem } from '../utils/dynamodb.js';

const router = express.Router();
const TABLE_NAME = 'Users';

function generateUserId() {
  return uuidv4();
}

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Check if user already exists
    const existing = await getItem(TABLE_NAME, { email });
    if (existing) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    const userId = generateUserId();
    const passwordHash = await hashPassword(password);
    const now = new Date().toISOString();
    
    await putItem(TABLE_NAME, {
      userId,
      email,
      passwordHash,
      name,
      createdAt: now,
      updatedAt: now,
    });
    
    const token = generateToken(userId, email);
    res.json({ token, userId, email, name });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Missing email or password' });
    }
    
    const user = await getItem(TABLE_NAME, { email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = generateToken(user.userId, user.email);
    res.json({ token, userId: user.userId, email: user.email, name: user.name });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user
router.get('/me', (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  res.json(req.user);
});

export default router;
