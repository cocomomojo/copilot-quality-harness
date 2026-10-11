import request from 'supertest';
import { afterEach, describe, expect, test } from 'vitest';
import { createApp } from './app.js';
import { createDatabase } from './db.js';

describe('API Advanced Tests - Edge Cases & Error Handling', () => {
  let db;
  let app;

  afterEach(() => db?.close());

  describe('POST /api/checks - Boundary Value Tests', () => {
    test('accepts check name with exactly 1 character', async () => {
      db = createDatabase();
      app = createApp(db);
      const response = await request(app)
        .post('/api/checks')
        .send({ name: 'A' });
      expect(response.status).toBe(201);
      expect(response.body.name).toBe('A');
    });

    test('accepts check name with exactly 120 characters', async () => {
      db = createDatabase();
      app = createApp(db);
      const longName = 'A'.repeat(120);
      const response = await request(app)
        .post('/api/checks')
        .send({ name: longName });
      expect(response.status).toBe(201);
      expect(response.body.name).toBe(longName);
    });

    test('rejects check name with 121 characters (exceeds max)', async () => {
      db = createDatabase();
      app = createApp(db);
      const tooLongName = 'A'.repeat(121);
      const response = await request(app)
        .post('/api/checks')
        .send({ name: tooLongName });
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('between 1 and 120');
    });

    test('accepts name with leading/trailing whitespace (trims it)', async () => {
      db = createDatabase();
      app = createApp(db);
      const response = await request(app)
        .post('/api/checks')
        .send({ name: '  trimmed name  ' });
      expect(response.status).toBe(201);
      expect(response.body.name).toBe('trimmed name');
    });

    test('rejects name with only whitespace', async () => {
      db = createDatabase();
      app = createApp(db);
      const response = await request(app)
        .post('/api/checks')
        .send({ name: '   ' });
      expect(response.status).toBe(400);
    });

    test('accepts names with unicode characters', async () => {
      db = createDatabase();
      app = createApp(db);
      const response = await request(app)
        .post('/api/checks')
        .send({ name: '日本語テスト' });
      expect(response.status).toBe(201);
      expect(response.body.name).toBe('日本語テスト');
    });

    test('accepts names with special characters', async () => {
      db = createDatabase();
      app = createApp(db);
      const response = await request(app)
        .post('/api/checks')
        .send({ name: 'Test-Check_#123!@' });
      expect(response.status).toBe(201);
      expect(response.body.name).toBe('Test-Check_#123!@');
    });
  });

  describe('POST /api/checks - Request Format Tests', () => {
    test('rejects request with invalid JSON', async () => {
      db = createDatabase();
      app = createApp(db);
      const response = await request(app)
        .post('/api/checks')
        .set('content-type', 'application/json')
        .send('invalid json');
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    test('rejects request with missing name field', async () => {
      db = createDatabase();
      app = createApp(db);
      const response = await request(app)
        .post('/api/checks')
        .send({ });
      expect(response.status).toBe(400);
    });

    test('rejects request with null name', async () => {
      db = createDatabase();
      app = createApp(db);
      const response = await request(app)
        .post('/api/checks')
        .send({ name: null });
      expect(response.status).toBe(400);
    });

    test('rejects request with numeric name', async () => {
      db = createDatabase();
      app = createApp(db);
      const response = await request(app)
        .post('/api/checks')
        .send({ name: 123 });
      expect(response.status).toBe(400);
    });

    test('rejects request with boolean name', async () => {
      db = createDatabase();
      app = createApp(db);
      const response = await request(app)
        .post('/api/checks')
        .send({ name: true });
      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/checks - Response Format Tests', () => {
    test('returns array with correct structure for each check', async () => {
      db = createDatabase();
      app = createApp(db);
      
      await request(app).post('/api/checks').send({ name: 'Check 1' });
      const response = await request(app).get('/api/checks');
      
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('name');
      expect(response.body[0]).toHaveProperty('status');
      expect(response.body[0]).toHaveProperty('createdAt');
    });

    test('returns checks in descending order by ID', async () => {
      db = createDatabase();
      app = createApp(db);
      
      await request(app).post('/api/checks').send({ name: 'First' });
      await request(app).post('/api/checks').send({ name: 'Second' });
      await request(app).post('/api/checks').send({ name: 'Third' });
      
      const response = await request(app).get('/api/checks');
      expect(response.body[0].name).toBe('Third');
      expect(response.body[1].name).toBe('Second');
      expect(response.body[2].name).toBe('First');
    });

    test('returns status as one of valid enum values', async () => {
      db = createDatabase();
      app = createApp(db);
      
      await request(app).post('/api/checks').send({ name: 'Test' });
      const response = await request(app).get('/api/checks');
      
      expect(['pending', 'passed', 'failed']).toContain(response.body[0].status);
    });

    test('includes ISO 8601 formatted timestamp', async () => {
      db = createDatabase();
      app = createApp(db);
      
      await request(app).post('/api/checks').send({ name: 'Test' });
      const response = await request(app).get('/api/checks');
      
      const timestamp = response.body[0].createdAt;
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  describe('Data Persistence Tests', () => {
    test('multiple checks persist in database', async () => {
      db = createDatabase();
      app = createApp(db);
      
      for (let i = 1; i <= 5; i++) {
        await request(app).post('/api/checks').send({ name: `Check ${i}` });
      }
      
      const response = await request(app).get('/api/checks');
      expect(response.body).toHaveLength(5);
    });

    test('check data is not mutated by subsequent requests', async () => {
      db = createDatabase();
      app = createApp(db);
      
      const created = await request(app)
        .post('/api/checks')
        .send({ name: 'Immutable Check' });
      
      const check1 = created.body;
      
      // Make another check
      await request(app).post('/api/checks').send({ name: 'Another Check' });
      
      // Fetch all and find the first check
      const listResponse = await request(app).get('/api/checks');
      const check2 = listResponse.body.find(c => c.id === check1.id);
      
      expect(check2.name).toBe(check1.name);
      expect(check2.status).toBe(check1.status);
      expect(check2.createdAt).toBe(check1.createdAt);
    });
  });

  describe('Content-Type & Encoding Tests', () => {
    test('response has application/json content type', async () => {
      db = createDatabase();
      app = createApp(db);
      const response = await request(app).get('/api/checks');
      expect(response.headers['content-type']).toMatch(/application\/json/);
    });

    test('handles names with quotes and escapes', async () => {
      db = createDatabase();
      app = createApp(db);
      const response = await request(app)
        .post('/api/checks')
        .send({ name: 'Check with "quotes" and \'apostrophes\'' });
      expect(response.status).toBe(201);
      expect(response.body.name).toBe('Check with "quotes" and \'apostrophes\'');
    });

    test('handles names with newlines and tabs', async () => {
      db = createDatabase();
      app = createApp(db);
      const response = await request(app)
        .post('/api/checks')
        .send({ name: 'Line1\nLine2\tTabbed' });
      expect(response.status).toBe(201);
      expect(response.body.name).toContain('\n');
      expect(response.body.name).toContain('\t');
    });
  });

  describe('Concurrent Request Tests', () => {
    test('handles concurrent POST requests correctly', async () => {
      db = createDatabase();
      app = createApp(db);
      
      const promises = Array.from({ length: 10 }, (_, i) =>
        request(app).post('/api/checks').send({ name: `Concurrent Check ${i + 1}` })
      );
      
      const responses = await Promise.all(promises);
      
      expect(responses.every(r => r.status === 201)).toBe(true);
      expect(responses.map(r => r.body.id)).toHaveLength(new Set(responses.map(r => r.body.id)).size);
      
      const list = await request(app).get('/api/checks');
      expect(list.body).toHaveLength(10);
    });
  });

  describe('HTTP Method Tests', () => {
    test('rejects PUT requests to /api/checks', async () => {
      db = createDatabase();
      app = createApp(db);
      const response = await request(app)
        .put('/api/checks')
        .send({ name: 'Test' });
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    test('rejects DELETE requests to /api/checks', async () => {
      db = createDatabase();
      app = createApp(db);
      const response = await request(app).delete('/api/checks');
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    test('rejects PATCH requests to /api/checks', async () => {
      db = createDatabase();
      app = createApp(db);
      const response = await request(app)
        .patch('/api/checks')
        .send({ name: 'Test' });
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });
});
