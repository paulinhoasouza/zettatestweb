import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        // bibliotecas em pacotes próprios: mudam pouco e ficam em cache entre versões do app
        manualChunks: { supabase: ['@supabase/supabase-js'], react: ['react', 'react-dom'] },
      },
    },
  },
})
