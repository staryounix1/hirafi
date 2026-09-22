// ── نشر طلب جديد: الفئة، الوصف، الميزانية المقترحة (واجهة المزايدة)، الموقع، الصور ──
// هذا هو جوهر نقل فكرة inDrive: السعر يقترحه صاحب الطلب لا مقدّم الخدمة، فالحقل الأهم هنا
// هو «عرضك»: رقم ضخم مع أزرار زيادة سريعة (+50/+100/+200) بدل حقل رقم صامت.
import { useState } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Chip, ErrorState, Field, SectionHeading, Spinner } from "@/components/hirfi/primitives";
import { trpc } from "@/_core/trpc";
import { useCategories } from "@/lib/hooks";
import { useImageUpload, validateImage } from "@/lib/upload";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { categoryIcon, errorMessage, madNumber } from "@/lib/format";
import { MOROCCAN_CITIES, DISTRICTS_BY_CITY, URGENCIES } from "@shared/constants";

const URGENCY_LABEL: Record<string, string> = {
  flexible: "مرن في الوقت",
  today: "اليوم",
  urgent: "عاجل جداً",
};

/** زيادات سريعة بالميزانية — كما يرفع راكب inDrive سعره بضغطة. */
const QUICK_STEPS = [50, 100, 200];

export default function RequestNew() {
  const cats = useCategories();
  const create = trpc.requests.create.useMutation();
  const utils = trpc.useUtils();
  const { upload, isUploading } = useImageUpload();
  const [, navigate] = useLocation();

  const [categoryId, setCategoryId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState("300");
  const [city, setCity] = useState<string>(MOROCCAN_CITIES[0]);
  const [district, setDistrict] = useState<string>("");
  const [urgency, setUrgency] = useState<string>("flexible");
  const [scheduled, setScheduled] = useState("");
  const [images, setImages] = useState<{ key: string; url: string; name: string }[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const districts = DISTRICTS_BY_CITY[city] ?? [];
  const budgetNum = Number(budget);
  const selectedCat = (cats.data ?? []).find((c) => c.id === categoryId);

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!categoryId) e.categoryId = "اختر فئة الخدمة";
    if (title.trim().length < 6) e.title = "اكتب عنواناً واضحاً (6 أحرف على الأقل)";
    if (description.trim().length < 15) e.description = "اشرح المشكلة بتفصيل (15 حرفاً على الأقل)";
    if (!budget || Number.isNaN(budgetNum) || budgetNum < 20)
      e.budget = "الميزانية المقترحة يجب أن تكون 20 درهماً أو أكثر";
    if (!district) e.district = "اختر الحي";
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (scheduled && new Date(scheduled) < today)
      e.scheduled = "الوقت المقترح لا يمكن أن يكون في الماضي";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function bump(delta: number) {
    const next = Math.max(20, Math.round((Number(budget) || 0) + delta));
    setBudget(String(next));
    setErrors((p) => ({ ...p, budget: "" }));
  }

  async function pickImage(file: File | undefined) {
    if (!file) return;
    const invalid = validateImage(file);
    if (invalid) {
      toast.error(invalid);
      return;
    }
    if (images.length >= 4) {
      toast.error("الحد الأقصى 4 صور للطلب");
      return;
    }
    try {
      const up = await upload(file);
      setImages((prev) => [...prev, up]);
      toast.success("أُضيفت الصورة");
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
        budgetAmount: Math.round(budgetNum),
        city: city as (typeof MOROCCAN_CITIES)[number],
        district,
        urgency: urgency as (typeof URGENCIES)[number],
        scheduledFor: scheduled ? new Date(scheduled) : null,
        imageUrls: images.map((i) => i.url),
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
          حدّد مشكلتك واقترح سعرك — الحرّافون سيتنافسون بعروضهم عليه.
        </p>
      </header>

      <form onSubmit={submit} className="grid gap-3 px-4 pb-6">
        {/* 1 — الفئة */}
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

        {/* 2 — واجهة الميزانية: قلب الشاشة */}
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

        {/* 3 — الوصف */}
        <section className="grid gap-3 rounded-3xl bg-card p-4" style={{ boxShadow: "var(--shadow-card)" }}>
          <SectionHeading title="اشرح مشكلتك" />
          <Field label="العنوان" hint="سطر واحد مختصر يجذب انتباه الحرّافين" required error={errors.title}>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              placeholder="مثال: تسريب ماء تحت حوض المطبخ"
            />
          </Field>
          <Field
            label="التفاصيل"
            hint="صف العطل، هل لديك المواد؟ وما الأفضل تجنّبه؟"
            required
            error={errors.description}
          >
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
              className="min-h-28"
              placeholder="مثال: التسريب يظهر عند تشغيل الماء الساخن. الحوض من النوع العادي ولديّ السيفون الجديد…"
            />
          </Field>

          <Field label="صور توضيحية" hint="اختيارية — حتى 4 صور (PNG / JPEG / WebP بحجم 5 ميغابايت كحد أقصى)">
            <div className="flex flex-wrap items-center gap-2.5">
              {images.map((img) => (
                <div key={img.key} className="relative size-20 overflow-hidden rounded-2xl border border-border">
                  <img src={img.url} alt={img.name} className="size-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setImages((prev) => prev.filter((x) => x.key !== img.key))}
                    className="absolute end-1 top-1 grid size-5 place-items-center rounded-full bg-destructive text-white"
                    aria-label="إزالة الصورة"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))}
              {images.length < 4 ? (
                <label
                  className={cn(
                    "grid size-20 cursor-pointer place-items-center rounded-2xl border border-dashed border-border bg-muted/50 text-muted-foreground transition-colors active:border-brand",
                    isUploading && "pointer-events-none opacity-60",
                  )}
                >
                  {isUploading ? <Spinner /> : <ImageIcon className="size-5" />}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      void pickImage(e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                </label>
              ) : null}
            </div>
          </Field>
        </section>

        {/* 4 — الموقع والوقت */}
        <section className="grid gap-3 rounded-3xl bg-card p-4" style={{ boxShadow: "var(--shadow-card)" }}>
          <SectionHeading
            title="أين ومتى؟"
            description="المدينة والحي يكفيان لحساب المسافة (قريب / متوسط / بعيد)."
          />

          <div className="grid gap-1.5">
            <span className="text-[13px] font-bold">المدينة</span>
            <div className="flex flex-wrap gap-2">
              {MOROCCAN_CITIES.slice(0, 6).map((c) => (
                <Chip
                  key={c}
                  active={city === c}
                  onClick={() => {
                    setCity(c);
                    setDistrict("");
                  }}
                >
                  {c}
                </Chip>
              ))}
            </div>
            <Select
              value={city}
              onChange={(e) => {
                setCity(e.target.value);
                setDistrict("");
              }}
              className="mt-1"
            >
              {MOROCCAN_CITIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>

          <Field label="الحي" required error={errors.district} hint="نفس الحي = «قريب» عند الحرّاف">
            <Select value={district} onChange={(e) => setDistrict(e.target.value)}>
              <option value="">— اختر الحي —</option>
              {districts.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </Select>
          </Field>

          <div className="grid gap-1.5">
            <span className="text-[13px] font-bold">الاستعجال</span>
            <div className="flex flex-wrap gap-2">
              {URGENCIES.map((u) => (
                <Chip key={u} active={urgency === u} onClick={() => setUrgency(u)}>
                  {URGENCY_LABEL[u]}
                </Chip>
              ))}
            </div>
          </div>

          <Field label="الوقت المقترح للتنفيذ" hint="اختياري — اتركه فارغاً إن كنت مرناً" error={errors.scheduled}>
            <Input type="datetime-local" value={scheduled} onChange={(e) => setScheduled(e.target.value)} />
          </Field>

          <p className="flex items-start gap-1.5 rounded-2xl bg-muted/70 px-3 py-2.5 text-[11.5px] leading-relaxed text-muted-foreground">
            <MapPin className="mt-0.5 size-3.5 shrink-0" />
            سنعرض طلبك على الحرّافين في {city}
            {district ? ` — ${district}` : ""} حسب فئته وميزانيته.
          </p>
        </section>

        {/* شريط النشر الثابت */}
        <div className="sticky bottom-2 z-20 flex items-center gap-3 rounded-3xl bg-card p-3" style={{ boxShadow: "var(--shadow-sheet)" }}>
          <div className="min-w-0 flex-1">
            <div className="text-price text-[19px] leading-none">
              {madNumber(budgetNum || 0)}
              <span className="ms-1 text-[11px] font-bold text-muted-foreground">درهم</span>
            </div>
            <div className="mt-0.5 truncate text-[10.5px] text-muted-foreground">
              {selectedCat ? selectedCat.nameAr : "اختر الفئة"}
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
