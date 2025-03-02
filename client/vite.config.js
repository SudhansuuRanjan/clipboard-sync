import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // add this to cache all the imports
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ["**/*"],
      },
      includeAssets: [
        "**/*",
      ],
      manifest: {
        "name": "ClipSync",
        "short_name": "ClipSync",
        "description": "A web app for syncing clipboard across devices.",
        "icons": [
          {
            "src": "\/favicon/favicon-96x96.png",
            "sizes": "96x96",
            "type": "image/png",
            "purpose": "any"
          },
          {
            "src": "\/favicon/web-app-manifest-192x192.png",
            "sizes": "192x192",
            "type": "image/png",
            "purpose": "any"
          },
          {
            "src": "\/favicon/web-app-manifest-512x512.png",
            "sizes": "512x512",
            "type": "image/png",
            "purpose": "maskable"
          }
        ],
        "start_url": "/",
        "id": "/",
        "display": "standalone",
        "theme_color": "#00BFFF",
        "background_color": "#000000",
        "orientation": "portrait",
        "prefer_related_applications": true
      }
    })
  ],
})