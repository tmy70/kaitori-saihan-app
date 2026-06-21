"use client";
// ============================================================
// 計算書タブ
// 費目入力 → 取得原価・経費・売上原価・粗利・販売経費・営業利益をリアルタイム計算
// ============================================================
import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { Card, CardHeader, NumberInput, Field, Button, Badge, Select, cn } from "@/components/ui";
import {
  ACQUISITION_ITEMS,
  EXPENSE_ITEMS,
  SELLING_ITEMS,
  ItemDef,
} from "@/lib/itemDefs";
import {
  calculate,
  judgeProfit,
  calcBrokerage,
  calcAcquisitionTax,
  calcTaxProration,
} from "@/lib/calc";
import { fmtMan, fmtPct } from "@/lib/format";
import { CalcInput, PropertyType, PROPERTY_TYPE_LABELS } from "@/lib/types";

export function CalcTab() {
  const current = useStore((s) => s.current)!;
  const update = useStore((s) => s.update);
  const calc = current.calc;
  const result = useMemo(() => calculate(calc), [calc]);
  const judge = judgeProfit(result);

  function setCalc(patch: Partial<CalcInput>) {
    update({ calc: { ...calc, ...patch } });
  }
  function setItem(group: "acquisition" | "expenses" | "selling", key: string, v: number) {
    setCalc({ [group]: { ...calc[group], [key]: v } } as Partial<CalcInput>);
  }
  function changeType(t: PropertyType) {
    // タイプ変更: 共通キーは保持しつつ、計算入力のタイプを更新
    update({ propertyType: t, calc: { ...calc, propertyType: t } });
  }

  const acqItems = ACQUISITION_ITEMS[calc.propertyType];

  // 補助計算ハンドラ
  function applyAuto(item: ItemDef, group: "acquisition" | "expenses" | "selling") {
    if (item.auto === "brokerage") {
      setItem(group, item.key, calcBrokerage(calc.sellPrice));
    } else if (item.auto === "acquisitionTax") {
      setItem(group, item.key, calcAcquisitionTax(calc.assessedValueLand ?? 0, calc.assessedValueBuilding ?? 0));
    } else if (item.auto === "taxProration") {
      setItem(group, item.key, calcTaxProration(calc.taxAnnualAmount ?? 0, calc.taxProrationDays ?? 0));
    }
  }

  return (
    <div className="space-y-4">
      {/* KPIダッシュボード */}
      <Card>
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-border">
          <BigKpi label="営業利益" value={`${fmtMan(result.operatingProfit)}`} unit="万円" tone={judge} big />
          <BigKpi label="営業利益率" value={fmtPct(result.operatingMargin)} tone={judge} big />
          <BigKpi label="粗利益" value={`${fmtMan(result.grossProfit)}`} unit="万円" tone={judge} />
          <BigKpi label="粗利率" value={fmtPct(result.grossMargin)} tone={judge} />
        </div>
        <div className="flex items-center justify-between px-4 py-2.5">
          <span className="text-xs text-muted">基準: 粗利益250万以上 または 粗利率30%以上</span>
          <Badge tone={judge}>{judge === "good" ? "基準クリア" : judge === "warn" ? "要検討" : "赤字/未達"}</Badge>
        </div>
      </Card>

      {/* 物件タイプ・販売価格 */}
      <Card className="p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="物件タイプ">
            <Select
              value={calc.propertyType}
              onChange={(v) => changeType(v as PropertyType)}
              options={Object.entries(PROPERTY_TYPE_LABELS).map(([value, label]) => ({ value, label }))}
            />
          </Field>
          <Field label="販売価格">
            <NumberInput value={calc.sellPrice} onChangeNumber={(n) => setCalc({ sellPrice: n })} />
          </Field>
        </div>
      </Card>

      {/* 補助計算の入力（評価額・日割り） */}
      <Card>
        <CardHeader title="補助計算の入力" desc="不動産取得税・固都税精算金の自動計算に使用" />
        <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">
          <Field label="土地評価額">
            <NumberInput value={calc.assessedValueLand} onChangeNumber={(n) => setCalc({ assessedValueLand: n })} />
          </Field>
          <Field label="建物評価額">
            <NumberInput value={calc.assessedValueBuilding} onChangeNumber={(n) => setCalc({ assessedValueBuilding: n })} />
          </Field>
          <Field label="固都税 年額">
            <NumberInput value={calc.taxAnnualAmount} onChangeNumber={(n) => setCalc({ taxAnnualAmount: n })} />
          </Field>
          <Field label="精算日数">
            <NumberInput value={calc.taxProrationDays} onChangeNumber={(n) => setCalc({ taxProrationDays: n })} suffix="日" />
          </Field>
        </div>
      </Card>

      {/* 取得原価 */}
      <ItemGroup
        title="取得原価"
        total={result.acquisitionCost}
        items={acqItems}
        values={calc.acquisition}
        onChange={(k, v) => setItem("acquisition", k, v)}
        onAuto={(item) => applyAuto(item, "acquisition")}
      />

      {/* 経費 */}
      <ItemGroup
        title="経費"
        total={result.expensesTotal}
        items={EXPENSE_ITEMS}
        values={calc.expenses}
        onChange={(k, v) => setItem("expenses", k, v)}
        onAuto={(item) => applyAuto(item, "expenses")}
      />

      {/* 売上原価・粗利の中間サマリー */}
      <Card className="p-4">
        <SummaryRow label="売上原価（取得原価＋経費）" value={result.costOfSales} />
        <SummaryRow label="粗利益（販売価格−売上原価）" value={result.grossProfit} tone={judge} strong />
      </Card>

      {/* 販売経費 */}
      <ItemGroup
        title="販売経費"
        total={result.sellingExpenses}
        items={SELLING_ITEMS}
        values={calc.selling}
        onChange={(k, v) => setItem("selling", k, v)}
        onAuto={(item) => applyAuto(item, "selling")}
      />

      {/* 営業利益サマリー */}
      <Card className="p-4">
        <SummaryRow label="営業利益（粗利益−販売経費）" value={result.operatingProfit} tone={judge} strong />
      </Card>
    </div>
  );
}

function ItemGroup({
  title,
  total,
  items,
  values,
  onChange,
  onAuto,
}: {
  title: string;
  total: number;
  items: ItemDef[];
  values: Record<string, number>;
  onChange: (key: string, v: number) => void;
  onAuto: (item: ItemDef) => void;
}) {
  return (
    <Card>
      <CardHeader title={title} action={<Badge tone="brand">{fmtMan(total)} 万円</Badge>} />
      <div className="divide-y divide-border">
        {items.map((it) => (
          <div key={it.key} className="px-4 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-fg">
                {it.label}
                {it.note && <span className="ml-1 text-[10px] text-muted">（{it.note}）</span>}
              </span>
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <div className="flex-1">
                <NumberInput value={values[it.key] ?? 0} onChangeNumber={(n) => onChange(it.key, n)} />
              </div>
              {it.auto && (
                <Button variant="secondary" className="min-h-[40px] px-3 text-xs" onClick={() => onAuto(it)}>
                  自動計算
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function SummaryRow({
  label,
  value,
  tone,
  strong,
}: {
  label: string;
  value: number;
  tone?: "good" | "warn" | "bad";
  strong?: boolean;
}) {
  const color =
    tone === "good"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "bad"
      ? "text-red-600 dark:text-red-400"
      : tone === "warn"
      ? "text-amber-600 dark:text-amber-400"
      : "text-fg";
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className={cn("text-sm", strong ? "font-semibold text-fg" : "text-muted")}>{label}</span>
      <span className={cn(strong ? "text-lg font-bold" : "text-sm font-medium", color)}>{fmtMan(value)} 万円</span>
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
