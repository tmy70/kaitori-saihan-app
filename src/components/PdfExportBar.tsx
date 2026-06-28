"use client";
// ============================================================
// PDF出力ツールバー（案件編集画面の上部・欄外に常設）
// タブに依存せず、どのタブからでも4種のPDFを別タブでプレビュー出力できる
// ============================================================
import { useState } from "react";
import { useStore } from "@/lib/store";
import { renderPdfUrl, triggerDownload } from "@/lib/pdf";
import { CalcPdf } from "@/components/pdf/CalcPdf";
import { RingiPdf } from "@/components/pdf/RingiPdf";
import { BankPlanPdf, InternalPlanPdf } from "@/components/pdf/PlanPdf";
import { cn } from "@/components/ui";

type Kind = "calc" | "ringi" | "bank" | "internal";

const ITEMS: { kind: Kind; label: string; short: string }[] = [
  { kind: "calc", label: "収支計算書", short: "計算書" },
  { kind: "ringi", label: "稟議書", short: "稟議書" },
  { kind: "bank", label: "事業計画書（銀行用）", short: "銀行用" },
  { kind: "internal", label: "事業計画書（社内用）", short: "社内用" },
];

export function PdfExportBar() {
  const current = useStore((s) => s.current);
  const company = useStore((s) => s.companies.find((c) => c.id === current?.companyId));
  const [busy, setBusy] = useState<Kind | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!current) return null;
  const safeName = (current.name || "案件").replace(/[\\/:*?"<>|]/g, "_");

  async function dl(kind: Kind) {
    if (!current) return;
    // ポップアップブロック回避: クリック直後（生成のawait前）に空タブを開く
    const win = window.open("", "_blank");
    setBusy(kind);
    setError(null);
    try {
      const map = {
        calc: { el: <CalcPdf project={current} company={company} />, name: `計算書_${safeName}` },
        ringi: { el: <RingiPdf project={current} company={company} />, name: `稟議書_${safeName}` },
        bank: { el: <BankPlanPdf project={current} company={company} />, name: `事業計画書_銀行提出用_${safeName}` },
        internal: { el: <InternalPlanPdf project={current} company={company} />, name: `事業計画書_社内用_${safeName}` },
      } as const;
      const { el, name } = map[kind];
      const url = await renderPdfUrl(el);
      if (win && !win.closed) {
        win.location.href = url; // 別タブでプレビュー
      } else {
        triggerDownload(url, name); // ブロック時はダウンロードにフォールバック
      }
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
      if (win && !win.closed) win.close();
      setError("PDF生成に失敗しました: " + (e instanceof Error ? e.message : ""));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-gradient-to-r from-brand-500/10 to-accent-500/10 p-2.5 shadow-card">
      <div className="flex items-center gap-2">
        <div className="flex shrink-0 items-center gap-1.5 pl-1 pr-2 text-brand-700 dark:text-brand-100">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M14 2v6h6M12 18v-6M9 15l3 3 3-3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-xs font-bold">PDF出力</span>
        </div>
        <div className="flex flex-1 gap-1.5 overflow-x-auto">
          {ITEMS.map((it) => (
            <button
              key={it.kind}
              type="button"
              onClick={() => dl(it.kind)}
              disabled={!!busy}
              title={it.label}
              className={cn(
                "shrink-0 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-semibold text-fg transition-base",
                "hover:border-brand-500 hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:text-brand-100"
              )}
            >
              {busy === it.kind ? "生成中…" : it.short}
            </button>
          ))}
        </div>
      </div>
      {error && <p className="mt-2 px-1 text-[11px] text-red-600 dark:text-red-400">{error}</p>}
      <p className="mt-1.5 px-1 text-[10px] text-muted">別タブでプレビュー表示します（そこから保存・印刷できます）</p>
    </div>
  );
}
