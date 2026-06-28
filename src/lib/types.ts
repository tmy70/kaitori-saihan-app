// ============================================================
// アプリ全体で使う型定義
// 金額の単位は原則「万円」（PDF/事業計画書出力時のみ円換算する）
// ============================================================

/** 物件タイプ（5種） */
export type PropertyType = "building" | "land" | "kenuri" | "mansion" | "subdivision";

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  building: "建物リフォーム再販",
  land: "土地再販",
  kenuri: "建売（新築建売）",
  mansion: "マンション再販",
  subdivision: "分譲地（造成・区画分譲）",
};

/**
 * 分譲地の1区画（造成して区画分譲する際の販売単位）。
 * 区画ごとに面積・坪単価を持ち、販売価格＝坪数×坪単価（万円）で自動算出する。
 */
export interface Lot {
  id: string;
  name: string; // 区画名・番号（例: A区画 / 1号地）
  areaSqm?: number; // 区画面積（㎡）
  tsubo?: number; // 区画の坪数（㎡から自動換算・手入力可）
  unitPrice?: number; // 坪単価（万円/坪）
}

/** 会社（発行体）マスタ */
export interface Company {
  id: string;
  name: string; // 例: ゆかり株式会社
  address?: string;
  representative?: string; // 代表者名
  role?: string; // 役割（買取再販主体 / 仲介 等）メモ
  logoDataUrl?: string; // ロゴ画像（任意・Data URL）
}

/**
 * 費目（取得原価・経費・販売経費の各項目）
 * key: 内部キー、value: 金額（万円）
 */
export type ItemValues = Record<string, number>;

/**
 * ユーザーが手動で追加した費目（追加費目）
 * key: 内部キー（金額は ItemValues 側に同じ key で格納する）
 * label: 表示名（手打ち編集可）
 */
export interface CustomItem {
  key: string;
  label: string;
}

/** 計算書の入力データ */
export interface CalcInput {
  propertyType: PropertyType;
  sellPrice: number; // 販売価格（万円）入力
  // 取得原価の費目（タイプ別。キーは itemDefs.ts と対応）
  acquisition: ItemValues;
  // 経費の費目
  expenses: ItemValues;
  // 販売経費の費目
  selling: ItemValues;
  // 各グループの追加費目（ユーザーが手動で足した費目の表示名定義）
  acquisitionExtra?: CustomItem[];
  expensesExtra?: CustomItem[];
  sellingExtra?: CustomItem[];
  // 補助計算用の入力
  assessedValueLand?: number; // 不動産取得税: 土地評価額（万円）
  assessedValueBuilding?: number; // 不動産取得税: 建物評価額（万円）
  taxProrationDays?: number; // 固都税精算の日数
  taxAnnualAmount?: number; // 固都税の年額（万円）
  // 坪単価計算用（土地・マンションで使用）
  areaSqm?: number; // 面積（㎡）。土地は土地面積、マンションは専有面積
  tsubo?: number; // 坪数。面積㎡から自動換算（㎡×0.3025）するが手入力でも上書き可
  // PDF出力オプション
  showZeroInPdf?: boolean; // true で金額0・未入力の費目もPDFに表示（既定: 非表示で1ページに収める）
  // 連結利益用
  groupBrokerage?: boolean; // true: 自社グループが販売仲介し、受取仲介手数料を連結利益に加算する
  // 分譲地（subdivision）用：区画一覧。総販売価格は各区画の合計（sellPrice に反映）
  lots?: Lot[];
}

/** 計算結果（自動算出） */
export interface CalcResult {
  acquisitionCost: number; // 取得原価合計
  expensesTotal: number; // 経費合計
  costOfSales: number; // 売上原価 = 取得原価 + 経費
  grossProfit: number; // 粗利益 = 販売価格 - 売上原価
  grossMargin: number; // 粗利率（0〜1）
  sellingExpenses: number; // 販売経費合計
  operatingProfit: number; // 営業利益 = 粗利益 - 販売経費
  operatingMargin: number; // 営業利益率（0〜1）
}

/**
 * チェック項目の判定状態（3段階）
 *  - ok:      適合（基準クリア）
 *  - fixable: 是正可能（今はNGだが補修・是正でクリアできる＝合格に算入）
 *  - ng:      不適合（是正困難・致命的）
 */
export type ChecklistStatus = "ok" | "fixable" | "ng";

/** 稟議書: 購入チェックリストの1項目 */
export interface ChecklistItem {
  id: number;
  /** 安定キー（物件種別をまたいで同一項目を識別。予備項目は spare-* ） */
  key: string;
  label: string;
  /** OK/NGの判定基準（数値含む。画面で編集可・各項目の下に常時表示） */
  criteria?: string;
  /** 予備項目（ユーザー追加・ラベル編集可/削除可） */
  custom?: boolean;
  /** 判定状態（適合/是正可能/不適合）。是正可能は合格に算入する */
  status: ChecklistStatus;
}

/** 稟議書: 再販スケジュールの1ステップ（日付） */
export interface ScheduleStep {
  key: string;
  label: string;
  date: string; // YYYY-MM-DD
}

/** 稟議書データ */
export interface RingiData {
  submitDate: string; // 提出日
  staff: string; // 担当者
  // 物件情報
  propertyName: string; // 買取希望物件名
  address: string; // 物件所在地
  propertyKind: string; // 物件種別（自由記述）
  sellerName: string; // 売主氏名・連絡先
  inquirySource: string; // 反響入口
  sellReason: string; // 売却希望理由（注意点・阻害要因等）
  // 物件スペック
  landArea: string;
  buildingArea: string;
  buildingAge: string;
  structure: string;
  parking: string;
  // マンション情報
  floor: string;
  exclusiveArea: string;
  hasElevator: boolean;
  cornerRoom: boolean;
  mansionParking: string;
  // 査定情報
  sellerHopePrice: string;
  assessMethod1: string;
  assessMethod2: string;
  appealPoint: string;
  rosenka: string; // 路線価
  // チェックリスト・スケジュール
  checklist: ChecklistItem[];
  /** 購入判定の合格ライン（このOK数以上で「合格」。種別ごとの既定値あり・編集可） */
  checklistPassLine?: number;
  schedule: ScheduleStep[];
  // 承認欄メモ（氏名等は任意）
  approverStaff: string;
  approverManager: string;
  approverPresident: string;
}

/** 価格変更シミュレーションの1シナリオ */
export interface SimScenario {
  id: string;
  label: string; // 例: 強気 / 標準 / 弱気
  sellPriceDelta: number; // 販売価格の増減（万円。基準からの差）
  costDelta: number; // 主要原価（仕入＋リフォーム等）の増減（万円）
}

/** 事業計画書（生成結果） */
export interface PlanDoc {
  body: string; // AI生成 or 手動編集された本文（Markdown/プレーン）
  generatedAt?: string;
  edited?: boolean;
}

/** 案件（プロジェクト）— IndexedDB保存単位 */
export interface Project {
  id: string;
  companyId: string; // 発行会社
  name: string; // 案件名
  /** サンプル（テンプレート）かどうか。マイ案件と区別する印 */
  isSample?: boolean;
  propertyType: PropertyType;
  calc: CalcInput;
  ringi: RingiData;
  scenarios: SimScenario[];
  bankPlan?: PlanDoc; // 銀行提出用
  internalPlan?: PlanDoc; // 社内方針確認用
  createdAt: string;
  updatedAt: string;
}

/** アプリ設定 */
export interface AppSettings {
  defaultCompanyId: string;
  theme: "light" | "dark";
}
