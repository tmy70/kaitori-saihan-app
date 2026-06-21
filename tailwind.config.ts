import type { Config } from "tailwindcss";

// 不動産・金融向けの落ち着いた上品な配色。ダーク/ライト対応。
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
        fg: "rgb(var(--fg) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        // ブランド: 深い藍（信頼感）＋ 真鍮ゴールド（アクセント）
        brand: {
          50: "#eef4fb",
          100: "#d6e4f4",
          500: "#1e4d8c",
          600: "#173e72",
          700: "#122f57",
          800: "#0e2643",
          900: "#0a1c31",
        },
        accent: {
          400: "#d6b572",
          500: "#c79f4f",
          600: "#a8843b",
        },
      },
      borderRadius: {
        xl: "0.9rem",
        "2xl": "1.25rem",
      },
      boxShadow: {
        card: "0 1px 2px rgb(0 0 0 / 0.04), 0 4px 16px rgb(0 0 0 / 0.06)",
      },
      fontFamily: {
        sans: ['"Noto Sans JP"', "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
