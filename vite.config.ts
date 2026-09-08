import path from "node:path"
import { fileURLToPath } from "node:url"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { VitePWA } from "vite-plugin-pwa"

const root = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  base: "./",
  preview: { host: true, allowedHosts: true },
  server: { host: true, allowedHosts: true },
  resolve: {
    alias: {
      "@": path.resolve(root, "src"),
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "wedding-washi.png", "desk-mascot.png", "icons/apple-touch-icon.png"],
      manifest: {
        name: "ふたりの未来帖",
        short_name: "未来帖",
        description: "広島市向け結婚ロードマップ／ふたりの未来帖。端末内に保存。",
        theme_color: "#183645",
        background_color: "#f6f4ee",
        display: "standalone",
        orientation: "portrait",
        lang: "ja",
        start_url: "./",
        scope: "./",
        icons: [
          { src: "icons/pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/pwa-512.png", sizes: "512x512", type: "image/png" },
          { src: "icons/pwa-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webp,json,woff2}"],
        navigateFallback: "index.html",
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
      devOptions: { enabled: false },
    }),
  ],
})
