// ── بطاقات الطلب والعرض وشريط الحياة ───────────────────────────────────────────
import { Link } from "wouter";
import {
  MapPin,
  Clock,
  CircleDollarSign,
  MessageSquare,
  Star,
  Send,
  Check,
  Hourglass,
  Copy,
} from "lucide-react";
import { Badge, VerifiedBadge } from "@/components/hirfi/primitives";
import {
  categoryIcon,
  formatMAD,
  formatDuration,
  timeAgoAr,
  requestStatusMeta,
  offerStatusMeta,
  urgencyMeta,
  distanceBand,
  DISTANCE_LABELS,
  truncate,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";

/** مقتطف الطلب كما تحتاجه البطاقة في كل القوائم. */
export interface RequestCardData {
  id: string;
  title: string;
  description: string;
  categoryName: string;
  categoryIcon: string;
  budgetAmount: number;
  city: string;
  district: string;
  urgency: string;
  status: string;
  createdAt: Date | string;
  /** غير موجود في مسارات لا تحسبه (مثل الطلبات المقبولة عند الحرّاف). */
  offerCount?: number;
  agreedAmount?: number | null;
}

/** بطاقة طلب — قوائم الزبون، تصفّح الحرّاف، ولوحات التحكم. */
export function RequestCard({
  request,
  href,
  viewerCity,
  viewerDistrict,
  showDistance,
  children,
}: {
  request: RequestCardData;
  href: string;
  viewerCity?: string | null;
  viewerDistrict?: string | null;
  showDistance?: boolean;
  children?: React.ReactNode;
}) {
  const Icon = categoryIcon(request.categoryIcon);
  const meta = requestStatusMeta(request.status);
  const urg = urgencyMeta(request.urgency);
  const offers = request.offerCount ?? 0;
  const band =
    showDistance && viewerCity
      ? distanceBand(
          { city: viewerCity, district: viewerDistrict },
          { city: request.city, district: request.district },
        )
      : null;

  return (
    <article className="card-warm group rounded-xl border border-border bg-card p-4 transition-colors hover:border-brand/40 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-brand/10 text-brand-dark">
          <Icon className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <Link href={href} className="min-w-0">
              <h3 className="text-base leading-snug font-bold group-hover:text-brand-dark">
                {request.title}
              </h3>
            </Link>
            <Badge tone={meta.tone} icon={meta.icon}>
              {meta.label}
            </Badge>
          </div>

          <p className="mt-1.5 text-sm text-muted-foreground">
            {truncate(request.description, 130)}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Icon className="size-3.5" />
              {request.categoryName}
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3.5" />
              {request.city} — {request.district}
            </span>
            <span className="inline-flex items-center gap-1 font-semibold text-foreground">
              <CircleDollarSign className="size-3.5 text-brand" />
              {formatMAD(request.agreedAmount ?? request.budgetAmount)}
              <span className="text-[10px] font-normal text-muted-foreground">
                {request.agreedAmount ? "(متفق عليه)" : "(مقترح)"}
              </span>
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3.5" />
              {timeAgoAr(request.createdAt)}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {offers > 0 ? (
              <Badge tone="brand" icon={MessageSquare}>
                {offers} عرض
              </Badge>
            ) : (
              <Badge tone="muted" icon={Hourglass}>
                لا عروض بعد
              </Badge>
            )}
            {/* شارة الاستعجال تفقد معناها بعد الإتمام أو الإلغاء — فلا تُعرض على طلب منتهٍ. */}
            {request.status === "completed" || request.status === "cancelled" ? null : (
              <Badge tone={urg.tone}>{urg.label}</Badge>
            )}
            {band ? (
              <Badge tone={DISTANCE_LABELS[band].tone} icon={MapPin}>
                {DISTANCE_LABELS[band].label}
              </Badge>
            ) : null}
          </div>

          {children ? <div className="mt-3.5">{children}</div> : null}
        </div>
      </div>
    </article>
  );
}

/** عرض كما يُعاد في الشاشة الموحّدة. */
export interface OfferRow {
  id: string;
  providerUserId: string;
  price: number;
  durationMinutes: number;
  message: string;
  status: string;
  parentOfferId: string | null;
  createdAt: Date | string;
  providerName: string;
  providerCity: string;
  providerDistrict: string | null;
  providerIsVerified: boolean;
  providerRatingSum: number;
  providerRatingCount: number;
  providerCompletedJobs: number;
  providerAvatarUrl: string | null;
}

/** بطاقة عرض — أزرار القرار تُمرَّر من الشاشة الأب حسب الدور والحالة. */
export function OfferCard({ offer, actions }: { offer: OfferRow; actions?: React.ReactNode }) {
  const meta = offerStatusMeta(offer.status);
  const avg = offer.providerRatingCount
    ? Math.round((offer.providerRatingSum / offer.providerRatingCount) * 10) / 10
    : null;

  return (
    <article
      className={cn(
        "rounded-xl border bg-card p-4",
        offer.status === "accepted" ? "border-success/40 bg-success-soft/40" : "border-border",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-teal-soft font-display text-sm font-bold text-teal">
            {offer.providerName.trim().charAt(0)}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <Link
                href={`/providers/${offer.providerUserId}`}
                className="text-sm font-bold hover:text-brand-dark"
              >
                {offer.providerName}
              </Link>
              {offer.providerIsVerified ? <VerifiedBadge /> : null}
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3" />
                {offer.providerCity}
                {offer.providerDistrict ? ` — ${offer.providerDistrict}` : ""}
              </span>
              <span className="inline-flex items-center gap-1">
                <Star className="size-3" />
                {avg !== null ? `${avg} (${offer.providerRatingCount})` : "بلا تقييم"}
              </span>
              <span>{offer.providerCompletedJobs} عمل منجز</span>
            </div>
          </div>
        </div>
        <div className="shrink-0 text-end">
          <div className="font-display text-lg leading-none font-extrabold text-brand-dark">
            {formatMAD(offer.price)}
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            {formatDuration(offer.durationMinutes)}
          </div>
        </div>
      </div>

      <p className="mt-3 rounded-lg bg-muted/60 px-3 py-2 text-sm leading-relaxed">
        {offer.message}
      </p>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={meta.tone} icon={meta.icon}>
            {meta.label}
          </Badge>
          <span className="text-xs text-muted-foreground">{timeAgoAr(offer.createdAt)}</span>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </article>
  );
}

/**
 * شريط الحياة: منشور → عروض → مقبول → قيد التنفيذ → منتهي.
 * الخطوة الحاضرة بلون العلامة والمنجزة عليها علامة صح. الإيقاع من اليمين لليسار.
 */
export function LifecycleBar({
  status,
  hasOffers,
  offersCount,
}: {
  status: string;
  hasOffers: boolean;
  offersCount: number;
}) {
  const cancelled = status === "cancelled";
  const current =
    status === "open"
      ? hasOffers
        ? 1
        : 0
      : status === "accepted"
        ? 2
        : status === "in_progress"
          ? 3
          : status === "completed"
            ? 4
            : 0;

  const steps = [
    { label: "منشور", icon: Send },
    { label: "عروض", icon: CircleDollarSign },
    { label: "مقبول", icon: Check },
    { label: "قيد التنفيذ", icon: Hourglass },
    { label: "منتهي", icon: Star },
  ];

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card px-3 py-3.5">
      <ol className="flex min-w-max items-center gap-1">
        {steps.map((s, i) => {
          const done = i < current && !cancelled;
          const active = i === current && !cancelled;
          return (
            <li key={s.label} className="flex items-center gap-1">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "grid size-7 shrink-0 place-items-center rounded-full border transition-colors",
                    done && "border-success/40 bg-success text-white",
                    active && "border-brand bg-brand text-white",
                    !done && !active && "border-border bg-muted text-muted-foreground",
                  )}
                >
                  {done ? <Check className="size-3.5" /> : <s.icon className="size-3.5" />}
                </span>
                <span
                  className={cn(
                    "text-xs font-semibold whitespace-nowrap",
                    active && "text-brand-dark",
                    done && "text-success",
                    !done && !active && "text-muted-foreground",
                  )}
                >
                  {s.label}
                  {i === 1 && offersCount > 0 ? (
                    <span className="ms-1 text-[10px] font-normal">({offersCount})</span>
                  ) : null}
                </span>
              </div>
              {i < steps.length - 1 ? (
                <span
                  className={cn(
                    "mx-0.5 h-0.5 w-5 rounded-full sm:w-8",
                    i < current && !cancelled ? "bg-success/50" : "bg-border",
                  )}
                />
              ) : null}
            </li>
          );
        })}
      </ol>
      {cancelled ? (
        <p className="mt-2.5 text-xs font-medium text-muted-foreground">
          أُلغي هذا الطلب قبل الاتفاق — يمكنك نشر طلب جديد في أي وقت.
        </p>
      ) : null}
    </div>
  );
}

/** رقم مرجعي مختصر يُنسَخ بضغطة — بدل UUID كامل في الواجهة. */
export function RefCode({ id }: { id: string }) {
  const short = `#${id.slice(0, 6).toUpperCase()}`;
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(short);
          toast.success(`نُسخ الرقم المرجعي ${short}`);
        } catch {
          toast.error("تعذّر النسخ — انسخه يدوياً");
        }
      }}
      className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/60 px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground transition-colors hover:text-foreground"
      title="انسخ الرقم المرجعي"
    >
      {short}
      <Copy className="size-3" />
    </button>
  );
}
