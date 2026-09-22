// ── المحادثات: قائمة الخيوط التي يحقّ لي الكتابة فيها ───────────────────────────────
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
  UserCircle,
  ArrowLeft,
} from "lucide-react";
import { Badge, EmptyState, ErrorState, ListSkeleton, PageHeader } from "@/components/hirfi/primitives";
import { trpc } from "@/_core/trpc";
import { useAppRole } from "@/lib/hooks";
import {
  categoryIcon,
  countAr,
  errorMessage,
  formatMAD,
  offerStatusMeta,
  requestStatusMeta,
  timeAgoAr,
} from "@/lib/format";

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

    // الزبون: الطلبات التي فيها حرف يمكن محادثته (اتفاق، أو عرض مقدَّم).
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
            (r.offerCount ?? 0) > 0 ? `${r.offerCount} حرف تواصل معك` : "الحرف المختار",
          statusLabel: sm.label,
          metaNote: r.agreedAmount
            ? `اتفقتما على ${formatMAD(r.agreedAmount)}`
            : `ميزانيتك المقترحة ${formatMAD(r.budgetAmount)}`,
          updatedAt: r.updatedAt,
          href: `/requests/${r.id}`,
        };
      });
  }, [isProvider, jobs.data, offers.data, mine.data]);

  const loading = roleLoading || mine.isLoading || offers.isLoading || jobs.isLoading;
  const error = mine.error ?? offers.error ?? jobs.error;

  return (
    <div className="grid">
      <PageHeader
        icon={MessageSquare}
        title="المحادثات"
        description="لكل طلب خيط محادثة خاص: الزبون والحرف الذي قدّم عرضاً، ثم الطرفان المتعاقدان بعد الاتفاق. المحادثة نفسها تُفتح داخل شاشة الطلب."
      />

      <div className="grid gap-3 px-4 pt-4 pb-6">
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
                : "المحادثة تُفتح لحظة وصول أول عرض على طلبك — انشر طلباً وسيبدأ الحرفيون بالتواصل."
            }
            actionLabel={isProvider ? "تصفّح الطلبات القريبة" : "انشر طلباً جديداً"}
            actionHref={isProvider ? "/browse" : "/requests/new"}
          />
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="teal" icon={MessageSquare}>
                {countAr(threads.length, ["خيط محادثة", "خيطا محادثة", "خيوط محادثة"], "خيط محادثة")}
              </Badge>
              <Badge tone="muted" icon={UserCircle}>
                {isProvider ? "دورك: حرف" : "دورك: زبون"}
              </Badge>
            </div>

            <div className="grid gap-2.5">
              {threads.map((t) => {
                const Icon = categoryIcon(t.categoryIcon);
                return (
                  <Link key={t.href} href={t.href} className="card-flat block p-3.5 active:bg-muted/50">
                    <div className="flex items-start gap-3">
                      <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-muted">
                        <Icon className="size-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="truncate text-[15px] leading-tight font-black">{t.title}</h3>
                          <span className="inline-flex shrink-0 items-center gap-1 text-[10.5px] text-muted-foreground">
                            <Hourglass className="size-3" />
                            {timeAgoAr(t.updatedAt)}
                          </span>
                        </div>
                        <p className="mt-1 truncate text-[11.5px] text-muted-foreground">
                          {t.categoryName} · {t.counterpart}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <Badge tone="teal">{t.statusLabel}</Badge>
                          <Badge tone="muted" icon={CircleDollarSign}>
                            {t.metaNote}
                          </Badge>
                        </div>
                      </div>
                      <ArrowLeft className="mt-3 size-4 shrink-0 text-muted-foreground" />
                    </div>
                  </Link>
                );
              })}
            </div>

            <div className="grid gap-2">
              {isProvider ? (
                <>
                  <Link
                    href="/offers"
                    className="card-flat flex items-center gap-3 p-4 active:bg-muted/50"
                  >
                    <span className="grid size-9 place-items-center rounded-2xl bg-teal-soft text-teal">
                      <Send className="size-4.5" />
                    </span>
                    <div className="flex-1">
                      <div className="text-[13px] font-black">عروضي</div>
                      <div className="text-[11px] text-muted-foreground">إدارة كل عرض أرسلته</div>
                    </div>
                    <ArrowLeft className="size-4 text-muted-foreground" />
                  </Link>
                  <Link
                    href="/browse"
                    className="card-flat flex items-center gap-3 p-4 active:bg-muted/50"
                  >
                    <span className="grid size-9 place-items-center rounded-2xl bg-brand text-brand-ink">
                      <Briefcase className="size-4.5" />
                    </span>
                    <div className="flex-1">
                      <div className="text-[13px] font-black">طلبات جديدة</div>
                      <div className="text-[11px] text-muted-foreground">
                        افتح طلباً لتقرأ تفاصيله وتقدّم عرضاً
                      </div>
                    </div>
                    <ArrowLeft className="size-4 text-muted-foreground" />
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/requests"
                    className="card-flat flex items-center gap-3 p-4 active:bg-muted/50"
                  >
                    <span className="grid size-9 place-items-center rounded-2xl bg-teal-soft text-teal">
                      <ClipboardList className="size-4.5" />
                    </span>
                    <div className="flex-1">
                      <div className="text-[13px] font-black">طلباتي</div>
                      <div className="text-[11px] text-muted-foreground">تابع حالة كل طلب وعروضه</div>
                    </div>
                    <ArrowLeft className="size-4 text-muted-foreground" />
                  </Link>
                  <Link
                    href="/requests/new"
                    className="card-flat flex items-center gap-3 p-4 active:bg-muted/50"
                  >
                    <span className="grid size-9 place-items-center rounded-2xl bg-brand text-brand-ink">
                      <Send className="size-4.5" />
                    </span>
                    <div className="flex-1">
                      <div className="text-[13px] font-black">طلب جديد</div>
                      <div className="text-[11px] text-muted-foreground">انشر طلباً ليصلك أول عرض</div>
                    </div>
                    <ArrowLeft className="size-4 text-muted-foreground" />
                  </Link>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
