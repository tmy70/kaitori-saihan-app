"use client";
// ============================================================
// 稟議書タブ
// 物件情報・スペック・査定・チェックリスト(27)・スケジュール(9)・試算サマリー
// ============================================================
import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { Card, CardHeader, Field, TextInput, TextArea, Toggle, Badge, Button, NumberInput, cn } from "@/components/ui";
import { ChecklistItem, ChecklistStatus, RingiData } from "@/lib/types";
import { calculate } from "@/lib/calc";
import { countCleared, countStatus, addSpareItem, coreItemCount, defaultPassLine } from "@/lib/checklist";
import { fmtMan, fmtPct } from "@/lib/format";

export function RingiTab() {
  const current = useStore((s) => s.current)!;
  const update = useStore((s) => s.update);
  const r = current.ringi;
  const company = useStore((s) => s.companies.find((c) => c.id === current.companyId));
  const result = useMemo(() => calculate(current.calc), [current.calc]);
  const isMansion = current.propertyType === "mansion";

  function setRingi(patch: Partial<RingiData>) {
    update({ ringi: { ...r, ...patch } });
  }

  // チェックリスト1項目の部分更新（OK切替・基準/ラベルの編集）
  function patchChecklistItem(idx: number, patch: Partial<ChecklistItem>) {
    const next = [...r.checklist];
    next[idx] = { ...next[idx], ...patch };
    setRingi({ checklist: next });
  }
  function removeChecklistItem(idx: number) {
    setRingi({ checklist: r.checklist.filter((_, i) => i !== idx) });
  }
  function addSpare() {
    setRingi({ checklist: addSpareItem(r.checklist) });
  }

  const okCount = countStatus(r.checklist, "ok"); // 適合
  const fixableCount = countStatus(r.checklist, "fixable"); // 是正可能
  const ngCount = countStatus(r.checklist, "ng"); // 不適合
  const clearedCount = countCleared(r.checklist); // 適合＋是正可能（合格に算入）
  const total = r.checklist.length;
  const core = coreItemCount(current.propertyType); // 予備を除く満点目安
  const passLine = r.checklistPassLine ?? defaultPassLine(current.propertyType);
  // クリア数（適合＋是正可能）が合格ライン以上なら「合格」。
  const isPass = clearedCount >= passLine;

  return (
    <div className="space-y-4">
      {/* ヘッダー */}
      <Card className="p-4">
        <h2 className="text-center text-base font-bold text-fg">
          {company?.name ?? ""} 再販計画稟議書
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Field label="提出日">
            <TextInput type="date" value={r.submitDate} onChange={(e) => setRingi({ submitDate: e.target.value })} />
          </Field>
          <Field label="担当者">
            <TextInput value={r.staff} onChange={(e) => setRingi({ staff: e.target.value })} />
          </Field>
        </div>
      </Card>

      {/* 物件情報 */}
      <Card>
        <CardHeader title="物件情報" />
        <div className="space-y-3 p-4">
          <Field label="買取希望物件名">
            <TextInput value={r.propertyName} onChange={(e) => setRingi({ propertyName: e.target.value })} />
          </Field>
          <Field label="物件所在地">
            <TextInput value={r.address} onChange={(e) => setRingi({ address: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="物件種別">
              <TextInput value={r.propertyKind} onChange={(e) => setRingi({ propertyKind: e.target.value })} />
            </Field>
            <Field label="反響入口">
              <TextInput value={r.inquirySource} onChange={(e) => setRingi({ inquirySource: e.target.value })} />
            </Field>
          </div>
          <Field label="売主氏名・連絡先">
            <TextInput value={r.sellerName} onChange={(e) => setRingi({ sellerName: e.target.value })} />
          </Field>
          <Field label="売却希望理由（注意点・阻害要因等）">
            <TextArea rows={2} value={r.sellReason} onChange={(e) => setRingi({ sellReason: e.target.value })} />
          </Field>
        </div>
      </Card>

      {/* 物件スペック */}
      <Card>
        <CardHeader title="物件スペック" />
        <div className="grid grid-cols-2 gap-3 p-4">
          <Field label="土地面積">
            <TextInput value={r.landArea} onChange={(e) => setRingi({ landArea: e.target.value })} placeholder="㎡ / 坪" />
          </Field>
          <Field label="建物面積">
            <TextInput value={r.buildingArea} onChange={(e) => setRingi({ buildingArea: e.target.value })} placeholder="㎡" />
          </Field>
          <Field label="建物築年数">
            <TextInput value={r.buildingAge} onChange={(e) => setRingi({ buildingAge: e.target.value })} />
          </Field>
          <Field label="建物構造">
            <TextInput value={r.structure} onChange={(e) => setRingi({ structure: e.target.value })} placeholder="木造 / RC等" />
          </Field>
          <Field label="駐車場">
            <TextInput value={r.parking} onChange={(e) => setRingi({ parking: e.target.value })} />
          </Field>
        </div>
      </Card>

      {/* マンション情報（タイプがマンションのとき） */}
      {isMansion && (
        <Card>
          <CardHeader title="マンション情報" />
          <div className="grid grid-cols-2 gap-3 p-4">
            <Field label="階数">
              <TextInput value={r.floor} onChange={(e) => setRingi({ floor: e.target.value })} />
            </Field>
            <Field label="専有面積">
              <TextInput value={r.exclusiveArea} onChange={(e) => setRingi({ exclusiveArea: e.target.value })} placeholder="㎡" />
            </Field>
            <Field label="駐車場">
              <TextInput value={r.mansionParking} onChange={(e) => setRingi({ mansionParking: e.target.value })} />
            </Field>
            <div className="col-span-2 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border p-3">
                <Toggle checked={r.hasElevator} onChange={(v) => setRingi({ hasElevator: v })} label="エレベーター有" />
              </div>
              <div className="rounded-xl border border-border p-3">
                <Toggle checked={r.cornerRoom} onChange={(v) => setRingi({ cornerRoom: v })} label="角部屋" />
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* 査定情報 */}
      <Card>
        <CardHeader title="査定情報" />
        <div className="space-y-3 p-4">
          <Field label="売主の希望買取価格">
            <TextInput value={r.sellerHopePrice} onChange={(e) => setRingi({ sellerHopePrice: e.target.value })} />
          </Field>
          <Field label="査定方法1（土地の固定資産税評価額＋建物解体価格）">
            <TextArea rows={2} value={r.assessMethod1} onChange={(e) => setRingi({ assessMethod1: e.target.value })} />
          </Field>
          <Field label="査定方法2（近隣の新築建売相場×60%＝物件価格+リフォーム+諸経費+粗利350万）">
            <TextArea rows={2} value={r.assessMethod2} onChange={(e) => setRingi({ assessMethod2: e.target.value })} />
          </Field>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="路線価">
              <TextInput value={r.rosenka} onChange={(e) => setRingi({ rosenka: e.target.value })} />
            </Field>
          </div>
          <Field label="アピールポイント・売り出しの仕方">
            <TextArea rows={2} value={r.appealPoint} onChange={(e) => setRingi({ appealPoint: e.target.value })} />
          </Field>
        </div>
      </Card>

      {/* 購入チェックリスト（物件種別ごとに項目・基準が変わる） */}
      <Card>
        <CardHeader
          title="購入チェックリスト"
          desc="各項目を 適合／是正可能／不適合 で判定（是正可能は合格に算入）。基準は編集可"
          action={<Badge tone={isPass ? "good" : "bad"}>{isPass ? "合格" : "不合格"}</Badge>}
        />
        {/* 合格判定サマリー（合格ラインは編集可） */}
        <div className="flex items-center justify-between gap-3 border-b border-border bg-surface-2 px-4 py-3">
          <div className="text-sm">
            <div>
              <span className="text-muted">クリア数（適合＋是正可能）</span>
              <span className={cn("ml-2 text-lg font-bold", isPass ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
                {clearedCount}
              </span>
              <span className="text-muted"> / 合格ライン {passLine}</span>
            </div>
            <div className="mt-0.5 text-[11px] text-muted">
              内訳：適合 {okCount}・<span className="text-amber-600 dark:text-amber-400">是正可能 {fixableCount}</span>・
              <span className="text-red-600 dark:text-red-400">不適合 {ngCount}</span>（全{total}項目／基本{core}＋予備）
            </div>
          </div>
          <div className="w-28 shrink-0">
            <Field label="合格ライン">
              <NumberInput
                value={passLine}
                suffix="以上"
                onChangeNumber={(n) => setRingi({ checklistPassLine: n })}
              />
            </Field>
          </div>
        </div>
        <div className="divide-y divide-border">
          {r.checklist.map((item, idx) => (
            <div key={item.id} className="px-4 py-2.5">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 w-5 shrink-0 text-xs font-semibold text-muted">{item.id}</span>
                {item.custom ? (
                  // 予備項目: ラベルを手打ち編集できる
                  <TextInput
                    value={item.label}
                    placeholder="予備項目を入力"
                    onChange={(e) => patchChecklistItem(idx, { label: e.target.value })}
                    className="flex-1 text-xs"
                  />
                ) : (
                  <span className={cn("flex-1 text-xs", item.status !== "ng" ? "text-fg" : "text-muted")}>{item.label}</span>
                )}
                {item.custom && (
                  <button
                    type="button"
                    onClick={() => removeChecklistItem(idx)}
                    className="shrink-0 rounded-lg px-2 py-1 text-[11px] text-red-600 hover:bg-red-500/10 dark:text-red-400"
                    aria-label="この予備項目を削除"
                  >
                    削除
                  </button>
                )}
              </div>
              {/* 判定基準（各項目の下に常時表示・編集可） */}
              <div className="mt-1 flex items-center gap-1.5 pl-8">
                <span className="shrink-0 text-[10px] font-medium text-muted">基準</span>
                <TextInput
                  value={item.criteria ?? ""}
                  placeholder={item.custom ? "基準を入力（任意）" : "基準を入力"}
                  onChange={(e) => patchChecklistItem(idx, { criteria: e.target.value })}
                  className="flex-1 border-transparent bg-transparent px-1.5 py-1 text-[11px] text-muted focus:border-brand-500 focus:bg-surface-2"
                />
              </div>
              {/* 判定（3段階） */}
              <div className="mt-2 pl-8">
                <StatusSeg value={item.status} onChange={(s) => patchChecklistItem(idx, { status: s })} />
              </div>
            </div>
          ))}
        </div>
        {/* 予備項目を追加 */}
        <div className="border-t border-border p-3">
          <Button variant="secondary" className="w-full min-h-[40px] text-xs" onClick={addSpare}>
            ＋ 予備項目を追加
          </Button>
        </div>
      </Card>

      {/* スケジュール */}
      <Card>
        <CardHeader title="買取からの再販スケジュール" />
        <div className="divide-y divide-border">
          {r.schedule.map((s, idx) => (
            <div key={s.key} className="flex items-center gap-3 px-4 py-2.5">
              <span className="flex-1 text-sm text-fg">{s.label}</span>
              <input
                type="date"
                value={s.date}
                onChange={(e) => {
                  const next = [...r.schedule];
                  next[idx] = { ...s, date: e.target.value };
                  setRingi({ schedule: next });
                }}
                className="rounded-xl border border-border bg-surface-2 px-2.5 py-2 text-sm text-fg outline-none focus:border-brand-500"
              />
            </div>
          ))}
        </div>
      </Card>

      {/* 再販試算サマリー（計算書から自動連携） */}
      <Card>
        <CardHeader title="再販試算サマリー" desc="計算書から自動連携" />
        <div className="p-4">
          <SummaryRow label="買取原価（取得原価）" value={result.acquisitionCost} />
          <SummaryRow label="その他経費" value={result.expensesTotal} />
          <SummaryRow label="仕入費用総額（売上原価）" value={result.costOfSales} />
          <SummaryRow label="販売価格（税抜）" value={current.calc.sellPrice} />
          <SummaryRow label="販売時費用" value={result.sellingExpenses} />
          <div className="mt-1 border-t border-border pt-2">
            <SummaryRow label="営業利益（最終粗利）" value={result.operatingProfit} strong />
            <div className="flex items-center justify-between py-1 text-xs text-muted">
              <span>営業利益率</span>
              <span>{fmtPct(result.operatingMargin)}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* 承認欄 */}
      <Card>
        <CardHeader title="承認欄" desc="PDFでは押印枠を出力" />
        <div className="grid grid-cols-3 gap-3 p-4">
          <Field label="担当">
            <TextInput value={r.approverStaff} onChange={(e) => setRingi({ approverStaff: e.target.value })} />
          </Field>
          <Field label="上長">
            <TextInput value={r.approverManager} onChange={(e) => setRingi({ approverManager: e.target.value })} />
          </Field>
          <Field label="社長">
            <TextInput value={r.approverPresident} onChange={(e) => setRingi({ approverPresident: e.target.value })} />
          </Field>
        </div>
      </Card>
    </div>
  );
}

function SummaryRow({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className={cn("text-sm", strong ? "font-semibold text-fg" : "text-muted")}>{label}</span>
      <span className={cn(strong ? "text-lg font-bold text-fg" : "text-sm font-medium text-fg")}>
        {fmtMan(value)} 万円
      </span>
    </div>
  );
}

/** チェック項目の3段階判定セグメント（適合／是正可能／不適合） */
function StatusSeg({
  value,
  onChange,
}: {
  value: ChecklistStatus;
  onChange: (s: ChecklistStatus) => void;
}) {
  const opts: { v: ChecklistStatus; label: string; on: string; off: string }[] = [
    { v: "ok", label: "適合", on: "bg-emerald-500 text-white", off: "text-emerald-600 dark:text-emerald-400" },
    { v: "fixable", label: "是正可能", on: "bg-amber-500 text-white", off: "text-amber-600 dark:text-amber-400" },
    { v: "ng", label: "不適合", on: "bg-red-500 text-white", off: "text-red-600 dark:text-red-400" },
  ];
  return (
    <div className="inline-flex overflow-hidden rounded-lg border border-border">
      {opts.map((o, i) => (
        <button
          key={o.v}
          type="button"
          aria-pressed={value === o.v}
          onClick={() => onChange(o.v)}
          className={cn(
            "px-3 py-1.5 text-xs font-semibold transition-base",
            i > 0 && "border-l border-border",
            value === o.v ? o.on : cn("bg-surface-2 hover:bg-border/40", o.off)
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
