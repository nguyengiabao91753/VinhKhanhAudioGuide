import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    allowedHosts: ["pachydermatous-creolized-kareem.ngrok-free.dev"],
  },
  build: {
    rollupOptions: {
      output: {},
    },
    chunkSizeWarningLimit: 2000,
  },
})
