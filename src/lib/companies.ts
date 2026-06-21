// ============================================================
// 会社マスタ初期データ
// ※ 仕様で必須の2社のみ登録。住所・代表者は設定画面で入力する想定の
//   プレースホルダ（個人情報・実住所はハードコードしない）。
// ============================================================
import { Company } from "./types";

export const INITIAL_COMPANIES: Company[] = [
  {
    id: "yukari",
    name: "ゆかり株式会社",
    address: "",
    representative: "",
    role: "買取再販の主体（取得・再販を行う発行体）",
  },
  {
    id: "vivi",
    name: "ViVi不動産株式会社",
    address: "",
    representative: "",
    role: "仲介（売買仲介・仲介手数料を受領）",
  },
];

export const DEFAULT_COMPANY_ID = "yukari";
