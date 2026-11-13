import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';


export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiTarget = process.env.API_PROXY_TARGET || env.API_PROXY_TARGET || env.VITE_API_BASE_URL;

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 5173,
      proxy: apiTarget ? {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          secure: apiTarget.startsWith('https://'),
        },
      } : {},
    },
  };
});
