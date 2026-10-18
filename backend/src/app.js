import express from 'express';
import { createDatabase } from './db.js';
import { isValidURL } from './utils/validators.js';

export function createApp(db = createDatabase()) {
  const app = express();
  app.use(express.json({ limit: '10kb' }));

  app.get('/api/health', (_request, response) => response.json({ status: 'ok' }));
  app.get('/api/checks', (_request, response) => {
    response.json(db.prepare('SELECT id, name, status, created_at AS createdAt FROM checks ORDER BY id DESC').all());
  });
  app.post('/api/checks', (request, response) => {
    const name = typeof request.body?.name === 'string' ? request.body.name.trim() : '';
    if (!name || name.length > 120) return response.status(400).json({ error: 'name must be between 1 and 120 characters' });
    const result = db.prepare('INSERT INTO checks (name) VALUES (?)').run(name);
    return response.status(201).json(db.prepare('SELECT id, name, status, created_at AS createdAt FROM checks WHERE id = ?').get(result.lastInsertRowid));
  });
  // copilot-generated: URL validator endpoint
  app.post('/api/validators/check-url', (request, response) => {
    const url = request.body?.url;
    const result = isValidURL(url);
    return response.status(200).json(result);
  });
  // copilot-generated: User profile endpoint
  app.get('/api/user/me', (request, response) => {
    try {
      const user = db.prepare('SELECT id, email, name, created_at AS created_at, updated_at FROM users ORDER BY id DESC LIMIT 1').get();
      if (!user) {
        return response.status(404).json({ error: 'User not found' });
      }
      return response.status(200).json(user);
    } catch (error) {
      return response.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch user profile' });
    }
  });
  return app;
}
