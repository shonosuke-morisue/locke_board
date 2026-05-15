import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Viteの設定
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // 開発時: Socket.ioのリクエストをバックエンドサーバーにプロキシ
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true,
      },
    },
  },
});
