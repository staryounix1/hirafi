// ── لوحة التحكم: خريطة + شريحة سفلية عائمة — اللوحة تتبدّل بحسب الدور ───────────────
// الشكل مقصود ليطابق شاشة inDrive الرئيسية: الطلب النشط أو الطلبات القريبة على الخريطة،
// ثم شريحة بيضاء تحمل الحالة والإجراء التالي. الأرقام ضخمة والزرّ الحبّة واحد واضح.
import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Link } from "wouter";
import {
  CircleDollarSign,
  Wallet,
  Search,
  Briefcase,
  Send,
  Plus,
  Star,
  Bell,
  Hourglass,
  ArrowLeft,
  KeyRound,
  ListChecks,
  ShoppingBag,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DragHandle, MapCanvas, type MapPinSpec } from "@/components/hirfi/map";
import {
  Badge,
  EmptyState,
  ErrorState,
  LiveDot,
  ListSkeleton,
  Spinner,
  VerifiedBadge,
} from "@/components/hirfi/primitives";
import { RequestCard, type RequestCardData } from "@/components/hirfi/cards";
import { trpc } from "@/_core/trpc";
import { useAuth } from "@/_core/useAuth";
import { useAppRole } from "@/lib/hooks";
import { countAr, errorMessage, formatMAD, madNumber, requestStatusMeta } from "@/lib/format";

/** مواضع ثابتة للدبابيس — ثابتة كي لا ترتجف الخريطة في كل تصيير. */
const PIN_SPOTS = [
  { x: 30, y: 70 },
  { x: 53, y: 52 },
  { x: 74, y: 35 },
  { x: 41, y: 25 },
  { x: 66, y: 63 },
];
const ME_PIN: MapPinSpec = { id: "me", x: 22, y: 82, kind: "me" };

const SERVICE_MODES = [
  { slug: "handyman", title: "حِرفة قريبة", description: "حرفي يجي لعندك", icon: Wrench },
  { slug: "grocery", title: "قضاء الأغراض", description: "شراء وتوصيل", icon: ShoppingBag },
  { slug: "queue", title: "الوقوف فالطابور", description: "نقضي الإجراء بلا بيك", icon: ListChecks },
  { slug: "rental", title: "الكراء", description: "أداة أو معدة", icon: KeyRound },
];

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

// ── لوحة الزبون ──────────────────────────────────────────────────────────────────
function CustomerDashboard() {
  const { user } = useAuth();
  const q = trpc.dashboard.customer.useQuery();
  const [sheetOpen, setSheetOpen] = useState(true);
  const sheetStartY = useRef<number | null>(null);

  if (q.isLoading) {
    return (
      <div className="grid">
        <div className="hirfi-skeleton h-[34svh]" />
        <div className="grid gap-3 px-4 py-5">
          <div className="hirfi-skeleton h-24 rounded-3xl" />
          <ListSkeleton count={2} />
        </div>
      </div>
    );
  }

  if (q.isError) {
    return (
      <div className="p-4">
        <ErrorState message={errorMessage(q.error)} onRetry={() => void q.refetch()} />
      </div>
    );
  }

  const c = q.data?.counts;
  const recent = (q.data?.recent ?? []) as RequestCardData[];
  const active = recent.find((r) => r.status !== "completed" && r.status !== "cancelled");
  const firstName = (user?.name ?? "").split(" ")[0];

  const pins: MapPinSpec[] = [
    ME_PIN,
    ...recent
      .filter((r) => r.status === "open")
      .slice(0, PIN_SPOTS.length)
      .map((r, i) => ({
        id: r.id,
        x: PIN_SPOTS[i].x,
        y: PIN_SPOTS[i].y,
        kind: "request" as const,
        label: r.title.trim().charAt(0),
      })),
  ];

  const activeMeta = active ? requestStatusMeta(active.status) : null;

  function startSheetDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    sheetStartY.current = event.clientY;
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function finishSheetDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    const startY = sheetStartY.current;
    if (startY === null) return;
    const delta = event.clientY - startY;
    sheetStartY.current = null;
    if (delta < -32) setSheetOpen(true);
    else if (delta > 32) setSheetOpen(false);
    else setSheetOpen((open) => !open);
  }

  return (
    <div className="grid">
      {/* الخريطة + الشريحة */}
      <section className="relative h-[min(70svh,620px)]">
        <MapCanvas pins={pins} showRoute={!!active} height="100%" />

        <div className="absolute inset-x-4 top-3 flex items-center justify-between gap-2">
          <LiveDot
            label={c?.open ? `${countAr(c.open, ["طلب", "طلبان", "طلبات"], "طلباً")} مفتوح` : "لا طلبات مفتوحة"}
          />
          {c?.pendingOffers ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-background/95 px-3 py-1.5 text-[12px] font-black shadow-md backdrop-blur">
              <Hourglass className="size-3.5 text-brand-dark" />
              {countAr(c.pendingOffers, ["عرض", "عرضان", "عروض"], "عرضاً")} في انتظار ردّك
            </span>
          ) : null}
        </div>

        <div
          className="sheet absolute inset-x-0 bottom-0 z-10 max-h-full overflow-y-auto px-4 pt-3 pb-5 transition-transform duration-300 ease-out"
          style={{ transform: sheetOpen ? "translateY(0)" : "translateY(calc(100% - 96px))" }}
        >
          <button
            type="button"
            aria-label={sheetOpen ? "طي لوحة التحكم" : "فتح لوحة التحكم"}
            aria-expanded={sheetOpen}
            className="mb-4 flex w-full cursor-grab touch-none justify-center active:cursor-grabbing"
            onPointerDown={startSheetDrag}
            onPointerUp={finishSheetDrag}
            onPointerCancel={() => {
              sheetStartY.current = null;
            }}
          >
            <DragHandle />
          </button>

          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-[22px] leading-tight font-black">
                {firstName ? `أهلاً ${firstName}` : "لوحة الزبون"}
              </h1>
              <p className="mt-1 text-[12.5px] leading-snug text-muted-foreground">
                انشر طلبك، قارن عروض الحرّافين، وتابع التنفيذ حتى التقييم.
              </p>
            </div>
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand font-display text-lg font-black text-brand-ink">
              {(firstName || "ز").charAt(0)}
            </span>
          </div>

          {/* الطلب النشط — البطاقة الأهم في الشريحة */}
          {active && activeMeta ? (
            <Link
              href={`/requests/${active.id}`}
              className="mt-4 flex items-center gap-3 rounded-3xl bg-muted/70 p-3.5 transition-colors active:bg-muted"
            >
              <div className="min-w-0 flex-1">
                <Badge tone={activeMeta.tone}>{activeMeta.label}</Badge>
                <h2 className="mt-1.5 truncate text-[15px] font-black">{active.title}</h2>
                <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                  {active.categoryName} · {active.city}
                  {active.district ? ` — ${active.district}` : ""}
                </p>
              </div>
              <div className="shrink-0 text-end">
                <div className="text-price text-[24px] leading-none">
                  {madNumber(active.agreedAmount ?? active.budgetAmount)}
                </div>
                <div className="mt-1 text-[10.5px] font-bold text-muted-foreground">
                  {active.agreedAmount ? "درهم — السعر المتفق عليه" : "درهم — سعرك المقترح"}
                </div>
              </div>
            </Link>
          ) : (
            <p className="mt-4 rounded-3xl bg-muted/70 px-3.5 py-4 text-center text-[12.5px] text-muted-foreground">
              لا طلب نشط حالياً — انشر طلباً ليبدأ الحرّافون القريبون بتقديم عروضهم.
            </p>
          )}

          {/* إحصاءات سريعة بثلاثة أرقام كبيرة */}
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[
              { label: "منشورة", value: c?.open ?? 0 },
              { label: "قيد التنفيذ", value: c?.active ?? 0 },
              { label: "منتهية", value: c?.completed ?? 0 },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl bg-muted/70 px-3 py-2.5 text-center">
                <div className="text-price text-[22px] leading-none">{s.value}</div>
                <div className="mt-1 text-[10.5px] font-bold text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>

          <Button asChild size="lg" className="mt-4 w-full gap-2">
            <Link href="/requests/new">
              <Plus className="size-5" />
              انشر طلباً جديداً
            </Link>
          </Button>

          {/* روابط سريعة */}
          <div className="mt-2.5 grid grid-cols-2 gap-2">
            <Link
              href="/wallet"
              className="flex items-center gap-2 rounded-2xl bg-muted/70 px-3 py-2.5 transition-colors active:bg-muted"
            >
              <Wallet className="size-4 text-teal" />
              <div className="min-w-0">
                <div className="text-[11px] font-bold text-muted-foreground">المحفظة</div>
                <div className="truncate text-[12.5px] font-black">{formatMAD(c?.walletBalance ?? 0)}</div>
              </div>
            </Link>
            <Link
              href="/notifications"
              className="flex items-center gap-2 rounded-2xl bg-muted/70 px-3 py-2.5 transition-colors active:bg-muted"
            >
              <Bell className="size-4 text-warn" />
              <div className="min-w-0">
                <div className="text-[11px] font-bold text-muted-foreground">الإشعارات</div>
                <div className="truncate text-[12.5px] font-black">
                  {c?.unread ?? 0} غير مقروء
                </div>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* اختيار الخدمة يبقى متاحاً من لوحة الزبون، لا من الصفحة التعريفية فقط. */}
      <section className="px-4 pt-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-[17px] font-black">شنو بغيتي اليوم؟</h2>
            <p className="mt-1 text-[12px] text-muted-foreground">اختار نوع الخدمة وبدأ طلبك.</p>
          </div>
          <span className="rounded-full bg-brand px-2.5 py-1 text-[10px] font-black text-brand-ink">خدمات قريبة</span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2.5">
          {SERVICE_MODES.map((service) => (
            <Link
              key={service.slug}
              href={`/requests/new?service=${service.slug}`}
              className="group rounded-3xl bg-card p-3.5 transition-transform active:scale-[0.98]"
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              <span className="grid size-10 place-items-center rounded-2xl bg-brand text-brand-ink transition-transform group-hover:scale-105">
                <service.icon className="size-5" />
              </span>
              <h3 className="mt-3 text-[13px] font-black">{service.title}</h3>
              <p className="mt-1 text-[11px] text-muted-foreground">{service.description}</p>
            </Link>
          ))}
        </div>
      </section>

    </div>
  );
}

// ── لوحة الحرّاف ─────────────────────────────────────────────────────────────────
function ProviderDashboard() {
  const q = trpc.dashboard.provider.useQuery();

  if (q.isLoading) {
    return (
      <div className="grid">
        <div className="hirfi-skeleton h-[34svh]" />
        <div className="grid gap-3 px-4 py-5">
          <div className="hirfi-skeleton h-24 rounded-3xl" />
          <ListSkeleton count={2} />
        </div>
      </div>
    );
  }

  if (q.isError) {
    return (
      <div className="p-4">
        <ErrorState message={errorMessage(q.error)} onRetry={() => void q.refetch()} />
      </div>
    );
  }

  const p = q.data?.profile;
  const c = q.data?.counts;
  const fresh = (q.data?.fresh ?? []) as RequestCardData[];
  const jobs = (q.data?.jobs ?? []) as RequestCardData[];
  const avg = p && p.ratingCount ? Math.round((p.ratingSum / p.ratingCount) * 10) / 10 : null;
  const activeJob = jobs.find((j) => j.status !== "completed");
  const activeMeta = activeJob ? requestStatusMeta(activeJob.status) : null;

  const pins: MapPinSpec[] = [
    ME_PIN,
    ...fresh.slice(0, PIN_SPOTS.length).map((r, i) => ({
      id: r.id,
      x: PIN_SPOTS[i].x,
      y: PIN_SPOTS[i].y,
      kind: "request" as const,
      label: r.title.trim().charAt(0),
    })),
  ];

  return (
    <div className="grid">
      <section className="relative">
        <MapCanvas pins={pins} height="34svh" />

        <div className="absolute inset-x-4 top-3 flex items-center justify-between gap-2">
          <LiveDot label={`${countAr(c?.openNear ?? 0, ["طلب", "طلبان", "طلبات"], "طلباً")} قريب`} />
          {c?.offersPending ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-background/95 px-3 py-1.5 text-[12px] font-black shadow-md backdrop-blur">
              <Send className="size-3.5 text-brand-dark" />
              {countAr(c.offersPending, ["عرض", "عرضان", "عروض"], "عرضاً")} في انتظار ردّك
            </span>
          ) : null}
        </div>

        <div className="sheet relative z-10 -mt-7 px-4 pt-3 pb-5">
          <DragHandle className="mb-4" />

          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <h1 className="text-[22px] leading-tight font-black">
                  {p ? p.displayName : "لوحة الحرّاف"}
                </h1>
                {p?.isVerified ? <VerifiedBadge /> : null}
              </div>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 text-[12px] text-muted-foreground">
                <span className="inline-flex items-center gap-1 font-bold text-foreground">
                  <Star className="size-3.5 fill-warn text-warn" />
                  {avg !== null ? `${avg} من 5 (${p?.ratingCount})` : "بلا تقييم بعد"}
                </span>
                <span>
                  {p?.city}
                  {p?.district ? ` — ${p.district}` : ""}
                </span>
                <span>{countAr(p?.completedJobs ?? 0, ["عمل", "عملان", "أعمال"], "عملاً")} منجز</span>
              </p>
            </div>
          </div>

          {/* أرقام الحرّاف */}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-muted/70 px-3 py-2.5">
              <div className="text-[10.5px] font-bold text-muted-foreground">إجمالي استحقاقي</div>
              <div className="text-price mt-1 text-[22px] leading-none">
                {madNumber(c?.earnings ?? 0)}
                <span className="ms-1 text-[10.5px] font-bold text-muted-foreground">درهم</span>
              </div>
            </div>
            <div className="rounded-2xl bg-muted/70 px-3 py-2.5">
              <div className="text-[10.5px] font-bold text-muted-foreground">رصيد متاح</div>
              <div className="text-price mt-1 text-[22px] leading-none">
                {madNumber(c?.walletBalance ?? 0)}
                <span className="ms-1 text-[10.5px] font-bold text-muted-foreground">درهم</span>
              </div>
            </div>
          </div>

          {/* العمل الجاري */}
          {activeJob && activeMeta ? (
            <Link
              href={`/requests/${activeJob.id}`}
              className="mt-3 flex items-center gap-3 rounded-3xl bg-brand/12 p-3.5 transition-colors active:bg-brand/20"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand text-brand-ink">
                <Briefcase className="size-4.5" />
              </span>
              <div className="min-w-0 flex-1">
                <Badge tone={activeMeta.tone}>{activeMeta.label}</Badge>
                <h2 className="mt-1.5 truncate text-[14.5px] font-black">{activeJob.title}</h2>
                <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                  {activeJob.categoryName} · {activeJob.city}
                </p>
              </div>
              <ArrowLeft className="size-4 shrink-0" />
            </Link>
          ) : (
            <p className="mt-3 rounded-3xl bg-muted/70 px-3.5 py-4 text-center text-[12.5px] text-muted-foreground">
              لا عمل مُسند حالياً — قدّم عرضاً على طلب قريب ليظهر هنا.
            </p>
          )}

          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button asChild size="lg" className="w-full gap-2">
              <Link href="/browse">
                <Search className="size-4.5" />
                تصفّح الطلبات
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="w-full gap-2">
              <Link href="/offers">
                <Send className="size-4.5" />
                عروضي ({c?.offersTotal ?? 0})
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* أعمالي المُسندة */}
      <section className="grid gap-3 px-4 pt-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-[17px] font-black">
            <Briefcase className="size-4.5 text-teal" />
            أعمالي المُسندة
          </h2>
          {jobs.length > 0 ? (
            <Button asChild variant="ghost" size="sm" className="gap-1">
              <Link href="/offers">
                الكل
                <ArrowLeft className="size-3.5" />
              </Link>
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

      {/* طلبات جديدة في مدينتك */}
      <section className="grid gap-3 px-4 pt-4 pb-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-[17px] font-black">
            <CircleDollarSign className="size-4.5 text-brand-dark" />
            طلبات جديدة في مدينتك
          </h2>
          {fresh.length > 0 ? (
            <Button asChild variant="ghost" size="sm" className="gap-1">
              <Link href="/browse">
                الكل
                <ArrowLeft className="size-3.5" />
              </Link>
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
