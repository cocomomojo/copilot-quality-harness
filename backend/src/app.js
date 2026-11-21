import express from 'express';
import { createDatabase } from './db.js';
import { isValidURL } from './utils/validators.js';
import { authMiddleware } from './middleware/auth.js';
import { corsMiddleware } from './middleware/cors.js';
import authRoutes from './routes/auth.js';
import todosRoutes from './routes/todos.js';
import filesRoutes from './routes/files.js';
import logsRoutes from './routes/logs.js';
import { createChecksRouter } from './routes/checks.js';
import { createUsersRouter } from './routes/users.js';
import { createTestSupportRouter } from './routes/testSupport.js';

export function createApp(db = createDatabase()) {
  const app = express();
  app.use(express.json({ limit: '10kb' }));
  app.use(corsMiddleware);

  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
  app.post('/api/validators/check-url', (req, res) => res.status(200).json(isValidURL(req.body?.url)));
  app.use('/api/checks', createChecksRouter(db));
  app.use('/api/user', createUsersRouter(db));

  // AWS Emulator backed routes
  app.use('/api/auth', authRoutes);
  app.use('/api/todos', authMiddleware, todosRoutes);
  app.use('/api/files', authMiddleware, filesRoutes);
  app.use('/api/logs', authMiddleware, logsRoutes);

  if (process.env.NODE_ENV !== 'production') {
    app.use('/api/test', createTestSupportRouter(db));
  }

  return app;
}
