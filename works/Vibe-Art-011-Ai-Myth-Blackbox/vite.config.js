import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    port: 5173,
    open: true,
    proxy: {
      // ローカルAPIプロキシ（同一オリジン化）
      '/api': 'http://localhost:8787'
    }
  },
  preview: {
    port: 8080
  }
})
