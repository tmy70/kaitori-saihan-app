"use client";
// ============================================================
// 社内用PDFの出力（買取決定後に表示）
//  ・収支計算書
//  ・稟議書（社内用の事業計画は1ページ要約として稟議書に統合済み）
//  ・銀行提出用 事業計画書
// お客様にお渡しする書類は査定タブの「お客様にお渡しする書類」から出す。
// ============================================================
import { useState } from "react";
import { useStore } from "@/lib/store";
import { renderPdfUrl, triggerDownload } from "@/lib/pdf";
import { CalcPdf } from "@/components/pdf/CalcPdf";
import { RingiPdf } from "@/components/pdf/RingiPdf";
import { BankPdf } from "@/components/pdf/BankPdf";
import { Button } from "@/components/ui";

type Kind = "calc" | "ringi" | "bank";

const ITEMS: { kind: Kind; label: string }[] = [
  { kind: "calc", label: "収支計算書" },
  { kind: "ringi", label: "稟議書" },
  { kind: "bank", label: "銀行提出用" },
];

export function InternalPdfBar() {
  const current = useStore((s) => s.current);
  const company = useStore((s) => s.companies.find((c) => c.id === current?.companyId));
  const [busy, setBusy] = useState<Kind | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!current) return null;
  const safeName = (current.name || "案件").replace(/[\\/:*?"<>|]/g, "_");

  async function output(kind: Kind) {
    if (!current) return;
    // ポップアップブロック回避：クリック直後（生成の await 前）に空タブを開く
    const win = window.open("", "_blank");
    setBusy(kind);
    setError(null);
    try {
      const map = {
        calc: { el: <CalcPdf project={current} company={company} />, name: `計算書_${safeName}` },
        ringi: { el: <RingiPdf project={current} company={company} />, name: `稟議書_${safeName}` },
        bank: { el: <BankPdf project={current} company={company} />, name: `事業計画書_銀行提出用_${safeName}` },
      } as const;
      const { el, name } = map[kind];
      const url = await renderPdfUrl(el);
      if (win && !win.closed) win.location.href = url;
      else triggerDownload(url, name);
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
      if (win && !win.closed) win.close();
      setError("PDFの作成に失敗しました：" + (e instanceof Error ? e.message : ""));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="pr-1 text-xs font-bold text-muted">社内用PDF</span>
        {ITEMS.map((it) => (
          <Button
            key={it.kind}
            variant="secondary"
            className="min-h-[36px] text-xs"
            disabled={!!busy}
            onClick={() => output(it.kind)}
          >
            {busy === it.kind ? "作成中…" : it.label}
          </Button>
        ))}
        <span className="text-[11px] text-muted">別タブで開きます（そこから保存・印刷できます）</span>
      </div>
      {error && <p className="mt-2 text-[11px] text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
