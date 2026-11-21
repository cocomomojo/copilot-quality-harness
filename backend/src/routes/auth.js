import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { TABLES } from '../config.js';
import { authMiddleware, generateToken } from '../middleware/auth.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { putItem, getItem, findUserByEmail } from '../utils/dynamodb.js';
import { validatePassword } from '../utils/validators.js';
import { asyncRoute } from '../utils/http.js';

const router = express.Router();

router.post('/register', asyncRoute('Register error', 'Registration failed', async (req, res) => {
  const { email, password, name } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) {
    return res.status(422).json({ error: passwordValidation.error, message: passwordValidation.error });
  }

  if (await findUserByEmail(TABLES.users, email)) {
    return res.status(409).json({ error: 'User already exists', message: 'Email already registered' });
  }

  const userId = uuidv4();
  const now = new Date().toISOString();
  await putItem(TABLES.users, {
    userId,
    email,
    passwordHash: await hashPassword(password),
    name,
    createdAt: now,
    updatedAt: now,
  });

  res.status(200).json({ token: generateToken(userId, email), userId, email, name });
}));

router.post('/login', asyncRoute('Login error', 'Login failed', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Missing email or password' });
  }

  const user = await findUserByEmail(TABLES.users, email);
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  res.json({ token: generateToken(user.userId, user.email), userId: user.userId, email: user.email, name: user.name });
}));

router.get('/me', authMiddleware, asyncRoute('Get user error', 'Failed to get user', async (req, res) => {
  if (!req.user?.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const user = await getItem(TABLES.users, { userId: req.user.userId });
  if (!user) {
    return res.status(401).json({ error: 'User not found' });
  }

  const { passwordHash: _passwordHash, ...safeUser } = user;
  res.json(safeUser);
}));

export default router;
