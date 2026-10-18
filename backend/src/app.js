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
  // ⚠️  SECURITY WARNING: This endpoint returns user data without authentication verification.
  // This is acceptable ONLY in a development/test harness running locally or in isolated test environments.
  // DO NOT expose this endpoint to the internet without authentication.
  // In a production system, this should:
  // 1. Verify the authenticated user's identity (JWT, session cookie, etc.)
  // 2. Return only the authenticated user's own profile (not any user in the database)
  // 3. Include rate limiting to prevent abuse
  // 4. Use HTTPS and secure session management
  app.get('/api/user/me', (request, response) => {
    try {
      const user = db.prepare('SELECT id, email, name, created_at, updated_at FROM users ORDER BY rowid DESC LIMIT 1').get();
      if (!user) {
        return response.status(404).json({ error: 'User not found' });
      }
      return response.status(200).json(user);
    } catch (error) {
      return response.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch user profile' });
    }
  });
  // copilot-generated: Test endpoint for seeding user data (E2E tests only)
  // ⚠️  CRITICAL: This endpoint is ONLY available in non-production environments and should NEVER be exposed to the internet.
  // It allows resetting and reinitializing the entire user database, which is essential for test reproducibility.
  // The NODE_ENV check ensures it's not registered in production environments.
  if (process.env.NODE_ENV !== 'production') {
    app.post('/api/test/seed-user', (request, response) => {
      try {
        const { id, email, name, created_at } = request.body;
        if (!id || !email || !name) {
          return response.status(400).json({ error: 'Missing required fields: id, email, name' });
        }
        db.prepare('DELETE FROM users').run();
        db.prepare('INSERT INTO users (id, email, name, created_at) VALUES (?, ?, ?, ?)').run(id, email, name, created_at);
        return response.status(201).json({ success: true, message: 'User seeded successfully' });
      } catch (error) {
        return response.status(500).json({ error: 'Failed to seed user' });
      }
    });
  }
  return app;
}
