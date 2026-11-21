import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { AppProvider } from './context/AppContext.jsx';
import Toast from './components/Toast.jsx';

export function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  };
}

/**
 * Stubs global fetch with a route table: { 'GET /api/todos': body | (url, init) => response }.
 * Unmatched requests resolve to 404.
 */
export function mockFetch(routes) {
  const fetchMock = vi.fn(async (url, init = {}) => {
    const method = (init.method || 'GET').toUpperCase();
    const path = String(url).split('?')[0];
    const handler = routes[`${method} ${path}`];
    if (handler === undefined) return jsonResponse({ error: 'Not found' }, 404);
    if (typeof handler === 'function') return handler(url, init);
    return jsonResponse(handler);
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

export function renderWithApp(ui, { route = '/' } = {}) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AppProvider>
        {ui}
        <Toast />
      </AppProvider>
    </MemoryRouter>
  );
}
