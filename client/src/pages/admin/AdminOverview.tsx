// ── نظرة عامة: أرقام المنصّة + طوابير العمل التي تحتاج تدخّلاً ────────────────
import {
  Briefcase,
  Wallet,
  TrendingUp,
  UserCheck,
  Inbox,
  Clock,
  ShieldAlert,
} from "lucide-react";
import { AdminShell, MetricCard, DataTable, Tr, Td } from "@/components/hirfi/admin-shell";
import { ErrorState, EmptyState, Badge } from "@/components/hirfi/primitives";
import { TableSkeleton } from "@/components/hirfi/admin-skeleton";
import { trpc } from "@/_core/trpc";
import { formatMAD, timeAgoAr, errorMessage } from "@/lib/format";

export default function AdminOverview() {
  const statsQ = trpc.admin.overview.stats.useQuery();
  const queuesQ = trpc.admin.overview.queues.useQuery();

  return (
    <AdminShell
      section="overview"
      title="نظرة عامة"
      description="صورة لحظية لحركة المنصّة، وطوابير تحتاج قراراً إدارياً: توثيق، متأخرات محفظة، وطلبات بلا عروض."
    >
      {statsQ.isLoading ? (
        <TableSkeleton rows={4} />
      ) : statsQ.error ? (
        <ErrorState message={errorMessage(statsQ.error)} onRetry={() => statsQ.refetch()} />
      ) : statsQ.data ? (
        <OverviewBody stats={statsQ.data} />
      ) : null}

      {queuesQ.isLoading ? (
        <div className="mt-6">
          <TableSkeleton rows={3} />
        </div>
      ) : queuesQ.data ? (
        <Queues queues={queuesQ.data} />
      ) : null}
    </AdminShell>
  );
}

type Stats = {
  counts: {
    usersTotal: number;
    customers: number;
    providers: number;
    blocked: number;
    verified: number;
    requestsTotal: number;
    requestsOpen: number;
    requestsActive: number;
    requestsCompleted: number;
    requestsCancelled: number;
    offersTotal: number;
    offersPending: number;
    offersAccepted: number;
    offersRejected: number;
    reviewsTotal: number;
    messagesTotal: number;
    commissionCollected: number;
    topupsTotal: number;
    walletsOwing: number;
    walletsNegativeSum: number;
    requestsNoOffers: number;
    providersUnverified: number;
  };
  daily: { day: string; count: number }[];
  byCategory: { name: string; icon: string; count: number }[];
};

function OverviewBody({ stats }: { stats: Stats }) {
  const c = stats.counts;
  const maxDay = Math.max(1, ...stats.daily.map((d) => d.count));

  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricCard label="المستخدمون" value={c.usersTotal} hint={`${c.customers} زبون · ${c.providers} حرّاف`} />
        <MetricCard label="الطلبات" value={c.requestsTotal} hint={`${c.requestsOpen} منشور · ${c.requestsCancelled} ملغى`} />
        <MetricCard label="العروض" value={c.offersTotal} hint={`${c.offersPending} معلّق · ${c.offersAccepted} مقبول`} />
        <MetricCard
          label="عمولة المنصّة"
          value={formatMAD(c.commissionCollected)}
          hint={`شحن إجمالي ${formatMAD(c.topupsTotal)}`}
          tone="success"
        />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricCard
          label="أرصدة سالبة"
          value={c.walletsOwing}
          hint={`مجموع ${formatMAD(c.walletsNegativeSum)}`}
          tone="danger"
        />
        <MetricCard label="طلبات بلا عروض" value={c.requestsNoOffers} hint="منشورة ولم يلمسها حرّاف" tone="warn" />
        <MetricCard label="حرّافون غير موثّقين" value={c.providersUnverified} hint="بانتظار مراجعة الملف" tone="warn" />
        <MetricCard label="مستخدمون موقوفون" value={c.blocked} hint={`${c.requestsCompleted} طلب منتهٍ`} tone="danger" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {/* طلبات آخر 14 يوماً */}
        <section className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center gap-2">
            <TrendingUp className="size-4 text-muted-foreground" />
            <h2 className="text-[13px] font-black">طلبات آخر 14 يوماً</h2>
          </div>
          {stats.daily.length === 0 ? (
            <p className="py-6 text-center text-[12.5px] text-muted-foreground">لا طلبات في هذه الفترة.</p>
          ) : (
            <div className="flex h-32 items-end gap-1.5">
              {stats.daily.map((d) => (
                <div key={d.day} className="group flex flex-1 flex-col items-center gap-1">
                  <span className="text-[10px] font-bold text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                    {d.count}
                  </span>
                  <div
                    className="w-full rounded-t-md bg-brand"
                    style={{ height: `${Math.max(6, (d.count / maxDay) * 96)}px` }}
                    title={`${d.day}: ${d.count}`}
                  />
                  <span className="text-[9px] text-muted-foreground">{d.day.slice(8)}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* التوزيع حسب الفئة */}
        <section className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center gap-2">
            <Briefcase className="size-4 text-muted-foreground" />
            <h2 className="text-[13px] font-black">الطلبات حسب الفئة</h2>
          </div>
          {stats.byCategory.length === 0 ? (
            <p className="py-6 text-center text-[12.5px] text-muted-foreground">لا تصنيفات.</p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {stats.byCategory.map((c2) => {
                const pct = Math.round((c2.count / Math.max(1, stats.byCategory[0].count)) * 100);
                return (
                  <li key={c2.name} className="flex items-center gap-3">
                    <span className="w-24 shrink-0 truncate text-[12px] font-bold">{c2.name}</span>
                    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-8 text-end text-[12px] font-bold text-muted-foreground">{c2.count}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

type Queues = {
  owing: { userId: string; email: string; displayName: string | null; balance: number; lastAt: string | null }[];
  noOffers: { id: string; title: string; city: string; createdAt: Date | string; customerName: string | null }[];
  unverified: {
    userId: string;
    displayName: string | null;
    city: string | null;
    completedJobs: number;
    ratingSum: number;
    ratingCount: number;
  }[];
  staleOffers: {
    id: string;
    requestId: string;
    requestTitle: string;
    price: number;
    createdAt: Date | string;
    providerName: string | null;
  }[];
};

function Queues({ queues }: { queues: Queues }) {
  const empty =
    queues.owing.length === 0 &&
    queues.noOffers.length === 0 &&
    queues.unverified.length === 0 &&
    queues.staleOffers.length === 0;

  if (empty) {
    return (
      <div className="mt-6">
        <EmptyState
          icon={UserCheck}
          title="لا طوابير معلّقة"
          description="لا متأخرات، ولا حرّافين بانتظار التوثيق، ولا طلبات مهجورة. عمل نظيف."
        />
      </div>
    );
  }

  return (
    <div className="mt-6 flex flex-col gap-5">
      <h2 className="text-[15px] font-black">طوابير العمل</h2>

      {queues.owing.length > 0 ? (
        <QueueBlock
          icon={Wallet}
          tone="danger"
          title="حرّافون بأرصدة سالبة"
          hint="العمولة المستحقة تتجاوز رصيدهم — لا يستطيعون تقديم عروض حتى الشحن."
        >
          <DataTable columns={["الحرّاف", "البريد", "الرصيد", "آخر حركة"]}>
            {queues.owing.map((w) => (
              <Tr key={w.userId}>
                <Td className="font-bold">{w.displayName ?? "—"}</Td>
                <Td className="text-muted-foreground">{w.email}</Td>
                <Td>
                  <span className="font-black text-destructive">{formatMAD(w.balance)}</span>
                </Td>
                <Td className="text-muted-foreground">{w.lastAt ? timeAgoAr(w.lastAt) : "—"}</Td>
              </Tr>
            ))}
          </DataTable>
        </QueueBlock>
      ) : null}

      {queues.unverified.length > 0 ? (
        <QueueBlock
          icon={UserCheck}
          tone="warn"
          title="حرّافون بانتظار التوثيق"
          hint="راجع ملفاتهم ثم وثّقهم من قسم المستخدمين."
        >
          <DataTable columns={["الحرّاف", "المدينة", "أعمال منتهية", "متوسط التقييم"]}>
            {queues.unverified.map((u) => (
              <Tr key={u.userId}>
                <Td className="font-bold">{u.displayName ?? "—"}</Td>
                <Td className="text-muted-foreground">{u.city ?? "—"}</Td>
                <Td>{u.completedJobs}</Td>
                <Td className="text-muted-foreground">
                  {u.ratingCount ? (u.ratingSum / u.ratingCount).toFixed(1) : "—"}
                </Td>
              </Tr>
            ))}
          </DataTable>
        </QueueBlock>
      ) : null}

      {queues.noOffers.length > 0 ? (
        <QueueBlock
          icon={Inbox}
          tone="warn"
          title="طلبات بلا عروض"
          hint="منشورة ولم يتقدّم لها أحد — قد تحتاج توسيع النطاق أو مساعدة."
        >
          <DataTable columns={["الطلب", "الزبون", "المدينة", "منذ"]}>
            {queues.noOffers.map((r) => (
              <Tr key={r.id}>
                <Td className="font-bold">{r.title}</Td>
                <Td className="text-muted-foreground">{r.customerName ?? "—"}</Td>
                <Td>{r.city}</Td>
                <Td className="text-muted-foreground">{timeAgoAr(r.createdAt)}</Td>
              </Tr>
            ))}
          </DataTable>
        </QueueBlock>
      ) : null}

      {queues.staleOffers.length > 0 ? (
        <QueueBlock
          icon={Clock}
          tone="warn"
          title="عروض معلّقة منذ 3 أيام"
          hint="لم يردّ عليها الزبون — يمكن سحبها إدارياً لتحريك الطلب."
        >
          <DataTable columns={["العرض", "الطلب", "الحرّاف", "المبلغ", "منذ"]}>
            {queues.staleOffers.map((o) => (
              <Tr key={o.id}>
                <Td className="font-mono text-[11px] text-muted-foreground">{o.id.slice(0, 8)}</Td>
                <Td className="font-bold">{o.requestTitle}</Td>
                <Td>{o.providerName ?? "—"}</Td>
                <Td className="font-black">{formatMAD(o.price)}</Td>
                <Td className="text-muted-foreground">{timeAgoAr(o.createdAt)}</Td>
              </Tr>
            ))}
          </DataTable>
        </QueueBlock>
      ) : null}
    </div>
  );
}

function QueueBlock({
  icon: Icon,
  tone,
  title,
  hint,
  children,
}: {
  icon: typeof Wallet;
  tone: "danger" | "warn";
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-2 flex items-center gap-2">
        <span
          className={
            tone === "danger"
              ? "grid size-7 place-items-center rounded-full bg-destructive/12 text-destructive"
              : "grid size-7 place-items-center rounded-full bg-warn-soft text-warn"
          }
        >
          <Icon className="size-4" />
        </span>
        <h3 className="text-[14px] font-black">{title}</h3>
        <Badge tone={tone === "danger" ? "danger" : "warn"}>
          <ShieldAlert className="size-3" /> يحتاج إجراءً
        </Badge>
      </div>
      <p className="mb-2 text-[12px] text-muted-foreground">{hint}</p>
      {children}
    </section>
  );
}

