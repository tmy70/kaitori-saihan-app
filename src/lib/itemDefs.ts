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
    { key: "purchase", label: "仕入代（買取価格）" },
    { key: "buyFee", label: "購入時手数料（満額）" },
    { key: "registration", label: "登記費用・印紙代" },
    { key: "reform", label: "リフォーム費用" },
    { key: "fixedTaxProration", label: "固都税精算金", auto: "taxProration" },
    { key: "acquisitionTax", label: "不動産取得税", auto: "acquisitionTax", note: "評価額×土地1.5%・建物3%" },
    { key: "keyChange", label: "鍵交換代" },
    { key: "design", label: "設計料" },
    { key: "bankCost", label: "銀行諸費用" },
  ],
  land: [
    { key: "purchase", label: "仕入代（買取価格）" },
    { key: "buyFee", label: "購入時手数料（満額）" },
    { key: "registration", label: "登記費用・印紙代" },
    { key: "demolition", label: "建物解体費用" },
    { key: "fixedTaxProration", label: "固都税精算金", auto: "taxProration" },
    { key: "acquisitionTax", label: "不動産取得税", auto: "acquisitionTax" },
    { key: "bankCost", label: "銀行諸費用" },
  ],
  kenuri: [
    { key: "purchase", label: "仕入代（買取価格）" },
    { key: "buyFee", label: "購入時手数料（満額）" },
    { key: "registration", label: "登記費用・印紙代" },
    { key: "demolition", label: "建物解体費用" },
    { key: "fixedTaxProration", label: "固都税精算金", auto: "taxProration" },
    { key: "acquisitionTax", label: "不動産取得税", auto: "acquisitionTax" },
    { key: "construction", label: "建物建築費用" },
    { key: "groundImprovement", label: "地盤改良工事費用" },
    { key: "bankCost", label: "銀行諸費用" },
  ],
  mansion: [
    { key: "purchase", label: "仕入代（買取価格）" },
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
  // 分譲地：用地取得にかかる原価（造成費は経費側にまとめる）
  subdivision: [
    { key: "purchase", label: "仕入代（用地買取価格）" },
    { key: "buyFee", label: "購入時手数料（満額）" },
    { key: "registration", label: "登記費用・印紙代" },
    { key: "demolition", label: "既存建物解体費用" },
    { key: "fixedTaxProration", label: "固都税精算金", auto: "taxProration" },
    { key: "acquisitionTax", label: "不動産取得税", auto: "acquisitionTax" },
    { key: "bankCost", label: "銀行諸費用" },
  ],
};

/** 経費の共通費目（全タイプ） */
const EXPENSE_COMMON: ItemDef[] = [
  { key: "publicCharge", label: "公共負担金" },
  { key: "fireInsurance", label: "火災保険" },
  { key: "flatCert", label: "フラット適合証明書", note: "旧耐震取得可能案件のみ" },
  { key: "defectInsurance", label: "瑕疵保険加入費用", note: "1件10万円" },
  { key: "removal", label: "家財撤去・庭木伐採" },
];

/**
 * 経費に含める造成・整備系の費目（全タイプ共通）。
 * 以前は土地・建売で取得原価側にも同等項目があり重複していたため、経費側に統一した。
 */
const EXPENSE_SITEWORK: ItemDef[] = [
  { key: "expBoundary", label: "境界確定費用（分筆登記費用）" },
  { key: "expWaterSupply", label: "上下水道引き込み費用" },
  { key: "expExterior", label: "外構工事費用" },
];

/**
 * 経費の費目（タイプ別）。
 * 「その他自由記載項目」は各グループ共通の「＋費目を追加」ボタンで自由に追加できる。
 */
/**
 * 分譲地の造成・整備費（経費）。区画分譲のための造成計画の中心となる費目群。
 * 「金額の入っていない費目は印刷で非表示」になるため、該当しない項目は0のままでよい。
 */
const EXPENSE_DEVELOPMENT: ItemDef[] = [
  { key: "devPermit", label: "開発許可申請費用", note: "都市計画法29条等" },
  { key: "survey", label: "測量・区画割設計費用" },
  { key: "devEarthwork", label: "造成工事費（整地・盛土切土）" },
  { key: "devRoad", label: "道路築造工事費" },
  { key: "devWaterMain", label: "上下水道本管・引込工事費" },
  { key: "devUtility", label: "電気・ガス・通信引込費用" },
  { key: "devDrainage", label: "排水・調整池・雨水設備費用" },
  { key: "retainingWall", label: "擁壁・法面工事費用" },
  { key: "subdivisionReg", label: "分筆・地目変更登記費用" },
  { key: "infraContribution", label: "公共施設負担金・受益者負担金" },
];

export const EXPENSE_ITEMS: Record<PropertyType, ItemDef[]> = {
  building: [...EXPENSE_COMMON, ...EXPENSE_SITEWORK],
  land: [...EXPENSE_COMMON, ...EXPENSE_SITEWORK],
  kenuri: [...EXPENSE_COMMON, ...EXPENSE_SITEWORK],
  mansion: [...EXPENSE_COMMON, ...EXPENSE_SITEWORK],
  // 分譲地は造成費が主役。共通費（火災保険等）も使えるよう末尾に付ける。
  subdivision: [...EXPENSE_DEVELOPMENT, { key: "fireInsurance", label: "火災保険" }, { key: "removal", label: "家財撤去・庭木伐採" }],
};

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
    group === "acq" ? ACQUISITION_ITEMS[type] : group === "exp" ? EXPENSE_ITEMS[type] : SELLING_ITEMS;
  return list.find((i) => i.key === key)?.label ?? key;
}
