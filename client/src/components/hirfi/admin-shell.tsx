// ── هيكل لوحة الإدارة: إطار مكتبي عريض (لا عمود جوال) + شريط تنقّل جانبي ─────
// قرار مقصود: لوحة الإدارة أداة عمل على الحاسوب، فتُخرَج من إطار الجوال وتأخذ
// عرض الشاشة كاملاً. التنقّل جانبي رأسي ثابت، والمحتوى يمرّر مستقلاً.
import type { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  Briefcase,
  Wallet,
  Star,
  Tags,
  ScrollText,
  ArrowLeft,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAuth } from "@/_core/useAuth";
import { trpc } from "@/_core/trpc";
import { cn } from "@/lib/utils";
import { ToastProvider } from "@/lib/toast";

export type AdminSection =
  | "overview"
  | "users"
  | "requests"
  | "offers"
  | "wallets"
  | "reviews"
  | "categories"
  | "audit";

const NAV: { key: AdminSection; href: string; label: string; icon: LucideIcon }[] = [
  { key: "overview", href: "/admin", label: "نظرة عامة", icon: LayoutDashboard },
  { key: "users", href: "/admin/users", label: "المستخدمون", icon: Users },
  { key: "requests", href: "/admin/requests", label: "الطلبات", icon: ClipboardList },
  { key: "offers", href: "/admin/offers", label: "العروض", icon: Briefcase },
  { key: "wallets", href: "/admin/wallets", label: "المحافظ والعمولة", icon: Wallet },
  { key: "reviews", href: "/admin/reviews", label: "التقييمات", icon: Star },
  { key: "categories", href: "/admin/categories", label: "التصنيفات", icon: Tags },
  { key: "audit", href: "/admin/audit", label: "سجل الإدارة", icon: ScrollText },
];

export function AdminShell({
  section,
  title,
  description,
  action,
  children,
}: {
  section: AdminSection;
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  const [path] = useLocation();
  const { user, logout } = useAuth();
  const utils = trpc.useUtils();

  async function handleLogout() {
    await logout();
    await utils.invalidate();
  }

  return (
    <ToastProvider>
      <div className="min-h-svh bg-background">
        {/* الشريط العلوي */}
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-3 border-b border-border bg-background/95 px-4 backdrop-blur-md md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand font-display text-base leading-none font-black text-brand-ink">
              ح
            </span>
            <div className="flex min-w-0 items-baseline gap-2">
              <b className="font-display text-[15px] font-black tracking-tight">حِرْفي</b>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                لوحة الإدارة
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden text-[12px] font-medium text-muted-foreground sm:inline">
              {user?.email}
            </span>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-[12px] font-bold transition-colors hover:bg-muted"
            >
              <ArrowLeft className="size-3.5" />
              التطبيق
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              aria-label="خروج"
              className="grid size-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </header>

        <div className="mx-auto flex w-full max-w-[1400px] gap-6 px-4 py-6 md:px-6">
          {/* التنقّل الجانبي */}
          <aside className="hidden w-56 shrink-0 md:block">
            <nav className="sticky top-20 flex flex-col gap-1">
              {NAV.map((item) => {
                const active = item.key === section;
                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-bold transition-colors",
                      active
                        ? "bg-brand text-brand-ink"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <item.icon className="size-4" />
                    {item.label}
                  </Link>
                );
              })}
              <div className="mt-3 flex items-start gap-2 rounded-xl bg-muted/60 px-3 py-2.5 text-[11px] leading-snug text-muted-foreground">
                <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
                لا حذف نهائي: الحظر والإلغاء والسحب فقط — وكل فعل يُسجَّل.
              </div>
            </nav>
          </aside>

          <div className="min-w-0 flex-1">
            {/* تنقّل أفقي للشاشات الصغيرة */}
            <nav className="-mx-4 mb-4 flex gap-1.5 overflow-x-auto px-4 pb-1 md:hidden [scrollbar-width:none]">
              {NAV.map((item) => {
                const active = item.key === section;
                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    className={cn(
                      "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-bold transition-colors",
                      active ? "bg-brand text-brand-ink" : "bg-muted text-muted-foreground",
                    )}
                  >
                    <item.icon className="size-3.5" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div className="min-w-0">
                <h1 className="text-[26px] leading-tight font-black">{title}</h1>
                {description ? (
                  <p className="mt-1 max-w-3xl text-[13px] text-muted-foreground">{description}</p>
                ) : null}
              </div>
              {action}
            </div>

            {children}
          </div>
        </div>
        <span className="hidden">{path}</span>
      </div>
    </ToastProvider>
  );
}

/** بطاقة إحصاء بسيطة للوحة (أخف من StatCard لأن الصفوف كثيرة). */
export function MetricCard({
  label,
  value,
  hint,
  tone = "muted",
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "muted" | "brand" | "danger" | "success" | "warn";
}) {
  const tones: Record<string, string> = {
    muted: "text-foreground",
    brand: "text-foreground",
    danger: "text-destructive",
    success: "text-success",
    warn: "text-warn",
  };
  return (
    <div
      className="rounded-2xl border border-border bg-card p-4"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div className="text-[11px] font-bold text-muted-foreground">{label}</div>
      <div className={cn("mt-1.5 text-[26px] leading-none font-black", tones[tone])}>{value}</div>
      {hint ? <div className="mt-1.5 text-[11px] text-muted-foreground">{hint}</div> : null}
    </div>
  );
}

/** جدول مقروء بتمرير أفقي — يستعمل في كل أقسام اللوحة. */
export function DataTable({
  columns,
  children,
  empty,
}: {
  columns: string[];
  children: ReactNode;
  empty?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-right">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              {columns.map((c) => (
                <th
                  key={c}
                  className="px-3.5 py-2.5 text-[11px] font-black whitespace-nowrap text-muted-foreground"
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
      {empty ? (
        <div className="px-4 py-10 text-center text-[13px] text-muted-foreground">لا نتائج مطابقة.</div>
      ) : null}
    </div>
  );
}

export function Tr({ children }: { children: ReactNode }) {
  return (
    <tr className="border-b border-border/60 last:border-0 align-top transition-colors hover:bg-muted/30">
      {children}
    </tr>
  );
}

export function Td({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <td className={cn("px-3.5 py-3 text-[12.5px] leading-snug", className)}>{children}</td>;
}
