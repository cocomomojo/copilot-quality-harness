/* copilot-generated */

import { describe, expect, test, vi, beforeEach } from 'vitest';
import { formatAccountCreatedDate, fetchUserProfile, isValidDate } from './dateFormatter.js';

describe('dateFormatter utility', () => {
  // UT-001: Date formatting - normal case (ISO 8601 format)
  describe('UT-001: Date formatting - normal case', () => {
    test('formats ISO 8601 date correctly in ja-JP locale', () => {
      const input = {
        createdAt: '2026-10-18T10:00:00Z',
        locale: 'ja-JP'
      };
      const result = formatAccountCreatedDate(input.createdAt, input.locale);
      expect(result.success).toBe(true);
      expect(result.formatted_date).toBe('2026年10月18日');
    });
  });

  // UT-002: Date formatting - different timezone (JST)
  describe('UT-002: Date formatting - different timezone', () => {
    test('formats date correctly with timezone parameter (Asia/Tokyo)', () => {
      const input = {
        createdAt: '2026-10-18T10:00:00Z',
        locale: 'ja-JP',
        timezone: 'Asia/Tokyo'
      };
      const result = formatAccountCreatedDate(input.createdAt, input.locale, input.timezone);
      expect(result.success).toBe(true);
      expect(result.formatted_date).toBe('2026年10月18日');
    });
  });

  // UT-003: Date formatting - English locale
  describe('UT-003: Date formatting - English locale', () => {
    test('formats date correctly in en-US locale', () => {
      const input = {
        createdAt: '2026-10-18T10:00:00Z',
        locale: 'en-US'
      };
      const result = formatAccountCreatedDate(input.createdAt, input.locale);
      expect(result.success).toBe(true);
      expect(result.formatted_date).toBe('October 18, 2026');
    });
  });

  // UT-004: Error handling - null createdAt
  describe('UT-004: Error handling - null createdAt', () => {
    test('returns dash (-) for null createdAt', () => {
      const input = {
        createdAt: null,
        locale: 'ja-JP'
      };
      const result = formatAccountCreatedDate(input.createdAt, input.locale);
      expect(result.success).toBe(true);
      expect(result.formatted_date).toBe('-');
    });
  });

  // UT-005: Error handling - undefined createdAt
  describe('UT-005: Error handling - undefined createdAt', () => {
    test('returns 未設定 for undefined createdAt', () => {
      const input = {
        createdAt: undefined,
        locale: 'ja-JP'
      };
      const result = formatAccountCreatedDate(input.createdAt, input.locale);
      expect(result.success).toBe(true);
      expect(result.formatted_date).toBe('未設定');
    });
  });

  // UT-006: Error handling - invalid date format
  describe('UT-006: Error handling - invalid date format', () => {
    test('returns dash (-) for invalid date string', () => {
      const input = {
        createdAt: 'invalid-date-string',
        locale: 'ja-JP'
      };
      const result = formatAccountCreatedDate(input.createdAt, input.locale);
      expect(result.success).toBe(true);
      expect(result.formatted_date).toBe('-');
    });
  });

  // UT-007: Error handling - empty string
  describe('UT-007: Error handling - empty string', () => {
    test('returns 未設定 for empty string', () => {
      const input = {
        createdAt: '',
        locale: 'ja-JP'
      };
      const result = formatAccountCreatedDate(input.createdAt, input.locale);
      expect(result.success).toBe(true);
      expect(result.formatted_date).toBe('未設定');
    });
  });

  // UT-008: User profile fetch - normal case
  describe('UT-008: User profile fetch - normal case', () => {
    test('fetches user profile with createdAt successfully', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'user-123',
          email: 'testuser@example.com',
          created_at: '2026-10-18T10:00:00Z'
        })
      });

      const result = await fetchUserProfile();
      expect(result.success).toBe(true);
      expect(result.user_id).toBe('user-123');
      expect(result.email).toBe('testuser@example.com');
      expect(result.created_at).toBe('2026-10-18T10:00:00Z');
    });
  });

  // UT-009: User profile fetch - no createdAt (legacy)
  describe('UT-009: User profile fetch - no createdAt (legacy)', () => {
    test('fetches user profile without createdAt', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'user-456',
          email: 'legacyuser@example.com',
          created_at: null
        })
      });

      const result = await fetchUserProfile();
      expect(result.success).toBe(true);
      expect(result.user_id).toBe('user-456');
      expect(result.email).toBe('legacyuser@example.com');
      expect(result.created_at).toBe(null);
    });
  });

  // UT-010: User profile fetch - API error
  describe('UT-010: User profile fetch - API error', () => {
    test('returns error when API returns 500', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({
          error: 'Internal Server Error',
          message: 'Failed to fetch user profile'
        })
      });

      const result = await fetchUserProfile();
      expect(result.success).toBe(false);
      expect(result.error_code).toBe('FETCH_USER_FAILED');
      expect(result.error_message).toBe('ユーザープロフィール取得に失敗しました');
    });

    test('returns error when fetch throws exception', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await fetchUserProfile();
      expect(result.success).toBe(false);
      expect(result.error_code).toBe('FETCH_USER_FAILED');
      expect(result.error_message).toBe('ユーザープロフィール取得に失敗しました');
    });
  });

  // Additional validation tests
  describe('isValidDate', () => {
    test('returns true for valid ISO 8601 date', () => {
      expect(isValidDate('2026-10-18T10:00:00Z')).toBe(true);
    });

    test('returns false for invalid date string', () => {
      expect(isValidDate('invalid-date')).toBe(false);
    });

    test('returns false for null', () => {
      expect(isValidDate(null)).toBe(false);
    });

    test('returns false for undefined', () => {
      expect(isValidDate(undefined)).toBe(false);
    });

    test('returns false for empty string', () => {
      expect(isValidDate('')).toBe(false);
    });
  });
});
