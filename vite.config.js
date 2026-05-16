import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        cleanupOutdatedCaches: true, // Eski çöp önbellekleri zorla siler
        skipWaiting: true,           // Yeni güncelleme gelince bekletmeden kurar
        clientsClaim: true,          // Sayfayı yenilemeye gerek kalmadan kontrolü ele alır
      },
      devOptions: {
        enabled: true 
      },
      manifest: {
        name: 'Berkant Hoca LMS',
        short_name: 'BerkantHoca',
        description: 'Eğitim Yönetim ve Ödev Takip Sistemi',
        theme_color: '#4f46e5',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'https://cdn-icons-png.flaticon.com/512/3135/3135810.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
})
