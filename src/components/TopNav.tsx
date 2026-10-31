"use client";
// パソコン向けの上部ナビゲーション（画面幅1280px前後を想定）
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "./ui";
import { toggleTheme } from "./ThemeInit";

const items = [
  { href: "/", label: "案件一覧" },
  { href: "/settings", label: "設定" },
];

export function TopNav() {
  const pathname = usePathname();
  return (
    <nav className="no-print sticky top-0 z-50 border-b border-border bg-surface/95 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-[1280px] items-center gap-6 px-6">
        <Link href="/" className="text-[15px] font-bold tracking-tight text-fg">
          買取再販 査定・稟議
        </Link>
        <div className="flex items-center gap-1">
          {items.map((it) => {
            const active = it.href === "/" ? pathname === "/" : pathname.startsWith(it.href);
            return (
              <Link
                key={it.href}
                href={it.href}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-[13px] font-semibold transition-base",
                  active
                    ? "bg-surface-2 text-fg"
                    : "text-muted hover:bg-surface-2 hover:text-fg"
                )}
              >
                {it.label}
              </Link>
            );
          })}
        </div>
        <button
          onClick={() => toggleTheme()}
          aria-label="テーマ切替"
          className="ml-auto rounded-lg border border-border bg-surface p-2 text-muted transition-base hover:border-border-strong hover:text-fg"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </nav>
  );
}
