// ============================================================
// 計算ロジック（仕様書のロジックを厳守。単位：万円）
//
//   売上原価 = 取得原価 + 経費
//   粗利益   = 販売価格 - 売上原価
//   粗利率   = 粗利益 ÷ 販売価格
//   営業利益 = 粗利益 - 販売経費
//   営業利益率 = 営業利益 ÷ 販売価格
// ============================================================
import { CalcInput, CalcResult } from "./types";

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
