import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // на GitHub Pages сайт живёт в подпапке /<имя-репозитория>/
  base: process.env.VITE_BASE ?? '/',
  plugins: [react(), tailwindcss()],
})
