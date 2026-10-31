// ============================================================
// お客様向け書類の既定文
//
// 買取査定書の「前提条件」と買取保証書の「保証の条件」の初期値。
// 案件ごとに画面上で編集できる（ここは“最初に入っている文”にすぎない）。
//
// ※ 買取保証書の条件文言は、最初の1枚を発行する前に社内確認が必要なため、
//   画面上に確認を促す注意書きを出す（PDFには何も印字しない）。
// ============================================================
import { addDays, addMonths, today } from "./format";
import { DocSettings } from "./types";

/** 買取査定書の前提条件（初期値） */
export const DEFAULT_CONDITIONS: string[] = [
  "本物件は現況有姿のままお引渡しいただくものとし、弊社から修補のご請求はいたしません。",
  "売主様の契約不適合責任は免責とさせていただきます。",
  "室内を確認する前にご提示している場合は、確認後に買取価格を変更させていただくことがあります。",
  "残置物（家財・設備等）は売主様にて撤去のうえお引渡しください。弊社にて処分する場合は、別途ご相談のうえ価格を調整いたします。",
  "境界の明示および確定測量は行わないものとし、現況の境界のままお引渡しいただきます。確定測量をご希望の場合は、費用のご負担について別途ご相談ください。",
  "お引渡しの時期は、売主様のご都合をうかがったうえで、売買契約時に取り決めさせていただきます。",
];

/** 買取保証書の保証の条件（初期値） */
export const DEFAULT_GUARANTEE_CONDITIONS: string[] = [
  "保証期間中、媒介契約が継続していること。",
  "保証期間中に、本物件の状態に大きな変化（滅失・毀損・用途の変更等）がないこと。",
  "その他の前提条件は、買取査定書に記載の前提条件と同じといたします。",
];

/**
 * 媒介をする会社の既定値。
 * 買取をするのは発行会社（ゆかり株式会社）、媒介をするのは ViVi不動産株式会社 と役割が分かれるため、
 * 買取保証書では両者を書き分ける。
 */
export const DEFAULT_MEDIATION_COMPANY = "ViVi不動産株式会社";

/** 買取査定書の有効期限の既定日数（発行日から） */
export const VALID_DAYS = 30;
/** 買取保証書の保証期限の既定月数（媒介契約日から） */
export const GUARANTEE_MONTHS = 3;

/**
 * 書類設定の初期値。
 * 発行日は作成日、有効期限は発行日から30日。保証期限は媒介契約日を入れると自動で3か月後が入る。
 * 売主様側の仲介手数料の有無は、発行会社と取引形態で変わるため空欄で始める
 * （未選択のあいだは買取査定書のPDFを出さない）。
 */
export function defaultDocSettings(): DocSettings {
  const issueDate = today();
  return {
    sellerName: "",
    issueDate,
    validUntil: addDays(issueDate, VALID_DAYS),
    conditions: [...DEFAULT_CONDITIONS],
    sellerFee: "",
    guaranteeConditions: [...DEFAULT_GUARANTEE_CONDITIONS],
    mediationCompany: DEFAULT_MEDIATION_COMPANY,
    brokerageMonths: "",
    purchaseMonths: "",
  };
}

/** 媒介契約日から保証期限（既定3か月後）を求める */
export function defaultGuaranteeUntil(mediationDate: string | undefined): string {
  if (!mediationDate) return "";
  return addMonths(mediationDate, GUARANTEE_MONTHS);
}
