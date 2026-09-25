// ── إدارة التصنيفات: إضافة/تعديل/حذف الفئات، مع منع حذف فئة مستعملة ───────────
import { useState } from "react";
import { Tags, Plus, Pencil, Trash2, RefreshCw, Save, X } from "lucide-react";
import { AdminShell, DataTable, Tr, Td } from "@/components/hirfi/admin-shell";
import { TableSkeleton } from "@/components/hirfi/admin-skeleton";
import { ReasonDialog } from "@/components/hirfi/admin-ui";
import { ErrorState, Badge } from "@/components/hirfi/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/_core/trpc";
import { toast } from "@/lib/toast";
import { errorMessage, categoryIcon } from "@/lib/format";

type Draft = { id?: string; slug: string; nameAr: string; icon: string; sortOrder: string };

const EMPTY: Draft = { slug: "", nameAr: "", icon: "Wrench", sortOrder: "0" };

export default function AdminCategories() {
  const [draft, setDraft] = useState<Draft | null>(null);
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
                onChange={(e) => setDraft({ ...draft, nameAr: e.target.value, slug: draft.id ? draft.slug : slugify(e.target.value) })}
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
                  sortOrder: Math.max(0, Math.min(999, Number(draft.sortOrder) || 0)),
                })
              }
            >
              <Save className="size-4" /> حفظ
            </Button>
            <span className="text-[11.5px] text-muted-foreground">
              الأيقونة اسم أيقونة Lucide (Zap، Wrench، PaintRoller…) — تُعرض في التطبيق.
            </span>
          </div>
        </div>
      ) : null}

      {q.isLoading ? (
        <TableSkeleton rows={6} />
      ) : q.error ? (
        <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />
      ) : (
        <DataTable columns={["الأيقونة", "الاسم", "المعرّف", "الترتيب", "طلبات", "حرّافون", "إجراءات"]} empty={rows.length === 0}>
          {rows.map((c) => {
            const Icon = categoryIcon(c.icon);
            const used = c.requestsCount + c.providersCount > 0;
            return (
              <Tr key={c.id}>
                <Td>
                  <span className="grid size-9 place-items-center rounded-xl bg-brand text-brand-ink">
                    <Icon className="size-4.5" />
                  </span>
                </Td>
                <Td className="font-bold">{c.nameAr}</Td>
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
                      title={used ? "الفئة مستعملة — لا يمكن حذفها" : undefined}
                      className="h-7 gap-1 rounded-lg px-2 text-[11px]"
                      onClick={() => setRemoveTarget({ id: c.id, name: c.nameAr })}
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

function slugify(v: string): string {
  return v
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}
