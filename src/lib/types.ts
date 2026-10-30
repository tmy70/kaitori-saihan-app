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
  // 面積（坪単価計算・稟議書への自動転記に使用）
  areaSqm?: number; // 主たる面積（㎡）。土地系は土地面積、マンションは専有面積
  tsubo?: number; // 坪数。面積㎡から自動換算（㎡×0.3025）するが手入力でも上書き可
  buildingAreaSqm?: number; // 建物（戸建）面積（㎡）。建物リフォーム再販・建売で使用
  // PDF出力オプション
  showZeroInPdf?: boolean; // true で金額0・未入力の費目もPDFに表示（既定: 非表示で1ページに収める）
  /**
   * 費目ごとのPDF表示の上書き。キーは `${group}:${key}`（group=acquisition|expenses|selling）。
   * true=必ず表示 / false=必ず非表示 / 未設定=既定（金額0は非表示・0以外は表示）。
   */
  pdfVisible?: Record<string, boolean>;
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

// ---------------- 銀行提出用（買取決定後のみ入力する） ----------------

/** 事業スケジュールの1行（契約・決済・工事・販売・返済） */
export interface BankScheduleRow {
  key: string;
  label: string;
  /** 時期（YYYY-MM-DD または「2026年6月頃」などの自由記述） */
  when: string;
}

/** 銀行提出用の既定スケジュール行 */
export const BANK_SCHEDULE_ROWS: { key: string; label: string }[] = [
  { key: "contract", label: "売買契約" },
  { key: "settlement", label: "決済・引渡し（取得）" },
  { key: "construction", label: "工事着工〜完了" },
  { key: "sales", label: "販売開始" },
  { key: "saleSettlement", label: "売却決済" },
  { key: "repayment", label: "借入金の返済" },
];

/**
 * 銀行が求める項目に絞った入力。細かい入力はここだけに集約する。
 * 金額は万円（PDF出力時に円へ換算する）。
 */
export interface BankData {
  // 対象不動産の概要
  /** 地番 */
  lotNumber?: string;
  /** 地目 */
  landCategory?: string;
  /** 構造・階数 */
  structure?: string;
  /** 用途地域 */
  useDistrict?: string;
  /** 建蔽率（%） */
  buildingCoverage?: string;
  /** 容積率（%） */
  floorAreaRatio?: string;
  /** 接道状況 */
  roadAccess?: string;
  /** 用途（居住用・事業用など） */
  usage?: string;

  // 販売計画
  /** 販売時期 */
  saleTiming?: string;
  /** 販売方法・販売経路の補足 */
  saleMethod?: string;

  // 資金計画
  /** 借入希望額（万円） */
  loanAmount?: number;
  /** 自己資金（万円） */
  ownFunds?: number;
  /** 返済原資 */
  repaymentSource?: string;
  /** 返済時期 */
  repaymentTiming?: string;

  /** 事業スケジュール */
  schedule?: BankScheduleRow[];
}

/** 事業計画書（生成結果） */
export interface PlanDoc {
  body: string; // AI生成 or 手動編集された本文（Markdown/プレーン）
  generatedAt?: string;
  edited?: boolean;
}

/**
 * 案件の進行ステージ（買取再販のライフサイクル）
 *  - assessing: 査定中（価格を出している最中。まだお客様に提示していない）
 *  - offered:   提示中（買取査定書をお渡しし、返事待ち）
 *  - decided:   買取決定（買うと決めた。稟議・銀行用の入力が始まる）
 *  - acquired:  在庫（買取済。仕入決済が終わり、保有中）
 *  - settled:   決済完了（再販売の決済が終わり、損益が確定した）
 *
 * ※ 旧ステージ "reviewing"（検討中）は "assessing" に読み替える（stageOf 参照）。
 */
export type ProjectStage = "assessing" | "offered" | "decided" | "acquired" | "settled";

/** 表示順（一覧タブ・ステージ選択の並び） */
export const STAGE_ORDER: ProjectStage[] = [
  "assessing",
  "offered",
  "decided",
  "acquired",
  "settled",
];

export const STAGE_LABELS: Record<ProjectStage, string> = {
  assessing: "査定中",
  offered: "提示中",
  decided: "買取決定",
  acquired: "在庫（買取済）",
  settled: "決済完了",
};

/** 一覧タブなど幅の限られた場所で使う短い表記 */
export const STAGE_SHORT_LABELS: Record<ProjectStage, string> = {
  assessing: "査定中",
  offered: "提示中",
  decided: "買取決定",
  acquired: "在庫",
  settled: "決済済",
};

/** 買取決定以降か（稟議・銀行用の入力画面を出す段階） */
export function isDecidedOrLater(stage: ProjectStage): boolean {
  return stage === "decided" || stage === "acquired" || stage === "settled";
}

// ---------------- 査定（査定中・提示中に使う入力） ----------------

/**
 * 査定入力。査定の場で手早く埋められるよう項目を絞っている。
 * ここから買取価格を逆算し（calc.ts の reverseBuyPrice）、お客様向け書類に流し込む。
 * 金額はすべて万円。
 */
export interface AssessmentInput {
  /** 再販想定価格（万円） */
  resalePrice: number;
  /** 工事費（リフォーム／解体／建築／造成）の概算（万円）。種別ごとの目安が初期値 */
  workCost: number;
  /** 仲介で売った場合の査定価格（万円）。比較表に使う。任意 */
  brokerAssessPrice?: number;
  /** 所在地 */
  address?: string;
  /** 土地面積（m2） */
  landAreaSqm?: number;
  /** 建物面積（m2） */
  buildingAreaSqm?: number;
  /** 築年（例: 1998年 / 築25年。自由記述） */
  buildingAge?: string;
  /** 担当者名 */
  staff?: string;
  /** 概算の上書き（未設定なら種別ごとの目安額を使う） */
  registration?: number;
  taxProration?: number;
  acquisitionTax?: number;
  otherAcquisition?: number;
  expenses?: number;
  sellingOther?: number;
  /** 購入時手数料（買取価格×3%＋6万円）を見込むか。既定 true */
  includeBuyFee?: boolean;
  /**
   * 購入時手数料の上書き（万円）。
   * 設定すると買取価格に連動せず、この固定額で見込む（値引き・満額でない場合など）。
   * 既存案件の読み込み時、計算書の額が計算式と違う場合はここに保持して数字を変えない。
   */
  buyFee?: number;
  /** 販売時仲介手数料を見込まない（自社グループで販売する）場合 true */
  noSellBrokerage?: boolean;
  /**
   * 販売時仲介手数料の上書き（万円）。
   * 未設定なら再販想定価格から自動計算（×3%＋6万円）する。
   * 既存案件を読み込んだ際、計算書に入っていた額が自動計算と違う場合はここに保持して
   * 表示上の数字が変わらないようにする。
   */
  sellBrokerage?: number;
  /** 提示する買取価格（万円）。利益ラインを選ぶと入り、手入力で上書きもできる */
  offerPrice?: number;
  /** 選んだ利益ライン（万円）。手入力で価格を変えた場合は undefined */
  selectedProfitLine?: number;
}

// ---------------- お客様向け書類の設定 ----------------

/**
 * 売主様側の仲介手数料の有無。
 * 発行会社と取引形態で変わるため案件ごとに選ぶ。未選択（""）のあいだは買取査定書を出さない。
 */
export type SellerFeeChoice = "" | "none" | "charged";

export const SELLER_FEE_LABELS: Record<Exclude<SellerFeeChoice, "">, string> = {
  none: "不要（弊社が直接買い取るため、売主様に仲介手数料はかかりません）",
  charged: "必要（別途、媒介契約に基づく仲介手数料を申し受けます）",
};

/** お客様向け書類（買取査定書・買取保証書・比較表）の記載内容 */
export interface DocSettings {
  /** 宛名（売主様氏名）。「様」は書類側で付ける */
  sellerName?: string;
  /** 発行日 YYYY-MM-DD */
  issueDate?: string;
  /** 買取査定書の有効期限 YYYY-MM-DD（既定：発行日＋30日） */
  validUntil?: string;
  /** 前提条件（1行＝1項目）。既定文を入れ、案件ごとに編集できる */
  conditions?: string[];
  /** 売主様側の仲介手数料の有無 */
  sellerFee?: SellerFeeChoice;

  /** 買取保証書：保証価格（万円）。未入力なら提示価格を使う */
  guaranteePrice?: number;
  /** 買取保証書：媒介契約日 YYYY-MM-DD */
  mediationDate?: string;
  /** 買取保証書：保証期限 YYYY-MM-DD（既定：媒介契約日＋3か月） */
  guaranteeUntil?: string;
  /** 買取保証書：保証の条件（1行＝1項目） */
  guaranteeConditions?: string[];

  /** 比較表：仲介で売る場合の期間の目安（自由記述。空欄なら「状況により異なります」と表示） */
  brokerageMonths?: string;
}

/**
 * 実績データ（買取後〜再販売完了時に確定する数値）。
 * 計画（Project.calc）と同じ構造の CalcInput を持つことで、
 * 同じ計算ロジック（calculate）で確定粗利・確定営業利益を算出し、
 * 費目単位で「計画 vs 実績」の差異を比較できる。
 */
export interface ActualData {
  /** 買取（仕入）決済日 YYYY-MM-DD */
  purchaseDate?: string;
  /** 再販売の決済日（売却完了日） YYYY-MM-DD */
  settleDate?: string;
  /** 実績の計算入力。「計画からコピー」で初期化し、確定額に書き換えていく */
  calc?: CalcInput;
  /** 差異メモ（追加工事・値引きの経緯など） */
  note?: string;
}

/** 案件（プロジェクト）— IndexedDB保存単位 */
export interface Project {
  id: string;
  companyId: string; // 発行会社
  name: string; // 案件名
  /** サンプル（テンプレート）かどうか。マイ案件と区別する印 */
  isSample?: boolean;
  /** お気に入り（星マーク）。一覧の「お気に入り」タブで絞り込む */
  favorite?: boolean;
  /** 進行ステージ。未設定は "assessing"（査定中）として扱う */
  stage?: ProjectStage;
  /** 査定入力（査定中・提示中の主画面）。旧データは calc から導出して補う */
  assessment?: AssessmentInput;
  /** お客様向け書類の記載内容 */
  docs?: DocSettings;
  /** 銀行提出用の入力（買取決定後に埋める） */
  bank?: BankData;
  /** アーカイブ済み。通常のタブから隠し、「アーカイブ」タブで復元・完全削除できる */
  archived?: boolean;
  /** 実績（最終経費・確定粗利）。決済完了時に記録する */
  actual?: ActualData;
  /**
   * @deprecated 旧「買取完了」タグ。stage へ統合したため、読み込み時に stage="acquired" へ移行する。
   * 既存データを読めるように型だけ残している（新規書き込みはしない）。
   */
  acquired?: boolean;
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
