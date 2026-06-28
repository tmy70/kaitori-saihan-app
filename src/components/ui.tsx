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
export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-surface shadow-card transition-base",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, desc, action }: { title: string; desc?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
      <div>
        <h3 className="text-sm font-bold text-fg">{title}</h3>
        {desc && <p className="mt-0.5 text-xs text-muted">{desc}</p>}
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
    primary: "bg-brand-500 text-white hover:bg-brand-600 active:bg-brand-700",
    secondary: "bg-surface-2 text-fg border border-border hover:bg-border/40",
    ghost: "text-fg hover:bg-surface-2",
    danger: "bg-red-600 text-white hover:bg-red-700",
    accent: "bg-accent-500 text-brand-900 hover:bg-accent-600",
  };
  return (
    <button
      className={cn(
        "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-base disabled:cursor-not-allowed disabled:opacity-50",
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
      {label && <span className="mb-1 block text-xs font-medium text-muted">{label}</span>}
      {children}
      {hint && <span className="mt-1 block text-[11px] text-muted">{hint}</span>}
    </label>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "w-full rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm text-fg outline-none transition-base placeholder:text-muted/60 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20",
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
        "w-full rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm text-fg outline-none transition-base placeholder:text-muted/60 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20",
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
  const showHint = hintYen && Number.isFinite(value) && (value ?? 0) !== 0;
  return (
    <div>
      <div className="relative">
        <input
          {...rest}
          type="text"
          inputMode="decimal"
          value={value === undefined || Number.isNaN(value) ? "" : String(value)}
          placeholder={placeholder ?? "0"}
          onChange={(e) => {
            const raw = e.target.value.replace(/,/g, "").trim();
            if (raw === "") return onChangeNumber(0);
            const n = Number(raw);
            if (!Number.isNaN(n)) onChangeNumber(n);
          }}
          className="w-full rounded-xl border border-border bg-surface-2 py-2.5 pl-3 pr-12 text-right text-sm font-medium text-fg outline-none transition-base focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">
          {suffix}
        </span>
      </div>
      {showHint && (
        <span className="mt-0.5 block text-right text-[10px] text-muted">
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
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "w-full rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm text-fg outline-none transition-base focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20",
        className
      )}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
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
        checked ? "bg-emerald-500" : "bg-border"
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
    good: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    warn: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    bad: "bg-red-500/15 text-red-600 dark:text-red-400",
    neutral: "bg-surface-2 text-muted",
    brand: "bg-brand-500/15 text-brand-600 dark:text-brand-100",
  };
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold", tones[tone])}>
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
  return (
    <div className="sticky top-0 z-10 -mx-4 mb-4 border-b border-border bg-bg/90 px-4 backdrop-blur">
      <div className="flex gap-1 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            className={cn(
              "whitespace-nowrap border-b-2 px-3 py-3 text-sm font-semibold transition-base",
              active === t.key
                ? "border-brand-500 text-brand-600 dark:text-brand-100"
                : "border-transparent text-muted hover:text-fg"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
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
        className="w-full max-w-md rounded-t-2xl bg-surface p-5 shadow-card sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-3 text-base font-bold text-fg">{title}</h3>
        <div className="text-sm text-fg">{children}</div>
        {footer && <div className="mt-5 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}
