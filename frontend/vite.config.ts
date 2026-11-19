import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env }
  // Sayt joylashadigan subpath. Lokal ishlab chiqishda "/", serverda "/iqtidorli-talaba/".
  let base = env.VITE_BASE_PATH || '/'
  if (!base.startsWith('/')) base = `/${base}`
  if (!base.endsWith('/')) base = `${base}/`

  return {
    base,
    plugins: [react()],
    server: {
      proxy: {
        '/api': 'http://localhost:8000',
        '/static': 'http://localhost:8000',
      },
    },
  }
})
