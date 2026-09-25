// ── إدارة الطلبات: كل الطلبات، بحث، تصفية بالحالة/المدينة، وإلغاء قسري مسبَّب ─
import { useState } from "react";
import { ClipboardList, Ban, RefreshCw, MessageSquare } from "lucide-react";
import { AdminShell, DataTable, Tr, Td } from "@/components/hirfi/admin-shell";
import { TableSkeleton } from "@/components/hirfi/admin-skeleton";
import { SearchBox, FilterChips, ReasonDialog } from "@/components/hirfi/admin-ui";
import { ErrorState, Badge } from "@/components/hirfi/primitives";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { trpc } from "@/_core/trpc";
import { toast } from "@/lib/toast";
import { formatMAD, timeAgoAr, errorMessage, requestStatusMeta, urgencyMeta } from "@/lib/format";
import { MOROCCAN_CITIES, type RequestStatus, type MoroccanCity } from "@shared/constants";

export default function AdminRequests() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<RequestStatus | "">("");
  const [city, setCity] = useState<MoroccanCity | "">("");
  const [cancelTarget, setCancelTarget] = useState<{ id: string; title: string } | null>(null);

  const utils = trpc.useUtils();
  const q = trpc.admin.requests.list.useQuery({
    search: search || undefined,
    status: status || undefined,
    city: city || undefined,
    limit: 100,
  });

  const cancelM = trpc.admin.requests.cancel.useMutation({
    onSuccess: () => {
      toast.success("أُلغي الطلب وأُشعر الزبون بالسبب");
      utils.admin.requests.list.invalidate();
      utils.admin.overview.invalidate();
      setCancelTarget(null);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const rows = q.data ?? [];

  return (
    <AdminShell
      section="requests"
      title="الطلبات"
      description="كل طلبات المنصّة. الإلغاء الإداري يوقف الطلب فوراً ويرسل السبب للزبون، ويبقى الطلب في السجل."
      action={
        <Button variant="secondary" className="gap-1.5 rounded-xl" onClick={() => q.refetch()}>
          <RefreshCw className="size-4" /> تحديث
        </Button>
      }
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <SearchBox value={search} onChange={setSearch} placeholder="ابحث في العنوان أو الوصف…" className="w-full max-w-sm" />
        <Select
          value={city}
          onChange={(e) => setCity(e.target.value as MoroccanCity | "")}
          className="h-10 w-40 rounded-xl text-[13px]"
        >
          <option value="">كل المدن</option>
          {MOROCCAN_CITIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
      </div>
      <div className="mb-3">
        <FilterChips
          options={[
            { value: "", label: "الكل" },
            { value: "open", label: "منشور" },
            { value: "accepted", label: "مقبول" },
            { value: "in_progress", label: "قيد التنفيذ" },
            { value: "completed", label: "منتهي" },
            { value: "cancelled", label: "ملغى" },
          ]}
          value={status}
          onChange={(v) => setStatus(v as RequestStatus | "")}
        />
      </div>

      {q.isLoading ? (
        <TableSkeleton rows={8} />
      ) : q.error ? (
        <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />
      ) : (
        <DataTable
          columns={["الطلب", "الزبون", "الفئة", "المدينة", "الميزانية", "العروض", "الحالة", "أُنشئ", ""]}
          empty={rows.length === 0}
        >
          {rows.map((r) => {
            const st = requestStatusMeta(r.status);
            const urg = urgencyMeta(r.urgency);
            const canCancel = r.status !== "cancelled" && r.status !== "completed";
            return (
              <Tr key={r.id}>
                <Td>
                  <div className="flex max-w-xs flex-col gap-1">
                    <span className="font-bold">{r.title}</span>
                    <span className="flex items-center gap-1.5">
                      <Badge tone={urg.tone}>{urg.label}</Badge>
                      {r.district ? <span className="text-[11px] text-muted-foreground">{r.district}</span> : null}
                    </span>
                    <span className="font-mono text-[10.5px] text-muted-foreground">{r.id.slice(0, 8)}</span>
                  </div>
                </Td>
                <Td className="text-muted-foreground">{r.customerName ?? "—"}</Td>
                <Td>
                  <span className="font-bold">{r.categoryName}</span>
                </Td>
                <Td>{r.city}</Td>
                <Td className="font-black">{formatMAD(r.agreedAmount ?? r.budgetAmount)}</Td>
                <Td>
                  <Badge tone={r.offerCount > 0 ? "brand" : "muted"}>
                    <MessageSquare className="size-3" /> {r.offerCount}
                  </Badge>
                </Td>
                <Td>
                  <Badge tone={st.tone}>{st.label}</Badge>
                </Td>
                <Td className="text-muted-foreground">{timeAgoAr(r.createdAt)}</Td>
                <Td>
                  {canCancel ? (
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-7 gap-1 rounded-lg px-2 text-[11px]"
                      onClick={() => setCancelTarget({ id: r.id, title: r.title })}
                    >
                      <Ban className="size-3" /> إلغاء
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
        <ClipboardList className="size-3.5" /> {rows.length} طلب معروض (بحدّ 100).
      </p>

      <ReasonDialog
        open={!!cancelTarget}
        busy={cancelM.isPending}
        title="إلغاء الطلب إدارياً"
        description={`سيُلغى «${cancelTarget?.title}» ويُرسل السبب للزبون. لا يمكن التراجع.`}
        confirmLabel="إلغاء الطلب"
        minLength={5}
        onCancel={() => setCancelTarget(null)}
        onConfirm={(reason) => cancelTarget && cancelM.mutate({ requestId: cancelTarget.id, reason })}
      />
    </AdminShell>
  );
}
