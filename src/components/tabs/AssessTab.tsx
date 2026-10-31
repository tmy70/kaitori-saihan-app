"use client";
// ============================================================
// 査定タブ（査定中・提示中の主画面）
//
// 左：入力（査定の場で埋められる項目だけ）
// 右：入力と同時に出る4本の買取価格 → 1本選ぶと書類に入る
//
// 逆算：買取価格 ＝ 再販想定価格 − 利益 − 工事費 − 取得時の諸費用 − 経費 − 販売経費
// 購入時手数料は買取価格に連動するため収束計算で求める（calc.ts の reverseBuyPrice）。
// ============================================================
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  Collapsible,
  Field,
  NumberInput,
  Select,
  TextInput,
  Toggle,
  cn,
} from "@/components/ui";
import { calculate, sqmToTsubo } from "@/lib/calc";
import { fmtMan, fmtPct } from "@/lib/format";
import { assessmentToCalcInput, priceLines, resolveAssessment } from "@/lib/assessment";
import { TYPE_PRESETS, WORK_COST_TARGET } from "@/lib/presets";
import { AssessmentInput, PROPERTY_TYPE_LABELS, PropertyType } from "@/lib/types";
import { CustomerDocsPanel } from "@/components/CustomerDocsPanel";

export function AssessTab() {
  const current = useStore((s) => s.current);
  const update = useStore((s) => s.update);
  const companies = useStore((s) => s.companies);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const type = current?.propertyType ?? "building";
  const a = current?.assessment;

  const lines = useMemo(() => priceLines(type, a), [type, a]);
  const resolved = useMemo(() => resolveAssessment(type, a), [type, a]);

  if (!current) return null;

  /** 査定入力の一部を書き換える */
  function set(patch: Partial<AssessmentInput>) {
    update({ assessment: { ...(a ?? { resalePrice: 0, workCost: 0 }), ...patch } });
  }

  const workLabel = WORK_COST_TARGET[type].label;
  const preset = TYPE_PRESETS[type];
  const offerPrice = a?.offerPrice;
  const landTsubo = sqmToTsubo(a?.landAreaSqm);
  const buildingTsubo = sqmToTsubo(a?.buildingAreaSqm);

  /** 概算を種別の目安額に戻す */
  function resetToPreset() {
    set({
      workCost: preset.workCost,
      registration: preset.registration,
      taxProration: preset.taxProration,
      acquisitionTax: preset.acquisitionTax,
      otherAcquisition: preset.otherAcquisition,
      expenses: preset.expenses,
      sellingOther: preset.sellingOther,
      buyFee: undefined,
      sellBrokerage: undefined,
    });
  }

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[420px_1fr]">
      {/* ===================== 入力 ===================== */}
      <div className="space-y-4">
        {/* 買取価格を出すのに要る項目だけを最初に見せる。
            書類にしか使わない項目（面積・築年・発行者）は下の折りたたみへ。 */}
        <Card>
          <CardHeader title="査定入力" desc="この5項目だけで買取価格が出ます" />
          <div className="space-y-3 p-4">
            <Field label="種別">
              <Select
                value={type}
                onChange={(v) => update({ propertyType: v as PropertyType })}
                options={Object.entries(PROPERTY_TYPE_LABELS).map(([value, label]) => ({ value, label }))}
              />
            </Field>

            <Field label="所在地">
              <TextInput
                value={a?.address ?? ""}
                onChange={(e) => set({ address: e.target.value })}
                placeholder="例：富山市〇〇町1-2-3"
              />
            </Field>

            <Field label="再販想定価格" hint="この価格で売れる想定。ここから買取価格を逆算します">
              <NumberInput
                value={a?.resalePrice}
                onChangeNumber={(n) => set({ resalePrice: n })}
                className="text-base"
              />
            </Field>

            <Field label={workLabel} hint={`種別の目安：${fmtMan(preset.workCost)}万円（上書きできます）`}>
              <NumberInput value={a?.workCost} onChangeNumber={(n) => set({ workCost: n })} />
            </Field>

            <Field label="仲介の査定価格（任意）" hint="比較表に使います。空欄なら比較表の仲介欄は空になります">
              <NumberInput
                value={a?.brokerAssessPrice}
                onChangeNumber={(n) => set({ brokerAssessPrice: n || undefined })}
              />
            </Field>
          </div>
        </Card>

        {/* 書類に載せる項目。買取価格の計算には関わらないので、ふだんは閉じておく */}
        <Collapsible
          open={detailsOpen}
          onToggle={() => setDetailsOpen((v) => !v)}
          title={<span className="text-sm font-bold text-fg">書類に載せる項目</span>}
          right={<span className="text-xs text-muted">面積・築年・発行者</span>}
        >
          <div className="space-y-3 p-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="土地面積" hint={landTsubo ? `${fmtMan(landTsubo)}坪` : undefined}>
                <NumberInput
                  value={a?.landAreaSqm}
                  onChangeNumber={(n) => set({ landAreaSqm: n })}
                  suffix="m²"
                />
              </Field>
              <Field label="建物面積" hint={buildingTsubo ? `${fmtMan(buildingTsubo)}坪` : undefined}>
                <NumberInput
                  value={a?.buildingAreaSqm}
                  onChangeNumber={(n) => set({ buildingAreaSqm: n })}
                  suffix="m²"
                />
              </Field>
            </div>

            <Field label="築年">
              <TextInput
                value={a?.buildingAge ?? ""}
                onChange={(e) => set({ buildingAge: e.target.value })}
                placeholder="例：1998年築（築27年）"
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="発行会社">
                <Select
                  value={current.companyId}
                  onChange={(v) => update({ companyId: v })}
                  options={companies.map((c) => ({ value: c.id, label: c.name }))}
                />
              </Field>
              <Field label="担当者">
                <TextInput
                  value={a?.staff ?? ""}
                  onChange={(e) => set({ staff: e.target.value })}
                  placeholder="担当者名"
                />
              </Field>
            </div>
          </div>
        </Collapsible>

        {/* 概算の内訳（ふだんは閉じたまま。必要なときだけ開いて上書きする） */}
        <Collapsible
          open={detailOpen}
          onToggle={() => setDetailOpen((v) => !v)}
          title={
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-fg">諸費用の内訳</span>
              <Badge tone="warn">概算</Badge>
            </div>
          }
          right={<span className="text-xs text-muted">合計 {fmtMan(otherCostTotal(resolved))}万円</span>}
        >
          <div className="space-y-3 p-4">
            <p className="rounded-lg bg-surface-2 px-3 py-2 text-[11px] leading-relaxed text-muted">
              評価額や見積りが確定するまでは、種別ごとの目安額を使っています。
              実額が分かったら上書きしてください（書類には「概算」と記載されます）。
            </p>

            <div className="grid grid-cols-2 gap-3">
              <Field label="登記費用・印紙代">
                <NumberInput value={a?.registration} onChangeNumber={(n) => set({ registration: n })} />
              </Field>
              <Field label="固都税精算金">
                <NumberInput value={a?.taxProration} onChangeNumber={(n) => set({ taxProration: n })} />
              </Field>
              <Field label="不動産取得税">
                <NumberInput value={a?.acquisitionTax} onChangeNumber={(n) => set({ acquisitionTax: n })} />
              </Field>
              <Field label="その他取得諸費用" hint="銀行諸費用・鍵交換など">
                <NumberInput
                  value={a?.otherAcquisition}
                  onChangeNumber={(n) => set({ otherAcquisition: n })}
                />
              </Field>
              <Field label="経費" hint="火災保険・瑕疵保険・残置物処分など">
                <NumberInput value={a?.expenses} onChangeNumber={(n) => set({ expenses: n })} />
              </Field>
              <Field label="販売経費（手数料以外）" hint="広告費・消費税不足分など">
                <NumberInput value={a?.sellingOther} onChangeNumber={(n) => set({ sellingOther: n })} />
              </Field>
            </div>

            <div className="space-y-2 rounded-xl border border-border p-3">
              <Toggle
                checked={resolved.includeBuyFee || resolved.buyFeeFixed > 0}
                onChange={(v) => set({ includeBuyFee: v, buyFee: undefined })}
                label="購入時手数料を見込む（買取価格×3%＋6万円）"
              />
              {resolved.buyFeeFixed > 0 && (
                <p className="text-[11px] text-muted">
                  固定額 {fmtMan(resolved.buyFeeFixed)}万円で見込んでいます（計算式と違う額が入力されているため）。
                </p>
              )}
              <Toggle
                checked={!resolved.noSellBrokerage}
                onChange={(v) => set({ noSellBrokerage: !v })}
                label={`販売時仲介手数料を見込む（${fmtMan(resolved.sellBrokerage)}万円）`}
              />
            </div>

            <Button variant="secondary" className="w-full" onClick={resetToPreset}>
              種別の目安額に戻す
            </Button>
          </div>
        </Collapsible>
      </div>

      {/* ===================== 結果 ===================== */}
      <div className="space-y-4">
        <Card className="overflow-hidden">
          <CardHeader
            title="買取価格"
            desc="確保したい粗利を選んでください。選んだ価格がそのまま書類に入ります"
          />
          <div className="p-4 pt-3">
            {resolved.resalePrice <= 0 ? (
              <div className="rounded-2xl border border-dashed border-border px-6 py-12 text-center">
                <p className="text-sm font-semibold text-fg">再販想定価格を入れてください</p>
                <p className="mt-1 text-xs text-muted">
                  入れた瞬間に、粗利100・150・200・250万円それぞれの買取価格が出ます。
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
                {lines.map((l) => {
                  const selected = a?.selectedProfitLine === l.profit;
                  const margin = resolved.resalePrice > 0 ? l.profit / resolved.resalePrice : 0;
                  return (
                    <button
                      key={l.profit}
                      type="button"
                      onClick={() =>
                        set({ selectedProfitLine: l.profit, offerPrice: Math.max(0, l.displayPrice) })
                      }
                      disabled={!l.result.feasible}
                      aria-pressed={selected}
                      className={cn(
                        "relative rounded-2xl border px-3.5 py-3.5 text-left transition-base",
                        selected
                          ? "border-brand-600 bg-brand-600 text-white"
                          : "border-border bg-surface hover:border-brand-400 hover:bg-brand-50 dark:hover:bg-brand-600/10",
                        !l.result.feasible && "cursor-not-allowed opacity-40"
                      )}
                    >
                      <div
                        className={cn(
                          "text-xs font-semibold",
                          selected ? "text-brand-100" : "text-muted"
                        )}
                      >
                        粗利 {l.profit}万円
                      </div>
                      <div className="mt-1.5 text-num-lg tabular-nums">
                        {l.result.feasible ? fmtMan(l.displayPrice) : "—"}
                        <span
                          className={cn(
                            "ml-1 text-sm font-semibold",
                            selected ? "text-brand-100" : "text-muted"
                          )}
                        >
                          万円
                        </span>
                      </div>
                      <div
                        className={cn(
                          "mt-1 text-[11px]",
                          selected ? "text-brand-100" : "text-faint"
                        )}
                      >
                        {l.result.feasible ? `粗利率 ${fmtPct(margin, 1)}` : "この粗利は確保できません"}
                      </div>
                      {selected && (
                        <span className="absolute right-3 top-3 text-white" aria-hidden>
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                            <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* 呼び名の食い違いを防ぐための注記（画面の「粗利」＝計算書の「営業利益」） */}
            <p className="mt-2 px-0.5 text-[11px] leading-relaxed text-faint">
              ここでいう粗利は、販売経費（仲介手数料・広告費など）まで差し引いた後に残る額です。
              計算書タブの「営業利益」と同じ数字になります。
            </p>

            {/* 提示価格（選んだ価格が入る。手入力で微調整もできる） */}
            <div className="mt-3 flex flex-wrap items-end gap-5 rounded-2xl bg-surface-2 p-4">
              <div className="w-44">
                <Field label="提示する買取価格" hint="書類に印字される価格です">
                  <NumberInput
                    value={offerPrice}
                    onChangeNumber={(n) => set({ offerPrice: n, selectedProfitLine: undefined })}
                    className="text-base"
                  />
                </Field>
              </div>
              {offerPrice != null && offerPrice > 0 && (
                <OfferSummary offerPrice={offerPrice} type={type} assessment={a} />
              )}
            </div>

            {/* 逆算の内訳（この価格になる理由） */}
            <Breakdown resolved={resolved} lines={lines} workLabel={workLabel} />
          </div>
        </Card>

        {/* お客様向け書類（記載内容の編集 + PDF出力） */}
        <CustomerDocsPanel />
      </div>
    </div>
  );
}

/** 諸費用（工事費を除く）の合計。折りたたみを閉じているときの要約に使う */
function otherCostTotal(r: ReturnType<typeof resolveAssessment>): number {
  return (
    r.registration + r.taxProration + r.acquisitionTax + r.otherAcquisition + r.expenses + r.sellingOther
  );
}

/**
 * 提示価格に対して実際に残る利益。
 * 提示価格から計算書を組み立てて順計算するので、計算書タブ・PDFと必ず同じ数字になる。
 */
function OfferSummary({
  offerPrice,
  type,
  assessment,
}: {
  offerPrice: number;
  type: PropertyType;
  assessment: AssessmentInput | undefined;
}) {
  const { profit, margin } = useMemo(() => {
    const r = calculate(assessmentToCalcInput(type, assessment, offerPrice));
    return { profit: r.operatingProfit, margin: r.operatingMargin };
  }, [offerPrice, type, assessment]);

  const tone = profit <= 0 ? "bad" : profit >= 200 ? "good" : "warn";
  const color =
    tone === "good"
      ? "text-good-600 dark:text-good-500"
      : tone === "bad"
      ? "text-bad-600 dark:text-bad-500"
      : "text-warn-600 dark:text-warn-500";
  return (
    <div className="flex items-center gap-3">
      <div>
        <div className="text-xs text-muted">この価格で買った場合の粗利</div>
        <div className={cn("text-num tabular-nums", color)}>
          {fmtMan(profit)}
          <span className="ml-1 text-sm font-semibold text-muted">万円</span>
        </div>
      </div>
      <Badge tone={tone}>粗利率 {fmtPct(margin, 1)}</Badge>
    </div>
  );
}

/** 逆算の内訳。再販想定価格から何を引いて買取価格になるかを示す */
function Breakdown({
  resolved,
  lines,
  workLabel,
}: {
  resolved: ReturnType<typeof resolveAssessment>;
  lines: ReturnType<typeof priceLines>;
  workLabel: string;
}) {
  const [open, setOpen] = useState(false);
  // 内訳は利益250万円の行を代表として見せる（どの行でも引く項目は同じ）
  const ref = lines[lines.length - 1];
  const rows: { label: string; value: number; note?: string }[] = [
    { label: workLabel, value: resolved.workCost },
    { label: "購入時手数料", value: ref.result.buyFee, note: "買取価格×3%＋6万円" },
    { label: "登記費用・印紙代", value: resolved.registration, note: "概算" },
    { label: "固都税精算金", value: resolved.taxProration, note: "概算" },
    { label: "不動産取得税", value: resolved.acquisitionTax, note: "概算" },
    { label: "その他取得諸費用", value: resolved.otherAcquisition, note: "概算" },
    { label: "経費", value: resolved.expenses, note: "概算" },
    { label: "販売時仲介手数料", value: resolved.sellBrokerage, note: "再販価格×3%＋6万円" },
    { label: "販売経費（手数料以外）", value: resolved.sellingOther, note: "概算" },
  ];

  return (
    <div className="mt-4">
      <Collapsible
        open={open}
        onToggle={() => setOpen((v) => !v)}
        title={<span className="text-sm font-bold text-fg">この価格になる理由（差し引いた費用）</span>}
        right={
          <span className="text-xs text-muted">
            計 {fmtMan(rows.reduce((s, r) => s + r.value, 0))}万円
          </span>
        }
      >
        <div className="p-4">
          <p className="mb-3 text-[11px] leading-relaxed text-muted">
            再販想定価格 {fmtMan(resolved.resalePrice)}万円 から、下の費用と目標の粗利を引いた残りが買取価格です。
            購入時手数料は買取価格に連動するため、収束計算（{ref.result.iterations}回）で求めています。
          </p>
          <table className="w-full text-sm">
            <tbody>
              {rows.map((r) => (
                <tr key={r.label} className="border-b border-border last:border-0">
                  <td className="py-1.5 text-muted">
                    {r.label}
                    {r.note && <span className="ml-1.5 text-[10px] text-muted/70">（{r.note}）</span>}
                  </td>
                  <td className="py-1.5 text-right font-semibold tabular-nums text-fg">
                    {fmtMan(r.value)} 万円
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Collapsible>
    </div>
  );
}
