import { describe, expect, test } from 'vitest';
import { buildTodoUpdate } from '../../utils/todoUpdate.js';

const NOW = '2026-01-01T00:00:00.000Z';

describe('buildTodoUpdate', () => {
  test('always updates updatedAt', () => {
    expect(buildTodoUpdate({ status: 'pending' }, {}, NOW)).toEqual({
      updateExpression: 'SET updatedAt = :now',
      values: { ':now': NOW },
      names: {},
    });
  });

  test('includes provided fields only', () => {
    const { updateExpression, values } = buildTodoUpdate({ status: 'pending' }, { title: 'T', priority: 'high' }, NOW);
    expect(updateExpression).toBe('SET updatedAt = :now, title = :title, priority = :priority');
    expect(values).toEqual({ ':now': NOW, ':title': 'T', ':priority': 'high' });
  });

  test('sets completedAt when transitioning to completed', () => {
    const result = buildTodoUpdate({ status: 'pending' }, { status: 'completed' }, NOW);
    expect(result.updateExpression).toBe('SET updatedAt = :now, #status = :status, completedAt = :completedAt');
    expect(result.values).toMatchObject({ ':status': 'completed', ':completedAt': NOW });
    expect(result.names).toEqual({ '#status': 'status' });
  });

  test('does not reset completedAt when already completed', () => {
    const result = buildTodoUpdate({ status: 'completed' }, { status: 'completed' }, NOW);
    expect(result.updateExpression).toBe('SET updatedAt = :now, #status = :status');
  });

  test('maps completed boolean to status', () => {
    expect(buildTodoUpdate({ status: 'pending' }, { completed: true }, NOW).values[':status']).toBe('completed');
    expect(buildTodoUpdate({ status: 'completed' }, { completed: false }, NOW).values[':status']).toBe('pending');
  });

  test('completed boolean takes precedence over status without duplicating the path', () => {
    const result = buildTodoUpdate({ status: 'pending' }, { status: 'in_progress', completed: true }, NOW);
    expect(result.updateExpression).toBe('SET updatedAt = :now, #status = :status, completedAt = :completedAt');
    expect(result.values[':status']).toBe('completed');
  });
});
