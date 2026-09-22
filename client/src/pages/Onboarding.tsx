// ── اختيار الدور (زبون / حرّاف) + مهارات الحرّاف وموقعه ───────────────────
// خطوة واحدة بعد التسجيل — قابلة للتغيير لاحقاً من الملف الشخصي.
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import {
  UserCircle,
  Briefcase,
  Check,
  MapPin,
  Sparkles,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Field, PageHeader, Spinner, EmptyState } from "@/components/hirfi/primitives";
import { trpc } from "@/_core/trpc";
import { useCategories, useMyProfile } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { errorMessage, categoryIcon } from "@/lib/format";
import { MOROCCAN_CITIES, DISTRICTS_BY_CITY, type AppRole } from "@shared/constants";

export default function Onboarding() {
  const { data, isLoading } = useMyProfile();
  const cats = useCategories();
  const utils = trpc.useUtils();
  const [, navigate] = useLocation();

  const setRole = trpc.profile.setRole.useMutation();
  const update = trpc.profile.update.useMutation();
  const setSkills = trpc.profile.setSkills.useMutation();

  const [role, setRoleLocal] = useState<AppRole>("customer");
  const [city, setCity] = useState<string>(MOROCCAN_CITIES[0]);
  const [district, setDistrict] = useState<string>("");
  const [displayName, setDisplayName] = useState("");
  const [years, setYears] = useState<number>(0);
  const [bio, setBio] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // تعبئة النموذج من الملف الحالي مرّة واحدة عند وصوله.
  useEffect(() => {
    if (!data) return;
    setRoleLocal(data.profile.role as AppRole);
    setCity(data.profile.city || MOROCCAN_CITIES[0]);
    setDistrict(data.profile.district ?? "");
    setDisplayName(data.profile.displayName);
    setYears(data.profile.yearsExperience);
    setBio(data.profile.bio ?? "");
    setSelected(data.skillIds);
  }, [data]);

  const districts = DISTRICTS_BY_CITY[city] ?? [];

  function toggleSkill(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function save() {
    if (displayName.trim().length < 2) {
      toast.error("أدخل اسمك كما سيظهر للآخرين");
      return;
    }
    if (role === "provider" && selected.length === 0) {
      toast.error("اختر مهارة واحدة على الأقل لتستقبل الطلبات المناسبة");
      return;
    }
    setSaving(true);
    try {
      await update.mutateAsync({
        displayName: displayName.trim(),
        city: city as (typeof MOROCCAN_CITIES)[number],
        district: district || null,
        yearsExperience: role === "provider" ? years : 0,
        bio: bio.trim() || null,
      });
      await setRole.mutateAsync({ role });
      if (role === "provider") await setSkills.mutateAsync({ categoryIds: selected });
      await utils.invalidate();
      toast.success("حُفظ ملفك — أهلاً بك في حِرْفي");
      navigate("/dashboard");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <Spinner className="size-6" />
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        icon={Sparkles}
        title="كيف ستستعمل حِرْفي؟"
        description="اختر دورك — يمكنك تغييره لاحقاً من الملف الشخصي في أي وقت."
      />

      {/* اختيار الدور */}
      <div className="grid gap-3 sm:grid-cols-2">
        {(
          [
            {
              key: "customer" as AppRole,
              icon: UserCircle,
              title: "زبون",
              body: "عندي مشكلة أو خدمة أحتاجها: أنشر طلباً بميزانيتي، أقارن العروض، أفاوض، وأختار من ينفّذ.",
            },
            {
              key: "provider" as AppRole,
              icon: Briefcase,
              title: "حرّاف / مقدّم خدمة",
              body: "عندي حرفة أو خدمة أقدّمها: أتصفّح الطلبات القريبة، أقدّم عروضاً، أنفّذ، وأبني سمعتي بالتقييمات.",
            },
          ] as const
        ).map((r) => {
          const active = role === r.key;
          return (
            <button
              key={r.key}
              type="button"
              onClick={() => setRoleLocal(r.key)}
              className={cn(
                "card-warm rounded-xl border p-5 text-start transition-colors",
                active ? "border-brand bg-brand/6 ring-2 ring-brand/25" : "border-border bg-card hover:border-brand/40",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={cn(
                    "grid size-11 place-items-center rounded-xl",
                    active ? "bg-brand text-white" : "bg-brand/10 text-brand-dark",
                  )}
                >
                  <r.icon className="size-5.5" />
                </span>
                {active ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-brand/12 px-2 py-0.5 text-xs font-semibold text-brand-dark">
                    <Check className="size-3" />
                    مختار
                  </span>
                ) : null}
              </div>
              <h3 className="mt-3 text-base font-bold">{r.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{r.body}</p>
            </button>
          );
        })}
      </div>

      {/* بيانات أساسية */}
      <div className="grid gap-4 rounded-xl border border-border bg-card p-5 sm:grid-cols-2">
        <Field label="الاسم الذي سيظهر للآخرين" required className="sm:col-span-2">
          <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="مثال: كريم بناني" />
        </Field>

        <Field label="المدينة" required hint="نستعملها لحساب المسافة (قريب/متوسط/بعيد)">
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

        <Field label="الحي" hint="اختياري — لكنه يجعل «قريب» أدقّ">
          <Select value={district} onChange={(e) => setDistrict(e.target.value)}>
            <option value="">— بدون تحديد —</option>
            {districts.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </Select>
        </Field>

        {role === "provider" ? (
          <>
            <Field label="سنوات الخبرة" hint="تظهر في ملفك العام وفي بطاقة عرضك" required>
              <Input
                type="number"
                min={0}
                max={60}
                value={years}
                onChange={(e) => setYears(Math.max(0, Math.min(60, Number(e.target.value) || 0)))}
              />
            </Field>
            <Field label="نبذة عنك" hint="سطران عن تخصّصك وطريقة عملك" className="sm:col-span-2">
              <Textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={600}
                placeholder="مثال: كهربائي منذ 2014، متخصّص في أعطال المنازل والتركيب…"
              />
            </Field>
          </>
        ) : null}
      </div>

      {/* المهارات — للحرّاف فقط */}
      {role === "provider" ? (
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-start gap-2.5">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-teal-soft text-teal">
              <MapPin className="size-4" />
            </span>
            <div>
              <h2 className="text-base font-bold">مهاراتك وفئات خدمتك</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                اختر الفئات التي تعمل فيها ({selected.length} مختارة) — تُستعمل لترجيح الطلبات المناسبة لك.
              </p>
            </div>
          </div>

          {cats.isLoading ? (
            <div className="mt-4 grid gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="hirfi-skeleton h-11 rounded-lg" />
              ))}
            </div>
          ) : cats.isError ? (
            <div className="mt-4">
              <EmptyState
                icon={Sparkles}
                title="تعذّر تحميل الفئات"
                description="لم نتمكّن من جلب قائمة الخدمات. تحقّق من الاتصال ثم أعد المحاولة."
                actionLabel="إعادة المحاولة"
                onAction={() => void cats.refetch()}
              />
            </div>
          ) : (
            <div className="mt-4 grid gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {(cats.data ?? []).map((c) => {
                const Icon = categoryIcon(c.icon);
                const on = selected.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleSkill(c.id)}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors",
                      on
                        ? "border-teal bg-teal-soft text-teal"
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
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
        <p className="text-sm text-muted-foreground">
          يمكنك تعديل كل هذه البيانات لاحقاً من الملف الشخصي.
        </p>
        <Button size="lg" className="gap-2" onClick={save} disabled={saving}>
          {saving ? <Spinner /> : <ArrowLeft className="size-4" />}
          حفظ والمتابعة إلى لوحتي
        </Button>
      </div>
    </div>
  );
}
