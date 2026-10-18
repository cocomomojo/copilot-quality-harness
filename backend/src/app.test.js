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
