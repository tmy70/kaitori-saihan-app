"use client";
// ============================================================
// 事業計画書タブ（API課金なしの運用）
// ・手書き作成（雛形入り）
// ・手動AI：計算結果入りプロンプトをコピー → Claude(claude.ai) に貼付 → 生成文を本文へ貼り戻し
// ・4種PDF出力
// ============================================================
import { useState } from "react";
import { useStore } from "@/lib/store";
import { Card, CardHeader, Button, TextArea, Badge } from "@/components/ui";
import { calculate, calcBrokerage, breakEvenPrice } from "@/lib/calc";
import { ngLabels } from "@/lib/checklist";
import { fmtMan, fmtPct } from "@/lib/format";
import { PROPERTY_TYPE_LABELS, PlanDoc } from "@/lib/types";
import { renderPdfUrl, triggerDownload } from "@/lib/pdf";
import { CalcPdf } from "@/components/pdf/CalcPdf";
import { RingiPdf } from "@/components/pdf/RingiPdf";
import { BankPlanPdf, InternalPlanPdf } from "@/components/pdf/PlanPdf";

type PlanType = "bank" | "internal";

export function PlanTab() {
  const current = useStore((s) => s.current)!;
  const update = useStore((s) => s.update);
  const company = useStore((s) => s.companies.find((c) => c.id === current.companyId));
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<PlanType | null>(null);

  const result = calculate(current.calc);

  // Claude(claude.ai) にそのまま貼り付けられる完成プロンプトを組み立てる
  function buildPromptText(planType: PlanType): string {
    const isBank = planType === "bank";
    const r = current.ringi;
    const numbers = [
      `- 販売価格: ${fmtMan(current.calc.sellPrice)} 万円`,
      `- 取得原価: ${fmtMan(result.acquisitionCost)} 万円`,
      `- 経費: ${fmtMan(result.expensesTotal)} 万円`,
      `- 売上原価: ${fmtMan(result.costOfSales)} 万円`,
      `- 粗利益: ${fmtMan(result.grossProfit)} 万円（粗利率 ${fmtPct(result.grossMargin)}）`,
      `- 販売経費: ${fmtMan(result.sellingExpenses)} 万円`,
      `- 営業利益: ${fmtMan(result.operatingProfit)} 万円（営業利益率 ${fmtPct(result.operatingMargin)}）`,
    ].join("\n");

    const ringiPairs: [string, string][] = [
      ["物件所在地", r.address],
      ["土地面積", r.landArea],
      ["建物面積", r.buildingArea],
      ["築年数", r.buildingAge],
      ["構造", r.structure],
      ["駐車場", r.parking],
      ["アピールポイント", r.appealPoint],
      ["売却希望理由・注意点", r.sellReason],
    ];
    const ringiText =
      ringiPairs
        .filter(([, v]) => v && v.trim() !== "")
        .map(([k, v]) => `- ${k}: ${v}`)
        .join("\n") || "（未入力）";

    const ngs = ngLabels(current.ringi.checklist);
    const ngText = ngs.length ? ngs.map((n) => `- ${n}`).join("\n") : "（特になし）";

    let simText = "";
    if (!isBank) {
      const base = result;
      const lines = current.scenarios.map((s) => {
        const sellPrice = current.calc.sellPrice + s.sellPriceDelta;
        const acquisitionCost = base.acquisitionCost + s.costDelta;
        const costOfSales = acquisitionCost + base.expensesTotal;
        const grossProfit = sellPrice - costOfSales;
        const oldB = current.calc.selling.sellBrokerage ?? 0;
        const selling = base.sellingExpenses - oldB + calcBrokerage(sellPrice);
        const op = grossProfit - selling;
        const om = sellPrice > 0 ? op / sellPrice : 0;
        return `- ${s.label}: 販売価格 ${fmtMan(sellPrice)} 万円 / 営業利益 ${fmtMan(op)} 万円（${fmtPct(om)}）`;
      });
      const otherSelling = base.sellingExpenses - (current.calc.selling.sellBrokerage ?? 0);
      const be0 = fmtMan(breakEvenPrice(base.costOfSales, 0, otherSelling, 0));
      const be10 = fmtMan(breakEvenPrice(base.costOfSales, 0, otherSelling, 0.1));
      simText =
        `\n\n# 価格変更シミュレーション\n${lines.join("\n")}\n` +
        `- 損益分岐 販売価格（営業利益0）: ${be0} 万円\n` +
        `- 目標利益率10%を満たす価格: ${be10} 万円`;
    }

    const docName = isBank ? "銀行提出用" : "社内方針確認用";
    const sectionRule = isBank
      ? "事業概要 / 物件概要 / 資金計画 / 収支計画 / 販売戦略・スケジュール / リスクと対策 / 返済見通し の章を含め、冒頭に発行会社名を明記すること。"
      : "事業概要 / 物件概要 / 収支計画 / 価格変更シミュレーションの考察（複数シナリオと損益分岐を踏まえる）/ 推奨価格と根拠 / リスクと対策 の章を含め、推奨価格を明確に提案すること。";

    return `あなたは日本の中小不動産会社の事業計画書を作成する専門家です。
以下のデータをもとに、不動産買取再販事業の「${docName}事業計画書」の本文を、日本語の堅実なビジネス文書として作成してください。

【厳守事項】
- 数値は事実です。改変・創作しないこと。本文に記載する数値は下記の値をそのまま使うこと。
- 章立ては見出しを【】で囲む形式（例:【事業概要】）にすること。
- ${sectionRule}
- チェックリストの懸念点（NG項目）はリスク欄に反映すること。
- 出力は本文のみ（前置きやコードブロックは不要）。

# 基本情報
発行会社: ${company?.name ?? ""}${company?.role ? `（${company.role}）` : ""}
案件名: ${current.name}
物件タイプ: ${PROPERTY_TYPE_LABELS[current.propertyType]}

# 収支の数値（万円・改変禁止）
${numbers}

# 物件・稟議情報
${ringiText}

# チェックリストの懸念点（NG項目）
${ngText}${simText}

上記をもとに「${docName}事業計画書」の本文を作成してください。`;
  }

  async function copyPrompt(planType: PlanType) {
    const text = buildPromptText(planType);
    setError(null);
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        // 非セキュアコンテキスト（http LAN等）向けフォールバック
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand("copy");
        ta.remove();
      }
      setCopied(planType);
      setTimeout(() => setCopied((c) => (c === planType ? null : c)), 2500);
    } catch {
      setError("クリップボードにコピーできませんでした。HTTPSでアクセスしているか確認してください。");
    }
  }

  function openClaude() {
    window.open("https://claude.ai/new", "_blank", "noopener,noreferrer");
  }

  // 雛形を入れて手書きで作成（無料・API不要）
  function manualCreate(planType: PlanType) {
    const bank = `【事業概要】
（発行会社・本案件の概要を記載）

【物件概要】
（所在地・土地/建物面積・構造・築年数・用途地域 等）

【資金計画】
（取得原価の内訳・自己資金/借入の想定）

【収支計画】
（粗利・営業利益・利益率。下表の計算結果を参照）

【販売戦略・スケジュール】
（売出方法・想定期間・各工程の予定）

【リスクと対策】
（チェックリストの懸念点と対応方針）

【返済見通し】
（借入の返済計画）`;
    const internal = `【事業概要】
（発行会社・本案件の概要を記載）

【物件概要】
（所在地・土地/建物面積・構造・築年数 等）

【収支計画】
（粗利・営業利益・利益率。下表の計算結果を参照）

【価格変更シミュレーションの考察】
（強気/標準/弱気など各シナリオの比較・損益分岐の評価）

【推奨価格と根拠】
（推奨する販売価格とその理由）

【リスクと対策】
（チェックリストの懸念点と対応方針）`;
    const doc: PlanDoc = { body: planType === "bank" ? bank : internal, edited: true };
    if (planType === "bank") update({ bankPlan: doc });
    else update({ internalPlan: doc });
  }

  function editPlan(planType: PlanType, body: string) {
    const prev = planType === "bank" ? current.bankPlan : current.internalPlan;
    const doc: PlanDoc = { ...(prev ?? { body: "" }), body, edited: true };
    if (planType === "bank") update({ bankPlan: doc });
    else update({ internalPlan: doc });
  }

  const safeName = (current.name || "案件").replace(/[\\/:*?"<>|]/g, "_");

  // PDFを別タブで開く（プレビュー表示。そこから保存・印刷できる）
  async function dl(kind: "calc" | "ringi" | "bank" | "internal") {
    // ポップアップブロック回避: クリック直後（生成のawait前）に空タブを開く
    const win = window.open("", "_blank");
    setBusy("pdf-" + kind);
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
        // 別タブでプレビュー表示
        win.location.href = url;
      } else {
        // タブが開けなかった場合（ブロック等）はダウンロードにフォールバック
        triggerDownload(url, name);
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
    <div className="space-y-4">
      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* PDF出力 */}
      <Card>
        <CardHeader title="PDF出力" desc="別タブでプレビュー表示（保存・印刷できます）" />
        <div className="grid grid-cols-2 gap-2 p-4">
          <Button variant="secondary" onClick={() => dl("calc")} disabled={!!busy}>
            {busy === "pdf-calc" ? "生成中…" : "計算書 PDF"}
          </Button>
          <Button variant="secondary" onClick={() => dl("ringi")} disabled={!!busy}>
            {busy === "pdf-ringi" ? "生成中…" : "稟議書 PDF"}
          </Button>
          <Button variant="secondary" onClick={() => dl("bank")} disabled={!!busy}>
            {busy === "pdf-bank" ? "生成中…" : "銀行用 PDF"}
          </Button>
          <Button variant="secondary" onClick={() => dl("internal")} disabled={!!busy}>
            {busy === "pdf-internal" ? "生成中…" : "社内用 PDF"}
          </Button>
        </div>
      </Card>

      {/* 銀行提出用 */}
      <PlanEditor
        title="銀行提出用 事業計画書"
        desc="堅めの文体。資金計画・収支・返済見通し・リスク"
        doc={current.bankPlan}
        copied={copied === "bank"}
        onManual={() => manualCreate("bank")}
        onCopyPrompt={() => copyPrompt("bank")}
        onOpenClaude={openClaude}
        onEdit={(v) => editPlan("bank", v)}
      />

      {/* 社内方針確認用 */}
      <PlanEditor
        title="社内方針確認用 事業計画書"
        desc="価格シミュレーション・損益分岐・推奨価格を含む"
        doc={current.internalPlan}
        copied={copied === "internal"}
        onManual={() => manualCreate("internal")}
        onCopyPrompt={() => copyPrompt("internal")}
        onOpenClaude={openClaude}
        onEdit={(v) => editPlan("internal", v)}
      />

      <div className="rounded-xl border border-border bg-surface-2 p-3 text-[11px] leading-relaxed text-muted">
        <p className="mb-1 font-semibold text-fg">事業計画書の作り方（2通り・どちらも無料）</p>
        <p>① <b>手書きで作成</b>：雛形が入るので、そのまま記入・編集。</p>
        <p>
          ② <b>AIに書かせる</b>：「AI用プロンプトをコピー」→「Claudeを開く」→ Claudeに貼り付け（Ctrl+V）→
          生成された文章をコピーして、上の本文欄に貼り戻し。お手持ちのClaude（ブラウザ版）を使うのでAPI課金はかかりません。
        </p>
        <p className="mt-1">※ 数値は計算結果をそのまま渡します。PDFには計算結果の表が自動付与されます。</p>
      </div>
    </div>
  );
}

function PlanEditor({
  title,
  desc,
  doc,
  copied,
  onManual,
  onCopyPrompt,
  onOpenClaude,
  onEdit,
}: {
  title: string;
  desc: string;
  doc?: PlanDoc;
  copied: boolean;
  onManual: () => void;
  onCopyPrompt: () => void;
  onOpenClaude: () => void;
  onEdit: (v: string) => void;
}) {
  return (
    <Card>
      <CardHeader
        title={title}
        desc={desc}
        action={doc ? <Badge tone={doc.edited ? "warn" : "good"}>{doc.edited ? "編集済み" : "作成済み"}</Badge> : undefined}
      />
      <div className="space-y-3 p-4">
        {!doc && (
          <Button variant="secondary" onClick={onManual} className="w-full">
            手書きで作成（雛形を入れる）
          </Button>
        )}
        {doc && (
          <TextArea
            rows={14}
            value={doc.body}
            onChange={(e) => onEdit(e.target.value)}
            className="font-mono text-xs leading-relaxed"
          />
        )}
        <div className="grid grid-cols-2 gap-2">
          <Button variant={copied ? "accent" : "primary"} onClick={onCopyPrompt}>
            {copied ? "コピーしました ✓" : "AI用プロンプトをコピー"}
          </Button>
          <Button variant="secondary" onClick={onOpenClaude}>
            Claudeを開く
          </Button>
        </div>
      </div>
    </Card>
  );
}
