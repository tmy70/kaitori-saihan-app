"use client";
// ============================================================
// 案件編集ページ（静的書き出し対応：/project?id=xxx）
//
// 画面は進行ステージで切り替える。
//   査定中・提示中 → 査定 / 計算書
//   買取決定・在庫 → ＋稟議 / 銀行用
//   決済完了       → ＋実績
// ふだん使うのは査定タブだけで済むようにしている。
// ============================================================
import { Suspense, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useStore } from "@/lib/store";
import * as db from "@/lib/db";
import { Tabs, Button, Badge, cn } from "@/components/ui";
import {
  isDecidedOrLater,
  PROPERTY_TYPE_LABELS,
  ProjectStage,
  STAGE_LABELS,
  STAGE_ORDER,
} from "@/lib/types";
import { stageOf } from "@/lib/summary";
import { assessmentToCalcInput } from "@/lib/assessment";
import { sumItems } from "@/lib/calc";
import { today } from "@/lib/format";
import { AssessTab } from "@/components/tabs/AssessTab";
import { CalcTab } from "@/components/tabs/CalcTab";
import { RingiTab } from "@/components/tabs/RingiTab";
import { BankTab } from "@/components/tabs/BankTab";
import { ActualTab } from "@/components/tabs/ActualTab";
import { InternalPdfBar } from "@/components/InternalPdfBar";

function ProjectEditor() {
  const params = useSearchParams();
  const router = useRouter();
  const id = params.get("id") ?? "";
  const { current, setCurrent, update, companies, init, initialized, saving, lastSavedAt } = useStore();
  const [tab, setTab] = useState("assess");
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

  const stage = current ? stageOf(current) : "assessing";

  // ステージに応じて出すタブ
  const tabs = useMemo(() => {
    const list = [
      { key: "assess", label: "査定" },
      { key: "calc", label: "計算書" },
    ];
    if (isDecidedOrLater(stage)) {
      list.push({ key: "ringi", label: "稟議" }, { key: "bank", label: "銀行用" });
    }
    if (stage === "settled") list.push({ key: "actual", label: "実績" });
    return list;
  }, [stage]);

  // 表示できないタブを開いたままにしない（ステージを戻したときの保険）
  useEffect(() => {
    if (!tabs.some((t) => t.key === tab)) setTab("assess");
  }, [tabs, tab]);

  if (notFound) {
    return (
      <main className="pt-10 text-center">
        <p className="text-sm text-muted">案件が見つかりませんでした。</p>
        <Link href="/" className="mt-3 inline-block text-sm text-brand-600">
          ← 案件一覧へ戻る
        </Link>
      </main>
    );
  }

  if (!current) {
    return <main className="pt-10 text-center text-sm text-muted">読み込み中…</main>;
  }

  /**
   * ステージを変える。先の段階へ進むときに必要な初期化も併せて行う。
   *  ・買取決定：計算書がまだ空なら査定の数字を引き継ぐ（入力済みなら上書きしない）
   *  ・在庫　　：買取決済日が空なら本日を入れる
   *  ・決済完了：実績が未入力なら計画をコピーし、決済日が空なら本日を入れる
   */
  function changeStage(next: ProjectStage) {
    if (!current) return;

    if (next === "decided") {
      const calcEmpty =
        sumItems(current.calc.acquisition) === 0 &&
        sumItems(current.calc.expenses) === 0 &&
        sumItems(current.calc.selling) === 0;
      if (calcEmpty && (current.assessment?.offerPrice ?? 0) > 0) {
        update({
          stage: next,
          calc: assessmentToCalcInput(
            current.propertyType,
            current.assessment,
            current.assessment?.offerPrice ?? 0
          ),
        });
        return;
      }
    }

    const actual = current.actual ?? {};
    if (next === "acquired" && !actual.purchaseDate) {
      update({ stage: next, actual: { ...actual, purchaseDate: today() } });
      return;
    }
    if (next === "settled") {
      update({
        stage: next,
        actual: {
          ...actual,
          calc: actual.calc ?? structuredClone(current.calc),
          settleDate: actual.settleDate || today(),
        },
      });
      return;
    }

    update({ stage: next });
  }

  const company = companies.find((c) => c.id === current.companyId);

  return (
    <main className="pt-5">
      {/* ---- 見出し行 ---- */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <button
          onClick={() => router.push("/")}
          className="-ml-2 flex min-h-[36px] items-center gap-1 rounded-xl px-2 text-sm font-semibold text-brand-600 transition-base hover:bg-surface-2 dark:text-brand-100"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          案件一覧
        </button>
        <span className="flex items-center gap-1 text-[11px] text-muted">
          {saving ? (
            <>
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
              保存中…
            </>
          ) : lastSavedAt ? (
            <>
              <svg
                className="h-3.5 w-3.5 text-emerald-500"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              自動保存済み
            </>
          ) : null}
        </span>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2.5">
        <input
          value={current.name}
          onChange={(e) => update({ name: e.target.value })}
          placeholder="案件名"
          aria-label="案件名"
          className="min-w-[240px] max-w-lg flex-1 rounded-xl border border-transparent bg-transparent px-2 py-1 text-[22px] font-bold tracking-tight text-fg outline-none transition-base placeholder:text-faint hover:border-border focus:border-brand-500 focus:bg-surface"
        />
        <Badge tone="neutral">{PROPERTY_TYPE_LABELS[current.propertyType]}</Badge>
        {company && <Badge tone="brand">{company.name}</Badge>}
        <TagToggle
          active={!!current.favorite}
          onClick={() => update({ favorite: !current.favorite })}
          activeClass="border-warn-500/40 bg-warn-500/10 text-warn-600 dark:text-warn-500"
        >
          {current.favorite ? "★ お気に入り" : "☆ お気に入り"}
        </TagToggle>
        <TagToggle
          active={!!current.archived}
          onClick={() => update({ archived: !current.archived })}
          activeClass="border-border-strong bg-surface-2 text-fg"
        >
          {current.archived ? "アーカイブ済み（戻す）" : "アーカイブ"}
        </TagToggle>
      </div>

      {/* ---- 進行ステージ ---- */}
      <StageStepper stage={stage} onChange={changeStage} />

      {/* ---- 社内用PDF（買取決定後に出す） ---- */}
      {isDecidedOrLater(stage) && (
        <div className="mb-4">
          <InternalPdfBar />
        </div>
      )}

      <Tabs tabs={tabs} active={tab} onChange={setTab} />

      {tab === "assess" && <AssessTab />}
      {tab === "calc" && <CalcTab />}
      {tab === "ringi" && <RingiTab />}
      {tab === "bank" && <BankTab />}
      {tab === "actual" && <ActualTab />}
    </main>
  );
}

/**
 * 進行ステージ。
 * 左から右へ進む流れを線でつなぎ、済んだ段階・いまの段階・これからを一目で分かるようにする。
 * どの段階にも直接移動できる（押し間違えても戻せる）。
 */
function StageStepper({
  stage,
  onChange,
}: {
  stage: ProjectStage;
  onChange: (s: ProjectStage) => void;
}) {
  const currentIndex = STAGE_ORDER.indexOf(stage);
  const next = STAGE_ORDER[currentIndex + 1];

  return (
    <div className="mb-5 flex items-center gap-4 rounded-2xl border border-border bg-surface px-5 py-3.5">
      <ol className="flex flex-1 items-center">
        {STAGE_ORDER.map((s, i) => {
          const done = i < currentIndex;
          const active = i === currentIndex;
          return (
            <li key={s} className="flex items-center">
              {i > 0 && (
                <span
                  className={cn("mx-2 h-px w-6 shrink-0", done || active ? "bg-brand-500" : "bg-border")}
                  aria-hidden
                />
              )}
              <button
                type="button"
                onClick={() => onChange(s)}
                aria-current={active ? "step" : undefined}
                className={cn(
                  "group flex items-center gap-2 rounded-lg px-2 py-1 transition-base",
                  !active && "hover:bg-surface-2"
                )}
              >
                <span
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold transition-base",
                    active
                      ? "bg-brand-600 text-white"
                      : done
                      ? "bg-brand-500/15 text-brand-600 dark:text-brand-300"
                      : "border border-border text-faint"
                  )}
                >
                  {done ? (
                    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </span>
                <span
                  className={cn(
                    "whitespace-nowrap text-xs font-semibold transition-base",
                    active ? "text-fg" : done ? "text-muted" : "text-faint group-hover:text-muted"
                  )}
                >
                  {STAGE_LABELS[s]}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      {/* 次にやることを1つだけ提示する */}
      {next && (
        <Button className="min-h-[34px] shrink-0 text-xs" onClick={() => onChange(next)}>
          {STAGE_LABELS[next]}にする
        </Button>
      )}
    </div>
  );
}

/** タグのオン/オフを切り替えるチップ型ボタン */
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
    <Suspense fallback={<main className="pt-10 text-center text-sm text-muted">読み込み中…</main>}>
      <ProjectEditor />
    </Suspense>
  );
}
