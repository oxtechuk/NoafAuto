import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react(), tailwindcss()],
  // Production builds are served by Laravel (Sitekit) under /storefront/.
  base: command === 'build' ? '/storefront/' : '/',
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, 'src') },
  },
  server: {
    // Local dev against Laravel without CORS: /api → the Sitekit backend.
    proxy: { '/api': { target: process.env.SITEKIT_BACKEND_URL ?? 'http://127.0.0.1:8000', changeOrigin: true } },
  },
}))
