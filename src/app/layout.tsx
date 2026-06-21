import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeInit } from "@/components/ThemeInit";
import { BottomNav } from "@/components/BottomNav";

export const metadata: Metadata = {
  title: "買取再販 計算・稟議アプリ",
  description: "不動産買取再販の収支計算・稟議書・事業計画書を一気通貫で作成",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "買取再販" },
};

export const viewport: Viewport = {
  themeColor: "#1e4d8c",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        {/* フォント: Noto Sans JP（PDFと画面で統一） */}
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen font-sans antialiased">
        <ThemeInit />
        <div className="mx-auto w-full max-w-3xl pb-24">{children}</div>
        <BottomNav />
      </body>
    </html>
  );
}
