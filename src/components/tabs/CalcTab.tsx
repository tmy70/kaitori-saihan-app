"use client";
// ============================================================
// 計算書タブ
// 費目入力 → 取得原価・経費・売上原価・粗利・販売経費・営業利益をリアルタイム計算
// ============================================================
import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { Card, CardHeader, NumberInput, TextInput, Field, Button, Badge, Select, Toggle, cn } from "@/components/ui";
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
  sqmToTsubo,
  tsuboUnitPrice,
  usesTsuboPrice,
  receivedBrokerage,
  consolidatedProfit,
  breakEvenPrice,
  sumLotsPrice,
  sumLotsTsubo,
  avgLotUnitPrice,
  lotPrice,
  itemVisibleInPdf,
} from "@/lib/calc";
import { reconcileChecklist, reconcileSchedule, defaultPassLine } from "@/lib/checklist";
import { fmtMan, fmtPct, genId } from "@/lib/format";
import { CalcInput, CustomItem, Lot, PropertyType, PROPERTY_TYPE_LABELS } from "@/lib/types";

/** 計算グループ名 → 追加費目を格納する CalcInput のフィールド名 */
const EXTRA_FIELD = {
  acquisition: "acquisitionExtra",
  expenses: "expensesExtra",
  selling: "sellingExtra",
} as const;

type CalcGroup = keyof typeof EXTRA_FIELD;

export function CalcTab() {
  const current = useStore((s) => s.current)!;
  const update = useStore((s) => s.update);
  const calc = current.calc;
  const result = useMemo(() => calculate(calc), [calc]);
  const judge = judgeProfit(result);

  function setCalc(patch: Partial<CalcInput>) {
    update({ calc: { ...calc, ...patch } });
  }
  function setItem(group: CalcGroup, key: string, v: number) {
    setCalc({ [group]: { ...calc[group], [key]: v } } as Partial<CalcInput>);
  }
  function changeType(t: PropertyType) {
    // タイプ変更: 計算入力のタイプを更新し、チェックリスト・合格ライン・スケジュールも種別に合わせて再構成
    const checklist = reconcileChecklist(current.ringi.checklist, t);
    const schedule = reconcileSchedule(current.ringi.schedule, t);
    update({
      propertyType: t,
      calc: { ...calc, propertyType: t },
      ringi: { ...current.ringi, checklist, checklistPassLine: defaultPassLine(t), schedule },
    });
  }

  // ---------------- 分譲地：区画（Lot）の操作。総販売価格は区画合計を sellPrice に反映 ----------------
  const isSubdivision = calc.propertyType === "subdivision";
  const lots = calc.lots ?? [];
  function setLots(next: Lot[]) {
    setCalc({ lots: next, sellPrice: sumLotsPrice(next) });
  }
  function addLot() {
    setLots([...lots, { id: genId(), name: `${lots.length + 1}号地`, areaSqm: undefined, tsubo: undefined, unitPrice: undefined }]);
  }
  function patchLot(id: string, patch: Partial<Lot>) {
    setLots(lots.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }
  function removeLot(id: string) {
    setLots(lots.filter((l) => l.id !== id));
  }

  // ---------------- PDFの費目別表示切替 ----------------
  const showAllPdf = calc.showZeroInPdf ?? false;
  function isPdfVisible(group: CalcGroup, key: string, value: number) {
    return itemVisibleInPdf(value, calc.pdfVisible?.[`${group}:${key}`], showAllPdf);
  }
  function togglePdfVisible(group: CalcGroup, key: string, value: number) {
    const cur = isPdfVisible(group, key, value);
    setCalc({ pdfVisible: { ...(calc.pdfVisible ?? {}), [`${group}:${key}`]: !cur } });
  }

  // ---------------- 追加費目（手動で足す費目）の操作 ----------------
  function extraOf(group: CalcGroup): CustomItem[] {
    return calc[EXTRA_FIELD[group]] ?? [];
  }
  function addCustom(group: CalcGroup) {
    const field = EXTRA_FIELD[group];
    const next = [...extraOf(group), { key: "x-" + genId(), label: "" }];
    setCalc({ [field]: next } as Partial<CalcInput>);
  }
  function setCustomLabel(group: CalcGroup, key: string, label: string) {
    const field = EXTRA_FIELD[group];
    const next = extraOf(group).map((c) => (c.key === key ? { ...c, label } : c));
    setCalc({ [field]: next } as Partial<CalcInput>);
  }
  function removeCustom(group: CalcGroup, key: string) {
    const field = EXTRA_FIELD[group];
    const next = extraOf(group).filter((c) => c.key !== key);
    const values = { ...calc[group] };
    delete values[key];
    setCalc({ [field]: next, [group]: values } as Partial<CalcInput>);
  }

  const acqItems = ACQUISITION_ITEMS[calc.propertyType];
  const expItems = EXPENSE_ITEMS[calc.propertyType];
  // 坪単価（土地・マンションのみ表示）
  const showTsubo = usesTsuboPrice(calc.propertyType);
  const tsuboLabel = calc.propertyType === "mansion" ? "専有面積" : "土地面積";
  const unitPrice = tsuboUnitPrice(calc.sellPrice, calc.tsubo);
  // 建物（戸建）面積を入力するタイプ
  const hasBuilding = calc.propertyType === "building" || calc.propertyType === "kenuri";

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
          {isSubdivision ? (
            <Field label="総販売価格（区画合計・自動）">
              <div className="rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-right text-sm font-bold text-brand-600 dark:text-brand-100">
                {fmtMan(sumLotsPrice(lots))} 万円
              </div>
            </Field>
          ) : (
            <Field label="販売価格">
              <NumberInput value={calc.sellPrice} onChangeNumber={(n) => setCalc({ sellPrice: n })} hintYen />
            </Field>
          )}
        </div>

        {/* 面積（分譲地以外）。面積m²を入れると坪数を自動換算。土地・マンションは坪単価も自動計算。稟議書へ自動転記される */}
        {!isSubdivision && (
          <div className="mt-3 border-t border-border pt-3">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Field label={`${tsuboLabel}（m²）`} hint="坪数を自動換算">
                <NumberInput
                  value={calc.areaSqm}
                  suffix="m²"
                  onChangeNumber={(n) => setCalc({ areaSqm: n, tsubo: sqmToTsubo(n) })}
                />
              </Field>
              <Field label="坪数" hint="手入力でも上書き可">
                <NumberInput value={calc.tsubo} suffix="坪" onChangeNumber={(n) => setCalc({ tsubo: n })} />
              </Field>
              {hasBuilding && (
                <Field label="建物面積（m²）" hint="戸建の延床面積">
                  <NumberInput
                    value={calc.buildingAreaSqm}
                    suffix="m²"
                    onChangeNumber={(n) => setCalc({ buildingAreaSqm: n })}
                  />
                </Field>
              )}
              {showTsubo && (
                <div className="col-span-2 flex flex-col justify-end sm:col-span-1">
                  <span className="mb-1 block text-xs font-medium text-muted">坪単価</span>
                  <div className="rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-right text-sm font-bold text-brand-600 dark:text-brand-100">
                    {unitPrice > 0 ? `${fmtMan(unitPrice)} 万円/坪` : "—"}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* 分譲地：区画割（各区画の面積・坪単価から総販売価格を自動集計） */}
      {isSubdivision && (
        <Card>
          <CardHeader
            title="区画割（分譲計画）"
            desc="各区画の面積・坪単価を入力。総販売価格は自動集計されます"
            action={<Badge tone="brand">{fmtMan(sumLotsPrice(lots))} 万円</Badge>}
          />
          <div className="divide-y divide-border">
            {lots.length === 0 && (
              <p className="px-4 py-6 text-center text-xs text-muted">「＋ 区画を追加」で区画を登録してください。</p>
            )}
            {lots.map((l) => (
              <div key={l.id} className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <TextInput
                    value={l.name}
                    placeholder="区画名（例：1号地）"
                    onChange={(e) => patchLot(l.id, { name: e.target.value })}
                    className="flex-1 text-sm"
                  />
                  <span className="shrink-0 text-sm font-bold text-brand-600 dark:text-brand-100">
                    {fmtMan(lotPrice(l))} 万円
                  </span>
                  <button
                    type="button"
                    onClick={() => removeLot(l.id)}
                    className="shrink-0 rounded-lg px-2 py-1.5 text-xs text-red-600 hover:bg-red-500/10 dark:text-red-400"
                    aria-label="この区画を削除"
                  >
                    削除
                  </button>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <Field label="面積（m²）">
                    <NumberInput
                      value={l.areaSqm}
                      suffix="m²"
                      onChangeNumber={(n) => patchLot(l.id, { areaSqm: n, tsubo: sqmToTsubo(n) })}
                    />
                  </Field>
                  <Field label="坪数">
                    <NumberInput value={l.tsubo} suffix="坪" onChangeNumber={(n) => patchLot(l.id, { tsubo: n })} />
                  </Field>
                  <Field label="坪単価">
                    <NumberInput value={l.unitPrice} suffix="万/坪" onChangeNumber={(n) => patchLot(l.id, { unitPrice: n })} />
                  </Field>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-border p-3">
            <Button variant="secondary" className="w-full min-h-[40px] text-xs" onClick={addLot}>
              ＋ 区画を追加
            </Button>
          </div>
          {/* 区画サマリー */}
          {lots.length > 0 && (
            <div className="grid grid-cols-2 gap-px border-t border-border bg-border sm:grid-cols-4">
              <LotStat label="区画数" value={`${lots.length} 区画`} />
              <LotStat label="合計坪数" value={`${fmtMan(sumLotsTsubo(lots))} 坪`} />
              <LotStat label="平均坪単価" value={`${fmtMan(avgLotUnitPrice(lots))} 万/坪`} />
              <LotStat label="総販売価格" value={`${fmtMan(sumLotsPrice(lots))} 万円`} />
            </div>
          )}
        </Card>
      )}

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
        extra={extraOf("acquisition")}
        onChange={(k, v) => setItem("acquisition", k, v)}
        onAuto={(item) => applyAuto(item, "acquisition")}
        onAddCustom={() => addCustom("acquisition")}
        onCustomLabel={(k, label) => setCustomLabel("acquisition", k, label)}
        onRemoveCustom={(k) => removeCustom("acquisition", k)}
        isVisible={(k, v) => isPdfVisible("acquisition", k, v)}
        onToggleVisible={(k, v) => togglePdfVisible("acquisition", k, v)}
      />

      {/* 経費 */}
      <ItemGroup
        title="経費"
        total={result.expensesTotal}
        items={expItems}
        values={calc.expenses}
        extra={extraOf("expenses")}
        onChange={(k, v) => setItem("expenses", k, v)}
        onAuto={(item) => applyAuto(item, "expenses")}
        onAddCustom={() => addCustom("expenses")}
        onCustomLabel={(k, label) => setCustomLabel("expenses", k, label)}
        onRemoveCustom={(k) => removeCustom("expenses", k)}
        isVisible={(k, v) => isPdfVisible("expenses", k, v)}
        onToggleVisible={(k, v) => togglePdfVisible("expenses", k, v)}
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
        extra={extraOf("selling")}
        onChange={(k, v) => setItem("selling", k, v)}
        onAuto={(item) => applyAuto(item, "selling")}
        onAddCustom={() => addCustom("selling")}
        onCustomLabel={(k, label) => setCustomLabel("selling", k, label)}
        onRemoveCustom={(k) => removeCustom("selling", k)}
        isVisible={(k, v) => isPdfVisible("selling", k, v)}
        onToggleVisible={(k, v) => togglePdfVisible("selling", k, v)}
      />

      {/* 営業利益サマリー */}
      <Card className="p-4">
        <SummaryRow label="営業利益（粗利益−販売経費）" value={result.operatingProfit} tone={judge} strong />
      </Card>

      {/* 価格の目安（損益分岐・目標利益率） */}
      {(() => {
        const otherSelling = result.sellingExpenses - (calc.selling.sellBrokerage ?? 0);
        const be0 = breakEvenPrice(result.costOfSales, 0, otherSelling, 0);
        const be10 = breakEvenPrice(result.costOfSales, 0, otherSelling, 0.1);
        return (
          <Card className="p-4">
            <h3 className="mb-2 text-sm font-bold text-fg">価格の目安</h3>
            <SummaryRow label="損益分岐の販売価格（営業利益0）" value={be0} />
            <SummaryRow label="目標利益率10%を満たす販売価格" value={be10} />
            <p className="mt-2 text-[11px] leading-relaxed text-muted">
              ※ 販売時仲介手数料（3%＋6万円）を価格連動として概算した目安です。
            </p>
          </Card>
        );
      })()}

      {/* 連結利益（自社グループが販売仲介する場合） */}
      <Card className="p-4">
        <Toggle
          checked={calc.groupBrokerage ?? false}
          onChange={(v) => setCalc({ groupBrokerage: v })}
          label="自社グループが販売仲介する（連結利益に受取手数料を加算）"
        />
        {calc.groupBrokerage && (
          <div className="mt-3 border-t border-border pt-3">
            <SummaryRow label="受取仲介手数料（税抜・3%＋6万円）" value={receivedBrokerage(calc)} />
            <SummaryRow label="連結粗利（営業利益＋受取手数料）" value={consolidatedProfit(result, calc)} strong />
            <p className="mt-2 text-[11px] leading-relaxed text-muted">
              ※ 自社グループ仲介のため外部への仲介手数料支払いは発生しない前提です。販売経費の「販売時仲介手数料」は0にしてください（受取分はここで加算します）。
            </p>
          </div>
        )}
      </Card>

      {/* PDF出力オプション */}
      <Card className="p-4">
        <Toggle
          checked={calc.showZeroInPdf ?? false}
          onChange={(v) => setCalc({ showZeroInPdf: v })}
          label="0円・未入力の費目もPDFに表示する"
        />
        <p className="mt-2 text-[11px] leading-relaxed text-muted">
          既定では金額の入っていない費目はPDFに印刷されません（1ページに収めるため）。すべての費目を一括で載せたい場合はオンに。
          個別に印刷可否を変えたいときは、各費目右側の「PDF」チェックで1つずつ切り替えられます（チェック＝印刷する）。
        </p>
      </Card>
    </div>
  );
}

function ItemGroup({
  title,
  total,
  items,
  values,
  extra,
  onChange,
  onAuto,
  onAddCustom,
  onCustomLabel,
  onRemoveCustom,
  isVisible,
  onToggleVisible,
}: {
  title: string;
  total: number;
  items: ItemDef[];
  values: Record<string, number>;
  extra: CustomItem[];
  onChange: (key: string, v: number) => void;
  onAuto: (item: ItemDef) => void;
  onAddCustom: () => void;
  onCustomLabel: (key: string, label: string) => void;
  onRemoveCustom: (key: string) => void;
  isVisible: (key: string, value: number) => boolean;
  onToggleVisible: (key: string, value: number) => void;
}) {
  return (
    <Card>
      <CardHeader title={title} action={<Badge tone="brand">{fmtMan(total)} 万円</Badge>} />
      <div className="divide-y divide-border">
        {/* 既定の費目 */}
        {items.map((it) => (
          <div key={it.key} className="px-4 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-fg">
                {it.label}
                {it.note && <span className="ml-1 text-[10px] text-muted">（{it.note}）</span>}
              </span>
              <PdfCheck visible={isVisible(it.key, values[it.key] ?? 0)} onToggle={() => onToggleVisible(it.key, values[it.key] ?? 0)} />
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <div className="flex-1">
                <NumberInput value={values[it.key] ?? 0} onChangeNumber={(n) => onChange(it.key, n)} hintYen />
              </div>
              {it.auto && (
                <Button variant="secondary" className="min-h-[40px] px-3 text-xs" onClick={() => onAuto(it)}>
                  自動計算
                </Button>
              )}
            </div>
          </div>
        ))}

        {/* 追加費目（手動で足した費目。費目名を編集・削除できる） */}
        {extra.map((c) => (
          <div key={c.key} className="px-4 py-2.5">
            <div className="flex items-center gap-2">
              <TextInput
                value={c.label}
                placeholder="費目名を入力"
                onChange={(e) => onCustomLabel(c.key, e.target.value)}
                className="flex-1 text-sm"
              />
              <PdfCheck visible={isVisible(c.key, values[c.key] ?? 0)} onToggle={() => onToggleVisible(c.key, values[c.key] ?? 0)} />
              <button
                type="button"
                onClick={() => onRemoveCustom(c.key)}
                className="shrink-0 rounded-lg px-2 py-1.5 text-xs text-red-600 hover:bg-red-500/10 dark:text-red-400"
                aria-label="この費目を削除"
              >
                削除
              </button>
            </div>
            <div className="mt-1.5">
              <NumberInput value={values[c.key] ?? 0} onChangeNumber={(n) => onChange(c.key, n)} hintYen />
            </div>
          </div>
        ))}
      </div>

      {/* 費目を追加 */}
      <div className="border-t border-border p-3">
        <Button variant="secondary" className="w-full min-h-[40px] text-xs" onClick={onAddCustom}>
          ＋ 費目を追加
        </Button>
      </div>
    </Card>
  );
}

/** 費目ごとのPDF表示チェック（チェック=印刷する／外す=印刷しない） */
function PdfCheck({ visible, onToggle }: { visible: boolean; onToggle: () => void }) {
  return (
    <label className="flex shrink-0 cursor-pointer items-center gap-1 text-[10px] text-muted" title="PDFに印刷するかどうか">
      <input type="checkbox" checked={visible} onChange={onToggle} className="h-3.5 w-3.5 accent-brand-500" />
      PDF
    </label>
  );
}

function LotStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface p-2.5 text-center">
      <div className="text-[10px] text-muted">{label}</div>
      <div className="text-sm font-bold text-fg">{value}</div>
    </div>
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
