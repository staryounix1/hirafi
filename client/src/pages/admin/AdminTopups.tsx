// ── طلبات شحن المحفظة: يطلبها الحرّاف، وتؤكّدها الإدارة بعد التفاوض على واتساب ──
// المال لا يمرّ عبر المنصّة: الإدارة تتفاوض مع الحرّاف على واتساب، وبعد وصول
// المبلغ المتفق عليه تضغط «تأكيد الشحن» فيُقيَّد الرصيد. لا حذف: كل طلب بأثره.
import { useState } from "react";
import {
  HandCoins,
  RefreshCw,
  MessageCircle,
  CheckCircle2,
  XCircle,
  Eye,
  Clock,
  Phone,
  ShieldAlert,
} from "lucide-react";
import { AdminShell, DataTable, Tr, Td, MetricCard } from "@/components/hirfi/admin-shell";
import { TableSkeleton } from "@/components/hirfi/admin-skeleton";
import { SearchBox, FilterChips } from "@/components/hirfi/admin-ui";
import { ErrorState, EmptyState, Badge } from "@/components/hirfi/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/_core/trpc";
import { toast } from "@/lib/toast";
import { timeAgoAr, errorMessage, formatDateTimeAr, formatMAD, topupStatusMeta } from "@/lib/format";

type StatusFilter = "" | "pending" | "contacted" | "awaiting_payment" | "credited" | "rejected";
type Action = "contacted" | "awaiting_payment" | "rejected";

/** يحوّل رقماً مغربياً إلى صيغة wa.me الدولية (بلا +). null إن تعذّر. */
function waPhone(phone?: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("212")) return digits;
  if (digits.startsWith("0")) return `212${digits.slice(1)}`;
  return digits.length >= 9 ? `212${digits}` : null;
}

export default function AdminTopups() {
  const [status, setStatus] = useState<StatusFilter>("");
  const [search, setSearch] = useState("");
  const [action, setAction] = useState<{ id: string; row: Row; next: Action } | null>(null);
  const [credit, setCredit] = useState<{ row: Row } | null>(null);

  const utils = trpc.useUtils();
  const q = trpc.admin.topups.list.useQuery({
    status: status || undefined,
    search: search || undefined,
    limit: 200,
  });
  const countsQ = trpc.admin.topups.counts.useQuery();

  const updateM = trpc.admin.topups.update.useMutation({
    onSuccess: () => {
      toast.success("حُدّثت حالة الطلب وأُبلغ الحرّاف");
      utils.admin.topups.list.invalidate();
      utils.admin.topups.counts.invalidate();
      utils.admin.overview.invalidate();
      setAction(null);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const confirmM = trpc.admin.topups.confirm.useMutation({
    onSuccess: () => {
      toast.success("تمّ تأكيد الشحن وقُيّد الرصيد");
      utils.admin.topups.list.invalidate();
      utils.admin.topups.counts.invalidate();
      utils.admin.wallets.list.invalidate();
      utils.admin.overview.invalidate();
      setCredit(null);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const rows = q.data ?? [];
  const counts = countsQ.data;

  return (
    <AdminShell
      section="topups"
      title="طلبات الشحن"
      description="حرّافون يطلبون شحن محفظتهم. تفاوض معهم على واتساب، وبعد وصول المبلغ المتفق عليه أكّد الشحن فيُقيَّد الرصيد فوراً. لا يتم أي تحويل مال عبر المنصّة."
      action={
        <Button variant="secondary" className="gap-1.5 rounded-xl" onClick={() => q.refetch()}>
          <RefreshCw className="size-4" /> تحديث
        </Button>
      }
    >
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricCard label="طلبات جديدة" value={counts?.pending ?? "—"} tone="brand" />
        <MetricCard label="قيد التفاوض" value={counts?.contacted ?? "—"} tone="warn" />
        <MetricCard label="في انتظار التحويل" value={counts?.awaiting ?? "—"} tone="warn" />
        <MetricCard label="تمّ شحنها" value={counts?.credited ?? "—"} tone="success" />
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <SearchBox value={search} onChange={setSearch} placeholder="ابحث بالاسم أو البريد أو الرقم…" className="w-full max-w-sm" />
        <FilterChips
          options={[
            { value: "", label: "الكل" },
            { value: "pending", label: "جديد" },
            { value: "contacted", label: "قيد التفاوض" },
            { value: "awaiting_payment", label: "انتظار التحويل" },
            { value: "credited", label: "مشحون" },
            { value: "rejected", label: "مرفوض" },
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
          icon={HandCoins}
          title="لا طلبات شحن في هذه الحالة"
          description="طلبات شحن الحرّافين تظهر هنا مباشرة. أكّد الشحن بعد استلام المبلغ عبر واتساب."
        />
      ) : (
        <DataTable
          columns={["الحالة", "الحرّاف", "المطلوب", "المتفق", "ملاحظة الحرّاف", "واتساب", "التاريخ", "إجراءات"]}
          empty={false}
        >
          {rows.map((r) => {
            const st = topupStatusMeta(r.status);
            const wa = waPhone(r.phone);
            const terminal = r.status === "credited" || r.status === "rejected";
            return (
              <Tr key={r.id}>
                <Td>
                  <Badge tone={st.tone}>{st.label}</Badge>
                  {r.status === "credited" && r.handledAt ? (
                    <span className="mt-1 block text-[10.5px] text-muted-foreground">
                      {formatDateTimeAr(r.handledAt)}
                    </span>
                  ) : null}
                </Td>
                <Td>
                  <span className="block font-bold">{r.providerName ?? "—"}</span>
                  <span className="block text-[11px] text-muted-foreground">{r.email}</span>
                  <span className="block text-[10.5px] text-muted-foreground">
                    الرصيد الحالي:{" "}
                    <b className={r.balance < 0 ? "text-destructive" : ""}>{formatMAD(r.balance)}</b>
                  </span>
                </Td>
                <Td className="font-black whitespace-nowrap">{formatMAD(r.requestedAmount)}</Td>
                <Td className="whitespace-nowrap">
                  {r.agreedAmount ? (
                    <span className="font-black text-success">{formatMAD(r.agreedAmount)}</span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </Td>
                <Td className="max-w-[14rem]">
                  {r.note ? <span className="text-[12px] leading-snug">{r.note}</span> : <span className="text-muted-foreground">—</span>}
                  {r.adminNote ? (
                    <span className="mt-1 block rounded-lg bg-muted px-2 py-1 text-[11px] text-muted-foreground">
                      الإدارة: {r.adminNote}
                    </span>
                  ) : null}
                </Td>
                <Td>
                  {wa ? (
                    <a
                      href={`https://wa.me/${wa}?text=${encodeURIComponent(
                        `مرحبا ${r.providerName ?? ""}، بخصوص طلب شحن محفظتك فحِرْفي…`,
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-full bg-success/12 px-2.5 py-1.5 text-[11.5px] font-bold text-success"
                    >
                      <MessageCircle className="size-3.5" /> واتساب
                    </a>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Phone className="size-3" /> لا رقم
                    </span>
                  )}
                  {r.phone ? <span className="mt-1 block text-[10.5px]" dir="ltr">{r.phone}</span> : null}
                </Td>
                <Td className="whitespace-nowrap text-muted-foreground">
                  <span className="block">{timeAgoAr(r.createdAt)}</span>
                </Td>
                <Td>
                  <div className="flex flex-wrap gap-1.5">
                    {r.status === "pending" ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-7 gap-1 rounded-lg px-2 text-[11px]"
                        onClick={() => setAction({ id: r.id, row: r, next: "contacted" })}
                      >
                        <Eye className="size-3" /> بدأ التواصل
                      </Button>
                    ) : null}
                    {(r.status === "pending" || r.status === "contacted") ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-7 gap-1 rounded-lg px-2 text-[11px]"
                        onClick={() => setAction({ id: r.id, row: r, next: "awaiting_payment" })}
                      >
                        <Clock className="size-3" /> انتظار التحويل
                      </Button>
                    ) : null}
                    {!terminal ? (
                      <>
                        <Button
                          size="sm"
                          variant="default"
                          className="h-7 gap-1 rounded-lg px-2 text-[11px]"
                          onClick={() => setCredit({ row: r })}
                        >
                          <CheckCircle2 className="size-3" /> تأكيد الشحن
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-7 gap-1 rounded-lg px-2 text-[11px]"
                          onClick={() => setAction({ id: r.id, row: r, next: "rejected" })}
                        >
                          <XCircle className="size-3" /> رفض
                        </Button>
                      </>
                    ) : null}
                    {terminal ? <span className="text-[11px] text-muted-foreground">—</span> : null}
                  </div>
                </Td>
              </Tr>
            );
          })}
        </DataTable>
      )}

      <p className="mt-3 flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
        <ShieldAlert className="size-3.5" /> {rows.length} طلب معروض. التأكيد وحده يقيد الرصيد — وهو مسجَّل في سجل الإدارة باسمك.
      </p>

      {action ? (
        <TopupActionDialog
          next={action.next}
          row={action.row}
          busy={updateM.isPending}
          onCancel={() => setAction(null)}
          onConfirm={(note, agreed) =>
            updateM.mutate({ topupId: action.id, status: action.next, note, agreedAmount: agreed })
          }
        />
      ) : null}

      {credit ? (
        <CreditDialog
          row={credit.row}
          busy={confirmM.isPending}
          onCancel={() => setCredit(null)}
          onConfirm={(amount, note) => confirmM.mutate({ topupId: credit.row.id, amount, note })}
        />
      ) : null}
    </AdminShell>
  );
}

type Row = {
  id: string;
  requestedAmount: number;
  agreedAmount: number | null;
  note: string | null;
  status: string;
  adminNote: string | null;
  providerName: string | null;
  phone: string | null;
  email: string;
  balance: number;
};

function TopupActionDialog({
  next,
  row,
  busy,
  onCancel,
  onConfirm,
}: {
  next: Action;
  row: Row;
  busy: boolean;
  onCancel: () => void;
  onConfirm: (note: string | null, agreed: number | null) => void;
}) {
  const [note, setNote] = useState("");
  const [agreed, setAgreed] = useState(row.agreedAmount ? String(row.agreedAmount) : "");

  const config = {
    contacted: {
      title: "بدء التواصل عبر واتساب",
      desc: "سيتلقّى الحرّاف إشعاراً بأن الإدارة ستتواصل معه على واتساب لترتيب المبلغ والتحويل.",
      label: "تأكيد بدء التواصل",
      min: 0,
      withAmount: false,
      variant: "default" as const,
    },
    awaiting_payment: {
      title: "في انتظار تحويل الحرّاف",
      desc: "اكتب المبلغ الذي اتفقتما عليه — سيُعرض للحرّاف، ثم أكّد الشحن فور وصوله.",
      label: "تأكيد الاتفاق",
      min: 0,
      withAmount: true,
      variant: "default" as const,
    },
    rejected: {
      title: "رفض طلب الشحن",
      desc: "سبب الرفض إلزامي ويُرسل للحرّاف. لا يُحذف الطلب — يبقى بأثره في السجل.",
      label: "رفض الطلب",
      min: 4,
      withAmount: false,
      variant: "destructive" as const,
    },
  }[next];

  const agreedNum = agreed ? Math.round(Number(agreed)) : null;
  const amountOk = !config.withAmount || (agreedNum !== null && agreedNum >= 10);
  const valid = note.trim().length >= config.min && amountOk;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal>
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-xl">
        <h2 className="text-[16px] font-black">{config.title}</h2>
        <p className="mt-1 text-[12.5px] leading-snug text-muted-foreground">{config.desc}</p>
        <p className="mt-2 rounded-xl bg-muted px-3 py-2 text-[12px] text-muted-foreground">
          {row.providerName ?? row.email} — طلب {formatMAD(row.requestedAmount)}
        </p>

        {config.withAmount ? (
          <label className="mt-3 block">
            <span className="text-[11px] font-bold text-muted-foreground">المبلغ المتفق عليه (درهم)</span>
            <Input
              type="number"
              min={10}
              step={10}
              value={agreed}
              onChange={(e) => setAgreed(e.target.value)}
              placeholder={String(row.requestedAmount)}
              className="mt-1.5 h-10 rounded-xl text-[13px]"
            />
          </label>
        ) : null}

        <label className="mt-3 block">
          <span className="text-[11px] font-bold text-muted-foreground">
            {config.min > 0 ? "السبب (يظهر للحرّاف)" : "ملاحظة اختيارية (تظهر للحرّاف)"}
          </span>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            maxLength={600}
            placeholder={config.min > 0 ? "اكتب 4 أحرف على الأقل…" : "اختياري…"}
            className="mt-1.5 rounded-xl text-[13px]"
          />
        </label>

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" className="rounded-xl" onClick={onCancel} disabled={busy}>
            إلغاء
          </Button>
          <Button
            variant={config.variant}
            className="rounded-xl"
            disabled={!valid || busy}
            onClick={() => onConfirm(note.trim() || null, config.withAmount ? agreedNum : null)}
          >
            {config.label}
          </Button>
        </div>
      </div>
    </div>
  );
}

function CreditDialog({
  row,
  busy,
  onCancel,
  onConfirm,
}: {
  row: Row;
  busy: boolean;
  onCancel: () => void;
  onConfirm: (amount: number, note: string | null) => void;
}) {
  const [amount, setAmount] = useState(String(row.agreedAmount ?? row.requestedAmount));
  const [note, setNote] = useState("");
  const value = Math.round(Number(amount));
  const valid = Number.isFinite(value) && value >= 10;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal>
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-xl">
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-success/12 text-success">
            <HandCoins className="size-4.5" />
          </span>
          <div>
            <h2 className="text-[16px] font-black">تأكيد شحن المحفظة</h2>
            <p className="mt-1 text-[12.5px] leading-snug text-muted-foreground">
              أكّد فقط بعد وصول المبلغ المتفق عليه. سيُقيَّد الرصيد فوراً في محفظة {row.providerName ?? row.email}.
            </p>
          </div>
        </div>

        <label className="mt-4 block">
          <span className="text-[11px] font-bold text-muted-foreground">المبلغ المشحون (درهم)</span>
          <Input
            type="number"
            min={10}
            step={10}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="mt-1.5 h-10 rounded-xl text-[13px]"
          />
        </label>

        <label className="mt-3 block">
          <span className="text-[11px] font-bold text-muted-foreground">ملاحظة (تظهر للحرّاف في المحفظة)</span>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            maxLength={600}
            placeholder="مثال: استلمنا التحويل على الحساب البنكي…"
            className="mt-1.5 rounded-xl text-[13px]"
          />
        </label>

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" className="rounded-xl" onClick={onCancel} disabled={busy}>
            إلغاء
          </Button>
          <Button
            variant="default"
            className="gap-1.5 rounded-xl"
            disabled={!valid || busy}
            onClick={() => onConfirm(value, note.trim() || null)}
          >
            <CheckCircle2 className="size-4" />
            تأكيد وإضافة {valid ? formatMAD(value) : ""}
          </Button>
        </div>
      </div>
    </div>
  );
}
