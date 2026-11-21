const UPDATABLE_FIELDS = ['title', 'description', 'priority'];

function resolveStatus({ status, completed }) {
  // `completed` (boolean) is kept for test compatibility and takes precedence over `status`.
  if (completed !== undefined) return completed ? 'completed' : 'pending';
  return status;
}

export function buildTodoUpdate(existing, changes, now = new Date().toISOString()) {
  const assignments = ['updatedAt = :now'];
  const values = { ':now': now };
  const names = {};

  for (const field of UPDATABLE_FIELDS) {
    if (changes[field] !== undefined) {
      assignments.push(`${field} = :${field}`);
      values[`:${field}`] = changes[field];
    }
  }

  const status = resolveStatus(changes);
  if (status !== undefined) {
    assignments.push('#status = :status');
    values[':status'] = status;
    names['#status'] = 'status';

    if (status === 'completed' && existing.status !== 'completed') {
      assignments.push('completedAt = :completedAt');
      values[':completedAt'] = now;
    }
  }

  return { updateExpression: `SET ${assignments.join(', ')}`, values, names };
}
