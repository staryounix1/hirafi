// ── سجل الإدارة: كل فعل إداري مؤرَّخ مع المشرف والهدف والسبب ──────────────────
import { ScrollText, RefreshCw, ShieldCheck } from "lucide-react";
import { AdminShell, DataTable, Tr, Td } from "@/components/hirfi/admin-shell";
import { TableSkeleton } from "@/components/hirfi/admin-skeleton";
import { ErrorState, Badge } from "@/components/hirfi/primitives";
import { Button } from "@/components/ui/button";
import { trpc } from "@/_core/trpc";
import { formatDateTimeAr, errorMessage } from "@/lib/format";
import type { Tone } from "@/lib/format";

const ACTION_META: Record<string, { label: string; tone: Tone }> = {
  BLOCK_USER: { label: "حظر مستخدم", tone: "danger" },
  UNBLOCK_USER: { label: "إعادة تفعيل مستخدم", tone: "success" },
  VERIFY_PROVIDER: { label: "توثيق حرّاف", tone: "success" },
  UNVERIFY_PROVIDER: { label: "إلغاء توثيق", tone: "warn" },
  CANCEL_REQUEST: { label: "إلغاء طلب", tone: "danger" },
  WITHDRAW_OFFER: { label: "سحب عرض", tone: "warn" },
  CREDIT_WALLET: { label: "إضافة رصيد", tone: "success" },
  DEBIT_WALLET: { label: "خصم رصيد", tone: "danger" },
  DELETE_REVIEW: { label: "حذف تقييم", tone: "danger" },
  CREATE_CATEGORY: { label: "إضافة فئة", tone: "success" },
  UPDATE_CATEGORY: { label: "تعديل فئة", tone: "info" },
  DELETE_CATEGORY: { label: "حذف فئة", tone: "danger" },
};

export default function AdminAudit() {
  const q = trpc.admin.audit.list.useQuery({ limit: 200 });
  const rows = q.data ?? [];

  return (
    <AdminShell
      section="audit"
      title="سجل الإدارة"
      description="أثر دائم لكل فعل إداري: من فعل ماذا، على أي هدف، ولماذا. السجل لا يُحذف ولا يُعدّل."
      action={
        <Button variant="secondary" className="gap-1.5 rounded-xl" onClick={() => q.refetch()}>
          <RefreshCw className="size-4" /> تحديث
        </Button>
      }
    >
      {q.isLoading ? (
        <TableSkeleton rows={10} />
      ) : q.error ? (
        <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />
      ) : (
        <DataTable columns={["الفعل", "المشرف", "الهدف", "السبب", "التاريخ"]} empty={rows.length === 0}>
          {rows.map((a) => {
            const meta = ACTION_META[a.action] ?? { label: a.action, tone: "muted" as Tone };
            return (
              <Tr key={a.id}>
                <Td>
                  <Badge tone={meta.tone}>{meta.label}</Badge>
                </Td>
                <Td>
                  <span className="font-bold">{a.adminName ?? a.adminEmail ?? "—"}</span>
                </Td>
                <Td className="text-muted-foreground">
                  <span className="text-[11px]">{a.targetType}</span>
                  {a.targetId ? (
                    <span className="block font-mono text-[10.5px]">{a.targetId.slice(0, 12)}</span>
                  ) : null}
                </Td>
                <Td className="max-w-sm">{a.detail ?? "—"}</Td>
                <Td className="whitespace-nowrap text-muted-foreground">{formatDateTimeAr(a.createdAt)}</Td>
              </Tr>
            );
          })}
        </DataTable>
      )}

      <p className="mt-3 flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
        <ShieldCheck className="size-3.5" /> {rows.length} حركة مسجّلة (بحدّ 200).{" "}
        <ScrollText className="size-3.5" /> السجل للقراءة فقط.
      </p>
    </AdminShell>
  );
}
