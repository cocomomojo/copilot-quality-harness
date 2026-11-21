import { describe, expect, test } from 'vitest';
import { validatePassword } from '../../utils/validators.js';

describe('validatePassword', () => {
  test('accepts a strong password', () => {
    expect(validatePassword('Password123')).toEqual({ valid: true });
  });

  test.each([
    ['Pa1', 'Password must be at least 8 characters long'],
    ['password123', 'Password must contain at least one uppercase letter'],
    ['PASSWORD123', 'Password must contain at least one lowercase letter'],
    ['Passwordxx', 'Password must contain at least one number'],
  ])('rejects %s', (password, error) => {
    expect(validatePassword(password)).toEqual({ valid: false, error });
  });
});
