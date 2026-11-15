import { expect, test } from '@playwright/test';
import { API_BASE, authHeaders, registerUser } from './helpers.js';

test.describe('Authentication API', () => {
  test('E2E-201 register success', async ({ request }) => {
    const user = await registerUser(request, 'auth-register');
    expect(user.token).toBeTruthy();
    expect(user.userId).toBeTruthy();
  });

  test('E2E-202 duplicate email returns 409', async ({ request }) => {
    const email = `auth-dup-${Date.now()}@example.com`;
    await request.post(`${API_BASE}/auth/register`, {
      data: { email, password: 'Password123!', name: 'Dup User' },
    });
    const res = await request.post(`${API_BASE}/auth/register`, {
      data: { email, password: 'Password123!', name: 'Dup User 2' },
    });
    expect(res.status()).toBe(409);
  });

  test('E2E-203 weak password returns 422', async ({ request }) => {
    const res = await request.post(`${API_BASE}/auth/register`, {
      data: { email: `auth-weak-${Date.now()}@example.com`, password: 'weak', name: 'Weak' },
    });
    expect(res.status()).toBe(422);
    const body = await res.json();
    expect(body.error || body.message).toContain('Password');
  });

  test('E2E-204 missing fields returns 400', async ({ request }) => {
    const res = await request.post(`${API_BASE}/auth/register`, {
      data: { email: `auth-missing-${Date.now()}@example.com`, password: 'Password123!' },
    });
    expect(res.status()).toBe(400);
  });

  test('E2E-205 API login success', async ({ request }) => {
    const email = `auth-login-${Date.now()}@example.com`;
    await request.post(`${API_BASE}/auth/register`, {
      data: { email, password: 'Password123!', name: 'Login User' },
    });
    const res = await request.post(`${API_BASE}/auth/login`, {
      data: { email, password: 'Password123!' },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.token).toBeTruthy();
  });

  test('E2E-206 login wrong password returns 401', async ({ request }) => {
    const email = `auth-badpw-${Date.now()}@example.com`;
    await request.post(`${API_BASE}/auth/register`, {
      data: { email, password: 'Password123!', name: 'Bad PW' },
    });
    const res = await request.post(`${API_BASE}/auth/login`, {
      data: { email, password: 'WrongPassword123!' },
    });
    expect(res.status()).toBe(401);
  });

  test('E2E-207 login unknown user returns 401', async ({ request }) => {
    const res = await request.post(`${API_BASE}/auth/login`, {
      data: { email: `auth-none-${Date.now()}@example.com`, password: 'Password123!' },
    });
    expect(res.status()).toBe(401);
  });

  test('E2E-208 /auth/me with valid token', async ({ request }) => {
    const user = await registerUser(request, 'auth-me');
    let res;
    for (let i = 0; i < 5; i += 1) {
      res = await request.get(`${API_BASE}/auth/me`, {
        headers: authHeaders(user.token),
      });
      if (res.status() === 200) break;
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.email).toBe(user.email);
    expect(body.userId).toBe(user.userId);
  });

  test('E2E-209 /auth/me without token returns 401', async ({ request }) => {
    const res = await request.get(`${API_BASE}/auth/me`);
    expect(res.status()).toBe(401);
  });

  test('E2E-210 /auth/me invalid token returns 401', async ({ request }) => {
    const res = await request.get(`${API_BASE}/auth/me`, {
      headers: authHeaders('invalid.token.value'),
    });
    expect(res.status()).toBe(401);
  });
});

