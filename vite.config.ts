import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        // Proxy API requests to backend (security: no API keys in frontend)
        proxy: {
          '/api': {
            target: env.VITE_API_URL || 'http://localhost:8000',
            changeOrigin: true,
            secure: false,
          },
        },
      },
      plugins: [react()],
      // NOTE: API keys have been removed from frontend for security.
      // All API calls now go through the backend proxy.
      // See: backend/src/routes/llm.routes.ts
      define: {
        'process.env.NODE_ENV': JSON.stringify(mode),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        sourcemap: mode === 'development',
        rollupOptions: {
          output: {
            manualChunks: {
              vendor: ['react', 'react-dom'],
              state: ['zustand', '@tanstack/react-query'],
            },
          },
        },
      },
    };
});
