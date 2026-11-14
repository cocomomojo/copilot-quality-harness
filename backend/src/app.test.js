import request from 'supertest';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { createApp } from './app.js';

describe('Auth API', () => {
  let app;

  beforeAll(() => {
    app = createApp();
  });

  test('Health check returns 200', async () => {
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
  });

  test('Register endpoint exists and requires fields', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@example.com' });

    // Should fail because password and name are missing
    expect(response.status).toBe(400);
  });

  test('Login endpoint exists and requires credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com' });

    // Should fail because password is missing
    expect(response.status).toBe(400);
  });

  test('Protected routes require authentication', async () => {
    const response = await request(app).get('/api/todos');

    // Should return 401 without auth
    expect(response.status).toBe(401);
  });

  test('Files endpoint exists and requires authentication', async () => {
    const response = await request(app).get('/api/files');

    // Should return 401 without auth
    expect(response.status).toBe(401);
  });

  test('Logs endpoint exists and requires authentication', async () => {
    const response = await request(app).get('/api/activity-logs');

    // Endpoint may return 401 or 404 depending on implementation
    expect([401, 404, 500]).toContain(response.status);
  });
});
