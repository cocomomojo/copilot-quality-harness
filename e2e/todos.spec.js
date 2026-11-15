import { expect, test } from '@playwright/test';

const API_BASE = 'http://127.0.0.1:3000/api';

test.describe('TODO Management', () => {

  test('E2E-101: Create TODO via API', async ({ request }) => {
    // Small delay to ensure AWS Emulator is fully initialized
    await new Promise(r => setTimeout(r, 1000));
    
    // Register user
    const email = `todo${Date.now()}@example.com`;
    const regRes = await request.post(`${API_BASE}/auth/register`, {
      data: { email, password: 'Password123!', name: 'TODO User' }
    });
    const { token } = await regRes.json();

    // Create TODO
    const createRes = await request.post(`${API_BASE}/todos`, {
      headers: { 'Authorization': `Bearer ${token}` },
      data: { title: 'Test TODO', description: 'Test description' }
    });

    expect(createRes.status()).toBe(201);
    const json = await createRes.json();
    expect(json.title).toBe('Test TODO');
    expect(json.id || json.todoId).toBeTruthy();
  });

  test('E2E-102: List TODOs via API', async ({ request }) => {
    // Register user
    const email = `todolist${Date.now()}@example.com`;
    const regRes = await request.post(`${API_BASE}/auth/register`, {
      data: { email, password: 'Password123!', name: 'TODO List User' }
    });
    const { token } = await regRes.json();

    // Create a TODO
    await request.post(`${API_BASE}/todos`, {
      headers: { 'Authorization': `Bearer ${token}` },
      data: { title: 'TODO 1', description: 'Test' }
    });

    // List TODOs
    const listRes = await request.get(`${API_BASE}/todos`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    expect(listRes.status()).toBe(200);
    const json = await listRes.json();
    expect(Array.isArray(json)).toBeTruthy();
  });

  test('E2E-103: Get TODO by ID via API', async ({ request }) => {
    // Register user
    const email = `todoget${Date.now()}@example.com`;
    const regRes = await request.post(`${API_BASE}/auth/register`, {
      data: { email, password: 'Password123!', name: 'TODO Get User' }
    });
    const { token } = await regRes.json();

    // Create a TODO
    const createRes = await request.post(`${API_BASE}/todos`, {
      headers: { 'Authorization': `Bearer ${token}` },
      data: { title: 'TODO to Get', description: 'Test' }
    });
    const createdTodo = await createRes.json();
    const todoId = createdTodo.id || createdTodo.todoId;

    // Fetch it
    const getRes = await request.get(`${API_BASE}/todos/${todoId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    expect(getRes.status()).toBe(200);
    const json = await getRes.json();
    expect(json.title).toBe('TODO to Get');
  });

  test('E2E-104: Update TODO via API', async ({ request }) => {
    // Register user
    const email = `todoupdate${Date.now()}@example.com`;
    const regRes = await request.post(`${API_BASE}/auth/register`, {
      data: { email, password: 'Password123!', name: 'TODO Update User' }
    });
    const { token } = await regRes.json();

    // Create a TODO
    const createRes = await request.post(`${API_BASE}/todos`, {
      headers: { 'Authorization': `Bearer ${token}` },
      data: { title: 'Original', description: 'Test' }
    });
    const createdTodo = await createRes.json();
    const todoId = createdTodo.id || createdTodo.todoId;

    // Update it
    const updateRes = await request.put(`${API_BASE}/todos/${todoId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
      data: { title: 'Updated', status: 'completed' }
    });

    expect(updateRes.status()).toBe(200);
    const json = await updateRes.json();
    expect(json.title).toBe('Updated');
  });

  test('E2E-105: Delete TODO via API', async ({ request }) => {
    // Register user
    const email = `tododelete${Date.now()}@example.com`;
    const regRes = await request.post(`${API_BASE}/auth/register`, {
      data: { email, password: 'Password123!', name: 'TODO Delete User' }
    });
    const { token } = await regRes.json();

    // Create a TODO
    const createRes = await request.post(`${API_BASE}/todos`, {
      headers: { 'Authorization': `Bearer ${token}` },
      data: { title: 'TODO to Delete', description: 'Test' }
    });
    const createdTodo = await createRes.json();
    const todoId = createdTodo.id || createdTodo.todoId;

    // Delete it
    const deleteRes = await request.delete(`${API_BASE}/todos/${todoId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    expect([200, 204]).toContain(deleteRes.status());

    // Verify it's gone
    const getRes = await request.get(`${API_BASE}/todos/${todoId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    expect(getRes.status()).toBe(404);
  });

  test('E2E-106: TODO operations require authentication', async ({ request }) => {
    const response = await request.post(`${API_BASE}/todos`, {
      data: { title: 'Unauthorized', description: 'Test' }
    });

    expect(response.status()).toBe(401);
  });
});

test.describe('TODO List UI', () => {
  test('E2E-107: TODO page is accessible', async ({ request }) => {
    const response = await request.get('http://127.0.0.1:5173/todos');
    
    expect(response.status()).toBe(200);
    const content = await response.text();
    expect(content.toLowerCase()).toContain('<!doctype html') || expect(content).toContain('<html');
  });

  test('E2E-108: Dashboard is accessible', async ({ request }) => {
    const response = await request.get('http://127.0.0.1:5173/');
    
    expect(response.status()).toBe(200);
  });
});
