// ── مكوّنات الواجهة المشتركة بأسلوب inDrive ────────────────────────────────
// قواعد الأسلوب: شريحة مسطّحة بحواف كبيرة، بلا حدود ثقيلة، أرقام ضخمة الوزن،
// أيقونات كبيرة، وأزرار حبّية ارتفاعها 48–56px (هدف لمس واضح مثل inDrive).
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Loader2, AlertCircle, RefreshCw, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TONE_CLASS, type Tone } from "@/lib/format";

/** شريحة صغيرة مسطّحة — حالة، مسافة، ميزانية، فئة… */
export function Badge({
  children,
  tone = "muted",
  icon: Icon,
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold whitespace-nowrap",
        TONE_CLASS[tone],
        className,
      )}
    >
      {Icon ? <Icon className="size-3.5 shrink-0" /> : null}
      {children}
    </span>
  );
}

/** عنوان قسم — عنوان عريض كبير ووصف رمادي، كما في شرائح inDrive. */
export function SectionHeading({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-3", className)}>
      <div className="flex items-start gap-2.5">
        {Icon ? (
          <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-brand text-brand-ink">
            <Icon className="size-[18px]" />
          </span>
        ) : null}
        <div>
          <h2 className="text-[17px] leading-tight font-black">{title}</h2>
          {description ? (
            <p className="mt-1 text-[13px] leading-snug text-muted-foreground">{description}</p>
          ) : null}
        </div>
      </div>
      {action}
    </div>
  );
}

/**
 * حالة فارغة مصمّمة — كل قائمة في التطبيق تمرّ من هنا قبل أن تنمو بياناتها:
 * نقول ما هذه الشاشة، ولماذا هي فارغة، وما الإجراء الذي يملؤها.
 */
export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  onAction,
  actionHref,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  actionHref?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-3xl bg-muted/60 px-6 py-12 text-center",
        className,
      )}
    >
      <span className="grid size-16 place-items-center rounded-3xl bg-brand text-brand-ink">
        <Icon className="size-8" />
      </span>
      <h3 className="mt-4 text-[17px] font-black">{title}</h3>
      <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-balance text-muted-foreground">
        {description}
      </p>
      {actionLabel ? (
        <Button className="mt-5" size="lg" onClick={onAction} asChild={!!actionHref}>
          {actionHref ? <a href={actionHref}>{actionLabel}</a> : actionLabel}
        </Button>
      ) : null}
    </div>
  );
}

/** خطأ قابل للنقر لإعادة المحاولة — لا شاشة بيضاء ولا استثناء غير مُلتقَط. */
export function ErrorState({
  message,
  onRetry,
  className,
}: {
  message: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-3xl bg-destructive/8 px-6 py-10 text-center",
        className,
      )}
    >
      <span className="grid size-14 place-items-center rounded-3xl bg-destructive/12 text-destructive">
        <AlertCircle className="size-7" />
      </span>
      <h3 className="mt-3 text-[16px] font-black text-destructive">تعذّر تحميل البيانات</h3>
      <p className="mt-1 max-w-sm text-[13px] text-balance text-muted-foreground">{message}</p>
      {onRetry ? (
        <Button variant="secondary" size="lg" className="mt-4 gap-1.5" onClick={onRetry}>
          <RefreshCw className="size-4" />
          إعادة المحاولة
        </Button>
      ) : null}
    </div>
  );
}

/** هيكل تحميل على شكل بطاقة — يحجز نفس ارتفاع البطاقة الحقيقية. */
export function CardSkeleton({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("rounded-3xl bg-card p-5", className)} style={{ boxShadow: "var(--shadow-card)" }}>
      <div className="hirfi-skeleton h-5 w-1/3 rounded-full" />
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="hirfi-skeleton mt-3 h-3.5 rounded-full"
          style={{ width: `${92 - i * 14}%` }}
        />
      ))}
    </div>
  );
}

/** قائمة هياكل — تُستعمل بدل فراغ التحميل. */
export function ListSkeleton({ count = 3, lines = 3 }: { count?: number; lines?: number }) {
  return (
    <div className="grid gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} lines={lines} />
      ))}
    </div>
  );
}

/** دوران صغير للحالات الجزئية (أزرار، شرائط). */
export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("size-4 animate-spin", className)} />;
}

/** حقل بملء الشريحة: أيقونة + تسمية صغيرة، بلا حدود — نمط inDrive في النماذج. */
export function FieldRow({
  icon: Icon,
  label,
  children,
  divider = true,
}: {
  icon?: LucideIcon;
  label: string;
  children: ReactNode;
  divider?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 py-3">
      {Icon ? <Icon className="size-5 shrink-0 text-muted-foreground" /> : null}
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-bold text-muted-foreground">{label}</div>
        <div className="mt-0.5">{children}</div>
      </div>
      {divider ? null : null}
    </div>
  );
}

/** حقل نموذج مع تسمية ورسالة خطأ. */
export function Field({
  label,
  hint,
  error,
  required,
  children,
  className,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-1.5", className)}>
      <label className="text-[13px] font-bold">
        {label}
        {required ? <span className="ms-1 text-brand-dark">*</span> : null}
      </label>
      {hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
      {children}
      {error ? <p className="text-[11px] font-bold text-destructive">{error}</p> : null}
    </div>
  );
}

/** بطاقة إحصاء — رقم ضخم في الأعلى كما في بطاقات inDrive الرقمية. */
export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = "brand",
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  hint?: string;
  tone?: Tone;
}) {
  return (
    <div className="rounded-3xl bg-card p-4" style={{ boxShadow: "var(--shadow-card)" }}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold text-muted-foreground">{label}</span>
        <span className={cn("grid size-8 place-items-center rounded-full", TONE_CLASS[tone])}>
          <Icon className="size-4" />
        </span>
      </div>
      <div className="text-price mt-2 text-3xl leading-none">{value}</div>
      {hint ? <p className="mt-2 text-[11px] leading-snug text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

/** نجوم التقييم (قراءة فقط) — ذهبية ممتلئة مثل inDrive. */
export function Stars({ value, size = "md" }: { value: number; size?: "sm" | "md" | "lg" }) {
  const box = size === "lg" ? "size-6" : size === "sm" ? "size-3" : "size-3.5";
  return (
    <span className="inline-flex items-center gap-0.5" dir="ltr" aria-label={`${value} من 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          viewBox="0 0 24 24"
          className={cn(
            box,
            i <= Math.round(value) ? "fill-warn text-warn" : "fill-transparent text-border",
          )}
          strokeWidth={1.6}
          stroke="currentColor"
        >
          <path d="M12 2.6l2.9 5.9 6.5.95-4.7 4.6 1.1 6.45L12 17.45 6.2 20.5l1.1-6.45-4.7-4.6 6.5-.95z" />
        </svg>
      ))}
    </span>
  );
}

/** نجوم قابلة للنقر — شاشة التقييم بعد الإتمام. */
export function StarPicker({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-center gap-2" dir="ltr">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          disabled={disabled}
          onClick={() => onChange(i)}
          aria-label={`${i} من 5`}
          className="transition-transform active:scale-90 disabled:opacity-50"
        >
          <svg
            viewBox="0 0 24 24"
            className={cn(
              "size-11",
              i <= value ? "fill-warn text-warn" : "fill-transparent text-border",
            )}
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path d="M12 2.6l2.9 5.9 6.5.95-4.7 4.6 1.1 6.45L12 17.45 6.2 20.5l1.1-6.45-4.7-4.6 6.5-.95z" />
          </svg>
        </button>
      ))}
    </div>
  );
}

/** شارة «موثّق» — تُقلب من الملف الشخصي (لا رفع مستندات في هذا النطاق). */
export function VerifiedBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-teal px-2 py-0.5 text-[10px] font-bold text-background",
        className,
      )}
      title="هوية موثّقة من إدارة المنصّة"
    >
      <svg viewBox="0 0 24 24" className="size-3 fill-current">
        <path d="M12 1.8l2.5 1.9 3.1-.2 1.05 2.95 2.6 1.75-1.05 2.95 1.05 2.95-2.6 1.75-1.05 2.95-3.1-.2L12 22.2l-2.5-1.9-3.1.2-1.05-2.95L2.75 15.8l1.05-2.95-1.05-2.95 2.6-1.75L6.4 5.2l3.1.2z" />
        <path d="M10.6 15.4l-2.9-2.9 1.3-1.3 1.6 1.6 4.4-4.4 1.3 1.3z" fill="var(--background)" />
      </svg>
      موثّق
    </span>
  );
}

/** رأس صفحة موحّد: عنوان ضخم + وصف + إجراء. */
export function PageHeader({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-3 px-4 pt-5">
      <div className="flex min-w-0 items-start gap-3">
        {Icon ? (
          <span className="mt-0.5 grid size-11 shrink-0 place-items-center rounded-2xl bg-brand text-brand-ink">
            <Icon className="size-5.5" />
          </span>
        ) : null}
        <div className="min-w-0">
          <h1 className="text-[26px] leading-tight font-black">{title}</h1>
          {description ? (
            <p className="mt-1.5 max-w-2xl text-[13px] text-balance text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {action}
    </header>
  );
}

/** شريط صفقات سريعة (Chip) — للفلاتر والاختيارات، كما في شرائح inDrive. */
export function Chip({
  active,
  children,
  icon: Icon,
  onClick,
  className,
}: {
  active?: boolean;
  children: ReactNode;
  icon?: LucideIcon;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-bold whitespace-nowrap transition-colors",
        active
          ? "bg-foreground text-background"
          : "bg-muted text-foreground hover:bg-secondary",
        className,
      )}
    >
      {Icon ? <Icon className="size-4" /> : null}
      {children}
    </button>
  );
}

/** مؤشّر حالة مباشرة — نقطة خضراء نابضة + نصّ، كما في «جارٍ البحث» عند inDrive. */
export function LiveDot({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-brand px-3 py-1.5 text-[12px] font-black text-brand-ink">
      <span className="relative flex size-2.5">
        <span className="hirfi-ping absolute inline-flex size-full rounded-full bg-brand-ink/60" />
        <span className="relative inline-flex size-2.5 rounded-full bg-brand-ink" />
      </span>
      {label}
    </span>
  );
}
