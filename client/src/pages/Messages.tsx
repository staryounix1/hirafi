// ── المحادثات: قائمة الخيوط التي يحقّ لي الكتابة فيها ─────────────────────────
// لا يوجد جدول «محادثة» منفصل في هذا التطبيق: الخيط مرتبط بالطلب نفسه، وتُعرض
// المحادثة كاملة داخل شاشة الطلب. هذه الصفحة تجمع الخيوط وتقود إليها.
import { useMemo } from "react";
import { Link } from "wouter";
import {
  MessageSquare,
  ClipboardList,
  Send,
  Briefcase,
  Hourglass,
  CircleDollarSign,
  ArrowRight,
  UserCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Badge,
  EmptyState,
  ErrorState,
  ListSkeleton,
  PageHeader,
} from "@/components/hirfi/primitives";
import { trpc } from "@/_core/trpc";
import { useAppRole } from "@/lib/hooks";
import { categoryIcon, errorMessage, formatMAD, offerStatusMeta, requestStatusMeta, timeAgoAr } from "@/lib/format";

interface Thread {
  requestId: string;
  title: string;
  categoryName: string;
  categoryIcon: string;
  counterpart: string;
  statusLabel: string;
  metaNote: string;
  updatedAt: Date | string;
  href: string;
}

export default function Messages() {
  const { role, isLoading: roleLoading } = useAppRole();
  const isProvider = role === "provider";
  const mine = trpc.requests.mine.useQuery(undefined, { enabled: !roleLoading && !isProvider });
  const offers = trpc.offers.mine.useQuery(undefined, { enabled: !roleLoading && isProvider });
  const jobs = trpc.offers.myJobs.useQuery(undefined, { enabled: !roleLoading && isProvider });

  const threads = useMemo<Thread[]>(() => {
    if (isProvider) {
      const out: Thread[] = [];
      const seen = new Set<string>();
      // الأعمال المُسندة أولاً — هذه الخيوط المفتوحة فعلاً.
      for (const j of jobs.data ?? []) {
        if (seen.has(j.id)) continue;
        seen.add(j.id);
        const sm = requestStatusMeta(j.status);
        out.push({
          requestId: j.id,
          title: j.title,
          categoryName: j.categoryName,
          categoryIcon: j.categoryIcon,
          counterpart: "الزبون صاحب الطلب",
          statusLabel: `الطلب: ${sm.label.split(" — ")[0]}`,
          metaNote: `السعر المتفق عليه ${formatMAD(j.agreedAmount ?? j.budgetAmount)}`,
          updatedAt: j.updatedAt,
          href: `/requests/${j.id}`,
        });
      }
      // ثم العروض المعلّقة/المتفاوض عليها — المحادثة مفتوحة معها أيضاً.
      for (const o of offers.data ?? []) {
        if (seen.has(o.requestId)) continue;
        if (o.status !== "pending" && o.status !== "countered") continue;
        seen.add(o.requestId);
        const om = offerStatusMeta(o.status);
        out.push({
          requestId: o.requestId,
          title: o.requestTitle,
          categoryName: o.categoryName,
          categoryIcon: o.categoryIcon,
          counterpart: o.customerName,
          statusLabel: om.label,
          metaNote: `عرضي: ${formatMAD(o.price)}`,
          updatedAt: o.createdAt,
          href: `/requests/${o.requestId}`,
        });
      }
      return out;
    }

    // الزبون: الطلبات التي فيها حرّاف يمكن محادثته (اتفاق، أو عرض مقدَّم).
    return (mine.data ?? [])
      .filter((r) => r.status !== "open" || (r.offerCount ?? 0) > 0)
      .map((r) => {
        const sm = requestStatusMeta(r.status);
        return {
          requestId: r.id,
          title: r.title,
          categoryName: r.categoryName,
          categoryIcon: r.categoryIcon,
          counterpart:
            (r.offerCount ?? 0) > 0 ? `${r.offerCount} حرّاف تواصل معك` : "الحرّاف المختار",
          statusLabel: sm.label,
          metaNote: r.agreedAmount
            ? `اتفقتما على ${formatMAD(r.agreedAmount)}`
            : `ميزانيتك المقترحة ${formatMAD(r.budgetAmount)}`,
          updatedAt: r.updatedAt,
          href: `/requests/${r.id}`,
        };
      });
  }, [isProvider, jobs.data, offers.data, mine.data]);

  const loading =
    roleLoading || mine.isLoading || offers.isLoading || jobs.isLoading;
  const error = mine.error ?? offers.error ?? jobs.error;

  return (
    <div className="grid gap-5">
      <PageHeader
        icon={MessageSquare}
        title="المحادثات"
        description="لكل طلب خيط محادثة خاص: الزبون والحرّاف الذي قدّم عرضاً، ثم الطرفان المتعاقدان بعد الاتفاق. المحادثة نفسها تُفتح داخل شاشة الطلب."
      />

      {loading ? (
        <ListSkeleton count={3} lines={2} />
      ) : error ? (
        <ErrorState message={errorMessage(error)} onRetry={() => void mine.refetch()} />
      ) : threads.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="لا محادثات بعد"
          description={
            isProvider
              ? "المحادثة تُفتح تلقائياً لحظة تقديمك عرضاً على طلب، فتقدّم بعرضك الأول وستظهر الخيوط هنا."
              : "المحادثة تُفتح لحظة وصول أول عرض على طلبك — انشر طلباً وسيبدأ الحرّافون بالتواصل."
          }
          actionLabel={isProvider ? "تصفّح الطلبات القريبة" : "انشر طلباً جديداً"}
          actionHref={isProvider ? "/browse" : "/requests/new"}
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="teal" icon={MessageSquare}>
              {threads.length} خيط محادثة
            </Badge>
            <Badge tone="muted" icon={UserCircle}>
              {isProvider ? "دورك: حرّاف" : "دورك: زبون"}
            </Badge>
          </div>

          <div className="grid gap-3">
            {threads.map((t) => {
              const Icon = categoryIcon(t.categoryIcon);
              return (
                <article
                  key={t.href}
                  className="card-warm flex flex-wrap items-start gap-3 rounded-xl border border-border bg-card p-4"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-brand/10 text-brand-dark">
                    <Icon className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <Link href={t.href} className="block">
                      <h3 className="text-base leading-snug font-bold hover:text-brand-dark">
                        {t.title}
                      </h3>
                    </Link>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Icon className="size-3.5" />
                        {t.categoryName}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <UserCircle className="size-3.5" />
                        {t.counterpart}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Hourglass className="size-3.5" />
                        {timeAgoAr(t.updatedAt)}
                      </span>
                    </div>
                    <div className="mt-2.5 flex flex-wrap items-center gap-2">
                      <Badge tone="teal">{t.statusLabel}</Badge>
                      <Badge tone="muted" icon={CircleDollarSign}>
                        {t.metaNote}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button asChild size="sm" className="gap-1.5">
                      <Link href={t.href}>
                        <MessageSquare className="size-3.5" />
                        افتح المحادثة
                      </Link>
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {isProvider ? (
              <>
                <Link
                  href="/offers"
                  className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-brand/40"
                >
                  <span className="grid size-9 place-items-center rounded-lg bg-teal-soft text-teal">
                    <Send className="size-4.5" />
                  </span>
                  <div className="flex-1">
                    <div className="text-sm font-semibold">عروضي</div>
                    <div className="text-xs text-muted-foreground">إدارة كل عرض أرسلته</div>
                  </div>
                  <ArrowRight className="size-4 text-muted-foreground" />
                </Link>
                <Link
                  href="/browse"
                  className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-brand/40"
                >
                  <span className="grid size-9 place-items-center rounded-lg bg-brand/12 text-brand-dark">
                    <Briefcase className="size-4.5" />
                  </span>
                  <div className="flex-1">
                    <div className="text-sm font-semibold">طلبات جديدة</div>
                    <div className="text-xs text-muted-foreground">افتح طلباً لتقرأ تفاصيله وتقدّم عرضاً</div>
                  </div>
                  <ArrowRight className="size-4 text-muted-foreground" />
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/requests"
                  className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-brand/40"
                >
                  <span className="grid size-9 place-items-center rounded-lg bg-teal-soft text-teal">
                    <ClipboardList className="size-4.5" />
                  </span>
                  <div className="flex-1">
                    <div className="text-sm font-semibold">طلباتي</div>
                    <div className="text-xs text-muted-foreground">تابع حالة كل طلب وعروضه</div>
                  </div>
                  <ArrowRight className="size-4 text-muted-foreground" />
                </Link>
                <Link
                  href="/requests/new"
                  className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-brand/40"
                >
                  <span className="grid size-9 place-items-center rounded-lg bg-brand/12 text-brand-dark">
                    <Send className="size-4.5" />
                  </span>
                  <div className="flex-1">
                    <div className="text-sm font-semibold">طلب جديد</div>
                    <div className="text-xs text-muted-foreground">انشر طلباً ليصلك أول عرض</div>
                  </div>
                  <ArrowRight className="size-4 text-muted-foreground" />
                </Link>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
