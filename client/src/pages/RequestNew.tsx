// ── نشر طلب جديد: الفئة، الوصف، الميزانية عند الحاجة، الموقع، والوسائط ──────────
// هذا هو جوهر نقل فكرة inDrive: السعر يقترحه صاحب الطلب لا مقدّم الخدمة، فالحقل الأهم هنا
// هو «عرضك»: رقم ضخم مع أزرار زيادة سريعة (+50/+100/+200) بدل حقل رقم صامت.
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import {
  Send,
  Image as ImageIcon,
  X,
  MapPin,
  Check,
  Sparkles,
  Minus,
  Plus,
  Video,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ErrorState, Field, SectionHeading, Spinner } from "@/components/hirfi/primitives";
import { trpc } from "@/_core/trpc";
import { useCategories, useMyProfile } from "@/lib/hooks";
import { useMediaUpload, type UploadedImage } from "@/lib/upload";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { categoryIcon, errorMessage, madNumber } from "@/lib/format";
import { MOROCCAN_CITIES } from "@shared/constants";

const PROFESSIONAL_CRAFT_LABELS: Record<string, string> = {
  painting: "صباغة",
  plaster: "جبس",
  construction: "بناء",
  tiling: "زليج",
  marble: "رخام",
  electrician: "طريسيان",
  plumber: "بلومبي",
  carpenter: "نجار",
  aluminum: "المينيزم",
  tailoring: "خياطة",
};

const PROFESSIONAL_CRAFT_CATEGORY_SLUGS: Record<string, string> = {
  painting: "painting",
  plaster: "handyman",
  construction: "handyman",
  tiling: "handyman",
  marble: "handyman",
  electrician: "electrical",
  plumber: "plumbing",
  carpenter: "carpentry",
  aluminum: "handyman",
  tailoring: "tailoring",
};

type MoroccanCity = (typeof MOROCCAN_CITIES)[number];
type ReverseAddress = Partial<Record<"city" | "town" | "municipality" | "county", string>>;

const CITY_ALIASES: Record<string, MoroccanCity> = {
  "الدار البيضاء": "الدار البيضاء",
  casablanca: "الدار البيضاء",
  "الرباط": "الرباط",
  rabat: "الرباط",
  "سلا": "سلا",
  sale: "سلا",
  salé: "سلا",
  "مراكش": "مراكش",
  marrakesh: "مراكش",
  marrakech: "مراكش",
  "طنجة": "طنجة",
  tanger: "طنجة",
  tangier: "طنجة",
  "فاس": "فاس",
  fes: "فاس",
  fez: "فاس",
  "أكادير": "أكادير",
  agadir: "أكادير",
  "مكناس": "مكناس",
  meknes: "مكناس",
  "وجدة": "وجدة",
  oujda: "وجدة",
};

function detectedCity(address: ReverseAddress): MoroccanCity | null {
  for (const value of [address.city, address.town, address.municipality, address.county]) {
    if (!value) continue;
    const key = value.trim().toLocaleLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const city = CITY_ALIASES[key] ?? CITY_ALIASES[value.trim()];
    if (city) return city;
  }
  return null;
}

/** إرشادات قصيرة حسب نوع الخدمة حتى لا تبدو كل الطلبات كأنها أعطال منزلية. */
const SERVICE_GUIDANCE: Record<
  string,
  { heading: string; description: string; title: string; details: string; location: string }
> = {
  grocery: {
    heading: "شنو بغيتي نشريو؟",
    description: "حدد اللائحة، السوق أو المحل، وطريقة تأكيد المشتريات.",
    title: "مثال: قفة أسبوعية من سوق السلام",
    details: "كتب اللائحة والكميات، واش بغيتي صورة الفاتورة قبل الأداء، وفين يكون التوصيل؟",
    location: "المكان اللي غادي يتشرا منو والحي ديال التوصيل",
  },
  queue: {
    heading: "شنو الإجراء اللي خاصك؟",
    description: "حدد المصلحة، وقت الحضور، وكيفاش نبقاو نخبرّوك بالدور.",
    title: "مثال: الوقوف فالطابور فمصلحة إدارية",
    details: "كتب اسم المصلحة والوثائق المطلوبة والوقت اللي خاص مقدم الخدمة يكون فيه.",
    location: "موقع المصلحة أو المكان اللي غادي يتوقف فيه مقدم الخدمة",
  },
  rental: {
    heading: "شنو بغيتي تكري؟",
    description: "حدد الأداة أو المعدة، المدة، والتوصيل أو الاسترجاع.",
    title: "مثال: كراء مثقاب ليوم واحد",
    details: "كتب النوع والمدة والاستعمال، وواش محتاج التوصيل أو التركيب مع الكراء.",
    location: "مكان التسليم والاسترجاع أو مكان استعمال المعدة",
  },
  moving: {
    heading: "شنو بغيتي تنقل؟",
    description: "حدد الأثاث، الطوابق، العناوين، وواش محتاج التركيب.",
    title: "مثال: نقل أثاث شقة من حي إلى حي",
    details: "كتب شنو غادي يتنقل، الطابق، واش كاين مصعد، وأي تفاصيل تساعد الحرّاف يحسب الخدمة.",
    location: "مكان التحميل ومكان التفريغ",
  },
};

/** زيادات سريعة بالميزانية — كما يرفع راكب inDrive سعره بضغطة. */
const QUICK_STEPS = [50, 100, 200];

export default function RequestNew() {
  const cats = useCategories();
  const profile = useMyProfile();
  const create = trpc.requests.create.useMutation();
  const utils = trpc.useUtils();
  const { upload, isUploading } = useMediaUpload();
  const [, navigate] = useLocation();

  const [categoryId, setCategoryId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState("300");
  const [city, setCity] = useState<string>(MOROCCAN_CITIES[0]);
  const [district, setDistrict] = useState<string>("الموقع الحالي");
  const [gpsAddress, setGpsAddress] = useState<string | null>(null);
  const [locationSource, setLocationSource] = useState<"profile" | "gps">("profile");
  const [media, setMedia] = useState<(UploadedImage & { kind: "image" | "video" })[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const requestedService =
    typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("service") ?? "";
  const isProfessionalCraft = Boolean(PROFESSIONAL_CRAFT_LABELS[requestedService]);
  const serviceLabel = isProfessionalCraft ? PROFESSIONAL_CRAFT_LABELS[requestedService] : undefined;

  useEffect(() => {
    if (locationSource !== "profile") return;
    const p = profile.data?.profile;
    if (!p) return;
    setCity(p.city || MOROCCAN_CITIES[0]);
    setDistrict(p.district || "الموقع الحالي");
  }, [locationSource, profile.data]);

  useEffect(() => {
    let cancelled = false;
    if (typeof navigator === "undefined" || !navigator.geolocation || !navigator.permissions) return;

    void navigator.permissions
      .query({ name: "geolocation" })
      .then((permission) => {
        if (permission.state !== "granted") return;
        navigator.geolocation.getCurrentPosition(
          async ({ coords }) => {
            try {
              const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${coords.latitude}&lon=${coords.longitude}&zoom=18&addressdetails=1`,
              );
              if (!response.ok) return;
              const data = (await response.json()) as { display_name?: string; address?: ReverseAddress };
              if (!cancelled && data.display_name) setGpsAddress(data.display_name);
              const cityFromGps = data.address ? detectedCity(data.address) : null;
              if (!cancelled && cityFromGps) setCity(cityFromGps);
            } catch {
              // The saved city and district remain the fallback when reverse geocoding is unavailable.
            }
            if (!cancelled) setLocationSource("gps");
          },
          () => undefined,
          { enableHighAccuracy: true, maximumAge: 0, timeout: 8_000 },
        );
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (categoryId || !requestedService || !cats.data) return;
    const requestedSlug = PROFESSIONAL_CRAFT_CATEGORY_SLUGS[requestedService] ?? requestedService;
    const requestedCategory = cats.data.find(
      (category) => category.slug === requestedService || category.slug === requestedSlug,
    );
    if (requestedCategory) setCategoryId(requestedCategory.id);
  }, [categoryId, cats.data, requestedService]);

  const budgetNum = Number(budget);
  const selectedCat = (cats.data ?? []).find((c) => c.id === categoryId);
  const guidance = selectedCat
    ? (SERVICE_GUIDANCE[selectedCat.slug] ?? {
        heading: "اشرح مشكلتك",
        description: "صف الخدمة بوضوح باش توصلك عروض مناسبة.",
        title: "مثال: تسريب ماء تحت حوض المطبخ",
        details: "صف المطلوب، المواد المتوفرة، وما الأفضل تجنّبه.",
        location: "المدينة والحي يكفيان لحساب المسافة",
      })
    : {
        heading: "اشرح مشكلتك",
        description: "اختر الفئة أولاً ثم اكتب التفاصيل.",
        title: "مثال: تسريب ماء تحت حوض المطبخ",
        details: "صف المطلوب، المواد المتوفرة، وما الأفضل تجنّبه.",
        location: "المدينة والحي يكفيان لحساب المسافة",
      };

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!categoryId) e.categoryId = "اختر فئة الخدمة";
    if (title.trim().length < 6) e.title = "اكتب عنواناً واضحاً (6 أحرف على الأقل)";
    if (description.trim().length < 15) e.description = "اشرح المشكلة بتفصيل (15 حرفاً على الأقل)";
    if (!isProfessionalCraft && (!budget || Number.isNaN(budgetNum) || budgetNum < 20))
      e.budget = "الميزانية المقترحة يجب أن تكون 20 درهماً أو أكثر";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function bump(delta: number) {
    const next = Math.max(20, Math.round((Number(budget) || 0) + delta));
    setBudget(String(next));
    setErrors((p) => ({ ...p, budget: "" }));
  }

  async function pickMedia(file: File | undefined) {
    if (!file) return;
    if (media.length >= 4) {
      toast.error("الحد الأقصى 4 ملفات للطلب");
      return;
    }
    try {
      const up = await upload(file);
      const kind = file.type.startsWith("video/") ? "video" : "image";
      setMedia((prev) => [...prev, { ...up, kind }]);
      toast.success(kind === "video" ? "أُضيف الفيديو" : "أُضيفت الصورة");
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) {
      toast.error("راجع الحقول المعلَّمة قبل النشر");
      return;
    }
    try {
      const detail = await create.mutateAsync({
        categoryId,
        title: title.trim(),
        description: description.trim(),
        budgetAmount: isProfessionalCraft ? 0 : Math.round(budgetNum),
         city: city as (typeof MOROCCAN_CITIES)[number],
         district: district || "الموقع الحالي",
         urgency: "flexible",
         scheduledFor: null,
        imageUrls: media.map((item) => item.url),
      });
      await utils.invalidate();
      toast.success("نُشر طلبك — سيبدأ الحرّافون القريبون بإرسال العروض");
      navigate(`/requests/${detail.request.id}`);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  return (
    <div className="grid">
      {/* ترويسة الشاشة */}
      <header className="px-4 pt-5 pb-3">
        <h1 className="text-[26px] leading-tight font-black">اطلب خدمة</h1>
        <p className="mt-1.5 text-[13px] text-muted-foreground">
          {isProfessionalCraft
            ? "شرح دقيق مع صور وفيديوهات يساعد الحرّاف على فهم المطلوب."
            : "حدّد مشكلتك واقترح سعرك — الحرّافون سيتنافسون بعروضهم عليه."}
        </p>
      </header>

      <form onSubmit={submit} className="grid gap-3 px-4 pb-6">
        {/* 1 — الفئة */}
        {requestedService && (selectedCat || isProfessionalCraft) ? (
          <section className="grid gap-3 rounded-3xl bg-card p-4" style={{ boxShadow: "var(--shadow-card)" }}>
            <SectionHeading title="الخدمة المختارة" description="تم اختيار الفئة من قائمة الخدمات." />
            {(() => {
              const Icon = selectedCat ? categoryIcon(selectedCat.icon) : Wrench;
              return (
                <div className="flex items-center gap-3 rounded-2xl bg-brand/15 px-3.5 py-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand text-brand-ink">
                    <Icon className="size-5" />
                  </span>
                  <span className="flex-1 text-[14px] font-black">{serviceLabel ?? selectedCat?.nameAr}</span>
                  <Check className="size-5 text-teal" strokeWidth={3} />
                </div>
              );
            })()}
          </section>
        ) : (
          <section className="grid gap-3 rounded-3xl bg-card p-4" style={{ boxShadow: "var(--shadow-card)" }}>
            <SectionHeading title="ما نوع الخدمة؟" />
            {cats.isLoading ? (
              <div className="grid grid-cols-3 gap-2">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className="hirfi-skeleton h-12 rounded-2xl" />
                ))}
              </div>
            ) : cats.isError ? (
              <ErrorState message={errorMessage(cats.error)} onRetry={() => void cats.refetch()} />
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {(cats.data ?? []).map((c) => {
                  const Icon = categoryIcon(c.icon);
                  const on = categoryId === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setCategoryId(c.id);
                        setErrors((p) => ({ ...p, categoryId: "" }));
                      }}
                      className={cn(
                        "relative flex flex-col items-center gap-1.5 rounded-2xl px-2 py-3 transition-colors",
                        on ? "bg-brand text-brand-ink" : "bg-muted/70 text-foreground active:bg-muted",
                      )}
                    >
                      {on ? <Check className="absolute end-1.5 top-1.5 size-3.5" strokeWidth={3} /> : null}
                      <Icon className="size-5" />
                      <span className="text-center text-[11.5px] leading-tight font-bold">{c.nameAr}</span>
                    </button>
                  );
                })}
              </div>
            )}
            {errors.categoryId ? (
              <p className="text-[11px] font-bold text-destructive">{errors.categoryId}</p>
            ) : null}
          </section>
        )}

        {/* 2 — واجهة الميزانية: للحرف المعيّنة يرسل الحرّاف عرضه مباشرة */}
        {!isProfessionalCraft ? (
        <section className="rounded-3xl bg-foreground p-4 text-background" style={{ boxShadow: "var(--shadow-card)" }}>
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-[15px] font-black">ميزانيتك المقترحة</h2>
            <span className="inline-flex items-center gap-1 rounded-full bg-brand px-2.5 py-1 text-[10.5px] font-black text-brand-ink">
              <Sparkles className="size-3" />
              يراها الحرّافون
            </span>
          </div>

          {/* الرقم الضخم مع أزرار التنقيص/الزيادة */}
          <div className="mt-3 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => bump(-50)}
              aria-label="أنقص 50 درهماً"
              className="grid size-11 shrink-0 place-items-center rounded-full bg-background/15 text-background transition-colors active:bg-background/25"
            >
              <Minus className="size-5" />
            </button>

            <div className="min-w-0 flex-1 text-center">
              <div className="flex items-baseline justify-center gap-1.5">
                <span className="text-price text-[42px] leading-none">{madNumber(budgetNum || 0)}</span>
                <span className="text-[13px] font-bold text-background/70">درهم</span>
              </div>
              <div className="mt-1 text-[11px] text-background/60">
                {budgetNum >= 20 ? "اقتراحك — والتفاوض مفتوح" : "أدخل 20 درهماً على الأقل"}
              </div>
            </div>

            <button
              type="button"
              onClick={() => bump(50)}
              aria-label="زد 50 درهماً"
              className="grid size-11 shrink-0 place-items-center rounded-full bg-brand text-brand-ink transition-colors active:opacity-90"
            >
              <Plus className="size-5" />
            </button>
          </div>

          {/* زيادات سريعة */}
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            {QUICK_STEPS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => bump(s)}
                className="rounded-full bg-background/15 px-3.5 py-2 text-[12.5px] font-black text-background transition-colors active:bg-background/25"
              >
                +{s}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setBudget("300")}
              className="rounded-full bg-background/15 px-3.5 py-2 text-[12.5px] font-bold text-background/80 transition-colors active:bg-background/25"
            >
              إعادة الضبط
            </button>
          </div>

          {/* إدخال رقمي دقيق لمن يريد مبلغاً محدّداً */}
          <div className="mt-3 grid gap-1.5">
            <label htmlFor="budget-exact" className="text-[11px] font-bold text-background/70">
              أو اكتب المبلغ بدقة (درهم)
            </label>
            <input
              id="budget-exact"
              type="number"
              min={20}
              step={10}
              inputMode="numeric"
              value={budget}
              onChange={(e) => {
                setBudget(e.target.value);
                setErrors((p) => ({ ...p, budget: "" }));
              }}
              className="h-11 w-full rounded-xl border border-background/20 bg-background/10 px-3 text-center text-[17px] font-black text-background tabular-nums outline-none focus:border-brand"
            />
          </div>

          {errors.budget ? (
            <p className="mt-2 text-[11px] font-bold text-brand">{errors.budget}</p>
          ) : (
            <p className="mt-2.5 text-[11px] leading-relaxed text-background/60">
              الحرّاف يرى هذا المبلغ مع الفئة والمسافة قبل أن يقرّر تقديم عرض — وقد يزيد أو ينقص، والقرار يبقى لك.
            </p>
          )}
        </section>
        ) : null}

        {/* 3 — الوصف */}
        <section className="grid gap-3 rounded-3xl bg-card p-4" style={{ boxShadow: "var(--shadow-card)" }}>
          <SectionHeading title={guidance.heading} description={guidance.description} />
          <Field label="العنوان" hint="سطر واحد مختصر يجذب انتباه الحرّافين" required error={errors.title}>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              placeholder={guidance.title}
            />
          </Field>
          <Field
            label="التفاصيل"
            hint={guidance.details}
            required
            error={errors.description}
          >
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
              className="min-h-28"
              placeholder={guidance.details}
            />
          </Field>

          <Field label="صور وفيديوهات توضيحية" hint="اختيارية — حتى 4 ملفات (الصورة 5 ميغابايت، والفيديو 50 ميغابايت)">
            <div className="flex flex-wrap items-center gap-2.5">
              {media.map((item) => (
                <div key={item.key} className="relative size-20 overflow-hidden rounded-2xl border border-border">
                  {item.kind === "video" ? (
                    <video src={item.url} muted playsInline className="size-full object-cover" />
                  ) : (
                    <img src={item.url} alt={item.name} className="size-full object-cover" />
                  )}
                  <button
                    type="button"
                    onClick={() => setMedia((prev) => prev.filter((x) => x.key !== item.key))}
                    className="absolute end-1 top-1 grid size-5 place-items-center rounded-full bg-destructive text-white"
                    aria-label="إزالة الملف"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))}
              {media.length < 4 ? (
                <label
                  className={cn(
                    "grid size-20 cursor-pointer place-items-center rounded-2xl border border-dashed border-border bg-muted/50 text-muted-foreground transition-colors active:border-brand",
                    isUploading && "pointer-events-none opacity-60",
                  )}
                >
                  {isUploading ? (
                    <Spinner />
                  ) : (
                    <span className="flex items-center gap-1">
                      <ImageIcon className="size-5" />
                      <Video className="size-4" />
                    </span>
                  )}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,video/mp4,video/webm,video/quicktime"
                    className="hidden"
                    onChange={(e) => {
                      void pickMedia(e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                </label>
              ) : null}
            </div>
          </Field>
        </section>

        {/* 4 — الموقع التلقائي */}
        <section className="grid gap-3 rounded-3xl bg-card p-4" style={{ boxShadow: "var(--shadow-card)" }}>
          <SectionHeading title="الموقع" description="تم تحديد مكانك تلقائياً من بيانات الحساب أو GPS المتاح." />
          <div className="flex items-center gap-3 rounded-2xl bg-muted/70 px-3.5 py-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand text-brand-ink">
              <MapPin className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div dir="ltr" className="break-words text-start text-[12px] leading-tight font-black [overflow-wrap:anywhere]">
                {gpsAddress ?? district}
              </div>
            </div>
            <span className="shrink-0 rounded-full bg-brand px-2.5 py-1 text-[10px] font-black text-brand-ink">
              {locationSource === "gps" ? "GPS" : "تلقائي"}
            </span>
          </div>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            غادي يوصل الطلب للحرّافين القريبين من {city}.
          </p>
        </section>

        {/* شريط النشر الثابت */}
        <div className="sticky bottom-2 z-20 flex items-center gap-3 rounded-3xl bg-card p-3" style={{ boxShadow: "var(--shadow-sheet)" }}>
          <div className="min-w-0 flex-1">
            {isProfessionalCraft ? (
              <div className="text-[13px] font-black">بدون ميزانية مسبقة</div>
            ) : (
              <div className="text-price text-[19px] leading-none">
                {madNumber(budgetNum || 0)}
                <span className="ms-1 text-[11px] font-bold text-muted-foreground">درهم</span>
              </div>
            )}
            <div className="mt-0.5 truncate text-[10.5px] text-muted-foreground">
              {serviceLabel ?? selectedCat?.nameAr ?? "اختر الفئة"}
              {district ? ` · ${district}` : ""}
            </div>
          </div>
          <Button type="submit" size="lg" className="shrink-0 gap-2" disabled={create.isPending || isUploading}>
            {create.isPending ? <Spinner /> : <Send className="size-4.5" />}
            انشر الطلب
          </Button>
        </div>

        <p className="flex items-start gap-1.5 px-1 text-[11px] text-muted-foreground">
          <Sparkles className="mt-0.5 size-3.5 shrink-0" />
          بعد النشر يمكنك مقارنة العروض وقبول أحدها أو التفاوض على السعر مباشرة من شاشة الطلب.
        </p>
      </form>
    </div>
  );
}
