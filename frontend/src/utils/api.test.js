import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api, apiFetch } from './api.js';
import { saveAuth, getAuthToken } from './authStorage.js';
import { jsonResponse } from '../test-utils.jsx';

describe('apiFetch', () => {
  let fetchMock;

  beforeEach(() => {
    fetchMock = vi.fn(async () => jsonResponse({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('sends JSON headers and bearer token when logged in', async () => {
    saveAuth({ token: 'tkn' });
    await expect(apiFetch('/api/x')).resolves.toEqual({ ok: true });
    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers).toEqual({ 'Content-Type': 'application/json', Authorization: 'Bearer tkn' });
  });

  it('omits Authorization header when logged out', async () => {
    await apiFetch('/api/x');
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBeUndefined();
  });

  it('clears auth and redirects on 401', async () => {
    // jsdom logs "navigation not implemented" for location.href assignments
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    saveAuth({ token: 'tkn' });
    fetchMock.mockResolvedValueOnce(jsonResponse({}, 401));
    await expect(apiFetch('/api/x')).rejects.toThrow('Unauthorized');
    expect(getAuthToken()).toBeNull();
    consoleSpy.mockRestore();
  });

  it('throws server error message on non-2xx', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'Bad input' }, 400));
    await expect(apiFetch('/api/x')).rejects.toThrow('Bad input');
  });

  it('falls back to HTTP status when error body is not JSON', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500, json: () => Promise.reject(new Error('x')) });
    await expect(apiFetch('/api/x')).rejects.toThrow('HTTP 500');
  });

  it('returns null for empty response bodies', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, status: 204, json: () => Promise.reject(new Error('empty')) });
    await expect(apiFetch('/api/x')).resolves.toBeNull();
  });
});

describe('api endpoints', () => {
  let fetchMock;

  beforeEach(() => {
    fetchMock = vi.fn(async () => jsonResponse({}));
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  const call = () => {
    const [url, init] = fetchMock.mock.calls.at(-1);
    return { url, method: init.method || 'GET', body: init.body ? JSON.parse(init.body) : undefined };
  };

  it.each([
    [() => api.auth.register('e', 'p', 'n'), '/api/auth/register', 'POST', { email: 'e', password: 'p', name: 'n' }],
    [() => api.auth.login('e', 'p'), '/api/auth/login', 'POST', { email: 'e', password: 'p' }],
    [() => api.auth.me(), '/api/auth/me', 'GET', undefined],
    [() => api.todos.create('t', 'd', 'pending', 'high'), '/api/todos', 'POST', { title: 't', description: 'd', status: 'pending', priority: 'high' }],
    [() => api.todos.list({ status: 'completed' }), '/api/todos?status=completed', 'GET', undefined],
    [() => api.todos.get('1'), '/api/todos/1', 'GET', undefined],
    [() => api.todos.update('1', { status: 'completed' }), '/api/todos/1', 'PUT', { status: 'completed' }],
    [() => api.todos.delete('1'), '/api/todos/1', 'DELETE', undefined],
    [() => api.files.getPresignedUrl('a.txt', 'text/plain'), '/api/files/presigned-url', 'POST', { filename: 'a.txt', contentType: 'text/plain' }],
    [() => api.files.recordUpload('a.txt', 3, 'text/plain', 'f1', 'k1'), '/api/files/record-upload', 'POST', { fileName: 'a.txt', fileSize: 3, fileType: 'text/plain', fileId: 'f1', key: 'k1' }],
    [() => api.files.list(), '/api/files', 'GET', undefined],
    [() => api.files.delete('f1'), '/api/files/f1', 'DELETE', undefined],
    [() => api.files.getDownloadUrl('f1'), '/api/files/f1/presigned-url', 'GET', undefined],
    [() => api.logs.list({ limit: 10 }), '/api/logs?limit=10', 'GET', undefined],
  ])('calls %#', async (invoke, url, method, body) => {
    await invoke();
    expect(call()).toEqual({ url, method, body });
  });
});
