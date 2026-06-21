// 配信ベースパス（GitHub Pages のサブパス配信に対応）。
// next.config の basePath と同じ値。NEXT_PUBLIC_ なのでクライアントでも参照可。
export const BP = process.env.NEXT_PUBLIC_BASE_PATH || "";

/** public/ 配下の静的アセットへのパスに basePath を付与する */
export function asset(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${BP}${p}`;
}
