// ── ملفي الشخصي: بياناتي + مهاراتي (للحرّاف) + صور أعمالي + تبديل الدور ─────
import { useEffect, useState } from "react";
import { Link } from "wouter";
import {
  UserCircle,
  Briefcase,
  Check,
  Save,
  Image as ImageIcon,
  Trash2,
  ShieldCheck,
  Star,
  Eye,
  RefreshCw,
  Wallet,
  Bell,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Badge,
  ErrorState,
  Field,
  PageHeader,
  Spinner,
  Stars,
  VerifiedBadge,
} from "@/components/hirfi/primitives";
import { trpc } from "@/_core/trpc";
import { useCategories, useMyProfile } from "@/lib/hooks";
import { useImageUpload, validateImage } from "@/lib/upload";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { categoryIcon, errorMessage, formatDateAr, formatMAD, ratingAvg } from "@/lib/format";
import { MOROCCAN_CITIES, DISTRICTS_BY_CITY, type AppRole } from "@shared/constants";
import { isValidMoroccanPhone } from "@shared/types";

export default function Profile() {
  const q = useMyProfile();
  const cats = useCategories();
  const utils = trpc.useUtils();
  const { upload, isUploading } = useImageUpload();

  const update = trpc.profile.update.useMutation();
  const setRoleM = trpc.profile.setRole.useMutation();
  const setSkills = trpc.profile.setSkills.useMutation();
  const addWork = trpc.profile.addWork.useMutation();
  const removeWork = trpc.profile.removeWork.useMutation();

  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [city, setCity] = useState<string>(MOROCCAN_CITIES[0]);
  const [district, setDistrict] = useState("");
  const [years, setYears] = useState(0);
  const [hourlyNote, setHourlyNote] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [saving, setSaving] = useState(false);
  const [caption, setCaption] = useState("");

  useEffect(() => {
    if (!q.data || hydrated) return;
    const p = q.data.profile;
    setDisplayName(p.displayName);
    setPhone(p.phone ?? "");
    setBio(p.bio ?? "");
    setCity(p.city || MOROCCAN_CITIES[0]);
    setDistrict(p.district ?? "");
    setYears(p.yearsExperience);
    setHourlyNote(p.hourlyNote ?? "");
    setSelected(q.data.skillIds);
    setHydrated(true);
  }, [q.data, hydrated]);

  if (q.isLoading) {
    return (
      <div className="grid gap-5">
        <div className="hirfi-skeleton h-16 rounded-xl" />
        <div className="hirfi-skeleton h-72 rounded-xl" />
      </div>
    );
  }
  if (q.isError) {
    return <ErrorState message={errorMessage(q.error)} onRetry={() => void q.refetch()} />;
  }
  if (!q.data) return null;

  const p = q.data.profile;
  const role = p.role as AppRole;
  const isProvider = role === "provider";
  const districts = DISTRICTS_BY_CITY[city] ?? [];
  const avg = ratingAvg(p.ratingSum, p.ratingCount);

  function toggleSkill(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function save() {
    if (displayName.trim().length < 2) return toast.error("الاسم الظاهر يجب أن يكون حرفين على الأقل");
    if (phone.trim() && !isValidMoroccanPhone(phone.trim()))
      return toast.error("رقم الهاتف المغربي يبدأ بـ 05/06/07 ويتكوّن من 10 أرقام");
    if (isProvider && selected.length === 0)
      return toast.error("اختر مهارة واحدة على الأقل لتستقبل الطلبات المناسبة");
    setSaving(true);
    try {
      await update.mutateAsync({
        displayName: displayName.trim(),
        phone: phone.trim() || null,
        bio: bio.trim() || null,
        city: city as (typeof MOROCCAN_CITIES)[number],
        district: district || null,
        yearsExperience: years,
        hourlyNote: hourlyNote.trim() || null,
      });
      if (isProvider) await setSkills.mutateAsync({ categoryIds: selected });
      await utils.invalidate();
      toast.success("حُفظ ملفك");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function switchRole(next: AppRole) {
    if (next === role) return;
    try {
      await setRoleM.mutateAsync({ role: next });
      await utils.invalidate();
      toast.success(
        next === "provider"
          ? "تحوّلت إلى حساب حرّاف — أكمل مهاراتك وموقعك الآن"
          : "تحوّلت إلى حساب زبون",
      );
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  async function pickWork(file: File | undefined) {
    if (!file) return;
    const invalid = validateImage(file);
    if (invalid) return toast.error(invalid);
    try {
      const up = await upload(file);
      await addWork.mutateAsync({ imageUrl: up.url, caption: caption.trim() || null });
      setCaption("");
      await utils.invalidate();
      toast.success("أُضيف العمل إلى معرضك");
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  async function dropWork(id: string) {
    try {
      await removeWork.mutateAsync({ id });
      await utils.invalidate();
      toast.success("أُزيل العمل");
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  return (
    <div className="grid gap-5">
      <PageHeader
        icon={UserCircle}
        title="ملفي الشخصي"
        description="هذه البيانات هي ما يراه الطرف الآخر: الاسم، الموقع (لحساب المسافة)، والتقييمات المستلمة."
        action={
          <div className="flex flex-wrap items-center gap-2">
            {p.isVerified ? <VerifiedBadge /> : null}
            <Button asChild variant="outline" size="sm" className="gap-1.5">
              <Link href={`/providers/${p.userId}`}>
                <Eye className="size-3.5" />
                ملفي العام
              </Link>
            </Button>
          </div>
        }
      />

      {/* بطاقة الحالة */}
      <section className="card-warm flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card p-4">
        <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-brand/12 font-display text-xl font-extrabold text-brand-dark">
          {p.displayName.trim().charAt(0)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <b className="font-display text-lg font-extrabold">{p.displayName}</b>
            {p.isVerified ? <VerifiedBadge /> : null}
            <Badge tone={isProvider ? "teal" : "brand"} icon={isProvider ? Briefcase : UserCircle}>
              {isProvider ? "حساب حرّاف" : "حساب زبون"}
            </Badge>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>{p.city}{p.district ? ` — ${p.district}` : ""}</span>
            <span>انضمّ {formatDateAr(p.createdAt)}</span>
            {isProvider ? <span>{p.completedJobs} عمل منجز</span> : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="text-end">
            <div className="text-xs text-muted-foreground">متوسّط التقييم</div>
            <div className="mt-0.5 flex items-center gap-1.5">
              <Stars value={avg ?? 0} />
              <b className="text-sm">{avg !== null ? `${avg} (${p.ratingCount})` : "بلا تقييم"}</b>
            </div>
          </div>
          <Badge tone="teal" icon={Wallet}>
            رصيد: {formatMAD(q.data.balance)}
          </Badge>
        </div>
      </section>

      {/* تبديل الدور */}
      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-base font-bold">دوري في التطبيق</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          يمكنك التبديل في أي وقت — لا يفقد حسابك طلباته ولا عروضه ولا تقييماته.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {(
            [
              {
                key: "customer" as AppRole,
                icon: UserCircle,
                title: "زبون",
                body: "أنشر الطلبات وأقارن العروض وأتفاوض وأقيّم.",
              },
              {
                key: "provider" as AppRole,
                icon: Briefcase,
                title: "حرّاف / مقدّم خدمة",
                body: "أتصفّح الطلبات القريبة وأقدّم عروضاً وأنفّذ وأربح.",
              },
            ] as const
          ).map((r) => {
            const active = role === r.key;
            return (
              <button
                key={r.key}
                type="button"
                onClick={() => void switchRole(r.key)}
                disabled={setRoleM.isPending}
                className={cn(
                  "relative rounded-xl border p-4 text-start transition-colors disabled:opacity-60",
                  active ? "border-brand bg-brand/6 ring-2 ring-brand/20" : "border-border hover:border-brand/40",
                )}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={cn(
                      "grid size-9 place-items-center rounded-lg",
                      active ? "bg-brand text-white" : "bg-brand/10 text-brand-dark",
                    )}
                  >
                    <r.icon className="size-4.5" />
                  </span>
                  <b className="text-sm">{r.title}</b>
                  {active ? (
                    <span className="ms-auto inline-flex items-center gap-1 text-xs font-semibold text-brand-dark">
                      <Check className="size-3.5" />
                      الدور الحالي
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{r.body}</p>
              </button>
            );
          })}
        </div>
      </section>

      {/* بياناتي */}
      <section className="grid gap-4 rounded-xl border border-border bg-card p-5 sm:grid-cols-2">
        <h2 className="text-base font-bold sm:col-span-2">بياناتي</h2>

        <Field label="الاسم الظاهر" hint="هذا ما يراه الطرف الآخر في العروض والمحادثات" required>
          <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={60} />
        </Field>

        <Field label="رقم الهاتف" hint="اختياري — لا يظهر لأي طرف قبل الاتفاق">
          <Input
            dir="ltr"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            maxLength={20}
            placeholder="0612345678"
          />
        </Field>

        <Field label="المدينة" required hint="تُستعمل لحساب نطاق المسافة (قريب/متوسط/بعيد)">
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

        <Field label="الحي" hint="نفس الحي = «قريب» عند الحرّاف">
          <Select value={district} onChange={(e) => setDistrict(e.target.value)}>
            <option value="">— بلا تحديد —</option>
            {districts.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </Select>
        </Field>

        {isProvider ? (
          <>
            <Field label="سنوات الخبرة" hint="تظهر في ملفك العام وبطاقة عرضك">
              <Input
                type="number"
                min={0}
                max={60}
                value={years}
                onChange={(e) => setYears(Math.max(0, Math.min(60, Number(e.target.value) || 0)))}
              />
            </Field>
            <Field label="ملاحظة عن التسعير" hint="مثال: التشخيص مجاني، والسعر يشمل القطع">
              <Input
                value={hourlyNote}
                onChange={(e) => setHourlyNote(e.target.value)}
                maxLength={160}
                placeholder="ملاحظة قصيرة تظهر في ملفك العام"
              />
            </Field>
          </>
        ) : null}

        <Field
          label="نبذة عنك"
          hint="سطران عن تخصّصك وطريقة عملك — تُقرأ قبل تقديم أي عرض"
          className="sm:col-span-2"
        >
          <Textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={600}
            className="min-h-24"
            placeholder="مثال: كهربائي منذ 2014، متخصّص في أعطال المنازل والتركيب…"
          />
        </Field>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4 sm:col-span-2">
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-teal" />
            <p className="max-w-md leading-relaxed">
              شارة «موثّق» تُمنح من إدارة المنصّة ولا تُفعَّل ذاتياً —
              {p.isVerified ? " وحسابك موثّق." : " وحسابك غير موثّق بعد."}
            </p>
          </div>
          <Button className="gap-2" onClick={() => void save()} disabled={saving}>
            {saving ? <Spinner /> : <Save className="size-4" />}
            احفظ التغييرات
          </Button>
        </div>
      </section>

      {/* المهارات — للحرّاف */}
      {isProvider ? (
        <section className="rounded-xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-bold">مهاراتي وفئات خدمتي</h2>
            <Badge tone="teal" icon={Check}>
              {selected.length} مختارة من {(cats.data ?? []).length || 12}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            تُستعمل لترجيح الطلبات المناسبة لك في صفحة التصفّح.
          </p>
          {cats.isLoading ? (
            <div className="mt-4 grid gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="hirfi-skeleton h-11 rounded-lg" />
              ))}
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
        </section>
      ) : null}

      {/* معرض الأعمال — للحرّاف */}
      {isProvider ? (
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-base font-bold">معرض أعمالي</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            صور لأعمال سابقة تظهر في ملفك العام — حتى 4 صور لكل طلب، وهنا بلا حد أقصى.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label="تعليق الصورة" hint="اختياري — مثال: تركيب مضخّة ماء في عين الشق">
              <Input value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={160} />
            </Field>
            <div className="flex items-end gap-2">
              <label
                className={cn(
                  "inline-flex h-10 cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-4 text-sm font-medium transition-colors hover:border-brand/50",
                  isUploading && "pointer-events-none opacity-60",
                )}
              >
                {isUploading ? <Spinner /> : <ImageIcon className="size-4" />}
                أضف صورة
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    void pickWork(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
          </div>

          {q.data.works.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-border bg-muted/40 px-5 py-8 text-center">
              <ImageIcon className="mx-auto size-6 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
                لا صور بعد — أول صورة ترفعها تُبني عليها ثقة الزبون قبل أن يقرأ عرضك.
              </p>
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {q.data.works.map((w) => (
                <figure key={w.id} className="group relative overflow-hidden rounded-lg border border-border">
                  <img src={w.imageUrl} alt={w.caption ?? "عمل سابق"} className="aspect-square w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => void dropWork(w.id)}
                    disabled={removeWork.isPending}
                    aria-label="إزالة العمل"
                    className="absolute end-2 top-2 grid size-7 place-items-center rounded-full bg-destructive text-white opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                  {w.caption ? (
                    <figcaption className="bg-card px-2 py-1.5 text-[11px] text-muted-foreground">
                      {w.caption}
                    </figcaption>
                  ) : null}
                </figure>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {/* روابط سريعة + التقييمات المستلمة */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-3">
          <Link
            href="/wallet"
            className="card-warm flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-brand/40"
          >
            <span className="grid size-9 place-items-center rounded-lg bg-teal-soft text-teal">
              <Wallet className="size-4.5" />
            </span>
            <div>
              <div className="text-sm font-semibold">المحفظة</div>
              <div className="text-xs text-muted-foreground">رصيدك: {formatMAD(q.data.balance)}</div>
            </div>
          </Link>
          <Link
            href="/notifications"
            className="card-warm flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-brand/40"
          >
            <span className="grid size-9 place-items-center rounded-lg bg-warn-soft text-warn">
              <Bell className="size-4.5" />
            </span>
            <div>
              <div className="text-sm font-semibold">الإشعارات</div>
              <div className="text-xs text-muted-foreground">عروض، قبول، رسائل، تقييمات</div>
            </div>
          </Link>
        </div>

        <ReviewsReceived />
      </div>
    </div>
  );
}

// ── المراجعات المستلمة على ملفي ─────────────────────────────────────────────
function ReviewsReceived() {
  const q = trpc.profile.reviews.useQuery();

  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <h2 className="flex items-center gap-1.5 text-base font-bold">
        <Star className="size-4.5 text-warn" />
        مراجعاتي المستلمة
      </h2>
      <div className="mt-3 grid gap-3">
        {q.isLoading ? (
          <div className="grid gap-2">
            <div className="hirfi-skeleton h-16 rounded-lg" />
            <div className="hirfi-skeleton h-16 rounded-lg" />
          </div>
        ) : q.isError ? (
          <Button variant="outline" size="sm" className="w-fit gap-1.5" onClick={() => void q.refetch()}>
            <RefreshCw className="size-3.5" />
            تعذّر التحميل — أعد المحاولة
          </Button>
        ) : (q.data ?? []).length === 0 ? (
          <p className="rounded-lg border border-dashed border-border bg-muted/40 px-3.5 py-5 text-center text-xs text-muted-foreground">
            لا مراجعات بعد — تُكتب بعد إتمام أول طلب.
          </p>
        ) : (
          (q.data ?? []).slice(0, 4).map((rv) => (
            <article key={rv.id} className="rounded-lg border border-border bg-background p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Stars value={rv.rating} size="sm" />
                  <b className="text-xs">{rv.authorName}</b>
                </div>
                <span className="text-[11px] text-muted-foreground">{formatDateAr(rv.createdAt)}</span>
              </div>
              {rv.comment ? (
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{rv.comment}</p>
              ) : null}
              <p className="mt-1.5 text-[11px] text-muted-foreground/80">على: {rv.requestTitle}</p>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
