import type { MetadataRoute } from "next";

// PWA マニフェスト（静的書き出し対応・basePath を考慮）
const BP = process.env.NEXT_PUBLIC_BASE_PATH || "";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "買取再販 計算・稟議アプリ",
    short_name: "買取再販",
    description: "不動産買取再販の収支計算・稟議書・事業計画書を作成",
    start_url: `${BP}/`,
    scope: `${BP}/`,
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a1c31",
    theme_color: "#1e4d8c",
    lang: "ja",
    icons: [
      { src: `${BP}/icons/icon-192.png`, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: `${BP}/icons/icon-512.png`, sizes: "512x512", type: "image/png", purpose: "any" },
      { src: `${BP}/icons/icon-512.png`, sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
