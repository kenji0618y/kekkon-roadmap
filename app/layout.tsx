import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "ふたりの未来帖 | 広島市の結婚ロードマップ", description: "制度を確かめ、二人で一歩ずつ。広島市で新生活を始める二人の、すごろく手帳。", icons: {icon:"/favicon.svg"} };
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="ja"><head><meta name="codex-preview" content="development"/><link rel="preconnect" href="https://fonts.googleapis.com"/><link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/><link href="https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@500;600;700;800&family=Zen+Kaku+Gothic+New:wght@400;500;700&display=swap" rel="stylesheet"/></head><body>{children}</body></html>}
