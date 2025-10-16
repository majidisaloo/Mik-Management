import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { execSync } from 'node:child_process';

// Get commit count at build time
const commitCount = execSync('git rev-list --count HEAD').toString().trim();

export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  },
  plugins: [react()],
  define: {
    'import.meta.env.VITE_COMMIT_COUNT': JSON.stringify(commitCount)
  }
});
