// ── إدارة العروض: مراقبة السوق وسحب عرض مخالف بسبب إلزامي ────────────────────
import { useState } from "react";
import { Briefcase, Ban, RefreshCw, ShieldCheck, Clock } from "lucide-react";
import { AdminShell, DataTable, Tr, Td } from "@/components/hirfi/admin-shell";
import { TableSkeleton } from "@/components/hirfi/admin-skeleton";
import { SearchBox, FilterChips, ReasonDialog } from "@/components/hirfi/admin-ui";
import { ErrorState, Badge } from "@/components/hirfi/primitives";
import { Button } from "@/components/ui/button";
import { trpc } from "@/_core/trpc";
import { toast } from "@/lib/toast";
import { formatMAD, timeAgoAr, errorMessage, offerStatusMeta, formatDuration } from "@/lib/format";
import type { OfferStatus } from "@shared/constants";

export default function AdminOffers() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<OfferStatus | "">("");
  const [withdrawTarget, setWithdrawTarget] = useState<{ id: string; title: string; provider: string } | null>(null);

  const utils = trpc.useUtils();
  const q = trpc.admin.offers.list.useQuery({
    search: search || undefined,
    status: status || undefined,
    limit: 100,
  });

  const withdrawM = trpc.admin.offers.withdraw.useMutation({
    onSuccess: () => {
      toast.success("سُحب العرض وأُشعر الحرّاف بالسبب");
      utils.admin.offers.list.invalidate();
      utils.admin.overview.invalidate();
      setWithdrawTarget(null);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const rows = q.data ?? [];

  return (
    <AdminShell
      section="offers"
      title="العروض"
      description="كل العروض المقدَّمة. سحب العرض يوقفه فوراً ويُشعر الحرّاف، ويُسجَّل السبب في سجل الإدارة."
      action={
        <Button variant="secondary" className="gap-1.5 rounded-xl" onClick={() => q.refetch()}>
          <RefreshCw className="size-4" /> تحديث
        </Button>
      }
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <SearchBox value={search} onChange={setSearch} placeholder="ابحث في الطلب أو اسم الحرّاف…" className="w-full max-w-sm" />
        <FilterChips
          options={[
            { value: "", label: "الكل" },
            { value: "pending", label: "معلّق" },
            { value: "countered", label: "تفاوض" },
            { value: "accepted", label: "مقبول" },
            { value: "rejected", label: "مرفوض" },
            { value: "withdrawn", label: "مسحوب" },
          ]}
          value={status}
          onChange={(v) => setStatus(v as OfferStatus | "")}
        />
      </div>

      {q.isLoading ? (
        <TableSkeleton rows={8} />
      ) : q.error ? (
        <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />
      ) : (
        <DataTable
          columns={["العرض", "الطلب", "الحرّاف", "المبلغ", "المدة", "الحالة", "حالة الطلب", "أُرسل", ""]}
          empty={rows.length === 0}
        >
          {rows.map((o) => {
            const st = offerStatusMeta(o.status);
            return (
              <Tr key={o.id}>
                <Td className="font-mono text-[10.5px] text-muted-foreground">{o.id.slice(0, 8)}</Td>
                <Td className="max-w-xs font-bold">{o.requestTitle}</Td>
                <Td>
                  <span className="flex items-center gap-1.5">
                    <span className="font-bold">{o.providerName ?? "—"}</span>
                    {o.providerVerified ? (
                      <ShieldCheck className="size-3.5 text-success" aria-label="موثّق" />
                    ) : null}
                  </span>
                </Td>
                <Td className="font-black">{formatMAD(o.price)}</Td>
                <Td className="text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="size-3" /> {formatDuration(o.durationMinutes)}
                  </span>
                </Td>
                <Td>
                  <Badge tone={st.tone}>{st.label}</Badge>
                </Td>
                <Td className="text-muted-foreground">{o.requestStatus}</Td>
                <Td className="text-muted-foreground">{timeAgoAr(o.createdAt)}</Td>
                <Td>
                  {o.status === "pending" || o.status === "countered" ? (
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-7 gap-1 rounded-lg px-2 text-[11px]"
                      onClick={() =>
                        setWithdrawTarget({
                          id: o.id,
                          title: o.requestTitle,
                          provider: o.providerName ?? "الحرّاف",
                        })
                      }
                    >
                      <Ban className="size-3" /> سحب
                    </Button>
                  ) : (
                    <span className="text-[11px] text-muted-foreground">—</span>
                  )}
                </Td>
              </Tr>
            );
          })}
        </DataTable>
      )}

      <p className="mt-3 flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
        <Briefcase className="size-3.5" /> {rows.length} عرض معروض (بحدّ 100).
      </p>

      <ReasonDialog
        open={!!withdrawTarget}
        busy={withdrawM.isPending}
        title="سحب العرض إدارياً"
        description={`سيُسحب عرض «${withdrawTarget?.provider}» على «${withdrawTarget?.title}» ويُرسل له السبب.`}
        confirmLabel="سحب العرض"
        minLength={5}
        onCancel={() => setWithdrawTarget(null)}
        onConfirm={(reason) => withdrawTarget && withdrawM.mutate({ offerId: withdrawTarget.id, reason })}
      />
    </AdminShell>
  );
}
