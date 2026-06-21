"use client";
// ============================================================
// マイ案件一覧（ホーム）
// 新規作成・複製・削除・会社で絞込・サンプル投入
// ============================================================
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Badge, Modal, Select, TextInput, Field, cn } from "@/components/ui";
import { toggleTheme } from "@/components/ThemeInit";
import * as db from "@/lib/db";
import { Company, Project, PropertyType, PROPERTY_TYPE_LABELS } from "@/lib/types";
import { fmtDateTime, genId } from "@/lib/format";
import { calculate, judgeProfit } from "@/lib/calc";
import { fmtMan, fmtPct } from "@/lib/format";
import { createSampleProject, createEmptyProject, isSampleProject } from "@/lib/sampleData";
import { DEFAULT_COMPANY_ID } from "@/lib/companies";

export default function HomePage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [newOpen, setNewOpen] = useState(false);
  const [delTarget, setDelTarget] = useState<Project | null>(null);

  async function reload() {
    const [ps, cs] = await Promise.all([db.getAllProjects(), db.getAllCompanies()]);
    setProjects(ps);
    setCompanies(cs);
    setLoading(false);
  }

  useEffect(() => {
    (async () => {
      await db.ensureSeed();
      await reload();
    })();
  }, []);

  const companyName = (id: string) => companies.find((c) => c.id === id)?.name ?? "（不明）";
  const shown = filter === "all" ? projects : projects.filter((p) => p.companyId === filter);
  const myCases = shown.filter((p) => !isSampleProject(p));
  const samples = shown.filter((p) => isSampleProject(p));

  async function handleDuplicate(p: Project) {
    // 複製は常に「自分のマイ案件」になる（サンプルを複製しても編集可能な自分の案件に）
    const copy: Project = {
      ...structuredClone(p),
      id: genId(),
      name: p.name + "（複製）",
      isSample: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await db.saveProject(copy);
    await reload();
  }

  async function handleDelete() {
    if (!delTarget) return;
    await db.deleteProject(delTarget.id);
    setDelTarget(null);
    await reload();
  }

  async function loadSamples() {
    // 既存サンプル（フラグ・固定ID・旧名称で判定）を一掃してから4件だけ再投入。
    // 押すたびの無限増殖を防ぎ、過去に増殖した分も整理する。マイ案件は触らない。
    const all = await db.getAllProjects();
    for (const p of all) {
      if (isSampleProject(p)) await db.deleteProject(p.id);
    }
    const types: PropertyType[] = ["building", "land", "kenuri", "mansion"];
    for (const t of types) {
      await db.saveProject(createSampleProject(t, DEFAULT_COMPANY_ID));
    }
    await reload();
  }

  return (
    <main className="px-4 pt-5">
      {/* ヘッダー */}
      <header className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-fg">マイ案件</h1>
          <p className="text-xs text-muted">買取再販 計算・稟議・事業計画</p>
        </div>
        <button
          onClick={() => toggleTheme()}
          aria-label="テーマ切替"
          className="rounded-xl border border-border bg-surface p-2.5 text-muted transition-base hover:text-fg"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </header>

      {/* アクション */}
      <div className="mb-4 flex flex-wrap gap-2">
        <Button onClick={() => setNewOpen(true)}>＋ 新規案件</Button>
        <Button variant="secondary" onClick={loadSamples}>
          サンプル読み込み
        </Button>
      </div>

      {/* 会社フィルタ */}
      <div className="mb-4">
        <Select
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "すべての会社" },
            ...companies.map((c) => ({ value: c.id, label: c.name })),
          ]}
        />
      </div>

      {/* 一覧（マイ案件 と サンプル を分けて表示） */}
      {loading ? (
        <p className="py-10 text-center text-sm text-muted">読み込み中…</p>
      ) : shown.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-sm text-muted">まだ案件がありません。</p>
          <p className="mt-1 text-xs text-muted">「新規案件」または「サンプル読み込み」から始めましょう。</p>
        </Card>
      ) : (
        <div className="space-y-6">
          <section>
            <div className="mb-2 flex items-baseline gap-2">
              <h2 className="text-sm font-bold text-fg">マイ案件</h2>
              <span className="text-xs text-muted">{myCases.length}件</span>
            </div>
            {myCases.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-xs text-muted">
                自分の案件はまだありません。「＋ 新規案件」で作成、またはサンプルを「複製」して始められます。
              </p>
            ) : (
              <div className="space-y-3">
                {myCases.map((p) => (
                  <ProjectCard
                    key={p.id}
                    p={p}
                    companyName={companyName}
                    onOpen={(id) => router.push(`/project?id=${id}`)}
                    onDuplicate={handleDuplicate}
                    onDelete={setDelTarget}
                  />
                ))}
              </div>
            )}
          </section>

          {samples.length > 0 && (
            <section>
              <div className="mb-2 flex items-baseline gap-2">
                <h2 className="text-sm font-bold text-fg">サンプル（テンプレート）</h2>
                <span className="text-xs text-muted">{samples.length}件・複製すると自分の案件になります</span>
              </div>
              <div className="space-y-3">
                {samples.map((p) => (
                  <ProjectCard
                    key={p.id}
                    p={p}
                    sample
                    companyName={companyName}
                    onOpen={(id) => router.push(`/project?id=${id}`)}
                    onDuplicate={handleDuplicate}
                    onDelete={setDelTarget}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      <NewProjectModal
        open={newOpen}
        companies={companies}
        onClose={() => setNewOpen(false)}
        onCreate={async (type, companyId, name) => {
          const p = createEmptyProject(type, companyId, name);
          await db.saveProject(p);
          setNewOpen(false);
          router.push(`/project?id=${p.id}`);
        }}
      />

      <Modal
        open={!!delTarget}
        onClose={() => setDelTarget(null)}
        title="案件を削除しますか？"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDelTarget(null)}>
              キャンセル
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              削除する
            </Button>
          </>
        }
      >
        「{delTarget?.name}」を削除します。この操作は取り消せません。
      </Modal>
    </main>
  );
}

function ProjectCard({
  p,
  sample,
  companyName,
  onOpen,
  onDuplicate,
  onDelete,
}: {
  p: Project;
  sample?: boolean;
  companyName: (id: string) => string;
  onOpen: (id: string) => void;
  onDuplicate: (p: Project) => void;
  onDelete: (p: Project) => void;
}) {
  const r = calculate(p.calc);
  const judge = judgeProfit(r);
  return (
    <Card className={cn("overflow-hidden", sample && "border-dashed")}>
      <button
        onClick={() => onOpen(p.id)}
        className="block w-full p-4 text-left transition-base hover:bg-surface-2"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {sample && (
                <span className="inline-flex items-center rounded-full bg-accent-500/15 px-2.5 py-1 text-xs font-semibold text-accent-600 dark:text-accent-400">
                  サンプル
                </span>
              )}
              <Badge tone="brand">{companyName(p.companyId)}</Badge>
              <Badge tone="neutral">{PROPERTY_TYPE_LABELS[p.propertyType]}</Badge>
            </div>
            <h3 className="mt-2 truncate text-base font-bold text-fg">{p.name || "（無題）"}</h3>
            <p className="mt-0.5 text-[11px] text-muted">更新: {fmtDateTime(p.updatedAt)}</p>
          </div>
          <Badge tone={judge}>{judge === "good" ? "良好" : judge === "warn" ? "要検討" : "要注意"}</Badge>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <Kpi label="販売価格" value={`${fmtMan(p.calc.sellPrice)}万`} />
          <Kpi label="営業利益" value={`${fmtMan(r.operatingProfit)}万`} tone={judge} />
          <Kpi label="営業利益率" value={fmtPct(r.operatingMargin)} tone={judge} />
        </div>
      </button>
      <div className="flex border-t border-border">
        <button
          onClick={() => onDuplicate(p)}
          className="flex-1 py-2.5 text-xs font-medium text-muted transition-base hover:bg-surface-2 hover:text-fg"
        >
          {sample ? "複製してマイ案件に" : "複製"}
        </button>
        <div className="w-px bg-border" />
        <button
          onClick={() => onDelete(p)}
          className="flex-1 py-2.5 text-xs font-medium text-red-600 transition-base hover:bg-red-500/10"
        >
          削除
        </button>
      </div>
    </Card>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone?: "good" | "warn" | "bad" }) {
  const color =
    tone === "good"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "bad"
      ? "text-red-600 dark:text-red-400"
      : tone === "warn"
      ? "text-amber-600 dark:text-amber-400"
      : "text-fg";
  return (
    <div className="rounded-xl bg-surface-2 px-2 py-2">
      <div className="text-[10px] text-muted">{label}</div>
      <div className={cn("text-sm font-bold", color)}>{value}</div>
    </div>
  );
}

function NewProjectModal({
  open,
  companies,
  onClose,
  onCreate,
}: {
  open: boolean;
  companies: Company[];
  onClose: () => void;
  onCreate: (type: PropertyType, companyId: string, name: string) => void;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<PropertyType>("building");
  const [companyId, setCompanyId] = useState(DEFAULT_COMPANY_ID);

  useEffect(() => {
    if (companies.length && !companies.find((c) => c.id === companyId)) {
      setCompanyId(companies[0].id);
    }
  }, [companies, companyId]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="新規案件を作成"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            キャンセル
          </Button>
          <Button onClick={() => onCreate(type, companyId, name)}>作成</Button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="案件名">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="例：富山市〇〇町 戸建" />
        </Field>
        <Field label="発行会社">
          <Select
            value={companyId}
            onChange={setCompanyId}
            options={companies.map((c) => ({ value: c.id, label: c.name }))}
          />
        </Field>
        <Field label="物件タイプ">
          <Select
            value={type}
            onChange={(v) => setType(v as PropertyType)}
            options={Object.entries(PROPERTY_TYPE_LABELS).map(([value, label]) => ({ value, label }))}
          />
        </Field>
      </div>
    </Modal>
  );
}
