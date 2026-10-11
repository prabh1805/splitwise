import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// Each backend service runs on its own port and none of them set CORS headers,
// so the dev server proxies every API path to the service that owns it.
const USER_GROUP = 'http://localhost:8082'
const EXPENSE = 'http://localhost:8080'
const BALANCE = 'http://localhost:8081'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api/v1/auth': USER_GROUP,
      '/api/v1/users': USER_GROUP,
      '/api/v1/groups': USER_GROUP,
      '/api/v1/friends': USER_GROUP,
      '/api/v1/expenses': EXPENSE,
      '/api/v1/balances': BALANCE,
      '/api/v1/settlements': BALANCE,
    },
  },
})
