import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api/products': {
        target: 'http://localhost:5281',
        changeOrigin: true,
      },
      '/api': {
        target: 'http://localhost:5280',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://localhost:5280',
        changeOrigin: true,
      },
      '/hubs': {
        target: 'http://localhost:5280',
        changeOrigin: true,
        ws: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
