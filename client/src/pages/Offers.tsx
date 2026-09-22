// ── عروضي (الحرّاف): كل ما أرسلته + الأعمال التي أُسندت إليّ ──────────────────
import { useMemo, useState } from "react";
import { Link } from "wouter";
import {
  Send,
  Briefcase,
  Ban,
  CircleDollarSign,
  Clock,
  MapPin,
  Check,
  X,
  Hourglass,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Badge,
  EmptyState,
  ErrorState,
  ListSkeleton,
  PageHeader,
  Spinner,
} from "@/components/hirfi/primitives";
import { RequestCard } from "@/components/hirfi/cards";
import { trpc } from "@/_core/trpc";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import {
  categoryIcon,
  errorMessage,
  formatDuration,
  formatMAD,
  offerStatusMeta,
  requestStatusMeta,
  timeAgoAr,
} from "@/lib/format";

type Tab = "offers" | "jobs";

export default function Offers() {
  const [tab, setTab] = useState<Tab>("offers");
  const offerQ = trpc.offers.mine.useQuery();
  const jobsQ = trpc.offers.myJobs.useQuery();
  const utils = trpc.useUtils();
  const withdraw = trpc.offers.withdraw.useMutation();

  const counters = useMemo(
    () => (offerQ.data ?? []).filter((o) => o.status === "countered" && o.parentOfferId),
    [offerQ.data],
  );
  const parentIds = useMemo(() => new Set(counters.map((c) => c.parentOfferId)), [counters]);
  const statusCounts = useMemo(() => {
    const all = offerQ.data ?? [];
    return {
      total: all.length,
      pending: all.filter((o) => o.status === "pending").length,
      accepted: all.filter((o) => o.status === "accepted").length,
      rejected: all.filter((o) => o.status === "rejected").length,
    };
  }, [offerQ.data]);

  async function pull(offerId: string) {
    try {
      await withdraw.mutateAsync({ id: offerId });
      await utils.invalidate();
      toast.success("سُحب عرضك — يمكنك تقديم عرض جديد على الطلب نفسه");
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  const jobs = jobsQ.data ?? [];

  return (
    <div className="grid gap-5">
      <PageHeader
        icon={Send}
        title="عروضي"
        description="كل عرض أرسلته على طلب، وحالة كل عرض في دورة التفاوض: معلّق ← مقبول أو مرفوض، مع سحب العرض ما دام معلّقاً."
        action={
          <Button asChild className="gap-1.5">
            <Link href="/browse">
              <Briefcase className="size-4" />
              تصفّح طلبات جديدة
            </Link>
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-4">
        {[
          { label: "كل عروضي", value: statusCounts.total },
          { label: "معلّقة", value: statusCounts.pending },
          { label: "مقبولة", value: statusCounts.accepted },
          { label: "لم تُقبل", value: statusCounts.rejected },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card px-4 py-3">
            <div className="text-xs text-muted-foreground">{s.label}</div>
            <div className="mt-1 font-display text-xl font-extrabold">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        {(
          [
            { key: "offers", label: "العروض المرسلة", count: offerQ.data?.length ?? 0 },
            { key: "jobs", label: "شغلي المُسند", count: jobs.length },
          ] as const
        ).map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "border-brand bg-brand text-white"
                  : "border-border bg-card text-muted-foreground hover:border-brand/40 hover:text-foreground",
              )}
            >
              {t.label}
              <span
                className={cn(
                  "rounded-full px-1.5 text-[10px] font-bold",
                  active ? "bg-white/25" : "bg-muted",
                )}
              >
                {t.count}
              </span>
            </button>
          );
        })}
      </div>

      {tab === "offers" ? (
        offerQ.isLoading ? (
          <ListSkeleton count={4} />
        ) : offerQ.isError ? (
          <ErrorState message={errorMessage(offerQ.error)} onRetry={() => void offerQ.refetch()} />
        ) : (offerQ.data ?? []).length === 0 ? (
          <EmptyState
            icon={Send}
            title="لم ترسل أي عرض بعد"
            description="تصفّح الطلبات المنشورة في مدينتك، واقترح سعرك ومدتك ورسالة توضّح ما يشمله السعر."
            actionLabel="تصفّح الطلبات القريبة"
            actionHref="/browse"
          />
        ) : (
          <>
            {counters.length > 0 ? (
              <div className="flex items-start gap-2 rounded-xl border border-warn/30 bg-warn-soft/50 px-3.5 py-3">
                <Hourglass className="mt-0.5 size-4 shrink-0 text-warn" />
                <p className="text-sm text-warn">
                  لديك {counters.length} عرض مضاد من الزبائن ينتظر ردّك — افتح الطلب لتراجع السعر وتوافق أو ترفض.
                </p>
              </div>
            ) : null}

            <div className="grid gap-3">
              {(offerQ.data ?? []).map((o) => {
                const Icon = categoryIcon(o.categoryIcon);
                const sm = offerStatusMeta(o.status);
                const rs = requestStatusMeta(o.requestStatus);
                return (
                  <article
                    key={o.id}
                    className={cn(
                      "card-warm rounded-xl border bg-card p-4 sm:p-5",
                      o.status === "accepted" ? "border-success/40" : "border-border",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-brand/10 text-brand-dark">
                        <Icon className="size-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <Link href={`/requests/${o.requestId}`} className="min-w-0">
                            <h3 className="text-base leading-snug font-bold hover:text-brand-dark">
                              {o.requestTitle}
                            </h3>
                          </Link>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge tone={sm.tone} icon={sm.icon}>
                              {sm.label}
                            </Badge>
                            <Badge tone={rs.tone}>
                              الطلب: {rs.label.split(" — ")[0]}
                            </Badge>
                          </div>
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <Icon className="size-3.5" />
                            {o.categoryName}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="size-3.5" />
                            {o.city} — {o.district}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            ميزانية الزبون: {formatMAD(o.budgetAmount)}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Clock className="size-3.5" />
                            {timeAgoAr(o.createdAt)}
                          </span>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg bg-muted/50 px-3 py-2.5">
                          <span className="inline-flex items-center gap-1.5">
                            <CircleDollarSign className="size-4 text-brand" />
                            <b className="font-display text-base font-extrabold">
                              {formatMAD(o.price)}
                            </b>
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDuration(o.durationMinutes)}
                          </span>
                          <span className="text-xs text-muted-foreground">· {o.customerName}</span>
                        </div>

                        {o.status === "countered" && parentIds.has(o.id) ? (
                          <p className="mt-2 text-xs text-muted-foreground">
                            عرضك الأصلي قيد التفاوض — راجع العرض المضاد في شاشة الطلب.
                          </p>
                        ) : null}

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <Button asChild size="sm" variant="outline" className="gap-1.5">
                            <Link href={`/requests/${o.requestId}`}>افتح الطلب</Link>
                          </Button>
                          {o.status === "pending" ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="gap-1.5 text-muted-foreground"
                              disabled={withdraw.isPending}
                              onClick={() => void pull(o.id)}
                            >
                              {withdraw.isPending ? <Spinner /> : <Ban className="size-3.5" />}
                              اسحب العرض
                            </Button>
                          ) : null}
                          {o.status === "countered" ? (
                            <Button asChild size="sm" className="gap-1.5">
                              <Link href={`/requests/${o.requestId}`}>
                                <Hourglass className="size-3.5" />
                                رُدّ على العرض المضاد
                              </Link>
                            </Button>
                          ) : null}
                          {o.status === "accepted" ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-success">
                              <Check className="size-3.5" />
                              أُسند إليك
                            </span>
                          ) : null}
                          {o.status === "rejected" ? (
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                              <X className="size-3.5" />
                              اختار الزبون عرضاً آخر
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )
      ) : jobsQ.isLoading ? (
        <ListSkeleton count={3} />
      ) : jobsQ.isError ? (
        <ErrorState message={errorMessage(jobsQ.error)} onRetry={() => void jobsQ.refetch()} />
      ) : jobs.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="لا عمل مُسند إليك بعد"
          description="عندما يقبل زبون عرضك يظهر الطلب هنا مع حالة التنفيذ والمحادثة والتقييم."
          actionLabel="تصفّح الطلبات القريبة"
          actionHref="/browse"
        />
      ) : (
        <div className="grid gap-3">
          {jobs.map((r) => (
            <RequestCard key={r.id} request={r} href={`/requests/${r.id}`} />
          ))}
        </div>
      )}
    </div>
  );
}
