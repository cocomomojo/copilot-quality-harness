import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Dashboard from './Dashboard.jsx';
import { jsonResponse, mockFetch, renderWithApp } from '../test-utils.jsx';

describe('Dashboard page', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('summarises todos, files and recent activity', async () => {
    mockFetch({
      'GET /api/todos': [
        { todoId: '1', status: 'completed' },
        { todoId: '2', status: 'pending' },
        { todoId: '3', status: 'completed' },
        { todoId: '4', status: 'pending' },
      ],
      'GET /api/files': [{ fileSize: 1024 }, { fileSize: 1024 }, {}],
      'GET /api/logs': [
        { logId: 'l1', eventType: 'todo_created', action: 'create', details: { id: 1 }, timestamp: '2026-01-01T00:00:00Z' },
      ],
    });
    renderWithApp(<Dashboard />);

    expect(await screen.findByTestId('dashboard-page')).toBeInTheDocument();
    expect(screen.getByTestId('summary-card-todos')).toHaveTextContent('4');
    expect(screen.getByTestId('summary-card-completion')).toHaveTextContent('50%');
    expect(screen.getByTestId('summary-card-files')).toHaveTextContent('3');
    expect(screen.getByTestId('summary-card-storage')).toHaveTextContent('2 KB');
    expect(screen.getByTestId('activity-item-l1')).toHaveTextContent('todo_created - create');
  });

  it('shows zero state when there is no data', async () => {
    mockFetch({ 'GET /api/todos': [], 'GET /api/files': [], 'GET /api/logs': [] });
    renderWithApp(<Dashboard />);
    expect(await screen.findByText('No recent activity')).toBeInTheDocument();
    expect(screen.getByTestId('summary-card-completion')).toHaveTextContent('0%');
  });

  it('shows an error toast when loading fails', async () => {
    mockFetch({
      'GET /api/todos': () => jsonResponse({ error: 'boom' }, 500),
      'GET /api/files': [],
      'GET /api/logs': [],
    });
    renderWithApp(<Dashboard />);
    expect(await screen.findByText('boom')).toBeInTheDocument();
  });
});
