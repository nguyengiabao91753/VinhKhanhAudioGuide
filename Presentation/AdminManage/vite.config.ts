import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    dedupe: ['react', 'react-dom'],
  },

  server: {
    host: true,          // cho phép truy cập từ ngoài (ngrok)
    port: 5173,          // fix cứng port
    strictPort: true,    // nếu port bị chiếm → báo lỗi (không auto nhảy)
    allowedHosts: 'all', // tránh bị block khi dùng ngrok domain
  }
})