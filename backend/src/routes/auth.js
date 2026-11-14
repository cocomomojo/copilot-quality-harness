import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { generateToken } from '../middleware/auth.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { putItem, getItem, scanItems } from '../utils/dynamodb.js';

const router = express.Router();
const TABLE_NAME = 'Users';

function generateUserId() {
  return uuidv4();
}

// Validate password strength
function validatePassword(password) {
  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters long' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one uppercase letter' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one lowercase letter' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one number' };
  }
  return { valid: true };
}

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(422).json({ error: passwordValidation.error, message: passwordValidation.error });
    }
    
    // Check if user already exists (search by email since Users table has userId as key)
    const existingUsers = await scanItems(TABLE_NAME, '#e = :email', { ':email': email }, { '#e': 'email' });
    if (existingUsers.length > 0) {
      return res.status(409).json({ error: 'User already exists', message: 'Email already registered' });
    }
    
    const userId = generateUserId();
    const passwordHash = await hashPassword(password);
    const now = new Date().toISOString();
    
    const user = {
      userId,
      email,
      passwordHash,
      name,
      createdAt: now,
      updatedAt: now,
    };
    
    await putItem(TABLE_NAME, user);
    
    const token = generateToken(userId, email);
    res.status(200).json({ token, userId, email, name });
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
    
    // Search by email since Users table has userId as key
    const users = await scanItems(TABLE_NAME, '#e = :email', { ':email': email }, { '#e': 'email' });
    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = users[0];
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
router.get('/me', async (req, res) => {
  try {
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Fetch complete user from database
    const user = await getItem(TABLE_NAME, { userId: req.user.userId });
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    // Return user without password hash
    const { passwordHash, ...safeUser } = user;
    res.json(safeUser);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

export default router;
