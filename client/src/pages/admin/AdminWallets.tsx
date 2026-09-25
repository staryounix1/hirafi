// ── المحافظ والعمولة: أرصدة الحرّافين، المتأخرات، وتعديل رصيد مسبَّب بسجل كامل ─
import { useState } from "react";
import { Wallet, TrendingUp, AlertTriangle, Plus, Minus, RefreshCw, Receipt } from "lucide-react";
import { AdminShell, DataTable, Tr, Td, MetricCard } from "@/components/hirfi/admin-shell";
import { TableSkeleton } from "@/components/hirfi/admin-skeleton";
import { SearchBox, Tag } from "@/components/hirfi/admin-ui";
import { ErrorState, Badge, EmptyState } from "@/components/hirfi/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/_core/trpc";
import { toast } from "@/lib/toast";
import { formatMAD, timeAgoAr, errorMessage, walletTypeMeta } from "@/lib/format";

export default function AdminWallets() {
  const [search, setSearch] = useState("");
  const [onlyOwing, setOnlyOwing] = useState(false);
  const [ledgerFor, setLedgerFor] = useState<{ id: string; name: string } | null>(null);
  const [adjustFor, setAdjustFor] = useState<{ id: string; name: string } | null>(null);

  const utils = trpc.useUtils();
  const q = trpc.admin.wallets.list.useQuery({ search: search || undefined, onlyOwing, limit: 200 });
  const feeQ = trpc.admin.overview.feePercent.useQuery();

  const rows = q.data ?? [];
  const totalBalance = rows.reduce((s, r) => s + r.balance, 0);
  const owing = rows.filter((r) => r.balance < 0);
  const owingSum = owing.reduce((s, r) => s + r.balance, 0);

  return (
    <AdminShell
      section="wallets"
      title="المحافظ والعمولة"
      description={`العمولة ${feeQ.data ?? "—"}% تُخصم من محفظة الحرّاف عند قبول العرض. الرصيد السالب يمنع العروض، ويمكن تعديله إدارياً بسبب مسجَّل.`}
      action={
        <Button variant="secondary" className="gap-1.5 rounded-xl" onClick={() => q.refetch()}>
          <RefreshCw className="size-4" /> تحديث
        </Button>
      }
    >
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricCard label="محافظ نشطة" value={rows.length} />
        <MetricCard label="إجمالي الأرصدة" value={formatMAD(totalBalance)} tone={totalBalance < 0 ? "danger" : "success"} />
        <MetricCard label="أرصدة سالبة" value={owing.length} hint={`مجموع ${formatMAD(owingSum)}`} tone="danger" />
        <MetricCard label="عمولة محصّلة" value={formatMAD(rows.reduce((s, r) => s + r.fees, 0))} tone="success" />
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <SearchBox value={search} onChange={setSearch} placeholder="ابحث بالاسم أو البريد…" className="w-full max-w-sm" />
        <Button
          variant={onlyOwing ? "default" : "secondary"}
          className="h-10 gap-1.5 rounded-xl"
          onClick={() => setOnlyOwing((v) => !v)}
        >
          <AlertTriangle className="size-4" /> المتأخرات فقط
        </Button>
      </div>

      {q.isLoading ? (
        <TableSkeleton rows={8} />
      ) : q.error ? (
        <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="لا محافظ مطابقة"
          description="لا حركة على المحافظ بعد، أو لا أحد يطابق هذا البحث."
        />
      ) : (
        <DataTable columns={["الحرّاف", "البريد", "الرصيد", "شحن", "عمولة", "آخر حركة", "إجراءات"]}>
          {rows.map((w) => (
            <Tr key={w.userId}>
              <Td>
                <div className="flex items-center gap-2">
                  <span className="font-bold">{w.displayName ?? "—"}</span>
                  {w.balance < 0 ? <Tag kind="owing">مدين</Tag> : null}
                </div>
              </Td>
              <Td className="text-muted-foreground">{w.email}</Td>
              <Td>
                <span className={w.balance < 0 ? "font-black text-destructive" : "font-bold"}>
                  {formatMAD(w.balance)}
                </span>
              </Td>
              <Td className="text-muted-foreground">{formatMAD(w.topups)}</Td>
              <Td className="text-muted-foreground">{formatMAD(w.fees)}</Td>
              <Td className="text-muted-foreground">{w.lastAt ? timeAgoAr(w.lastAt) : "—"}</Td>
              <Td>
                <div className="flex flex-wrap gap-1.5">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-7 gap-1 rounded-lg px-2 text-[11px]"
                    onClick={() => setLedgerFor({ id: w.userId, name: w.displayName ?? w.email })}
                  >
                    <Receipt className="size-3" /> السجل
                  </Button>
                  <Button
                    size="sm"
                    variant="default"
                    className="h-7 gap-1 rounded-lg px-2 text-[11px]"
                    onClick={() => setAdjustFor({ id: w.userId, name: w.displayName ?? w.email })}
                  >
                    <Plus className="size-3" /> تعديل
                  </Button>
                </div>
              </Td>
            </Tr>
          ))}
        </DataTable>
      )}

      {ledgerFor ? (
        <LedgerPanel userId={ledgerFor.id} name={ledgerFor.name} onClose={() => setLedgerFor(null)} />
      ) : null}
      {adjustFor ? (
        <AdjustDialog
          userId={adjustFor.id}
          name={adjustFor.name}
          onClose={() => setAdjustFor(null)}
        />
      ) : null}
      <span className="hidden">
        <TrendingUp />
        {utils ? null : null}
      </span>
    </AdminShell>
  );
}

function LedgerPanel({ userId, name, onClose }: { userId: string; name: string; onClose: () => void }) {
  const q = trpc.admin.wallets.ledger.useQuery({ userId, limit: 100 });
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" role="dialog" aria-modal>
      <div className="flex h-full w-full max-w-lg flex-col bg-card shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <h2 className="text-[16px] font-black">سجل محفظة {name}</h2>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              الرصيد الحالي:{" "}
              <b className={q.data && q.data.balance < 0 ? "font-black text-destructive" : "font-black"}>
                {q.data ? formatMAD(q.data.balance) : "…"}
              </b>
            </p>
          </div>
          <Button variant="ghost" size="sm" className="rounded-lg" onClick={onClose}>
            إغلاق
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {q.isLoading ? (
            <TableSkeleton rows={6} />
          ) : q.error ? (
            <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />
          ) : q.data && q.data.entries.length > 0 ? (
            <ul className="flex flex-col gap-2.5">
              {q.data.entries.map((e) => {
                const meta = walletTypeMeta(e.type);
                return (
                  <li
                    key={e.id}
                    className="flex items-start justify-between gap-3 rounded-xl border border-border px-3.5 py-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge tone={meta.tone}>{meta.label}</Badge>
                        <span className="text-[12.5px] font-bold">
                          {e.description ?? "—"}
                        </span>
                      </div>
                      <p className="mt-1 text-[11.5px] text-muted-foreground">
                        {e.requestTitle ? `${e.requestTitle} · ` : ""}
                        {timeAgoAr(e.createdAt)}
                      </p>
                    </div>
                    <span
                      className={
                        e.amount < 0
                          ? "shrink-0 font-black text-destructive"
                          : "shrink-0 font-black text-success"
                      }
                    >
                      {e.amount > 0 ? "+" : ""}
                      {formatMAD(e.amount)}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="py-10 text-center text-[13px] text-muted-foreground">لا حركات على هذه المحفظة.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function AdjustDialog({ userId, name, onClose }: { userId: string; name: string; onClose: () => void }) {
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const utils = trpc.useUtils();
  const m = trpc.admin.wallets.adjust.useMutation({
    onSuccess: () => {
      toast.success("عُدّل الرصيد وسُجّل السبب");
      utils.admin.wallets.list.invalidate();
      utils.admin.overview.invalidate();
      onClose();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const value = Math.round(Number(amount));
  const valid = Number.isFinite(value) && value !== 0 && reason.trim().length >= 4;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal>
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-xl">
        <h2 className="text-[16px] font-black">تعديل رصيد — {name}</h2>
        <p className="mt-1 text-[12.5px] leading-snug text-muted-foreground">
          يُضاف كحركة جديدة (`topup` للزيادة، `refund` للخصم) ولا يمسّ الحركات السابقة. السبب إلزامي لأنه
          يظهر للحرّاف في محفظته.
        </p>

        <label className="mt-4 block">
          <span className="text-[11px] font-bold text-muted-foreground">المبلغ (درهم، سالب للخصم)</span>
          <Input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="مثال: 50 أو -30"
            className="mt-1.5 h-10 rounded-xl text-[13px]"
          />
        </label>

        <div className="mt-2 flex gap-1.5">
          {[50, 100, -50].map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setAmount(String(v))}
              className="rounded-lg bg-muted px-2.5 py-1 text-[11.5px] font-bold text-muted-foreground hover:text-foreground"
            >
              {v > 0 ? `+${v}` : v}
            </button>
          ))}
        </div>

        <label className="mt-3 block">
          <span className="text-[11px] font-bold text-muted-foreground">السبب</span>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="مثال: تعويض عن عمولة خاطئة على طلب ملغى…"
            className="mt-1.5 rounded-xl text-[13px]"
          />
        </label>

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" className="rounded-xl" onClick={onClose} disabled={m.isPending}>
            إلغاء
          </Button>
          <Button
            className="gap-1.5 rounded-xl"
            variant={value < 0 ? "destructive" : "default"}
            disabled={!valid || m.isPending}
            onClick={() => m.mutate({ userId, amount: value, reason: reason.trim() })}
          >
            {value < 0 ? <Minus className="size-4" /> : <Plus className="size-4" />}
            {value < 0 ? "خصم" : "إضافة"} {valid ? formatMAD(value) : ""}
          </Button>
        </div>
      </div>
    </div>
  );
}
