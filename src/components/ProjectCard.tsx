"use client";
// ============================================================
// 案件カード（一覧用）
// ステージ・お気に入り・確定粗利（決済完了時）を表示し、
// 開く／アーカイブ／複製／削除の操作を提供する
// ============================================================
import { Card, Badge, cn } from "@/components/ui";
import { Project, PROPERTY_TYPE_LABELS, STAGE_LABELS } from "@/lib/types";
import { fmtDate, fmtDateTime, fmtMan, fmtPct } from "@/lib/format";
import { holdingDays, profitOf, stageOf, variance } from "@/lib/summary";
import { judgeProfit } from "@/lib/calc";

export function ProjectCard({
  p,
  sample,
  companyName,
  onOpen,
  onDuplicate,
  onDelete,
  onToggleFavorite,
  onToggleArchive,
}: {
  p: Project;
  sample?: boolean;
  companyName: (id: string) => string;
  onOpen: (id: string) => void;
  onDuplicate: (p: Project) => void;
  onDelete: (p: Project) => void;
  onToggleFavorite: (p: Project) => void;
  onToggleArchive: (p: Project) => void;
}) {
  const stage = stageOf(p);
  const { basis, input, result } = profitOf(p);
  const judge = judgeProfit(result);
  const confirmed = basis === "actual"; // 実績（確定）で表示しているか
  const v = confirmed ? variance(p) : null;
  // 在庫（買取済）の滞留日数。決済完了なら買取→決済の保有日数
  const days =
    stage === "acquired"
      ? holdingDays(p.actual?.purchaseDate)
      : stage === "settled"
      ? holdingDays(p.actual?.purchaseDate, p.actual?.settleDate)
      : undefined;

  return (
    <Card className={cn("relative overflow-hidden", sample && "border-dashed", p.archived && "opacity-70")}>
      {/* お気に入り（星）。カード本体のボタンと入れ子にならないよう絶対配置にする */}
      <StarButton active={!!p.favorite} onClick={() => onToggleFavorite(p)} />
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
              {p.archived && <Badge tone="neutral">アーカイブ</Badge>}
              {!sample && (
                <Badge tone={stage === "settled" ? "good" : stage === "acquired" ? "brand" : "neutral"}>
                  {STAGE_LABELS[stage]}
                </Badge>
              )}
              <Badge tone="neutral">{PROPERTY_TYPE_LABELS[p.propertyType]}</Badge>
            </div>
            <h3 className="mt-2 truncate text-base font-bold text-fg">{p.name || "（無題）"}</h3>
            <p className="mt-0.5 truncate text-[11px] text-muted">{companyName(p.companyId)}</p>
            <p className="mt-0.5 text-[11px] text-muted">{dateLine(p)}</p>
          </div>
          {/* 星ボタン（右上）と重ならないよう上に余白を取る */}
          <div className="pt-8">
            <Badge tone={judge}>{judge === "good" ? "良好" : judge === "warn" ? "要検討" : "要注意"}</Badge>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <Kpi label={confirmed ? "売却価格（確定）" : "販売価格"} value={`${fmtMan(input.sellPrice)}万`} />
          <Kpi
            label={confirmed ? "営業利益（確定）" : "営業利益"}
            value={`${fmtMan(result.operatingProfit)}万`}
            tone={judge}
          />
          <Kpi label="営業利益率" value={fmtPct(result.operatingMargin)} tone={judge} />
        </div>

        {/* 決済完了案件は計画との着地差を添える */}
        {v && (
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
            <span className="text-muted">計画比</span>
            <Delta label="粗利" value={v.grossProfit} />
            <Delta label="営業利益" value={v.operatingProfit} />
            {days != null && <span className="text-muted">保有 {days}日</span>}
          </div>
        )}
        {!v && stage === "acquired" && days != null && (
          <p className="mt-2 text-[11px] text-muted">
            在庫保有 <span className="font-semibold text-fg">{days}</span> 日（買取日から）
          </p>
        )}
      </button>

      <div className="flex border-t border-border">
        {!sample && (
          <>
            <button
              onClick={() => onToggleArchive(p)}
              className="flex-1 py-2.5 text-xs font-medium text-muted transition-base hover:bg-surface-2 hover:text-fg"
            >
              {p.archived ? "アーカイブから戻す" : "アーカイブ"}
            </button>
            <div className="w-px bg-border" />
          </>
        )}
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

/** ステージに応じた日付の1行表示 */
function dateLine(p: Project): string {
  const stage = stageOf(p);
  if (stage === "settled") {
    const d = p.actual?.settleDate;
    return d ? `決済: ${fmtDate(d)}` : `更新: ${fmtDateTime(p.updatedAt)}`;
  }
  if (stage === "acquired") {
    const d = p.actual?.purchaseDate;
    return d ? `買取: ${fmtDate(d)}` : `更新: ${fmtDateTime(p.updatedAt)}`;
  }
  return `更新: ${fmtDateTime(p.updatedAt)}`;
}

/** 計画比の差額（プラスが緑） */
function Delta({ label, value }: { label: string; value: number }) {
  const color =
    value > 0
      ? "text-emerald-600 dark:text-emerald-400"
      : value < 0
      ? "text-red-600 dark:text-red-400"
      : "text-muted";
  const sign = value > 0 ? "+" : value < 0 ? "−" : "±";
  return (
    <span className={cn("font-semibold", color)}>
      {label} {sign}
      {fmtMan(Math.abs(value))}万
    </span>
  );
}

/** お気に入りの星ボタン（塗り＝お気に入り / 枠線のみ＝未設定） */
function StarButton({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={active ? "お気に入りから外す" : "お気に入りに追加"}
      aria-pressed={active}
      className={cn(
        "absolute right-2 top-2 z-10 rounded-full p-2 transition-base",
        active ? "text-amber-500 hover:bg-amber-500/10" : "text-muted hover:bg-surface-2 hover:text-fg"
      )}
    >
      <svg
        className="h-5 w-5"
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
      <div className="text-[10px] leading-tight text-muted">{label}</div>
      <div className={cn("text-sm font-bold", color)}>{value}</div>
    </div>
  );
}
