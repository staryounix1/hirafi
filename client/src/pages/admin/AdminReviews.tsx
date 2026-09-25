// ── إدارة التقييمات: مراجعة كل التقييمات وحذف المسيء منها (مع إعادة حساب المعدّل) ─
import { useState } from "react";
import { Star, Trash2, RefreshCw } from "lucide-react";
import { AdminShell, DataTable, Tr, Td } from "@/components/hirfi/admin-shell";
import { TableSkeleton } from "@/components/hirfi/admin-skeleton";
import { SearchBox, FilterChips, ReasonDialog } from "@/components/hirfi/admin-ui";
import { ErrorState, Stars } from "@/components/hirfi/primitives";
import { Button } from "@/components/ui/button";
import { trpc } from "@/_core/trpc";
import { toast } from "@/lib/toast";
import { timeAgoAr, errorMessage } from "@/lib/format";

export default function AdminReviews() {
  const [search, setSearch] = useState("");
  const [band, setBand] = useState<"" | "low" | "mid" | "high">("");
  const [target, setTarget] = useState<{ id: string; name: string } | null>(null);

  const utils = trpc.useUtils();
  const q = trpc.admin.reviews.list.useQuery({
    search: search || undefined,
    minRating: band === "low" ? 1 : band === "mid" ? 3 : undefined,
    maxRating: band === "low" ? 2 : band === "mid" ? 3 : undefined,
    limit: 150,
  });

  const removeM = trpc.admin.reviews.remove.useMutation({
    onSuccess: () => {
      toast.success("حُذف التقييم وأُعيد حساب معدّل المُقيَّم");
      utils.admin.reviews.list.invalidate();
      utils.admin.overview.invalidate();
      setTarget(null);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const rows = q.data ?? [];

  return (
    <AdminShell
      section="reviews"
      title="التقييمات"
      description="كل تقييمات الزبائن على الحرّافين. حذف تقييم مسيء يعيد حساب مجاميع المعدّل فوراً، ويُشعر الحرّاف."
      action={
        <Button variant="secondary" className="gap-1.5 rounded-xl" onClick={() => q.refetch()}>
          <RefreshCw className="size-4" /> تحديث
        </Button>
      }
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <SearchBox value={search} onChange={setSearch} placeholder="ابحث في التعليق أو اسم الطلب…" className="w-full max-w-sm" />
        <FilterChips
          options={[
            { value: "", label: "كل التقييمات" },
            { value: "low", label: "1–2 نجوم" },
            { value: "mid", label: "3 نجوم" },
          ]}
          value={band}
          onChange={(v) => setBand(v as typeof band)}
        />
      </div>

      {q.isLoading ? (
        <TableSkeleton rows={8} />
      ) : q.error ? (
        <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />
      ) : (
        <DataTable
          columns={["النجوم", "التعليق", "الطلب", "من", "إلى", "التاريخ", ""]}
          empty={rows.length === 0}
        >
          {rows.map((r) => (
            <Tr key={r.id}>
              <Td>
                <Stars value={r.rating} />
              </Td>
              <Td className="max-w-sm">
                <span className="text-[12.5px] leading-snug">{r.comment?.trim() || "بلا تعليق"}</span>
              </Td>
              <Td className="max-w-[10rem] text-muted-foreground">{r.requestTitle}</Td>
              <Td className="font-bold">{r.authorName ?? "—"}</Td>
              <Td className="font-bold">{r.targetName ?? "—"}</Td>
              <Td className="text-muted-foreground">{timeAgoAr(r.createdAt)}</Td>
              <Td>
                <Button
                  size="sm"
                  variant="destructive"
                  className="h-7 gap-1 rounded-lg px-2 text-[11px]"
                  onClick={() => setTarget({ id: r.id, name: r.targetName ?? "الحرّاف" })}
                >
                  <Trash2 className="size-3" /> حذف
                </Button>
              </Td>
            </Tr>
          ))}
        </DataTable>
      )}

      <p className="mt-3 flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
        <Star className="size-3.5" /> {rows.length} تقييم معروض (بحدّ 150).
      </p>

      <ReasonDialog
        open={!!target}
        busy={removeM.isPending}
        title="حذف التقييم"
        description={`سيُحذف التقييم من ملف «${target?.name}» ويُعاد حساب معدّله. لا يمكن التراجع.`}
        confirmLabel="حذف التقييم"
        minLength={4}
        onCancel={() => setTarget(null)}
        onConfirm={(reason) => target && removeM.mutate({ reviewId: target.id, reason })}
      />
    </AdminShell>
  );
}
