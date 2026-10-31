// ============================================================
// 査定時の「概算（目安額）」マスタ
//
// 査定の場では評価額・見積書がまだ無い。そこで種別ごとの目安額を初期値として置き、
// 案件ごとに上書きできるようにする（仕様：取得税・登記費用・固都税精算・販売経費は
// 種別ごとの目安額を使い、画面に「概算」と表示する）。
//
// 金額の出どころ：既存のサンプル案件（sampleData.ts の SAMPLE_CALC）の実額。
// 根拠のない数字を置かないため、社内で実際に使っている数値をそのまま初期値にしている。
// 単位はすべて万円。
// ============================================================
import { PropertyType } from "./types";

/** 工事費（リフォーム／解体／建築／造成）を計算書のどの費目へ入れるか */
export interface WorkCostTarget {
  /** 費目グループ */
  group: "acquisition" | "expenses";
  /** itemDefs.ts の費目キー */
  key: string;
  /** 査定画面での呼び名 */
  label: string;
}

/**
 * 種別ごとの「工事費」の意味と格納先。
 * 戸建・マンションはリフォーム、土地は解体、建売は建築、分譲地は造成が主となる。
 */
export const WORK_COST_TARGET: Record<PropertyType, WorkCostTarget> = {
  building: { group: "acquisition", key: "reform", label: "リフォーム費用" },
  mansion: { group: "acquisition", key: "reform", label: "リフォーム費用" },
  land: { group: "acquisition", key: "demolition", label: "解体費用" },
  kenuri: { group: "acquisition", key: "construction", label: "建築費用（解体含む）" },
  subdivision: { group: "expenses", key: "devEarthwork", label: "造成費用（解体含む）" },
};

/** 種別ごとの概算（目安額・万円） */
export interface TypePreset {
  /** 工事費（リフォーム／解体／建築／造成）の目安 */
  workCost: number;
  /** 登記費用・印紙代 */
  registration: number;
  /** 固都税精算金 */
  taxProration: number;
  /** 不動産取得税（評価額が分かるまでの概算） */
  acquisitionTax: number;
  /** その他の取得時諸費用（銀行諸費用・鍵交換・管理費精算など） */
  otherAcquisition: number;
  /** 経費（火災保険・瑕疵保険・家財撤去・境界確定など） */
  expenses: number;
  /** 販売経費のうち仲介手数料以外（広告費・消費税不足分など） */
  sellingOther: number;
}

/**
 * 概算の初期値。
 * サンプル案件の内訳を費目グループごとに足し上げた額（詳細は各コメント参照）。
 */
export const TYPE_PRESETS: Record<PropertyType, TypePreset> = {
  // 戸建リフォーム再販：リフォーム600／登記20／固都税5／取得税15／鍵交換5+銀行10／
  //   経費 火災2+瑕疵10+家財撤去50+境界35／販売 広告10+消費税不足50
  building: {
    workCost: 600,
    registration: 20,
    taxProration: 5,
    acquisitionTax: 15,
    otherAcquisition: 15,
    expenses: 97,
    sellingOther: 60,
  },
  // 土地再販：解体320／登記20／固都税5／取得税10／銀行10／経費 境界40／販売 広告10
  land: {
    workCost: 320,
    registration: 20,
    taxProration: 5,
    acquisitionTax: 10,
    otherAcquisition: 10,
    expenses: 40,
    sellingOther: 10,
  },
  // 建売：解体300+建築1300+地盤改良50＝1650／登記15／固都税5／取得税10／銀行10／
  //   経費 火災2+瑕疵10+家財撤去50+境界35／販売 広告10+消費税不足50
  kenuri: {
    workCost: 1650,
    registration: 15,
    taxProration: 5,
    acquisitionTax: 10,
    otherAcquisition: 10,
    expenses: 97,
    sellingOther: 60,
  },
  // マンション再販：リフォーム100／登記20／固都税10／取得税10／管理費精算5+鍵交換5+銀行10／
  //   経費 火災2+瑕疵10+家財撤去50／販売 広告10+消費税不足50+管理修繕15
  mansion: {
    workCost: 100,
    registration: 20,
    taxProration: 10,
    acquisitionTax: 10,
    otherAcquisition: 20,
    expenses: 62,
    sellingOther: 75,
  },
  // 分譲地：解体230+造成一式1000＝1230／登記30／固都税5／取得税25／銀行20／
  //   経費 0（造成費は工事費にまとめた）／販売 広告20
  subdivision: {
    workCost: 1230,
    registration: 30,
    taxProration: 5,
    acquisitionTax: 25,
    otherAcquisition: 20,
    expenses: 0,
    sellingOther: 20,
  },
};

/** 査定画面に並べる利益ライン（万円）。仕様：粗利100・150・200・250万円の4本 */
export const PROFIT_LINES = [100, 150, 200, 250] as const;
