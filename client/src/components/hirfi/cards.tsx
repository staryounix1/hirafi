// ── بطاقات الطلب والعرض وشريط الحالة — بأسلوب inDrive ──────────────────────
// بطاقة العرض هنا «بطاقة صائق» من inDrive بنفس ترتيبها: السعر الضخم أوّلاً، ثم
// المسافة/التقييم/المسافة، ثم زرّان واضحان (اقبل / فاوض).
import { Link } from "wouter";
import {
  MapPin,
  Clock,
  Star,
  MessageSquare,
  Send,
  Check,
  Copy,
  CircleDollarSign,
  Hourglass,
} from "lucide-react";
import { Badge, VerifiedBadge } from "@/components/hirfi/primitives";
import {
  categoryIcon,
  madNumber,
  formatDuration,
  timeAgoAr,
  requestStatusMeta,
  offerStatusMeta,
  urgencyMeta,
  distanceBand,
  DISTANCE_LABELS,
  truncate,
  countAr,
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
  offerCount?: number;
  agreedAmount?: number | null;
}

/**
 * بطاقة طلب — قوائم الزبون، تصفّح الحرّاف، ولوحات التحكّم.
 * ترتيب inDrive: السعر الضخم في الصدر، ثم العنوان، ثم معلومات ثانوية صغيرة.
 */
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
  const amount = request.agreedAmount ?? request.budgetAmount;
  const hasAmount = amount > 0;
  const band =
    showDistance && viewerCity
      ? distanceBand(
          { city: viewerCity, district: viewerDistrict },
          { city: request.city, district: request.district },
        )
      : null;

  return (
    <article
      className="min-w-0 rounded-3xl bg-card p-4"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <Link href={href} className="block active:opacity-95">
        {/* السعر أولاً — كما في كل بطاقة inDrive */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-[16px] leading-snug font-black">{request.title}</h3>
            <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11.5px] text-muted-foreground">
              <span className="inline-flex items-center gap-1 font-bold">
                <Icon className="size-3.5" />
                {request.categoryName}
              </span>
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3.5" />
                {request.city}
                {request.district ? ` — ${request.district}` : ""}
              </span>
            </div>
          </div>
          <div className="shrink-0 text-end">
            {hasAmount ? (
              <div className="text-price text-[26px] leading-none text-foreground">{madNumber(amount)}</div>
            ) : (
              <div className="text-[15px] leading-tight font-black text-teal">بدون ميزانية</div>
            )}
            <div className="mt-1 text-[10.5px] font-bold text-muted-foreground">
              {request.agreedAmount ? "درهم — السعر المتفق عليه" : hasAmount ? "درهم — سعرك المقترح" : "الحرّاف يرسل عرضه"}
            </div>
          </div>
        </div>

        <p className="mt-2.5 text-[13px] leading-relaxed text-muted-foreground">
          {truncate(request.description, 120)}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <Badge tone={meta.tone}>{meta.label}</Badge>
          {offers > 0 ? (
            <Badge tone="teal" icon={MessageSquare}>
              {countAr(offers, ["عرض", "عرضان", "عروض"], "عرضاً")}
            </Badge>
          ) : (
            <Badge tone="muted" icon={Hourglass}>
              لا عروض بعد
            </Badge>
          )}
          {request.status === "completed" || request.status === "cancelled" ? null : (
            <Badge tone={urg.tone}>{urg.label}</Badge>
          )}
          {band ? <Badge tone={DISTANCE_LABELS[band].tone}>{DISTANCE_LABELS[band].label}</Badge> : null}
          <span className="ms-auto inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <Clock className="size-3" />
            {timeAgoAr(request.createdAt)}
          </span>
        </div>
      </Link>

      {children ? <div className="mt-3.5">{children}</div> : null}
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

/**
 * بطاقة عرض بنمط «بطاقة السائق» في inDrive: اسم + تقييم + مسافة في سطر،
 * السعر والمسافة على اليمين، وشرح العرض، ثم أزرار القرار.
 */
export function OfferCard({
  offer,
  viewerCity,
  viewerDistrict,
  agreed,
  actions,
  isCounter,
  counterOf,
}: {
  offer: OfferRow;
  viewerCity?: string | null;
  viewerDistrict?: string | null;
  /** السعر المتفق عليه نهائياً — يُبرز على البطاقة المقبولة. */
  agreed?: number | null;
  actions?: React.ReactNode;
  /** هذا عرض مضاد (ردّ الزبون على عرض الحرّاف). */
  isCounter?: boolean;
  /** السعر الأصلي الذي يردّ عليه العرض المضاد. */
  counterOf?: number | null;
}) {
  const meta = offerStatusMeta(offer.status);
  const avg = offer.providerRatingCount
    ? Math.round((offer.providerRatingSum / offer.providerRatingCount) * 10) / 10
    : null;
  const band =
    viewerCity && offer.providerCity
      ? distanceBand(
          { city: viewerCity, district: viewerDistrict },
          { city: offer.providerCity, district: offer.providerDistrict },
        )
      : null;

  return (
    <article
      className={cn(
        "rounded-3xl bg-card p-4",
        offer.status === "accepted" && "ring-2 ring-brand",
      )}
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div className="flex items-start gap-3">
        {/* صورة دائرية كبيرة — نمط بطاقات inDrive */}
        <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-full bg-secondary font-display text-[17px] font-black text-foreground">
          {offer.providerAvatarUrl ? (
            // eslint-disable-next-line jsx-a11y/img-redundant-alt
            <img src={offer.providerAvatarUrl} alt="" className="size-full object-cover" />
          ) : (
            offer.providerName.trim().charAt(0)
          )}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <Link
                  href={`/providers/${offer.providerUserId}`}
                  className="truncate text-[15px] font-black hover:underline"
                >
                  {offer.providerName}
                </Link>
                {offer.providerIsVerified ? <VerifiedBadge /> : null}
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11.5px] text-muted-foreground">
                <span className="inline-flex items-center gap-1 font-bold text-foreground">
                  <Star className="size-3 fill-warn text-warn" />
                  {avg !== null ? avg : "جديد"}
                  {offer.providerRatingCount ? (
                    <span className="font-normal text-muted-foreground">
                      ({offer.providerRatingCount})
                    </span>
                  ) : null}
                </span>
                {band ? <span className="font-bold">{DISTANCE_LABELS[band].label}</span> : null}
                <span>{countAr(offer.providerCompletedJobs, ["عمل", "عملان", "أعمال"], "عملاً")}</span>
              </div>
            </div>

            <div className="shrink-0 text-end">
              <div className="text-price text-[26px] leading-none">
                {madNumber(offer.price)}
              </div>
              <div className="mt-1 text-[10.5px] font-bold whitespace-nowrap text-muted-foreground">
                {formatDuration(offer.durationMinutes)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* مقارنة السعر في التفاوض — الفرق ظاهر كما في شاشة العرض المضاد عند inDrive */}
      {isCounter && counterOf != null ? (
        <div className="mt-3 flex items-center justify-between gap-2 rounded-2xl bg-muted px-3 py-2">
          <span className="text-[11.5px] font-bold text-muted-foreground">
            عرض الحرّاف: {madNumber(counterOf)} درهم
          </span>
          <span
            className={cn(
              "text-[12px] font-black",
              offer.price > counterOf ? "text-destructive" : "text-success",
            )}
          >
            {offer.price > counterOf ? "+" : "−"}
            {madNumber(Math.abs(offer.price - counterOf))} درهم
          </span>
        </div>
      ) : null}

      {offer.message ? (
        <p className="mt-3 rounded-2xl bg-muted/70 px-3 py-2.5 text-[13px] leading-relaxed">
          {offer.message}
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={meta.tone}>{meta.label}</Badge>
          <span className="text-[11px] text-muted-foreground">{timeAgoAr(offer.createdAt)}</span>
        </div>
        {actions ? <div className="flex w-full flex-wrap items-center gap-2">{actions}</div> : null}
      </div>

      {offer.status === "accepted" && agreed != null ? (
        <div className="mt-3 flex items-center justify-between gap-2 rounded-2xl bg-brand px-3 py-2.5">
          <span className="inline-flex items-center gap-1.5 text-[12px] font-black text-brand-ink">
            <Check className="size-4" />
            السعر النهائي المتفق عليه
          </span>
          <span className="text-price text-[19px] text-brand-ink">{madNumber(agreed)} درهم</span>
        </div>
      ) : null}
    </article>
  );
}

/**
 * شريط الحالة: منشور → عروض → مقبول → قيد التنفيذ → منتهي.
 * يُرسم كشريط أفقي بسيط بخطّ ملوّن (أخضر ليموني للمنجز) مثل تتبّع inDrive.
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
    <div className="rounded-3xl bg-card px-4 py-4" style={{ boxShadow: "var(--shadow-card)" }}>
      <ol className="flex items-start justify-between gap-1">
        {steps.map((s, i) => {
          const done = i < current && !cancelled;
          const active = i === current && !cancelled;
          return (
            <li key={s.label} className="relative flex min-w-0 flex-1 flex-col items-center gap-1.5">
              {/* خط الربط بين الحلقتين */}
              {i < steps.length - 1 ? (
                <span
                  className={cn(
                    "absolute top-[13px] h-1 w-full rounded-full",
                    i < current && !cancelled ? "bg-brand" : "bg-border",
                  )}
                  style={{ insetInlineStart: "50%", zIndex: 0 }}
                />
              ) : null}
              <span
                className={cn(
                  "relative z-10 grid size-7 shrink-0 place-items-center rounded-full border-2 transition-colors",
                  done && "border-brand bg-brand text-brand-ink",
                  active && "border-foreground bg-foreground text-background",
                  !done && !active && "border-border bg-card text-muted-foreground",
                )}
              >
                {done ? <Check className="size-3.5" strokeWidth={3} /> : <s.icon className="size-3.5" />}
              </span>
              <span
                className={cn(
                  "text-center text-[10.5px] leading-tight",
                  active && "font-black text-foreground",
                  done && "font-bold text-foreground",
                  !done && !active && "font-medium text-muted-foreground",
                )}
              >
                {s.label}
                {i === 1 && offersCount > 0 ? (
                  <span className="ms-0.5 font-black">({offersCount})</span>
                ) : null}
              </span>
            </li>
          );
        })}
      </ol>
      {cancelled ? (
        <p className="mt-3 text-center text-[12px] font-bold text-muted-foreground">
          أُلغي هذا الطلب قبل الاتفاق — يمكنك نشر طلب جديد في أي وقت.
        </p>
      ) : null}
    </div>
  );
}

/** رقم مرجعي مختصر يُنسخ بضغطة — بدل UUID كامل في الواجهة. */
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
      className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 font-mono text-[10.5px] font-bold text-muted-foreground transition-colors hover:text-foreground"
      title="انسخ الرقم المرجعي"
    >
      {short}
      <Copy className="size-3" />
    </button>
  );
}
