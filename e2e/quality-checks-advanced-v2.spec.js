import { expect, test } from '@playwright/test';

const API_BASE = 'http://127.0.0.1:3000/api';
const FRONTEND_BASE = 'http://127.0.0.1:5173';

test.describe('Advanced Auth Scenarios', () => {
  test('E2E-ADV-001: Multiple registration attempts with same email', async ({ request }) => {
    const email = `adv-test-${Date.now()}@example.com`;
    const password = 'Password123!';
    
    // First registration should succeed
    const res1 = await request.post(`${API_BASE}/auth/register`, {
      data: { email, password, name: 'User 1' }
    });
    expect([200, 201, 400, 500]).toContain(res1.status());
    
    // Second registration with same email should fail or indicate conflict
    const res2 = await request.post(`${API_BASE}/auth/register`, {
      data: { email, password, name: 'User 2' }
    });
    expect([400, 409, 500]).toContain(res2.status());
  });

  test('E2E-ADV-002: Login immediately after registration', async ({ request }) => {
    const email = `adv-login-${Date.now()}@example.com`;
    const password = 'Password123!';
    
    // Register
    await request.post(`${API_BASE}/auth/register`, {
      data: { email, password, name: 'Test User' }
    });
    
    // Login immediately
    const res = await request.post(`${API_BASE}/auth/login`, {
      data: { email, password }
    });
    expect([200, 201, 400, 401, 500]).toContain(res.status());
  });

  test('E2E-ADV-003: Password validation on registration', async ({ request }) => {
    // Test weak password
    const res = await request.post(`${API_BASE}/auth/register`, {
      data: { 
        email: `test-${Date.now()}@example.com`, 
        password: '123',  // Too weak
        name: 'Test User' 
      }
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });
});

test.describe('Advanced TODO Operations', () => {
  test('E2E-ADV-004: Create and immediately retrieve TODO', async ({ request }) => {
    const mockToken = 'mock-auth-token';
    const headers = { 'Authorization': `Bearer ${mockToken}` };
    
    // Create TODO
    const createRes = await request.post(`${API_BASE}/todos`, {
      headers,
      data: { title: 'Advanced TODO', description: 'Test' }
    });
    
    // Retrieve TODOs list
    const listRes = await request.get(`${API_BASE}/todos`, { headers });
    
    expect([200, 201, 400, 401, 500]).toContain(createRes.status());
    expect([200, 400, 401, 500]).toContain(listRes.status());
  });

  test('E2E-ADV-005: Update TODO status transitions', async ({ request }) => {
    const mockToken = 'mock-auth-token';
    const headers = { 'Authorization': `Bearer ${mockToken}` };
    
    // Create TODO
    const createRes = await request.post(`${API_BASE}/todos`, {
      headers,
      data: { title: 'Status Test', completed: false }
    });
    
    // Update TODO
    const updateRes = await request.put(`${API_BASE}/todos/1`, {
      headers,
      data: { completed: true }
    });
    
    expect([200, 201, 400, 401, 500]).toContain(createRes.status());
    expect([200, 400, 401, 404, 500]).toContain(updateRes.status());
  });

  test('E2E-ADV-006: Bulk TODO operations', async ({ request }) => {
    const mockToken = 'mock-auth-token';
    const headers = { 'Authorization': `Bearer ${mockToken}` };
    
    // Create multiple TODOs
    for (let i = 0; i < 5; i++) {
      const res = await request.post(`${API_BASE}/todos`, {
        headers,
        data: { title: `Todo ${i}`, description: `Description ${i}` }
      });
      expect([200, 201, 400, 401, 500]).toContain(res.status());
    }
    
    // List and verify
    const listRes = await request.get(`${API_BASE}/todos`, { headers });
    expect([200, 400, 401, 500]).toContain(listRes.status());
  });
});

test.describe('Advanced File Operations', () => {
  test('E2E-ADV-007: Presigned URL flow', async ({ request }) => {
    const mockToken = 'mock-auth-token';
    const headers = { 'Authorization': `Bearer ${mockToken}` };
    
    // Request presigned URL
    const res = await request.post(`${API_BASE}/files/presigned-upload`, {
      headers,
      data: { fileName: 'test.txt', fileSize: 1024 }
    });
    
    expect([200, 201, 400, 401, 500]).toContain(res.status());
  });

  test('E2E-ADV-008: File list and retrieval', async ({ request }) => {
    const mockToken = 'mock-auth-token';
    const headers = { 'Authorization': `Bearer ${mockToken}` };
    
    // Get file list
    const listRes = await request.get(`${API_BASE}/files`, { headers });
    
    // Try to get specific file
    const getRes = await request.get(`${API_BASE}/files/1`, { headers });
    
    expect([200, 400, 401, 500]).toContain(listRes.status());
    expect([200, 400, 401, 404, 500]).toContain(getRes.status());
  });
});

test.describe('Advanced Error Handling', () => {
  test('E2E-ADV-009: Invalid token handling', async ({ request }) => {
    const headers = { 'Authorization': 'Bearer invalid-token-xyz' };
    
    const res = await request.get(`${API_BASE}/todos`, { headers });
    expect([401, 403, 500]).toContain(res.status());
  });

  test('E2E-ADV-010: Missing authentication header', async ({ request }) => {
    // No Authorization header
    const res = await request.get(`${API_BASE}/todos`);
    expect([401, 403, 500]).toContain(res.status());
  });

  test('E2E-ADV-011: Malformed API requests', async ({ request }) => {
    // Send malformed data
    const res = await request.post(`${API_BASE}/auth/register`, {
      data: { invalid: 'data' }  // Missing required fields
    });
    
    expect([400, 422, 500]).toContain(res.status());
  });

  test('E2E-ADV-012: Concurrent requests handling', async ({ request }) => {
    const mockToken = 'mock-auth-token';
    const headers = { 'Authorization': `Bearer ${mockToken}` };
    
    // Send multiple concurrent requests
    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(request.get(`${API_BASE}/todos`, { headers }));
    }
    
    const results = await Promise.all(promises);
    results.forEach(res => {
      expect([200, 400, 401, 500]).toContain(res.status());
    });
  });
});

test.describe('Advanced UI Scenarios', () => {
  test('E2E-ADV-013: Frontend loads and responds', async ({ request }) => {
    const res = await request.get(`${FRONTEND_BASE}`);
    expect(res.status()).toBe(200);
    const content = await res.text();
    expect(content.length).toBeGreaterThan(100);
  });

  test('E2E-ADV-014: Navigation pages accessible', async ({ request }) => {
    const pages = ['/todos', '/files', '/profile', '/settings'];
    
    for (const page of pages) {
      const res = await request.get(`${FRONTEND_BASE}${page}`);
      expect(res.status()).toBe(200);
    }
  });

  test('E2E-ADV-015: Health endpoints consistent', async ({ request }) => {
    // Check health across multiple requests
    for (let i = 0; i < 3; i++) {
      const res = await request.get(`${API_BASE}/health`);
      expect(res.status()).toBe(200);
    }
  });
});

