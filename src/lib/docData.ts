// ============================================================
// 書類に載せる項目の組み立て（4種の書類で共通に使う）
// 画面・PDFのどこから見ても同じ表記になるよう、ここに集約する。
// ============================================================
import { areaLabel, manToYen } from "./format";
import {
  DEFAULT_CONDITIONS,
  DEFAULT_GUARANTEE_CONDITIONS,
  DEFAULT_MEDIATION_COMPANY,
} from "./docDefaults";
import { Project, PROPERTY_TYPE_LABELS } from "./types";

/** 物件の表示（所在・種別・面積・築年） */
export function propertyRows(p: Project): { label: string; value: string }[] {
  const a = p.assessment;
  return [
    { label: "所在地", value: a?.address || p.ringi?.address || "" },
    { label: "種別", value: PROPERTY_TYPE_LABELS[p.propertyType] },
    { label: "土地面積", value: areaLabel(a?.landAreaSqm) },
    { label: "建物面積", value: areaLabel(a?.buildingAreaSqm) },
    { label: "築年", value: a?.buildingAge || "" },
  ];
}

/** 提示する買取価格（円） */
export function offerYen(p: Project): number {
  return manToYen(p.assessment?.offerPrice ?? 0);
}

/** 保証価格（円）。未入力なら提示価格を使う */
export function guaranteeYen(p: Project): number {
  const man = p.docs?.guaranteePrice ?? p.assessment?.offerPrice ?? 0;
  return manToYen(man);
}

/** 前提条件（未設定なら既定文） */
export function conditionsOf(p: Project): string[] {
  const c = p.docs?.conditions;
  return c && c.length > 0 ? c : DEFAULT_CONDITIONS;
}

/** 保証の条件（未設定なら既定文） */
export function guaranteeConditionsOf(p: Project): string[] {
  const c = p.docs?.guaranteeConditions;
  return c && c.length > 0 ? c : DEFAULT_GUARANTEE_CONDITIONS;
}

/**
 * 媒介をする会社名（未設定なら既定）。
 * 買取をする発行会社とは別であることが多いため、書面では分けて記載する。
 */
export function mediationCompanyOf(p: Project): string {
  return p.docs?.mediationCompany?.trim() || DEFAULT_MEDIATION_COMPANY;
}

/** 担当者名（査定入力 → 稟議書の順に探す） */
export function staffOf(p: Project): string {
  return p.assessment?.staff || p.ringi?.staff || "";
}
