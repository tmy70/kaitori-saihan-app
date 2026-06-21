// ============================================================
// 稟議書: 購入チェックリスト（27トグル）と再販スケジュール（9ステップ）
// ============================================================
import { ChecklistItem, ScheduleStep } from "./types";

/** チェックリストの文言（仕様書のとおり。26項目＋予備1＝計27） */
export const CHECKLIST_LABELS: string[] = [
  "スーパーが徒歩15分圏内or1km圏内",
  "買取価格が800万以下か（築20年以上）※築20年以下・任売は別途稟議要",
  "リフォーム予算が700万以内になるか",
  "土地100㎡以上・建物70㎡以上、マンションは専有60㎡以上か",
  "駐車場確保できるか（市内中心地1台以上／郊外2台以上必須）",
  "売り出し価格が1800万以内（月々の支払いが5万円以内）",
  "リフォームして3LDKの間取が確保できる",
  "地盤良好・津波等災害エリア外",
  "日当たり良好",
  "粗利250万以上もしくは粗利率30%以上",
  "周辺に要注意人物がいない",
  "査定無料エリア内の物件か",
  "建物傾きが10/1,000以内か（NGなら不陸調整で修復可能か）",
  "基礎（外観）は大丈夫か",
  "床下基礎は大丈夫か",
  "屋根裏は大丈夫か",
  "雨漏りは大丈夫か",
  "シロアリは大丈夫か（クロアリ含む）",
  "隣地との越境・境界問題はないか",
  "上下水道の引込はされているか（井戸・汲み取り・浄化槽の利用）",
  "配管問題がないか（水道・下水道など）",
  "擁壁に問題がないか",
  "確認申請されているか",
  "違法建築物ではないか・増築はないか（建築図面との相違）",
  "事故物件ではないか",
  "管理費修繕費こみこみ月々6万円台の支払い",
  "（予備項目）",
];

/** 初期チェックリスト（全てNG=false） */
export function createChecklist(): ChecklistItem[] {
  return CHECKLIST_LABELS.map((label, i) => ({ id: i + 1, label, ok: false }));
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

/** OK数を集計 */
export function countOk(items: ChecklistItem[]): number {
  return items.filter((i) => i.ok).length;
}

/** NG項目のラベル一覧 */
export function ngLabels(items: ChecklistItem[]): string[] {
  return items.filter((i) => !i.ok).map((i) => `${i.id}. ${i.label}`);
}
