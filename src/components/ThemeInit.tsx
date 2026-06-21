"use client";
// テーマ（ダーク/ライト）の適用 + Service Worker登録
import { useEffect } from "react";
import { asset } from "@/lib/basePath";

export function ThemeInit() {
  useEffect(() => {
    // テーマ復元（localStorageに保存。OS設定もフォールバック）
    try {
      const saved = localStorage.getItem("theme");
      const prefersDark =
        window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
      const theme = saved ?? (prefersDark ? "dark" : "light");
      document.documentElement.classList.toggle("dark", theme === "dark");
    } catch {}

    // Service Worker 登録（PWA / オフライン）
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register(asset("/sw.js")).catch(() => {});
    }
  }, []);
  return null;
}

/** テーマ切替（どこからでも呼べる） */
export function toggleTheme() {
  const isDark = document.documentElement.classList.toggle("dark");
  try {
    localStorage.setItem("theme", isDark ? "dark" : "light");
  } catch {}
  return isDark;
}
