"use client";
// ============================================================
// マイ案件一覧（ホーム）
//
//  タブ:   すべて / お気に入り（★） / 買取済（在庫） / 決済完了 / アーカイブ
//  絞込:   会社・期間（今月/今年/今年度/指定）・キーワード検索
//  集計:   絞り込み結果の粗利集計（決済完了は実績＝確定値で集計）
//  操作:   新規作成・複製・アーカイブ・削除・サンプル投入
// ============================================================
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Modal, Select, TextInput, Field, Tabs, cn } from "@/components/ui";
import { toggleTheme } from "@/components/ThemeInit";
import { ProjectCard } from "@/components/ProjectCard";
import { SummaryPanel } from "@/components/SummaryPanel";
import * as db from "@/lib/db";
import { Company, Project, PropertyType, PROPERTY_TYPE_LABELS } from "@/lib/types";
import { genId, today } from "@/lib/format";
import {
  aggregate,
  basisDateOf,
  inPeriod,
  isArchived,
  PERIOD_LABELS,
  PeriodPreset,
  periodRange,
  profitOf,
  stageOf,
} from "@/lib/summary";
import { createSampleProject, createEmptyProject, isSampleProject } from "@/lib/sampleData";
import { DEFAULT_COMPANY_ID } from "@/lib/companies";

/** 一覧の表示タブ */
type ListTab = "all" | "favorite" | "acquired" | "settled" | "archived";

/** 並び替え */
type SortKey = "updated" | "date" | "profit" | "name";
const SORT_LABELS: Record<SortKey, string> = {
  updated: "更新が新しい順",
  date: "日付が新しい順（決済/買取）",
  profit: "営業利益が大きい順",
  name: "案件名（あいうえお順）",
};

export default function HomePage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyFilter, setCompanyFilter] = useState<string>("all");
  const [tab, setTab] = useState<ListTab>("all");
  const [period, setPeriod] = useState<PeriodPreset>("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("updated");
  const [loading, setLoading] = useState(true);
  const [newOpen, setNewOpen] = useState(false);
  const [delTarget, setDelTarget] = useState<Project | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  // 集計パネルの開閉。既定は閉じて一覧を見やすくし、「決済済」タブでは自動で開く
  const [summaryOpen, setSummaryOpen] = useState(false);

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

  // タブを切り替えたら集計の開閉を切り替える（決済済タブは集計を見るのが主目的なので開く）
  useEffect(() => {
    setSummaryOpen(tab === "settled");
  }, [tab]);

  const companyName = (id: string) => companies.find((c) => c.id === id)?.name ?? "（不明）";

  // ---------------- 絞り込み ----------------
  const { from, to } = useMemo(
    () => periodRange(period, today(), customFrom, customTo),
    [period, customFrom, customTo]
  );

  // 会社・キーワード・期間で共通の絞り込み（タブ判定の前段）
  const base = useMemo(() => {
    const q = query.trim().toLowerCase();
    return projects.filter((p) => {
      if (companyFilter !== "all" && p.companyId !== companyFilter) return false;
      if (q) {
        const hay = `${p.name} ${p.ringi?.address ?? ""} ${p.ringi?.propertyName ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      // 期間はサンプルには適用しない（テンプレートは常に表示する）
      if ((from || to) && !isSampleProject(p) && !inPeriod(basisDateOf(p), from, to)) return false;
      return true;
    });
  }, [projects, companyFilter, query, from, to]);

  // タブごとの母集合（アーカイブは通常タブから除外）
  const live = useMemo(() => base.filter((p) => !isArchived(p)), [base]);
  const favorites = useMemo(() => live.filter((p) => !!p.favorite), [live]);
  const acquireds = useMemo(
    () => live.filter((p) => !isSampleProject(p) && stageOf(p) === "acquired"),
    [live]
  );
  const settleds = useMemo(
    () => live.filter((p) => !isSampleProject(p) && stageOf(p) === "settled"),
    [live]
  );
  const archiveds = useMemo(() => base.filter((p) => isArchived(p)), [base]);

  const shownRaw =
    tab === "favorite"
      ? favorites
      : tab === "acquired"
      ? acquireds
      : tab === "settled"
      ? settleds
      : tab === "archived"
      ? archiveds
      : live;

  // 並び替え
  const shown = useMemo(() => {
    const arr = [...shownRaw];
    arr.sort((a, b) => {
      if (sort === "profit") {
        return profitOf(b).result.operatingProfit - profitOf(a).result.operatingProfit;
      }
      if (sort === "name") return (a.name || "").localeCompare(b.name || "", "ja");
      if (sort === "date") {
        return (basisDateOf(b) ?? "").localeCompare(basisDateOf(a) ?? "");
      }
      return (b.updatedAt || "").localeCompare(a.updatedAt || "");
    });
    return arr;
  }, [shownRaw, sort]);

  const myCases = shown.filter((p) => !isSampleProject(p));
  const samples = shown.filter((p) => isSampleProject(p));

  // 集計（サンプルは除外）
  const agg = useMemo(() => aggregate(myCases), [myCases]);
  const periodLabel = from || to ? `${from ?? "指定なし"} 〜 ${to ?? "指定なし"}` : "";
  const summaryTitle =
    tab === "settled"
      ? "決済完了の粗利集計（確定）"
      : tab === "acquired"
      ? "在庫（買取済）の見込み粗利"
      : tab === "archived"
      ? "アーカイブの集計"
      : tab === "favorite"
      ? "お気に入りの集計"
      : "全案件の集計";

  // ---------------- 操作 ----------------
  async function handleDuplicate(p: Project) {
    // 複製は常に「自分のマイ案件」になる（サンプルを複製しても編集可能な自分の案件に）
    // 名前が「サンプル：」で始まるとサンプル判定されてしまうため、接頭辞を取り除く
    const baseName = p.name.replace(/^サンプル：/, "");
    const copy: Project = {
      ...structuredClone(p),
      id: genId(),
      name: baseName + "（複製）",
      isSample: false,
      // 複製は「これから検討する別案件」なので、印・ステージ・実績は引き継がない
      favorite: false,
      stage: "reviewing",
      archived: false,
      acquired: false,
      actual: undefined,
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

  /**
   * お気に入り／アーカイブの切替。
   * updatedAt はあえて更新しない（並び順が「更新日時の新しい順」なので、
   * 印を付けただけで案件が先頭に飛ぶのを防ぐ）。
   */
  async function toggleFavorite(p: Project) {
    await db.saveProject({ ...p, favorite: !p.favorite });
    await reload();
  }

  async function toggleArchive(p: Project) {
    await db.saveProject({ ...p, archived: !p.archived });
    await reload();
  }

  async function loadSamples() {
    // 既存サンプル（フラグ・固定ID・旧名称で判定）を一掃してから5件だけ再投入。
    // 押すたびの無限増殖を防ぎ、過去に増殖した分も整理する。マイ案件は触らない。
    const all = await db.getAllProjects();
    for (const p of all) {
      if (isSampleProject(p)) await db.deleteProject(p.id);
    }
    const types: PropertyType[] = ["building", "land", "kenuri", "mansion", "subdivision"];
    for (const t of types) {
      await db.saveProject(createSampleProject(t, DEFAULT_COMPANY_ID));
    }
    await reload();
  }

  const filtersActive = companyFilter !== "all" || period !== "all" || !!query.trim() || sort !== "updated";

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
      <div className="mb-3 flex flex-wrap gap-2">
        <Button onClick={() => setNewOpen(true)}>＋ 新規案件</Button>
        <Button variant="secondary" onClick={loadSamples}>
          サンプル読み込み
        </Button>
      </div>

      {/* 検索・絞り込み（1行にまとめて縦幅を節約） */}
      <div className="mb-3 space-y-2">
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <TextInput
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="案件名・所在地で検索"
              aria-label="案件を検索"
            />
          </div>
          <button
            type="button"
            onClick={() => setFilterOpen((v) => !v)}
            aria-expanded={filterOpen}
            aria-label="絞り込み・並び替え"
            className={cn(
              "relative flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-xl border transition-base",
              filtersActive
                ? "border-brand-500 bg-brand-500/10 text-brand-600 dark:text-brand-100"
                : "border-border bg-surface-2 text-muted hover:text-fg"
            )}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M3 6h18M7 12h10M10 18h4" strokeLinecap="round" />
            </svg>
            {/* 絞り込み中は点で知らせる */}
            {filtersActive && (
              <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-brand-500" />
            )}
          </button>
        </div>

        {filterOpen && (
          <Card className="space-y-3 p-3">
            <Field label="会社">
              <Select
                value={companyFilter}
                onChange={setCompanyFilter}
                options={[
                  { value: "all", label: "すべての会社" },
                  ...companies.map((c) => ({ value: c.id, label: c.name })),
                ]}
              />
            </Field>
            <Field
              label="期間"
              hint="決済完了は決済日、買取済は買取日、それ以外は更新日で判定します"
            >
              <Select
                value={period}
                onChange={(v) => setPeriod(v as PeriodPreset)}
                options={(Object.keys(PERIOD_LABELS) as PeriodPreset[]).map((k) => ({
                  value: k,
                  label: PERIOD_LABELS[k],
                }))}
              />
            </Field>
            {period === "custom" && (
              <div className="grid grid-cols-2 gap-2">
                <Field label="開始日">
                  <TextInput type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
                </Field>
                <Field label="終了日">
                  <TextInput type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
                </Field>
              </div>
            )}
            <Field label="並び替え">
              <Select
                value={sort}
                onChange={(v) => setSort(v as SortKey)}
                options={(Object.keys(SORT_LABELS) as SortKey[]).map((k) => ({ value: k, label: SORT_LABELS[k] }))}
              />
            </Field>
            {filtersActive && (
              <Button
                variant="secondary"
                className="w-full min-h-[40px] text-xs"
                onClick={() => {
                  setCompanyFilter("all");
                  setPeriod("all");
                  setCustomFrom("");
                  setCustomTo("");
                  setQuery("");
                  setSort("updated");
                }}
              >
                絞り込みをリセット
              </Button>
            )}
          </Card>
        )}
      </div>

      {/* 絞り込みタブ */}
      <Tabs
        tabs={[
          { key: "all", label: `すべて（${live.length}）` },
          { key: "favorite", label: `★ お気に入り（${favorites.length}）` },
          { key: "acquired", label: `在庫（${acquireds.length}）` },
          { key: "settled", label: `決済済（${settleds.length}）` },
          { key: "archived", label: `アーカイブ（${archiveds.length}）` },
        ]}
        active={tab}
        onChange={(k) => setTab(k as ListTab)}
      />

      {/* 粗利集計（マイ案件のみ・0件のときは出さない）。既定は折りたたみ、決済済タブでは開く */}
      {!loading && myCases.length > 0 && (
        <div className="mb-3">
          <SummaryPanel
            agg={agg}
            title={summaryTitle}
            periodLabel={periodLabel}
            open={summaryOpen}
            onToggle={() => setSummaryOpen((v) => !v)}
          />
        </div>
      )}

      {/* 一覧（「すべて」タブのみ マイ案件 と サンプル を分けて表示） */}
      {loading ? (
        <p className="py-10 text-center text-sm text-muted">読み込み中…</p>
      ) : shown.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-sm text-muted">{emptyTitle(tab, filtersActive)}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted">{emptyHint(tab, filtersActive)}</p>
        </Card>
      ) : tab !== "all" ? (
        // お気に入り・買取済・決済完了・アーカイブは、マイ案件／サンプルを分けずに1リストで表示
        <div className="space-y-3">
          {shown.map((p) => (
            <ProjectCard
              key={p.id}
              p={p}
              sample={isSampleProject(p)}
              companyName={companyName}
              onOpen={(id) => router.push(`/project?id=${id}`)}
              onDuplicate={handleDuplicate}
              onDelete={setDelTarget}
              onToggleFavorite={toggleFavorite}
              onToggleArchive={toggleArchive}
            />
          ))}
        </div>
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
                    onToggleFavorite={toggleFavorite}
                    onToggleArchive={toggleArchive}
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
                    onToggleFavorite={toggleFavorite}
                    onToggleArchive={toggleArchive}
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
        <br />
        <span className="text-xs text-muted">
          後で見返す可能性があるなら、削除ではなく「アーカイブ」をおすすめします。
        </span>
      </Modal>
    </main>
  );
}

/** 空表示の見出し（タブ・絞り込み状況に応じた案内） */
function emptyTitle(tab: ListTab, filtered: boolean): string {
  if (filtered) return "条件に合う案件がありません。";
  switch (tab) {
    case "favorite":
      return "お気に入りの案件はありません。";
    case "acquired":
      return "買取済（在庫）の案件はありません。";
    case "settled":
      return "決済完了の案件はありません。";
    case "archived":
      return "アーカイブされた案件はありません。";
    default:
      return "まだ案件がありません。";
  }
}

function emptyHint(tab: ListTab, filtered: boolean): string {
  if (filtered) return "検索キーワード・期間・会社の絞り込みを見直してください。";
  switch (tab) {
    case "favorite":
      return "案件カード右上の ☆ を押すと、ここに集まります。";
    case "acquired":
      return "買取（仕入）が済んだ案件は、案件を開いて上部のステージを「買取済」にすると在庫として集計されます。";
    case "settled":
      return "再販売の決済が済んだら、案件の「実績・確定」タブで決済日と最終経費を入れて「決済完了」にしてください。";
    case "archived":
      return "終わった案件はカード下の「アーカイブ」で一覧から隠せます（削除ではないので後から戻せます）。";
    default:
      return "「新規案件」または「サンプル読み込み」から始めましょう。";
  }
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
