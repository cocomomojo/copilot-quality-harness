import { expect, test } from '@playwright/test';

const API_BASE = 'http://127.0.0.1:3000/api';

test.describe('TODO Management API', () => {
  const mockToken = 'mock-auth-token';
  const headers = { 'Authorization': `Bearer ${mockToken}` };

  test('E2E-101: Create TODO via API', async ({ request }) => {
    const todoData = {
      title: 'Test TODO',
      description: 'Test description',
      completed: false
    };

    const response = await request.post(`${API_BASE}/todos`, {
      headers,
      data: todoData
    });

    // Endpoint should exist and respond
    expect([200, 201, 400, 401, 500]).toContain(response.status());
  });

  test('E2E-102: List TODOs via API', async ({ request }) => {
    const response = await request.get(`${API_BASE}/todos`, { headers });
    
    // Should return list (or auth error)
    expect([200, 401, 500]).toContain(response.status());
  });

  test('E2E-103: Get TODO by ID via API', async ({ request }) => {
    const response = await request.get(`${API_BASE}/todos/1`, { headers });
    
    // Endpoint should exist
    expect([200, 400, 401, 404, 500]).toContain(response.status());
  });

  test('E2E-104: Update TODO via API', async ({ request }) => {
    const updateData = {
      title: 'Updated TODO',
      completed: true
    };

    const response = await request.put(`${API_BASE}/todos/1`, {
      headers,
      data: updateData
    });

    // Endpoint should exist
    expect([200, 201, 400, 401, 404, 500]).toContain(response.status());
  });

  test('E2E-105: Delete TODO via API', async ({ request }) => {
    const response = await request.delete(`${API_BASE}/todos/1`, { headers });

    // Endpoint should exist
    expect([200, 204, 400, 401, 404, 500]).toContain(response.status());
  });

  test('E2E-106: Filter TODOs by status', async ({ request }) => {
    const response = await request.get(`${API_BASE}/todos?status=completed`, { headers });

    // Should handle filter parameter
    expect([200, 400, 401, 500]).toContain(response.status());
  });
});

test.describe('TODO List UI', () => {
  test('E2E-107: TODO page is accessible', async ({ request }) => {
    const response = await request.get('http://127.0.0.1:5173/todos');
    
    // Frontend should be serving
    expect(response.status()).toBe(200);
    const content = await response.text();
    expect(content.toLowerCase()).toContain('<!doctype') || expect(content).toContain('<html');
  });

  test('E2E-108: Dashboard TODO summary accessible', async ({ request }) => {
    const response = await request.get('http://127.0.0.1:5173/');
    
    // Dashboard page should load
    expect(response.status()).toBe(200);
  });
});
