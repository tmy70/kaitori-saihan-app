"use client";
// ============================================================
// 銀行用タブ（買取決定後のみ表示）
//
// 細かい入力はここだけ。銀行が求める項目に絞っている。
//   対象不動産の概要 / 取得費用の明細（円単位）/ 販売計画 / 資金計画 / 事業スケジュール
//
// AI生成のプロンプトコピーは画面の奥（折りたたみ）に置く。
// ============================================================
import { useState } from "react";
import { useStore } from "@/lib/store";
import {
  Button,
  Card,
  CardHeader,
  Collapsible,
  Field,
  NumberInput,
  TextArea,
  TextInput,
} from "@/components/ui";
import { calculate } from "@/lib/calc";
import { ACQUISITION_ITEMS, EXPENSE_ITEMS, SELLING_ITEMS, ItemDef } from "@/lib/itemDefs";
import { fmtMan, fmtManAsYen } from "@/lib/format";
import { BankData, BANK_SCHEDULE_ROWS, BankScheduleRow, PROPERTY_TYPE_LABELS } from "@/lib/types";
import { buildBankPrompt } from "@/lib/bankPrompt";

export function BankTab() {
  const current = useStore((s) => s.current)!;
  const update = useStore((s) => s.update);
  const company = useStore((s) => s.companies.find((c) => c.id === current.companyId));
  const [promptOpen, setPromptOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);

  const bank = current.bank ?? {};
  const result = calculate(current.calc);

  function setBank(patch: Partial<BankData>) {
    update({ bank: { ...bank, ...patch } });
  }

  const schedule: BankScheduleRow[] =
    bank.schedule && bank.schedule.length > 0
      ? bank.schedule
      : BANK_SCHEDULE_ROWS.map((r) => ({ ...r, when: "" }));

  function setScheduleRow(key: string, when: string) {
    setBank({ schedule: schedule.map((r) => (r.key === key ? { ...r, when } : r)) });
  }

  // 資金計画の確認：借入額＋自己資金が取得に必要な額を満たしているか
  const needed = result.acquisitionCost + result.expensesTotal;
  const funded = (bank.loanAmount ?? 0) + (bank.ownFunds ?? 0);

  async function copyPrompt() {
    setCopyError(null);
    try {
      const text = buildBankPrompt(current, company);
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopyError("クリップボードにコピーできませんでした。HTTPSでアクセスしているか確認してください。");
    }
  }

  return (
    <div className="space-y-4">
      {/* ---- 対象不動産の概要 ---- */}
      <Card>
        <CardHeader title="対象不動産の概要" desc="登記事項証明書・調査結果を転記します" />
        <div className="grid grid-cols-3 gap-3 p-4">
          <Field label="所在">
            <TextInput
              value={current.assessment?.address ?? ""}
              onChange={(e) =>
                update({
                  assessment: {
                    ...(current.assessment ?? { resalePrice: 0, workCost: 0 }),
                    address: e.target.value,
                  },
                })
              }
            />
          </Field>
          <Field label="地番">
            <TextInput value={bank.lotNumber ?? ""} onChange={(e) => setBank({ lotNumber: e.target.value })} />
          </Field>
          <Field label="地目">
            <TextInput
              value={bank.landCategory ?? ""}
              onChange={(e) => setBank({ landCategory: e.target.value })}
              placeholder="例：宅地"
            />
          </Field>
          <Field label="土地面積" hint="査定タブの入力と共通です">
            <NumberInput
              value={current.assessment?.landAreaSqm}
              onChangeNumber={(n) =>
                update({
                  assessment: { ...(current.assessment ?? { resalePrice: 0, workCost: 0 }), landAreaSqm: n },
                })
              }
              suffix="m²"
            />
          </Field>
          <Field label="建物面積">
            <NumberInput
              value={current.assessment?.buildingAreaSqm}
              onChangeNumber={(n) =>
                update({
                  assessment: {
                    ...(current.assessment ?? { resalePrice: 0, workCost: 0 }),
                    buildingAreaSqm: n,
                  },
                })
              }
              suffix="m²"
            />
          </Field>
          <Field label="構造・階数">
            <TextInput
              value={bank.structure ?? ""}
              onChange={(e) => setBank({ structure: e.target.value })}
              placeholder="例：木造2階建"
            />
          </Field>
          <Field label="築年">
            <TextInput
              value={current.assessment?.buildingAge ?? ""}
              onChange={(e) =>
                update({
                  assessment: {
                    ...(current.assessment ?? { resalePrice: 0, workCost: 0 }),
                    buildingAge: e.target.value,
                  },
                })
              }
            />
          </Field>
          <Field label="用途">
            <TextInput
              value={bank.usage ?? ""}
              onChange={(e) => setBank({ usage: e.target.value })}
              placeholder="例：居住用"
            />
          </Field>
          <Field label="用途地域">
            <TextInput
              value={bank.useDistrict ?? ""}
              onChange={(e) => setBank({ useDistrict: e.target.value })}
              placeholder="例：第一種低層住居専用地域"
            />
          </Field>
          <Field label="建蔽率">
            <TextInput
              value={bank.buildingCoverage ?? ""}
              onChange={(e) => setBank({ buildingCoverage: e.target.value })}
              placeholder="例：60%"
            />
          </Field>
          <Field label="容積率">
            <TextInput
              value={bank.floorAreaRatio ?? ""}
              onChange={(e) => setBank({ floorAreaRatio: e.target.value })}
              placeholder="例：200%"
            />
          </Field>
          <Field label="接道">
            <TextInput
              value={bank.roadAccess ?? ""}
              onChange={(e) => setBank({ roadAccess: e.target.value })}
              placeholder="例：南側 幅員4.0m 市道に8.0m接道"
            />
          </Field>
        </div>
      </Card>

      {/* ---- 取得費用の明細（円単位・計算書から自動） ---- */}
      <Card>
        <CardHeader
          title="取得費用の明細"
          desc="計算書の費目をそのまま円単位で出します（金額は計算書タブで修正してください）"
        />
        <div className="p-4">
          <YenTable
            title="取得原価"
            items={[...ACQUISITION_ITEMS[current.propertyType], ...(current.calc.acquisitionExtra ?? [])]}
            values={current.calc.acquisition}
            total={result.acquisitionCost}
          />
          <YenTable
            title="経費"
            items={[...EXPENSE_ITEMS[current.propertyType], ...(current.calc.expensesExtra ?? [])]}
            values={current.calc.expenses}
            total={result.expensesTotal}
          />
          <YenTable
            title="販売経費"
            items={[...SELLING_ITEMS, ...(current.calc.sellingExtra ?? [])]}
            values={current.calc.selling}
            total={result.sellingExpenses}
          />
        </div>
      </Card>

      {/* ---- 販売計画 ---- */}
      <Card>
        <CardHeader title="販売計画" desc="販売価格は計算書の販売価格を使います" />
        <div className="grid grid-cols-3 gap-3 p-4">
          <Field label="販売価格">
            <div className="rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-right text-sm font-semibold">
              {fmtManAsYen(current.calc.sellPrice)}
            </div>
          </Field>
          <Field label="販売時期">
            <TextInput
              value={bank.saleTiming ?? ""}
              onChange={(e) => setBank({ saleTiming: e.target.value })}
              placeholder="例：2026年9月〜12月"
            />
          </Field>
          <Field label="販売経費（合計）">
            <div className="rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-right text-sm font-semibold">
              {fmtManAsYen(result.sellingExpenses)}
            </div>
          </Field>
          <div className="col-span-3">
            <Field label="販売方法・販売経路">
              <TextArea
                rows={2}
                value={bank.saleMethod ?? ""}
                onChange={(e) => setBank({ saleMethod: e.target.value })}
                placeholder="例：自社ホームページ・ポータルサイト掲載、現地販売会の実施"
              />
            </Field>
          </div>
        </div>
      </Card>

      {/* ---- 資金計画 ---- */}
      <Card>
        <CardHeader title="資金計画" desc="借入額・自己資金・返済原資・返済時期" />
        <div className="grid grid-cols-2 gap-3 p-4">
          <Field label="借入希望額">
            <NumberInput value={bank.loanAmount} onChangeNumber={(n) => setBank({ loanAmount: n })} hintYen />
          </Field>
          <Field label="自己資金">
            <NumberInput value={bank.ownFunds} onChangeNumber={(n) => setBank({ ownFunds: n })} hintYen />
          </Field>
          <Field label="返済原資">
            <TextInput
              value={bank.repaymentSource ?? ""}
              onChange={(e) => setBank({ repaymentSource: e.target.value })}
              placeholder="例：本物件の売却代金"
            />
          </Field>
          <Field label="返済時期">
            <TextInput
              value={bank.repaymentTiming ?? ""}
              onChange={(e) => setBank({ repaymentTiming: e.target.value })}
              placeholder="例：売却決済時に一括返済"
            />
          </Field>
          <div className="col-span-2 rounded-xl border border-border bg-surface-2 p-3 text-xs">
            <div className="flex justify-between">
              <span className="text-muted">取得に必要な額（取得原価＋経費）</span>
              <span className="font-semibold tabular-nums">{fmtMan(needed)} 万円</span>
            </div>
            <div className="mt-1 flex justify-between">
              <span className="text-muted">借入額＋自己資金</span>
              <span className="font-semibold tabular-nums">{fmtMan(funded)} 万円</span>
            </div>
            {funded > 0 && funded < needed && (
              <p className="mt-2 text-amber-600 dark:text-amber-400">
                必要額に {fmtMan(needed - funded)} 万円 足りません。借入額か自己資金をご確認ください。
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* ---- 事業スケジュール ---- */}
      <Card>
        <CardHeader title="事業スケジュール" desc="契約・決済・工事・販売・返済の時期" />
        <div className="space-y-2 p-4">
          {schedule.map((r) => (
            <div key={r.key} className="flex items-center gap-3">
              <span className="w-48 shrink-0 text-sm text-muted">{r.label}</span>
              <TextInput
                value={r.when}
                onChange={(e) => setScheduleRow(r.key, e.target.value)}
                placeholder="例：2026-06-30 もしくは 2026年6月下旬"
              />
            </div>
          ))}
        </div>
      </Card>

      {/* ---- AI下書き（画面の奥） ---- */}
      <Collapsible
        open={promptOpen}
        onToggle={() => setPromptOpen((v) => !v)}
        title={<span className="text-sm font-bold text-fg">事業概要の文章をAIに下書きさせる（任意）</span>}
      >
        <div className="space-y-3 p-4">
          <p className="text-[11px] leading-relaxed text-muted">
            上の入力と計算結果を差し込んだ依頼文をコピーし、お手持ちのClaude（ブラウザ版）に貼り付けると、
            事業概要の文章を下書きできます。出てきた文章を下の欄に貼り戻すとPDFの冒頭に入ります。
            API課金はかかりません。数値はPDF側で計算結果から印字するため、文章が数値を書き換えることはありません。
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant={copied ? "accent" : "primary"} className="min-h-[36px] text-xs" onClick={copyPrompt}>
              {copied ? "コピーしました" : "依頼文をコピー"}
            </Button>
            <Button
              variant="secondary"
              className="min-h-[36px] text-xs"
              onClick={() => window.open("https://claude.ai/new", "_blank", "noopener,noreferrer")}
            >
              Claudeを開く
            </Button>
          </div>
          {copyError && <p className="text-[11px] text-red-600 dark:text-red-400">{copyError}</p>}
          <Field label="事業概要の本文（PDFの冒頭に入ります）">
            <TextArea
              rows={10}
              value={current.bankPlan?.body ?? ""}
              onChange={(e) => update({ bankPlan: { ...(current.bankPlan ?? { body: "" }), body: e.target.value, edited: true } })}
              className="font-mono text-xs leading-relaxed"
              placeholder={`${PROPERTY_TYPE_LABELS[current.propertyType]}としての商品性、立地・周辺の生活利便性などを記載します。`}
            />
          </Field>
        </div>
      </Collapsible>
    </div>
  );
}

/** 費目の円建て一覧（金額0は出さない） */
function YenTable({
  title,
  items,
  values,
  total,
}: {
  title: string;
  items: ItemDef[];
  values: Record<string, number>;
  total: number;
}) {
  const rows = items.filter((it) => Number.isFinite(values[it.key]) && values[it.key] !== 0);
  return (
    <div className="mb-4 last:mb-0">
      <h4 className="mb-1 text-xs font-bold text-muted">{title}</h4>
      <table className="w-full text-sm">
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td className="py-1.5 text-muted">（該当なし）</td>
            </tr>
          ) : (
            rows.map((it) => (
              <tr key={it.key} className="border-b border-border">
                <td className="py-1.5 text-muted">{it.label}</td>
                <td className="py-1.5 text-right tabular-nums">{fmtManAsYen(values[it.key])}</td>
              </tr>
            ))
          )}
          <tr>
            <td className="py-1.5 font-bold">合計</td>
            <td className="py-1.5 text-right font-bold tabular-nums">{fmtManAsYen(total)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
