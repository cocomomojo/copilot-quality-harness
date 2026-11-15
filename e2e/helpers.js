export const API_BASE = 'http://127.0.0.1:3000/api';

export async function waitForApiReady(request, retries = 30, delayMs = 500) {
  for (let i = 0; i < retries; i += 1) {
    const res = await request.get(`${API_BASE}/health`).catch(() => null);
    if (res && res.status() === 200) return;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  throw new Error('API was not ready in time');
}

export async function registerUser(request, prefix = 'e2e-user') {
  await waitForApiReady(request);

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const email = `${prefix}-${Date.now()}-${attempt}@example.com`;
    const payload = {
      email,
      password: 'Password123!',
      name: `User ${attempt}`,
    };

    const response = await request.post(`${API_BASE}/auth/register`, { data: payload });
    const body = await response.json().catch(() => ({}));

    if (response.status() === 200 && body.token) {
      return {
        token: body.token,
        email: body.email || email,
        userId: body.userId,
        name: body.name || payload.name,
      };
    }

    if (response.status() === 500) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      continue;
    }

    throw new Error(`registerUser failed: status=${response.status()} body=${JSON.stringify(body)}`);
  }

  throw new Error('registerUser exhausted retries');
}

export function authHeaders(token) {
  return { Authorization: `Bearer ${token}` };
}

