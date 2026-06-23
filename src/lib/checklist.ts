// ============================================================
// 稟議書: 購入チェックリスト（物件種別別）と再販スケジュール（9ステップ）
//
// 設計方針:
//  ・物件種別（戸建リフォーム/土地/建売/マンション）ごとに「表示する項目」と
//    「OK/NGの判定基準（数値）」を切り替える。
//  ・各項目には criteria（基準）を持たせ、画面・PDFで常時表示する。
//  ・基準は社内標準を既定値として持ちつつ、案件ごとに画面で編集できる。
//  ・予備項目（custom）はユーザーがラベルを手打ちで追加・編集できる。
// ============================================================
import { ChecklistItem, ChecklistStatus, PropertyType, ScheduleStep } from "./types";

/**
 * チェックリスト項目のマスタ定義。
 *  - types: この項目を表示する物件種別
 *  - criteria: 種別ごとの判定基準（数値）。未指定の種別は criteriaAll を使う
 *  - criteriaAll: 全種別共通の判定基準（criteria に種別別指定がある場合はそちらが優先）
 */
export interface ChecklistDef {
  key: string;
  label: string;
  types: PropertyType[];
  criteria?: Partial<Record<PropertyType, string>>;
  criteriaAll?: string;
}

const ALL: PropertyType[] = ["building", "land", "kenuri", "mansion"];

/** 購入チェックリストのマスタ定義（社内標準の既定値） */
export const CHECKLIST_DEFS: ChecklistDef[] = [
  {
    key: "super",
    label: "スーパーが徒歩圏内にあるか",
    types: ALL,
    criteriaAll: "徒歩15分以内 または 半径1km圏内",
  },
  {
    key: "buyPrice",
    label: "買取価格が基準内か",
    types: ALL,
    criteria: {
      building: "800万円以下（築20年以上）※築20年未満・任売は別途稟議",
      land: "事業計画の利益基準を満たす仕入価格",
      kenuri: "事業計画の利益基準を満たす仕入価格",
      mansion: "事業計画の利益基準を満たす仕入価格",
    },
  },
  {
    key: "reformBudget",
    label: "リフォーム・建築予算が基準内か",
    types: ["building", "kenuri", "mansion"], // 土地は建物が無いため非表示
    criteria: {
      building: "リフォーム予算 700万円以内",
      mansion: "リフォーム予算 300万円以内",
      kenuri: "建築予算が事業計画の範囲内",
    },
  },
  {
    key: "area",
    label: "面積が基準を満たすか",
    types: ALL,
    criteria: {
      building: "土地100㎡以上・建物70㎡以上",
      land: "土地100㎡以上",
      kenuri: "土地100㎡以上（建物70㎡以上を確保）",
      mansion: "専有面積60㎡以上",
    },
  },
  {
    key: "parking",
    label: "駐車場を確保できるか",
    types: ALL,
    criteria: {
      building: "市内中心地1台以上／郊外2台以上",
      land: "市内中心地1台以上／郊外2台以上",
      kenuri: "市内中心地1台以上／郊外2台以上",
      mansion: "1台以上確保（空き区画・機械式可）",
    },
  },
  {
    key: "sellPrice",
    label: "売り出し価格が基準内か",
    types: ALL,
    criteria: {
      building: "1800万円以内（月々返済5万円以内）",
      land: "需要価格帯（事業計画の範囲内）",
      kenuri: "需要価格帯（事業計画の範囲内）",
      mansion: "管理費等込みで妥当な支払い価格帯",
    },
  },
  {
    key: "layout",
    label: "3LDKの間取りが確保できるか",
    types: ["building", "kenuri", "mansion"], // 土地は非表示
    criteriaAll: "リフォーム/プランで3LDKを確保（地域需要に合致）",
  },
  {
    key: "ground",
    label: "地盤良好・災害想定区域外か",
    types: ALL,
    criteriaAll: "地盤良好／津波・洪水・土砂災害の想定区域外",
  },
  {
    key: "sunlight",
    label: "日当たり良好か",
    types: ALL,
    criteriaAll: "主要居室の採光・日照が良好",
  },
  {
    key: "profit",
    label: "利益が基準を満たすか",
    types: ALL,
    criteriaAll: "粗利益250万円以上 または 粗利率30%以上",
  },
  {
    key: "neighbors",
    label: "周辺に要注意人物がいないか",
    types: ALL,
    criteriaAll: "近隣トラブル・要注意人物なし",
  },
  {
    key: "assessArea",
    label: "査定対応エリア内の物件か",
    types: ALL,
    criteriaAll: "査定無料の対応エリア内",
  },
  {
    key: "tilt",
    label: "建物の傾きが基準内か",
    types: ["building"], // 既存建物のみ
    criteriaAll: "10/1000以内（超過時は不陸調整で修復可能か）",
  },
  {
    key: "foundationOuter",
    label: "基礎（外観）に問題がないか",
    types: ["building"],
    criteriaAll: "ひび割れ・欠損・剥離なし",
  },
  {
    key: "foundationUnder",
    label: "床下基礎に問題がないか",
    types: ["building"],
    criteriaAll: "腐朽・湿気・蟻道なし",
  },
  {
    key: "attic",
    label: "屋根裏に問題がないか",
    types: ["building"],
    criteriaAll: "雨染み・小屋組の損傷なし",
  },
  {
    key: "leak",
    label: "雨漏りがないか",
    types: ["building", "mansion"],
    criteriaAll: "天井・壁に雨漏り跡なし",
  },
  {
    key: "termite",
    label: "シロアリ被害がないか（クロアリ含む）",
    types: ["building"],
    criteriaAll: "蟻害・被害痕なし",
  },
  {
    key: "boundary",
    label: "越境・境界問題がないか",
    types: ["building", "land", "kenuri"], // マンションは非表示
    criteriaAll: "越境なし・境界明示済",
  },
  {
    key: "water",
    label: "上下水道の引込状況",
    types: ["building", "land", "kenuri"],
    criteriaAll: "本管引込済（井戸・汲取り・浄化槽は要確認）",
  },
  {
    key: "piping",
    label: "配管に問題がないか",
    types: ["building", "mansion"],
    criteriaAll: "給排水管の劣化・詰まりなし",
  },
  {
    key: "wall",
    label: "擁壁に問題がないか",
    types: ["building", "land", "kenuri"],
    criteriaAll: "擁壁の不適格・劣化・要改修なし",
  },
  {
    key: "confirm",
    label: "確認申請がされているか",
    types: ["building", "kenuri"],
    criteriaAll: "確認済証・検査済証あり",
  },
  {
    key: "illegal",
    label: "違法建築・未登記増築がないか",
    types: ["building"], // 新築建売は非表示
    criteriaAll: "建築図面と相違なし・違法増築なし",
  },
  {
    key: "accident",
    label: "事故物件ではないか",
    types: ALL,
    criteriaAll: "心理的瑕疵・告知事項なし",
  },
  {
    key: "mgmtFee",
    label: "管理費・修繕積立金込みの支払いが基準内か",
    types: ["mansion"], // マンションのみ
    criteriaAll: "管理費・修繕費込みで月々6万円台",
  },
];

/** その種別での判定基準を引く */
function criteriaFor(def: ChecklistDef, type: PropertyType): string {
  return def.criteria?.[type] ?? def.criteriaAll ?? "";
}

/**
 * 物件種別ごとの「合格ライン」（このOK数以上で購入可＝合格と判定）の既定値。
 * 予備項目を除く基本項目数（建物25/土地14/建売17/マンション16）を踏まえた社内標準。
 * 画面で案件ごとに編集できる。
 */
export const DEFAULT_PASS_LINE: Record<PropertyType, number> = {
  building: 23,
  land: 13,
  kenuri: 15,
  mansion: 14,
};

/** 種別の合格ライン既定値 */
export function defaultPassLine(type: PropertyType): number {
  return DEFAULT_PASS_LINE[type];
}

/** その種別の基本項目数（予備項目を除く＝合格ラインの満点目安） */
export function coreItemCount(type: PropertyType): number {
  return CHECKLIST_DEFS.filter((d) => d.types.includes(type)).length;
}

/** 物件種別に応じた初期チェックリストを生成（全て不適合=ng。予備項目を1つ付与） */
export function createChecklist(type: PropertyType): ChecklistItem[] {
  let id = 0;
  const items: ChecklistItem[] = CHECKLIST_DEFS.filter((d) => d.types.includes(type)).map((d) => ({
    id: ++id,
    key: d.key,
    label: d.label,
    criteria: criteriaFor(d, type),
    status: "ng",
  }));
  // 予備項目（手打ち編集可）
  items.push({ id: ++id, key: "spare-1", label: "（予備項目）", criteria: "", status: "ng", custom: true });
  return items;
}

/** 旧データ（ok:boolean）も含めて判定状態を取り出す */
function statusOf(it: { status?: ChecklistStatus; ok?: boolean } | undefined): ChecklistStatus {
  if (!it) return "ng";
  if (it.status === "ok" || it.status === "fixable" || it.status === "ng") return it.status;
  return it.ok ? "ok" : "ng"; // 旧 ok:boolean からの移行
}

/**
 * 既存のチェックリストを物件種別に合わせて再構成する。
 *  ・種別に該当する項目だけを表示し、不要な項目は除く
 *  ・同一 key の既存項目があれば 判定状態/基準編集 を引き継ぐ
 *  ・予備項目（custom）はすべて保持する
 *  ・key を持たない旧データ（ok:boolean）はラベル一致で判定を引き継ぐ
 */
export function reconcileChecklist(
  stored: ChecklistItem[] | undefined,
  type: PropertyType
): ChecklistItem[] {
  const list = stored ?? [];
  const byKey = new Map(list.filter((i) => i.key).map((i) => [i.key, i]));
  const byLabel = new Map(list.map((i) => [i.label, i]));

  let id = 0;
  const base: ChecklistItem[] = CHECKLIST_DEFS.filter((d) => d.types.includes(type)).map((d) => {
    const prev = byKey.get(d.key) ?? byLabel.get(d.label);
    return {
      id: ++id,
      key: d.key,
      label: d.label,
      // 基準は編集済みがあれば維持、無ければ既定値
      criteria: prev?.criteria ?? criteriaFor(d, type),
      status: statusOf(prev),
    };
  });

  // 予備項目（custom）の引き継ぎ。無ければ既定の空予備を1つ付与。
  const customs = list.filter((i) => i.custom);
  if (customs.length > 0) {
    for (const c of customs) {
      base.push({
        id: ++id,
        key: c.key,
        label: c.label,
        criteria: c.criteria ?? "",
        custom: true,
        status: statusOf(c),
      });
    }
  } else {
    base.push({ id: ++id, key: "spare-1", label: "（予備項目）", criteria: "", status: "ng", custom: true });
  }
  return base;
}

/** 予備項目を1つ追加した新しいチェックリストを返す */
export function addSpareItem(items: ChecklistItem[]): ChecklistItem[] {
  const maxId = items.reduce((m, i) => Math.max(m, i.id), 0);
  // 既存の spare-* と衝突しない key を採番
  const spareNums = items
    .filter((i) => i.key.startsWith("spare-"))
    .map((i) => Number(i.key.slice("spare-".length)))
    .filter((n) => Number.isFinite(n));
  const nextNum = (spareNums.length ? Math.max(...spareNums) : 0) + 1;
  return [
    ...items,
    { id: maxId + 1, key: `spare-${nextNum}`, label: "", criteria: "", status: "ng", custom: true },
  ];
}

/** 再販スケジュール 9ステップの定義 */
export const SCHEDULE_DEFS: { key: string; label: string }[] = [
  { key: "contract", label: "①売買契約" },
  { key: "settlement", label: "②売買決済" },
  { key: "reformEstimate", label: "③リフォーム見積（相見積）" },
  { key: "estimateFix", label: "④見積確定（専務）" },
  { key: "reformStart", label: "⑤リフォーム着工" },
  { key: "adStart", label: "⑥広告開始" },
  { key: "reformDone", label: "⑦リフォーム完工" },
  { key: "saleContract", label: "⑧売却契約" },
  { key: "saleSettlement", label: "⑨売却決済（入金）" },
];

export function createSchedule(): ScheduleStep[] {
  return SCHEDULE_DEFS.map((s) => ({ ...s, date: "" }));
}

/** 指定状態の件数（ラベル未入力の予備項目は除外） */
export function countStatus(items: ChecklistItem[], status: ChecklistStatus): number {
  return items.filter((i) => i.status === status && !(i.custom && i.label.trim() === "")).length;
}

/** クリア数（適合＋是正可能）。是正可能は合格に算入する */
export function countCleared(items: ChecklistItem[]): number {
  return items.filter(
    (i) => (i.status === "ok" || i.status === "fixable") && !(i.custom && i.label.trim() === "")
  ).length;
}

/** 旧APIとの互換: 「クリア数」を返す（適合＋是正可能） */
export function countOk(items: ChecklistItem[]): number {
  return countCleared(items);
}

/** 不適合（是正困難）項目のラベル一覧。事業計画書のリスク欄等で使用 */
export function ngLabels(items: ChecklistItem[]): string[] {
  return items
    .filter((i) => i.status === "ng" && !(i.custom && i.label.trim() === ""))
    .map((i) => `${i.id}. ${i.label || "（予備項目）"}`);
}

/** 是正可能（要補修）項目のラベル一覧。事業計画書の補修コスト欄等で使用 */
export function fixableLabels(items: ChecklistItem[]): string[] {
  return items
    .filter((i) => i.status === "fixable" && !(i.custom && i.label.trim() === ""))
    .map((i) => `${i.id}. ${i.label || "（予備項目）"}`);
}
