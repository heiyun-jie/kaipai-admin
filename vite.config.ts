import path from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '');
  const proxyTarget = env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:8010';
  const proxyHost = env.VITE_API_PROXY_HOST || '';
  const apiProxy = {
    '/api': {
      target: proxyTarget,
      changeOrigin: !proxyHost,
      secure: false,
      headers: proxyHost ? { Host: proxyHost } : undefined,
    },
  };

  return {
    plugins: [vue()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    server: {
      port: 5100,
      strictPort: true,
      host: '0.0.0.0',
      proxy: apiProxy,
    },
    preview: {
      port: 5100,
      strictPort: true,
      host: '127.0.0.1',
      proxy: apiProxy,
    },
  };
});
