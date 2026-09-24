// ── عروضي (الحرّاف): كل ما أرسلته + الأعمال التي أُسندت إليّ ─────────────────────────
import { useMemo, useState } from "react";
import { Link } from "wouter";
import {
  Send,
  Briefcase,
  Ban,
  Clock,
  MapPin,
  Check,
  X,
  Hourglass,
  CircleDollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Badge,
  Chip,
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
  madNumber,
  offerStatusMeta,
  requestStatusMeta,
  timeAgoAr,
  countAr,
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
    <div className="grid">
      <PageHeader
        icon={Send}
        title="عروضي"
        description="كل عرض أرسلته على طلب، وحالة كل عرض في دورة التفاوض: معلّق ← مقبول أو مرفوض، مع سحب العرض ما دام معلّقاً."
        action={
          <Button asChild size="sm" className="gap-1.5 rounded-full">
            <Link href="/browse">
              <Briefcase className="size-3.5" />
              طلبات جديدة
            </Link>
          </Button>
        }
      />

      {/* أرقام العروض */}
      <div className="grid grid-cols-4 gap-2 px-4 pt-4">
        {[
          { label: "كل عروضي", value: statusCounts.total },
          { label: "معلّقة", value: statusCounts.pending },
          { label: "مقبولة", value: statusCounts.accepted },
          { label: "لم تُقبل", value: statusCounts.rejected },
        ].map((s) => (
          <div key={s.label} className="card-flat px-1.5 py-2.5 text-center">
            <div className="text-price text-[19px] leading-none">{s.value}</div>
            <div className="mt-1 text-[10px] leading-tight font-bold text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="scrollbar-none mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
        {(
          [
            { key: "offers", label: "العروض المرسلة", count: offerQ.data?.length ?? 0 },
            { key: "jobs", label: "شغلي المُسند", count: jobs.length },
          ] as const
        ).map((t) => {
          const active = tab === t.key;
          return (
            <Chip key={t.key} active={active} onClick={() => setTab(t.key)}>
              {t.label}
              <span
                className={cn(
                  "rounded-full px-1.5 text-[10px] font-black",
                  active ? "bg-background/25" : "bg-background",
                )}
              >
                {t.count}
              </span>
            </Chip>
          );
        })}
      </div>

      <div className="grid gap-3 px-4 pt-3 pb-6">
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
                <div className="flex items-start gap-2 rounded-3xl bg-warn-soft px-3.5 py-3">
                  <Hourglass className="mt-0.5 size-4 shrink-0 text-warn" />
                  <p className="text-[12.5px] leading-relaxed font-bold text-warn">
                    لديك {countAr(counters.length, ["عرض مضاد", "عرضان مضادان", "عروض مضادة"], "عرضاً مضاداً")} من الزبائن، في انتظار ردّك — افتح الطلب لتراجع السعر وتوافق أو ترفض.
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
                        "card-flat p-4",
                        o.status === "accepted" && "ring-1 ring-success/40",
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-muted">
                          <Icon className="size-5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <Link href={`/requests/${o.requestId}`} className="block">
                            <h3 className="truncate text-[15px] leading-tight font-black">
                              {o.requestTitle}
                            </h3>
                          </Link>
                          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="size-3" />
                              {o.city} — {o.district}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Clock className="size-3" />
                              {timeAgoAr(o.createdAt)}
                            </span>
                          </p>
                        </div>
                        <Badge tone={sm.tone}>{sm.label}</Badge>
                      </div>

                      {/* السعر — العنصر الأبرز في البطاقة */}
                      <div className="mt-3 flex items-end justify-between gap-2 rounded-2xl bg-muted/70 px-3 py-2.5">
                        <div>
                          <div className="text-[10.5px] font-bold text-muted-foreground">عرضي</div>
                          <div className="text-price mt-0.5 flex items-baseline gap-1 text-[23px] leading-none">
                            {madNumber(o.price)}
                            <span className="text-[11px] font-bold text-muted-foreground">درهم</span>
                          </div>
                        </div>
                        <div className="text-end text-[11px] leading-snug text-muted-foreground">
                          <div className="inline-flex items-center gap-1">
                            <CircleDollarSign className="size-3" />
                            {o.budgetAmount > 0 ? `ميزانية الزبون ${formatMAD(o.budgetAmount)}` : "الزبون بلا ميزانية مسبقة"}
                          </div>
                          <div>{formatDuration(o.durationMinutes)}</div>
                          <div>{o.customerName}</div>
                        </div>
                      </div>

                      <div className="mt-2.5 flex flex-wrap items-center gap-2">
                        <Badge tone={rs.tone}>الطلب: {rs.label.split(" — ")[0]}</Badge>
                        {o.status === "countered" && parentIds.has(o.id) ? (
                          <span className="text-[11px] text-muted-foreground">
                            عرضك الأصلي قيد التفاوض
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <Button asChild size="sm" variant="outline" className="gap-1.5 rounded-full">
                          <Link href={`/requests/${o.requestId}`}>افتح الطلب</Link>
                        </Button>
                        {o.status === "pending" ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="gap-1.5 rounded-full text-muted-foreground"
                            disabled={withdraw.isPending}
                            onClick={() => void pull(o.id)}
                          >
                            {withdraw.isPending ? <Spinner /> : <Ban className="size-3.5" />}
                            اسحب العرض
                          </Button>
                        ) : null}
                        {o.status === "countered" ? (
                          <Button asChild size="sm" className="gap-1.5 rounded-full">
                            <Link href={`/requests/${o.requestId}`}>
                              <Hourglass className="size-3.5" />
                              رُدّ على العرض المضاد
                            </Link>
                          </Button>
                        ) : null}
                        {o.status === "accepted" ? (
                          <span className="inline-flex items-center gap-1 text-[12px] font-black text-success">
                            <Check className="size-3.5" />
                            أُسند إليك
                          </span>
                        ) : null}
                        {o.status === "rejected" ? (
                          <span className="inline-flex items-center gap-1 text-[12px] text-muted-foreground">
                            <X className="size-3.5" />
                            اختار الزبون عرضاً آخر
                          </span>
                        ) : null}
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
    </div>
  );
}
