import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./vitest.setup.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'json', 'html'],
      include: ['src/**/*.js'],
      exclude: ['src/**/*.test.js', 'src/**/*.spec.js', 'src/tests/**'],
    },
  },
});
