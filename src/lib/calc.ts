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

// ---------------- PDFの費目表示判定 ----------------

/**
 * 費目をPDFに表示するか判定する。
 *  - override が指定されていればそれに従う（true=表示 / false=非表示）
 *  - showAll が true なら金額0でも表示
 *  - それ以外は金額が0・未入力なら非表示
 */
export function itemVisibleInPdf(
  value: number | undefined,
  override: boolean | undefined,
  showAll: boolean
): boolean {
  if (override !== undefined) return override;
  if (showAll) return true;
  return Number.isFinite(value as number) && value !== 0;
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

// ---------------- 買取価格の逆算（査定画面） ----------------
//
//   買取価格 ＝ 再販想定価格 − 利益 − 工事費 − 取得時の諸費用 − 経費 − 販売経費
//
// ここでの「利益」は販売経費まで差し引いた後に残る最終利益（＝ calculate() の営業利益）。
// 購入時手数料（買取価格×3%＋6万円）と、評価額を買取価格から推定する場合の不動産取得税は
// 買取価格そのものに連動するため、一度では解けない。買取価格を仮置きして費用を計算し、
// その費用から買取価格を引き直す――という反復（収束計算）で求める。
// 連動分の係数は 3%＋取得税率 程度と小さいため、数回で収束する。

/** 逆算の反復上限（通常は5回程度で収束する。安全弁） */
const REVERSE_MAX_ITERATIONS = 100;
/** 収束とみなす差（万円）。1e-6万円＝0.01円 */
const REVERSE_EPSILON = 1e-6;

export interface ReversePriceInput {
  /** 再販想定価格（万円） */
  resalePrice: number;
  /** 目標利益（万円）。販売経費まで引いた後に残す額＝ calculate() の営業利益 */
  targetProfit: number;
  /** 工事費（リフォーム／解体／建築／造成）の概算（万円） */
  workCost: number;
  /** 登記費用・印紙代（万円） */
  registration: number;
  /** 固都税精算金（万円） */
  taxProration: number;
  /** 不動産取得税（万円）。acquisitionTaxRate を指定した場合はそちらが優先される */
  acquisitionTax: number;
  /** その他の取得時諸費用（銀行諸費用・鍵交換など・万円） */
  otherAcquisition: number;
  /** 経費（万円） */
  expenses: number;
  /** 販売経費のうち仲介手数料以外（万円） */
  sellingOther: number;
  /** 購入時手数料（買取価格×3%＋6万円）を見込むか */
  includeBuyFee: boolean;
  /**
   * 購入時手数料を固定額で見込む場合の額（万円）。includeBuyFee が false のときだけ使う。
   * 手数料を値引きした・満額でないなど、計算式どおりでない額が決まっている場合に用いる。
   */
  buyFeeFixed?: number;
  /**
   * 販売時仲介手数料（万円）。未指定なら再販想定価格から自動計算（×3%＋6万円）。
   * 自社グループで販売する等で手数料が出ない場合は 0 を渡す。
   */
  sellBrokerage?: number;
  /**
   * 不動産取得税を「買取価格 × この率」で見積もる場合に指定（0〜1）。
   * 指定すると買取価格に連動するため収束計算の対象になる。未指定なら acquisitionTax を固定額として使う。
   */
  acquisitionTaxRate?: number;
}

export interface ReversePriceResult {
  /** 逆算で求めた買取価格（万円） */
  buyPrice: number;
  /** その買取価格に対する購入時手数料（万円） */
  buyFee: number;
  /** その買取価格に対する不動産取得税（万円） */
  acquisitionTax: number;
  /** 販売時仲介手数料（万円） */
  sellBrokerage: number;
  /** 販売経費の合計（万円） */
  sellingTotal: number;
  /**
   * 買取価格を含む総費用（万円）。
   * 費目グループ（取得原価／経費）への振り分けは種別で変わるため、ここでは合算のみ返す。
   */
  totalCost: number;
  /** 反復回数 */
  iterations: number;
  /** 収束したか（反復上限に達した場合 false） */
  converged: boolean;
  /** 買取価格が正の値として成立するか（再販想定価格が低すぎると false） */
  feasible: boolean;
  /**
   * 丸め後の買取価格で順計算したときに実際に残る利益（万円）。
   * 表示用。目標利益との差は丸め誤差（0.01万円＝100円）程度に収まる。
   */
  resultProfit: number;
}

/** 数値として扱えない入力を0に寄せる */
function n(v: number | undefined): number {
  return Number.isFinite(v as number) ? (v as number) : 0;
}

/** 仲介手数料の素の値（丸めない）。収束判定を安定させるため内部計算では丸めずに使う */
function rawBrokerage(price: number): number {
  if (!Number.isFinite(price) || price <= 0) return 0;
  return price * 0.03 + 6;
}

/**
 * 目標利益から買取価格を逆算する（収束計算）。
 *
 * 反復式：
 *   P ← (再販 − 利益 − 工事費 − 登記 − 固都税 − その他取得 − 経費 − 販売経費) − 購入時手数料(P) − 取得税(P)
 *
 * 戻り値の buyPrice は小数第2位で丸めたうえで、その丸め後の価格に対する
 * 手数料・取得税・実際に残る利益（resultProfit）を併せて返す。
 */
export function reverseBuyPrice(input: ReversePriceInput): ReversePriceResult {
  const resale = n(input.resalePrice);
  const sellBrokerage = input.sellBrokerage != null ? n(input.sellBrokerage) : rawBrokerage(resale);
  const sellingTotal = sellBrokerage + n(input.sellingOther);
  const expensesTotal = n(input.expenses);

  // 買取価格に連動しない費用の合計
  const fixedCosts =
    n(input.workCost) + n(input.registration) + n(input.taxProration) + n(input.otherAcquisition);
  // 連動費用（購入時手数料・取得税）を引く前の残額
  const budget = resale - n(input.targetProfit) - fixedCosts - expensesTotal - sellingTotal;

  const rate = input.acquisitionTaxRate;
  const useRate = Number.isFinite(rate as number) && (rate as number) > 0;

  let price = budget;
  let iterations = 0;
  let converged = false;
  for (let i = 0; i < REVERSE_MAX_ITERATIONS; i++) {
    iterations = i + 1;
    const fee = input.includeBuyFee ? rawBrokerage(price) : n(input.buyFeeFixed);
    const tax = useRate ? Math.max(0, price) * (rate as number) : n(input.acquisitionTax);
    const next = budget - fee - tax;
    const diff = Math.abs(next - price);
    price = next;
    if (diff < REVERSE_EPSILON) {
      converged = true;
      break;
    }
  }

  // 丸め後の価格を基準に、実際に使う手数料・取得税・残る利益を求め直す
  const buyPrice = round2(price);
  const buyFee = input.includeBuyFee ? calcBrokerage(buyPrice) : round2(n(input.buyFeeFixed));
  const acquisitionTax = useRate
    ? round2(Math.max(0, buyPrice) * (rate as number))
    : round2(n(input.acquisitionTax));
  const totalCost = round2(
    buyPrice +
      buyFee +
      n(input.registration) +
      n(input.taxProration) +
      acquisitionTax +
      n(input.otherAcquisition) +
      n(input.workCost) +
      expensesTotal +
      sellingTotal
  );
  const resultProfit = round2(resale - totalCost);

  return {
    buyPrice,
    buyFee,
    acquisitionTax,
    sellBrokerage: round2(sellBrokerage),
    sellingTotal: round2(sellingTotal),
    totalCost,
    iterations,
    converged,
    feasible: buyPrice > 0,
    resultProfit,
  };
}
