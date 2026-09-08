import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { VitePWA } from "vite-plugin-pwa"

export default defineConfig({
  base: "./",
  preview: { host: true, allowedHosts: true },
  server: { host: true, allowedHosts: true },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "icons.svg", "icons/apple-touch-icon.png"],
      manifest: {
        name: "結婚ロードマップ",
        short_name: "結婚RM",
        description:
          "広島市・共働き800万超・式なしLean向け結婚手続きスタンプラリー。結婚新生活は賞品に出さない。",
        theme_color: "#f6f0e6",
        background_color: "#f6f0e6",
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
      },
      devOptions: { enabled: false },
    }),
  ],
})
