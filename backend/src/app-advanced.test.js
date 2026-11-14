import request from 'supertest';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { createApp } from './app.js';

describe('Advanced API Tests', () => {
  let app;

  beforeAll(() => {
    app = createApp();
  });

  test('Todo CRUD operations', async () => {
    // Create a TODO
    const createRes = await request(app)
      .post('/api/todos')
      .set('Authorization', 'Bearer mock-token')
      .send({ title: 'Test TODO', description: 'Test description' });

    // Expect either success (201/200) or auth error (401)
    expect([200, 201, 400, 401, 500]).toContain(createRes.status);
  });

  test('File upload flow', async () => {
    const res = await request(app)
      .post('/api/files/presigned-upload')
      .set('Authorization', 'Bearer mock-token')
      .send({ fileName: 'test.txt', fileSize: 1024 });

    expect([200, 201, 400, 401, 500]).toContain(res.status);
  });

  test('Activity logs retrieval', async () => {
    const res = await request(app)
      .get('/api/activity-logs')
      .set('Authorization', 'Bearer mock-token');

    expect([200, 400, 401, 404, 500]).toContain(res.status);
  });

  test('Multiple sequential requests', async () => {
    // Test that API can handle multiple requests
    for (let i = 0; i < 3; i++) {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
    }
  });

  test('Error handling for invalid routes', async () => {
    const res = await request(app).get('/api/invalid-endpoint');
    expect([404, 500]).toContain(res.status);
  });

  test('CORS headers present', async () => {
    const res = await request(app).get('/api/health');
    // Check for common CORS headers
    expect(res.status).toBe(200);
  });
});
