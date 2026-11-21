import express from 'express';

// ⚠️  SECURITY WARNING: /me returns the most recently seeded user without authentication.
// This is acceptable ONLY in a local/isolated test harness. DO NOT expose it to the internet.
// A production implementation must authenticate the caller, return only their own profile,
// apply rate limiting, and run over HTTPS.
export function createUsersRouter(db) {
  const router = express.Router();
  const getLatestUser = db.prepare(
    "SELECT id, email, name, avatar_url, strftime('%Y-%m-%dT%H:%M:%SZ', created_at) AS created_at, strftime('%Y-%m-%dT%H:%M:%SZ', updated_at) AS updated_at FROM users ORDER BY rowid DESC LIMIT 1"
  );

  router.get('/me', (_req, res) => {
    try {
      const user = getLatestUser.get();
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      return res.status(200).json(user);
    } catch {
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch user profile' });
    }
  });

  return router;
}
