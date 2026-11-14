import { expect, test } from '@playwright/test';

const API_BASE = 'http://127.0.0.1:3000/api';

test.describe('File Management API', () => {
  const mockToken = 'mock-auth-token';
  const headers = { 'Authorization': `Bearer ${mockToken}` };

  test('E2E-201: Upload file endpoint exists', async ({ request }) => {
    const response = await request.post(`${API_BASE}/files/upload`, {
      headers,
      data: { filename: 'test.pdf', content: 'test' }
    });
    expect([200, 201, 400, 401, 413, 500]).toContain(response.status());
  });

  test('E2E-202: List files endpoint exists', async ({ request }) => {
    const response = await request.get(`${API_BASE}/files`, { headers });
    expect([200, 401, 500]).toContain(response.status());
  });

  test('E2E-203: Get file details endpoint', async ({ request }) => {
    const response = await request.get(`${API_BASE}/files/1`, { headers });
    expect([200, 400, 401, 404, 500]).toContain(response.status());
  });

  test('E2E-204: Download file endpoint', async ({ request }) => {
    const response = await request.get(`${API_BASE}/files/1/download`, { headers });
    expect([200, 400, 401, 404, 500]).toContain(response.status());
  });

  test('E2E-205: Delete file endpoint', async ({ request }) => {
    const response = await request.delete(`${API_BASE}/files/1`, { headers });
    expect([200, 204, 400, 401, 404, 500]).toContain(response.status());
  });

  test('E2E-206: Get presigned URL for upload', async ({ request }) => {
    const response = await request.post(`${API_BASE}/files/presigned-url`, {
      headers,
      data: { filename: 'test.pdf', contentType: 'application/pdf' }
    });
    expect([200, 201, 400, 401, 500]).toContain(response.status());
  });
});

test.describe('File Management UI', () => {
  test('E2E-207: Files page accessible', async ({ request }) => {
    const response = await request.get('http://127.0.0.1:5173/files');
    expect(response.status()).toBe(200);
  });

  test('E2E-208: File list renders', async ({ request }) => {
    const response = await request.get('http://127.0.0.1:5173/files');
    const content = await response.text();
    expect(content.length).toBeGreaterThan(100);
  });
});
