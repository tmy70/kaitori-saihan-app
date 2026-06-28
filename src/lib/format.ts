// 表示用フォーマッタ

/** 3桁カンマ区切り（万円の数値）。小数があれば最大1桁表示 */
export function fmtMan(n: number | undefined | null): string {
  if (n == null || !Number.isFinite(n)) return "0";
  const rounded = Math.round(n * 10) / 10;
  return rounded.toLocaleString("ja-JP", { maximumFractionDigits: 1 });
}

/** 円表示（万円 → 円。3桁カンマ） */
export function manToYen(man: number): number {
  return Math.round((Number.isFinite(man) ? man : 0) * 10000);
}

export function fmtYen(yen: number): string {
  if (!Number.isFinite(yen)) return "0";
  return Math.round(yen).toLocaleString("ja-JP");
}

/** 万円→円表記の文字列（例: 1,680万円 → 16,800,000円） */
export function fmtManAsYen(man: number): string {
  return fmtYen(manToYen(man)) + "円";
}

/** 面積など一般数値（最大2桁小数・3桁カンマ）。0・未入力は空文字 */
export function fmtArea(n: number | undefined | null): string {
  if (n == null || !Number.isFinite(n) || n === 0) return "";
  return n.toLocaleString("ja-JP", { maximumFractionDigits: 2 });
}

/** 面積の表示文字列（例: 176.87㎡（53.5坪））。両方無ければ空文字 */
export function areaLabel(sqm?: number, tsubo?: number): string {
  const s = fmtArea(sqm);
  const t = fmtArea(tsubo);
  if (s && t) return `${s}㎡（${t}坪）`;
  if (s) return `${s}㎡`;
  if (t) return `${t}坪`;
  return "";
}

/** 比率(0〜1) → ％文字列 */
export function fmtPct(ratio: number | undefined | null, digits = 1): string {
  if (ratio == null || !Number.isFinite(ratio)) return "0%";
  return (ratio * 100).toFixed(digits) + "%";
}

/** 今日の日付 YYYY-MM-DD */
export function today(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/** 日時の和暦寄り表記（YYYY/MM/DD HH:mm） */
export function fmtDateTime(iso: string | undefined): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "-";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(
    d.getMinutes()
  )}`;
}

/** 簡易ID生成（crypto.randomUUID が無い環境のフォールバック付き） */
export function genId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return "id-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}
