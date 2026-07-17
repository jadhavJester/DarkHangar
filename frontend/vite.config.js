import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Output to 'dist' on Vercel, otherwise to '../backend/static' for the desktop app
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
