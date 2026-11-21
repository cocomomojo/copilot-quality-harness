import { afterEach, describe, expect, it } from 'vitest';
import { clearAuth, getAuthToken, getStoredUser, saveAuth } from './authStorage.js';

describe('authStorage', () => {
  afterEach(() => localStorage.clear());

  it('saves and reads token and user', () => {
    saveAuth({ token: 'abc', email: 'a@example.com' });
    expect(getAuthToken()).toBe('abc');
    expect(getStoredUser()).toEqual({ token: 'abc', email: 'a@example.com' });
  });

  it('returns empty user when nothing is stored', () => {
    expect(getAuthToken()).toBeNull();
    expect(getStoredUser()).toEqual({});
  });

  it('clears stored auth', () => {
    saveAuth({ token: 'abc' });
    clearAuth();
    expect(getAuthToken()).toBeNull();
    expect(getStoredUser()).toEqual({});
  });
});
