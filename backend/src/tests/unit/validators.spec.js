/* copilot-generated */

import { describe, expect, test } from 'vitest';
import { isValidURL } from '../../utils/validators.js';

describe('URL Validator', () => {
  // UT-001: 正常系 - HTTPS URL（GitHub リポジトリ）
  test('UT-001: Valid HTTPS URL (GitHub repository)', () => {
    const result = isValidURL('https://github.com/cocomomojo/copilot-quality-harness');
    expect(result).toEqual({ valid: true });
  });

  // UT-002: 正常系 - HTTP URL（シンプルなドメイン）
  test('UT-002: Valid HTTP URL (simple domain)', () => {
    const result = isValidURL('http://example.com');
    expect(result).toEqual({ valid: true });
  });

  // UT-003: 失敗系 - フォーマット不正（プロトコルなし）
  test('UT-003: Invalid URL - no protocol', () => {
    const result = isValidURL('not-a-valid-url');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Invalid URL format');
  });

  // UT-004: 失敗系 - 空文字列
  test('UT-004: Invalid URL - empty string', () => {
    const result = isValidURL('');
    expect(result).toEqual({ valid: false, error: 'URL cannot be empty' });
  });

  // UT-005: 失敗系 - null 入力
  test('UT-005: Invalid URL - null input', () => {
    const result = isValidURL(null);
    expect(result).toEqual({ valid: false, error: 'URL cannot be empty' });
  });

  // UT-006: 失敗系 - FTP プロトコル（許可されていない）
  test('UT-006: Invalid URL - FTP protocol (not allowed)', () => {
    const result = isValidURL('ftp://files.example.com/file.txt');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Invalid URL format');
  });

  // UT-007: 失敗系 - URL 長が 2048 文字を超過
  test('UT-007: Invalid URL - exceeds 2048 character limit', () => {
    const longUrl = 'https://example.com/' + 'a'.repeat(2050);
    const result = isValidURL(longUrl);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Invalid URL format');
  });

  // Additional test: undefined input
  test('UT-008: Invalid URL - undefined input', () => {
    const result = isValidURL(undefined);
    expect(result).toEqual({ valid: false, error: 'URL cannot be empty' });
  });

  // Additional test: non-string input
  test('UT-009: Invalid URL - non-string input', () => {
    const result = isValidURL(12345);
    expect(result).toEqual({ valid: false, error: 'URL must be a string' });
  });

  // Additional test: HTTPS with path and query
  test('UT-010: Valid HTTPS URL with path and query', () => {
    const result = isValidURL('https://example.com/path?query=value&other=123');
    expect(result).toEqual({ valid: true });
  });

  // Additional test: HTTP with port
  test('UT-011: Valid HTTP URL with port', () => {
    const result = isValidURL('http://localhost:3000/api/health');
    expect(result).toEqual({ valid: true });
  });

  // Additional test: URL with special characters
  test('UT-012: Valid URL with special characters in path', () => {
    const result = isValidURL('https://example.com/path/with-dashes_and_underscores');
    expect(result).toEqual({ valid: true });
  });
});
