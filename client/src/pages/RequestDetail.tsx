// ── الشاشة الموحّدة للطلب ────────────────────────────────────────────────────────
// شريط الحياة + تفاصيل الطلب + العروض + التفاوض + المحادثة + التقييم + المحفظة،
// كلها في مكان واحد. الأزرار المعروضة تتغيّر بحسب الدور والحالة، فلا يرى أي طرف
// إجراءً لا يملكه الخادم أصلاً (نفس شروط canWrite/isOwner في db.ts).
import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "wouter";
import {
  ArrowRight,
  Ban,
  Check,
  CheckCircle2,
  CircleDollarSign,
  Clock,
  Hourglass,
  MapPin,
  MessageSquare,
  Send,
  Star,
  X,
  Pencil,
  Info,
  Wallet,
  Calendar,
  Eye,
  AlertCircle,
  Users,
  ScrollText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Badge,
  EmptyState,
  ErrorState,
  Field,
  ListSkeleton,
  PageHeader,
  Spinner,
  Stars,
} from "@/components/hirfi/primitives";
import { LifecycleBar, OfferCard, RefCode, type OfferRow } from "@/components/hirfi/cards";
import { trpc } from "@/_core/trpc";
import { useAuth } from "@/_core/useAuth";
import { POLL_INTERVAL_MS } from "@/lib/hooks";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import {
  categoryIcon,
  countAr,
  errorMessage,
  formatDateAr,
  formatDateTimeAr,
  formatDuration,
  formatMAD,
  madNumber,
  requestStatusMeta,
  timeAgoAr,
  urgencyMeta,
} from "@/lib/format";

export default function RequestDetail() {
  const params = useParams() as { id?: string };
  const id = params.id ?? "";
  const q = trpc.requests.detail.useQuery(
    { id },
    { enabled: !!id, refetchInterval: id ? POLL_INTERVAL_MS : false },
  );
  const [newOfferIds, setNewOfferIds] = useState<string[]>([]);
  const knownOfferIdsRef = useRef<Set<string> | null>(null);

  useEffect(() => {
    const data = q.data;
    if (!data) return;

    const currentIds = data.offers
      .filter((offer) => offer.providerUserId !== data.request.customerId && offer.status === "pending")
      .map((offer) => offer.id);
    const knownIds = knownOfferIdsRef.current;
    const freshIds = knownIds ? currentIds.filter((offerId) => !knownIds.has(offerId)) : [];
    const currentIdSet = new Set(currentIds);
    knownOfferIdsRef.current = currentIdSet;

    setNewOfferIds((previousIds) => {
      const nextIds = [
        ...previousIds.filter((offerId) => currentIdSet.has(offerId)),
        ...freshIds.filter((offerId) => !previousIds.includes(offerId)),
      ];
      return nextIds.length === previousIds.length && nextIds.every((offerId, index) => offerId === previousIds[index])
        ? previousIds
        : nextIds;
    });
  }, [q.data]);

  if (!id) {
    return (
      <div className="p-4">
        <ErrorState message="رابط الطلب غير صالح — لا يحمل رقماً تعريفياً." />
      </div>
    );
  }

  if (q.isLoading) {
    return (
      <div className="grid gap-3 px-4 pt-5">
        <div className="hirfi-skeleton h-24 rounded-3xl" />
        <div className="hirfi-skeleton h-14 rounded-3xl" />
        <ListSkeleton count={2} />
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
  if (!q.data) return null;

  const d = q.data;
  const r = d.request;
  const catIcon = categoryIcon(r.categoryIcon);
  const sm = requestStatusMeta(r.status);
  const urg = urgencyMeta(r.urgency);

  const customerAvg = r.customerRatingCount
    ? Math.round((r.customerRatingSum / r.customerRatingCount) * 10) / 10
    : null;

  // العروض: ما قدّمه الحرّافون منفصل عن العروض المضادة التي كتبها الزبون.
  const incomingOffers = d.offers.filter((o) => o.providerUserId !== r.customerId);
  const myCounters = d.offers.filter((o) => o.providerUserId === r.customerId);
  const newOffers = d.isOwner
    ? incomingOffers.filter((offer) => newOfferIds.includes(offer.id) && offer.status === "pending").slice(-3)
    : [];

  function dismissNewOffer(idToDismiss: string) {
    setNewOfferIds((ids) => ids.filter((offerId) => offerId !== idToDismiss));
  }

  return (
    <div className="grid pb-6">
      {newOffers.length > 0 ? (
        <OfferNotificationStack
          offers={newOffers}
          onDismiss={dismissNewOffer}
          onRefresh={() => void q.refetch()}
        />
      ) : null}
      {/* رجوع */}
      <div className="px-4 pt-4">
        <Link
          href={d.isOwner ? "/requests" : "/browse"}
          className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-muted-foreground"
        >
          <ArrowRight className="size-3.5" />
          {d.isOwner ? "عودة إلى طلباتي" : "عودة إلى التصفّح"}
        </Link>
      </div>

      <PageHeader
        icon={catIcon}
        title={r.title}
        description={r.categoryName}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={sm.tone} icon={sm.icon}>
              {sm.label}
            </Badge>
            <Badge tone={urg.tone}>{urg.label}</Badge>
          </div>
        }
      />

      <div className="px-4 pt-4">
        <LifecycleBar
          status={r.status}
          hasOffers={incomingOffers.length > 0}
          offersCount={incomingOffers.length}
        />
      </div>

      {/* المال أولاً — الرقم الأبرز */}
      <section className="px-4 pt-3">
        <div className="card-flat p-4">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground">
                <CircleDollarSign className="size-3.5" />
                {r.agreedAmount ? "السعر المتفق عليه" : "الميزانية المقترحة للزبون"}
              </div>
              <div className="text-price mt-1 flex items-baseline gap-1.5 text-[30px] leading-none">
                {madNumber(r.agreedAmount ?? r.budgetAmount)}
                <span className="text-[12px] font-bold text-muted-foreground">درهم</span>
              </div>
            </div>
            <RefCode id={r.id} />
          </div>

          <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-border pt-3">
            <div>
              <dt className="flex items-center gap-1 text-[10.5px] font-bold text-muted-foreground">
                <MapPin className="size-3" />
                الموقع
              </dt>
              <dd className="mt-0.5 truncate text-[12.5px] font-bold">
                {r.city} — {r.district}
              </dd>
            </div>
            <div>
              <dt className="flex items-center gap-1 text-[10.5px] font-bold text-muted-foreground">
                <Clock className="size-3" />
                نُشر
              </dt>
              <dd className="mt-0.5 text-[12.5px] font-bold">{timeAgoAr(r.createdAt)}</dd>
            </div>
            <div className="col-span-2">
              <dt className="flex items-center gap-1 text-[10.5px] font-bold text-muted-foreground">
                <Calendar className="size-3" />
                الوقت المقترح للتنفيذ
              </dt>
              <dd className="mt-0.5 text-[12.5px] font-bold">
                {r.scheduledFor ? formatDateTimeAr(r.scheduledFor) : "مرن — لم يُحدَّد"}
              </dd>
            </div>
          </dl>
        </div>
      </section>

      {/* تفاصيل الطلب */}
      <section className="px-4 pt-3">
        <div className="card-flat p-4">
          <h2 className="flex items-center gap-1.5 text-[15px] font-black">
            <ScrollText className="size-4.5 text-brand-dark" />
            تفاصيل الطلب
          </h2>
          <p className="mt-2.5 text-[13px] leading-relaxed whitespace-pre-line">
            {r.description}
          </p>
          <p className="mt-2 text-[10.5px] text-muted-foreground">
            نُشر في {formatDateAr(r.createdAt)}
          </p>

          {d.images.length > 0 ? (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {d.images.map((img) => (
                <a
                  key={img.id}
                  href={img.imageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="group relative aspect-square overflow-hidden rounded-2xl"
                >
                  <img
                    src={img.imageUrl}
                    alt="صورة توضيحية للطلب"
                    className="size-full object-cover transition-transform group-active:scale-105"
                  />
                  <span className="absolute inset-0 grid place-items-center bg-foreground/0 text-background opacity-0 transition-opacity group-hover:bg-foreground/35 group-hover:opacity-100">
                    <Eye className="size-5" />
                  </span>
                </a>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      {/* العروض المقدَّمة */}
      <section className="grid gap-3 px-4 pt-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-[17px] font-black">
            <MessageSquare className="size-4.5 text-brand-dark" />
            العروض المقدَّمة
          </h2>
          <Badge tone={incomingOffers.length > 0 ? "teal" : "muted"}>
            {countAr(incomingOffers.length, ["عرض", "عرضان", "عروض"], "عرضاً")}
          </Badge>
        </div>

        {incomingOffers.length === 0 ? (
          <EmptyState
            icon={Hourglass}
            title="لا عروض بعد"
            description={
              d.isOwner
                ? "طلبك منشور ويظهر الآن للحرّافين في منطقتك. أول ما يقدّم أحدهم عرضاً سيصلك إشعار هنا، وستقدر أن تقارن السعر والمدة والرسالة قبل أن تقرّر."
                : "كن أول من يقترح سعراً على هذا الطلب — وكلما كانت رسالتك واضحة عمّا يشمله السعر، ارتفعت فرصك في القبول."
            }
          />
        ) : (
          <div className="grid gap-3">
            {incomingOffers.map((o) => (
              <OfferCardRow
                key={o.id}
                offer={o}
                isOwner={d.isOwner}
                requestOpen={r.status === "open"}
                budget={r.budgetAmount}
                onDone={() => void q.refetch()}
              />
            ))}
          </div>
        )}

        {myCounters.length > 0 ? (
          <div className="grid gap-3 pt-1">
            <h3 className="text-[13px] font-black text-muted-foreground">
              {d.isOwner ? "عروضي المضادة" : "عروض مضادة وُجّهت إليّ"}
            </h3>
            {myCounters.map((o) => (
              <OfferCardRow
                key={o.id}
                offer={o}
                isOwner={d.isOwner}
                requestOpen={r.status === "open"}
                budget={r.budgetAmount}
                isCounter
                onDone={() => void q.refetch()}
              />
            ))}
          </div>
        ) : null}
      </section>

      {/* نموذج تقديم عرض — للحرّاف على طلب مفتوح لم يعرض عليه بعد */}
      {!d.isOwner && r.status === "open" && !d.hasOffered ? (
        <div className="px-4 pt-3">
          <OfferForm requestId={r.id} budget={r.budgetAmount} onDone={() => void q.refetch()} />
        </div>
      ) : null}

      {/* أطراف الطلب */}
      <section className="px-4 pt-3">
        <div className="card-flat p-4">
          <h2 className="flex items-center gap-1.5 text-[15px] font-black">
            <Users className="size-4.5 text-brand-dark" />
            أطراف الطلب
          </h2>
          <div className="mt-3 grid gap-3">
            <div className="flex items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-brand font-display text-[15px] font-black text-brand-ink">
                {(r.customerName ?? "?").trim().charAt(0)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <b className="truncate text-[13.5px]">{r.customerName}</b>
                  <Badge tone="brand">زبون</Badge>
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="size-3" />
                    {r.customerCity}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Star className="size-3" />
                    {customerAvg !== null ? `${customerAvg} من 5` : "بلا تقييم"}
                  </span>
                </div>
              </div>
            </div>

            {d.acceptedOffer ? (
              <div className="flex items-center gap-3 border-t border-border pt-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-teal-soft font-display text-[15px] font-black text-teal">
                  {d.acceptedOffer.providerName.trim().charAt(0)}
                </span>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/providers/${d.acceptedOffer.providerUserId}`}
                    className="block truncate text-[13.5px] font-black underline-offset-2 hover:underline"
                  >
                    {d.acceptedOffer.providerName}
                  </Link>
                  <div className="text-[11px] text-muted-foreground">
                    {formatMAD(d.acceptedOffer.price)} — {formatDuration(d.acceptedOffer.durationMinutes)}
                  </div>
                </div>
                <Badge tone="success">الحرّاف المختار</Badge>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {/* الإجراءات بحسب الحالة والدور */}
      <div className="px-4 pt-3">
        <OwnerActions
          requestId={r.id}
          status={r.status}
          isOwner={d.isOwner}
          acceptedProviderId={d.acceptedOffer?.providerUserId ?? null}
          viewerId={d.isOwner ? null : d.counterpartId}
          onDone={() => void q.refetch()}
        />
      </div>

      {/* الاتفاق المالي */}
      {r.agreedAmount ? (
        <section className="px-4 pt-3">
          <div className="rounded-3xl bg-teal-soft p-4">
            <h2 className="flex items-center gap-1.5 text-[15px] font-black text-teal">
              <Wallet className="size-4.5" />
              الاتفاق المالي
            </h2>
            <dl className="mt-3 grid gap-2 text-[12.5px]">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">السعر المتفق عليه</dt>
                <dd className="font-black">{formatMAD(r.agreedAmount)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">عمولة المنصّة (10%)</dt>
                <dd className="font-black">{formatMAD(Math.round(r.agreedAmount * 0.1))}</dd>
              </div>
              <div className="mt-1 flex items-center justify-between gap-3 border-t border-teal/20 pt-2">
                <dt className="font-black">صافي استحقاق الحرّاف</dt>
                <dd className="text-price text-[17px] leading-none text-teal">
                  {madNumber(r.agreedAmount - Math.round(r.agreedAmount * 0.1))}
                </dd>
              </div>
            </dl>
            <p className="mt-2.5 text-[11px] leading-relaxed text-muted-foreground">
              تُقيَّد العمليّات في المحفظة الداخلية عند إتمام الطلب — لا بوابة دفع حقيقية في هذا النطاق.
            </p>
          </div>
        </section>
      ) : null}

      {/* المحادثة */}
      <div className="px-4 pt-3">
        <ChatPanel requestId={r.id} enabled={d.canWriteMessages} />
      </div>

      {/* التقييم */}
      {r.status === "completed" && !d.iReviewed ? (
        <div className="px-4 pt-3">
          <ReviewPanel requestId={r.id} onDone={() => void q.refetch()} />
        </div>
      ) : null}

      {r.status === "completed" && d.iReviewed ? (
        <div className="px-4 pt-3">
          <p className="flex items-center gap-2 rounded-3xl bg-success/12 px-4 py-3.5 text-[13px] font-bold text-success">
            <CheckCircle2 className="size-4.5 shrink-0" />
            قيّمت هذا الطلب — شكراً لك، تقييمك يظهر في الملف العام.
          </p>
        </div>
      ) : null}
    </div>
  );
}

function OfferNotificationStack({
  offers,
  onDismiss,
  onRefresh,
}: {
  offers: OfferRow[];
  onDismiss: (id: string) => void;
  onRefresh: () => void;
}) {
  const accept = trpc.offers.accept.useMutation();
  const reject = trpc.offers.reject.useMutation();
  const utils = trpc.useUtils();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function decide(offer: OfferRow, action: "accept" | "reject") {
    setBusyId(offer.id);
    try {
      if (action === "accept") await accept.mutateAsync({ id: offer.id });
      else await reject.mutateAsync({ id: offer.id });
      await utils.invalidate();
      onDismiss(offer.id);
      onRefresh();
      toast.success(action === "accept" ? "تم قبول العرض وتثبيت السعر" : "رُفض العرض");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-[4.5rem] z-[60] mx-auto w-full max-w-[460px] px-3"
      role="status"
      aria-live="polite"
    >
      <div className="pointer-events-auto grid gap-2.5">
        {offers.map((offer) => {
          const avg = offer.providerRatingCount
            ? Math.round((offer.providerRatingSum / offer.providerRatingCount) * 10) / 10
            : null;
          const busy = busyId === offer.id;
          return (
            <article
              key={offer.id}
              className="relative overflow-hidden rounded-[20px] bg-card p-3.5 shadow-2xl ring-1 ring-foreground/10"
            >
              <span className="absolute inset-x-0 top-0 h-1 bg-brand" />
              <div className="flex items-start gap-2.5 pt-1">
                <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-full bg-secondary font-display text-[17px] font-black">
                  {offer.providerAvatarUrl ? (
                    <img src={offer.providerAvatarUrl} alt="" className="size-full object-cover" />
                  ) : (
                    offer.providerName.trim().charAt(0)
                  )}
                </span>

                <div className="min-w-0 flex-1">
                  <b className="block truncate text-[15px] font-black">{offer.providerName}</b>
                  <p className="mt-0.5 truncate text-[12px] text-muted-foreground">حرّاف قريب منك</p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1 font-bold text-foreground">
                      <Star className="size-3 fill-warn text-warn" />
                      {avg !== null ? avg : "جديد"}
                      {offer.providerRatingCount ? ` (${offer.providerRatingCount})` : ""}
                    </span>
                    <span>{countAr(offer.providerCompletedJobs, ["عمل", "عملان", "أعمال"], "عملاً")}</span>
                  </div>
                </div>

                <div className="shrink-0 text-end">
                  <div className="text-price text-[26px] leading-none text-brand-dark">{madNumber(offer.price)}</div>
                  <div className="mt-1 text-[10.5px] font-bold text-muted-foreground">
                    {formatDuration(offer.durationMinutes)}
                  </div>
                  <div className="mt-0.5 max-w-20 truncate text-[10px] text-muted-foreground">
                    {offer.providerDistrict || offer.providerCity}
                  </div>
                </div>
              </div>

              {offer.message ? (
                <p className="mt-2 truncate rounded-xl bg-muted/70 px-2.5 py-1.5 text-[11px] text-muted-foreground">
                  {offer.message}
                </p>
              ) : null}

              <div className="mt-3 grid grid-cols-2 gap-2" dir="ltr">
                <Button
                  type="button"
                  variant="secondary"
                  className="h-10 rounded-xl text-[12px] font-black text-destructive"
                  disabled={busy}
                  onClick={() => void decide(offer, "reject")}
                >
                  {busy && reject.isPending ? <Spinner /> : "ارفض"}
                </Button>
                <Button
                  type="button"
                  className="h-10 rounded-xl bg-brand text-[12px] font-black text-brand-ink hover:bg-brand-dark"
                  disabled={busy}
                  onClick={() => void decide(offer, "accept")}
                >
                  {busy && accept.isPending ? <Spinner /> : "اقبل"}
                </Button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

// ── بطاقة عرض + أزرار القرار بحسب الدور ───────────────────────────────────────
function OfferCardRow({
  offer,
  isOwner,
  requestOpen,
  budget,
  isCounter,
  onDone,
}: {
  offer: OfferRow;
  isOwner: boolean;
  requestOpen: boolean;
  budget: number;
  isCounter?: boolean;
  onDone: () => void;
}) {
  const accept = trpc.offers.accept.useMutation();
  const reject = trpc.offers.reject.useMutation();
  const withdraw = trpc.offers.withdraw.useMutation();
  const respond = trpc.offers.respondCounter.useMutation();
  const utils = trpc.useUtils();
  const [countering, setCountering] = useState(false);
  const [price, setPrice] = useState(String(Math.round((budget + offer.price) / 2)));
  const [dur, setDur] = useState(String(offer.durationMinutes));
  const [msg, setMsg] = useState("");

  const busy = accept.isPending || reject.isPending || withdraw.isPending || respond.isPending;

  async function run(fn: () => Promise<unknown>, ok: string) {
    try {
      await fn();
      await utils.invalidate();
      toast.success(ok);
      onDone();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  async function sendCounter() {
    const p = Number(price);
    const d = Number(dur);
    if (!p || p < 20) return toast.error("أدخل سعراً صحيحاً (20 درهماً على الأقل)");
    if (!d || d < 15) return toast.error("أدخل مدة صحيحة (15 دقيقة على الأقل)");
    if (msg.trim().length < 5) return toast.error("اكتب رسالة قصيرة توضّح عرضك المضاد");
    try {
      await counter.mutateAsync({
        id: offer.id,
        price: Math.round(p),
        durationMinutes: Math.round(d),
        message: msg.trim(),
      });
      await utils.invalidate();
      toast.success("أُرسل عرضك المضاد — القرار النهائي يبقى لك");
      setCountering(false);
      onDone();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  const counter = trpc.offers.counter.useMutation();

  // أزرار الزبون على عرض مفتوح (غير عرضه المضاد)
  const ownerActions =
    isOwner && requestOpen && offer.status === "pending" ? (
      <>
        <Button
          size="sm"
          className="gap-1.5 rounded-full"
          disabled={busy}
          onClick={() =>
            run(
              () => accept.mutateAsync({ id: offer.id }),
              "تم قبول العرض وتثبيت السعر — بقية العروض رُفضت تلقائياً",
            )
          }
        >
          {accept.isPending ? <Spinner /> : <Check className="size-3.5" />}
          اقبل هذا العرض
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 rounded-full"
          disabled={busy}
          onClick={() => setCountering((v) => !v)}
        >
          <Pencil className="size-3.5" />
          فاوض
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="gap-1.5 rounded-full text-muted-foreground"
          disabled={busy}
          onClick={() => run(() => reject.mutateAsync({ id: offer.id }), "رُفض العرض")}
        >
          <X className="size-3.5" />
          ارفض
        </Button>
      </>
    ) : null;

  // أزرار الحرّاف: سحب عرضه المعلّق
  const providerActions =
    !isOwner && !isCounter && offer.status === "pending" && offer.providerUserId ? (
      <Button
        size="sm"
        variant="outline"
        className="gap-1.5 rounded-full text-muted-foreground"
        disabled={busy}
        onClick={() => run(() => withdraw.mutateAsync({ id: offer.id }), "سُحب عرضك")}
      >
        <Ban className="size-3.5" />
        اسحب عرضي
      </Button>
    ) : null;

  // ردّ الحرّاف على عرض مضاد وُجّه إليه.
  // الأزرار تُركَّب على بطاقة العرض المضاد نفسها (isCounter) لأن respondToCounter في الخادم
  // يأخذ معرّف العرض المضاد لا معرّف العرض الأصلي — ولو رُكِّبت على الأصل لرُفض الردّ.
  const counterActions =
    !isOwner && !!isCounter && offer.status === "countered" ? (
      <>
        <Button
          size="sm"
          className="gap-1.5 rounded-full"
          disabled={busy}
          onClick={() =>
            run(
              () => respond.mutateAsync({ id: offer.id, accept: true }),
              "وافقت على العرض المضاد — أُسند الطلب إليك",
            )
          }
        >
          {respond.isPending ? <Spinner /> : <Check className="size-3.5" />}
          وافق على السعر
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="gap-1.5 rounded-full text-muted-foreground"
          disabled={busy}
          onClick={() => run(() => respond.mutateAsync({ id: offer.id, accept: false }), "رفضت العرض المضاد")}
        >
          <X className="size-3.5" />
          ارفض العرض المضاد
        </Button>
      </>
    ) : null;

  // خيارات سعرية سريعة للعرض المضاد: منتصف الطريق، ثم خصم 10% و20% عن عرضه.
  const quick = [
    { label: "منتصف الطريق", value: Math.round((budget + offer.price) / 2) },
    { label: "خصم 10% عن عرضه", value: Math.round(offer.price * 0.9) },
    { label: "خصم 20% عن عرضه", value: Math.round(offer.price * 0.8) },
  ].filter((v) => v.value >= 20);

  return (
    <div className="grid gap-2">
      <OfferCard offer={offer} actions={counterActions ?? ownerActions ?? providerActions} />

      {countering && !isCounter ? (
        <div className="grid gap-3 rounded-3xl bg-warn-soft p-4">
          <h4 className="flex items-center gap-1.5 text-[14px] font-black text-warn">
            <Pencil className="size-4" />
            عرض مضاد إلى {offer.providerName}
          </h4>

          <div className="flex flex-wrap gap-2">
            {quick.map((v) => (
              <button
                key={v.label}
                type="button"
                onClick={() => setPrice(String(v.value))}
                className={cn(
                  "rounded-full px-3 py-1.5 text-[11.5px] font-bold transition-colors",
                  Number(price) === v.value
                    ? "bg-warn text-white"
                    : "bg-background text-foreground active:bg-muted",
                )}
              >
                {v.label} · {formatMAD(v.value)}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="سعرك المقترح (درهم)" required>
              <Input
                type="number"
                min={20}
                step={10}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </Field>
            <Field label="المدة (دقيقة)" required>
              <Input
                type="number"
                min={15}
                step={15}
                value={dur}
                onChange={(e) => setDur(e.target.value)}
              />
            </Field>
          </div>

          <Field
            label="رسالة"
            hint="اشرح لماذا هذا السعر مناسب — أو ما الذي يمكن تنفيذه به"
            required
          >
            <Textarea
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              maxLength={600}
              className="min-h-20"
              placeholder="مثال: السعر أعلى قليلاً من ميزانيتي، لكن يمكنني قبوله إذا شملت القطع."
            />
          </Field>

          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" className="gap-1.5 rounded-full" onClick={() => void sendCounter()} disabled={counter.isPending}>
              {counter.isPending ? <Spinner /> : <Send className="size-3.5" />}
              أرسل العرض المضاد
            </Button>
            <Button size="sm" variant="ghost" className="rounded-full" onClick={() => setCountering(false)}>
              إلغاء
            </Button>
          </div>

          <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
            <Info className="mt-0.5 size-3.5 shrink-0" />
            العرض المضاد لا يُلزمك: الاتفاق لا يتم إلا إذا وافق الحرّاف، ويبقى بإمكانك قبول عرضه الأصلي.
          </p>
        </div>
      ) : null}

      {!isOwner && !isCounter && offer.status === "countered" && offer.parentOfferId ? (
        <p className="flex items-start gap-1.5 rounded-2xl bg-warn-soft px-3.5 py-2.5 text-[11.5px] leading-relaxed text-warn">
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
          عرضك الأصلي قيد التفاوض — راجع العرض المضاد في الأسفل.
        </p>
      ) : null}

      {isOwner && isCounter && offer.status === "countered" ? (
        <p className="flex items-start gap-1.5 rounded-2xl bg-muted/70 px-3.5 py-2.5 text-[11.5px] leading-relaxed text-muted-foreground">
          <Hourglass className="mt-0.5 size-3.5 shrink-0" />
          بانتظار ردّ الحرّاف على عرضك المضاد — ويبقى الاتفاق غير مبرم حتى يوافق.
        </p>
      ) : null}
    </div>
  );
}

// ── نموذج تقديم عرض (الحرّاف) ────────────────────────────────────────────────
function OfferForm({
  requestId,
  budget,
  onDone,
}: {
  requestId: string;
  budget: number;
  onDone: () => void;
}) {
  const create = trpc.offers.create.useMutation();
  const utils = trpc.useUtils();
  const [price, setPrice] = useState(String(budget));
  const [dur, setDur] = useState("60");
  const [msg, setMsg] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const e: Record<string, string> = {};
    const p = Number(price);
    const d = Number(dur);
    if (!p || p < 20) e.price = "السعر يجب أن يكون 20 درهماً أو أكثر";
    if (p > 200000) e.price = "السعر أكبر من الحد المسموح";
    if (!d || d < 15) e.dur = "المدة 15 دقيقة على الأقل";
    if (msg.trim().length < 10) e.msg = "اكتب رسالة واضحة (10 أحرف على الأقل)";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    try {
      await create.mutateAsync({
        requestId,
        price: Math.round(Number(price)),
        durationMinutes: Math.round(Number(dur)),
        message: msg.trim(),
      });
      await utils.invalidate();
      toast.success("أُرسل عرضك — سيصل إشعار للزبون فوراً");
      onDone();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  // خيارات سريعة بالنسبة إلى ميزانية الزبون.
  const quick = [
    { label: "بميزانيته", value: budget },
    { label: "أقل 10%", value: Math.round(budget * 0.9) },
    { label: "أعلى 10%", value: Math.round(budget * 1.1) },
  ].filter((v) => v.value >= 20);

  return (
    <section className="rounded-3xl bg-brand p-4 text-brand-ink">
      <h2 className="flex items-center gap-1.5 text-[16px] font-black">
        <Send className="size-4.5" />
        قدّم عرضك على هذا الطلب
      </h2>
      <p className="mt-1.5 text-[12.5px] leading-relaxed opacity-80">
        الزبون اقترح {formatMAD(budget)} — أنت من يقترح السعر النهائي والمدة وطريقة التنفيذ.
      </p>

      <form onSubmit={submit} className="mt-3 grid gap-3 rounded-2xl bg-background p-3.5">
        <div className="flex flex-wrap gap-2">
          {quick.map((v) => (
            <button
              key={v.label}
              type="button"
              onClick={() => setPrice(String(v.value))}
              className={cn(
                "rounded-full px-3 py-1.5 text-[11.5px] font-bold transition-colors",
                Number(price) === v.value ? "bg-brand text-brand-ink" : "bg-muted active:bg-muted/70",
              )}
            >
              {v.label} · {formatMAD(v.value)}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="سعرك (درهم)" required error={errors.price}>
            <Input type="number" min={20} step={10} value={price} onChange={(e) => setPrice(e.target.value)} />
          </Field>
          <Field label="المدة المتوقعة (دقيقة)" required error={errors.dur}>
            <Input type="number" min={15} step={15} value={dur} onChange={(e) => setDur(e.target.value)} />
          </Field>
        </div>

        <Field
          label="رسالتك إلى الزبون"
          hint="ما الذي يشمله السعر؟ متى تستطيع البدء؟ هل القطع داخلة؟"
          required
          error={errors.msg}
        >
          <Textarea
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            maxLength={800}
            className="min-h-24"
            placeholder="مثال: أتشخّص مجاناً، وأتوقع تغيير الوصلة والسيفون. السعر يشمل القطع وضمان 3 أشهر."
          />
        </Field>

        <Button type="submit" className="w-fit gap-2 rounded-full" disabled={create.isPending}>
          {create.isPending ? <Spinner /> : <Send className="size-4" />}
          أرسل العرض
        </Button>
      </form>
    </section>
  );
}

// ── إجراءات صاحب الطلب والحرّاف المختار على حالة الطلب ──────────────────────────
function OwnerActions({
  requestId,
  status,
  isOwner,
  acceptedProviderId,
  onDone,
}: {
  requestId: string;
  status: string;
  isOwner: boolean;
  acceptedProviderId: string | null;
  viewerId: string | null;
  onDone: () => void;
}) {
  const setStatus = trpc.requests.setStatus.useMutation();
  const utils = trpc.useUtils();
  const [confirming, setConfirming] = useState<string | null>(null);

  const isAcceptedProvider = !isOwner && !!acceptedProviderId;

  const options: { next: "in_progress" | "completed" | "cancelled"; label: string; tone: string; hint: string }[] = [];

  if (status === "open" && isOwner) {
    options.push({
      next: "cancelled",
      label: "ألغِ الطلب",
      tone: "danger",
      hint: "الإلغاء متاح قبل الاتفاق فقط. سيتوقّف الطلب عن استقبال العروض.",
    });
  }
  if (status === "accepted" && (isOwner || isAcceptedProvider)) {
    options.push({
      next: "in_progress",
      label: "ابدأ التنفيذ",
      tone: "brand",
      hint: "يُعلم الطرف الآخر بأن العمل بدأ فعلاً.",
    });
  }
  if (status === "in_progress" && (isOwner || isAcceptedProvider)) {
    options.push({
      next: "completed",
      label: "أنهِ الطلب",
      tone: "success",
      hint: "عند الإتمام تُقيَّد الدفعة وعمولة المنصّة 10% في المحفظة، ويصبح التقييم متاحاً للطرفين.",
    });
  }

  if (options.length === 0) return null;

  async function run(next: "in_progress" | "completed" | "cancelled") {
    try {
      await setStatus.mutateAsync({ id: requestId, next });
      await utils.invalidate();
      toast.success(
        next === "cancelled" ? "أُلغي الطلب" : next === "in_progress" ? "بدأ التنفيذ" : "تمّ إتمام الطلب",
      );
      setConfirming(null);
      onDone();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  return (
    <section className="card-flat p-4">
      <h2 className="text-[15px] font-black">إجراء الحالة</h2>
      <div className="mt-3 grid gap-3">
        {options.map((o) => {
          const open = confirming === o.next;
          return (
            <div key={o.next} className="grid gap-2">
              <Button
                variant={o.next === "cancelled" ? "outline" : "default"}
                className={cn(
                  "w-full gap-2 rounded-full",
                  o.next === "cancelled" && "border-destructive/30 text-destructive hover:bg-destructive/5",
                )}
                disabled={setStatus.isPending}
                onClick={() => {
                  if (o.next === "completed" || o.next === "cancelled") setConfirming(open ? null : o.next);
                  else void run(o.next);
                }}
              >
                {setStatus.isPending ? (
                  <Spinner />
                ) : o.next === "cancelled" ? (
                  <Ban className="size-4" />
                ) : o.next === "completed" ? (
                  <CheckCircle2 className="size-4" />
                ) : (
                  <Hourglass className="size-4" />
                )}
                {o.label}
              </Button>

              {open ? (
                <div className="rounded-2xl bg-muted/70 p-3.5">
                  <p className="text-[11.5px] leading-relaxed text-muted-foreground">{o.hint}</p>
                  <div className="mt-2.5 flex gap-2">
                    <Button size="sm" className="gap-1.5 rounded-full" disabled={setStatus.isPending} onClick={() => void run(o.next)}>
                      {setStatus.isPending ? <Spinner /> : <Check className="size-3.5" />}
                      نعم، متأكّد
                    </Button>
                    <Button size="sm" variant="ghost" className="rounded-full" onClick={() => setConfirming(null)}>
                      تراجع
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="px-1 text-[11px] leading-relaxed text-muted-foreground">{o.hint}</p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ── المحادثة (polling) ───────────────────────────────────────────────────────
function ChatPanel({ requestId, enabled }: { requestId: string; enabled: boolean }) {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const q = trpc.messages.list.useQuery(
    { requestId },
    { enabled, refetchInterval: enabled ? POLL_INTERVAL_MS : false },
  );
  const send = trpc.messages.send.useMutation();
  const [body, setBody] = useState("");
  const endRef = useRef<HTMLDivElement | null>(null);
  const rows = q.data ?? [];

  useEffect(() => {
    if (rows.length) endRef.current?.scrollIntoView({ block: "nearest" });
  }, [rows.length]);

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    const text = body.trim();
    if (!text) return;
    try {
      await send.mutateAsync({ requestId, body: text });
      setBody("");
      await utils.messages.list.invalidate({ requestId });
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  if (!enabled) {
    return (
      <section className="card-flat border-dashed p-4">
        <h2 className="flex items-center gap-1.5 text-[15px] font-black">
          <MessageSquare className="size-4.5 text-brand-dark" />
          المحادثة
        </h2>
        <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
          تُفتح المحادثة بين الزبون والحرّاف بمجرد تقديم عرض على الطلب، وتُقصر بعد الاتفاق على الطرفين
          المتعاقدين — فلا يرى حرّافٌ محادثة منافسه.
        </p>
      </section>
    );
  }

  return (
    <section className="card-flat flex flex-col overflow-hidden">
      <h2 className="flex items-center gap-1.5 border-b border-border px-4 py-3 text-[15px] font-black">
        <MessageSquare className="size-4.5 text-brand-dark" />
        المحادثة
        <span className="ms-auto text-[10px] font-normal text-muted-foreground">تحديث تلقائي كل 5 ثوانٍ</span>
      </h2>

      <div className="scrollbar-thin max-h-80 min-h-32 overflow-y-auto px-4 py-3">
        {q.isLoading ? (
          <div className="grid gap-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="hirfi-skeleton h-12 rounded-2xl" />
            ))}
          </div>
        ) : q.isError ? (
          <p className="text-[12px] text-destructive">{errorMessage(q.error)}</p>
        ) : rows.length === 0 ? (
          <p className="py-2 text-center text-[12px] text-muted-foreground">
            لا رسائل بعد — ابدأ بتحديد موعد التنفيذ أو تأكيد التفاصيل.
          </p>
        ) : (
          <div className="grid gap-2.5">
            {rows.map((m) => {
              const mine = m.senderId === user?.id;
              return (
                <div key={m.id} className={cn("flex", mine ? "justify-start" : "justify-end")}>
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-3.5 py-2.5",
                      mine ? "bg-brand text-brand-ink" : "bg-muted",
                    )}
                  >
                    <div className="flex items-center gap-2 text-[10.5px]">
                      <b className={cn("font-black", mine ? "text-brand-ink" : "text-foreground")}>
                        {mine ? "أنا" : m.senderName}
                      </b>
                      <span className={cn(mine ? "text-brand-ink/70" : "text-muted-foreground")}>
                        {timeAgoAr(m.createdAt)}
                      </span>
                    </div>
                    <p className="mt-1 text-[13px] leading-relaxed whitespace-pre-line">{m.body}</p>
                  </div>
                </div>
              );
            })}
            <div ref={endRef} />
          </div>
        )}
      </div>

      <form onSubmit={submit} className="grid gap-2 border-t border-border p-3">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={1000}
          className="min-h-16"
          placeholder="اكتب رسالة…"
        />
        <Button type="submit" size="sm" className="w-fit gap-1.5 rounded-full" disabled={send.isPending || !body.trim()}>
          {send.isPending ? <Spinner /> : <Send className="size-3.5" />}
          إرسال
        </Button>
      </form>
    </section>
  );
}

// ── التقييم المتبادل بعد الإتمام ─────────────────────────────────────────────
function ReviewPanel({ requestId, onDone }: { requestId: string; onDone: () => void }) {
  const create = trpc.reviews.create.useMutation();
  const utils = trpc.useUtils();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    if (rating < 1) return toast.error("اختر عدد النجوم أولاً");
    try {
      await create.mutateAsync({ requestId, rating, comment: comment.trim() || null });
      await utils.invalidate();
      toast.success("شكراً — أُضيف تقييمك إلى الملف العام");
      onDone();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  return (
    <section className="rounded-3xl bg-warn-soft p-4">
      <h2 className="flex items-center gap-1.5 text-[15px] font-black text-warn">
        <Star className="size-4.5" />
        قيّم الطرف الآخر
      </h2>
      <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">
        التقييم لا يظهر إلا بعد الإتمام، ويُحتسب في متوسّط تقييم الملف العام.
      </p>

      <form onSubmit={submit} className="mt-3 grid gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1" dir="ltr">
            {[1, 2, 3, 4, 5].map((i) => (
              <button
                key={i}
                type="button"
                onClick={() => setRating(i)}
                aria-label={`${i} من 5`}
                className="transition-transform active:scale-110"
              >
                <svg
                  viewBox="0 0 24 24"
                  className={cn(
                    "size-8",
                    i <= rating ? "fill-warn text-warn" : "fill-transparent text-border",
                  )}
                  strokeWidth={1.6}
                  stroke="currentColor"
                >
                  <path d="M12 2.6l2.9 5.9 6.5.95-4.7 4.6 1.1 6.45L12 17.45 6.2 20.5l1.1-6.45-4.7-4.6 6.5-.95z" />
                </svg>
              </button>
            ))}
          </div>
          {rating > 0 ? <Stars value={rating} /> : null}
        </div>

        <Textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={600}
          className="min-h-20"
          placeholder="كيف كانت التجربة؟ الالتزام بالموعد، جودة العمل، السعر…"
        />

        <Button type="submit" size="sm" className="w-fit gap-1.5 rounded-full" disabled={create.isPending}>
          {create.isPending ? <Spinner /> : <Star className="size-3.5" />}
          أرسل التقييم
        </Button>
      </form>
    </section>
  );
}
