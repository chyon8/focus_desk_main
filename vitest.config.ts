import path from 'path';
import { defineConfig } from 'vitest/config';

/**
 * Tests run in plain node, without the electron plugin from vite.config.ts —
 * its renderer half aliases `node:fs` to a browser shim, which the main
 * process tests need to be the real thing.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
