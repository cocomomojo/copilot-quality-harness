import { describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { AppProvider } from './context/AppContext.jsx';

// Mock useAuth to provide test values
vi.mock('./context/AuthContext.jsx', async () => {
  const actual = await vi.importActual('./context/AuthContext.jsx');
  return {
    ...actual,
    useAuth: () => ({
      isAuthenticated: false,
      isLoading: false,
      user: null,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    }),
  };
});

describe('App Component', () => {
  test('renders without crashing', () => {
    render(
      <AuthProvider>
        <AppProvider>
          <App />
        </AppProvider>
      </AuthProvider>
    );
    
    // App should render
    expect(document.body).toBeTruthy();
  });
});
