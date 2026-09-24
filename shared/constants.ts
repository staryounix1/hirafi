// Shared client/server constants + domain vocabularies for «حِرْفي».

// Session cookie name is per-app (derived from APP_SLUG) so two apps served on
// the same host cannot clobber each other's session cookie (DESIGN #13).
export function sessionCookieName(slug: string): string {
  return `app_session_${slug}`;
}

export const USER_ROLES = ["user", "admin"] as const;
// Platform-level role kept separate from the BUSINESS role (`customer` | `provider`),
// which lives on provider_profiles.role so switching it never touches auth.
export type UserRole = (typeof USER_ROLES)[number];

export const APP_ROLES = ["customer", "provider"] as const;
/** BUSINESS role: طالب الخدمة (زبون) أو مقدّمها (حرّاف). */
export type AppRole = (typeof APP_ROLES)[number];

export const REQUEST_STATUSES = [
  "open",
  "accepted",
  "in_progress",
  "completed",
  "cancelled",
] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

/** شريط الحياة المرئي: منشور → عروض → مقبول → قيد التنفيذ → منتهي. */
export const REQUEST_LIFECYCLE = [
  { key: "open", labelAr: "منشور" },
  { key: "offers", labelAr: "عروض" },
  { key: "accepted", labelAr: "مقبول" },
  { key: "in_progress", labelAr: "قيد التنفيذ" },
  { key: "completed", labelAr: "منتهي" },
] as const;

export const OFFER_STATUSES = [
  "pending",
  "accepted",
  "rejected",
  "withdrawn",
  "countered",
] as const;
export type OfferStatus = (typeof OFFER_STATUSES)[number];

export const URGENCIES = ["flexible", "today", "urgent"] as const;
export type Urgency = (typeof URGENCIES)[number];

export const WALLET_TYPES = ["payment", "payout", "fee", "refund", "topup"] as const;
export type WalletType = (typeof WALLET_TYPES)[number];

/**
 * عمولة المنصة `حِرْفي` (نسبة مئوية) — يدفعها **الحرّاف** من محفظته لحظة قبول
 * الزبون لعرضه. الزبون لا يدفع شيئاً عبر المنصة: يدفع الحرّاف مباشرة بعد إتمام
 * الخدمة، والمنصة تكتفي بتحصيل عمولتها من رصيد الحرّاف.
 */
export const PLATFORM_FEE_PERCENT = 15;

/** مدن مغربية + أحياء مبسّطة (لا خرائط — القرار الافتراضي في المواصفة). */
export const MOROCCAN_CITIES = [
  "الدار البيضاء",
  "الرباط",
  "سلا",
  "مراكش",
  "طنجة",
  "فاس",
  "أكادير",
  "مكناس",
  "وجدة",
] as const;
export type MoroccanCity = (typeof MOROCCAN_CITIES)[number];

export const DISTRICTS_BY_CITY: Record<string, string[]> = {
  "الدار البيضاء": ["المعاريف", "عين الشق", "سيدي معروف", "الحي الحسني", "بوركون", "دار بوعزة"],
  الرباط: ["أكدال", "حسان", "الرياض", "السويسي", "اليوسفية", "التقدم"],
  سلا: ["تابريكت", "حي السلام", "سلا الجديدة", "بطانة", "المدينة القديمة", "العيايدة"],
  مراكش: ["المدينة القديمة", "جليز", "النخيل", "المسيرة", "الحي الحسني", "سيدي يوسف"],
  طنجة: ["المغرب العربي", "بنكيران", "الشرف", "المرشان", "بني مكادة", "الزياتن"],
  فاس: ["المدينة القديمة", "سايس", "النرجس", "المرينيين", "أكدال", "زواغة"],
  "أكادير": ["حي الهدى", "تالبرجت", "الداخلة", "حي المحمدي", "فونتي", "أنزا"],
  مكناس: ["حمرية", "المدينة القديمة", "مرجان", "البساتين", "الزيتون", "تولال"],
  وجدة: ["حي القدس", "الأندلس", "النهضة", "الزيتون", "حي السلام", "بني درار"],
};

/** المسافة تُحسَب تقديرياً من الحي/المدينة وتُعرَض كـ «قريب / متوسط / بعيد». */
export const DISTANCE_BANDS = [
  { key: "near", labelAr: "قريب", hintAr: "نفس الحي" },
  { key: "medium", labelAr: "متوسط", hintAr: "نفس المدينة، حي مختلف" },
  { key: "far", labelAr: "بعيد", hintAr: "مدينة أخرى" },
] as const;
export type DistanceBand = (typeof DISTANCE_BANDS)[number]["key"];

/** نطاقات الميزانية للفلترة (بالدرهم). */
export const BUDGET_BANDS = [
  { key: "b1", labelAr: "أقل من 200 درهم", min: 0, max: 199 },
  { key: "b2", labelAr: "200 – 500 درهم", min: 200, max: 500 },
  { key: "b3", labelAr: "500 – 1500 درهم", min: 501, max: 1500 },
  { key: "b4", labelAr: "أكثر من 1500 درهم", min: 1501, max: Number.MAX_SAFE_INTEGER },
] as const;
