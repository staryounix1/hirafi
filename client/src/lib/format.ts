// ── تنسيقات ومفردات المجال في الواجهة ────────────────────────────────────────
import type { LucideIcon } from "lucide-react";
import {
  Wrench,
  Zap,
  Hammer,
  PaintRoller,
  Snowflake,
  Sparkles,
  Truck,
  Smartphone,
  Scissors,
  Camera,
  GraduationCap,
  Settings,
  CircleDollarSign,
  CheckCircle2,
  Hourglass,
  Ban,
  AlertCircle,
  Send,
  XCircle,
} from "lucide-react";

/** خريطة أيقونات الفئات — المفتاح هو ما يُخزَّن في service_categories.icon. */
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Wrench,
  Zap,
  Hammer,
  PaintRoller,
  Snowflake,
  Sparkles,
  Truck,
  Smartphone,
  Scissors,
  Camera,
  GraduationCap,
  Settings,
};

export function categoryIcon(name: string | null | undefined): LucideIcon {
  return (name && CATEGORY_ICONS[name]) || Settings;
}

/** رقم بفواصل آلاف + كلمة العملة — `1 250 درهم`. */
export function formatMAD(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return "—";
  return `${new Intl.NumberFormat("fr-MA", { maximumFractionDigits: 0 }).format(amount)} درهم`;
}

/**
 * مدة بالدقائق ← نص مقروء بالعربية الفصيحة.
 * يراعي صيغ العدد: 1 مفرد، 2 مثنّى، 3–10 جمع، 11+ تمييز مفرد.
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return countAr(minutes, ["دقيقة", "دقيقتان", "دقائق"], "دقيقة", "واحدة");
  }
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h >= 24) {
    const d = Math.floor(h / 24);
    const rh = h % 24;
    const days = countAr(d, ["يوم", "يومان", "أيام"], "يوماً");
    return rh ? `${days} و${countAr(rh, ["ساعة", "ساعتان", "ساعات"], "ساعة", "واحدة")}` : days;
  }
  const hours = countAr(h, ["ساعة", "ساعتان", "ساعات"], "ساعة", "واحدة");
  return m ? `${hours} و${countAr(m, ["دقيقة", "دقيقتان", "دقائق"], "دقيقة", "واحدة")}` : hours;
}

/** «منذ 3 ساعات» بصيغ الجمع العربية الصحيحة (2 ← ساعتين، 11+ ← ساعة). */
export function timeAgoAr(input: Date | string | number): string {
  const then = new Date(input).getTime();
  const diff = Math.max(0, Date.now() - then);
  const min = Math.floor(diff / 60000);
  if (min < 1) return "الآن";
  if (min < 60) return `منذ ${countAr(min, ["دقيقة", "دقيقتين", "دقائق"], "دقيقة", "واحدة")}`;
  const h = Math.floor(min / 60);
  if (h < 24) return `منذ ${countAr(h, ["ساعة", "ساعتين", "ساعات"], "ساعة", "واحدة")}`;
  const d = Math.floor(h / 24);
  if (d < 30) return `منذ ${countAr(d, ["يوم", "يومين", "أيام"], "يوماً")}`;
  const mo = Math.floor(d / 30);
  return `منذ ${countAr(mo, ["شهر", "شهرين", "أشهر"], "شهراً")}`;
}

/** تاريخ مختصر بالعربية — `22 شتنبر 2026`. */
export function formatDateAr(input: Date | string | number | null | undefined): string {
  if (!input) return "غير محدّد";
  return new Intl.DateTimeFormat("ar-MA", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Africa/Casablanca",
  }).format(new Date(input));
}

export function formatDateTimeAr(input: Date | string | number | null | undefined): string {
  if (!input) return "غير محدّد";
  return new Intl.DateTimeFormat("ar-MA", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Casablanca",
  }).format(new Date(input));
}

/** نسبة عربية للعدد (١٠٪ → 10%) — تُستعمل للعرض فقط. */
export function percentOf(part: number, whole: number): number {
  if (!whole) return 0;
  return Math.round((part / whole) * 100);
}

/** متوسّط التقييم من مجموع/عدد (بدل عمود محسوب على الخادم). */
export function ratingAvg(sum: number, count: number): number | null {
  if (!count) return null;
  return Math.round((sum / count) * 10) / 10;
}

export type Tone = "brand" | "teal" | "success" | "warn" | "danger" | "muted" | "info";

/** شرائح inDrive مسطّحة بلا حدود مرئية: خلفية فاتحة + نصّ داكن فقط. */
export const TONE_CLASS: Record<Tone, string> = {
  brand: "bg-brand text-brand-ink border-transparent",
  teal: "bg-teal-soft text-teal border-transparent",
  success: "bg-success-soft text-success border-transparent",
  warn: "bg-warn-soft text-warn border-transparent",
  danger: "bg-destructive/12 text-destructive border-transparent",
  muted: "bg-muted text-muted-foreground border-transparent",
  info: "bg-info-soft text-info border-transparent",
};

/** الرقم وحده بلا كلمة العملة — للأسعار الضخمة في بطاقات العروض والطلبات. */
export function madNumber(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return "—";
  return new Intl.NumberFormat("fr-MA", { maximumFractionDigits: 0 }).format(amount);
}

/** فرق السعر بين العرض والسعر المضاد — يُعرض في شاشة التفاوض. */
export function priceDelta(from: number, to: number): { abs: number; pct: number; up: boolean } {
  const abs = Math.round(Math.abs(to - from));
  const pct = from ? Math.round((abs / from) * 100) : 0;
  return { abs, pct, up: to > from };
}

/** حالة الطلب ← تسمية ورمز ولون وشريح أيقونة. */
export interface StatusMeta {
  label: string;
  tone: Tone;
  icon: LucideIcon;
}

export const REQUEST_STATUS_META: Record<string, StatusMeta> = {
  open: { label: "منشور — ينتظر عروضاً", tone: "brand", icon: Send },
  accepted: { label: "مقبول — تم الاتفاق", tone: "teal", icon: CheckCircle2 },
  in_progress: { label: "قيد التنفيذ", tone: "warn", icon: Hourglass },
  completed: { label: "منتهي", tone: "success", icon: CheckCircle2 },
  cancelled: { label: "ملغى", tone: "muted", icon: Ban },
};

export function requestStatusMeta(status: string): StatusMeta {
  return REQUEST_STATUS_META[status] ?? { label: status, tone: "muted", icon: AlertCircle };
}

/** شريط الحياة المعروض في الشاشة الموحّدة: منشور → عروض → مقبول → قيد التنفيذ → منتهي. */
export const LIFECYCLE_STEPS = [
  { key: "open", label: "منشور", icon: Send },
  { key: "offers", label: "عروض", icon: CircleDollarSign },
  { key: "accepted", label: "مقبول", icon: CheckCircle2 },
  { key: "in_progress", label: "قيد التنفيذ", icon: Hourglass },
  { key: "completed", label: "منتهي", icon: CheckCircle2 },
] as const;

/** أي خطوة في الشريط صارت حاضرة بحسب حالة الطلب وعدد العروض. */
export function lifecycleIndex(status: string, hasOffers: boolean): number {
  switch (status) {
    case "open":
      return hasOffers ? 1 : 0;
    case "accepted":
      return 2;
    case "in_progress":
      return 3;
    case "completed":
      return 4;
    default:
      return 0;
  }
}

export const OFFER_STATUS_META: Record<string, StatusMeta> = {
  pending: { label: "بانتظار ردّ الزبون", tone: "brand", icon: Hourglass },
  countered: { label: "عرض مضاد — تفاوض", tone: "warn", icon: CircleDollarSign },
  accepted: { label: "مقبول", tone: "success", icon: CheckCircle2 },
  rejected: { label: "لم يُقبل", tone: "muted", icon: XCircle },
  withdrawn: { label: "مسحوب", tone: "muted", icon: Ban },
};

export function offerStatusMeta(status: string): StatusMeta {
  return OFFER_STATUS_META[status] ?? { label: status, tone: "muted", icon: AlertCircle };
}

export const URGENCY_META: Record<string, { label: string; tone: Tone }> = {
  flexible: { label: "مرن في الوقت", tone: "muted" },
  today: { label: "اليوم", tone: "warn" },
  urgent: { label: "عاجل جداً", tone: "danger" },
};

export function urgencyMeta(u: string) {
  return URGENCY_META[u] ?? { label: u, tone: "muted" as Tone };
}

export const WALLET_TYPE_META: Record<string, { label: string; tone: Tone; sign: "+" | "-" }> = {
  payment: { label: "دفع", tone: "danger", sign: "-" },
  payout: { label: "استحقاق", tone: "success", sign: "+" },
  fee: { label: "عمولة المنصّة", tone: "warn", sign: "-" },
  refund: { label: "استرجاع", tone: "info", sign: "+" },
  topup: { label: "إيداع", tone: "teal", sign: "+" },
};

export function walletTypeMeta(t: string) {
  return WALLET_TYPE_META[t] ?? { label: t, tone: "muted" as Tone, sign: "+" as const };
}

export const DISTANCE_LABELS: Record<string, { label: string; hint: string; tone: Tone }> = {
  near: { label: "قريب", hint: "نفس الحي", tone: "success" },
  medium: { label: "متوسط", hint: "نفس المدينة", tone: "warn" },
  far: { label: "بعيد", hint: "مدينة أخرى", tone: "muted" },
};

/** يحسب بند المسافة بين موقعين (تقديري — لا خرائط). */
export function distanceBand(
  a: { city: string; district?: string | null },
  b: { city: string; district?: string | null },
): "near" | "medium" | "far" {
  if (a.city !== b.city) return "far";
  if (a.district && b.district && a.district === b.district) return "near";
  return "medium";
}

/** قصّ نص طويل مع إضافة نقاط. */
export function truncate(s: string, n: number): string {
  return s.length <= n ? s : `${s.slice(0, n).trimEnd()}…`;
}

/** رسالة خطأ عربية من أي خطأ tRPC — بلا تفاصيل تقنية. */
export function errorMessage(e: unknown): string {
  if (typeof e === "object" && e && "message" in e) {
    const m = String((e as { message?: unknown }).message ?? "");
    if (m && !m.includes("TRPCClientError") && m.length < 240) return m;
  }
  return "حدث خطأ غير متوقّع. حاول مرة أخرى.";
}

/**
 * عدّ اسم بالعربية الصحيحة: 0 → «لا مفرد»، 1 → مفرد، 2 → مثنّى، 3–10 → جمع، 11+ → تمييز مفرد.
 * مثال: countAr(9, ["حركة", "حركتان", "حركات"], "حركة") → «9 حركات»
 */
export function countAr(
  n: number,
  forms: [string, string, string],
  many: string,
  /** صيغة المفرد المُعدود به: «واحد» للمذكر، «واحدة» للمؤنث (دقيقة، ساعة، حركة). */
  one = "واحد",
): string {
  if (n === 0) return `لا ${forms[0]}`;
  if (n === 1) return `${forms[0]} ${one}`;
  if (n === 2) return forms[1];
  if (n <= 10) return `${n} ${forms[2]}`;
  return `${n} ${many}`;
}
