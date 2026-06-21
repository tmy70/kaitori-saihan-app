/** @type {import('next').NextConfig} */
// GitHub Pages 等の静的ホスティング向け：完全な静的サイトとして書き出す。
// プロジェクトのサブパス配信（例 https://user.github.io/<repo>/）に対応するため
// basePath / assetPrefix を環境変数 NEXT_PUBLIC_BASE_PATH から受け取る（ルート配信は空）。
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig = {
  reactStrictMode: true,
  output: "export", // out/ に静的書き出し
  trailingSlash: true, // GitHub Pages で /project/ 等を確実に配信
  images: { unoptimized: true },
  basePath: basePath || undefined,
  assetPrefix: basePath || undefined,
  webpack: (config) => {
    // @react-pdf/renderer が参照する canvas を無効化（PDFはクライアントで生成）
    config.resolve.alias.canvas = false;
    return config;
  },
};

export default nextConfig;
