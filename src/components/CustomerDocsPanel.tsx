"use client";
// ============================================================
// お客様向け書類（記載内容の編集 ＋ PDF出力）
//
//  1. 買取査定書（買取価格のご提示）
//  2. 買取保証書
//  3. 仲介と買取の比較表
//  4. 社内用 計算根拠（稟議の添付用）
//
// 売主様側の仲介手数料の有無は未選択のままだと買取査定書を出せない（仕様）。
// 買取保証書の条件文言は社内確認が済むまで画面上に注意書きを出す（PDFには印字しない）。
// ============================================================
import { useState } from "react";
import { useStore } from "@/lib/store";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  Field,
  NumberInput,
  Select,
  TextArea,
  TextInput,
  cn,
} from "@/components/ui";
import { renderPdfUrl, triggerDownload } from "@/lib/pdf";
import { SateiPdf } from "@/components/pdf/SateiPdf";
import { HoshoPdf } from "@/components/pdf/HoshoPdf";
import { HikakuPdf } from "@/components/pdf/HikakuPdf";
import { KonkyoPdf } from "@/components/pdf/KonkyoPdf";
import {
  DEFAULT_CONDITIONS,
  DEFAULT_GUARANTEE_CONDITIONS,
  DEFAULT_MEDIATION_COMPANY,
  defaultGuaranteeUntil,
  VALID_DAYS,
} from "@/lib/docDefaults";
import { addDays, fmtMan } from "@/lib/format";
import { DocSettings, SELLER_FEE_LABELS, SellerFeeChoice } from "@/lib/types";

type Kind = "satei" | "hosho" | "hikaku" | "konkyo";

export function CustomerDocsPanel() {
  const current = useStore((s) => s.current);
  const update = useStore((s) => s.update);
  const company = useStore((s) => s.companies.find((c) => c.id === current?.companyId));
  const [busy, setBusy] = useState<Kind | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!current) return null;
  const docs = current.docs ?? {};
  const offerPrice = current.assessment?.offerPrice ?? 0;

  function setDocs(patch: Partial<DocSettings>) {
    update({ docs: { ...docs, ...patch } });
  }

  const feeChosen = docs.sellerFee === "none" || docs.sellerFee === "charged";
  const hasPrice = offerPrice > 0;
  const guaranteePrice = docs.guaranteePrice ?? offerPrice;

  /** 出力できない理由（空なら出力可能） */
  function blockedReason(kind: Kind): string {
    if (!hasPrice && kind !== "konkyo") return "先に買取価格を決めてください";
    // 比較表の「お手元に残る金額」は手数料の有無で変わるため、査定書と同じく選択を必須にする
    if ((kind === "satei" || kind === "hikaku") && !feeChosen)
      return "売主様側の仲介手数料の有無を選んでください";
    if (kind === "hosho" && !docs.guaranteeUntil) return "保証期限を入れてください";
    return "";
  }

  async function output(kind: Kind) {
    if (!current) return;
    const win = window.open("", "_blank");
    setBusy(kind);
    setError(null);
    try {
      const safe = (current.name || "案件").replace(/[\\/:*?"<>|]/g, "_");
      const map = {
        satei: { el: <SateiPdf project={current} company={company} />, name: `買取査定書_${safe}` },
        hosho: { el: <HoshoPdf project={current} company={company} />, name: `買取保証書_${safe}` },
        hikaku: { el: <HikakuPdf project={current} company={company} />, name: `仲介と買取の比較_${safe}` },
        konkyo: { el: <KonkyoPdf project={current} company={company} />, name: `計算根拠_${safe}` },
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

  const buttons: { kind: Kind; label: string }[] = [
    { kind: "satei", label: "買取査定書" },
    { kind: "hosho", label: "買取保証書" },
    { kind: "hikaku", label: "仲介と買取の比較表" },
    { kind: "konkyo", label: "社内用 計算根拠" },
  ];

  const blockedNotes = buttons
    .map((b) => ({ label: b.label, reason: blockedReason(b.kind) }))
    .filter((n) => n.reason !== "");

  return (
    <Card>
      <CardHeader title="お客様にお渡しする書類" desc="記載内容を確認してから出力してください" />
      <div className="space-y-5 p-4">
        {/* ---- 出力ボタン ---- */}
        <div>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            {buttons.map((b) => {
              const reason = blockedReason(b.kind);
              return (
                <Button
                  key={b.kind}
                  variant={b.kind === "konkyo" ? "secondary" : "primary"}
                  className="w-full"
                  disabled={!!reason || !!busy}
                  title={reason || undefined}
                  onClick={() => output(b.kind)}
                >
                  {busy === b.kind ? "作成中…" : b.label}
                </Button>
              );
            })}
          </div>
          {/* 出せない書類がある理由は、ボタンの下にまとめて出す（ボタン幅に収まらないため） */}
          {blockedNotes.length > 0 && (
            <ul className="mt-2 space-y-0.5">
              {blockedNotes.map((n) => (
                <li key={n.label} className="text-[11px] leading-snug text-amber-600 dark:text-amber-400">
                  {n.label}を出すには：{n.reason}
                </li>
              ))}
            </ul>
          )}
        </div>
        {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}

        {/* ---- 共通の記載事項 ---- */}
        <section className="space-y-3">
          <h4 className="text-xs font-bold text-muted">共通</h4>
          <div className="grid grid-cols-3 gap-3">
            <Field label="宛名（売主様氏名）" hint="書類には「〇〇 様」と印字されます">
              <TextInput
                value={docs.sellerName ?? ""}
                onChange={(e) => setDocs({ sellerName: e.target.value })}
                placeholder="例：富山 太郎"
              />
            </Field>
            <Field label="発行日">
              <TextInput
                type="date"
                value={docs.issueDate ?? ""}
                onChange={(e) =>
                  setDocs({ issueDate: e.target.value, validUntil: addDays(e.target.value, VALID_DAYS) })
                }
              />
            </Field>
            <Field label="有効期限" hint={`既定は発行日から${VALID_DAYS}日`}>
              <TextInput
                type="date"
                value={docs.validUntil ?? ""}
                onChange={(e) => setDocs({ validUntil: e.target.value })}
              />
            </Field>
          </div>

          <Field
            label="売主様側の仲介手数料"
            hint="発行会社と取引形態で変わります。選ぶまで買取査定書は出力できません"
          >
            <Select
              value={docs.sellerFee ?? ""}
              onChange={(v) => setDocs({ sellerFee: v as SellerFeeChoice })}
              options={[
                { value: "", label: "— 選択してください —" },
                { value: "none", label: "かからない（弊社が直接買い取るため）" },
                { value: "charged", label: "かかる（媒介契約に基づき申し受ける）" },
              ]}
              className={cn(!feeChosen && "border-amber-500 ring-2 ring-amber-500/20")}
            />
          </Field>
          {feeChosen && (
            <p className="rounded-lg bg-surface-2 px-3 py-2 text-[11px] leading-relaxed text-muted">
              書類への記載：{SELLER_FEE_LABELS[docs.sellerFee as "none" | "charged"]}
            </p>
          )}

          <Field label="前提条件" hint="1行につき1項目。買取査定書に箇条書きで印字されます">
            <TextArea
              rows={7}
              value={(docs.conditions ?? DEFAULT_CONDITIONS).join("\n")}
              onChange={(e) => setDocs({ conditions: splitLines(e.target.value) })}
            />
          </Field>
          <Button
            variant="secondary"
            className="min-h-[36px] text-xs"
            onClick={() => setDocs({ conditions: [...DEFAULT_CONDITIONS] })}
          >
            前提条件を既定の文に戻す
          </Button>
        </section>

        {/* ---- 買取保証書 ---- */}
        <section className="space-y-3 border-t border-border pt-4">
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-bold text-muted">買取保証書</h4>
            <Badge tone="warn">要確認</Badge>
          </div>
          <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[11px] leading-relaxed text-amber-700 dark:text-amber-300">
            保証の条件の文言は、最初の1枚を発行する前に社内で確認してください。
            確認が済むまでこの注意書きは画面にだけ表示されます（PDFには印字されません）。
          </p>
          <Field
            label="媒介業者"
            hint="販売を媒介する会社。買取をする発行会社とは別のことがあるため、書面で書き分けます"
          >
            <TextInput
              value={docs.mediationCompany ?? ""}
              onChange={(e) => setDocs({ mediationCompany: e.target.value })}
              placeholder={DEFAULT_MEDIATION_COMPANY}
            />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="媒介契約日">
              <TextInput
                type="date"
                value={docs.mediationDate ?? ""}
                onChange={(e) =>
                  setDocs({
                    mediationDate: e.target.value,
                    guaranteeUntil: defaultGuaranteeUntil(e.target.value),
                  })
                }
              />
            </Field>
            <Field label="保証期限" hint="既定は媒介契約日から3か月">
              <TextInput
                type="date"
                value={docs.guaranteeUntil ?? ""}
                onChange={(e) => setDocs({ guaranteeUntil: e.target.value })}
              />
            </Field>
            <Field label="保証価格" hint={`未入力なら提示価格（${fmtMan(offerPrice)}万円）を使います`}>
              <NumberInput
                value={docs.guaranteePrice}
                onChangeNumber={(n) => setDocs({ guaranteePrice: n || undefined })}
                placeholder={String(offerPrice)}
              />
            </Field>
          </div>
          <p className="text-[11px] text-muted">
            保証する価格：{fmtMan(guaranteePrice)}万円
          </p>
          <Field label="保証の条件" hint="1行につき1項目">
            <TextArea
              rows={4}
              value={(docs.guaranteeConditions ?? DEFAULT_GUARANTEE_CONDITIONS).join("\n")}
              onChange={(e) => setDocs({ guaranteeConditions: splitLines(e.target.value) })}
            />
          </Field>
        </section>

        {/* ---- 比較表 ---- */}
        <section className="space-y-3 border-t border-border pt-4">
          <h4 className="text-xs font-bold text-muted">仲介と買取の比較表</h4>
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="仲介で売る場合の期間の目安"
              hint="空欄のままなら「状況により異なります」と印字されます"
            >
              <TextInput
                value={docs.brokerageMonths ?? ""}
                onChange={(e) => setDocs({ brokerageMonths: e.target.value })}
                placeholder="例：3〜6か月程度"
              />
            </Field>
            <Field
              label="買取の場合の期間の目安"
              hint="空欄のままなら「ご相談のうえ決定します」と印字されます"
            >
              <TextInput
                value={docs.purchaseMonths ?? ""}
                onChange={(e) => setDocs({ purchaseMonths: e.target.value })}
                placeholder="例：ご契約後1か月程度"
              />
            </Field>
          </div>
          <p className="text-[11px] leading-relaxed text-muted">
            買取の「お手元に残る金額」は、上で選んだ売主様側の仲介手数料の有無に合わせて印字されます。
            {feeChosen
              ? docs.sellerFee === "charged"
                ? "いまの設定では、買取価格から仲介手数料を差し引いた額を記載します。"
                : "いまの設定では、仲介手数料の差引なしで買取価格をそのまま記載します。"
              : "未選択のあいだは比較表を出力できません。"}
          </p>
          <p className="text-[11px] text-muted">
            仲介の査定価格は査定入力欄の値（
            {current.assessment?.brokerAssessPrice
              ? `${fmtMan(current.assessment.brokerAssessPrice)}万円`
              : "未入力"}
            ）を使います。
          </p>
        </section>
      </div>
    </Card>
  );
}

/** 複数行テキストを項目の配列にする（空行は捨てる） */
function splitLines(s: string): string[] {
  return s
    .split("\n")
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}
