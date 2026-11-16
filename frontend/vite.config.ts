import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': new URL('./src', import.meta.url).pathname,
    },
  },
  server: {
    host: '0.0.0.0',
    // Gambar `/uploads/...` dari BFF tampil di editor Quill saat pengembangan.
    proxy: {
      '/uploads': 'http://localhost:4000',
    },
  },
})
