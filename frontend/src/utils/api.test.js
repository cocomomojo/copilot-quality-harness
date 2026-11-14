import { describe, expect, test } from 'vitest';
import { apiFetch } from './api.js';

// Mock fetch
global.fetch = vi.fn();

describe('API Utilities', () => {
  test('apiFetch adds Content-Type header', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    await apiFetch('/api/test');

    const call = fetch.mock.calls[0];
    expect(call[1].headers['Content-Type']).toBe('application/json');
  });

  test('apiFetch includes auth token when available', async () => {
    localStorage.setItem('authToken', 'test-token');

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    await apiFetch('/api/test');

    const call = fetch.mock.calls[0];
    expect(call[1].headers.Authorization).toBe('Bearer test-token');
  });
});
