"use client";
// ============================================================
// 実績タブ（買取後〜再販売完了時の「最終経費」と「確定粗利」）
//
//  ・買取決済日／売却決済日を記録
//  ・費目ごとに「計画 → 実績（確定額）」を入力し、差異を表示
//  ・確定粗利・確定営業利益を自動算出（計画と同じ計算ロジックを使用）
//  ・決済完了にすると、一覧の「決済完了」タブと粗利集計に実績値が反映される
// ============================================================
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { Card, CardHeader, NumberInput, TextInput, TextArea, Field, Button, Badge, Toggle, cn } from "@/components/ui";
import { ACQUISITION_ITEMS, EXPENSE_ITEMS, SELLING_ITEMS } from "@/lib/itemDefs";
import { calculate, judgeProfit, sumItems, round2 } from "@/lib/calc";
import { actualCalc, hasActual, holdingDays, stageOf, variance } from "@/lib/summary";
import { fmtMan, fmtPct, genId, today } from "@/lib/format";
import { ActualData, CalcInput, CustomItem, ItemValues, ProjectStage, STAGE_LABELS } from "@/lib/types";

/** 費目グループ（計算入力のフィールド名と、追加費目のフィールド名の対応） */
const GROUPS = [
  { group: "acquisition", extra: "acquisitionExtra", title: "取得原価（実績）" },
  { group: "expenses", extra: "expensesExtra", title: "経費（実績）" },
  { group: "selling", extra: "sellingExtra", title: "販売経費（実績）" },
] as const;

type Grp = (typeof GROUPS)[number]["group"];
type ExtraField = (typeof GROUPS)[number]["extra"];

export function ActualTab() {
  const current = useStore((s) => s.current)!;
  const update = useStore((s) => s.update);
  const [showUnused, setShowUnused] = useState(false);

  const stage = stageOf(current);
  const started = hasActual(current);
  const actual: ActualData = current.actual ?? {};
  const plan = current.calc;
  const aCalc = actualCalc(current); // 実績（未開始なら計画と同じ内容）

  const planR = useMemo(() => calculate(plan), [plan]);
  const actR = useMemo(() => calculate(aCalc), [aCalc]);
  const v = useMemo(() => variance(current), [current]);
  const judge = judgeProfit(actR);

  // ---------------- 更新ハンドラ ----------------
  function setActual(patch: Partial<ActualData>) {
    update({ actual: { ...actual, ...patch } });
  }
  /** 計画をコピーして実績入力を開始する（以降は実績側だけを編集する） */
  function startActual(extra?: Partial<ActualData>) {
    update({ actual: { ...actual, calc: structuredClone(plan), ...extra } });
  }
  function setActualCalc(patch: Partial<CalcInput>) {
    // 未開始のまま金額を触った場合も、計画のコピーを土台にして実績を作る
    const base = started ? aCalc : (structuredClone(plan) as CalcInput);
    setActual({ calc: { ...base, ...patch } });
  }
  function setItem(group: Grp, key: string, value: number) {
    const base = started ? aCalc : (structuredClone(plan) as CalcInput);
    setActualCalc({ [group]: { ...base[group], [key]: value } } as Partial<CalcInput>);
  }
  // ---------------- 追加費目（実績側で足した費目） ----------------
  function extraOf(field: ExtraField): CustomItem[] {
    // 計画側・実績側の両方の追加費目を、キー重複を除いて合わせて表示する
    const planExtra = (plan[field] ?? []) as CustomItem[];
    const actExtra = (aCalc[field] ?? []) as CustomItem[];
    const merged = [...planExtra];
    for (const c of actExtra) if (!merged.some((m) => m.key === c.key)) merged.push(c);
    return merged;
  }
  function addCustom(field: ExtraField) {
    const base = started ? aCalc : (structuredClone(plan) as CalcInput);
    const list = (base[field] ?? []) as CustomItem[];
    setActualCalc({ [field]: [...list, { key: "x-" + genId(), label: "" }] } as Partial<CalcInput>);
  }
  function setCustomLabel(field: ExtraField, key: string, label: string) {
    const base = started ? aCalc : (structuredClone(plan) as CalcInput);
    const list = (base[field] ?? []) as CustomItem[];
    const next = list.some((c) => c.key === key)
      ? list.map((c) => (c.key === key ? { ...c, label } : c))
      : [...list, { key, label }];
    setActualCalc({ [field]: next } as Partial<CalcInput>);
  }

  const itemDefs: Record<Grp, { key: string; label: string }[]> = {
    acquisition: ACQUISITION_ITEMS[plan.propertyType],
    expenses: EXPENSE_ITEMS[plan.propertyType],
    selling: SELLING_ITEMS,
  };

  return (
    <div className="space-y-4">
      {/* ステージ（進行状況） */}
      <Card>
        <CardHeader
          title="決済の日付"
          desc="決済完了にすると、一覧の「決済完了」タブと粗利集計に確定値が反映されます（進行状況は画面上部で切り替えます）"
          action={
            <Badge tone={stage === "settled" ? "good" : stage === "acquired" ? "brand" : "neutral"}>
              {STAGE_LABELS[stage]}
            </Badge>
          }
        />
        <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
          <Field label="買取（仕入）決済日" hint="在庫として保有を開始した日">
            <TextInput
              type="date"
              value={actual.purchaseDate ?? ""}
              onChange={(e) => setActual({ purchaseDate: e.target.value })}
            />
          </Field>
          <Field label="売却（再販売）決済日" hint="この日付で期間集計されます">
            <TextInput
              type="date"
              value={actual.settleDate ?? ""}
              onChange={(e) => setActual({ settleDate: e.target.value })}
            />
          </Field>
        </div>
        {actual.purchaseDate && actual.settleDate && (
          <div className="border-t border-border px-4 py-2.5 text-xs text-muted">
            保有期間: <span className="font-semibold text-fg">{holdingDays(actual.purchaseDate, actual.settleDate)}</span> 日
            （買取から決済まで）
          </div>
        )}
      </Card>

      {/* 未開始のときの案内 */}
      {!started && (
        <Card className="p-4">
          <h3 className="text-sm font-bold text-fg">最終経費・確定粗利の入力</h3>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            計画の費目をそのままコピーして実績シートを作ります。実際にかかった金額に書き換えると、
            確定粗利・確定営業利益と「計画との差異」が自動計算されます。
          </p>
          <Button className="mt-3 w-full" onClick={() => startActual()}>
            計画をコピーして実績入力を開始
          </Button>
        </Card>
      )}

      {/* 確定KPI（実績ベース） */}
      <Card>
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-border">
          <BigKpi label="確定営業利益" value={fmtMan(actR.operatingProfit)} unit="万円" tone={judge} big />
          <BigKpi label="確定営業利益率" value={fmtPct(actR.operatingMargin)} tone={judge} big />
          <BigKpi label="確定粗利益" value={fmtMan(actR.grossProfit)} unit="万円" tone={judge} />
          <BigKpi label="確定粗利率" value={fmtPct(actR.grossMargin)} tone={judge} />
        </div>
        <div className="border-t border-border p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-fg">計画との差異（実績 − 計画）</span>
            {!started && <Badge tone="neutral">実績未入力（計画値を表示中）</Badge>}
          </div>
          <VarRow label="売却価格" value={v.sellPrice} goodWhenPlus />
          <VarRow label="取得原価" value={v.acquisition} />
          <VarRow label="経費" value={v.expenses} />
          <VarRow label="販売経費" value={v.selling} />
          <div className="mt-1 border-t border-border pt-1">
            <VarRow label="粗利益" value={v.grossProfit} goodWhenPlus strong />
            <VarRow label="営業利益" value={v.operatingProfit} goodWhenPlus strong />
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-muted">
            ※ 原価・経費はプラス（＝計画超過）が赤、マイナス（＝節約）が緑です。売価・利益はプラスが緑です。
          </p>
        </div>
      </Card>

      {/* 最終売却価格 */}
      <Card className="p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="最終売却価格（実績）" hint={`計画: ${fmtMan(plan.sellPrice)} 万円`}>
            <NumberInput
              value={aCalc.sellPrice}
              onChangeNumber={(n) => setActualCalc({ sellPrice: n })}
              hintYen
            />
          </Field>
          <div className="flex flex-col justify-end">
            <span className="mb-1 block text-xs font-medium text-muted">確定売上原価（取得原価＋経費）</span>
            <div className="rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-right text-sm font-bold text-fg">
              {fmtMan(actR.costOfSales)} 万円
            </div>
          </div>
        </div>
      </Card>

      {/* 費目別の実績入力（計画・実績・差異） */}
      {GROUPS.map(({ group, extra, title }) => {
        const defs = itemDefs[group];
        const extras = extraOf(extra);
        const planValues = (plan[group] ?? {}) as ItemValues;
        const actValues = (aCalc[group] ?? {}) as ItemValues;
        // 既定は「計画または実績に金額がある費目」だけ表示（費目数が多いため）
        const rows = [...defs, ...extras].filter(
          (d) => showUnused || (planValues[d.key] ?? 0) !== 0 || (actValues[d.key] ?? 0) !== 0
        );
        const planTotal = sumItems(planValues);
        const actTotal = sumItems(actValues);
        return (
          <Card key={group}>
            <CardHeader
              title={title}
              desc={`計画 ${fmtMan(planTotal)} 万円 → 実績 ${fmtMan(actTotal)} 万円`}
              action={
                <Badge tone={actTotal > planTotal ? "bad" : actTotal < planTotal ? "good" : "neutral"}>
                  {signed(round2(actTotal - planTotal))} 万円
                </Badge>
              }
            />
            <div className="divide-y divide-border">
              {rows.length === 0 && (
                <p className="px-4 py-6 text-center text-xs text-muted">
                  金額の入っている費目がありません。「未使用の費目も表示」をオンにすると全費目を入力できます。
                </p>
              )}
              {rows.map((d) => {
                const isCustom = extras.some((c) => c.key === d.key);
                const pv = planValues[d.key] ?? 0;
                const av = actValues[d.key] ?? 0;
                return (
                  <div key={d.key} className="px-4 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      {isCustom ? (
                        <TextInput
                          value={extras.find((c) => c.key === d.key)?.label ?? ""}
                          placeholder="費目名を入力"
                          onChange={(e) => setCustomLabel(extra, d.key, e.target.value)}
                          className="flex-1 text-sm"
                        />
                      ) : (
                        <span className="text-sm text-fg">{d.label}</span>
                      )}
                      <span className="shrink-0 text-[11px] text-muted">計画 {fmtMan(pv)}万</span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="flex-1">
                        <NumberInput value={av} onChangeNumber={(n) => setItem(group, d.key, n)} />
                      </div>
                      <span
                        className={cn(
                          "w-20 shrink-0 text-right text-xs font-semibold",
                          av > pv ? "text-red-600 dark:text-red-400" : av < pv ? "text-emerald-600 dark:text-emerald-400" : "text-muted"
                        )}
                      >
                        {av === pv ? "計画どおり" : `${signed(round2(av - pv))}万`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="border-t border-border p-3">
              <Button variant="secondary" className="min-h-[40px] w-full text-xs" onClick={() => addCustom(extra)}>
                ＋ 実績にだけある費目を追加
              </Button>
            </div>
          </Card>
        );
      })}

      {/* 表示オプション・メモ */}
      <Card className="p-4">
        <Toggle checked={showUnused} onChange={setShowUnused} label="未使用の費目も表示する（全費目を入力可能に）" />
      </Card>

      <Card className="p-4">
        <Field label="差異メモ" hint="追加工事・値引き・想定外費用の理由を残しておくと次の仕入判断に使えます">
          <TextArea
            rows={4}
            value={actual.note ?? ""}
            onChange={(e) => setActual({ note: e.target.value })}
            placeholder="例：地中障害物の撤去で+35万。売主交渉で仕入を▲20万。"
          />
        </Field>
      </Card>

      {/* 計画（当初計算書）の参考値 */}
      <Card className="p-4">
        <h3 className="mb-2 text-sm font-bold text-fg">当初計画（計算書タブの値）</h3>
        <PlanRow label="販売価格" value={plan.sellPrice} />
        <PlanRow label="売上原価" value={planR.costOfSales} />
        <PlanRow label="粗利益" value={planR.grossProfit} />
        <PlanRow label="販売経費" value={planR.sellingExpenses} />
        <PlanRow label="営業利益" value={planR.operatingProfit} strong />
      </Card>
    </div>
  );
}

/** 差異の符号付き表示（±を明示。差異なしは「±0」） */
function signed(n: number): string {
  if (!Number.isFinite(n) || n === 0) return "±0";
  return (n > 0 ? "+" : "−") + fmtMan(Math.abs(n));
}

/**
 * 差異の1行。
 * goodWhenPlus=true（売価・利益）はプラスが緑、false（原価・経費）はプラスが赤。
 */
function VarRow({
  label,
  value,
  goodWhenPlus,
  strong,
}: {
  label: string;
  value: number;
  goodWhenPlus?: boolean;
  strong?: boolean;
}) {
  const good = goodWhenPlus ? value > 0 : value < 0;
  const bad = goodWhenPlus ? value < 0 : value > 0;
  const color =
    value === 0
      ? "text-muted"
      : good
      ? "text-emerald-600 dark:text-emerald-400"
      : bad
      ? "text-red-600 dark:text-red-400"
      : "text-fg";
  return (
    <div className="flex items-center justify-between py-1">
      <span className={cn("text-xs", strong ? "font-semibold text-fg" : "text-muted")}>{label}</span>
      <span className={cn(strong ? "text-sm font-bold" : "text-xs font-medium", color)}>{signed(value)} 万円</span>
    </div>
  );
}

function PlanRow({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className={cn("text-xs", strong ? "font-semibold text-fg" : "text-muted")}>{label}</span>
      <span className={cn(strong ? "text-sm font-bold text-fg" : "text-xs font-medium text-fg")}>
        {fmtMan(value)} 万円
      </span>
    </div>
  );
}

function BigKpi({
  label,
  value,
  unit,
  tone,
  big,
}: {
  label: string;
  value: string;
  unit?: string;
  tone: "good" | "warn" | "bad";
  big?: boolean;
}) {
  const color =
    tone === "good"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "bad"
      ? "text-red-600 dark:text-red-400"
      : "text-amber-600 dark:text-amber-400";
  return (
    <div className="bg-surface p-3 text-center">
      <div className="text-[11px] text-muted">{label}</div>
      <div className={cn("font-bold", big ? "text-2xl" : "text-lg", color)}>
        {value}
        {unit && <span className="ml-0.5 text-xs font-medium">{unit}</span>}
      </div>
    </div>
  );
}
