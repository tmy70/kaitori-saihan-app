// ============================================================
// サンプル案件データ（動作確認用の初期値・万円）
// 仕様書の期待値（粗利益・営業利益）と一致することを calc.test.ts で検証する。
// 個人情報は含めず、物件名・所在地はダミー。
// ============================================================
import { CalcInput, PropertyType, Project } from "./types";
import { createChecklist, createSchedule } from "./checklist";
import { genId, today } from "./format";
import { DEFAULT_COMPANY_ID } from "./companies";

/** タイプ別サンプルの計算入力 */
export const SAMPLE_CALC: Record<PropertyType, CalcInput> = {
  building: {
    propertyType: "building",
    sellPrice: 1680,
    acquisition: {
      purchase: 600,
      registration: 20,
      reform: 600,
      fixedTaxProration: 5,
      acquisitionTax: 15,
      boundary: 35,
      keyChange: 5,
      bankCost: 10,
    },
    expenses: { fireInsurance: 2, defectInsurance: 10, removal: 50 },
    selling: { sellBrokerage: 56, advertising: 10, consumptionTax: 50 },
  },
  land: {
    propertyType: "land",
    sellPrice: 750,
    acquisition: {
      purchase: 100,
      registration: 20,
      demolition: 320,
      fixedTaxProration: 5,
      acquisitionTax: 10,
      boundary: 40,
      bankCost: 10,
    },
    expenses: {},
    selling: { sellBrokerage: 31, advertising: 10 },
  },
  kenuri: {
    propertyType: "kenuri",
    sellPrice: 2480,
    acquisition: {
      purchase: 300,
      registration: 15,
      demolition: 300,
      fixedTaxProration: 5,
      acquisitionTax: 10,
      boundary: 35,
      construction: 1300,
      groundImprovement: 50,
      bankCost: 10,
    },
    expenses: { fireInsurance: 2, defectInsurance: 10, removal: 50 },
    selling: { sellBrokerage: 80, advertising: 10, consumptionTax: 50 },
  },
  mansion: {
    propertyType: "mansion",
    sellPrice: 3400,
    acquisition: {
      purchase: 2700,
      buyFee: 96,
      registration: 20,
      reform: 100,
      fixedTaxProration: 10,
      acquisitionTax: 10,
      mgmtFeeProration: 5,
      keyChange: 5,
      bankCost: 10,
    },
    expenses: { fireInsurance: 2, defectInsurance: 10, removal: 50 },
    selling: { sellBrokerage: 108, advertising: 10, consumptionTax: 50, mgmtRepair: 15 },
  },
};

/** 期待値（テスト用） */
export const SAMPLE_EXPECTED: Record<
  PropertyType,
  { grossProfit: number; grossMarginPct: number; operatingProfit: number; operatingMarginPct: number }
> = {
  building: { grossProfit: 328, grossMarginPct: 20, operatingProfit: 212, operatingMarginPct: 13 },
  land: { grossProfit: 245, grossMarginPct: 33, operatingProfit: 204, operatingMarginPct: 27 },
  kenuri: { grossProfit: 393, grossMarginPct: 16, operatingProfit: 253, operatingMarginPct: 10 },
  mansion: { grossProfit: 382, grossMarginPct: 11, operatingProfit: 199, operatingMarginPct: 6 },
};

const SAMPLE_NAMES: Record<PropertyType, string> = {
  building: "サンプル：戸建リフォーム再販",
  land: "サンプル：更地土地再販",
  kenuri: "サンプル：新築建売",
  mansion: "サンプル：区分マンション再販",
};

/** 既定のシナリオ（強気/標準/弱気） */
export function defaultScenarios() {
  return [
    { id: genId(), label: "強気", sellPriceDelta: 100, costDelta: 0 },
    { id: genId(), label: "標準（基準）", sellPriceDelta: 0, costDelta: 0 },
    { id: genId(), label: "弱気", sellPriceDelta: -100, costDelta: 0 },
  ];
}

/** サンプルの固定ID（同じ押下で重複生成しないための安定ID） */
export const SAMPLE_ID_PREFIX = "sample-";
export const sampleId = (type: PropertyType) => `${SAMPLE_ID_PREFIX}${type}`;

/** サンプル（テンプレート）かどうかの判定。旧データ（フラグ無し・名称が「サンプル：」）も拾う */
export function isSampleProject(p: { id?: string; isSample?: boolean; name?: string }): boolean {
  return (
    p.isSample === true ||
    (typeof p.id === "string" && p.id.startsWith(SAMPLE_ID_PREFIX)) ||
    (typeof p.name === "string" && p.name.startsWith("サンプル："))
  );
}

/** サンプル案件（Project）を1件生成（固定ID・isSample印付き） */
export function createSampleProject(type: PropertyType, companyId = DEFAULT_COMPANY_ID): Project {
  const now = new Date().toISOString();
  return {
    id: sampleId(type),
    companyId,
    name: SAMPLE_NAMES[type],
    isSample: true,
    propertyType: type,
    calc: structuredClone(SAMPLE_CALC[type]),
    ringi: {
      submitDate: today(),
      staff: "",
      propertyName: SAMPLE_NAMES[type],
      address: "富山市〇〇町0-0（サンプル）",
      propertyKind: "",
      sellerName: "",
      inquirySource: "",
      sellReason: "",
      landArea: "",
      buildingArea: "",
      buildingAge: "",
      structure: "",
      parking: "",
      floor: "",
      exclusiveArea: "",
      hasElevator: false,
      cornerRoom: false,
      mansionParking: "",
      sellerHopePrice: "",
      assessMethod1: "",
      assessMethod2: "",
      appealPoint: "",
      rosenka: "",
      checklist: createChecklist(),
      schedule: createSchedule(),
      approverStaff: "",
      approverManager: "",
      approverPresident: "",
    },
    scenarios: defaultScenarios(),
    createdAt: now,
    updatedAt: now,
  };
}

/** 空の新規案件を生成（マイ案件＝isSample:false） */
export function createEmptyProject(type: PropertyType, companyId: string, name: string): Project {
  const base = createSampleProject(type, companyId);
  return {
    ...base,
    id: genId(),
    name: name || "新規案件",
    isSample: false,
    calc: { propertyType: type, sellPrice: 0, acquisition: {}, expenses: {}, selling: {} },
    ringi: { ...base.ringi, propertyName: name || "", address: "" },
  };
}
