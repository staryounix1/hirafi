// ── إدارة التصنيفات: إضافة/تعديل/حذف الفئات، مع منع حذف فئة مستعملة ───────────
import { useState } from "react";
import { Tags, Plus, Pencil, Trash2, RefreshCw, Save, X, Lock } from "lucide-react";
import { AdminShell, DataTable, Tr, Td } from "@/components/hirfi/admin-shell";
import { TableSkeleton } from "@/components/hirfi/admin-skeleton";
import { ReasonDialog } from "@/components/hirfi/admin-ui";
import { ErrorState, Badge } from "@/components/hirfi/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/_core/trpc";
import { toast } from "@/lib/toast";
import { errorMessage, categoryIcon, kindMeta, kindIcon } from "@/lib/format";
import { SERVICE_KINDS, type ServiceKind } from "@shared/constants";

type Draft = {
  id?: string;
  slug: string;
  nameAr: string;
  icon: string;
  kind: ServiceKind;
  commissionPercent: string;
  requiresVerification: boolean;
  description: string;
  sortOrder: string;
};

/** اقتراح أيقونة حسب اسم المهنة/الخدمة — باش الأدمن ما يحتاجش يحفظ أسماء Lucide. */
function suggestIcon(nameAr: string, kind: ServiceKind): string {
  const k = kind;
  const keys: [RegExp, string][] = [
    [/سباك|ماء|تسريب/, "Wrench"],
    [/كهرب|إنارة|طريسيان/, "Zap"],
    [/نجار|خشب|خزائن|مطبخ/, "Hammer"],
    [/صباغ|طلاء|تشطيب/, "PaintRoller"],
    [/تكييف|تبريد|مكيف|ثلاج/, "Snowflake"],
    [/تنظيف|تعقيم/, "Sparkles"],
    [/نقل|أثاث/, "Truck"],
    [/هاتف|حاسوب|إلكترون|جهاز|إصلاح/, "Smartphone"],
    [/خياط|كي|ملابس/, "Scissors"],
    [/تصوير/, "Camera"],
    [/درس|تعليم|تكوين/, "GraduationCap"],
    [/بنّاء|بناء|تشييد|أشغال|جبص/, "Hammer"],
    [/حداد|لحام|معدن/, "Flame"],
    [/ألمنيوم|زجاج|نوافذ/, "Square"],
    [/شمس|طاقة/, "Sun"],
    [/سيار|ميكانيك|غسيل/, "Car"],
    [/بستن|حديق|نبات/, "Trees"],
    [/طبخ|تموين|مناسبات|مأكول/, "UtensilsCrossed"],
    [/كوافير|حلاق|تجميل/, "Scissors"],
    [/صحة|طبي|حجام/, "Stethoscope"],
    [/حراس|أمن|كاميرا|مراقب/, "ShieldCheck"],
    [/حشر|قوارض|مبيد/, "Bug"],
    [/مساعد|جليس|طفل/, "Baby"],
    [/لوغو|هوية|ديكور|منشور|تصميم/, "Palette"],
    [/فيديو|مونتاج|موشن|ريل/, "Clapperboard"],
    [/سوشل|صفح|تواصل/, "Share2"],
    [/صور/, "ImagePlus"],
    [/كتاب|مقال|محتوى|إعلان|إشهار/, "PenLine"],
    [/ترجم|تعريب/, "Languages"],
    [/متجر|بيع/, "ShoppingCart"],
    [/موقع|ويب|هبوط|باك|API|API/, "Code2"],
    [/صوت|بودكاست|تعليق/, "Mic"],
    [/تطبيق|جوال/, "Smartphone"],
    [/SEO|ظهور|تحسين/, "Search"],
    [/إعلان|ممول|تسويق/, "Megaphone"],
    [/بريد|إيميل/, "Mail"],
    [/محاسب|جرد|عدّ|بيانات|جدول/, "Table"],
    [/دعم|معلوماتي|شبكات/, "MonitorCog"],
    [/توظيف|انتقاء/, "UserPlus"],
    [/طباع|تجليد/, "Printer"],
    [/تغليف|طلبات/, "Package"],
    [/لوجست|توزيع|توصيل|مندوب/, "Truck"],
    [/عزل|رطوب/, "Droplets"],
    [/مسبح|ماء/, "Waves"],
    [/حديد|باب|قفل/, "KeyRound"],
    [/لافتة|إشهار|واجهة/, "Signpost"],
    [/رخام|غرانيت|زليج|تبليط/, "Gem"],
    [/مساعد|افتراضي|إداري/, "UserCog"],
  ];
  for (const [re, icon] of keys) if (re.test(nameAr)) return icon;
  return k === "digital" ? "Laptop" : k === "b2b" ? "Building2" : "Wrench";
}

/** اقتراح slug لاتيني بسيط من الاسم العربي حسب النوع. */
function slugFromName(nameAr: string, kind: ServiceKind): string {
  const map: [RegExp, string][] = [
    [/سباك/, "plumbing"], [/كهرب/, "electrical"], [/نجار/, "carpentry"],
    [/بناء|بنّاء/, "construction"], [/حداد|لحام/, "welding"], [/صباغ/, "painting"],
    [/تنظيف/, "cleaning"], [/نقل/, "moving"], [/تكييف/, "hvac"],
  ];
  for (const [re, slug] of map) if (re.test(nameAr)) return `${slug}-${kind}`;
  const base = nameAr.trim().toLowerCase().replace(/\s+/g, "-");
  return `${base || "cat"}-${kind}`;
}

const EMPTY: Draft = {
  slug: "",
  nameAr: "",
  icon: "Wrench",
  kind: "field",
  commissionPercent: "15",
  requiresVerification: false,
  description: "",
  sortOrder: "0",
};

export default function AdminCategories() {
  const [draft, setDraft] = useState<Draft | null>(null);

  /** إضافة سريعة: الأدمن كيكتب غير الاسم، والأيقونة والـslug كيتقترحو أوتوماتيكياً. */
  const [quickName, setQuickName] = useState("");
  const [quickKind, setQuickKind] = useState<ServiceKind>("field");
  const quickValid = quickName.trim().length >= 2;
  const [removeTarget, setRemoveTarget] = useState<{ id: string; name: string } | null>(null);

  const utils = trpc.useUtils();
  const q = trpc.admin.categories.list.useQuery();

  const saveM = trpc.admin.categories.save.useMutation({
    onSuccess: () => {
      toast.success("حُفظت الفئة");
      utils.admin.categories.list.invalidate();
      utils.categories.list.invalidate();
      setDraft(null);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const removeM = trpc.admin.categories.remove.useMutation({
    onSuccess: () => {
      toast.success("حُذفت الفئة");
      utils.admin.categories.list.invalidate();
      utils.categories.list.invalidate();
      setRemoveTarget(null);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const rows = q.data ?? [];
  const valid = !!draft && draft.nameAr.trim().length >= 2 && draft.slug.trim().length >= 2 && draft.icon.trim().length >= 2;

  return (
    <AdminShell
      section="categories"
      title="التصنيفات"
      description="فئات الخدمات التي يختار منها الزبون ويحدّد الحرّاف مهاراته. لا يمكن حذف فئة مستعملة في طلبات أو مهارات."
      action={
        <div className="flex gap-2">
          <Button variant="secondary" className="gap-1.5 rounded-xl" onClick={() => q.refetch()}>
            <RefreshCw className="size-4" /> تحديث
          </Button>
          <Button className="gap-1.5 rounded-xl" onClick={() => setDraft({ ...EMPTY })}>
            <Plus className="size-4" /> فئة جديدة
          </Button>
        </div>
      }
    >
      <div className="mb-4 rounded-2xl border border-dashed border-brand/60 bg-brand/5 p-4">
        <h2 className="text-[14px] font-black">إضافة سريعة لخدمة جديدة</h2>
        <p className="mt-1 text-[11.5px] text-muted-foreground">
          كتب غير اسم الخدمة واختار النوع — الأيقونة والـ slug كيتقترحو بوحدهم، ومن بعد تقدر تعدّل التفاصيل.
        </p>
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <label className="min-w-[220px] flex-1">
            <span className="text-[11px] font-bold text-muted-foreground">اسم الخدمة</span>
            <Input
              value={quickName}
              onChange={(e) => setQuickName(e.target.value)}
              placeholder="مثال: تركيب المصاعد"
              className="mt-1.5 h-10 rounded-xl text-[13px]"
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-bold text-muted-foreground">النوع</span>
            <select
              value={quickKind}
              onChange={(e) => setQuickKind(e.target.value as ServiceKind)}
              className="mt-1.5 h-10 rounded-xl border border-input bg-card px-3 text-[13px]"
            >
              {SERVICE_KINDS.map((k) => (
                <option key={k} value={k}>
                  {kindMeta(k).labelAr}
                </option>
              ))}
            </select>
          </label>
          <Button
            className="h-10 gap-1.5 rounded-xl"
            disabled={!quickValid || saveM.isPending}
            onClick={() => {
              const name = quickName.trim();
              const next = rows.length ? Math.max(...rows.map((r) => r.sortOrder)) + 1 : 0;
              saveM.mutate(
                {
                  slug: slugFromName(name, quickKind),
                  nameAr: name,
                  icon: suggestIcon(name, quickKind),
                  kind: quickKind,
                  commissionPercent: kindMeta(quickKind).commission,
                  requiresVerification: false,
                  description: null,
                  sortOrder: next,
                },
                { onSuccess: () => setQuickName("") },
              );
            }}
          >
            <Plus className="size-4" /> أضف الخدمة
          </Button>
        </div>
        <p className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          الأيقونة المقترحة: <b className="text-foreground">{suggestIcon(quickName, quickKind)}</b>
        </p>
      </div>

      {draft ? (
        <div className="mb-4 rounded-2xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[14px] font-black">{draft.id ? "تعديل الفئة" : "إضافة فئة"}</h2>
            <Button variant="ghost" size="sm" className="rounded-lg" onClick={() => setDraft(null)}>
              <X className="size-4" />
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block">
              <span className="text-[11px] font-bold text-muted-foreground">الاسم بالعربية</span>
              <Input
                value={draft.nameAr}
                onChange={(e) => {
                  const nameAr = e.target.value;
                  setDraft((prev) =>
                    prev
                      ? {
                          ...prev,
                          nameAr,
                          // الاسم العربي ماشي كيعطي slug لاتيني مقروء — نستعملو اقتراحاً حسب المهنة.
                          slug: prev.id ? prev.slug : slugFromName(nameAr, prev.kind),
                          icon: suggestIcon(nameAr, prev.kind),
                        }
                      : prev,
                  );
                }}
                placeholder="مثال: كهرباء"
                className="mt-1.5 h-10 rounded-xl text-[13px]"
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-bold text-muted-foreground">المعرّف (slug)</span>
              <Input
                value={draft.slug}
                onChange={(e) => setDraft({ ...draft, slug: e.target.value })}
                placeholder="electricity"
                className="mt-1.5 h-10 rounded-xl text-left text-[13px]"
                style={{ direction: "ltr" }}
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-bold text-muted-foreground">اسم الأيقونة (Lucide)</span>
              <Input
                value={draft.icon}
                onChange={(e) => setDraft({ ...draft, icon: e.target.value })}
                placeholder="Zap"
                className="mt-1.5 h-10 rounded-xl text-left text-[13px]"
                style={{ direction: "ltr" }}
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-bold text-muted-foreground">الترتيب</span>
              <Input
                type="number"
                value={draft.sortOrder}
                onChange={(e) => setDraft({ ...draft, sortOrder: e.target.value })}
                className="mt-1.5 h-10 rounded-xl text-[13px]"
              />
            </label>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block">
              <span className="text-[11px] font-bold text-muted-foreground">نوع الخدمة</span>
              <select
                value={draft.kind}
                onChange={(e) =>
                  setDraft({ ...draft, kind: e.target.value as ServiceKind })
                }
                className="mt-1.5 h-10 w-full rounded-xl border border-input bg-card px-3 text-[13px]"
              >
                {SERVICE_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {kindMeta(k).labelAr} — عمولة {kindMeta(k).commission}%
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-[11px] font-bold text-muted-foreground">نسبة العمولة %</span>
              <Input
                type="number"
                min={0}
                max={50}
                value={draft.commissionPercent}
                onChange={(e) => setDraft({ ...draft, commissionPercent: e.target.value })}
                className="mt-1.5 h-10 rounded-xl text-[13px]"
              />
            </label>
            <label className="flex items-center gap-2 pt-5">
              <input
                type="checkbox"
                checked={draft.requiresVerification}
                onChange={(e) => setDraft({ ...draft, requiresVerification: e.target.checked })}
                className="size-4 accent-brand"
              />
              <span className="text-[12px] font-bold text-muted-foreground">
                تتطلّب حرّافاً موثّقاً
              </span>
            </label>
            <label className="block">
              <span className="text-[11px] font-bold text-muted-foreground">وصف مختصر</span>
              <Input
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                placeholder="سطر يظهر للزبون"
                className="mt-1.5 h-10 rounded-xl text-[13px]"
              />
            </label>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <Button
              className="gap-1.5 rounded-xl"
              disabled={!valid || saveM.isPending}
              onClick={() =>
                draft &&
                saveM.mutate({
                  id: draft.id,
                  slug: draft.slug.trim(),
                  nameAr: draft.nameAr.trim(),
                  icon: draft.icon.trim(),
                  kind: draft.kind,
                  commissionPercent: Math.max(0, Math.min(50, Number(draft.commissionPercent) || 0)),
                  requiresVerification: draft.requiresVerification,
                  description: draft.description.trim() || null,
                  sortOrder: Math.max(0, Math.min(999, Number(draft.sortOrder) || 0)),
                })
              }
            >
              <Save className="size-4" /> حفظ
            </Button>
            <span className="text-[11.5px] text-muted-foreground">
              icône Lucide (Zap، Wrench، PaintRoller…) — تُعرض في التطبيق.
            </span>
          </div>
        </div>
      ) : null}

      {q.isLoading ? (
        <TableSkeleton rows={6} />
      ) : q.error ? (
        <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />
      ) : (
        <DataTable columns={["الأيقونة", "الاسم", "النوع", "العمولة", "المعرّف", "الترتيب", "طلبات", "حرّافون", "إجراءات"]} empty={rows.length === 0}>
          {rows.map((c) => {
            const Icon = categoryIcon(c.icon);
            const used = c.requestsCount + c.providersCount > 0;
            const kMeta = kindMeta(c.kind);
            const KIcon = kindIcon(c.kind);
            return (
              <Tr key={c.id}>
                <Td>
                  <span className="grid size-9 place-items-center rounded-xl bg-brand text-brand-ink">
                    <Icon className="size-4.5" />
                  </span>
                </Td>
                <Td className="font-bold">
                  {c.nameAr}
                  {c.requiresVerification ? (
                    <Badge tone="warn" className="ms-1.5">توثيق</Badge>
                  ) : null}
                </Td>
                <Td>
                  <Badge tone="info" icon={KIcon}>{kMeta.shortAr}</Badge>
                </Td>
                <Td className="font-black">{c.commissionPercent}%</Td>
                <Td className="font-mono text-[11.5px] text-muted-foreground">
                  <span style={{ direction: "ltr" }}>{c.slug}</span>
                </Td>
                <Td>{c.sortOrder}</Td>
                <Td>
                  <Badge tone={c.requestsCount > 0 ? "brand" : "muted"}>{c.requestsCount}</Badge>
                </Td>
                <Td>
                  <Badge tone={c.providersCount > 0 ? "teal" : "muted"}>{c.providersCount}</Badge>
                </Td>
                <Td>
                  <div className="flex flex-wrap gap-1.5">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-7 gap-1 rounded-lg px-2 text-[11px]"
                      onClick={() =>
                        setDraft({
                          id: c.id,
                          slug: c.slug,
                          nameAr: c.nameAr,
                          icon: c.icon,
                          kind: c.kind as ServiceKind,
                          commissionPercent: String(c.commissionPercent),
                          requiresVerification: c.requiresVerification,
                          description: c.description ?? "",
                          sortOrder: String(c.sortOrder),
                        })
                      }
                    >
                      <Pencil className="size-3" /> تعديل
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={used}
                      title={used ? "الفئة مستعملة في طلبات أو مهارات — لا يمكن حذفها، عطّلها بالعدّل بدل ذلك" : "حذف الفئة"}
                      className="h-7 gap-1 rounded-lg px-2 text-[11px] disabled:opacity-40"
                      onClick={() => !used && setRemoveTarget({ id: c.id, name: c.nameAr })}
                    >
                      {used ? <Lock className="size-3" /> : <Trash2 className="size-3" />} حذف
                    </Button>
                  </div>
                </Td>
              </Tr>
            );
          })}
        </DataTable>
      )}

      <p className="mt-3 flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
        <Tags className="size-3.5" /> {rows.length} فئة. الفئات المستعملة لا تُحذف — عدّلها أو أضف غيرها.
      </p>

      <ReasonDialog
        open={!!removeTarget}
        busy={removeM.isPending}
        title="حذف الفئة"
        description={`سيُحذف تصنيف «${removeTarget?.name}» نهائياً. مسموح فقط لأن الفئة غير مستعملة.`}
        confirmLabel="حذف الفئة"
        minLength={2}
        onCancel={() => setRemoveTarget(null)}
        onConfirm={() => removeTarget && removeM.mutate({ id: removeTarget.id })}
      />
    </AdminShell>
  );
}

