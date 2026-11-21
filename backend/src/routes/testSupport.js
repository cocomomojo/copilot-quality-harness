import express from 'express';

// ⚠️  CRITICAL: E2E-only endpoints for resetting/seeding the SQLite store.
// createApp registers this router only when NODE_ENV !== 'production'.
export function createTestSupportRouter(db) {
  const router = express.Router();

  function resetRoute(path, sql, successMessage, errorMessage) {
    router.post(path, (_req, res) => {
      try {
        db.prepare(sql).run();
        return res.status(200).json({ success: true, message: successMessage });
      } catch {
        return res.status(500).json({ error: errorMessage });
      }
    });
  }

  router.post('/seed-user', (req, res) => {
    try {
      const { id, email, name, avatar_url, created_at } = req.body;
      if (!id || !email || !name) {
        return res.status(400).json({ error: 'Missing required fields: id, email, name' });
      }
      db.prepare('DELETE FROM users').run();
      db.prepare('INSERT INTO users (id, email, name, avatar_url, created_at) VALUES (?, ?, ?, ?, ?)')
        .run(id, email, name, avatar_url || null, created_at);
      return res.status(201).json({ success: true, message: 'User seeded successfully' });
    } catch {
      return res.status(500).json({ error: 'Failed to seed user' });
    }
  });

  resetRoute('/reset-checks', 'DELETE FROM checks', 'All checks cleared', 'Failed to reset checks');
  resetRoute('/reset-users', 'DELETE FROM users', 'All users cleared', 'Failed to reset users');

  return router;
}
