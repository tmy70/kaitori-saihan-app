// ============================================================
// 案件の集計・期間フィルタ（純粋関数のみ。単位：万円）
//
//  ・ステージ（検討中／買取済／決済完了）の判定と旧データの読み替え
//  ・実績（最終経費）と計画の切替：決済完了かつ実績入力済みなら実績で集計する
//  ・期間フィルタ（今月・今年・今年度＝4月始まり・期間指定）
//  ・粗利集計（件数・売上・粗利・営業利益・利益率）
// ============================================================
import { calculate, round2, sumItems } from "./calc";
import { today } from "./format";
import { CalcInput, CalcResult, Project, ProjectStage } from "./types";

// ---------------- ステージ ----------------

/**
 * 案件の進行ステージ。
 * stage 未設定の旧データは、旧「買取完了」タグ（acquired）があれば買取済、無ければ検討中とみなす。
 */
export function stageOf(p: Project): ProjectStage {
  if (p.stage) return p.stage;
  if (p.acquired) return "acquired";
  return "reviewing";
}

/** アーカイブ済みか */
export function isArchived(p: Project): boolean {
  return p.archived === true;
}

// ---------------- 実績（最終経費・確定粗利） ----------------

/** 実績の入力が始まっているか（実績用の計算入力が作られているか） */
export function hasActual(p: Project): boolean {
  return !!p.actual?.calc;
}

/** 実績の計算入力。未入力なら計画をそのまま返す（＝計画どおりに着地した想定で扱う） */
export function actualCalc(p: Project): CalcInput {
  return p.actual?.calc ?? p.calc;
}

/** 集計の基準：actual=確定実績 / plan=計画（見込み） */
export type ProfitBasis = "actual" | "plan";

/**
 * 案件1件の損益。
 * 決済完了かつ実績入力済みのときだけ実績で計算し、それ以外は計画（calc）で計算する。
 */
export function profitOf(p: Project): { basis: ProfitBasis; input: CalcInput; result: CalcResult } {
  const useActual = stageOf(p) === "settled" && hasActual(p);
  const input = useActual ? actualCalc(p) : p.calc;
  return { basis: useActual ? "actual" : "plan", input, result: calculate(input) };
}

/**
 * 計画に対する実績の差異（実績 − 計画）。プラスは実績が計画を上回った額。
 * 費目グループ単位と、粗利・営業利益の着地差を返す。
 */
export function variance(p: Project) {
  const plan = p.calc;
  const act = actualCalc(p);
  const planR = calculate(plan);
  const actR = calculate(act);
  return {
    sellPrice: round2((act.sellPrice ?? 0) - (plan.sellPrice ?? 0)),
    acquisition: round2(sumItems(act.acquisition) - sumItems(plan.acquisition)),
    expenses: round2(sumItems(act.expenses) - sumItems(plan.expenses)),
    selling: round2(sumItems(act.selling) - sumItems(plan.selling)),
    grossProfit: round2(actR.grossProfit - planR.grossProfit),
    operatingProfit: round2(actR.operatingProfit - planR.operatingProfit),
  };
}

// ---------------- 期間フィルタ ----------------

/** 期間のプリセット */
export type PeriodPreset = "all" | "thisMonth" | "thisYear" | "thisFiscalYear" | "custom";

export const PERIOD_LABELS: Record<PeriodPreset, string> = {
  all: "全期間",
  thisMonth: "今月",
  thisYear: "今年（1〜12月）",
  thisFiscalYear: "今年度（4月〜翌3月）",
  custom: "期間を指定",
};

/** 月の末日（1〜12月の month に対する日数） */
function lastDayOfMonth(year: number, month: number): number {
  // Date(y, m, 0) は「m月の前月の末日」＝ month 月の末日（month は1始まりで渡す）
  return new Date(year, month, 0).getDate();
}

const pad2 = (n: number) => String(n).padStart(2, "0");

/**
 * プリセットから期間（両端を含む YYYY-MM-DD）を求める。
 * today は "YYYY-MM-DD"（テスト可能にするため引数で受ける）。
 * 年度は日本の一般的な 4月始まり〜翌3月末 とする。
 */
export function periodRange(
  preset: PeriodPreset,
  today: string,
  customFrom?: string,
  customTo?: string
): { from?: string; to?: string } {
  const y = Number(today.slice(0, 4));
  const m = Number(today.slice(5, 7));
  switch (preset) {
    case "thisMonth":
      return { from: `${y}-${pad2(m)}-01`, to: `${y}-${pad2(m)}-${pad2(lastDayOfMonth(y, m))}` };
    case "thisYear":
      return { from: `${y}-01-01`, to: `${y}-12-31` };
    case "thisFiscalYear":
      return m >= 4
        ? { from: `${y}-04-01`, to: `${y + 1}-03-31` }
        : { from: `${y - 1}-04-01`, to: `${y}-03-31` };
    case "custom":
      return { from: customFrom || undefined, to: customTo || undefined };
    case "all":
    default:
      return {};
  }
}

/** 期間判定に使う日付の種類。auto はステージに応じて自動で選ぶ */
export type DateBasis = "auto" | "settle" | "purchase" | "updated";

/**
 * 案件の「期間フィルタの基準日」を返す（YYYY-MM-DD）。
 * auto の場合：決済完了→決済日 / 買取済→買取日 / 検討中→更新日。
 * 該当する日付が未入力なら更新日で代替する。
 */
export function basisDateOf(p: Project, basis: DateBasis = "auto"): string | undefined {
  const updated = p.updatedAt ? p.updatedAt.slice(0, 10) : undefined;
  const settle = p.actual?.settleDate || undefined;
  const purchase = p.actual?.purchaseDate || undefined;
  if (basis === "settle") return settle;
  if (basis === "purchase") return purchase;
  if (basis === "updated") return updated;
  const stage = stageOf(p);
  if (stage === "settled") return settle ?? updated;
  if (stage === "acquired") return purchase ?? updated;
  return updated;
}

/** 日付（YYYY-MM-DD 前方一致で比較）が期間内か。from/to 未指定なら常に true */
export function inPeriod(date: string | undefined, from?: string, to?: string): boolean {
  if (!from && !to) return true;
  if (!date) return false; // 期間を絞っているのに基準日が無いものは対象外
  const d = date.slice(0, 10);
  if (from && d < from) return false;
  if (to && d > to) return false;
  return true;
}

/**
 * 保有日数（買取決済日 → 売却決済日）。
 * to を省略した場合は todayStr（未指定なら実行日）までの経過日数＝在庫の滞留日数を返す。
 * from が無いときは undefined。
 */
export function holdingDays(from?: string, to?: string, todayStr?: string): number | undefined {
  if (!from) return undefined;
  // 既定の「今日」はローカル日付（today()）を使う。
  // toISOString() は UTC なので、日本時間の午前中は1日前になってしまう。
  const end = to || todayStr || today();
  const a = new Date(from + "T00:00:00");
  const b = new Date(end + "T00:00:00");
  if (isNaN(a.getTime()) || isNaN(b.getTime())) return undefined;
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

// ---------------- 粗利集計 ----------------

export interface Aggregate {
  /** 集計対象の件数 */
  count: number;
  /** うち実績（確定値）で集計した件数 */
  actualCount: number;
  sellTotal: number; // 売上（販売価格）合計
  costTotal: number; // 売上原価合計
  grossTotal: number; // 粗利益合計
  sellingTotal: number; // 販売経費合計
  operatingTotal: number; // 営業利益合計
  /** 粗利率（粗利合計 ÷ 売上合計。加重平均） */
  grossMargin: number;
  /** 営業利益率（営業利益合計 ÷ 売上合計。加重平均） */
  operatingMargin: number;
  /** 1件あたり平均営業利益 */
  avgOperatingProfit: number;
}

export const EMPTY_AGGREGATE: Aggregate = {
  count: 0,
  actualCount: 0,
  sellTotal: 0,
  costTotal: 0,
  grossTotal: 0,
  sellingTotal: 0,
  operatingTotal: 0,
  grossMargin: 0,
  operatingMargin: 0,
  avgOperatingProfit: 0,
};

/**
 * 案件群の粗利集計。
 * 各案件は profitOf の基準（決済完了＝実績／それ以外＝計画）で計算する。
 * 利益率は「合計÷合計」の加重平均（件数の単純平均では小さい案件が過大評価されるため）。
 */
export function aggregate(projects: Project[]): Aggregate {
  if (projects.length === 0) return { ...EMPTY_AGGREGATE };
  let sellTotal = 0;
  let costTotal = 0;
  let grossTotal = 0;
  let sellingTotal = 0;
  let operatingTotal = 0;
  let actualCount = 0;
  for (const p of projects) {
    const { basis, input, result } = profitOf(p);
    if (basis === "actual") actualCount++;
    sellTotal += Number.isFinite(input.sellPrice) ? input.sellPrice : 0;
    costTotal += result.costOfSales;
    grossTotal += result.grossProfit;
    sellingTotal += result.sellingExpenses;
    operatingTotal += result.operatingProfit;
  }
  return {
    count: projects.length,
    actualCount,
    sellTotal: round2(sellTotal),
    costTotal: round2(costTotal),
    grossTotal: round2(grossTotal),
    sellingTotal: round2(sellingTotal),
    operatingTotal: round2(operatingTotal),
    grossMargin: sellTotal > 0 ? grossTotal / sellTotal : 0,
    operatingMargin: sellTotal > 0 ? operatingTotal / sellTotal : 0,
    avgOperatingProfit: round2(operatingTotal / projects.length),
  };
}
