import { createContext, useContext, useState, useEffect } from 'react';
import { clearAuth, getAuthToken, getStoredUser, saveAuth } from '../utils/authStorage.js';

const AuthContext = createContext();

// Uses fetch directly (not apiFetch) so a 401 on login does not trigger a redirect.
async function postCredentials(endpoint, payload, failureMessage) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(failureMessage);
  }
  return response.json();
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (getAuthToken()) {
      setIsAuthenticated(true);
      setUser(getStoredUser());
    }
    setIsLoading(false);
  }, []);

  const authenticate = async (logLabel, endpoint, payload, failureMessage) => {
    try {
      const data = await postCredentials(endpoint, payload, failureMessage);
      saveAuth(data);
      setUser(data);
      setIsAuthenticated(true);
      return data;
    } catch (error) {
      console.error(`${logLabel}:`, error);
      throw error;
    }
  };

  const login = (email, password) =>
    authenticate('Login error', '/api/auth/login', { email, password }, 'Login failed');

  const register = (email, password, name) =>
    authenticate('Register error', '/api/auth/register', { email, password, name }, 'Registration failed');

  const logout = () => {
    clearAuth();
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
