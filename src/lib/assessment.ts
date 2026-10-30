// ============================================================
// 査定入力と計算書（CalcInput）の橋渡し
//
//  ・査定入力に概算の目安額を補う（resolveAssessment）
//  ・買取価格を逆算して4本の価格ラインを作る（priceLines）
//  ・査定入力＋買取価格から計算書の入力を組み立てる（assessmentToCalcInput）
//  ・既存案件の計算書から査定入力を復元する（deriveAssessment：旧データ移行用）
//
// 計算そのものは calc.ts の関数に任せ、ここでは費目への振り分けだけを行う。
// 単位はすべて万円。
// ============================================================
import {
  CalcInput,
  CustomItem,
  AssessmentInput,
  Project,
  PropertyType,
} from "./types";
import { calcBrokerage, reverseBuyPrice, ReversePriceInput, ReversePriceResult, round2, sumItems } from "./calc";
import { PROFIT_LINES, TYPE_PRESETS, WORK_COST_TARGET } from "./presets";

/** 概算をまとめて入れる追加費目のキーとラベル */
export const ASSESS_ITEM = {
  otherAcquisition: { key: "assessOther", label: "その他取得諸費用（概算）" },
  expenses: { key: "assessExpenses", label: "経費（概算）" },
  sellingOther: { key: "assessSellingOther", label: "広告費ほか販売経費（概算）" },
} as const;

/** 空の査定入力（新規案件用）。概算は種別ごとの目安額で埋める */
export function emptyAssessment(type: PropertyType): AssessmentInput {
  const preset = TYPE_PRESETS[type];
  return {
    resalePrice: 0,
    workCost: preset.workCost,
    registration: preset.registration,
    taxProration: preset.taxProration,
    acquisitionTax: preset.acquisitionTax,
    otherAcquisition: preset.otherAcquisition,
    expenses: preset.expenses,
    sellingOther: preset.sellingOther,
    includeBuyFee: true,
  };
}

/** 査定入力の各項目を確定させる（未入力の概算は種別ごとの目安額で補う） */
export interface ResolvedAssessment {
  resalePrice: number;
  workCost: number;
  registration: number;
  taxProration: number;
  acquisitionTax: number;
  otherAcquisition: number;
  expenses: number;
  sellingOther: number;
  /** 購入時手数料を買取価格から自動計算するか（固定額の上書きがある場合は false） */
  includeBuyFee: boolean;
  /** 購入時手数料の固定額（万円）。includeBuyFee が false のときに使う */
  buyFeeFixed: number;
  noSellBrokerage: boolean;
  /** 販売時仲介手数料（再販想定価格×3%＋6万円。見込まない設定なら0） */
  sellBrokerage: number;
}

const num = (v: number | undefined, fallback: number): number =>
  Number.isFinite(v as number) ? (v as number) : fallback;

export function resolveAssessment(
  type: PropertyType,
  a: AssessmentInput | undefined
): ResolvedAssessment {
  const preset = TYPE_PRESETS[type];
  const resalePrice = num(a?.resalePrice, 0);
  const noSellBrokerage = a?.noSellBrokerage === true;
  // 手数料は再販想定価格から自動計算するが、明示的な上書きがあればそちらを優先する
  const sellBrokerage = noSellBrokerage
    ? 0
    : num(a?.sellBrokerage, calcBrokerage(resalePrice));
  // 購入時手数料も同様。固定額の上書きがある場合は買取価格に連動させない
  const hasBuyFeeOverride = Number.isFinite(a?.buyFee as number);
  return {
    resalePrice,
    workCost: num(a?.workCost, preset.workCost),
    registration: num(a?.registration, preset.registration),
    taxProration: num(a?.taxProration, preset.taxProration),
    acquisitionTax: num(a?.acquisitionTax, preset.acquisitionTax),
    otherAcquisition: num(a?.otherAcquisition, preset.otherAcquisition),
    expenses: num(a?.expenses, preset.expenses),
    sellingOther: num(a?.sellingOther, preset.sellingOther),
    includeBuyFee: hasBuyFeeOverride ? false : a?.includeBuyFee !== false,
    buyFeeFixed: hasBuyFeeOverride ? (a?.buyFee as number) : 0,
    noSellBrokerage,
    sellBrokerage,
  };
}

/** 逆算関数に渡す入力を組み立てる */
export function reverseInputOf(r: ResolvedAssessment, targetProfit: number): ReversePriceInput {
  return {
    resalePrice: r.resalePrice,
    targetProfit,
    workCost: r.workCost,
    registration: r.registration,
    taxProration: r.taxProration,
    acquisitionTax: r.acquisitionTax,
    otherAcquisition: r.otherAcquisition,
    expenses: r.expenses,
    sellingOther: r.sellingOther,
    includeBuyFee: r.includeBuyFee,
    buyFeeFixed: r.buyFeeFixed,
    sellBrokerage: r.sellBrokerage,
  };
}

export interface PriceLine {
  /** 目標利益（万円） */
  profit: number;
  /** 逆算結果 */
  result: ReversePriceResult;
  /** 提示用に万円単位へ切り下げた価格（端数を会社側に残す） */
  displayPrice: number;
}

/** 万円単位に切り下げ（提示価格は端数を出さない） */
export function floorMan(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.floor(n);
}

/** 利益100・150・200・250万円の4本を逆算する */
export function priceLines(
  type: PropertyType,
  a: AssessmentInput | undefined,
  lines: readonly number[] = PROFIT_LINES
): PriceLine[] {
  const r = resolveAssessment(type, a);
  return lines.map((profit) => {
    const result = reverseBuyPrice(reverseInputOf(r, profit));
    return { profit, result, displayPrice: floorMan(result.buyPrice) };
  });
}

/**
 * 査定入力と買取価格から、計算書（CalcInput）を組み立てる。
 * 既存の計算ロジック（calculate）にそのまま渡せる形にすることで、
 * 査定・計算書・稟議・銀行用のどこから見ても同じ数字になる。
 */
export function assessmentToCalcInput(
  type: PropertyType,
  a: AssessmentInput | undefined,
  buyPrice: number
): CalcInput {
  const r = resolveAssessment(type, a);
  const price = Number.isFinite(buyPrice) ? buyPrice : 0;
  const work = WORK_COST_TARGET[type];

  const acquisition: Record<string, number> = {
    purchase: round2(price),
    buyFee: r.includeBuyFee ? calcBrokerage(price) : r.buyFeeFixed,
    registration: r.registration,
    fixedTaxProration: r.taxProration,
    acquisitionTax: r.acquisitionTax,
    [ASSESS_ITEM.otherAcquisition.key]: r.otherAcquisition,
  };
  const expenses: Record<string, number> = {
    [ASSESS_ITEM.expenses.key]: r.expenses,
  };
  // 工事費は種別ごとに入る費目が違う（戸建＝リフォーム／土地＝解体／建売＝建築／分譲地＝造成）
  if (work.group === "acquisition") {
    acquisition[work.key] = r.workCost;
  } else {
    expenses[work.key] = r.workCost;
  }

  const selling: Record<string, number> = {
    sellBrokerage: r.sellBrokerage,
    [ASSESS_ITEM.sellingOther.key]: r.sellingOther,
  };

  const acquisitionExtra: CustomItem[] = [
    { key: ASSESS_ITEM.otherAcquisition.key, label: ASSESS_ITEM.otherAcquisition.label },
  ];
  const expensesExtra: CustomItem[] = [
    { key: ASSESS_ITEM.expenses.key, label: ASSESS_ITEM.expenses.label },
  ];
  const sellingExtra: CustomItem[] = [
    { key: ASSESS_ITEM.sellingOther.key, label: ASSESS_ITEM.sellingOther.label },
  ];

  return {
    propertyType: type,
    sellPrice: r.resalePrice,
    acquisition,
    expenses,
    selling,
    acquisitionExtra,
    expensesExtra,
    sellingExtra,
    areaSqm: a?.landAreaSqm,
    buildingAreaSqm: a?.buildingAreaSqm,
  };
}

/**
 * 既存案件の計算書から査定入力を復元する（旧データ移行用）。
 * 計算書は書き換えず、査定画面に同じ数字が並ぶようにするためだけに使う。
 * 分類できなかった取得原価は「その他取得諸費用」にまとめる（合計は一致する）。
 */
export function deriveAssessment(p: Project): AssessmentInput {
  const type = p.propertyType;
  const calc = p.calc ?? ({} as CalcInput);
  const acq = calc.acquisition ?? {};
  const exp = calc.expenses ?? {};
  const sell = calc.selling ?? {};
  const work = WORK_COST_TARGET[type];

  const pick = (o: Record<string, number>, k: string) =>
    Number.isFinite(o[k]) ? o[k] : 0;

  const purchase = pick(acq, "purchase");
  const buyFee = pick(acq, "buyFee");
  const registration = pick(acq, "registration");
  const taxProration = pick(acq, "fixedTaxProration");
  const acquisitionTax = pick(acq, "acquisitionTax");

  // 工事費：種別ごとの主費目。建売・分譲地は解体費も工事費にまとめて扱う
  let workCost = work.group === "acquisition" ? pick(acq, work.key) : pick(exp, work.key);
  const named = new Set(["purchase", "buyFee", "registration", "fixedTaxProration", "acquisitionTax"]);
  if (work.group === "acquisition") named.add(work.key);
  if (type === "kenuri" || type === "subdivision") {
    // 解体費は工事費に合算する（査定画面では「建築費用（解体含む）」「造成費用（解体含む）」）
    workCost += pick(acq, "demolition");
    named.add("demolition");
  }

  // 取得原価のうち上で拾えなかったものは「その他取得諸費用」へ（合計を保つ）
  const otherAcquisition = round2(
    Object.entries(acq).reduce(
      (sum, [k, v]) => (named.has(k) || !Number.isFinite(v) ? sum : sum + v),
      0
    )
  );

  // 経費：工事費として取り出した分（分譲地の造成費）を除いた残り
  const expensesTotal = round2(
    sumItems(exp) - (work.group === "expenses" ? pick(exp, work.key) : 0)
  );

  const sellBrokerage = pick(sell, "sellBrokerage");
  const sellingOther = round2(sumItems(sell) - sellBrokerage);
  const resalePrice = Number.isFinite(calc.sellPrice) ? calc.sellPrice : 0;
  // 計算書に入っていた手数料が自動計算と違うなら、手入力された額として保持する
  // （既存案件を開いたときに表示される数字が変わらないようにするため）
  const autoBrokerage = calcBrokerage(resalePrice);
  const brokerageOverride =
    sellBrokerage > 0 && Math.abs(sellBrokerage - autoBrokerage) > 0.001 ? sellBrokerage : undefined;
  // 購入時手数料も同様。計算式（買取価格×3%＋6万円）と違う額が入っていれば固定額として保持する
  const autoBuyFee = calcBrokerage(purchase);
  const buyFeeOverride =
    buyFee > 0 && Math.abs(buyFee - autoBuyFee) > 0.001 ? buyFee : undefined;

  return {
    resalePrice,
    workCost: round2(workCost),
    address: p.ringi?.address || undefined,
    landAreaSqm: calc.areaSqm,
    buildingAreaSqm: calc.buildingAreaSqm,
    buildingAge: p.ringi?.buildingAge || undefined,
    staff: p.ringi?.staff || undefined,
    registration,
    taxProration,
    acquisitionTax,
    otherAcquisition,
    expenses: expensesTotal,
    sellingOther,
    includeBuyFee: buyFee > 0,
    buyFee: buyFeeOverride,
    noSellBrokerage: sellBrokerage === 0,
    sellBrokerage: brokerageOverride,
    offerPrice: purchase > 0 ? purchase : undefined,
  };
}
