// ── طلبات تفعيل حساب الحرّاف ───────────────────────────────────────────────────
// كل صف: معلومات الحساب (اسم، إيميل، هاتف، مدينة، مهارات) + وثائق مصوّرة،
// وزرّي موافقة/رفض. الموافقة كتقلب isVerified=true وكتحيّد حاجز المنصة فوراً.
import { useState } from "react";
import { BadgeCheck, Ban, Check, IdCard, Car, Phone, MapPin, RefreshCw, ShieldAlert } from "lucide-react";
import { AdminShell, DataTable, Tr, Td } from "@/components/hirfi/admin-shell";
import { TableSkeleton } from "@/components/hirfi/admin-skeleton";
import { FilterChips, ReasonDialog } from "@/components/hirfi/admin-ui";
import { ErrorState, Badge, EmptyState } from "@/components/hirfi/primitives";
import { Button } from "@/components/ui/button";
import { trpc } from "@/_core/trpc";
import { toast } from "@/lib/toast";
import { errorMessage, timeAgoAr } from "@/lib/format";

type StatusFilter = "pending" | "approved" | "rejected";

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "pending", label: "قيد المراجعة" },
  { value: "approved", label: "مقبولة" },
  { value: "rejected", label: "مرفوضة" },
];

/** معرض وثيقة واحدة — الضغط يفتحها بالحجم الكامل. */
function DocThumb({ url, label, required }: { url: string | null; label: string; required?: boolean }) {
  if (!url) {
    return (
      <div className="grid h-24 w-20 shrink-0 place-items-center rounded-xl border border-dashed border-border bg-muted/40 text-center text-[9.5px] text-muted-foreground">
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
        <br />غائبة
      </div>
    );
  }
  return (
    <a href={url} target="_blank" rel="noreferrer" className="group block shrink-0" title={label}>
      <img src={url} alt={label} className="h-24 w-20 rounded-xl object-cover ring-1 ring-border transition group-hover:ring-brand" />
      <span className="mt-1 block text-center text-[9.5px] font-bold text-muted-foreground">{label}</span>
    </a>
  );
}

export default function AdminVerifications() {
  const [status, setStatus] = useState<StatusFilter>("pending");
  const [rejecting, setRejecting] = useState<{ id: string; name: string } | null>(null);

  const utils = trpc.useUtils();
  const q = trpc.admin.verifications.list.useQuery({ status, limit: 100 });

  const reviewM = trpc.admin.verifications.review.useMutation({
    onSuccess: (_r, v) => {
      toast.success(v.approve ? "تم تفعيل الحساب" : "رُفض طلب التفعيل مع إشعار الحرّاف");
      utils.admin.verifications.list.invalidate();
      utils.admin.verifications.counts.invalidate();
      utils.admin.overview.invalidate();
      setRejecting(null);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const rows = q.data ?? [];

  return (
    <AdminShell
      section="verifications"
      title="طلبات التفعيل"
      description="وثائق الحرّافين الجدد: البطاقة الوطنية، رخصة السياقة (إلا كان سائق)، وصورة سيلفي. الموافقة تفتح لهم المنصة فوراً؛ الرفض يبعت إشعاراً بسبب."
      action={
        <Button variant="secondary" className="gap-1.5 rounded-xl" onClick={() => q.refetch()}>
          <RefreshCw className="size-4" /> تحديث
        </Button>
      }
    >
      <div className="mb-4">
        <FilterChips
          value={status}
          onChange={(v) => setStatus((v || "pending") as StatusFilter)}
          options={FILTERS}
        />
      </div>

      {q.isLoading ? (
        <TableSkeleton rows={4} />
      ) : q.isError ? (
        <ErrorState message={errorMessage(q.error)} onRetry={() => void q.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={BadgeCheck}
          title={status === "pending" ? "لا طلبات قيد المراجعة" : "لا نتائج"}
          description="ملي كيرفع حرّاف وثائقو، غادي يبان هنا مع كامل معلوماتو ووثائقو."
        />
      ) : (
        <DataTable columns={["الحرّاف", "التواصل", "الوثائق", "الحالة", "إجراء"]}>
          {rows.map((r) => (
            <Tr key={r.id}>
              <Td>
                <div className="flex items-start gap-2">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-secondary font-display text-[13px] font-black">
                    {(r.displayName ?? "?").trim().charAt(0)}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <b className="text-[13px]">{r.displayName ?? "بلا اسم"}</b>
                      {r.isVerified ? <BadgeCheck className="size-3.5 text-teal" /> : null}
                      {r.isDriver ? (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-warn/15 px-1.5 py-0.5 text-[9.5px] font-black text-warn">
                          <Car className="size-2.5" /> سائق
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">{r.email}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10.5px] text-muted-foreground">
                      {r.phone ? (
                        <span dir="ltr" className="inline-flex items-center gap-1">
                          <Phone className="size-3" /> {r.phone}
                        </span>
                      ) : null}
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="size-3" /> {r.city}
                        {r.district ? ` — ${r.district}` : ""}
                      </span>
                    </div>
                  </div>
                </div>
              </Td>

              <Td>
                <div className="grid gap-0.5 text-[11px] text-muted-foreground">
                  <span>خبرة: {r.yearsExperience ?? 0} سنة</span>
                  {r.bio ? <span className="line-clamp-2 max-w-56">{r.bio}</span> : null}
                </div>
              </Td>

              <Td>
                <div className="flex gap-2" dir="ltr">
                  <DocThumb url={r.idFrontUrl} label="البطاقة/وجه" required />
                  <DocThumb url={r.idBackUrl} label="البطاقة/ظهر" required />
                  <DocThumb url={r.selfieUrl} label="سيلفي" required />
                  <DocThumb url={r.licenseUrl} label="الرخصة" required={r.isDriver} />
                </div>
              </Td>

              <Td>
                <div className="grid gap-1.5">
                  <Badge tone={r.status === "approved" ? "success" : r.status === "rejected" ? "danger" : "muted"}>
                    {r.status === "approved" ? "مفعّل" : r.status === "rejected" ? "مرفوض" : "قيد المراجعة"}
                  </Badge>
                  <span className="text-[10.5px] text-muted-foreground">{timeAgoAr(r.createdAt)}</span>
                </div>
              </Td>

              <Td>
                {r.status === "pending" ? (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      className="gap-1.5 rounded-full"
                      disabled={reviewM.isPending}
                      onClick={() => reviewM.mutate({ verificationId: r.id, approve: true })}
                    >
                      <Check className="size-3.5" /> موافقة على التفعيل
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 rounded-full text-destructive"
                      onClick={() => setRejecting({ id: r.id, name: r.displayName ?? r.email })}
                    >
                      <Ban className="size-3.5" /> رفض
                    </Button>
                  </div>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                    <ShieldAlert className="size-3.5" /> روجعت
                  </span>
                )}
              </Td>
            </Tr>
          ))}
        </DataTable>
      )}

      <ReasonDialog
        open={!!rejecting}
        title={`رفض تفعيل «${rejecting?.name ?? ""}»`}
        description="السبب كيوصل للحرّاف فإشعار، فخلّيه واضح باش يصحّح الوثائق."
        confirmLabel="رفض الطلب"
        onCancel={() => setRejecting(null)}
        onConfirm={(note) => {
          if (!rejecting) return;
          reviewM.mutate({ verificationId: rejecting.id, approve: false, note });
        }}
        busy={reviewM.isPending}
      />

      {!q.isLoading && rows.length > 0 ? (
        <p className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <IdCard className="size-3.5" /> اضغط على أي صورة باش تشوفها بالحجم الكامل.
        </p>
      ) : null}
    </AdminShell>
  );
}
