import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, import.meta.dirname, '');
  const disableHmr = (process.env.DISABLE_HMR ?? env.DISABLE_HMR) === 'true';
  return {
    plugins: [
      react(),
      tailwindcss(),
    ],
    resolve: {
      dedupe: ['react', 'react-dom'],
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    server: {
      // Middleware development shares Express's HTTP server for WebSocket upgrades.
      // Keep explicit opt-out for environments without live file watching.
      hmr: !disableHmr,
      watch: disableHmr ? null : {},
    },
  };
});
