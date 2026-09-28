// ── خدمات الواجهة: إضافة/إزالة/ترتيب خيارات شريط «شنو بغيتي اليوم؟» ───────────
// كل خيار إمّا يعرض نوعاً كاملاً (ميداني/رقمي/شركات)، أو مجموعة فئات مختارة،
// أو فئة واحدة. الترتيب هو ترتيب الظهور فالرئيسية.
import { useState } from "react";
import { Plus, Trash2, Save, Pencil, X, RefreshCw, ArrowUp, ArrowDown, Eye, EyeOff } from "lucide-react";
import { AdminShell, DataTable, Tr, Td } from "@/components/hirfi/admin-shell";
import { TableSkeleton } from "@/components/hirfi/admin-skeleton";
import { ReasonDialog } from "@/components/hirfi/admin-ui";
import { ErrorState, Badge } from "@/components/hirfi/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/_core/trpc";
import { toast } from "@/lib/toast";
import { errorMessage, categoryIcon, kindMeta } from "@/lib/format";
import { SERVICE_KINDS, type ServiceKind } from "@shared/constants";
import { SERVICE_CATALOG } from "@shared/catalog";

type Draft = {
  id?: string;
  labelAr: string;
  slug: string;
  icon: string;
  kindFilter: "" | ServiceKind;
  subSlugs: string;
  active: boolean;
};

const EMPTY: Draft = { labelAr: "", slug: "", icon: "", kindFilter: "", subSlugs: "", active: true };

/** اقتراح أيقونة حسب التسمية — نفس منطق التصنيفات. */
function suggestIcon(labelAr: string, kind: string): string {
  const keys: [RegExp, string][] = [
    [/سباك|ماء/, "Wrench"], [/كهرب/, "Zap"], [/نجار|خشب/, "Hammer"],
    [/صباغ|طلاء/, "PaintRoller"], [/تكييف|تبريد/, "Snowflake"], [/تنظيف|تعقيم/, "Sparkles"],
    [/نقل|أثاث/, "Truck"], [/هاتف|حاسوب|إلكترون|إصلاح|صيانة/, "Settings"],
    [/خياط|كي/, "Scissors"], [/تصوير/, "Camera"], [/درس|تعليم/, "GraduationCap"],
    [/بناء|بنّاء|جبص/, "Hammer"], [/حداد|لحام/, "Flame"], [/سيار/, "Car"],
    [/بستن|حديق/, "Trees"], [/طبخ|مناسبات/, "ChefHat"], [/كوافير|حلاق/, "Scissors"],
    [/صحة|طبي/, "Stethoscope"], [/حراس|أمن|كاميرا/, "ShieldCheck"], [/حشر/, "Bug"],
    [/منزل|جليس|طفل|عناية/, "HeartHandshake"], [/رقمي|فريلانس/, "Laptop"],
    [/شرك|مقاول/, "Building2"], [/قضاء|أغراض|شراء/, "ShoppingBasket"],
  ];
  for (const [re, icon] of keys) if (re.test(labelAr)) return icon;
  return kind === "digital" ? "Laptop" : kind === "b2b" ? "Building2" : "Wrench";
}

export default function AdminHomeMenu() {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [removeTarget, setRemoveTarget] = useState<{ id: string; label: string } | null>(null);

  const utils = trpc.useUtils();
  const q = trpc.admin.homeMenu.list.useQuery();

  const saveM = trpc.admin.homeMenu.save.useMutation({
    onSuccess: () => {
      toast.success("حُفظ الخيار");
      utils.admin.homeMenu.list.invalidate();
      utils.homeMenu.list.invalidate();
      setDraft(null);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const removeM = trpc.admin.homeMenu.remove.useMutation({
    onSuccess: () => {
      toast.success("حُذف الخيار");
      utils.admin.homeMenu.list.invalidate();
      utils.homeMenu.list.invalidate();
      setRemoveTarget(null);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const reorderM = trpc.admin.homeMenu.reorder.useMutation({
    onSuccess: () => {
      utils.admin.homeMenu.list.invalidate();
      utils.homeMenu.list.invalidate();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const rows = q.data ?? [];
  const valid = !!draft && draft.labelAr.trim().length >= 2;

  function move(id: string, dir: -1 | 1) {
    const ids = rows.map((r) => r.id);
    const i = ids.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    reorderM.mutate({ ids });
  }

  return (
    <AdminShell
      section="homeMenu"
      title="خدمات الواجهة"
      description="خيارات شريط «شنو بغيتي اليوم؟» فالصفحة الرئيسية. زيد خياراً، امسح واحداً، أو غيّر الترتيب — كيتطبّق فوراً على الواجهة."
      action={
        <div className="flex gap-2">
          <Button variant="secondary" className="gap-1.5 rounded-xl" onClick={() => q.refetch()}>
            <RefreshCw className="size-4" /> تحديث
          </Button>
          <Button className="gap-1.5 rounded-xl" onClick={() => setDraft({ ...EMPTY })}>
            <Plus className="size-4" /> خيار جديد
          </Button>
        </div>
      }
    >
      {draft ? (
        <div className="mb-4 rounded-2xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[14px] font-black">{draft.id ? "تعديل الخيار" : "إضافة خيار"}</h2>
            <Button variant="ghost" size="sm" className="rounded-lg" onClick={() => setDraft(null)}>
              <X className="size-4" />
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block">
              <span className="text-[11px] font-bold text-muted-foreground">التسمية</span>
              <Input
                value={draft.labelAr}
                onChange={(e) => {
                  const labelAr = e.target.value;
                  setDraft((prev) =>
                    prev
                      ? { ...prev, labelAr, icon: prev.icon || suggestIcon(labelAr, prev.kindFilter || "field") }
                      : prev,
                  );
                }}
                placeholder="مثال: خدمات قريبة"
                className="mt-1.5 h-10 rounded-xl text-[13px]"
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-bold text-muted-foreground">المعرّف (slug)</span>
              <Input
                value={draft.slug}
                onChange={(e) => setDraft({ ...draft, slug: e.target.value })}
                placeholder="field"
                className="mt-1.5 h-10 rounded-xl text-left text-[13px]"
                style={{ direction: "ltr" }}
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-bold text-muted-foreground">أيقونة (Lucide)</span>
              <Input
                value={draft.icon}
                onChange={(e) => setDraft({ ...draft, icon: e.target.value })}
                placeholder="Wrench"
                className="mt-1.5 h-10 rounded-xl text-left text-[13px]"
                style={{ direction: "ltr" }}
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-bold text-muted-foreground">يعرض فئات نوع</span>
              <select
                value={draft.kindFilter}
                onChange={(e) => setDraft({ ...draft, kindFilter: e.target.value as Draft["kindFilter"] })}
                className="mt-1.5 h-10 w-full rounded-xl border border-input bg-card px-3 text-[13px]"
              >
                <option value="">— لا (مجموعة/فئة واحدة) —</option>
                {SERVICE_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {kindMeta(k).labelAr}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="mt-3 block">
            <span className="text-[11px] font-bold text-muted-foreground">
              فئات المجموعة (slug مفصولة بفواصل) — فارغة = فئة واحدة بslug الخيار
            </span>
            <Input
              value={draft.subSlugs}
              onChange={(e) => setDraft({ ...draft, subSlugs: e.target.value })}
              placeholder="painting,plaster,construction"
              className="mt-1.5 h-10 rounded-xl text-left text-[13px]"
              style={{ direction: "ltr" }}
            />
          </label>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={draft.active}
                onChange={(e) => setDraft({ ...draft, active: e.target.checked })}
                className="size-4 accent-brand"
              />
              <span className="text-[12px] font-bold text-muted-foreground">ظاهر فالواجهة</span>
            </label>
            <Button
              className="gap-1.5 rounded-xl"
              disabled={!valid || saveM.isPending}
              onClick={() =>
                draft &&
                saveM.mutate({
                  id: draft.id,
                  labelAr: draft.labelAr.trim(),
                  slug: draft.slug.trim() || undefined,
                  icon: draft.icon.trim() || null,
                  kindFilter: draft.kindFilter || null,
                  subSlugs: draft.subSlugs.trim() || null,
                  active: draft.active,
                })
              }
            >
              <Save className="size-4" /> حفظ
            </Button>
          </div>
        </div>
      ) : null}

      {q.isLoading ? (
        <TableSkeleton rows={5} />
      ) : q.error ? (
        <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />
      ) : (
        <DataTable
          columns={["الأيقونة", "التسمية", "المعرّف", "يعرض", "الترتيب", "الحالة", "إجراءات"]}
          empty={rows.length === 0}
        >
          {rows.map((item) => {
            const Icon = categoryIcon(item.icon ?? "");
            const kindLabel = item.kindFilter ? kindMeta(item.kindFilter).shortAr : null;
            const subCount = item.subSlugs ? item.subSlugs.split(",").filter(Boolean).length : 0;
            return (
              <Tr key={item.id}>
                <Td>
                  <span className="grid size-9 place-items-center rounded-xl bg-brand text-brand-ink">
                    <Icon className="size-4.5" />
                  </span>
                </Td>
                <Td className="font-bold">{item.labelAr}</Td>
                <Td className="font-mono text-[11.5px] text-muted-foreground">
                  <span style={{ direction: "ltr" }}>{item.slug}</span>
                </Td>
                <Td>
                  {kindLabel ? (
                    <Badge tone="info">{kindLabel}</Badge>
                  ) : subCount > 0 ? (
                    <Badge tone="brand">{subCount} فئات</Badge>
                  ) : (
                    <Badge tone="muted">فئة واحدة</Badge>
                  )}
                </Td>
                <Td>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-7 w-7 rounded-lg p-0"
                      title="طلع"
                      onClick={() => move(item.id, -1)}
                    >
                      <ArrowUp className="size-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-7 w-7 rounded-lg p-0"
                      title="نزّل"
                      onClick={() => move(item.id, 1)}
                    >
                      <ArrowDown className="size-3.5" />
                    </Button>
                    <span className="ms-1 font-bold">{item.sortOrder}</span>
                  </div>
                </Td>
                <Td>
                  <Badge tone={item.active ? "success" : "muted"} icon={item.active ? Eye : EyeOff}>
                    {item.active ? "ظاهر" : "مخفي"}
                  </Badge>
                </Td>
                <Td>
                  <div className="flex flex-wrap gap-1.5">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-7 gap-1 rounded-lg px-2 text-[11px]"
                      onClick={() =>
                        setDraft({
                          id: item.id,
                          labelAr: item.labelAr,
                          slug: item.slug,
                          icon: item.icon ?? "",
                          kindFilter: (item.kindFilter as ServiceKind | null) ?? "",
                          subSlugs: item.subSlugs ?? "",
                          active: item.active,
                        })
                      }
                    >
                      <Pencil className="size-3" /> تعديل
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-7 gap-1 rounded-lg px-2 text-[11px]"
                      onClick={() => setRemoveTarget({ id: item.id, label: item.labelAr })}
                    >
                      <Trash2 className="size-3" /> حذف
                    </Button>
                  </div>
                </Td>
              </Tr>
            );
          })}
        </DataTable>
      )}

      <p className="mt-3 text-[11.5px] text-muted-foreground">
        {rows.length} خيار · {SERVICE_CATALOG.length} خدمة متوفرة فالكتالوج. الترتيب أعلاه هو ترتيب الظهور فالرئيسية.
      </p>

      <ReasonDialog
        open={!!removeTarget}
        busy={removeM.isPending}
        title="حذف خيار الشريط"
        description={`سيُحذف خيار «${removeTarget?.label}» من شريط الرئيسية. الخدمات نفسها ما تتحذفش.`}
        confirmLabel="حذف الخيار"
        minLength={2}
        onCancel={() => setRemoveTarget(null)}
        onConfirm={() => removeTarget && removeM.mutate({ id: removeTarget.id })}
      />
    </AdminShell>
  );
}
