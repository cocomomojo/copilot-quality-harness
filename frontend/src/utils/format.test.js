import { describe, expect, it } from 'vitest';
import { formatFileSize } from './format.js';

describe('formatFileSize', () => {
  it.each([
    [0, '0 B'],
    [undefined, '0 B'],
    [512, '512 B'],
    [1024, '1 KB'],
    [1536, '1.5 KB'],
    [1048576, '1 MB'],
    [5 * 1024 ** 3, '5 GB'],
    [2 * 1024 ** 4, '2048 GB'],
  ])('formats %s as %s', (bytes, expected) => {
    expect(formatFileSize(bytes)).toBe(expected);
  });
});
