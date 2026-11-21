import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ActivityLogs from './ActivityLogs.jsx';
import { jsonResponse, mockFetch, renderWithApp } from '../test-utils.jsx';

const logs = [
  { logId: 'old', eventType: 'user_login', action: 'login', timestamp: '2026-01-01T12:00:00Z' },
  { logId: 'new', eventType: 'todo_created', action: 'create', resourceId: 't1', details: { title: 'x' }, timestamp: '2026-03-01T12:00:00Z' },
];

describe('ActivityLogs page', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('lists logs and sends the event type filter', async () => {
    const fetchMock = mockFetch({ 'GET /api/logs': () => jsonResponse(logs) });
    renderWithApp(<ActivityLogs />);
    expect(await screen.findByTestId('log-item-old')).toHaveTextContent('-');
    expect(screen.getByTestId('log-item-new')).toHaveTextContent('t1');

    await userEvent.selectOptions(screen.getByTestId('filter-type'), 'todo_created');
    await waitFor(() =>
      expect(fetchMock.mock.calls.map(([url]) => url)).toContain('/api/logs?limit=100&type=todo_created')
    );
  });

  it('filters by date range on the client', async () => {
    mockFetch({ 'GET /api/logs': () => jsonResponse(logs) });
    renderWithApp(<ActivityLogs />);
    await screen.findByTestId('log-item-old');

    fireEvent.change(screen.getByLabelText('Start Date'), { target: { value: '2026-02-01' } });
    await waitFor(() => expect(screen.queryByTestId('log-item-old')).toBeNull());
    expect(screen.getByTestId('log-item-new')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Start Date'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('End Date'), { target: { value: '2026-02-01' } });
    await waitFor(() => expect(screen.queryByTestId('log-item-new')).toBeNull());
    expect(screen.getByTestId('log-item-old')).toBeInTheDocument();
  });

  it('shows empty state and load errors', async () => {
    mockFetch({ 'GET /api/logs': () => jsonResponse({ error: 'logs down' }, 500) });
    renderWithApp(<ActivityLogs />);
    expect(await screen.findByText('logs down')).toBeInTheDocument();
    expect(screen.getByText('No logs found')).toBeInTheDocument();
  });
});
