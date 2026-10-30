"use client";
// ============================================================
// 案件一覧（ホーム）
//
//  作成:   種別のボタンを押すとその場で案件ができ、査定画面が開く
//          （新規案件には種別ごとの概算が入っているので、すぐ価格が出る）
//  タブ:   すべて / 査定中 / 提示中 / 買取決定 / 在庫 / 決済済 / ★ / アーカイブ
//  絞込:   会社・期間・キーワード・並び替え
//  集計:   絞り込み結果の粗利集計（決済完了は実績＝確定値で集計）
// ============================================================
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Modal, Select, TextInput, Field, Tabs, cn } from "@/components/ui";
import { ProjectRow } from "@/components/ProjectRow";
import { SummaryPanel } from "@/components/SummaryPanel";
import * as db from "@/lib/db";
import {
  Company,
  Project,
  ProjectStage,
  PropertyType,
  PROPERTY_TYPE_LABELS,
  STAGE_SHORT_LABELS,
  STAGE_ORDER,
} from "@/lib/types";
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
import { createEmptyProject, isSampleProject } from "@/lib/sampleData";
import { DEFAULT_COMPANY_ID } from "@/lib/companies";

/** 一覧の表示タブ */
type ListTab = "all" | "favorite" | ProjectStage | "archived";

/** 並び替え */
type SortKey = "updated" | "date" | "profit" | "name";
const SORT_LABELS: Record<SortKey, string> = {
  updated: "更新が新しい順",
  date: "日付が新しい順（決済/買取）",
  profit: "営業利益が大きい順",
  name: "案件名（あいうえお順）",
};

/** 新規作成ボタンに出す種別（査定でよく使う順） */
const NEW_TYPES: PropertyType[] = ["building", "land", "mansion", "kenuri", "subdivision"];

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
  const [delTarget, setDelTarget] = useState<Project | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [sampleCleanup, setSampleCleanup] = useState(false);

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

  useEffect(() => {
    setSummaryOpen(tab === "settled");
  }, [tab]);

  const companyName = (id: string) => companies.find((c) => c.id === id)?.name ?? "（不明）";

  // ---------------- 絞り込み ----------------
  const { from, to } = useMemo(
    () => periodRange(period, today(), customFrom, customTo),
    [period, customFrom, customTo]
  );

  const base = useMemo(() => {
    const q = query.trim().toLowerCase();
    return projects.filter((p) => {
      if (companyFilter !== "all" && p.companyId !== companyFilter) return false;
      if (q) {
        const hay = `${p.name} ${p.assessment?.address ?? ""} ${p.ringi?.address ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if ((from || to) && !inPeriod(basisDateOf(p), from, to)) return false;
      return true;
    });
  }, [projects, companyFilter, query, from, to]);

  const live = useMemo(() => base.filter((p) => !isArchived(p)), [base]);
  const favorites = useMemo(() => live.filter((p) => !!p.favorite), [live]);
  const archiveds = useMemo(() => base.filter((p) => isArchived(p)), [base]);

  const byStage = useMemo(() => {
    const map = {} as Record<ProjectStage, Project[]>;
    for (const s of STAGE_ORDER) map[s] = [];
    for (const p of live) map[stageOf(p)].push(p);
    return map;
  }, [live]);

  const shownRaw =
    tab === "favorite" ? favorites : tab === "archived" ? archiveds : tab === "all" ? live : byStage[tab];

  const shown = useMemo(() => {
    const arr = [...shownRaw];
    arr.sort((a, b) => {
      if (sort === "profit") return profitOf(b).result.operatingProfit - profitOf(a).result.operatingProfit;
      if (sort === "name") return (a.name || "").localeCompare(b.name || "", "ja");
      if (sort === "date") return (basisDateOf(b) ?? "").localeCompare(basisDateOf(a) ?? "");
      return (b.updatedAt || "").localeCompare(a.updatedAt || "");
    });
    return arr;
  }, [shownRaw, sort]);

  const agg = useMemo(() => aggregate(shown), [shown]);
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
      : tab === "all"
      ? "全案件の集計"
      : `${STAGE_SHORT_LABELS[tab]}の見込み粗利`;

  // 以前のサンプル案件が残っているか（新規案件に目安額が入るようになったので不要）
  const legacySamples = useMemo(() => projects.filter((p) => isSampleProject(p)), [projects]);

  // ---------------- 操作 ----------------
  async function createNew(type: PropertyType) {
    // 発行会社は設定の既定（買取再販の主体）を使う。会社は査定画面で変えられる
    const settings = await db.getSettings();
    const companyId =
      companies.find((c) => c.id === settings.defaultCompanyId)?.id ??
      companies[0]?.id ??
      DEFAULT_COMPANY_ID;
    const p = createEmptyProject(type, companyId);
    await db.saveProject(p);
    router.push(`/project?id=${p.id}`);
  }

  async function handleDuplicate(p: Project) {
    const copy: Project = {
      ...structuredClone(p),
      id: genId(),
      name: p.name.replace(/^サンプル：/, "") + "（複製）",
      isSample: false,
      favorite: false,
      stage: "assessing",
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

  /** 印の切替は updatedAt を動かさない（並び順が飛ばないように） */
  async function toggleFavorite(p: Project) {
    await db.saveProject({ ...p, favorite: !p.favorite });
    await reload();
  }

  async function toggleArchive(p: Project) {
    await db.saveProject({ ...p, archived: !p.archived });
    await reload();
  }

  async function changeStage(p: Project, stage: ProjectStage) {
    await db.saveProject({ ...p, stage, updatedAt: new Date().toISOString() });
    await reload();
  }

  async function removeLegacySamples() {
    for (const p of legacySamples) await db.deleteProject(p.id);
    setSampleCleanup(false);
    await reload();
  }

  const filtersActive =
    companyFilter !== "all" || period !== "all" || !!query.trim() || sort !== "updated";

  return (
    <main className="pt-7">
      {/* ---- 新規作成（種別を押すだけで始まる） ---- */}
      <section className="mb-7">
        <h1 className="text-[22px] font-bold tracking-tight text-fg">査定をはじめる</h1>
        <p className="mt-1 text-[13px] text-muted">
          種別を選ぶとすぐ査定画面が開きます。諸費用の目安は種別ごとに入っているので、
          再販想定価格を入れるだけで4本の買取価格が出ます。
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {NEW_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => createNew(t)}
              className="group inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-fg transition-base hover:border-brand-500 hover:bg-brand-50 hover:text-brand-700 dark:hover:bg-brand-600/10 dark:hover:text-brand-300"
            >
              <svg
                className="h-4 w-4 text-faint transition-base group-hover:text-brand-600 dark:group-hover:text-brand-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path d="M12 5v14M5 12h14" strokeLinecap="round" />
              </svg>
              {PROPERTY_TYPE_LABELS[t]}
            </button>
          ))}
        </div>
      </section>

      {/* ---- 以前のサンプルの片づけ（残っている場合だけ） ---- */}
      {legacySamples.length > 0 && (
        <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface-2 px-4 py-3">
          <p className="flex-1 text-xs leading-relaxed text-muted">
            以前のサンプル案件が {legacySamples.length} 件あります。
            新規案件に種別ごとの目安額が入るようになったため、複製して使う必要はなくなりました。
          </p>
          <Button variant="secondary" className="min-h-[34px] text-xs" onClick={() => setSampleCleanup(true)}>
            サンプルをまとめて削除
          </Button>
        </div>
      )}

      {/* ---- 検索・絞り込み ---- */}
      <div className="mb-4 flex items-center gap-2">
        <div className="relative flex-1">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
          </svg>
          <TextInput
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="案件名・所在地で検索"
            aria-label="案件を検索"
            className="pl-9"
          />
        </div>
        <button
          type="button"
          onClick={() => setFilterOpen((v) => !v)}
          aria-expanded={filterOpen}
          aria-label="絞り込み・並び替え"
          className={cn(
            "relative flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl border transition-base",
            filtersActive
              ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-600/10 dark:text-brand-300"
              : "border-border bg-surface text-muted hover:border-border-strong hover:text-fg"
          )}
        >
          <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M3 6h18M7 12h10M10 18h4" strokeLinecap="round" />
          </svg>
          {filtersActive && <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-brand-500" />}
        </button>
      </div>

      {filterOpen && (
        <Card className="mb-4 grid grid-cols-1 gap-4 p-4 md:grid-cols-4">
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
          <Field label="期間" hint="決済完了は決済日、在庫は買取日、それ以外は更新日で判定します">
            <Select
              value={period}
              onChange={(v) => setPeriod(v as PeriodPreset)}
              options={(Object.keys(PERIOD_LABELS) as PeriodPreset[]).map((k) => ({
                value: k,
                label: PERIOD_LABELS[k],
              }))}
            />
          </Field>
          <Field label="並び替え">
            <Select
              value={sort}
              onChange={(v) => setSort(v as SortKey)}
              options={(Object.keys(SORT_LABELS) as SortKey[]).map((k) => ({ value: k, label: SORT_LABELS[k] }))}
            />
          </Field>
          <div className="flex items-end">
            {filtersActive && (
              <Button
                variant="secondary"
                className="min-h-[42px] w-full text-xs"
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
          </div>
          {period === "custom" && (
            <>
              <Field label="開始日">
                <TextInput type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
              </Field>
              <Field label="終了日">
                <TextInput type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
              </Field>
            </>
          )}
        </Card>
      )}

      {/* ---- ステージ別タブ ---- */}
      <Tabs
        tabs={[
          { key: "all", label: `すべて ${live.length}` },
          ...STAGE_ORDER.map((s) => ({ key: s, label: `${STAGE_SHORT_LABELS[s]} ${byStage[s].length}` })),
          { key: "favorite", label: `★ ${favorites.length}` },
          { key: "archived", label: `アーカイブ ${archiveds.length}` },
        ]}
        active={tab}
        onChange={(k) => setTab(k as ListTab)}
      />

      {/* ---- 集計 ---- */}
      {!loading && shown.length > 0 && (
        <div className="mb-4">
          <SummaryPanel
            agg={agg}
            title={summaryTitle}
            periodLabel={periodLabel}
            open={summaryOpen}
            onToggle={() => setSummaryOpen((v) => !v)}
          />
        </div>
      )}

      {/* ---- 一覧 ---- */}
      {loading ? (
        <p className="py-16 text-center text-sm text-muted">読み込み中…</p>
      ) : shown.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border px-8 py-16 text-center">
          <p className="text-sm font-semibold text-fg">{emptyTitle(tab, filtersActive)}</p>
          <p className="mt-1.5 text-xs leading-relaxed text-muted">{emptyHint(tab, filtersActive)}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {shown.map((p) => (
            <ProjectRow
              key={p.id}
              p={p}
              companyName={companyName}
              onOpen={(id) => router.push(`/project?id=${id}`)}
              onDuplicate={handleDuplicate}
              onDelete={setDelTarget}
              onToggleFavorite={toggleFavorite}
              onToggleArchive={toggleArchive}
              onChangeStage={changeStage}
            />
          ))}
        </div>
      )}

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
          後で見返す可能性があるなら、削除ではなくアーカイブをおすすめします。
        </span>
      </Modal>

      <Modal
        open={sampleCleanup}
        onClose={() => setSampleCleanup(false)}
        title="サンプル案件を削除しますか？"
        footer={
          <>
            <Button variant="secondary" onClick={() => setSampleCleanup(false)}>
              キャンセル
            </Button>
            <Button variant="danger" onClick={removeLegacySamples}>
              {legacySamples.length}件を削除
            </Button>
          </>
        }
      >
        以前のサンプル案件 {legacySamples.length} 件を削除します。ご自身で作成した案件は消えません。
      </Modal>
    </main>
  );
}

/** 空表示の見出し */
function emptyTitle(tab: ListTab, filtered: boolean): string {
  if (filtered) return "条件に合う案件がありません";
  switch (tab) {
    case "favorite":
      return "お気に入りの案件はありません";
    case "archived":
      return "アーカイブされた案件はありません";
    case "all":
      return "まだ案件がありません";
    default:
      return `${STAGE_SHORT_LABELS[tab]}の案件はありません`;
  }
}

function emptyHint(tab: ListTab, filtered: boolean): string {
  if (filtered) return "検索キーワード・期間・会社の絞り込みを見直してください。";
  switch (tab) {
    case "favorite":
      return "案件の行にある ☆ を押すと、ここに集まります。";
    case "archived":
      return "終わった案件はアーカイブで一覧から隠せます（削除ではないので後から戻せます）。";
    case "assessing":
      return "上の種別ボタンを押すと、査定中の案件として始まります。";
    case "offered":
      return "買取査定書をお渡ししたら、一覧の進行状況を「提示中」にしてください。";
    case "decided":
      return "買うと決めたら「買取決定」にしてください。稟議・銀行用の画面が出てきます。";
    case "acquired":
      return "仕入の決済が済んだら「在庫」にすると、在庫として集計されます。";
    case "settled":
      return "再販売の決済が済んだら、案件の「実績」タブで決済日と最終経費を入れてください。";
    default:
      return "上の種別ボタンから始められます。";
  }
}
