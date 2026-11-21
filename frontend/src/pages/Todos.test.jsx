import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Todos from './Todos.jsx';
import { jsonResponse, mockFetch, renderWithApp } from '../test-utils.jsx';

const todo = { todoId: 't1', title: 'Write tests', description: 'cover UI', status: 'pending', priority: 'medium' };

describe('Todos page', () => {
  let todos;
  let fetchMock;

  beforeEach(() => {
    todos = [todo];
    fetchMock = mockFetch({
      'GET /api/todos': () => jsonResponse(todos),
      'POST /api/todos': (url, init) => {
        const body = JSON.parse(init.body);
        todos = [...todos, { todoId: 't2', ...body }];
        return jsonResponse(todos.at(-1), 201);
      },
      'PUT /api/todos/t1': (url, init) => {
        todos = todos.map((t) => (t.todoId === 't1' ? { ...t, ...JSON.parse(init.body) } : t));
        return jsonResponse(todos[0]);
      },
      'DELETE /api/todos/t1': () => {
        todos = todos.filter((t) => t.todoId !== 't1');
        return jsonResponse({}, 200);
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('lists todos', async () => {
    renderWithApp(<Todos />);
    const item = await screen.findByTestId('todo-item-t1');
    expect(within(item).getByText('Write tests')).toBeInTheDocument();
    expect(within(item).getByText('cover UI')).toBeInTheDocument();
  });

  it('creates a todo and ignores blank titles', async () => {
    renderWithApp(<Todos />);
    await screen.findByTestId('todo-item-t1');
    await userEvent.click(screen.getByTestId('todo-create-button'));
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false);

    await userEvent.type(screen.getByTestId('todo-title-input'), 'New task');
    await userEvent.type(screen.getByTestId('todo-description-input'), 'details');
    await userEvent.click(screen.getByTestId('todo-create-button'));

    expect(await screen.findByTestId('todo-item-t2')).toHaveTextContent('New task');
    expect(screen.getByTestId('toast')).toHaveTextContent('TODO created successfully');
    expect(screen.getByTestId('todo-title-input')).toHaveValue('');
  });

  it('updates status from the select', async () => {
    renderWithApp(<Todos />);
    await userEvent.selectOptions(await screen.findByTestId('todo-status-select-t1'), 'completed');
    await waitFor(() => expect(screen.getByTestId('todo-status-select-t1')).toHaveValue('completed'));
    expect(screen.getByTestId('toast')).toHaveTextContent('TODO updated successfully');
  });

  it('deletes a todo after confirmation', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderWithApp(<Todos />);
    await userEvent.click(await screen.findByTestId('todo-delete-button-t1'));
    expect(await screen.findByText('No TODOs found')).toBeInTheDocument();
    expect(screen.getByTestId('toast')).toHaveTextContent('TODO deleted successfully');
  });

  it('keeps the todo when deletion is cancelled', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderWithApp(<Todos />);
    await userEvent.click(await screen.findByTestId('todo-delete-button-t1'));
    expect(screen.getByTestId('todo-item-t1')).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'DELETE')).toBe(false);
  });

  it('passes filters and search to the API', async () => {
    renderWithApp(<Todos />);
    await screen.findByTestId('todo-item-t1');
    await userEvent.selectOptions(screen.getByTestId('filter-status'), 'pending');
    await userEvent.selectOptions(screen.getByTestId('filter-priority'), 'high');
    await userEvent.type(screen.getByTestId('search-input'), 'W');
    await waitFor(() =>
      expect(fetchMock.mock.calls.map(([url]) => url)).toContain('/api/todos?status=pending&priority=high&search=W')
    );
  });

  it('shows an error toast when actions fail', async () => {
    mockFetch({
      'GET /api/todos': () => jsonResponse([todo]),
      'POST /api/todos': () => jsonResponse({ error: 'create failed' }, 400),
      'PUT /api/todos/t1': () => jsonResponse({ error: 'update failed' }, 400),
      'DELETE /api/todos/t1': () => jsonResponse({ error: 'delete failed' }, 500),
    });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderWithApp(<Todos />);

    await userEvent.type(await screen.findByTestId('todo-title-input'), 'x');
    await userEvent.click(screen.getByTestId('todo-create-button'));
    expect(await screen.findByText('create failed')).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByTestId('todo-status-select-t1'), 'completed');
    expect(await screen.findByText('update failed')).toBeInTheDocument();

    await userEvent.click(screen.getByTestId('todo-delete-button-t1'));
    expect(await screen.findByText('delete failed')).toBeInTheDocument();
  });

  it('shows an error toast when loading fails', async () => {
    mockFetch({ 'GET /api/todos': () => jsonResponse({ error: 'load failed' }, 500) });
    renderWithApp(<Todos />);
    expect(await screen.findByText('load failed')).toBeInTheDocument();
    expect(screen.getByText('No TODOs found')).toBeInTheDocument();
  });
});
