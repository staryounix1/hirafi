// ── لوحة التحكم: تتبدّل بحسب الدور — إحصاءات وإجراء تالٍ لكل طرف ─────────────
import { Link } from "wouter";
import {
  LayoutDashboard,
  ClipboardList,
  CircleDollarSign,
  CheckCircle2,
  Wallet,
  Search,
  Briefcase,
  Send,
  Plus,
  Star,
  Bell,
  UserCircle,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  EmptyState,
  ErrorState,
  ListSkeleton,
  PageHeader,
  StatCard,
  Spinner,
  Badge,
  VerifiedBadge,
} from "@/components/hirfi/primitives";
import { RequestCard } from "@/components/hirfi/cards";
import { trpc } from "@/_core/trpc";
import { useAuth } from "@/_core/useAuth";
import { useAppRole } from "@/lib/hooks";
import { errorMessage, formatMAD } from "@/lib/format";

export default function Dashboard() {
  const { role, isLoading: roleLoading } = useAppRole();

  if (roleLoading) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Spinner />
          جارٍ تحضير لوحتك…
        </div>
      </div>
    );
  }

  return role === "provider" ? <ProviderDashboard /> : <CustomerDashboard />;
}

// ── لوحة الزبون ─────────────────────────────────────────────────────────────
function CustomerDashboard() {
  const { user } = useAuth();
  const q = trpc.dashboard.customer.useQuery();

  if (q.isLoading) {
    return (
      <div className="grid gap-5">
        <div className="hirfi-skeleton h-16 rounded-xl" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="hirfi-skeleton h-28 rounded-xl" />
          ))}
        </div>
        <ListSkeleton count={3} />
      </div>
    );
  }

  if (q.isError) {
    return (
      <ErrorState
        message={errorMessage(q.error)}
        onRetry={() => void q.refetch()}
      />
    );
  }

  const c = q.data?.counts;
  const recent = q.data?.recent ?? [];
  const firstName = (user?.name ?? "").split(" ")[0];

  return (
    <div className="grid gap-6">
      <PageHeader
        icon={LayoutDashboard}
        title={firstName ? `أهلاً ${firstName} 👋` : "لوحة الزبون"}
        description="انشر طلبك، قارن عروض الحرّافين، وتابع التنفيذ حتى التقييم."
        action={
          <Button asChild className="gap-1.5">
            <Link href="/requests/new">
              <Plus className="size-4" />
              انشر طلباً جديداً
            </Link>
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={ClipboardList}
          label="كل طلباتي"
          value={c?.total ?? 0}
          hint="منذ إنشاء الحساب"
        />
        <StatCard
          icon={Send}
          label="طلبات منشورة"
          value={c?.open ?? 0}
          hint="تنتظر عروضاً"
          tone="warn"
        />
        <StatCard
          icon={CircleDollarSign}
          label="عروض تنتظر ردك"
          value={c?.pendingOffers ?? 0}
          hint={c?.pendingOffers ? "اقبل، ارفض، أو فاوض" : "لا عروض معلّقة"}
          tone="teal"
        />
        <StatCard
          icon={CheckCircle2}
          label="طلبات منتهية"
          value={c?.completed ?? 0}
          hint="جاهزة للتقييم"
          tone="success"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          href="/wallet"
          className="card-warm flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-brand/40"
        >
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-lg bg-teal-soft text-teal">
              <Wallet className="size-4.5" />
            </span>
            <div>
              <div className="text-sm font-semibold">رصيد المحفظة</div>
              <div className="text-xs text-muted-foreground">سجل مدفوعاتك الداخلية</div>
            </div>
          </div>
          <span className="font-display text-lg font-extrabold text-brand-dark">
            {formatMAD(c?.walletBalance ?? 0)}
          </span>
        </Link>
        <Link
          href="/notifications"
          className="card-warm flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-brand/40"
        >
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-lg bg-warn-soft text-warn">
              <Bell className="size-4.5" />
            </span>
            <div>
              <div className="text-sm font-semibold">الإشعارات</div>
              <div className="text-xs text-muted-foreground">عروض، قبول، رسائل</div>
            </div>
          </div>
          <span className="font-display text-lg font-extrabold">
            {c?.unread ?? 0}
            <span className="ms-1 text-xs font-medium text-muted-foreground">غير مقروء</span>
          </span>
        </Link>
      </div>

      <section className="grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <ClipboardList className="size-4.5 text-brand" />
            أحدث طلباتي
          </h2>
          {recent.length > 0 ? (
            <Button asChild variant="ghost" size="sm">
              <Link href="/requests">كل الطلبات</Link>
            </Button>
          ) : null}
        </div>

        {recent.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="لا طلبات بعد"
            description="انشر أول طلب لك: صف المشكلة أو الخدمة، حدّد ميزانيتك المقترحة وموقعك، وسيبدأ الحرّافون القريبون بتقديم عروضهم."
            actionLabel="انشر أول طلب"
            actionHref="/requests/new"
          />
        ) : (
          <div className="grid gap-3">
            {recent.map((r) => (
              <RequestCard key={r.id} request={r} href={`/requests/${r.id}`} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// ── لوحة الحرّاف ────────────────────────────────────────────────────────────
function ProviderDashboard() {
  const q = trpc.dashboard.provider.useQuery();

  if (q.isLoading) {
    return (
      <div className="grid gap-5">
        <div className="hirfi-skeleton h-16 rounded-xl" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="hirfi-skeleton h-28 rounded-xl" />
          ))}
        </div>
        <ListSkeleton count={3} />
      </div>
    );
  }

  if (q.isError) {
    return <ErrorState message={errorMessage(q.error)} onRetry={() => void q.refetch()} />;
  }

  const p = q.data?.profile;
  const c = q.data?.counts;
  const fresh = q.data?.fresh ?? [];
  const jobs = q.data?.jobs ?? [];
  const avg = p && p.ratingCount ? Math.round((p.ratingSum / p.ratingCount) * 10) / 10 : null;

  return (
    <div className="grid gap-6">
      <PageHeader
        icon={Briefcase}
        title={p ? `مرحباً ${p.displayName}` : "لوحة الحرّاف"}
        description="تصفّح الطلبات القريبة، قدّم عروضك، وتابع شغلك الحالي واستحقاقك."
        action={
          <Button asChild className="gap-1.5">
            <Link href="/browse">
              <Search className="size-4" />
              تصفّح الطلبات
            </Link>
          </Button>
        }
      />

      {p ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card px-4 py-3">
          <span className="grid size-10 place-items-center rounded-full bg-teal-soft font-display font-bold text-teal">
            {p.displayName.trim().charAt(0)}
          </span>
          <div className="me-auto">
            <div className="flex items-center gap-1.5">
              <b className="text-sm">{p.displayName}</b>
              {p.isVerified ? <VerifiedBadge /> : null}
            </div>
            <div className="text-xs text-muted-foreground">
              {p.city}
              {p.district ? ` — ${p.district}` : ""} · {p.yearsExperience} سنة خبرة
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="warn" icon={Star}>
              {avg !== null ? `${avg} من 5 (${p.ratingCount} تقييم)` : "بلا تقييم بعد"}
            </Badge>
            <Badge tone="success" icon={CheckCircle2}>
              {p.completedJobs} عمل منجز
            </Badge>
          </div>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Search}
          label="طلبات مفتوحة في مدينتك"
          value={c?.openNear ?? 0}
          hint="جاهزة لاستقبال عرضك"
        />
        <StatCard
          icon={Send}
          label="عروضي المعلّقة"
          value={c?.offersPending ?? 0}
          hint={`من ${c?.offersTotal ?? 0} عرض مرسل`}
          tone="warn"
        />
        <StatCard
          icon={Briefcase}
          label="أعمال جارية"
          value={c?.activeJobs ?? 0}
          hint="مقبولة أو قيد التنفيذ"
          tone="teal"
        />
        <StatCard
          icon={TrendingUp}
          label="إجمالي استحقاقي"
          value={formatMAD(c?.earnings ?? 0)}
          hint={`رصيد متاح: ${formatMAD(c?.walletBalance ?? 0)}`}
          tone="success"
        />
      </div>

      <section className="grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <Briefcase className="size-4.5 text-teal" />
            أعمالي المُسندة
          </h2>
          {jobs.length > 0 ? (
            <Button asChild variant="ghost" size="sm">
              <Link href="/offers">كل عروضي</Link>
            </Button>
          ) : null}
        </div>
        {jobs.length === 0 ? (
          <EmptyState
            icon={Briefcase}
            title="لا شغل مقبول بعد"
            description="عندما يقبل زبون عرضك سيظهر الطلب هنا مع حالة التنفيذ وأدوات المحادثة والتقييم."
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
      </section>

      <section className="grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <UserCircle className="size-4.5 text-brand" />
            طلبات جديدة في مدينتك
          </h2>
          {fresh.length > 0 ? (
            <Button asChild variant="ghost" size="sm">
              <Link href="/browse">تصفّح الكل</Link>
            </Button>
          ) : null}
        </div>
        {fresh.length === 0 ? (
          <EmptyState
            icon={Search}
            title="لا طلبات مفتوحة في مدينتك الآن"
            description="وسّع نطاق البحث إلى «بعيد» أو غيّر الفئة من صفحة التصفّح لترى طلبات مدن أخرى."
            actionLabel="افتح التصفّح"
            actionHref="/browse"
          />
        ) : (
          <div className="grid gap-3">
            {fresh.map((r) => (
              <RequestCard
                key={r.id}
                request={r}
                href={`/requests/${r.id}`}
                viewerCity={p?.city}
                viewerDistrict={p?.district}
                showDistance
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
