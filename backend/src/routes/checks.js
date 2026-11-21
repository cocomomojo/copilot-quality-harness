import express from 'express';

const SELECT_CHECK_COLUMNS = "SELECT id, name, status, strftime('%Y-%m-%dT%H:%M:%SZ', created_at) AS createdAt FROM checks";
const MAX_NAME_LENGTH = 120;

export function createChecksRouter(db) {
  const router = express.Router();
  const listChecks = db.prepare(`${SELECT_CHECK_COLUMNS} ORDER BY id DESC`);
  const getCheck = db.prepare(`${SELECT_CHECK_COLUMNS} WHERE id = ?`);
  const insertCheck = db.prepare('INSERT INTO checks (name) VALUES (?)');

  router.get('/', (_req, res) => {
    res.json(listChecks.all());
  });

  router.post('/', (req, res) => {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    if (!name || name.length > MAX_NAME_LENGTH) {
      return res.status(400).json({ error: `name must be between 1 and ${MAX_NAME_LENGTH} characters` });
    }
    const result = insertCheck.run(name);
    return res.status(201).json(getCheck.get(result.lastInsertRowid));
  });

  return router;
}
