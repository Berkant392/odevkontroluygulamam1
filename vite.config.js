import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // 💥 DÜŞMANI İÇERİDEN VURAN KOD: 
      // Bu ayar tarayıcıya girer girmez kendini ve tüm eski önbelleği (cache) yok eder!
      selfDestroying: true, 
      buildBaseUrl: '/'
    })
  ],
})
