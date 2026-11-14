export async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem('authToken');
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    // Clear auth and redirect to login
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
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
    register: (email, password, name) =>
      apiFetch('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, name }),
      }),
    login: (email, password) =>
      apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    me: () => apiFetch('/api/auth/me'),
  },
  todos: {
    create: (title, description, status, priority) =>
      apiFetch('/api/todos', {
        method: 'POST',
        body: JSON.stringify({ title, description, status, priority }),
      }),
    list: (filters) => {
      const params = new URLSearchParams(filters).toString();
      return apiFetch(`/api/todos?${params}`);
    },
    get: (todoId) => apiFetch(`/api/todos/${todoId}`),
    update: (todoId, data) =>
      apiFetch(`/api/todos/${todoId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (todoId) =>
      apiFetch(`/api/todos/${todoId}`, { method: 'DELETE' }),
  },
  files: {
    getPresignedUrl: (fileName, fileType) =>
      apiFetch('/api/files/presigned-upload', {
        method: 'POST',
        body: JSON.stringify({ fileName, fileType }),
      }),
    recordUpload: (fileName, fileSize, fileType, fileId, key) =>
      apiFetch('/api/files/record-upload', {
        method: 'POST',
        body: JSON.stringify({ fileName, fileSize, fileType, fileId, key }),
      }),
    list: () => apiFetch('/api/files'),
    delete: (fileId) =>
      apiFetch(`/api/files/${fileId}`, { method: 'DELETE' }),
    getDownloadUrl: (fileId) =>
      apiFetch(`/api/files/${fileId}/presigned-url`),
  },
  logs: {
    list: (filters) => {
      const params = new URLSearchParams(filters).toString();
      return apiFetch(`/api/logs?${params}`);
    },
  },
};
