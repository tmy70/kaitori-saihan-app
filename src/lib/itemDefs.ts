// ============================================================
// 費目定義（物件タイプ別）
// 計算書フォームの項目名・並び・補助計算の対象をここで一元管理する
// ============================================================
import { PropertyType } from "./types";

/** 補助計算の種類 */
export type AutoCalcKind =
  | "brokerage" // 仲介手数料 = 価格×3% + 6万円
  | "acquisitionTax" // 不動産取得税 = 評価額×(土地1.5%/建物3%)
  | "taxProration"; // 固都税精算金 = 年額×日数/365

export interface ItemDef {
  key: string;
  label: string;
  /** 補助計算ボタンの種類（あれば表示） */
  auto?: AutoCalcKind;
  /** 旧耐震案件のみ等の補足 */
  note?: string;
}

/** 取得原価の費目（タイプ別） */
export const ACQUISITION_ITEMS: Record<PropertyType, ItemDef[]> = {
  building: [
    { key: "purchase", label: "仕入代" },
    { key: "buyFee", label: "購入時手数料（満額）" },
    { key: "registration", label: "登記費用・印紙代" },
    { key: "reform", label: "リフォーム費用" },
    { key: "fixedTaxProration", label: "固都税精算金", auto: "taxProration" },
    { key: "acquisitionTax", label: "不動産取得税", auto: "acquisitionTax", note: "評価額×土地1.5%・建物3%" },
    { key: "boundary", label: "境界確定費用" },
    { key: "keyChange", label: "鍵交換代" },
    { key: "design", label: "設計料" },
    { key: "bankCost", label: "銀行諸費用" },
  ],
  land: [
    { key: "purchase", label: "仕入代" },
    { key: "buyFee", label: "購入時手数料（満額）" },
    { key: "registration", label: "登記費用・印紙代" },
    { key: "demolition", label: "建物解体費用" },
    { key: "fixedTaxProration", label: "固都税精算金", auto: "taxProration" },
    { key: "acquisitionTax", label: "不動産取得税", auto: "acquisitionTax" },
    { key: "boundary", label: "境界確定費用・分筆登記費用" },
    { key: "waterSupply", label: "上下水道等引き込み費用" },
    { key: "exterior", label: "外構工事費用" },
    { key: "bankCost", label: "銀行諸費用" },
  ],
  kenuri: [
    { key: "purchase", label: "仕入代" },
    { key: "buyFee", label: "購入時手数料（満額）" },
    { key: "registration", label: "登記費用・印紙代" },
    { key: "demolition", label: "建物解体費用" },
    { key: "fixedTaxProration", label: "固都税精算金", auto: "taxProration" },
    { key: "acquisitionTax", label: "不動産取得税", auto: "acquisitionTax" },
    { key: "boundary", label: "境界確定費用・分筆登記費用" },
    { key: "construction", label: "建物建築費用" },
    { key: "groundImprovement", label: "地盤改良工事費用" },
    { key: "bankCost", label: "銀行諸費用" },
  ],
  mansion: [
    { key: "purchase", label: "仕入代" },
    { key: "buyFee", label: "購入時手数料（満額）" },
    { key: "registration", label: "登記費用・印紙代" },
    { key: "reform", label: "リフォーム費用" },
    { key: "fixedTaxProration", label: "固都税精算金", auto: "taxProration" },
    { key: "acquisitionTax", label: "不動産取得税", auto: "acquisitionTax" },
    { key: "mgmtFeeProration", label: "管理費等精算金" },
    { key: "keyChange", label: "鍵交換代" },
    { key: "design", label: "設計料" },
    { key: "bankCost", label: "銀行諸費用" },
  ],
};

/** 経費の費目（全タイプ共通） */
export const EXPENSE_ITEMS: ItemDef[] = [
  { key: "publicCharge", label: "公共負担金" },
  { key: "fireInsurance", label: "火災保険" },
  { key: "flatCert", label: "フラット適合証明書", note: "旧耐震取得可能案件のみ" },
  { key: "defectInsurance", label: "瑕疵保険加入費用", note: "1件10万円" },
  { key: "removal", label: "家財撤去・庭木伐採" },
];

/** 販売経費の費目（全タイプ共通） */
export const SELLING_ITEMS: ItemDef[] = [
  { key: "sellBrokerage", label: "販売時仲介手数料", auto: "brokerage", note: "3%+6万円" },
  { key: "advertising", label: "広告費（チラシ・ポータル等）" },
  { key: "consumptionTax", label: "販売時消費税不足分" },
  { key: "mgmtRepair", label: "管理費・修繕費" },
];

/** 全費目（タイプを跨いだ）からラベルを引く */
export function labelOf(type: PropertyType, group: "acq" | "exp" | "sell", key: string): string {
  const list =
    group === "acq" ? ACQUISITION_ITEMS[type] : group === "exp" ? EXPENSE_ITEMS : SELLING_ITEMS;
  return list.find((i) => i.key === key)?.label ?? key;
}
