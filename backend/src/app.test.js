import request from 'supertest';
import { afterEach, describe, expect, test } from 'vitest';
import { createApp } from './app.js';
import { createDatabase } from './db.js';

describe('checks API', () => {
  let db;
  let app;
  afterEach(() => db?.close());

  test('reports health', async () => {
    db = createDatabase(); app = createApp(db);
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  test('creates and lists a check', async () => {
    db = createDatabase(); app = createApp(db);
    const created = await request(app).post('/api/checks').send({ name: 'API contract' });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ name: 'API contract', status: 'pending' });
    const listed = await request(app).get('/api/checks');
    expect(listed.body).toHaveLength(1);
  });

  test('rejects an empty name', async () => {
    db = createDatabase(); app = createApp(db);
    const response = await request(app).post('/api/checks').send({ name: ' ' });
    expect(response.status).toBe(400);
  });
});

// copilot-generated: URL Validator API tests
describe('URL Validator API', () => {
  let db;
  let app;
  afterEach(() => db?.close());

  test('validates a valid HTTPS URL', async () => {
    db = createDatabase(); app = createApp(db);
    const response = await request(app)
      .post('/api/validators/check-url')
      .send({ url: 'https://example.com' });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ valid: true });
  });

  test('validates a valid HTTP URL', async () => {
    db = createDatabase(); app = createApp(db);
    const response = await request(app)
      .post('/api/validators/check-url')
      .send({ url: 'http://localhost:3000/api/health' });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ valid: true });
  });

  test('rejects an invalid URL format', async () => {
    db = createDatabase(); app = createApp(db);
    const response = await request(app)
      .post('/api/validators/check-url')
      .send({ url: 'not-a-valid-url' });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ valid: false, error: 'Invalid URL format' });
  });

  test('rejects an empty URL', async () => {
    db = createDatabase(); app = createApp(db);
    const response = await request(app)
      .post('/api/validators/check-url')
      .send({ url: '' });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ valid: false, error: 'URL cannot be empty' });
  });

  test('rejects a null URL', async () => {
    db = createDatabase(); app = createApp(db);
    const response = await request(app)
      .post('/api/validators/check-url')
      .send({ url: null });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ valid: false, error: 'URL cannot be empty' });
  });

  test('rejects FTP protocol', async () => {
    db = createDatabase(); app = createApp(db);
    const response = await request(app)
      .post('/api/validators/check-url')
      .send({ url: 'ftp://files.example.com/file.txt' });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ valid: false, error: 'Invalid URL format' });
  });
});

// copilot-generated: User Profile API tests
describe('User Profile API', () => {
  let db;
  let app;
  afterEach(() => db?.close());

  test('UT-008: fetches user profile with createdAt successfully', async () => {
    db = createDatabase(); app = createApp(db);
    db.prepare('INSERT INTO users (id, email, name, created_at) VALUES (?, ?, ?, ?)').run(
      'user-123',
      'testuser@example.com',
      'Test User',
      '2026-10-18T10:00:00Z'
    );
    const response = await request(app).get('/api/user/me');
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: 'user-123',
      email: 'testuser@example.com',
      created_at: '2026-10-18T10:00:00Z'
    });
  });

  test('UT-009: fetches user profile without createdAt (legacy)', async () => {
    db = createDatabase(); app = createApp(db);
    db.prepare('INSERT INTO users (id, email, name, created_at) VALUES (?, ?, ?, ?)').run(
      'user-456',
      'legacyuser@example.com',
      'Legacy User',
      null
    );
    const response = await request(app).get('/api/user/me');
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: 'user-456',
      email: 'legacyuser@example.com',
      created_at: null
    });
  });

  test('UT-010: returns error when user is not found', async () => {
    db = createDatabase(); app = createApp(db);
    const response = await request(app).get('/api/user/me');
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'User not found' });
  });

  test('UT-010: returns error on API failure', async () => {
    db = createDatabase(); app = createApp(db);
    db.close();
    const response = await request(app).get('/api/user/me');
    expect(response.status).toBe(500);
    expect(response.body).toMatchObject({ error: 'Internal Server Error' });
  });
});

// copilot-generated: Test endpoint for E2E tests
describe('Test Seed Endpoint', () => {
  let db;
  let app;
  afterEach(() => db?.close());

  test('seeds user data successfully', async () => {
    db = createDatabase(); app = createApp(db);
    const response = await request(app)
      .post('/api/test/seed-user')
      .send({
        id: 'test-user-1',
        email: 'test@example.com',
        name: 'Test User',
        created_at: '2026-10-18T10:00:00Z'
      });
    expect(response.status).toBe(201);
    expect(response.body).toEqual({ success: true, message: 'User seeded successfully' });

    // Verify user was created
    const user = await request(app).get('/api/user/me');
    expect(user.body).toMatchObject({
      id: 'test-user-1',
      email: 'test@example.com',
      created_at: '2026-10-18T10:00:00Z'
    });
  });

  test('rejects seed with missing fields', async () => {
    db = createDatabase(); app = createApp(db);
    const response = await request(app)
      .post('/api/test/seed-user')
      .send({
        id: 'test-user-1',
        email: 'test@example.com'
      });
    expect(response.status).toBe(400);
    expect(response.body.error).toBeDefined();
  });

  test('replaces existing user when seeding', async () => {
    db = createDatabase(); app = createApp(db);
    
    // Seed first user
    await request(app)
      .post('/api/test/seed-user')
      .send({
        id: 'user-1',
        email: 'first@example.com',
        name: 'First User',
        created_at: '2026-10-18T10:00:00Z'
      });

    // Seed second user (should replace first)
    await request(app)
      .post('/api/test/seed-user')
      .send({
        id: 'user-2',
        email: 'second@example.com',
        name: 'Second User',
        created_at: '2026-10-19T10:00:00Z'
      });

    const response = await request(app).get('/api/user/me');
    expect(response.body.id).toBe('user-2');
    expect(response.body.email).toBe('second@example.com');
  });
});
