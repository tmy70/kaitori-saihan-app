"use client";
// ============================================================
// 共通UIプリミティブ（Tailwind + CSS変数テーマ）
// shadcn風の軽量自作コンポーネント群
// ============================================================
import React from "react";

export function cn(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

// ---------------- Card ----------------
export function Card({
  className,
  style,
  children,
}: {
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn("rounded-2xl border border-border bg-surface transition-base", className)}
      style={style}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, desc, action }: { title: string; desc?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 px-5 pb-1 pt-4">
      <div>
        <h3 className="text-[13px] font-bold tracking-wide text-fg">{title}</h3>
        {desc && <p className="mt-0.5 text-xs leading-relaxed text-muted">{desc}</p>}
      </div>
      {action}
    </div>
  );
}

// ---------------- Button ----------------
type BtnVariant = "primary" | "secondary" | "ghost" | "danger" | "accent";
export function Button({
  variant = "primary",
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant }) {
  const styles: Record<BtnVariant, string> = {
    primary: "bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800",
    secondary: "bg-surface text-fg border border-border hover:border-border-strong hover:bg-surface-2",
    ghost: "text-muted hover:bg-surface-2 hover:text-fg",
    danger: "bg-bad-600 text-white hover:brightness-110",
    accent: "bg-good-600 text-white hover:brightness-110",
  };
  return (
    <button
      className={cn(
        "inline-flex min-h-[40px] items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-base disabled:cursor-not-allowed disabled:opacity-40",
        styles[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

// ---------------- Text Input ----------------
export function Field({
  label,
  hint,
  children,
}: {
  label?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-xs font-semibold text-muted">{label}</span>}
      {children}
      {hint && <span className="mt-1 block text-[11px] leading-snug text-faint">{hint}</span>}
    </label>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-fg outline-none transition-base placeholder:text-faint hover:border-border-strong focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15",
        props.className
      )}
    />
  );
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        "w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-fg outline-none transition-base placeholder:text-faint hover:border-border-strong focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15",
        props.className
      )}
    />
  );
}

/** 金額入力（万円・数値キーパッド最適化・カンマ表示なしの素の数値入力） */
export function NumberInput({
  value,
  onChangeNumber,
  suffix = "万円",
  placeholder,
  hintYen,
  ...rest
}: {
  value: number | undefined;
  onChangeNumber: (n: number) => void;
  suffix?: string;
  placeholder?: string;
  /** true のとき、万円入力の下に円換算（取り違え防止）を薄く表示 */
  hintYen?: boolean;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  // 入力途中の文字列（"176." や "0." など小数点入力）を保持するためのローカル状態。
  // 数値だけを親へ通知しつつ、表示は手入力の文字列を優先する。
  const [text, setText] = React.useState<string>(
    value === undefined || Number.isNaN(value) ? "" : String(value)
  );

  // 外部から value が変わったとき（自動計算・タイプ変更・坪換算など）だけ表示を同期する。
  // 自分のキー入力で生じた変更は「文字列を数値化した値」と一致するので同期しない（途中入力を壊さない）。
  React.useEffect(() => {
    const cur = text.replace(/,/g, "").trim();
    const curNum = cur === "" ? NaN : Number(cur);
    const v = value === undefined || Number.isNaN(value) ? NaN : value;
    const sameNumber = curNum === v || (Number.isNaN(curNum) && Number.isNaN(v));
    const emptyMeansZero = cur === "" && v === 0; // 空欄=0 のときは "0" に戻さない
    if (!sameNumber && !emptyMeansZero) {
      setText(value === undefined || Number.isNaN(value) ? "" : String(value));
    }
    // text は意図的に依存に含めない（value 変更時のみ同期）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const t = e.target.value;
    setText(t);
    const raw = t.replace(/,/g, "").trim();
    if (raw === "") return onChangeNumber(0);
    const n = Number(raw);
    if (!Number.isNaN(n)) onChangeNumber(n); // "176." など末尾ドットは Number で 176 になり通知、表示は t を維持
  }

  const showHint = hintYen && Number.isFinite(value) && (value ?? 0) !== 0;
  return (
    <div>
      <div className="relative">
        <input
          {...rest}
          type="text"
          inputMode="decimal"
          value={text}
          placeholder={placeholder ?? "0"}
          onChange={handleChange}
          className="w-full rounded-xl border border-border bg-surface py-2.5 pl-3 pr-12 text-right text-sm font-semibold tabular-nums text-fg outline-none transition-base hover:border-border-strong focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15"
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-faint">
          {suffix}
        </span>
      </div>
      {showHint && (
        <span className="mt-0.5 block text-right text-[10px] text-faint">
          = {Math.round((value as number) * 10000).toLocaleString("ja-JP")} 円
        </span>
      )}
    </div>
  );
}

// ---------------- Select ----------------
export function Select({
  value,
  onChange,
  options,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "w-full cursor-pointer appearance-none rounded-xl border border-border bg-surface px-3 py-2.5 pr-9 text-sm text-fg outline-none transition-base hover:border-border-strong focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15",
          className
        )}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {/* 見た目を揃えるため、矢印は自前で描く（appearance-none で既定の矢印を消している） */}
      <svg
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden
      >
        <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

// ---------------- Toggle ----------------
export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  // スイッチ本体（幅を占有しない・shrink-0）
  const sw = (
    <span
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-base",
        checked ? "bg-brand-600" : "bg-border-strong"
      )}
    >
      <span
        className={cn(
          "inline-block h-5 w-5 transform rounded-full bg-white shadow transition-base",
          checked ? "translate-x-5" : "translate-x-0.5"
        )}
      />
    </span>
  );

  // ラベル無し: スイッチだけをコンパクト表示（横幅を占有しない）
  if (!label) {
    return (
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className="inline-flex shrink-0 items-center"
      >
        {sw}
      </button>
    );
  }

  // ラベル有り: ラベル左・スイッチ右の横並び（行幅いっぱい）
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 text-left"
    >
      <span className="text-sm text-fg">{label}</span>
      {sw}
    </button>
  );
}

// ---------------- Badge ----------------
export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: "good" | "warn" | "bad" | "neutral" | "brand";
  children: React.ReactNode;
}) {
  const tones: Record<string, string> = {
    good: "bg-good-500/12 text-good-600 dark:text-good-500",
    warn: "bg-warn-500/12 text-warn-600 dark:text-warn-500",
    bad: "bg-bad-500/12 text-bad-600 dark:text-bad-500",
    neutral: "border border-border bg-surface-2 text-muted",
    brand: "bg-brand-500/12 text-brand-600 dark:text-brand-300",
  };
  return (
    <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold", tones[tone])}>
      {children}
    </span>
  );
}

// ---------------- Tabs ----------------
export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: { key: string; label: string }[];
  active: string;
  onChange: (k: string) => void;
}) {
  const ref = React.useRef<HTMLDivElement>(null);

  /**
   * タブバーの実際の高さを CSS 変数 --tabbar-h に反映する。
   * タブが折り返して2段になっても、その下に貼り付く要素（計算書のKPI等）が
   * タブバーに隠れないようにするため。
   */
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const apply = () => {
      document.documentElement.style.setProperty("--tabbar-h", `${Math.round(el.offsetHeight)}px`);
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  }, [tabs.length]);

  return (
    <div ref={ref} className="sticky top-14 z-20 -mx-6 mb-5 bg-bg/85 px-6 py-2 backdrop-blur">
      {/*
        タブは折り返して全部見えるようにする（横スクロールだと画面外のタブに
        気づけず、機能に到達できないため）。
      */}
      <div className="flex flex-wrap gap-1 rounded-xl border border-border bg-surface p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            aria-current={active === t.key ? "page" : undefined}
            className={cn(
              "min-h-[34px] whitespace-nowrap rounded-lg px-3 text-[13px] font-semibold transition-base",
              active === t.key
                ? "bg-brand-600 text-white"
                : "text-muted hover:bg-surface-2 hover:text-fg"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------- Collapsible（折りたたみ） ----------------
/**
 * 折りたたみパネル。
 * 見出し行はボタンになっており、閉じている間も要点（right）を表示できる。
 * 画面の縦を節約しつつ、必要なときだけ詳細を開く用途に使う。
 */
export function Collapsible({
  open,
  onToggle,
  title,
  right,
  children,
  className,
}: {
  open: boolean;
  onToggle: () => void;
  title: React.ReactNode;
  /** 閉じているときも見せたい要点（合計値やバッジなど） */
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("overflow-hidden rounded-2xl border border-border bg-surface", className)}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-5 py-3.5 text-left transition-base hover:bg-surface-2"
      >
        <div className="min-w-0 flex-1">{title}</div>
        <div className="flex shrink-0 items-center gap-2">
          {right}
          <svg
            className={cn("h-4 w-4 text-muted transition-base", open && "rotate-180")}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </button>
      {open && <div className="border-t border-border">{children}</div>}
    </div>
  );
}

// ---------------- Modal ----------------
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-pop"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-3 text-base font-bold text-fg">{title}</h3>
        <div className="text-sm text-fg">{children}</div>
        {footer && <div className="mt-5 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}
