"use client";
// ============================================================
// 案件編集ページ（静的書き出し対応：/project?id=xxx）
// タブ: 計算書 / 稟議書 / シミュレーション / 事業計画書
// ============================================================
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useStore } from "@/lib/store";
import * as db from "@/lib/db";
import { Tabs, Button, Select, Badge, TextInput } from "@/components/ui";
import { PROPERTY_TYPE_LABELS } from "@/lib/types";
import { CalcTab } from "@/components/tabs/CalcTab";
import { RingiTab } from "@/components/tabs/RingiTab";
import { SimTab } from "@/components/tabs/SimTab";
import { PlanTab } from "@/components/tabs/PlanTab";

const TABS = [
  { key: "calc", label: "計算書" },
  { key: "ringi", label: "稟議書" },
  { key: "sim", label: "シミュレーション" },
  { key: "plan", label: "事業計画書" },
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
        <button onClick={() => router.push("/")} className="text-sm text-brand-600">
          ← 一覧
        </button>
        <span className="text-[11px] text-muted">
          {saving ? "保存中…" : lastSavedAt ? "自動保存済み" : ""}
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
      </div>

      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === "calc" && <CalcTab />}
      {tab === "ringi" && <RingiTab />}
      {tab === "sim" && <SimTab />}
      {tab === "plan" && <PlanTab />}

      <div className="mt-6">
        <Button variant="secondary" onClick={() => useStore.getState().saveNow()} className="w-full">
          手動保存
        </Button>
      </div>
    </main>
  );
}

export default function ProjectPage() {
  return (
    <Suspense fallback={<main className="px-4 pt-10 text-center text-sm text-muted">読み込み中…</main>}>
      <ProjectEditor />
    </Suspense>
  );
}
