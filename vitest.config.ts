import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '*.config.ts',
        '*.config.js',
      ],
    },
  },
  resolve: {
    alias: {
      // FIX: Cannot find name '__dirname'.
      // FIX: Property 'cwd' does not exist on type 'Process'. Replaced process.cwd() with path.resolve() which returns the CWD.
      '@': path.resolve(),
    },
  },
});