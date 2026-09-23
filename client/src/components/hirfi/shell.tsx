// ── إطار التطبيق: عمود بهيئة الهاتف + شريط علوي + تنقّل سفلي ─────────────────
// قرار مقصود: التطبيق يبدو كتطبيق جوال في كل المقاسات — بعرض جوال على الحاسوب
// (على خلفية رمادية) وبكامل العرض على الهاتف. هذا ما يجعله يُقرأ كـ«تطبيق inDrive»
// لا كـ«لوحة تحكم ويب». التنقّل السفلي هو الأساس، والشريط الجانبي أُلغي.
import type { ReactNode } from "react";
import { Link, Redirect, useLocation } from "wouter";
import {
  ClipboardList,
  Search,
  UserCircle,
  Wallet,
  Bell,
  Plus,
  Briefcase,
  Home as HomeIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAuth } from "@/_core/useAuth";
import { trpc } from "@/_core/trpc";
import { useAppRole, useUnreadCount } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/hirfi/primitives";

type NavItem = { href: string; label: string; icon: LucideIcon };

/** شرائح التنقّل السفلي — الزبون: رئيسية/طلباتي/طلب/محفظة/حسابي، والحرّاف: رئيسية/تصفّح/عروضي/محفظة/حسابي. */
function navFor(isProvider: boolean): NavItem[] {
  return isProvider
    ? [
        { href: "/dashboard", label: "الرئيسية", icon: HomeIcon },
        { href: "/browse", label: "الطلبات", icon: Search },
        { href: "/offers", label: "عروضي", icon: Briefcase },
        { href: "/wallet", label: "المحفظة", icon: Wallet },
        { href: "/profile", label: "حسابي", icon: UserCircle },
      ]
    : [
        { href: "/dashboard", label: "الرئيسية", icon: HomeIcon },
        { href: "/requests", label: "طلباتي", icon: ClipboardList },
        { href: "/requests/new", label: "اطلب", icon: Plus },
        { href: "/wallet", label: "المحفظة", icon: Wallet },
        { href: "/profile", label: "حسابي", icon: UserCircle },
      ];
}

export function Shell({ children }: { children: ReactNode }) {
  const [path] = useLocation();
  const { logout } = useAuth();
  const { role } = useAppRole();
  const unread = useUnreadCount();
  const utils = trpc.useUtils();
  const isProvider = role === "provider";
  const nav = navFor(isProvider);

  const isActive = (href: string) => path === href || path.startsWith(`${href}/`);

  async function handleLogout() {
    await logout();
    await utils.invalidate();
  }

  return (
    <div className="app-stage min-h-svh">
      <div className="app-frame shell-frame">
        {/* الشريط العلوي — رمز الحرف في مربّع ليموني، وبدونه لا يُقرأ كهوية inDrive. */}
        <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-background/95 px-4 backdrop-blur-md">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand font-display text-base leading-none font-black text-brand-ink">
              ح
            </span>
            <span className="flex min-w-0 flex-col items-start gap-1 leading-none">
              <b className="font-display text-[15px] leading-none font-black tracking-tight">حِرْفي</b>
              <span className="whitespace-nowrap text-[10px] leading-none font-medium text-muted-foreground">
                {isProvider ? "حساب حرّاف" : "حساب زبون"}
              </span>
            </span>
          </Link>

          <div className="flex items-center gap-1">
            <Link
              href="/notifications"
              aria-label="الإشعارات"
              className="relative grid size-10 place-items-center rounded-full text-foreground transition-colors hover:bg-muted"
            >
              <Bell className="size-5" />
              {unread > 0 ? (
                <span className="absolute end-1.5 top-1.5 grid min-w-4 place-items-center rounded-full bg-brand px-1 text-[10px] leading-4 font-black text-brand-ink">
                  {unread > 9 ? "9+" : unread}
                </span>
              ) : null}
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              aria-label="خروج"
              className="grid size-10 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" strokeWidth="2.2" stroke="currentColor">
                <path d="M15 17l5-5-5-5M20 12H9M12 19H6a2 2 0 01-2-2V7a2 2 0 012-2h6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </header>

        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain">{children}</main>

        {/* التنقّل السفلي — sticky داخل العمود فيبقى مرئياً ويبقى داخل الإطار. */}
        <nav className="safe-b sticky bottom-0 z-40 shrink-0 border-t border-border bg-background/95 backdrop-blur-md">
          <div className="flex items-stretch justify-around">
            {nav.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex flex-1 flex-col items-center gap-1 pt-2 pb-2.5"
                >
                  <span
                    className={cn(
                      "grid h-7 w-12 place-items-center rounded-full transition-colors",
                      active ? "bg-brand text-brand-ink" : "text-muted-foreground",
                    )}
                  >
                    <item.icon className={cn("size-[19px]", active && "stroke-[2.6]")} />
                  </span>
                  <span
                    className={cn(
                      "text-[10.5px] leading-none",
                      active ? "font-bold text-foreground" : "font-medium text-muted-foreground",
                    )}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}

/** حاجز المسارات: يحوّل المجهول إلى /login ويُظهر دوراناً حتى يُحسم أمر الجلسة. */
export function Protected({ children }: { children: ReactNode }) {
  const [path] = useLocation();
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="app-stage grid min-h-svh place-items-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Spinner />
          جارٍ التحميل…
        </div>
      </div>
    );
  }
  const destination =
    typeof window === "undefined" ? path : `${path}${window.location.search}`;
  if (!user) return <Redirect to={`/login?next=${encodeURIComponent(destination)}`} />;
  return <Shell>{children}</Shell>;
}
