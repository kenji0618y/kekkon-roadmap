import path from "node:path"
import { fileURLToPath } from "node:url"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, type Plugin } from "vite"
import { VitePWA } from "vite-plugin-pwa"

const root = path.dirname(fileURLToPath(import.meta.url))

/**
 * 公開ビルドの index.html に付ける CSP（2026-10-06〜）。アプリが実際に通信する先だけを許す。
 * - api.github.com / gist.githubusercontent.com … 端末どうしの同期（src/lib/gist-sync.ts）
 * - script.google.com / script.googleusercontent.com … LINE 通知の中継（Apps Script は googleusercontent へ転送する）
 * - api.x.ai … Amityちゃんの調べもの（src/lib/amity-grok.ts の初期値。ほかの URL に変えると通信できない）
 * - fonts.googleapis.com / fonts.gstatic.com … 文字（index.html）
 * - frame-src calendar.google.com / www.google.com … カレンダータブに Google カレンダー（ファミリー）を埋め込む予定（iframe）。埋め込み以外の外部フレームは不可
 * 同じ kenji0618y.github.io にある別のページのスクリプトからは守れない（CSP はこのページ自身が読むものを絞るだけ）。
 * dev サーバーは React の更新用にインラインのスクリプトを使うので、ビルドのときだけ付ける。
 * 解錠ページ（scripts/site-lock/unlock.html）には別の CSP がある。
 */
const APP_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob:",
  "media-src 'self' blob:",
  "connect-src 'self' https://api.github.com https://gist.githubusercontent.com https://script.google.com https://script.googleusercontent.com https://api.x.ai",
  "frame-src https://calendar.google.com https://www.google.com",
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ")

function cspMeta(): Plugin {
  return {
    name: "kekkon-csp-meta",
    apply: "build",
    transformIndexHtml: () => [
      { tag: "meta", attrs: { "http-equiv": "Content-Security-Policy", content: APP_CSP }, injectTo: "head-prepend" },
    ],
  }
}

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
    cspMeta(),
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "wedding-washi.png", "desk-mascot.png", "amity-shark.png", "icons/apple-touch-icon.png", "icons/pwa-maskable-512.png"],
      manifest: {
        // ホーム画面の名前（2026-10-07〜「Amityちゃん」。前は「結婚ロードマップ」）。チャットの機能名「Amityちゃんにきく」はそのまま。
        name: "Amityちゃん",
        short_name: "Amityちゃん",
        description: "Amityちゃん：広島市・式なし・共働き向けの結婚の手続きガイド。手続きと除外。結婚新生活支援は未導入。",
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
          { src: "icons/pwa-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
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
