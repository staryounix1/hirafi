// ── الإحصائيات: نمو، مداخيل، أفضل الحرّافين، قمع التحويل ───────────────────────
import { useState } from "react";
import { LineChart, TrendingUp, Coins, Users, Target, Award, RefreshCw } from "lucide-react";
import { AdminShell, MetricCard } from "@/components/hirfi/admin-shell";
import { TableSkeleton } from "@/components/hirfi/admin-skeleton";
import { ErrorState, EmptyState, Badge } from "@/components/hirfi/primitives";
import { Button } from "@/components/ui/button";
import { trpc } from "@/_core/trpc";
import { errorMessage, madNumber } from "@/lib/format";

const KIND_LABEL: Record<string, string> = {
  field: "ميدانية",
  digital: "مهام إنترنت",
  b2b: "شركات",
  none: "ما اختارش",
};

export default function AdminAnalytics() {
  const q = trpc.admin.overview.analytics.useQuery();

  return (
    <AdminShell
      section="analytics"
      title="الإحصائيات"
      description="نمو التطبيق، المداخيل، أداء الحرّافين، وقمع تحويل الطلبات — آخر 30 يوماً."
      action={
        <Button variant="secondary" className="gap-1.5 rounded-xl" onClick={() => q.refetch()}>
          <RefreshCw className="size-4" /> تحديث
        </Button>
      }
    >
      {q.isLoading ? (
        <TableSkeleton rows={8} />
      ) : q.error ? (
        <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />
      ) : !q.data ? (
        <EmptyState icon={LineChart} title="لا بيانات" description="ما رجع حتى معطيات من الخادم." />
      ) : (
        <AnalyticsBody data={q.data} />
      )}
    </AdminShell>
  );
}

type Analytics = {
  daily: { day: string; requests: number; signups: number; completed: number; commission: number; topups: number }[];
  topProviders: {
    userId: string;
    name: string | null;
    city: string | null;
    primaryKind: string | null;
    completedJobs: number;
    ratingSum: number | null;
    ratingCount: number | null;
    isVerified: boolean;
    balance: number;
  }[];
  funnel: { requests: number; withOffers: number; accepted: number; completed: number; cancelled: number };
  totals: {
    commissionTotal: number;
    refundedTotal: number;
    topupsTotal: number;
    walletBalances: number;
    gmv: number;
    avgAgreed: number;
    avgOffersPerRequest: number;
    reportsOpen: number;
    disputesResolved: number;
  };
  byKind: { kind: string; count: number }[];
};

function AnalyticsBody({ data }: { data: Analytics }) {
  const [series, setSeries] = useState<"requests" | "signups" | "commission" | "completed">("requests");
  const { daily, topProviders, funnel, totals, byKind } = data;

  const sum = (k: keyof (typeof daily)[number]) => daily.reduce((a, d) => a + (d[k] as number), 0);
  const req30 = sum("requests");
  const sign30 = sum("signups");
  const comm30 = sum("commission");
  const comp30 = sum("completed");

  return (
    <div className="grid gap-5">
      {/* مؤشرات رئيسية */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricCard label="طلبات (30 يوم)" value={req30} tone="brand" hint={`${daily.at(-1)?.requests ?? 0} اليوم`} />
        <MetricCard label="تسجيلات (30 يوم)" value={sign30} tone="success" hint={`${daily.at(-1)?.signups ?? 0} اليوم`} />
        <MetricCard label="عمولات محصّلة" value={`${madNumber(comm30)} د`} tone="warn" hint="آخر 30 يوم" />
        <MetricCard label="أعمال منتهية" value={comp30} tone="brand" hint="آخر 30 يوم" />
      </div>

      {/* الرسم الزمني */}
      <section className="rounded-2xl border border-border bg-card p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="size-4 text-muted-foreground" />
            <h2 className="text-[13px] font-black">الاتجاه — 30 يوماً</h2>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                { k: "requests", l: "طلبات" },
                { k: "signups", l: "تسجيلات" },
                { k: "completed", l: "منتهية" },
                { k: "commission", l: "عمولات" },
              ] as const
            ).map((o) => (
              <button
                key={o.k}
                type="button"
                onClick={() => setSeries(o.k)}
                className={
                  "rounded-full px-3 py-1 text-[11.5px] font-bold transition-colors " +
                  (series === o.k ? "bg-brand text-brand-ink" : "bg-muted text-muted-foreground")
                }
              >
                {o.l}
              </button>
            ))}
          </div>
        </div>
        <AreaChart points={daily.map((d) => ({ label: d.day.slice(5), value: d[series] as number }))} />
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* قمع التحويل */}
        <section className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center gap-2">
            <Target className="size-4 text-muted-foreground" />
            <h2 className="text-[13px] font-black">قمع التحويل</h2>
          </div>
          <Funnel funnel={funnel} />
        </section>

        {/* صحة المالية */}
        <section className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center gap-2">
            <Coins className="size-4 text-muted-foreground" />
            <h2 className="text-[13px] font-black">المالية</h2>
          </div>
          <ul className="grid gap-2.5">
            <MoneyRow label="إجمالي قيمة الاتفاقات (GMV)" value={totals.gmv} strong />
            <MoneyRow label="متوسط قيمة الاتفاق" value={totals.avgAgreed} />
            <MoneyRow label="إجمالي العمولات المحصّلة" value={totals.commissionTotal} />
            <MoneyRow label="إجمالي المشحون للحرّافين" value={totals.topupsTotal} />
            <MoneyRow label="أرصدة المحافظ الحالية" value={totals.walletBalances} />
            <MoneyRow label="مُرجَع بعد النزاعات" value={totals.refundedTotal} tone="teal" />
            <li className="flex items-center justify-between border-t border-border pt-2.5 text-[12.5px]">
              <span className="text-muted-foreground">متوسط العروض لكل طلب</span>
              <span className="font-black">{totals.avgOffersPerRequest}</span>
            </li>
            <li className="flex items-center justify-between text-[12.5px]">
              <span className="text-muted-foreground">نزاعات مفتوحة / محسومة</span>
              <span className="font-black">
                {totals.reportsOpen} / {totals.disputesResolved}
              </span>
            </li>
          </ul>
        </section>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* توزيع المهنة */}
        <section className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center gap-2">
            <Users className="size-4 text-muted-foreground" />
            <h2 className="text-[13px] font-black">توزيع الحرّافين حسب المهنة</h2>
          </div>
          {byKind.length === 0 ? (
            <p className="py-6 text-center text-[12.5px] text-muted-foreground">لا حرّافين.</p>
          ) : (
            <ul className="grid gap-2.5">
              {byKind
                .slice()
                .sort((a, b) => b.count - a.count)
                .map((k) => {
                  const total = byKind.reduce((a, x) => a + x.count, 0);
                  const pct = Math.round((k.count / Math.max(1, total)) * 100);
                  return (
                    <li key={k.kind}>
                      <div className="mb-1 flex items-center justify-between text-[12px]">
                        <span className="font-bold">{KIND_LABEL[k.kind] ?? k.kind}</span>
                        <span className="text-muted-foreground">
                          {k.count} · {pct}%
                        </span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
                      </div>
                    </li>
                  );
                })}
            </ul>
          )}
        </section>

        {/* أفضل الحرّافين */}
        <section className="rounded-2xl border border-border bg-card p-4 lg:col-span-2">
          <div className="mb-3 flex items-center gap-2">
            <Award className="size-4 text-muted-foreground" />
            <h2 className="text-[13px] font-black">أفضل الحرّافين</h2>
          </div>
          {topProviders.length === 0 ? (
            <p className="py-6 text-center text-[12.5px] text-muted-foreground">لا حرّافين.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-start">
                <thead>
                  <tr className="text-[11px] text-muted-foreground">
                    <th className="pb-2 text-start font-bold">الحرّاف</th>
                    <th className="pb-2 text-start font-bold">المهنة</th>
                    <th className="pb-2 text-start font-bold">أعمال منتهية</th>
                    <th className="pb-2 text-start font-bold">التقييم</th>
                    <th className="pb-2 text-start font-bold">الرصيد</th>
                  </tr>
                </thead>
                <tbody>
                  {topProviders.map((p) => {
                    const avg = p.ratingCount && p.ratingSum != null ? p.ratingSum / p.ratingCount : null;
                    return (
                      <tr key={p.userId} className="border-t border-border text-[12.5px]">
                        <td className="py-2">
                          <span className="font-bold">{p.name ?? "—"}</span>
                          <span className="block text-[11px] text-muted-foreground">
                            {p.city ?? "—"}
                            {p.isVerified ? " · موثّق" : ""}
                          </span>
                        </td>
                        <td className="py-2">
                          {p.primaryKind ? (
                            <Badge tone="brand">{KIND_LABEL[p.primaryKind] ?? p.primaryKind}</Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="py-2 font-black">{p.completedJobs}</td>
                        <td className="py-2">
                          {avg !== null ? (
                            <Badge tone={avg >= 4 ? "success" : avg >= 3 ? "warn" : "danger"}>
                              {avg.toFixed(1)} ({p.ratingCount})
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className={"py-2 font-bold " + (p.balance < 0 ? "text-destructive" : "")}>
                          {madNumber(p.balance)} د
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function MoneyRow({
  label,
  value,
  strong,
  tone,
}: {
  label: string;
  value: number;
  strong?: boolean;
  tone?: "teal";
}) {
  return (
    <li className="flex items-center justify-between text-[12.5px]">
      <span className="text-muted-foreground">{label}</span>
      <span className={"font-black " + (strong ? "text-[14px] " : "") + (tone === "teal" ? "text-teal" : "")}>
        {madNumber(value)} درهم
      </span>
    </li>
  );
}

function Funnel({ funnel }: { funnel: Analytics["funnel"] }) {
  const steps = [
    { label: "طلبات منشورة", value: funnel.requests, tone: "bg-brand" },
    { label: "عليها عرض واحد على الأقل", value: funnel.withOffers, tone: "bg-brand/80" },
    { label: "مقبولة / قيد التنفيذ / منتهية", value: funnel.accepted, tone: "bg-brand/60" },
    { label: "منتهية بنجاح", value: funnel.completed, tone: "bg-success" },
  ];
  const max = Math.max(1, funnel.requests);
  return (
    <ul className="grid gap-3">
      {steps.map((s) => {
        const pct = Math.round((s.value / max) * 100);
        return (
          <li key={s.label}>
            <div className="mb-1 flex items-center justify-between text-[12px]">
              <span className="font-bold">{s.label}</span>
              <span className="text-muted-foreground">
                {s.value} · {pct}%
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-muted">
              <div className={"h-full rounded-full " + s.tone} style={{ width: `${Math.max(2, pct)}%` }} />
            </div>
          </li>
        );
      })}
      {funnel.cancelled > 0 ? (
        <li className="flex items-center justify-between text-[12px] text-muted-foreground">
          <span>طلبات ملغاة</span>
          <span className="font-bold">{funnel.cancelled}</span>
        </li>
      ) : null}
    </ul>
  );
}

/** رسم مساحي بسيط بـ SVG — بلا أي مكتبة خارجية. */
function AreaChart({ points }: { points: { label: string; value: number }[] }) {
  if (points.length === 0) {
    return <p className="py-6 text-center text-[12.5px] text-muted-foreground">لا بيانات.</p>;
  }
  const W = 720;
  const H = 160;
  const PAD = 6;
  const max = Math.max(1, ...points.map((p) => p.value));
  const n = points.length;
  const x = (i: number) => PAD + (i * (W - PAD * 2)) / Math.max(1, n - 1);
  const y = (v: number) => H - PAD - (v / max) * (H - PAD * 2);

  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  const area = `${line} L${x(n - 1).toFixed(1)},${H - PAD} L${x(0).toFixed(1)},${H - PAD} Z`;

  return (
    <div className="w-full overflow-hidden">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-40 w-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--brand)" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#areaFill)" />
        <path d={line} fill="none" stroke="var(--brand)" strokeWidth={2.5} vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="mt-1 flex justify-between text-[9.5px] text-muted-foreground">
        <span>{points[0]?.label}</span>
        <span>{points[Math.floor(n / 2)]?.label}</span>
        <span>{points.at(-1)?.label}</span>
      </div>
    </div>
  );
}
