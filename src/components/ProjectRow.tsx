"use client";
// ============================================================
// 案件の一覧行
//
// 1280px の横幅を使い、1行で「どの物件か・いまどの段階か・いくら残るか」を読み取れるようにする。
// ステージはその場で変更でき、操作（複製・アーカイブ・削除）は行にカーソルを乗せたときだけ出す。
// ============================================================
import { cn } from "@/components/ui";
import {
  Project,
  PROPERTY_TYPE_LABELS,
  ProjectStage,
  STAGE_ORDER,
  STAGE_SHORT_LABELS,
} from "@/lib/types";
import { fmtDate, fmtMan, fmtPct } from "@/lib/format";
import { holdingDays, profitOf, stageOf } from "@/lib/summary";
import { judgeProfit } from "@/lib/calc";

/** ステージごとの色（点とラベル） */
const STAGE_TONE: Record<ProjectStage, string> = {
  assessing: "bg-faint",
  offered: "bg-brand-400",
  decided: "bg-brand-600",
  acquired: "bg-warn-500",
  settled: "bg-good-500",
};

export function ProjectRow({
  p,
  companyName,
  onOpen,
  onDuplicate,
  onDelete,
  onToggleFavorite,
  onToggleArchive,
  onChangeStage,
}: {
  p: Project;
  companyName: (id: string) => string;
  onOpen: (id: string) => void;
  onDuplicate: (p: Project) => void;
  onDelete: (p: Project) => void;
  onToggleFavorite: (p: Project) => void;
  onToggleArchive: (p: Project) => void;
  onChangeStage: (p: Project, s: ProjectStage) => void;
}) {
  const stage = stageOf(p);
  const { basis, input, result } = profitOf(p);
  const judge = judgeProfit(result);
  const confirmed = basis === "actual";
  const days =
    stage === "acquired"
      ? holdingDays(p.actual?.purchaseDate)
      : stage === "settled"
      ? holdingDays(p.actual?.purchaseDate, p.actual?.settleDate)
      : undefined;

  const address = p.assessment?.address || p.ringi?.address || "";

  return (
    <div
      className={cn(
        "group relative grid grid-cols-[auto_1fr_auto] items-center gap-4 rounded-2xl border border-border bg-surface px-4 py-3 transition-base",
        "hover:border-border-strong hover:bg-surface-2",
        p.archived && "opacity-60"
      )}
    >
      <StarButton active={!!p.favorite} onClick={() => onToggleFavorite(p)} />

      {/* 物件の見分け：案件名 → 所在地 → 種別・会社 */}
      <button onClick={() => onOpen(p.id)} className="min-w-0 text-left">
        <div className="flex items-center gap-2">
          <span className={cn("h-2 w-2 shrink-0 rounded-full", STAGE_TONE[stage])} aria-hidden />
          <span className="truncate text-[15px] font-bold text-fg">{p.name || "（無題）"}</span>
          {p.archived && (
            <span className="shrink-0 rounded-md border border-border px-1.5 py-0.5 text-[10px] text-muted">
              アーカイブ
            </span>
          )}
        </div>
        <div className="mt-1 flex items-center gap-2 text-xs text-muted">
          {address && <span className="truncate">{address}</span>}
          {address && <span className="text-faint">·</span>}
          <span className="shrink-0">{PROPERTY_TYPE_LABELS[p.propertyType]}</span>
          <span className="text-faint">·</span>
          <span className="shrink-0 truncate">{companyName(p.companyId)}</span>
          <span className="text-faint">·</span>
          <span className="shrink-0">{dateLine(p)}</span>
          {days != null && (
            <>
              <span className="text-faint">·</span>
              <span className="shrink-0">保有{days}日</span>
            </>
          )}
        </div>
      </button>

      {/* 数字とステージ */}
      <div className="flex items-center gap-5">
        <Num label={confirmed ? "販売価格（確定）" : "販売価格"} value={`${fmtMan(input.sellPrice)}`} />
        <Num
          label={confirmed ? "営業利益（確定）" : "営業利益"}
          value={`${fmtMan(result.operatingProfit)}`}
          tone={judge}
        />
        <Num label="利益率" value={fmtPct(result.operatingMargin, 1)} tone={judge} unit="" />

        <StagePicker stage={stage} onChange={(s) => onChangeStage(p, s)} />

        {/* 操作は普段隠し、行にカーソルを乗せたときだけ出す */}
        <div className="flex w-[108px] shrink-0 justify-end gap-1 opacity-0 transition-base focus-within:opacity-100 group-hover:opacity-100">
          <IconButton label="複製" onClick={() => onDuplicate(p)}>
            <path d="M9 9h10v10H9zM5 15V5h10" strokeLinecap="round" strokeLinejoin="round" />
          </IconButton>
          <IconButton
            label={p.archived ? "アーカイブから戻す" : "アーカイブ"}
            onClick={() => onToggleArchive(p)}
          >
            <path d="M3 7h18v3H3zM5 10v10h14V10M10 14h4" strokeLinecap="round" strokeLinejoin="round" />
          </IconButton>
          <IconButton label="削除" danger onClick={() => onDelete(p)}>
            <path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13" strokeLinecap="round" strokeLinejoin="round" />
          </IconButton>
        </div>
      </div>
    </div>
  );
}

/** 一覧からそのままステージを進められるようにする */
function StagePicker({
  stage,
  onChange,
}: {
  stage: ProjectStage;
  onChange: (s: ProjectStage) => void;
}) {
  return (
    <div className="relative w-[112px] shrink-0">
      <select
        value={stage}
        onChange={(e) => onChange(e.target.value as ProjectStage)}
        aria-label="進行状況"
        className="w-full cursor-pointer appearance-none rounded-lg border border-border bg-surface py-1.5 pl-2.5 pr-7 text-xs font-semibold text-fg outline-none transition-base hover:border-border-strong focus:border-brand-500"
      >
        {STAGE_ORDER.map((s) => (
          <option key={s} value={s}>
            {STAGE_SHORT_LABELS[s]}
          </option>
        ))}
      </select>
      <svg
        className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        aria-hidden
      >
        <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

/** 右寄せの数値（桁を揃える） */
function Num({
  label,
  value,
  unit = "万",
  tone,
}: {
  label: string;
  value: string;
  unit?: string;
  tone?: "good" | "warn" | "bad";
}) {
  const color =
    tone === "good"
      ? "text-good-600 dark:text-good-500"
      : tone === "bad"
      ? "text-bad-600 dark:text-bad-500"
      : tone === "warn"
      ? "text-warn-600 dark:text-warn-500"
      : "text-fg";
  return (
    <div className="w-[104px] shrink-0 text-right">
      <div className="text-[10px] leading-tight text-faint">{label}</div>
      <div className={cn("text-num-sm tabular-nums", color)}>
        {value}
        {unit && <span className="ml-0.5 text-[11px] font-semibold text-muted">{unit}</span>}
      </div>
    </div>
  );
}

/** ステージに応じた日付の1行表示 */
function dateLine(p: Project): string {
  const stage = stageOf(p);
  if (stage === "settled" && p.actual?.settleDate) return `決済 ${fmtDate(p.actual.settleDate)}`;
  if (stage === "acquired" && p.actual?.purchaseDate) return `買取 ${fmtDate(p.actual.purchaseDate)}`;
  return `更新 ${fmtDate(p.updatedAt)}`;
}

/** お気に入りの星（塗り＝お気に入り） */
function StarButton({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={active ? "お気に入りから外す" : "お気に入りに追加"}
      aria-pressed={active}
      className={cn(
        "shrink-0 rounded-lg p-1.5 transition-base",
        active
          ? "text-warn-500 hover:bg-warn-500/10"
          : "text-faint opacity-0 hover:bg-surface-2 hover:text-fg group-hover:opacity-100 focus-visible:opacity-100"
      )}
    >
      <svg
        className="h-[18px] w-[18px]"
        viewBox="0 0 24 24"
        fill={active ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={1.8}
      >
        <path
          d="M12 3.5l2.6 5.27 5.82.85-4.21 4.1.99 5.78L12 16.77l-5.2 2.73.99-5.78-4.21-4.1 5.82-.85L12 3.5z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

function IconButton({
  label,
  danger,
  onClick,
  children,
}: {
  label: string;
  danger?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn(
        "rounded-lg p-1.5 transition-base",
        danger ? "text-faint hover:bg-bad-500/10 hover:text-bad-600" : "text-faint hover:bg-surface hover:text-fg"
      )}
    >
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
        {children}
      </svg>
    </button>
  );
}
