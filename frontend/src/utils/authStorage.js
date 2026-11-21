const TOKEN_KEY = 'authToken';
const USER_KEY = 'userData';

export function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser() {
  return JSON.parse(localStorage.getItem(USER_KEY) || '{}');
}

export function saveAuth(data) {
  localStorage.setItem(TOKEN_KEY, data.token);
  localStorage.setItem(USER_KEY, JSON.stringify(data));
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}
