// ── الشريط العام: ترويسة + تنقّل جانبي على الحاسوب وشريط سفلي على الهاتف ───────
// التنقّل يتغيّر بحسب الدور التجاري (زبون ↔ حرّاف) — وهو ما يجعل التطبيق «تطبيقاً
// واحداً بلوحتين» بنفس فكرة inDrive: عرض/طلب بدل سواقة/تنقّل.
import type { ReactNode } from "react";
import { Link, Redirect, useLocation } from "wouter";
import {
  LayoutDashboard,
  ClipboardList,
  Search,
  Send,
  UserCircle,
  Wallet,
  Bell,
  LogOut,
  Plus,
  Briefcase,
  MessageSquare,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAuth } from "@/_core/useAuth";
import { trpc } from "@/_core/trpc";
import { useAppRole, useUnreadCount } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/hirfi/primitives";

type NavItem = { href: string; label: string; icon: LucideIcon };

/** يحيط كل صفحة محمية: ترويسة + تنقّل + محتوى. */
export function Shell({ children }: { children: ReactNode }) {
  const [path] = useLocation();
  const { user, logout } = useAuth();
  const { role } = useAppRole();
  const unread = useUnreadCount();
  const utils = trpc.useUtils();
  const isProvider = role === "provider";

  const nav: NavItem[] = isProvider
    ? [
        { href: "/dashboard", label: "لوحتي", icon: LayoutDashboard },
        { href: "/browse", label: "الطلبات القريبة", icon: Search },
        { href: "/offers", label: "عروضي", icon: Send },
        { href: "/wallet", label: "المحفظة", icon: Wallet },
        { href: "/profile", label: "ملفي الشخصي", icon: UserCircle },
      ]
    : [
        { href: "/dashboard", label: "لوحتي", icon: LayoutDashboard },
        { href: "/requests", label: "طلباتي", icon: ClipboardList },
        { href: "/requests/new", label: "طلب جديد", icon: Plus },
        { href: "/wallet", label: "المحفظة", icon: Wallet },
        { href: "/profile", label: "ملفي الشخصي", icon: UserCircle },
      ];

  // الشريط السفلي يحمل 5 عناصر كأقصى — نُكيّف التسميات للضيق.
  const mobileNav: NavItem[] = isProvider
    ? [
        { href: "/dashboard", label: "لوحتي", icon: LayoutDashboard },
        { href: "/browse", label: "تصفّح", icon: Search },
        { href: "/offers", label: "عروضي", icon: Send },
        { href: "/wallet", label: "المحفظة", icon: Wallet },
        { href: "/profile", label: "ملفي", icon: UserCircle },
      ]
    : [
        { href: "/dashboard", label: "لوحتي", icon: LayoutDashboard },
        { href: "/requests", label: "طلباتي", icon: ClipboardList },
        { href: "/requests/new", label: "طلب", icon: Plus },
        { href: "/wallet", label: "المحفظة", icon: Wallet },
        { href: "/profile", label: "ملفي", icon: UserCircle },
      ];

  const isActive = (href: string) => path === href || path.startsWith(`${href}/`);

  async function handleLogout() {
    await logout();
    await utils.invalidate();
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/85 backdrop-blur-md">
        <div className="shell flex h-15 items-center justify-between gap-3 py-2.5">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-brand-gradient font-display text-lg leading-none font-extrabold text-white shadow-sm">
              ح
            </span>
            <span className="flex flex-col leading-none">
              <b className="font-display text-base font-extrabold tracking-tight">حِرْفي</b>
              <span className="mt-0.5 text-[11px] text-muted-foreground">
                {isProvider ? "حساب حرّاف" : "حساب زبون"}
              </span>
            </span>
          </Link>

          <div className="flex items-center gap-1.5">
            {isProvider ? (
              <Button asChild variant="outline" size="sm" className="hidden gap-1.5 sm:inline-flex">
                <Link href="/browse">
                  <Search className="size-3.5" />
                  طلبات قريبة
                </Link>
              </Button>
            ) : (
              <Button asChild size="sm" className="hidden gap-1.5 sm:inline-flex">
                <Link href="/requests/new">
                  <Plus className="size-3.5" />
                  انشر طلباً
                </Link>
              </Button>
            )}
            <Button asChild variant="ghost" size="icon" className="relative">
              <Link href="/notifications" aria-label="الإشعارات">
                <Bell className="size-4.5" />
                {unread > 0 ? (
                  <span className="absolute -top-0.5 -end-0.5 grid min-w-4.5 place-items-center rounded-full bg-brand px-1 text-[10px] leading-4.5 font-bold text-white">
                    {unread > 9 ? "9+" : unread}
                  </span>
                ) : null}
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              aria-label="خروج"
              title={user?.email ?? undefined}
            >
              <LogOut className="size-4.5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="shell flex flex-1 gap-8">
        {/* تنقّل جانبي — حاسوب فقط */}
        <aside className="hidden w-56 shrink-0 md:block">
          <nav className="sticky top-20 grid gap-1 py-6">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive(item.href)
                    ? "bg-brand/12 text-brand-dark"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <item.icon className="size-4.5" />
                {item.label}
              </Link>
            ))}
            <Link
              href="/messages"
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive("/messages")
                  ? "bg-brand/12 text-brand-dark"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <MessageSquare className="size-4.5" />
              المحادثات
            </Link>
            <Link
              href="/notifications"
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive("/notifications")
                  ? "bg-brand/12 text-brand-dark"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Bell className="size-4.5" />
              الإشعارات
              {unread > 0 ? (
                <span className="ms-auto grid min-w-5 place-items-center rounded-full bg-brand px-1 text-[10px] leading-5 font-bold text-white">
                  {unread > 9 ? "9+" : unread}
                </span>
              ) : null}
            </Link>

            {isProvider ? (
              <Link
                href="/browse"
                className="mt-3 flex items-center justify-center gap-1.5 rounded-lg bg-brand px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
              >
                <Briefcase className="size-4" />
                تصفّح الطلبات
              </Link>
            ) : (
              <Link
                href="/requests/new"
                className="mt-3 flex items-center justify-center gap-1.5 rounded-lg bg-brand px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
              >
                <Plus className="size-4" />
                انشر طلباً جديداً
              </Link>
            )}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 pb-safe-nav pt-5 md:pb-10">{children}</main>
      </div>

      {/* شريط سفلي — هاتف فقط */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur-md md:hidden">
        <div className="flex items-stretch justify-around pb-[env(safe-area-inset-bottom)]">
          {mobileNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                isActive(item.href) ? "text-brand" : "text-muted-foreground",
              )}
            >
              <item.icon className={cn("size-5", isActive(item.href) && "stroke-[2.4]")} />
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}

/** حاجز المسارات: يحوّل المجهول إلى /login ويُظهر دوراناً حتى يُحسم أمر الجلسة. */
export function Protected({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="grid min-h-screen place-items-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Spinner />
          جارٍ التحميل…
        </div>
      </div>
    );
  }
  if (!user) return <Redirect to="/login" />;
  return <Shell>{children}</Shell>;
}
