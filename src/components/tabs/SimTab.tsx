"use client";
// ============================================================
// 価格変更シミュレーションタブ（機能C）
// 複数シナリオ（強気/標準/弱気 等）の横並び比較 + グラフ + 損益分岐
// ============================================================
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { Card, CardHeader, Field, NumberInput, TextInput, Button, Badge, cn } from "@/components/ui";
import { calculate, breakEvenPrice, calcBrokerage, tsuboUnitPrice, usesTsuboPrice, sumLotsTsubo } from "@/lib/calc";
import { CalcResult, SimScenario } from "@/lib/types";
import { fmtMan, fmtPct, genId } from "@/lib/format";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/** シナリオ別の計算結果を算出 */
function scenarioResult(
  baseCalc: ReturnType<typeof useStore.getState>["current"],
  s: SimScenario,
  recalcBrokerage: boolean
): { sellPrice: number; result: CalcResult } {
  const calc = baseCalc!.calc;
  const base = calculate(calc);
  const sellPrice = calc.sellPrice + s.sellPriceDelta;
  const acquisitionCost = base.acquisitionCost + s.costDelta;
  const costOfSales = acquisitionCost + base.expensesTotal;
  const grossProfit = sellPrice - costOfSales;
  const grossMargin = sellPrice > 0 ? grossProfit / sellPrice : 0;

  // 販売経費: 仲介手数料を価格連動で再計算するオプション
  let sellingExpenses = base.sellingExpenses;
  if (recalcBrokerage) {
    const oldBrokerage = calc.selling.sellBrokerage ?? 0;
    sellingExpenses = base.sellingExpenses - oldBrokerage + calcBrokerage(sellPrice);
  }
  const operatingProfit = grossProfit - sellingExpenses;
  const operatingMargin = sellPrice > 0 ? operatingProfit / sellPrice : 0;

  return {
    sellPrice,
    result: {
      acquisitionCost,
      expensesTotal: base.expensesTotal,
      costOfSales,
      grossProfit,
      grossMargin,
      sellingExpenses,
      operatingProfit,
      operatingMargin,
    },
  };
}

export function SimTab() {
  const current = useStore((s) => s.current)!;
  const update = useStore((s) => s.update);
  const [recalcBrokerage, setRecalcBrokerage] = useState(true);
  const [targetMargin, setTargetMargin] = useState(10); // 目標営業利益率(%)

  const scenarios = current.scenarios;
  const base = useMemo(() => calculate(current.calc), [current.calc]);

  // 坪単価の対象（土地・マンションは坪数、分譲地は区画合計坪数）。0なら坪単価列は出さない。
  const tsuboForUnit =
    current.propertyType === "subdivision"
      ? sumLotsTsubo(current.calc.lots)
      : usesTsuboPrice(current.propertyType)
      ? current.calc.tsubo ?? 0
      : 0;
  const showUnit = tsuboForUnit > 0;

  const computed = useMemo(
    () => scenarios.map((s) => ({ s, ...scenarioResult(current, s, recalcBrokerage) })),
    [scenarios, current, recalcBrokerage]
  );

  // 損益分岐: 仲介以外の販売経費は固定とみなす
  const otherSelling = base.sellingExpenses - (current.calc.selling.sellBrokerage ?? 0);
  const breakEven0 = breakEvenPrice(base.costOfSales, 0, otherSelling, 0);
  const breakEvenTarget = breakEvenPrice(base.costOfSales, 0, otherSelling, targetMargin / 100);

  function setScenarios(next: SimScenario[]) {
    update({ scenarios: next });
  }
  function updateScenario(id: string, patch: Partial<SimScenario>) {
    setScenarios(scenarios.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }
  function addScenario() {
    setScenarios([...scenarios, { id: genId(), label: "新シナリオ", sellPriceDelta: 0, costDelta: 0 }]);
  }
  function removeScenario(id: string) {
    setScenarios(scenarios.filter((s) => s.id !== id));
  }
  function applyPercentPreset() {
    const p = current.calc.sellPrice;
    setScenarios([
      { id: genId(), label: "+10%", sellPriceDelta: Math.round(p * 0.1), costDelta: 0 },
      { id: genId(), label: "基準", sellPriceDelta: 0, costDelta: 0 },
      { id: genId(), label: "-10%", sellPriceDelta: -Math.round(p * 0.1), costDelta: 0 },
    ]);
  }

  const chartData = computed.map((c) => ({
    name: c.s.label,
    営業利益: Math.round(c.result.operatingProfit),
  }));

  return (
    <div className="space-y-4">
      {/* オプション */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" className="text-xs" onClick={applyPercentPreset}>
            ±10%プリセット
          </Button>
          <Button variant="secondary" className="text-xs" onClick={addScenario}>
            ＋シナリオ追加
          </Button>
          <label className="ml-auto flex items-center gap-2 text-xs text-muted">
            <input
              type="checkbox"
              checked={recalcBrokerage}
              onChange={(e) => setRecalcBrokerage(e.target.checked)}
              className="h-4 w-4 accent-brand-500"
            />
            仲介手数料を価格連動で再計算
          </label>
        </div>
      </Card>

      {/* グラフ */}
      <Card>
        <CardHeader title="営業利益の比較" desc="シナリオ別（万円）" />
        <div className="h-56 px-2 py-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "rgb(var(--muted))" }} />
              <YAxis tick={{ fontSize: 11, fill: "rgb(var(--muted))" }} />
              <Tooltip
                formatter={(v: number) => [`${fmtMan(v)} 万円`, "営業利益"]}
                contentStyle={{
                  background: "rgb(var(--surface))",
                  border: "1px solid rgb(var(--border))",
                  borderRadius: 12,
                  fontSize: 12,
                }}
              />
              <Bar dataKey="営業利益" radius={[6, 6, 0, 0]}>
                {chartData.map((d, i) => (
                  <Cell key={i} fill={d.営業利益 >= 0 ? "#1e4d8c" : "#dc2626"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* 比較表 */}
      <Card>
        <CardHeader title="シナリオ比較表" />
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-muted">
                <th className="p-2 text-left font-medium">シナリオ</th>
                <th className="p-2 text-right font-medium">販売価格</th>
                {showUnit && <th className="p-2 text-right font-medium">坪単価</th>}
                <th className="p-2 text-right font-medium">粗利率</th>
                <th className="p-2 text-right font-medium">営業利益</th>
                <th className="p-2 text-right font-medium">営業利益率</th>
              </tr>
            </thead>
            <tbody>
              {computed.map((c) => {
                const pos = c.result.operatingProfit >= 0;
                return (
                  <tr key={c.s.id} className="border-b border-border/60">
                    <td className="p-2 font-semibold text-fg">{c.s.label}</td>
                    <td className="p-2 text-right text-fg">{fmtMan(c.sellPrice)}</td>
                    {showUnit && (
                      <td className="p-2 text-right text-fg">{fmtMan(tsuboUnitPrice(c.sellPrice, tsuboForUnit))}<span className="text-[10px] text-muted">万/坪</span></td>
                    )}
                    <td className="p-2 text-right text-fg">{fmtPct(c.result.grossMargin)}</td>
                    <td className={cn("p-2 text-right font-bold", pos ? "text-emerald-600 dark:text-emerald-400" : "text-red-600")}>
                      {fmtMan(c.result.operatingProfit)}
                    </td>
                    <td className="p-2 text-right text-fg">{fmtPct(c.result.operatingMargin)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 損益分岐 */}
      <Card>
        <CardHeader title="損益分岐・目標価格" />
        <div className="space-y-3 p-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-surface-2 p-3 text-center">
              <div className="text-[11px] text-muted">損益分岐 販売価格</div>
              <div className="text-lg font-bold text-fg">{fmtMan(breakEven0)} 万円</div>
              <div className="text-[10px] text-muted">営業利益=0</div>
            </div>
            <div className="rounded-xl bg-surface-2 p-3 text-center">
              <div className="text-[11px] text-muted">目標利益率を満たす価格</div>
              <div className="text-lg font-bold text-brand-600 dark:text-brand-100">{fmtMan(breakEvenTarget)} 万円</div>
              <div className="text-[10px] text-muted">営業利益率 {targetMargin}%</div>
            </div>
          </div>
          <Field label="目標営業利益率(%)">
            <NumberInput value={targetMargin} onChangeNumber={setTargetMargin} suffix="%" />
          </Field>
          <p className="text-[11px] text-muted">
            ※仲介手数料を価格×3%＋6万円、その他販売経費を固定として算出した近似値です。
          </p>
        </div>
      </Card>

      {/* シナリオ編集 */}
      <Card>
        <CardHeader title="シナリオ設定" desc="基準からの増減（万円）を入力" />
        <div className="space-y-3 p-4">
          {scenarios.map((s) => (
            <div key={s.id} className="rounded-xl border border-border p-3">
              <div className="mb-2 flex items-center gap-2">
                <TextInput
                  value={s.label}
                  onChange={(e) => updateScenario(s.id, { label: e.target.value })}
                  className="flex-1"
                />
                <Button variant="ghost" className="min-h-[40px] px-3 text-xs text-red-600" onClick={() => removeScenario(s.id)}>
                  削除
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Field label="販売価格の増減">
                  <NumberInput value={s.sellPriceDelta} onChangeNumber={(n) => updateScenario(s.id, { sellPriceDelta: n })} />
                </Field>
                <Field label="原価の増減">
                  <NumberInput value={s.costDelta} onChangeNumber={(n) => updateScenario(s.id, { costDelta: n })} />
                </Field>
              </div>
            </div>
          ))}
          {scenarios.length === 0 && <p className="text-center text-xs text-muted">シナリオがありません。</p>}
        </div>
      </Card>
    </div>
  );
}
