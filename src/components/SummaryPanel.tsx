"use client";
// ============================================================
// 粗利集計パネル（一覧の絞り込み結果に対する合計）
// 決済完了案件は実績（確定値）、それ以外は計画（見込み）で集計される
// ============================================================
import { Card, Badge, cn } from "@/components/ui";
import { fmtMan, fmtPct } from "@/lib/format";
import { Aggregate } from "@/lib/summary";

export function SummaryPanel({
  agg,
  title,
  periodLabel,
}: {
  agg: Aggregate;
  /** 例：「決済完了の集計（確定）」 */
  title: string;
  /** 例：「2026-04-01 〜 2027-03-31」。全期間なら空 */
  periodLabel?: string;
}) {
  // すべて実績なら「確定」、すべて計画なら「見込み」、混在は内訳を出す
  const allActual = agg.count > 0 && agg.actualCount === agg.count;
  const tone = allActual ? "good" : "neutral";
  const basisLabel =
    agg.count === 0
      ? "対象なし"
      : allActual
      ? "確定実績"
      : agg.actualCount === 0
      ? "計画（見込み）"
      : `確定${agg.actualCount}件 / 見込み${agg.count - agg.actualCount}件`;

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div>
          <h2 className="text-sm font-bold text-fg">{title}</h2>
          <p className="mt-0.5 text-[11px] text-muted">
            {periodLabel ? `期間: ${periodLabel}` : "期間: 全期間"} ・ {agg.count}件
          </p>
        </div>
        <Badge tone={tone}>{basisLabel}</Badge>
      </div>

      <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-4">
        <Stat label="売上（販売価格）合計" value={`${fmtMan(agg.sellTotal)}`} unit="万円" />
        <Stat label="粗利益 合計" value={`${fmtMan(agg.grossTotal)}`} unit="万円" tone="brand" />
        <Stat label="営業利益 合計" value={`${fmtMan(agg.operatingTotal)}`} unit="万円" tone="profit" big />
        <Stat label="営業利益率" value={fmtPct(agg.operatingMargin)} tone="profit" />
      </div>

      <div className="grid grid-cols-3 gap-px border-t border-border bg-border">
        <Stat label="売上原価 合計" value={fmtMan(agg.costTotal)} unit="万円" small />
        <Stat label="販売経費 合計" value={fmtMan(agg.sellingTotal)} unit="万円" small />
        <Stat label="1件平均 営業利益" value={fmtMan(agg.avgOperatingProfit)} unit="万円" small />
      </div>

      <p className="px-4 py-2.5 text-[11px] leading-relaxed text-muted">
        ※ 利益率は「合計÷合計」の加重平均です。サンプル（テンプレート）は集計に含みません。
      </p>
    </Card>
  );
}

function Stat({
  label,
  value,
  unit,
  tone,
  big,
  small,
}: {
  label: string;
  value: string;
  unit?: string;
  tone?: "brand" | "profit";
  big?: boolean;
  small?: boolean;
}) {
  const color =
    tone === "profit"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "brand"
      ? "text-brand-600 dark:text-brand-100"
      : "text-fg";
  return (
    <div className="bg-surface px-2 py-2.5 text-center">
      <div className="text-[10px] leading-tight text-muted">{label}</div>
      <div className={cn("font-bold", big ? "text-xl" : small ? "text-xs" : "text-base", color)}>
        {value}
        {unit && <span className="ml-0.5 text-[10px] font-medium">{unit}</span>}
      </div>
    </div>
  );
}
