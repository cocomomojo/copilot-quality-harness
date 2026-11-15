import { expect, test } from '@playwright/test';
import { API_BASE, authHeaders, registerUser } from './helpers.js';

test.describe('TODO API', () => {
  test('E2E-101 create todo', async ({ request }) => {
    const user = await registerUser(request, 'todo-create');
    const res = await request.post(`${API_BASE}/todos`, {
      headers: authHeaders(user.token),
      data: { title: 'Write tests', description: 'Create E2E tests' },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.todoId || body.id).toBeTruthy();
    expect(body.title).toBe('Write tests');
  });

  test('E2E-102 create todo without title returns 400', async ({ request }) => {
    const user = await registerUser(request, 'todo-no-title');
    const res = await request.post(`${API_BASE}/todos`, {
      headers: authHeaders(user.token),
      data: { description: 'No title' },
    });
    expect(res.status()).toBe(400);
  });

  test('E2E-103 list todos empty', async ({ request }) => {
    const user = await registerUser(request, 'todo-list-empty');
    const res = await request.get(`${API_BASE}/todos`, {
      headers: authHeaders(user.token),
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBeTruthy();
    expect(body.length).toBe(0);
  });

  test('E2E-104 list todos after create', async ({ request }) => {
    const user = await registerUser(request, 'todo-list');
    await request.post(`${API_BASE}/todos`, {
      headers: authHeaders(user.token),
      data: { title: 'Todo A', description: 'A' },
    });
    const res = await request.get(`${API_BASE}/todos`, {
      headers: authHeaders(user.token),
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.some((t) => t.title === 'Todo A')).toBeTruthy();
  });

  test('E2E-105 get todo by id', async ({ request }) => {
    const user = await registerUser(request, 'todo-get');
    const created = await request.post(`${API_BASE}/todos`, {
      headers: authHeaders(user.token),
      data: { title: 'Todo Get', description: 'B' },
    });
    const todo = await created.json();
    const id = todo.todoId || todo.id;
    const res = await request.get(`${API_BASE}/todos/${id}`, {
      headers: authHeaders(user.token),
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.title).toBe('Todo Get');
  });

  test('E2E-106 get missing todo returns 404', async ({ request }) => {
    const user = await registerUser(request, 'todo-missing');
    const res = await request.get(`${API_BASE}/todos/not-found`, {
      headers: authHeaders(user.token),
    });
    expect(res.status()).toBe(404);
  });

  test('E2E-107 update todo title/status', async ({ request }) => {
    const user = await registerUser(request, 'todo-update');
    const created = await request.post(`${API_BASE}/todos`, {
      headers: authHeaders(user.token),
      data: { title: 'Before', description: 'desc' },
    });
    const todo = await created.json();
    const id = todo.todoId || todo.id;
    const res = await request.put(`${API_BASE}/todos/${id}`, {
      headers: authHeaders(user.token),
      data: { title: 'After', status: 'completed' },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.title).toBe('After');
    expect(body.status).toBe('completed');
  });

  test('E2E-108 update todo with completed boolean', async ({ request }) => {
    const user = await registerUser(request, 'todo-update-bool');
    const created = await request.post(`${API_BASE}/todos`, {
      headers: authHeaders(user.token),
      data: { title: 'To complete' },
    });
    const todo = await created.json();
    const id = todo.todoId || todo.id;
    const res = await request.put(`${API_BASE}/todos/${id}`, {
      headers: authHeaders(user.token),
      data: { completed: true },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('completed');
  });

  test('E2E-109 update missing todo returns 404', async ({ request }) => {
    const user = await registerUser(request, 'todo-update-missing');
    const res = await request.put(`${API_BASE}/todos/not-found`, {
      headers: authHeaders(user.token),
      data: { title: 'X' },
    });
    expect(res.status()).toBe(404);
  });

  test('E2E-110 delete todo', async ({ request }) => {
    const user = await registerUser(request, 'todo-delete');
    const created = await request.post(`${API_BASE}/todos`, {
      headers: authHeaders(user.token),
      data: { title: 'Delete me' },
    });
    const todo = await created.json();
    const id = todo.todoId || todo.id;
    const del = await request.delete(`${API_BASE}/todos/${id}`, {
      headers: authHeaders(user.token),
    });
    expect(del.status()).toBe(204);
    const get = await request.get(`${API_BASE}/todos/${id}`, {
      headers: authHeaders(user.token),
    });
    expect(get.status()).toBe(404);
  });

  test('E2E-111 delete missing todo returns 404', async ({ request }) => {
    const user = await registerUser(request, 'todo-delete-missing');
    const res = await request.delete(`${API_BASE}/todos/not-found`, {
      headers: authHeaders(user.token),
    });
    expect(res.status()).toBe(404);
  });

  test('E2E-112 unauthorized access returns 401', async ({ request }) => {
    const res = await request.get(`${API_BASE}/todos`);
    expect(res.status()).toBe(401);
  });

  test('E2E-113 list with status filter', async ({ request }) => {
    const user = await registerUser(request, 'todo-filter-status');
    const created = await request.post(`${API_BASE}/todos`, {
      headers: authHeaders(user.token),
      data: { title: 'Filter me', status: 'pending' },
    });
    const todo = await created.json();
    const id = todo.todoId || todo.id;
    await request.put(`${API_BASE}/todos/${id}`, {
      headers: authHeaders(user.token),
      data: { status: 'completed' },
    });
    const res = await request.get(`${API_BASE}/todos?status=completed`, {
      headers: authHeaders(user.token),
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.every((t) => t.status === 'completed')).toBeTruthy();
  });

  test('E2E-114 list with search filter', async ({ request }) => {
    const user = await registerUser(request, 'todo-filter-search');
    await request.post(`${API_BASE}/todos`, {
      headers: authHeaders(user.token),
      data: { title: 'Unique Search Token', description: 'needle' },
    });
    const res = await request.get(`${API_BASE}/todos?search=Search%20Token`, {
      headers: authHeaders(user.token),
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.some((t) => t.title.includes('Search Token'))).toBeTruthy();
  });
});

