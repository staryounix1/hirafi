// ── خطّافات مشتركة: الجلسة (الملف + الدور)، الفئات، عدّاد الإشعارات ─────────
import { useMemo } from "react";
import { trpc } from "@/_core/trpc";
import type { AppRole, ServiceKind } from "@shared/constants";

/** ملفي + مهاراتي + أعمالي — المصدر الوحيد للدور التجاري الحالي. */
export function useMyProfile() {
  return trpc.profile.me.useQuery(undefined, { staleTime: 15_000 });
}

/** حالة تفعيل محفظة الزبون — معطّلة افتراضياً، الزبون كيفعّلها من حسابه. */
export function useWalletEnabled(): boolean {
  const q = useMyProfile();
  return q.data?.walletEnabled ?? false;
}

/**
 * نوع خدمة الحرّاف المحبوس — `null` مازال ما اختارش.
 * ملي كيتثبّت، الحرّاف كيشوف غير خدمات نوعو والواجهة كتتبدّل عليها.
 */
export function usePrimaryKind(): { kind: ServiceKind | null; locked: boolean; isLoading: boolean } {
  const q = useMyProfile();
  const kind = (q.data?.primaryKind as ServiceKind | null | undefined) ?? null;
  return { kind, locked: Boolean(q.data?.professionLocked), isLoading: q.isLoading };
}

/** الدور التجاري للمستخدم الحالي — `customer` | `provider`، مع بديل آمن أثناء التحميل. */
export function useAppRole(): { role: AppRole; isLoading: boolean } {
  const q = useMyProfile();
  const role = (q.data?.profile.role as AppRole | undefined) ?? "customer";
  return { role, isLoading: q.isLoading };
}

export function useCategories() {
  return trpc.categories.list.useQuery(undefined, { staleTime: 5 * 60_000 });
}

/** عناصر شريط «شنو بغيتي اليوم؟» كما ضبطها الأدمن (نشطة ومرتّبة). */
export function useHomeMenu() {
  return trpc.homeMenu.list.useQuery(undefined, { staleTime: 60_000 });
}

/** خريطة id ← فئة لقراءة الأسماء والأيقونات في القوائم. */
export function useCategoryMap() {
  const q = useCategories();
  return useMemo(() => {
    const m = new Map((q.data ?? []).map((c) => [c.id, c]));
    return { map: m, list: q.data ?? [], isLoading: q.isLoading, error: q.error };
  }, [q.data, q.isLoading, q.error]);
}

/** عدّاد الإشعارات غير المقروءة — يغذّي شارة الجرس في الشريط. */
export function useUnreadCount() {
  const q = trpc.notifications.unreadCount.useQuery(undefined, {
    staleTime: 10_000,
    refetchInterval: 30_000,
  });
  return q.data ?? 0;
}

/** فاصل زمني لتحديث المحادثة (polling — لا لحظية في هذا النطاق). */
export const POLL_INTERVAL_MS = 5000;

export function useIsDesktop() {
  return typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches;
}
