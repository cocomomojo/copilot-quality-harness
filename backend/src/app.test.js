import { describe, expect, test } from 'vitest';
import request from 'supertest';
import { createApp } from './app.js';
import { createDatabase } from './db.js';

function setup() {
  return request(createApp(createDatabase()));
}

describe('API (SQLite-backed routes)', () => {
  test('GET /api/health returns ok', async () => {
    const res = await setup().get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  test('OPTIONS preflight returns CORS headers', async () => {
    const res = await setup().options('/api/checks');
    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe('*');
  });

  test('POST /api/checks creates a check and GET lists newest first', async () => {
    const api = setup();
    await api.post('/api/checks').send({ name: 'first' }).expect(201);
    const created = await api.post('/api/checks').send({ name: '  second  ' }).expect(201);
    expect(created.body).toMatchObject({ name: 'second', status: 'pending' });
    expect(created.body.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);

    const list = await api.get('/api/checks').expect(200);
    expect(list.body.map((check) => check.name)).toEqual(['second', 'first']);
  });

  test.each([[''], ['   '], ['x'.repeat(121)], [undefined]])('POST /api/checks rejects invalid name %#', async (name) => {
    const res = await setup().post('/api/checks').send({ name });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'name must be between 1 and 120 characters' });
  });

  test('POST /api/validators/check-url validates URLs', async () => {
    const api = setup();
    expect((await api.post('/api/validators/check-url').send({ url: 'https://example.com' })).body).toEqual({ valid: true });
    expect((await api.post('/api/validators/check-url').send({})).body).toEqual({ valid: false, error: 'URL cannot be empty' });
  });

  test('GET /api/user/me returns 404 then the seeded user', async () => {
    const api = setup();
    await api.get('/api/user/me').expect(404);
    await api.post('/api/test/seed-user')
      .send({ id: 'u1', email: 'a@example.com', name: 'A', created_at: '2026-01-02T03:04:05Z' })
      .expect(201);
    const res = await api.get('/api/user/me').expect(200);
    expect(res.body).toMatchObject({ id: 'u1', email: 'a@example.com', name: 'A', avatar_url: null, created_at: '2026-01-02T03:04:05Z' });
  });

  test('POST /api/test/seed-user requires id, email and name', async () => {
    const res = await setup().post('/api/test/seed-user').send({ id: 'u1' });
    expect(res.status).toBe(400);
  });

  test('POST /api/test/reset-* clears data', async () => {
    const api = setup();
    await api.post('/api/checks').send({ name: 'temp' }).expect(201);
    await api.post('/api/test/reset-checks').expect(200);
    expect((await api.get('/api/checks')).body).toEqual([]);

    await api.post('/api/test/seed-user').send({ id: 'u1', email: 'a@example.com', name: 'A' }).expect(201);
    await api.post('/api/test/reset-users').expect(200);
    await api.get('/api/user/me').expect(404);
  });

  test('protected routes reject missing or invalid tokens', async () => {
    const api = setup();
    expect((await api.get('/api/todos')).status).toBe(401);
    expect((await api.get('/api/files').set('Authorization', 'Bearer invalid')).body).toEqual({ error: 'Unauthorized: Invalid token' });
  });
});
