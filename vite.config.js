import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // El FBX pesa varios MB; evitamos el warning de tamaño de chunk
  build: { chunkSizeWarningLimit: 1500 },
})
