"use client";
// ============================================================
// 設定: 会社マスタ（追加・編集・削除・ロゴ）/ デフォルト会社 / テーマ
// ============================================================
import { useEffect, useState } from "react";
import { Card, CardHeader, Button, Field, TextInput, Select, Modal, Badge } from "@/components/ui";
import { toggleTheme } from "@/components/ThemeInit";
import * as db from "@/lib/db";
import { AppSettings, Company } from "@/lib/types";
import { genId } from "@/lib/format";

export default function SettingsPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [editing, setEditing] = useState<Company | null>(null);
  const [delTarget, setDelTarget] = useState<Company | null>(null);

  async function reload() {
    await db.ensureSeed();
    const [cs, s] = await Promise.all([db.getAllCompanies(), db.getSettings()]);
    setCompanies(cs);
    setSettings(s);
  }
  useEffect(() => {
    reload();
  }, []);

  async function saveCompany(c: Company) {
    await db.saveCompany(c);
    setEditing(null);
    await reload();
  }
  async function removeCompany() {
    if (!delTarget) return;
    await db.deleteCompany(delTarget.id);
    setDelTarget(null);
    await reload();
  }
  async function setDefault(id: string) {
    if (!settings) return;
    const next = { ...settings, defaultCompanyId: id };
    await db.saveSettings(next);
    setSettings(next);
  }

  return (
    <main className="px-4 pt-5">
      <header className="mb-5 flex items-center justify-between">
        <h1 className="text-xl font-bold text-fg">設定</h1>
        <button
          onClick={() => toggleTheme()}
          className="rounded-xl border border-border bg-surface p-2.5 text-muted transition-base hover:text-fg"
          aria-label="テーマ切替"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </header>

      {/* デフォルト会社 */}
      <Card className="mb-4">
        <CardHeader title="デフォルト発行会社" desc="新規案件作成時の初期値" />
        <div className="p-4">
          {settings && (
            <Select
              value={settings.defaultCompanyId}
              onChange={setDefault}
              options={companies.map((c) => ({ value: c.id, label: c.name }))}
            />
          )}
        </div>
      </Card>

      {/* 会社マスタ */}
      <Card>
        <CardHeader
          title="会社マスタ"
          action={<Button className="min-h-[40px] px-3 text-xs" onClick={() => setEditing({ id: genId(), name: "", address: "", representative: "", role: "" })}>＋ 追加</Button>}
        />
        <div className="divide-y divide-border">
          {companies.map((c) => (
            <div key={c.id} className="flex items-center gap-3 p-4">
              {c.logoDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.logoDataUrl} alt="" className="h-10 w-10 rounded-lg object-contain" />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-500/15 text-sm font-bold text-brand-600">
                  {c.name.slice(0, 1) || "?"}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-bold text-fg">{c.name}</p>
                  {settings?.defaultCompanyId === c.id && <Badge tone="brand">既定</Badge>}
                </div>
                <p className="truncate text-xs text-muted">{c.role || c.address || "—"}</p>
              </div>
              <button onClick={() => setEditing(c)} className="text-xs font-medium text-brand-600">
                編集
              </button>
              <button onClick={() => setDelTarget(c)} className="text-xs font-medium text-red-600">
                削除
              </button>
            </div>
          ))}
        </div>
      </Card>

      <p className="mt-4 text-[11px] text-muted">
        ※ 会社名・住所・代表者名・ロゴはPDFのヘッダー／署名欄に反映されます。
      </p>

      {editing && (
        <CompanyEditor company={editing} onClose={() => setEditing(null)} onSave={saveCompany} />
      )}

      <Modal
        open={!!delTarget}
        onClose={() => setDelTarget(null)}
        title="会社を削除しますか？"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDelTarget(null)}>キャンセル</Button>
            <Button variant="danger" onClick={removeCompany}>削除する</Button>
          </>
        }
      >
        「{delTarget?.name}」を削除します。この会社を使用中の案件は表示名が「（不明）」になります。
      </Modal>
    </main>
  );
}

function CompanyEditor({
  company,
  onClose,
  onSave,
}: {
  company: Company;
  onClose: () => void;
  onSave: (c: Company) => void;
}) {
  const [c, setC] = useState<Company>(company);

  function onLogo(file: File) {
    const reader = new FileReader();
    reader.onload = () => setC({ ...c, logoDataUrl: String(reader.result) });
    reader.readAsDataURL(file);
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={company.name ? "会社を編集" : "会社を追加"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>キャンセル</Button>
          <Button onClick={() => onSave(c)} disabled={!c.name.trim()}>保存</Button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="会社名 *">
          <TextInput value={c.name} onChange={(e) => setC({ ...c, name: e.target.value })} placeholder="例：ゆかり株式会社" />
        </Field>
        <Field label="住所">
          <TextInput value={c.address ?? ""} onChange={(e) => setC({ ...c, address: e.target.value })} />
        </Field>
        <Field label="代表者名">
          <TextInput value={c.representative ?? ""} onChange={(e) => setC({ ...c, representative: e.target.value })} />
        </Field>
        <Field label="役割メモ">
          <TextInput value={c.role ?? ""} onChange={(e) => setC({ ...c, role: e.target.value })} placeholder="買取再販の主体 / 仲介 等" />
        </Field>
        <Field label="ロゴ画像（任意）">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => e.target.files?.[0] && onLogo(e.target.files[0])}
            className="block w-full text-xs text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-surface-2 file:px-3 file:py-2 file:text-xs file:text-fg"
          />
        </Field>
        {c.logoDataUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={c.logoDataUrl} alt="ロゴ" className="h-16 rounded-lg border border-border object-contain p-1" />
        )}
      </div>
    </Modal>
  );
}
