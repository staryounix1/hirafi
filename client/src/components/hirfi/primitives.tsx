// ── مكوّنات الواجهة المشتركة: شارات، حالات فارغة، هياكل تحميل، تنبيهات ──────────
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Loader2, AlertCircle, RefreshCw, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TONE_CLASS, type Tone } from "@/lib/format";

/** شريحة صغيرة ملوّنة — حالة، مسافة، ميزانية، فئة… */
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
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        TONE_CLASS[tone],
        className,
      )}
    >
      {Icon ? <Icon className="size-3.5 shrink-0" /> : null}
      {children}
    </span>
  );
}

/** عنوان قسم مع وصف اختياري — يوحّد الإيقاع الرأسي في كل الصفحات. */
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
          <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-brand/10 text-brand-dark">
            <Icon className="size-4" />
          </span>
        ) : null}
        <div>
          <h2 className="text-lg leading-tight font-bold">{title}</h2>
          {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
        </div>
      </div>
      {action}
    </div>
  );
}

/**
 * حالة فارغة مُصمَّمة — كل قائمة في التطبيق تمرّ من هنا قبل أن تنمو بياناتها:
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
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/60 px-6 py-12 text-center",
        className,
      )}
    >
      <span className="grid size-14 place-items-center rounded-2xl bg-brand/10 text-brand-dark">
        <Icon className="size-7" />
      </span>
      <h3 className="mt-4 text-base font-bold">{title}</h3>
      <p className="mt-1.5 max-w-md text-sm text-balance text-muted-foreground">{description}</p>
      {actionLabel ? (
        <Button className="mt-5" onClick={onAction} asChild={!!actionHref}>
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
        "flex flex-col items-center justify-center rounded-xl border border-destructive/25 bg-destructive/5 px-6 py-10 text-center",
        className,
      )}
    >
      <span className="grid size-12 place-items-center rounded-2xl bg-destructive/10 text-destructive">
        <AlertCircle className="size-6" />
      </span>
      <h3 className="mt-3 text-base font-bold text-destructive">تعذّر تحميل البيانات</h3>
      <p className="mt-1 max-w-md text-sm text-balance text-muted-foreground">{message}</p>
      {onRetry ? (
        <Button variant="outline" size="sm" className="mt-4 gap-1.5" onClick={onRetry}>
          <RefreshCw className="size-3.5" />
          إعادة المحاولة
        </Button>
      ) : null}
    </div>
  );
}

/** هيكل تحميل على شكل بطاقة — يحجُز نفس ارتفاع البطاقة الحقيقية. */
export function CardSkeleton({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("rounded-xl border border-border bg-card p-5", className)}>
      <div className="hirfi-skeleton h-4 w-1/3 rounded" />
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="hirfi-skeleton mt-3 h-3 rounded"
          style={{ width: `${92 - i * 14}%` }}
        />
      ))}
    </div>
  );
}

/** قائمة هياكل — للاستعمال بدل فراغ التحميل. */
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

/** حقل نموذج مع تسمية ورسالة خطأ — يمنع تكرار الهيكل في كل نموذج. */
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
      <label className="text-sm font-semibold">
        {label}
        {required ? <span className="ms-1 text-brand">*</span> : null}
      </label>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      {children}
      {error ? <p className="text-xs font-medium text-destructive">{error}</p> : null}
    </div>
  );
}

/** بطاقة إحصاء للوحات التحكم والمحفظة. */
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
    <div className="card-warm rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span
          className={cn(
            "grid size-8 place-items-center rounded-lg border",
            TONE_CLASS[tone],
          )}
        >
          <Icon className="size-4" />
        </span>
      </div>
      <div className="mt-2 font-display text-2xl leading-none font-extrabold">{value}</div>
      {hint ? <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

/** نجوم التقييم (قراءة فقط). */
export function Stars({ value, size = "md" }: { value: number; size?: "sm" | "md" | "lg" }) {
  const box = size === "lg" ? "size-5" : size === "sm" ? "size-3" : "size-3.5";
  return (
    <span className="inline-flex items-center gap-0.5" dir="ltr" aria-label={`${value} من 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          viewBox="0 0 24 24"
          className={cn(box, i <= Math.round(value) ? "fill-warn text-warn" : "fill-transparent text-border")}
          strokeWidth={1.6}
          stroke="currentColor"
        >
          <path d="M12 2.6l2.9 5.9 6.5.95-4.7 4.6 1.1 6.45L12 17.45 6.2 20.5l1.1-6.45-4.7-4.6 6.5-.95z" />
        </svg>
      ))}
    </span>
  );
}

/** شارة «موثّق» — تُقلب من الملف الشخصي (لا رفع مستندات في هذا النطاق). */
export function VerifiedBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-teal/25 bg-teal-soft px-2 py-0.5 text-xs font-semibold text-teal",
        className,
      )}
      title="هوية موثّقة من إدارة المنصّة"
    >
      <svg viewBox="0 0 24 24" className="size-3.5 fill-current">
        <path d="M12 2l2.4 1.8 3-.2 1 2.85 2.5 1.7-1 2.85 1 2.85-2.5 1.7-1 2.85-3-.2L12 22l-2.4-1.8-3 .2-1-2.85L3.1 15.85l1-2.85-1-2.85 2.5-1.7 1-2.85 3 .2z" />
        <path d="M10.6 15.4l-2.9-2.9 1.3-1.3 1.6 1.6 4.4-4.4 1.3 1.3z" fill="white" />
      </svg>
      موثّق
    </span>
  );
}

/** رأس صفحة موحّد: أيقونة + عنوان + وصف + إجراء. */
export function PageHeader({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-3 pt-2">
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand/12 text-brand-dark">
          <Icon className="size-5.5" />
        </span>
        <div>
          <h1 className="text-xl leading-tight font-extrabold sm:text-2xl">{title}</h1>
          {description ? (
            <p className="mt-1 max-w-2xl text-sm text-balance text-muted-foreground">{description}</p>
          ) : null}
        </div>
      </div>
      {action}
    </header>
  );
}
