import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// In development the panel and the API share one address through this proxy, so the sign-in cookie
// works without HTTPS. Start the API with `npm run dev` in Maalbaan Project/server (port 8787).
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { '/v1': 'http://localhost:8787' } },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});
