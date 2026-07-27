"use client";
// ============================================================
// 案件編集ページ（静的書き出し対応：/project?id=xxx）
// タブ: 計算書 / 稟議書 / シミュレーション / 事業計画書 / 実績・確定
// ============================================================
import { Suspense, useEffect, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useStore } from "@/lib/store";
import * as db from "@/lib/db";
import { Tabs, Button, Select, Badge, TextInput, cn } from "@/components/ui";
import { PROPERTY_TYPE_LABELS, ProjectStage, STAGE_LABELS } from "@/lib/types";
import { isSampleProject } from "@/lib/sampleData";
import { stageOf } from "@/lib/summary";
import { CalcTab } from "@/components/tabs/CalcTab";
import { RingiTab } from "@/components/tabs/RingiTab";
import { SimTab } from "@/components/tabs/SimTab";
import { PlanTab } from "@/components/tabs/PlanTab";
import { ActualTab } from "@/components/tabs/ActualTab";
import { PdfExportBar } from "@/components/PdfExportBar";

// タブ名は横1段に収まる長さにしている（横スクロールで気づかれないのを防ぐため）
const TABS = [
  { key: "calc", label: "計算書" },
  { key: "ringi", label: "稟議書" },
  { key: "sim", label: "価格試算" },
  { key: "plan", label: "計画書" },
  { key: "actual", label: "実績" },
];

function ProjectEditor() {
  const params = useSearchParams();
  const router = useRouter();
  const id = params.get("id") ?? "";
  const { current, setCurrent, update, companies, init, initialized, saving, lastSavedAt } = useStore();
  const [tab, setTab] = useState("calc");
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    (async () => {
      if (!id) {
        setNotFound(true);
        return;
      }
      if (!initialized) await init();
      const p = await db.getProject(id);
      if (!p) {
        setNotFound(true);
        return;
      }
      setCurrent(p);
    })();
    return () => setCurrent(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (notFound) {
    return (
      <main className="px-4 pt-10 text-center">
        <p className="text-sm text-muted">案件が見つかりませんでした。</p>
        <Link href="/" className="mt-3 inline-block text-sm text-brand-600">
          ← マイ案件へ戻る
        </Link>
      </main>
    );
  }

  if (!current) {
    return <main className="px-4 pt-10 text-center text-sm text-muted">読み込み中…</main>;
  }

  return (
    <main className="px-4 pt-4">
      {/* トップバー */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <button
          onClick={() => router.push("/")}
          className="-ml-2 flex min-h-[40px] items-center gap-1 rounded-xl px-2 text-sm font-semibold text-brand-600 transition-base hover:bg-surface-2 dark:text-brand-100"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          案件一覧
        </button>
        {/* 保存状態（自動保存されていることが分かるように明示） */}
        <span className="flex items-center gap-1 text-[11px] text-muted">
          {saving ? (
            <>
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
              保存中…
            </>
          ) : lastSavedAt ? (
            <>
              <svg className="h-3.5 w-3.5 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              自動保存済み
            </>
          ) : null}
        </span>
      </div>

      {/* 案件名・会社・タイプ */}
      <div className="mb-4 space-y-2">
        <TextInput
          value={current.name}
          onChange={(e) => update({ name: e.target.value })}
          placeholder="案件名"
          className="text-base font-bold"
        />
        <div className="flex items-center gap-2">
          <Select
            value={current.companyId}
            onChange={(v) => update({ companyId: v })}
            options={companies.map((c) => ({ value: c.id, label: c.name }))}
            className="flex-1"
          />
          <Badge tone="neutral">{PROPERTY_TYPE_LABELS[current.propertyType]}</Badge>
        </div>

        {/* お気に入り・進行ステージ・アーカイブ（一覧のタブ絞り込みに連動） */}
        <div className="flex flex-wrap items-center gap-2">
          <TagToggle
            active={!!current.favorite}
            onClick={() => update({ favorite: !current.favorite })}
            activeClass="border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400"
          >
            {current.favorite ? "★ お気に入り" : "☆ お気に入り"}
          </TagToggle>
          {/* サンプル（テンプレート）はステージ・アーカイブの対象外 */}
          {!isSampleProject(current) && (
            <>
              <Select
                value={stageOf(current)}
                onChange={(v) => update({ stage: v as ProjectStage })}
                options={(["reviewing", "acquired", "settled"] as ProjectStage[]).map((s) => ({
                  value: s,
                  label: STAGE_LABELS[s],
                }))}
                className="w-auto min-w-[120px] flex-none py-1.5 text-xs"
              />
              <TagToggle
                active={!!current.archived}
                onClick={() => update({ archived: !current.archived })}
                activeClass="border-border bg-surface-2 text-fg"
              >
                {current.archived ? "アーカイブ済み（戻す）" : "アーカイブ"}
              </TagToggle>
            </>
          )}
        </div>
      </div>

      {/* PDF出力（タブ外・上部に常設） */}
      <div className="mb-4">
        <PdfExportBar />
      </div>

      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === "calc" && <CalcTab />}
      {tab === "ringi" && <RingiTab />}
      {tab === "sim" && <SimTab />}
      {tab === "plan" && <PlanTab />}
      {tab === "actual" && <ActualTab />}

      <div className="mt-6">
        <Button variant="secondary" onClick={() => useStore.getState().saveNow()} className="w-full">
          手動保存
        </Button>
      </div>
    </main>
  );
}

/** タグのオン/オフを切り替えるチップ型ボタン（お気に入り・買取完了） */
function TagToggle({
  active,
  activeClass,
  onClick,
  children,
}: {
  active: boolean;
  activeClass: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex min-h-[36px] items-center rounded-full border px-3 text-xs font-semibold transition-base",
        active ? activeClass : "border-border bg-surface-2 text-muted hover:text-fg"
      )}
    >
      {children}
    </button>
  );
}

export default function ProjectPage() {
  return (
    <Suspense fallback={<main className="px-4 pt-10 text-center text-sm text-muted">読み込み中…</main>}>
      <ProjectEditor />
    </Suspense>
  );
}
