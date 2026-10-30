import type { Config } from "tailwindcss";

// 配色はニュートラル（グレー）を基調に、強調は1色だけ使う。
// 色数を絞り、面の明暗と余白で情報を整理する。
const config: Config = {
  darkMode: "class",
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // CSS変数経由でテーマ切替（globals.css で定義）
        bg: "rgb(var(--bg) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        "surface-2": "rgb(var(--surface-2) / <alpha-value>)",
        border: "rgb(var(--border) / <alpha-value>)",
        "border-strong": "rgb(var(--border-strong) / <alpha-value>)",
        fg: "rgb(var(--fg) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        faint: "rgb(var(--faint) / <alpha-value>)",
        // 強調色（インディゴ）。重要な操作と選択状態だけに使う
        brand: {
          50: "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
          900: "#312e81",
        },
        // 利益の良し悪しを示す色
        good: { 500: "#10b981", 600: "#059669" },
        warn: { 500: "#f59e0b", 600: "#d97706" },
        bad: { 500: "#ef4444", 600: "#dc2626" },
      },
      borderRadius: {
        lg: "0.625rem",
        xl: "0.875rem",
        "2xl": "1.125rem",
        "3xl": "1.5rem",
      },
      boxShadow: {
        // 影は最小限。面の区切りは境界線で行う
        card: "0 1px 2px rgb(0 0 0 / 0.03)",
        pop: "0 8px 30px rgb(0 0 0 / 0.10)",
        focus: "0 0 0 3px rgb(99 102 241 / 0.25)",
      },
      fontFamily: {
        sans: ['"Noto Sans JP"', "system-ui", "sans-serif"],
      },
      fontSize: {
        // 数字を大きく見せるための段階
        "num-sm": ["1.125rem", { lineHeight: "1.2", fontWeight: "700" }],
        "num": ["1.75rem", { lineHeight: "1.15", fontWeight: "700" }],
        "num-lg": ["2.25rem", { lineHeight: "1.1", fontWeight: "700" }],
      },
    },
  },
  plugins: [],
};

export default config;
