import { clearAuth, getAuthToken } from './authStorage.js';

function withQuery(endpoint, filters) {
  return `${endpoint}?${new URLSearchParams(filters).toString()}`;
}

function jsonBody(method, body) {
  return { method, body: JSON.stringify(body) };
}

export async function apiFetch(endpoint, options = {}) {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
    ...(token && { Authorization: `Bearer ${token}` }),
  };

  const response = await fetch(endpoint, { ...options, headers });

  if (response.status === 401) {
    clearAuth();
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json().catch(() => null);
}

export const api = {
  auth: {
    register: (email, password, name) => apiFetch('/api/auth/register', jsonBody('POST', { email, password, name })),
    login: (email, password) => apiFetch('/api/auth/login', jsonBody('POST', { email, password })),
    me: () => apiFetch('/api/auth/me'),
  },
  todos: {
    create: (title, description, status, priority) =>
      apiFetch('/api/todos', jsonBody('POST', { title, description, status, priority })),
    list: (filters) => apiFetch(withQuery('/api/todos', filters)),
    get: (todoId) => apiFetch(`/api/todos/${todoId}`),
    update: (todoId, data) => apiFetch(`/api/todos/${todoId}`, jsonBody('PUT', data)),
    delete: (todoId) => apiFetch(`/api/todos/${todoId}`, { method: 'DELETE' }),
  },
  files: {
    getPresignedUrl: (fileName, fileType) =>
      apiFetch('/api/files/presigned-url', jsonBody('POST', { filename: fileName, contentType: fileType })),
    recordUpload: (fileName, fileSize, fileType, fileId, key) =>
      apiFetch('/api/files/record-upload', jsonBody('POST', { fileName, fileSize, fileType, fileId, key })),
    list: () => apiFetch('/api/files'),
    delete: (fileId) => apiFetch(`/api/files/${fileId}`, { method: 'DELETE' }),
    getDownloadUrl: (fileId) => apiFetch(`/api/files/${fileId}/presigned-url`),
  },
  logs: {
    list: (filters) => apiFetch(withQuery('/api/logs', filters)),
  },
};
