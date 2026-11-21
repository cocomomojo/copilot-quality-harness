import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App.jsx';
import { jsonResponse, mockFetch } from './test-utils.jsx';

const emptyData = {
  'GET /api/todos': [],
  'GET /api/files': [],
  'GET /api/logs': [],
};

describe('App routing and authentication', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/');
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('redirects unauthenticated users to the login page', async () => {
    mockFetch(emptyData);
    render(<App />);
    expect(await screen.findByTestId('login-button')).toBeInTheDocument();
    expect(window.location.pathname).toBe('/login');
  });

  it('logs in and lands on the dashboard', async () => {
    const fetchMock = mockFetch({
      ...emptyData,
      'POST /api/auth/login': { token: 'tkn', email: 'user@example.com' },
    });
    render(<App />);
    await userEvent.type(await screen.findByTestId('email-input'), 'user@example.com');
    await userEvent.type(screen.getByTestId('password-input'), 'Passw0rd!');
    await userEvent.click(screen.getByTestId('login-button'));

    expect(await screen.findByTestId('dashboard-page')).toBeInTheDocument();
    expect(screen.getByTestId('toast')).toHaveTextContent('Login successful!');
    expect(localStorage.getItem('authToken')).toBe('tkn');
    const loginCall = fetchMock.mock.calls.find(([url]) => url === '/api/auth/login');
    expect(JSON.parse(loginCall[1].body)).toEqual({ email: 'user@example.com', password: 'Passw0rd!' });
  });

  it('shows an error toast when login fails', async () => {
    mockFetch({ 'POST /api/auth/login': () => jsonResponse({ error: 'nope' }, 401) });
    render(<App />);
    await userEvent.type(await screen.findByTestId('email-input'), 'user@example.com');
    await userEvent.type(screen.getByTestId('password-input'), 'wrong');
    await userEvent.click(screen.getByTestId('login-button'));

    expect(await screen.findByTestId('toast')).toHaveTextContent('Login failed');
    expect(screen.getByTestId('login-button')).toBeInTheDocument();
  });

  it('registers a new account', async () => {
    mockFetch({
      ...emptyData,
      'POST /api/auth/register': { token: 'new', email: 'new@example.com', name: 'New' },
    });
    render(<App />);
    await userEvent.click(await screen.findByTestId('toggle-auth-mode'));
    await userEvent.type(screen.getByTestId('name-input'), 'New');
    await userEvent.type(screen.getByTestId('email-input'), 'new@example.com');
    await userEvent.type(screen.getByTestId('password-input'), 'Passw0rd!');
    await userEvent.click(screen.getByTestId('register-button'));

    expect(await screen.findByTestId('dashboard-page')).toBeInTheDocument();
    expect(screen.getByTestId('toast')).toHaveTextContent('Registration successful!');
  });

  it('shows registration failure and can switch back to login', async () => {
    mockFetch({ 'POST /api/auth/register': () => jsonResponse({}, 409) });
    render(<App />);
    await userEvent.click(await screen.findByTestId('toggle-auth-mode'));
    await userEvent.type(screen.getByTestId('name-input'), 'Dup');
    await userEvent.type(screen.getByTestId('email-input'), 'dup@example.com');
    await userEvent.type(screen.getByTestId('password-input'), 'Passw0rd!');
    await userEvent.click(screen.getByTestId('register-button'));
    expect(await screen.findByTestId('toast')).toHaveTextContent('Registration failed');

    await userEvent.click(screen.getByTestId('toggle-auth-mode'));
    expect(screen.getByTestId('login-button')).toBeInTheDocument();
    expect(screen.queryByTestId('name-input')).toBeNull();
  });

  it('opens protected pages directly when a token is stored', async () => {
    localStorage.setItem('authToken', 'tkn');
    localStorage.setItem('userData', JSON.stringify({ email: 'user@example.com' }));
    window.history.pushState({}, '', '/todos');
    mockFetch(emptyData);
    render(<App />);
    expect(await screen.findByTestId('todos-page')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('No TODOs found')).toBeInTheDocument());
  });

  it('redirects unknown routes to the dashboard for authenticated users', async () => {
    localStorage.setItem('authToken', 'tkn');
    window.history.pushState({}, '', '/does-not-exist');
    mockFetch(emptyData);
    render(<App />);
    expect(await screen.findByTestId('dashboard-page')).toBeInTheDocument();
    expect(window.location.pathname).toBe('/');
  });
});
