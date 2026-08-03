import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@env': fileURLToPath(new URL('./src/environments', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    isolate: true,
    testTimeout: 2000,
    hookTimeout: 2000,
    setupFiles: ['./src/test-setup.ts'],
    browser: {
      screenshotFailures: false,
    },
  },
});
