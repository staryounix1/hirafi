// ── الشاشة الموحّدة للطلب ─────────────────────────────────────────────────────
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
  errorMessage,
  formatDateAr,
  formatDateTimeAr,
  formatDuration,
  formatMAD,
  requestStatusMeta,
  timeAgoAr,
  urgencyMeta,
} from "@/lib/format";

export default function RequestDetail() {
  const params = useParams() as { id?: string };
  const id = params.id ?? "";
  const q = trpc.requests.detail.useQuery({ id }, { enabled: !!id });

  if (!id) {
    return (
      <ErrorState message="رابط الطلب غير صالح — لا يحمل رقماً تعريفياً." />
    );
  }

  if (q.isLoading) {
    return (
      <div className="grid gap-5">
        <div className="hirfi-skeleton h-16 rounded-xl" />
        <div className="hirfi-skeleton h-14 rounded-xl" />
        <ListSkeleton count={2} />
      </div>
    );
  }

  if (q.isError) {
    return <ErrorState message={errorMessage(q.error)} onRetry={() => void q.refetch()} />;
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

  return (
    <div className="grid gap-5">
      <Link
        href={d.isOwner ? "/requests" : "/browse"}
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowRight className="size-4" />
        {d.isOwner ? "عودة إلى طلباتي" : "عودة إلى التصفّح"}
      </Link>

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
            <RefCode id={r.id} />
          </div>
        }
      />

      <LifecycleBar
        status={r.status}
        hasOffers={incomingOffers.length > 0}
        offersCount={incomingOffers.length}
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="grid min-w-0 gap-5">
          {/* تفاصيل الطلب */}
          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-base font-bold">تفاصيل الطلب</h2>
            <p className="mt-3 text-sm leading-relaxed whitespace-pre-line">{r.description}</p>

            {d.images.length > 0 ? (
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {d.images.map((img) => (
                  <a
                    key={img.id}
                    href={img.imageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="group relative aspect-square overflow-hidden rounded-lg border border-border"
                  >
                    <img
                      src={img.imageUrl}
                      alt="صورة توضيحية للطلب"
                      className="size-full object-cover transition-transform group-hover:scale-105"
                    />
                    <span className="absolute inset-0 grid place-items-center bg-black/0 text-white opacity-0 transition-opacity group-hover:bg-black/35 group-hover:opacity-100">
                      <Eye className="size-5" />
                    </span>
                  </a>
                ))}
              </div>
            ) : null}

            <dl className="mt-4 grid gap-x-4 gap-y-3 border-t border-border pt-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs text-muted-foreground">الميزانية المقترحة</dt>
                <dd className="mt-0.5 flex items-center gap-1.5 font-display text-lg font-extrabold text-brand-dark">
                  <CircleDollarSign className="size-4" />
                  {formatMAD(r.agreedAmount ?? r.budgetAmount)}
                  <span className="text-[11px] font-normal text-muted-foreground">
                    {r.agreedAmount ? "(السعر المتفق عليه)" : "(اقتراح الزبون)"}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">الموقع</dt>
                <dd className="mt-0.5 flex items-center gap-1.5 text-sm font-semibold">
                  <MapPin className="size-4 text-brand" />
                  {r.city} — {r.district}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">نُشر</dt>
                <dd className="mt-0.5 flex items-center gap-1.5 text-sm font-semibold">
                  <Clock className="size-4 text-brand" />
                  {timeAgoAr(r.createdAt)} · {formatDateAr(r.createdAt)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">الوقت المقترح للتنفيذ</dt>
                <dd className="mt-0.5 flex items-center gap-1.5 text-sm font-semibold">
                  <Calendar className="size-4 text-brand" />
                  {r.scheduledFor ? formatDateTimeAr(r.scheduledFor) : "مرن — لم يُحدَّد"}
                </dd>
              </div>
            </dl>
          </section>

          {/* العروض */}
          <section className="grid gap-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-base font-bold">
                <MessageSquare className="size-4.5 text-brand" />
                العروض المقدَّمة
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-bold text-muted-foreground">
                  {incomingOffers.length}
                </span>
              </h2>
            </div>

            {incomingOffers.length === 0 ? (
              <EmptyState
                icon={Hourglass}
                title="لا عروض بعد"
                description={
                  d.isOwner
                    ? "طلبك منشور ويظهر الآن للحرّافين في منطقتك. أول ما يقدّم أحدهم عرضاً سيصلك إشعار هنا."
                    : "كن أول من يقترح سعراً على هذا الطلب."
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
              <div className="grid gap-3">
                <h3 className="text-sm font-bold text-muted-foreground">
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
            <OfferForm requestId={r.id} budget={r.budgetAmount} onDone={() => void q.refetch()} />
          ) : null}
        </div>

        {/* العمود الجانبي */}
        <aside className="grid min-w-0 gap-4 lg:sticky lg:top-20 lg:self-start">
          <section className="rounded-xl border border-border bg-card p-4">
            <h2 className="text-sm font-bold">أطراف الطلب</h2>
            <div className="mt-3 grid gap-3">
              <div className="flex items-center gap-2.5">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand/12 font-display text-sm font-bold text-brand-dark">
                  {(r.customerName ?? "?").trim().charAt(0)}
                </span>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{r.customerName}</div>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
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
                <span className="ms-auto text-[11px] text-muted-foreground">الزبون</span>
              </div>

              {d.acceptedOffer ? (
                <div className="flex items-center gap-2.5 border-t border-border pt-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-teal-soft font-display text-sm font-bold text-teal">
                    {d.acceptedOffer.providerName.trim().charAt(0)}
                  </span>
                  <div className="min-w-0">
                    <Link
                      href={`/providers/${d.acceptedOffer.providerUserId}`}
                      className="truncate text-sm font-semibold hover:text-brand-dark"
                    >
                      {d.acceptedOffer.providerName}
                    </Link>
                    <div className="text-xs text-muted-foreground">
                      {formatMAD(d.acceptedOffer.price)} — {formatDuration(d.acceptedOffer.durationMinutes)}
                    </div>
                  </div>
                  <span className="ms-auto text-[11px] font-semibold text-success">الحرّاف المختار</span>
                </div>
              ) : null}
            </div>
          </section>

          {/* الإجراءات بحسب الحالة والدور */}
          <OwnerActions
            requestId={r.id}
            status={r.status}
            isOwner={d.isOwner}
            acceptedProviderId={d.acceptedOffer?.providerUserId ?? null}
            viewerId={d.isOwner ? null : d.counterpartId}
            onDone={() => void q.refetch()}
          />

          {r.agreedAmount ? (
            <section className="rounded-xl border border-teal/25 bg-teal-soft/50 p-4">
              <h2 className="flex items-center gap-1.5 text-sm font-bold text-teal">
                <Wallet className="size-4" />
                الاتفاق المالي
              </h2>
              <dl className="mt-3 grid gap-1.5 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">السعر المتفق عليه</dt>
                  <dd className="font-semibold">{formatMAD(r.agreedAmount)}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">عمولة المنصّة (10%)</dt>
                  <dd className="font-semibold">{formatMAD(Math.round(r.agreedAmount * 0.1))}</dd>
                </div>
                <div className="mt-1 flex items-center justify-between border-t border-teal/20 pt-2">
                  <dt className="font-semibold">صافي استحقاق الحرّاف</dt>
                  <dd className="font-display font-extrabold text-teal">
                    {formatMAD(r.agreedAmount - Math.round(r.agreedAmount * 0.1))}
                  </dd>
                </div>
              </dl>
              <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                تُقيَّد العمليّات في المحفظة الداخلية عند إتمام الطلب — لا بوابة دفع حقيقية في هذا النطاق.
              </p>
            </section>
          ) : null}

          <ChatPanel requestId={r.id} enabled={d.canWriteMessages} />

          {r.status === "completed" && !d.iReviewed ? (
            <ReviewPanel
              requestId={r.id}
              counterpartId={d.counterpartId}
              onDone={() => void q.refetch()}
            />
          ) : null}

          {r.status === "completed" && d.iReviewed ? (
            <p className="flex items-center gap-2 rounded-xl border border-success/25 bg-success-soft/50 px-3.5 py-3 text-sm font-medium text-success">
              <CheckCircle2 className="size-4 shrink-0" />
              قيّمت هذا الطلب — شكراً لك.
            </p>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

// ── بطاقة عرض + أزرار القرار بحسب الدور ──────────────────────────────────────
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

  const busy =
    accept.isPending || reject.isPending || withdraw.isPending || respond.isPending;

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
      await counter.mutateAsync({ id: offer.id, price: Math.round(p), durationMinutes: Math.round(d), message: msg.trim() });
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
          className="gap-1.5"
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
          className="gap-1.5"
          disabled={busy}
          onClick={() => setCountering((v) => !v)}
        >
          <Pencil className="size-3.5" />
          فاوض
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="gap-1.5 text-muted-foreground"
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
        className="gap-1.5 text-muted-foreground"
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
          className="gap-1.5"
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
          className="gap-1.5 text-muted-foreground"
          disabled={busy}
          onClick={() => run(() => respond.mutateAsync({ id: offer.id, accept: false }), "رفضت العرض المضاد")}
        >
          <X className="size-3.5" />
          ارفض العرض المضاد
        </Button>
      </>
    ) : null;

  return (
    <div className="grid gap-2">
      <OfferCard offer={offer} actions={counterActions ?? ownerActions ?? providerActions} />

      {countering && !isCounter ? (
        <div className="grid gap-3 rounded-xl border border-warn/30 bg-warn-soft/40 p-4">
          <h4 className="flex items-center gap-1.5 text-sm font-bold text-warn">
            <Pencil className="size-4" />
            عرض مضاد إلى {offer.providerName}
          </h4>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="سعرك المقترح (درهم)" required>
              <Input type="number" min={20} step={10} value={price} onChange={(e) => setPrice(e.target.value)} />
            </Field>
            <Field label="المدة (دقيقة)" required>
              <Input type="number" min={15} step={15} value={dur} onChange={(e) => setDur(e.target.value)} />
            </Field>
          </div>
          <Field label="رسالة" hint="اشرح لماذا هذا السعر مناسب — أو ما الذي يمكن تنفيذه به" required>
            <Textarea
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              maxLength={600}
              className="min-h-20"
              placeholder="مثال: السعر أعلى قليلاً من ميزانيتي، لكن يمكنني قبوله إذا شملت القطع."
            />
          </Field>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" className="gap-1.5" onClick={sendCounter} disabled={counter.isPending}>
              {counter.isPending ? <Spinner /> : <Send className="size-3.5" />}
              أرسل العرض المضاد
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setCountering(false)}>
              إلغاء
            </Button>
          </div>
          <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
            <Info className="mt-0.5 size-3.5 shrink-0" />
            العرض المضاد لا يُلزمك: الاتفاق لا يتم إلا إذا وافق الحرّاف، ويبقى بإمكانك قبول عرضه الأصلي.
          </p>
        </div>
      ) : null}

      {!isOwner && !isCounter && offer.status === "countered" && offer.parentOfferId ? (
        <p className="flex items-start gap-1.5 rounded-lg bg-warn-soft/60 px-3 py-2 text-xs text-warn">
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
          عرضك الأصلي قيد التفاوض — راجع العرض المضاد في الأسفل.
        </p>
      ) : null}

      {isOwner && isCounter && offer.status === "countered" ? (
        <p className="flex items-start gap-1.5 rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
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

  return (
    <section className="card-warm rounded-xl border border-brand/30 bg-card p-5">
      <h2 className="flex items-center gap-1.5 text-base font-bold">
        <Send className="size-4.5 text-brand" />
        قدّم عرضك على هذا الطلب
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        الزبون اقترح {formatMAD(budget)} — أنت من يقترح السعر النهائي والمدة وطريقة التنفيذ.
      </p>
      <form onSubmit={submit} className="mt-4 grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
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
        <Button type="submit" className="w-fit gap-2" disabled={create.isPending}>
          {create.isPending ? <Spinner /> : <Send className="size-4" />}
          أرسل العرض
        </Button>
      </form>
    </section>
  );
}

// ── إجراءات صاحب الطلب والحرّاف المختار على حالة الطلب ──────────────────────
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
    <section className="rounded-xl border border-border bg-card p-4">
      <h2 className="text-sm font-bold">إجراء الحالة</h2>
      <div className="mt-3 grid gap-2.5">
        {options.map((o) => {
          const open = confirming === o.next;
          return (
            <div key={o.next} className="grid gap-2">
              <Button
                variant={o.next === "cancelled" ? "outline" : "default"}
                className={cn(
                  "w-full gap-2",
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
                <div className="rounded-lg border border-border bg-muted/50 p-3">
                  <p className="text-xs leading-relaxed text-muted-foreground">{o.hint}</p>
                  <div className="mt-2.5 flex gap-2">
                    <Button size="sm" className="gap-1.5" disabled={setStatus.isPending} onClick={() => void run(o.next)}>
                      {setStatus.isPending ? <Spinner /> : <Check className="size-3.5" />}
                      نعم، متأكّد
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setConfirming(null)}>
                      تراجع
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-[11px] leading-relaxed text-muted-foreground">{o.hint}</p>
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
      <section className="rounded-xl border border-dashed border-border bg-card/60 p-4">
        <h2 className="flex items-center gap-1.5 text-sm font-bold">
          <MessageSquare className="size-4 text-brand" />
          المحادثة
        </h2>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          تُفتح المحادثة بين الزبون والحرّاف بمجرد تقديم عرض على الطلب، وتُقصر بعد الاتفاق على الطرفين
          المتعاقدين — فلا يرى حرّافٌ محادثة منافسه.
        </p>
      </section>
    );
  }

  return (
    <section className="flex flex-col rounded-xl border border-border bg-card">
      <h2 className="flex items-center gap-1.5 border-b border-border px-4 py-3 text-sm font-bold">
        <MessageSquare className="size-4 text-brand" />
        المحادثة
        <span className="ms-auto text-[10px] font-normal text-muted-foreground">تحديث تلقائي كل 5 ثوانٍ</span>
      </h2>

      <div className="scrollbar-thin max-h-80 min-h-32 overflow-y-auto px-4 py-3">
        {q.isLoading ? (
          <div className="grid gap-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="hirfi-skeleton h-12 rounded-lg" />
            ))}
          </div>
        ) : q.isError ? (
          <p className="text-xs text-destructive">{errorMessage(q.error)}</p>
        ) : rows.length === 0 ? (
          <p className="py-2 text-center text-xs text-muted-foreground">
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
                      "max-w-[85%] rounded-xl border px-3 py-2",
                      mine ? "border-brand/25 bg-brand/10" : "border-border bg-muted/60",
                    )}
                  >
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <b className={cn("font-semibold", mine ? "text-brand-dark" : "text-foreground")}>
                        {mine ? "أنا" : m.senderName}
                      </b>
                      <span>{timeAgoAr(m.createdAt)}</span>
                    </div>
                    <p className="mt-1 text-sm leading-relaxed whitespace-pre-line">{m.body}</p>
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
          placeholder="اكتب رسالة… (Enter للإرسال من الزر)"
        />
        <Button type="submit" size="sm" className="w-fit gap-1.5" disabled={send.isPending || !body.trim()}>
          {send.isPending ? <Spinner /> : <Send className="size-3.5" />}
          إرسال
        </Button>
      </form>
    </section>
  );
}

// ── التقييم المتبادل بعد الإتمام ────────────────────────────────────────────
function ReviewPanel({
  requestId,
  counterpartId,
  onDone,
}: {
  requestId: string;
  counterpartId: string | null;
  onDone: () => void;
}) {
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
    <section className="rounded-xl border border-warn/25 bg-warn-soft/40 p-4">
      <h2 className="flex items-center gap-1.5 text-sm font-bold text-warn">
        <Star className="size-4" />
        قيّم الطرف الآخر
      </h2>
      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
        التقييم لا يظهر إلا بعد الإتمام، ويُحتسب في متوسّط تقييم الملف العام.
      </p>
      <form onSubmit={submit} className="mt-3 grid gap-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1" dir="ltr">
            {[1, 2, 3, 4, 5].map((i) => (
              <button
                key={i}
                type="button"
                onClick={() => setRating(i)}
                aria-label={`${i} من 5`}
                className="transition-transform hover:scale-110"
              >
                <svg
                  viewBox="0 0 24 24"
                  className={cn(
                    "size-7",
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
        <Button type="submit" size="sm" className="w-fit gap-1.5" disabled={create.isPending}>
          {create.isPending ? <Spinner /> : <Star className="size-3.5" />}
          أرسل التقييم
        </Button>
      </form>
      {counterpartId ? null : null}
    </section>
  );
}
