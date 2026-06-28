// ============================================================
// 計算ロジック（仕様書のロジックを厳守。単位：万円）
//
//   売上原価 = 取得原価 + 経費
//   粗利益   = 販売価格 - 売上原価
//   粗利率   = 粗利益 ÷ 販売価格
//   営業利益 = 粗利益 - 販売経費
//   営業利益率 = 営業利益 ÷ 販売価格
// ============================================================
import { CalcInput, CalcResult, Lot } from "./types";

/** ItemValues の合計（NaN/未入力は0扱い） */
export function sumItems(values: Record<string, number> | undefined): number {
  if (!values) return 0;
  return Object.values(values).reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0);
}

/** 計算書の全項目を算出する純粋関数 */
export function calculate(input: CalcInput): CalcResult {
  const acquisitionCost = sumItems(input.acquisition);
  const expensesTotal = sumItems(input.expenses);
  const costOfSales = acquisitionCost + expensesTotal;

  const sellPrice = Number.isFinite(input.sellPrice) ? input.sellPrice : 0;
  const grossProfit = sellPrice - costOfSales;
  const grossMargin = sellPrice > 0 ? grossProfit / sellPrice : 0;

  const sellingExpenses = sumItems(input.selling);
  const operatingProfit = grossProfit - sellingExpenses;
  const operatingMargin = sellPrice > 0 ? operatingProfit / sellPrice : 0;

  return {
    acquisitionCost,
    expensesTotal,
    costOfSales,
    grossProfit,
    grossMargin,
    sellingExpenses,
    operatingProfit,
    operatingMargin,
  };
}

// ---------------- 補助計算 ----------------

/** 仲介手数料 = 価格×3% + 6万円（万円単位） */
export function calcBrokerage(price: number): number {
  if (!Number.isFinite(price) || price <= 0) return 0;
  return round2(price * 0.03 + 6);
}

/**
 * 不動産取得税 = 土地評価額×1.5% + 建物評価額×3%（万円単位）
 */
export function calcAcquisitionTax(landValue: number, buildingValue: number): number {
  const l = Number.isFinite(landValue) ? landValue : 0;
  const b = Number.isFinite(buildingValue) ? buildingValue : 0;
  return round2(l * 0.015 + b * 0.03);
}

/** 固都税精算金 = 年額 × 日数 / 365（万円単位・日割り） */
export function calcTaxProration(annual: number, days: number): number {
  const a = Number.isFinite(annual) ? annual : 0;
  const d = Number.isFinite(days) ? days : 0;
  return round2((a * d) / 365);
}

/** 小数第2位で丸め（万円表示の都合） */
export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ---------------- 坪単価 ----------------

/** 1坪 = 約3.305785㎡（㎡→坪は ×0.3025） */
export const SQM_TO_TSUBO = 0.3025;

/** 面積（㎡）→ 坪数（小数第2位で丸め） */
export function sqmToTsubo(sqm: number | undefined): number {
  if (!Number.isFinite(sqm as number) || (sqm ?? 0) <= 0) return 0;
  return round2((sqm as number) * SQM_TO_TSUBO);
}

/**
 * 坪単価（万円/坪）を求める。
 * 販売価格（万円）÷ 坪数。坪数が無ければ 0 を返す。
 */
export function tsuboUnitPrice(sellPrice: number, tsubo: number | undefined): number {
  const t = Number.isFinite(tsubo as number) ? (tsubo as number) : 0;
  if (t <= 0 || !Number.isFinite(sellPrice)) return 0;
  return round2(sellPrice / t);
}

/** 物件タイプが坪単価表示の対象か（土地・マンション） */
export function usesTsuboPrice(type: string): boolean {
  return type === "land" || type === "mansion";
}

// ---------------- 分譲地（区画分譲） ----------------

/** 1区画の販売価格（万円）＝ 坪数 × 坪単価 */
export function lotPrice(lot: Lot): number {
  const t = Number.isFinite(lot.tsubo as number) ? (lot.tsubo as number) : 0;
  const u = Number.isFinite(lot.unitPrice as number) ? (lot.unitPrice as number) : 0;
  return round2(t * u);
}

/** 全区画の総販売価格（万円） */
export function sumLotsPrice(lots: Lot[] | undefined): number {
  if (!lots || lots.length === 0) return 0;
  return round2(lots.reduce((a, l) => a + lotPrice(l), 0));
}

/** 全区画の合計坪数 */
export function sumLotsTsubo(lots: Lot[] | undefined): number {
  if (!lots || lots.length === 0) return 0;
  return round2(lots.reduce((a, l) => a + (Number.isFinite(l.tsubo as number) ? (l.tsubo as number) : 0), 0));
}

/** 全区画の合計面積（㎡） */
export function sumLotsArea(lots: Lot[] | undefined): number {
  if (!lots || lots.length === 0) return 0;
  return round2(lots.reduce((a, l) => a + (Number.isFinite(l.areaSqm as number) ? (l.areaSqm as number) : 0), 0));
}

/** 全区画の平均坪単価（万円/坪）＝ 総販売価格 ÷ 合計坪数 */
export function avgLotUnitPrice(lots: Lot[] | undefined): number {
  const t = sumLotsTsubo(lots);
  if (t <= 0) return 0;
  return round2(sumLotsPrice(lots) / t);
}

// ---------------- 連結利益（自社グループ仲介） ----------------

/**
 * 自社グループが販売仲介する場合の「受取仲介手数料（税抜・万円）」。
 * 反響→決済を自社グループで完結させる場合、外部に支払う仲介手数料が発生しない一方、
 * 買主側等から仲介手数料を受け取れるため、連結（グループ合算）の利益に加算する。
 * 標準式（価格×3%＋6万円）を税抜の受取額とみなす。groupBrokerage が false なら 0。
 */
export function receivedBrokerage(input: CalcInput): number {
  if (!input.groupBrokerage) return 0;
  return calcBrokerage(input.sellPrice);
}

/**
 * 連結粗利（万円）＝ 営業利益 ＋ 受取仲介手数料（税抜）。
 * 自社グループ仲介でない場合は営業利益と同額。
 */
export function consolidatedProfit(result: CalcResult, input: CalcInput): number {
  return round2(result.operatingProfit + receivedBrokerage(input));
}

// ---------------- 利益判定（バッジ表示用） ----------------

export type ProfitJudge = "good" | "warn" | "bad";

/**
 * 営業利益・粗利の健全性を3段階で判定。
 * 基準（仕様: チェックリスト10）: 粗利益250万以上 もしくは 粗利率30%以上 を満たせば good。
 * 営業利益がマイナスなら bad。
 */
export function judgeProfit(result: CalcResult): ProfitJudge {
  if (result.operatingProfit <= 0) return "bad";
  const meetsTarget = result.grossProfit >= 250 || result.grossMargin >= 0.3;
  if (meetsTarget && result.operatingProfit > 0) return "good";
  return "warn";
}

/**
 * 損益分岐となる販売価格を求める。
 * 営業利益 = 販売価格 - 売上原価 - 販売経費。
 * 販売経費のうち仲介手数料は価格連動(3%)・消費税不足分等は固定とみなして近似する。
 *
 * ここでは「仲介手数料を価格×3%+6万」とし、それ以外の販売経費は固定として、
 * 営業利益=0 となる販売価格を解く:
 *   P - C - (0.03P + 6 + otherSelling) = 0
 *   P(1 - 0.03) = C + 6 + otherSelling
 *   P = (C + 6 + otherSelling) / 0.97
 * targetMargin を与えると、その営業利益率を満たす価格を返す。
 */
export function breakEvenPrice(
  costOfSales: number,
  brokerageFixed: number,
  otherSelling: number,
  targetMargin = 0
): number {
  // 営業利益率 m を満たす: P - C - (0.03P + 6 + other) = m*P
  //  P(0.97 - m) = C + 6 + other
  const denom = 0.97 - targetMargin;
  if (denom <= 0) return Infinity;
  return round2((costOfSales + 6 + otherSelling) / denom);
}
