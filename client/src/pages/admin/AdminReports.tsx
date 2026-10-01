// ── البلاغات: صندوق وارد للشكاوى — مراجعة، ملاحظة، وإغلاق دون حذف ────────────
import { useState } from "react";
import { Flag, RefreshCw, CheckCircle2, XCircle, Eye, ShieldAlert, Ban, Undo2, Gavel } from "lucide-react";
import { AdminShell, DataTable, Tr, Td, MetricCard } from "@/components/hirfi/admin-shell";
import { TableSkeleton } from "@/components/hirfi/admin-skeleton";
import { SearchBox, FilterChips, Tag } from "@/components/hirfi/admin-ui";
import { ErrorState, EmptyState, Badge } from "@/components/hirfi/primitives";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { trpc } from "@/_core/trpc";
import { toast } from "@/lib/toast";
import { timeAgoAr, errorMessage, formatDateTimeAr } from "@/lib/format";

const CATEGORY_LABEL: Record<string, string> = {
  no_show: "عدم حضور",
  fraud: "غش / نصب",
  abuse: "تعامل سيئ",
  quality: "رداءة الخدمة",
  spam: "إزعاج / رسائل متكررة",
  other: "أخرى",
};

const STATUS_META: Record<string, { label: string; tone: "brand" | "warn" | "success" | "muted" }> = {
  open: { label: "جديد", tone: "brand" },
  reviewing: { label: "قيد المراجعة", tone: "warn" },
  resolved: { label: "معالَج", tone: "success" },
  dismissed: { label: "مُغلق بلا فعل", tone: "muted" },
};

type StatusFilter = "" | "open" | "reviewing" | "resolved" | "dismissed";

export default function AdminReports() {
  const [status, setStatus] = useState<StatusFilter>("open");
  const [search, setSearch] = useState("");
  const [target, setTarget] = useState<{ id: string; next: "reviewing" | "resolved" | "dismissed" } | null>(null);
  const [resolveRow, setResolveRow] = useState<null | {
    id: string;
    requestId: string | null;
    requestTitle: string | null;
    targetUserId: string | null;
    targetUserName: string | null;
    reporterName: string | null;
    body: string;
  }>(null);

  const utils = trpc.useUtils();
  const q = trpc.admin.reports.list.useQuery({
    status: status || undefined,
    search: search || undefined,
    limit: 150,
  });
  const countsQ = trpc.admin.reports.counts.useQuery();

  const updateM = trpc.admin.reports.update.useMutation({
    onSuccess: (_r, v) => {
      toast.success(v.status === "dismissed" ? "أُغلق البلاغ" : v.status === "resolved" ? "وُسم البلاغ كمعالَج" : "حُدّثت الحالة");
      utils.admin.reports.list.invalidate();
      utils.admin.reports.counts.invalidate();
      utils.admin.overview.invalidate();
      setTarget(null);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const resolveM = trpc.admin.reports.resolve.useMutation({
    onSuccess: (r) => {
      toast.success(r.refunded ? `حُسم النزاع — رجع ${r.refunded} درهم للحرّاف` : "حُسم النزاع");
      utils.admin.reports.list.invalidate();
      utils.admin.reports.counts.invalidate();
      utils.admin.overview.invalidate();
      setResolveRow(null);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const rows = q.data ?? [];
  const counts = countsQ.data;

  return (
    <AdminShell
      section="reports"
      title="البلاغات"
      description="شكاوى الزبائن والحرّافين على طلب أو مستخدم. البلاغ لا يُحذف — يُوسَم معالَجاً أو يُغلق، مع ملاحظة تُرسل للمبلّغ."
      action={
        <Button variant="secondary" className="gap-1.5 rounded-xl" onClick={() => q.refetch()}>
          <RefreshCw className="size-4" /> تحديث
        </Button>
      }
    >
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricCard label="بلاغات جديدة" value={counts?.open ?? "—"} tone="danger" />
        <MetricCard label="قيد المراجعة" value={counts?.reviewing ?? "—"} tone="warn" />
        <MetricCard label="معالَجة" value={counts?.resolved ?? "—"} tone="success" />
        <MetricCard label="مُغلقة بلا فعل" value={counts?.dismissed ?? "—"} />
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <SearchBox value={search} onChange={setSearch} placeholder="ابحث في نص البلاغ أو الملاحظة…" className="w-full max-w-sm" />
        <FilterChips
          options={[
            { value: "", label: "الكل" },
            { value: "open", label: "جديد" },
            { value: "reviewing", label: "قيد المراجعة" },
            { value: "resolved", label: "معالَج" },
            { value: "dismissed", label: "مُغلق" },
          ]}
          value={status}
          onChange={(v) => setStatus(v as StatusFilter)}
        />
      </div>

      {q.isLoading ? (
        <TableSkeleton rows={6} />
      ) : q.error ? (
        <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Flag}
          title="لا بلاغات في هذه الحالة"
          description="لا يوجد ما يحتاج مراجعة هنا. البلاغات الجديدة تظهر تلقائياً في هذا الصندوق."
        />
      ) : (
        <DataTable
          columns={["الحالة", "النوع", "البلاغ", "المبلّغ", "الهدف", "التاريخ", "إجراءات"]}
          empty={false}
        >
          {rows.map((r) => {
            const st = STATUS_META[r.status] ?? STATUS_META.open;
            const tgt = r.targetType === "request" ? r.requestTitle ?? "طلب محذوف" : r.targetUserName ?? "—";
            return (
              <Tr key={r.id}>
                <Td>
                  <Badge tone={st.tone}>{st.label}</Badge>
                </Td>
                <Td>
                  <span className="text-[11.5px] font-bold">{CATEGORY_LABEL[r.category] ?? r.category}</span>
                  <span className="block text-[10.5px] text-muted-foreground">
                    {r.targetType === "request" ? "بلاغ عن طلب" : r.targetType === "user" ? "بلاغ عن مستخدم" : "بلاغ عام"}
                  </span>
                </Td>
                <Td className="max-w-sm">
                  <span className="text-[12.5px] leading-snug">{r.body}</span>
                  {r.adminNote ? (
                    <span className="mt-1 block rounded-lg bg-muted px-2 py-1 text-[11px] text-muted-foreground">
                      ملاحظة الإدارة: {r.adminNote}
                    </span>
                  ) : null}
                </Td>
                <Td className="font-bold">{r.reporterName ?? "—"}</Td>
                <Td>
                  <div className="flex max-w-[12rem] flex-col gap-1">
                    <span className="truncate font-bold">{tgt}</span>
                    {r.targetUserBlockedAt ? (
                      <Tag kind="blocked">الهدف موقوف</Tag>
                    ) : r.targetUserId ? (
                      <Tag kind="ok">الهدف نشط</Tag>
                    ) : null}
                  </div>
                </Td>
                <Td className="whitespace-nowrap text-muted-foreground">
                  <span className="block">{timeAgoAr(r.createdAt)}</span>
                  {r.handledAt ? (
                    <span className="block text-[10.5px]">عولج {formatDateTimeAr(r.handledAt)}</span>
                  ) : null}
                </Td>
                <Td>
                  <div className="flex flex-wrap gap-1.5">
                    {r.status === "open" || r.status === "dismissed" ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-7 gap-1 rounded-lg px-2 text-[11px]"
                        onClick={() => setTarget({ id: r.id, next: "reviewing" })}
                      >
                        <Eye className="size-3" /> مراجعة
                      </Button>
                    ) : null}
                    {r.status !== "resolved" ? (
                      <Button
                        size="sm"
                        variant="default"
                        className="h-7 gap-1 rounded-lg px-2 text-[11px]"
                        onClick={() =>
                          setResolveRow({
                            id: r.id,
                            requestId: r.requestId ?? null,
                            requestTitle: r.requestTitle ?? null,
                            targetUserId: r.targetUserId ?? null,
                            targetUserName: r.targetUserName ?? null,
                            reporterName: r.reporterName ?? null,
                            body: r.body,
                          })
                        }
                      >
                        <Gavel className="size-3" /> حسم النزاع
                      </Button>
                    ) : null}
                    {r.status === "open" || r.status === "reviewing" ? (
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-7 gap-1 rounded-lg px-2 text-[11px]"
                        onClick={() => setTarget({ id: r.id, next: "dismissed" })}
                      >
                        <XCircle className="size-3" /> إغلاق
                      </Button>
                    ) : null}
                  </div>
                </Td>
              </Tr>
            );
          })}
        </DataTable>
      )}

      <p className="mt-3 flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
        <ShieldAlert className="size-3.5" /> {rows.length} بلاغ معروض. للتعامل الكامل مع الهدف، استعمل قسم «المستخدمون» للحظر أو «الطلبات» للإلغاء.
      </p>

      {target ? (
        <ReportNoteDialog
          next={target.next}
          busy={updateM.isPending}
          onCancel={() => setTarget(null)}
          onConfirm={(note) => updateM.mutate({ reportId: target.id, status: target.next, note })}
        />
      ) : null}

      {resolveRow ? (
        <ResolveDisputeDialog
          row={resolveRow}
          busy={resolveM.isPending}
          onCancel={() => setResolveRow(null)}
          onConfirm={(payload) => resolveM.mutate(payload)}
        />
      ) : null}
      <span className="hidden">
        <Ban />
      </span>
    </AdminShell>
  );
}

function ReportNoteDialog({
  next,
  busy,
  onCancel,
  onConfirm,
}: {
  next: "reviewing" | "resolved" | "dismissed";
  busy: boolean;
  onCancel: () => void;
  onConfirm: (note: string) => void;
}) {
  const [note, setNote] = useState("");
  const config = {
    reviewing: {
      title: "بدء مراجعة البلاغ",
      desc: "سيظهر البلاغ كـ«قيد المراجعة» ويمكنك بعدها معالجته أو إغلاقه.",
      label: "بدء المراجعة",
      min: 0,
      variant: "default" as const,
    },
    resolved: {
      title: "وسم البلاغ كمعالَج",
      desc: "تُرسل الملاحظة للمبلّغ كإشعار، ويُسجَّل الفعل في سجل الإدارة.",
      label: "تأكيد المعالجة",
      min: 4,
      variant: "default" as const,
    },
    dismissed: {
      title: "إغلاق البلاغ بلا فعل",
      desc: "تُرسل الملاحظة للمبلّغ توضّح سبب عدم اتخاذ إجراء. لا يُحذف البلاغ.",
      label: "إغلاق",
      min: 4,
      variant: "destructive" as const,
    },
  }[next];

  const valid = note.trim().length >= config.min;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal>
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-xl">
        <h2 className="text-[16px] font-black">{config.title}</h2>
        <p className="mt-1 text-[12.5px] leading-snug text-muted-foreground">{config.desc}</p>
        <label className="mt-4 block">
          <span className="text-[11px] font-bold text-muted-foreground">
            {config.min > 0 ? "ملاحظة (تظهر للمبلّغ)" : "ملاحظة اختيارية (داخلية)"}
          </span>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder={config.min > 0 ? "اكتب 4 أحرف على الأقل…" : "اختياري…"}
            className="mt-1.5 rounded-xl text-[13px]"
          />
        </label>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" className="rounded-xl" onClick={onCancel} disabled={busy}>
            إلغاء
          </Button>
          <Button variant={config.variant} className="rounded-xl" disabled={!valid || busy} onClick={() => onConfirm(note.trim())}>
            {config.label}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── حسم النزاع: إغلاق البلاغ + إرجاع عمولة + إجراء على المستخدم ────────────────
function ResolveDisputeDialog({
  row,
  busy,
  onCancel,
  onConfirm,
}: {
  row: {
    id: string;
    requestId: string | null;
    requestTitle: string | null;
    targetUserId: string | null;
    targetUserName: string | null;
    reporterName: string | null;
    body: string;
  };
  busy: boolean;
  onCancel: () => void;
  onConfirm: (p: {
    reportId: string;
    status: "resolved" | "dismissed";
    note: string;
    refund: { toUserId: string; amount: number; requestId: string | null } | null;
    userAction: "none" | "warn" | "block";
  }) => void;
}) {
  const [note, setNote] = useState("");
  const [outcome, setOutcome] = useState<"resolved" | "dismissed">("resolved");
  const [refundOn, setRefundOn] = useState(false);
  const [refundTo, setRefundTo] = useState(row.targetUserId ?? "");
  const [refundAmount, setRefundAmount] = useState("");
  const [userAction, setUserAction] = useState<"none" | "warn" | "block">("none");

  const amount = Number(refundAmount);
  const refundValid = !refundOn || (refundTo && Number.isInteger(amount) && amount > 0);
  const valid = note.trim().length >= 4 && refundValid;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal>
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-xl">
        <h2 className="flex items-center gap-1.5 text-[16px] font-black">
          <Gavel className="size-4 text-brand-dark" /> حسم النزاع
        </h2>
        <p className="mt-1 text-[12.5px] leading-snug text-muted-foreground">
          بلاغ من <b>{row.reporterName ?? "—"}</b>
          {row.requestTitle ? <> على طلب <b>«{row.requestTitle}»</b></> : null}
          . الملاحظة كتوصل للمبلّغ.
        </p>

        {/* النتيجة */}
        <div className="mt-4">
          <span className="text-[11px] font-bold text-muted-foreground">النتيجة</span>
          <div className="mt-1.5 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setOutcome("resolved")}
              className={cnPick(outcome === "resolved")}
            >
              <CheckCircle2 className="size-4" /> معالَج
            </button>
            <button
              type="button"
              onClick={() => setOutcome("dismissed")}
              className={cnPick(outcome === "dismissed")}
            >
              <XCircle className="size-4" /> مُغلق بلا فعل
            </button>
          </div>
        </div>

        {/* إرجاع العمولة */}
        {row.requestId ? (
          <div className="mt-4 rounded-2xl border border-border p-3">
            <label className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-[12.5px] font-bold">
                <Undo2 className="size-4 text-teal" /> إرجاع عمولة المنصّة للحرّاف
              </span>
              <input
                type="checkbox"
                checked={refundOn}
                onChange={(e) => setRefundOn(e.target.checked)}
                className="size-4 accent-[color:var(--brand)]"
              />
            </label>
            {refundOn ? (
              <div className="mt-2.5 grid gap-2">
                <label className="block">
                  <span className="text-[10.5px] font-bold text-muted-foreground">رقم المستخدم (User ID) اللي غادي يرجعلو</span>
                  <Input
                    value={refundTo}
                    onChange={(e) => setRefundTo(e.target.value)}
                    placeholder="uuid…"
                    dir="ltr"
                    className="mt-1 rounded-xl text-[12px]"
                  />
                </label>
                <label className="block">
                  <span className="text-[10.5px] font-bold text-muted-foreground">المبلغ (درهم)</span>
                  <Input
                    type="number"
                    min={1}
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    placeholder="مثال: 48"
                    className="mt-1 rounded-xl text-[12px]"
                  />
                </label>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* إجراء على المستخدم */}
        {row.targetUserId ? (
          <div className="mt-3">
            <span className="text-[11px] font-bold text-muted-foreground">
              إجراء على {row.targetUserName ?? "المستخدم المبلَّغ عنه"}
            </span>
            <div className="mt-1.5 grid grid-cols-3 gap-2">
              {(
                [
                  { v: "none", l: "بلا إجراء" },
                  { v: "warn", l: "تحذير" },
                  { v: "block", l: "حبس الحساب" },
                ] as const
              ).map((o) => (
                <button key={o.v} type="button" onClick={() => setUserAction(o.v)} className={cnPick(userAction === o.v)}>
                  {o.l}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <label className="mt-4 block">
          <span className="text-[11px] font-bold text-muted-foreground">ملاحظة الحسم (تظهر للمبلّغ)</span>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="اشرح القرار بإيجاز…"
            className="mt-1.5 rounded-xl text-[13px]"
          />
        </label>

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" className="rounded-xl" onClick={onCancel} disabled={busy}>
            إلغاء
          </Button>
          <Button
            variant={outcome === "dismissed" ? "destructive" : "default"}
            className="rounded-xl"
            disabled={!valid || busy}
            onClick={() =>
              onConfirm({
                reportId: row.id,
                status: outcome,
                note: note.trim(),
                refund: refundOn
                  ? { toUserId: refundTo, amount: Number(refundAmount), requestId: row.requestId }
                  : null,
                userAction,
              })
            }
          >
            {busy ? "…" : "تأكيد الحسم"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function cnPick(active: boolean) {
  return [
    "flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-[12px] font-bold transition-colors",
    active ? "border-brand bg-brand/15 text-brand-dark" : "border-border bg-card text-muted-foreground hover:bg-muted",
  ].join(" ");
}
