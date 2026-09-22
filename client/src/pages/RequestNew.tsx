// ── نشر طلب جديد: الفئة، الوصف، الميزانية المقترحة، الموقع، الصور ───────────
// هذا هو جوهر نقل فكرة inDrive: السعر يقترحه صاحب الطلب لا مقدّم الخدمة.
import { useState } from "react";
import { useLocation } from "wouter";
import { Send, Image as ImageIcon, X, MapPin, CircleDollarSign, Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Field, PageHeader, Spinner, ErrorState } from "@/components/hirfi/primitives";
import { trpc } from "@/_core/trpc";
import { useCategories } from "@/lib/hooks";
import { useImageUpload, validateImage } from "@/lib/upload";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { categoryIcon, errorMessage, formatMAD } from "@/lib/format";
import { MOROCCAN_CITIES, DISTRICTS_BY_CITY, URGENCIES } from "@shared/constants";

const URGENCY_LABEL: Record<string, string> = {
  flexible: "مرن في الوقت",
  today: "اليوم",
  urgent: "عاجل جداً",
};

export default function RequestNew() {
  const cats = useCategories();
  const create = trpc.requests.create.useMutation();
  const utils = trpc.useUtils();
  const { upload, isUploading } = useImageUpload();
  const [, navigate] = useLocation();

  const [categoryId, setCategoryId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState("");
  const [city, setCity] = useState<string>(MOROCCAN_CITIES[0]);
  const [district, setDistrict] = useState<string>("");
  const [urgency, setUrgency] = useState<string>("flexible");
  const [scheduled, setScheduled] = useState("");
  const [images, setImages] = useState<{ key: string; url: string; name: string }[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const districts = DISTRICTS_BY_CITY[city] ?? [];
  const budgetNum = Number(budget);

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
    <div className="grid gap-5">
      <PageHeader
        icon={Send}
        title="انشر طلباً جديداً"
        description="حدّد ميزانيتك المقترحة بنفسك — الحرّافون سيتنافسون عليها بعروضهم."
      />

      <form onSubmit={submit} className="grid gap-5">
        {/* الفئة */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-base font-bold">1) فئة الخدمة</h2>
          {cats.isLoading ? (
            <div className="mt-4 grid gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="hirfi-skeleton h-12 rounded-lg" />
              ))}
            </div>
          ) : cats.isError ? (
            <div className="mt-4">
              <ErrorState message={errorMessage(cats.error)} onRetry={() => void cats.refetch()} />
            </div>
          ) : (
            <div className="mt-4 grid gap-2 sm:grid-cols-3 lg:grid-cols-4">
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
                      "flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors",
                      on
                        ? "border-brand bg-brand/8 text-brand-dark ring-2 ring-brand/20"
                        : "border-border bg-background text-muted-foreground hover:border-brand/40 hover:text-foreground",
                    )}
                  >
                    <Icon className="size-4 shrink-0" />
                    <span className="truncate">{c.nameAr}</span>
                    {on ? <Check className="ms-auto size-3.5 shrink-0" /> : null}
                  </button>
                );
              })}
            </div>
          )}
          {errors.categoryId ? (
            <p className="mt-2 text-xs font-medium text-destructive">{errors.categoryId}</p>
          ) : null}
        </div>

        {/* الوصف */}
        <div className="grid gap-4 rounded-xl border border-border bg-card p-5">
          <h2 className="text-base font-bold">2) وصف المشكلة</h2>
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
            hint="صف العطل، هل لديك المواد؟ ما الأفضل تجنّبه؟ كلما كان أوضح كان عرضك أدقّ."
            required
            error={errors.description}
          >
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
              className="min-h-32"
              placeholder="مثال: التسريب يظهر عند تشغيل الماء الساخن. الحوض من النوع العادي ولديّ السيفون الجديد…"
            />
          </Field>

          <Field label="صور توضيحية" hint="اختيارية — حتى 4 صور (PNG / JPEG / WebP بحجم 5 ميغابايت كحد أقصى)">
            <div className="flex flex-wrap items-center gap-2.5">
              {images.map((img) => (
                <div key={img.key} className="relative size-20 overflow-hidden rounded-lg border border-border">
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
                    "grid size-20 cursor-pointer place-items-center rounded-lg border border-dashed border-border bg-muted/40 text-muted-foreground transition-colors hover:border-brand/50 hover:text-brand-dark",
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
        </div>

        {/* الميزانية والموقع والوقت */}
        <div className="grid gap-4 rounded-xl border border-border bg-card p-5 sm:grid-cols-2">
          <h2 className="text-base font-bold sm:col-span-2">3) الميزانية والموقع والوقت</h2>

          <Field
            label="الميزانية المقترحة (درهم)"
            hint="مقترحك ليس ملزماً — العروض قد تزيد أو تنقص، والتفاوض مفتوح."
            required
            error={errors.budget}
          >
            <Input
              type="number"
              min={20}
              step={10}
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="300"
            />
          </Field>

          {budgetNum >= 20 ? (
            <div className="flex items-end">
              <div className="w-full rounded-lg border border-teal/20 bg-teal-soft/60 px-3 py-2.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-teal">
                  <CircleDollarSign className="size-3.5" />
                  كيف ستُعرض ميزانيتك
                </div>
                <p className="mt-1 text-sm text-teal">
                  <b className="font-display text-base">{formatMAD(Math.round(budgetNum))}</b> —
                  والحرّاف يرى المبلغ مع الفئة والمسافة قبل أن يقرّر تقديم عرض.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-end">
              <p className="text-xs text-muted-foreground">
                أدخل مبلغاً لترى كيف يظهر للحرّافين قبل النشر.
              </p>
            </div>
          )}

          <Field label="المدينة" required>
            <Select
              value={city}
              onChange={(e) => {
                setCity(e.target.value);
                setDistrict("");
              }}
            >
              {MOROCCAN_CITIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>

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

          <Field label="الاستعجال" required>
            <Select value={urgency} onChange={(e) => setUrgency(e.target.value)}>
              {URGENCIES.map((u) => (
                <option key={u} value={u}>
                  {URGENCY_LABEL[u]}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="الوقت المقترح للتنفيذ" hint="اختياري — اتركه فارغاً إن كنت مرناً" error={errors.scheduled}>
            <Input
              type="datetime-local"
              value={scheduled}
              onChange={(e) => setScheduled(e.target.value)}
            />
          </Field>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="size-4 text-brand" />
            سنعرض طلبك على الحرّافين في {city}
            {district ? ` — ${district}` : ""} حسب فئته وميزانيته.
          </p>
          <Button type="submit" size="lg" className="gap-2" disabled={create.isPending || isUploading}>
            {create.isPending ? <Spinner /> : <Send className="size-4" />}
            انشر الطلب
          </Button>
        </div>

        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <Sparkles className="mt-0.5 size-3.5 shrink-0" />
          بعد النشر يمكنك مقارنة العروض وقبول أحدها أو التفاوض على السعر مباشرة من شاشة الطلب.
        </p>
      </form>
    </div>
  );
}
