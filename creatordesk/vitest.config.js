import { defineConfig } from 'vitest/config';

// Self-contained config so vitest never walks up to the iConnect root config.
export default defineConfig({
  test: {
    include: ['test/**/*.test.js'],
    environment: 'node',
    testTimeout: 15000,
  },
});
