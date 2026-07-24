import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: process.env.VERCEL
      ? 'dist'
      : path.resolve(__dirname, '../backend/static'),
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      '/flights': 'http://localhost:8000',
      '/data':    'http://localhost:8000',
    },
  },
})
