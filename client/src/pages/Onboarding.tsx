// ── اختيار الدور (زبون / حرف) + مهارات الحرف وموقعه ──────────────────────────
// خطوة واحدة بعد التسجيل — قابلة للتغيير لاحقاً من الملف الشخصي.
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { UserCircle, Briefcase, Check, Sparkles, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState, Field, PageHeader, Spinner } from "@/components/hirfi/primitives";
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
      toast.success("حُفظ ملفك — أهلاً بك في حِرفي");
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
    <div className="grid">
      <PageHeader icon={Sparkles} title="كيف ستستعمل حِرفي؟" description="اختر دورك — يمكنك تغييره لاحقاً من الملف الشخصي في أي وقت." />

      {/* اختيار الدور */}
      <div className="grid gap-2.5 px-4 pt-4">
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
              title: "حرف / مقدّم خدمة",
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
                "card-flat p-4 text-start transition-colors",
                active && "ring-2 ring-brand",
              )}
            >
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "grid size-11 shrink-0 place-items-center rounded-2xl",
                    active ? "bg-brand text-brand-ink" : "bg-muted text-foreground",
                  )}
                >
                  <r.icon className="size-5.5" />
                </span>
                <b className="text-[15px] font-black">{r.title}</b>
                {active ? (
                  <span className="ms-auto inline-flex items-center gap-1 rounded-full bg-brand px-2.5 py-1 text-[11px] font-black text-brand-ink">
                    <Check className="size-3" strokeWidth={3} />
                    مختار
                  </span>
                ) : null}
              </div>
              <p className="mt-2 text-[12.5px] leading-relaxed text-muted-foreground">{r.body}</p>
            </button>
          );
        })}
      </div>

      {/* بيانات أساسية */}
      <div className="card-flat mt-3 grid gap-4 p-4 sm:grid-cols-2">
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

      {/* المهارات — للحرف فقط */}
      {role === "provider" ? (
        <div className="card-flat mt-3 p-4">
          <h2 className="text-[15px] font-black">مهاراتك وفئات خدمتك</h2>
          <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
            اختر الفئات التي تعمل فيها ({selected.length} مختارة) — تُستعمل لترجيح الطلبات المناسبة لك.
          </p>

          {cats.isLoading ? (
            <div className="mt-4 grid grid-cols-3 gap-2">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="hirfi-skeleton h-11 rounded-2xl" />
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
            <div className="mt-4 grid grid-cols-3 gap-2">
              {(cats.data ?? []).map((c) => {
                const Icon = categoryIcon(c.icon);
                const on = selected.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleSkill(c.id)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-2xl px-2 py-3 transition-colors",
                      on ? "bg-teal text-white" : "bg-muted/70 text-foreground active:bg-muted",
                    )}
                  >
                    <Icon className="size-5" />
                    <span className="text-center text-[11px] leading-tight font-bold">{c.nameAr}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 px-4 pb-6">
        <p className="text-[12px] text-muted-foreground">يمكنك تعديل كل هذه البيانات لاحقاً من الملف الشخصي.</p>
        <Button size="lg" className="gap-2 rounded-full" onClick={() => void save()} disabled={saving}>
          {saving ? <Spinner /> : <ArrowLeft className="size-4" />}
          احفظ والمتابعة إلى لوحتي
        </Button>
      </div>
    </div>
  );
}
