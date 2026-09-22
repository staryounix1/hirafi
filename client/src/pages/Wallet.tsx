// ── المحفظة: رصيد + سجل المعاملات + طلب سحب داخلي ───────────────────────────
// محفظة داخلية بلا بوابة دفع حقيقية: الدفع والاستحقاق والعمولة كلها قيود تُسجَّل
// عند إتمام الطلب، والسحب طلب يُقيَّد في السجل ولا يحرّك مالاً فعلياً.
import { useState } from "react";
import {
  Wallet as WalletIcon,
  TrendingUp,
  TrendingDown,
  ArrowDownToLine,
  CircleDollarSign,
  Receipt,
  Info,
  Ban,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Badge,
  EmptyState,
  ErrorState,
  Field,
  ListSkeleton,
  PageHeader,
  Spinner,
  StatCard,
} from "@/components/hirfi/primitives";
import { trpc } from "@/_core/trpc";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import {
  errorMessage,
  formatDateTimeAr,
  formatMAD,
  walletTypeMeta,
} from "@/lib/format";

const MIN_PAYOUT = 50;

export default function Wallet() {
  const q = trpc.wallet.me.useQuery();
  const fee = trpc.wallet.feePercent.useQuery();
  const payout = trpc.wallet.requestPayout.useMutation();
  const utils = trpc.useUtils();
  const [amount, setAmount] = useState("");
  const [open, setOpen] = useState(false);

  if (q.isLoading) {
    return (
      <div className="grid gap-5">
        <div className="hirfi-skeleton h-16 rounded-xl" />
        <div className="grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="hirfi-skeleton h-28 rounded-xl" />
          ))}
        </div>
        <ListSkeleton count={3} />
      </div>
    );
  }
  if (q.isError) return <ErrorState message={errorMessage(q.error)} onRetry={() => void q.refetch()} />;
  if (!q.data) return null;

  const { rows, balance, earnings, spend } = q.data;
  const num = Number(amount);
  const canPayOut = balance >= MIN_PAYOUT;

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!num || num < MIN_PAYOUT) return toast.error(`أقل مبلغ للسحب ${formatMAD(MIN_PAYOUT)}`);
    if (num > balance) return toast.error("المبلغ المطلوب أكبر من رصيدك المتاح");
    try {
      await payout.mutateAsync({ amount: Math.round(num) });
      await utils.invalidate();
      toast.success("سُجّل طلب السحب — ستظهر قيداً سالباً في السجل");
      setAmount("");
      setOpen(false);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  return (
    <div className="grid gap-5">
      <PageHeader
        icon={WalletIcon}
        title="المحفظة"
        description="رصيدك الداخلي وكل حركة عليه: دفع مقابل طلب، استحقاق حرّاف، عمولة المنصّة، وطلبات السحب."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          icon={WalletIcon}
          label="الرصيد المتاح"
          value={formatMAD(balance)}
          hint={
            balance >= MIN_PAYOUT
              ? "يمكنك طلب سحب"
              : `الحد الأدنى للسحب ${formatMAD(MIN_PAYOUT)}`
          }
          tone="teal"
        />
        <StatCard
          icon={TrendingUp}
          label="إجمالي الداخل"
          value={formatMAD(earnings)}
          hint="استحقاقات وتعبئات"
          tone="success"
        />
        <StatCard
          icon={TrendingDown}
          label="إجمالي الخارج"
          value={formatMAD(Math.abs(spend))}
          hint="مدفوعات وعمولات وسحوبات"
          tone="warn"
        />
      </div>

      {/* طلب سحب */}
      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-1.5 text-base font-bold">
              <ArrowDownToLine className="size-4.5 text-teal" />
              طلب سحب
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              يُقيَّد الطلب في السجل فوراً — والمعالجة يدوية خارج التطبيق.
            </p>
          </div>
          <Badge tone="warn" icon={Info}>
            عمولة المنصّة {fee.data ?? 10}% على كل طلب منجز
          </Badge>
        </div>

        {open ? (
          <form onSubmit={submit} className="mt-4 grid gap-3 sm:max-w-md">
            <Field
              label="المبلغ (درهم)"
              hint={`من ${formatMAD(MIN_PAYOUT)} إلى ${formatMAD(balance)}`}
              required
            >
              <Input
                type="number"
                min={MIN_PAYOUT}
                max={balance}
                step={10}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={String(Math.min(balance, 500))}
              />
            </Field>
            <div className="flex flex-wrap gap-2">
              <Button
                type="submit"
                className="gap-1.5"
                disabled={payout.isPending || !num || num > balance || num < MIN_PAYOUT}
              >
                {payout.isPending ? <Spinner /> : <ArrowDownToLine className="size-4" />}
                تأكيد طلب السحب
              </Button>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                إلغاء
              </Button>
            </div>
          </form>
        ) : canPayOut ? (
          <Button className="mt-4 gap-1.5" onClick={() => setOpen(true)}>
            <ArrowDownToLine className="size-4" />
            اطلب سحباً
          </Button>
        ) : (
          <p className="mt-4 flex items-center gap-2 rounded-lg border border-dashed border-border bg-muted/40 px-3.5 py-3 text-sm text-muted-foreground">
            <Ban className="size-4 shrink-0" />
            رصيدك أقل من الحد الأدنى للسحب ({formatMAD(MIN_PAYOUT)}) — أكمل طلباً أو انتظر استحقاقاً.
          </p>
        )}
      </section>

      {/* السجل */}
      <section className="grid gap-3">
        <h2 className="flex items-center gap-2 text-base font-bold">
          <Receipt className="size-4.5 text-brand" />
          سجل المعاملات
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-bold text-muted-foreground">
            {rows.length}
          </span>
        </h2>

        {rows.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="لا حركات على محفظتك"
            description="عندما يُتمّ طلبٌ يقبل عرضك، يُقيَّد استحقاقك هنا، وتُقيَّد عمولة المنصّة منفصلة وواضحة. وعندما تُتمّ طلباً نشرته، يُقيَّد الدفع مقابل الخدمة."
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full min-w-max text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-xs text-muted-foreground">
                  <th className="px-4 py-2.5 text-start font-semibold">النوع</th>
                  <th className="px-4 py-2.5 text-start font-semibold">البيان</th>
                  <th className="px-4 py-2.5 text-start font-semibold">الطلب</th>
                  <th className="px-4 py-2.5 text-start font-semibold">التاريخ</th>
                  <th className="px-4 py-2.5 text-start font-semibold">المبلغ</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => {
                  const meta = walletTypeMeta(t.type);
                  const positive = t.amount > 0;
                  return (
                    <tr key={t.id} className="border-b border-border/60 last:border-0">
                      <td className="px-4 py-3">
                        <Badge tone={meta.tone} icon={positive ? TrendingUp : TrendingDown}>
                          {meta.label}
                        </Badge>
                      </td>
                      <td className="max-w-sm px-4 py-3 text-muted-foreground">{t.description}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {t.requestTitle ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap text-muted-foreground">
                        {formatDateTimeAr(t.createdAt)}
                      </td>
                      <td
                        className={cn(
                          "px-4 py-3 font-display font-extrabold whitespace-nowrap",
                          positive ? "text-success" : "text-destructive",
                        )}
                      >
                        <span dir="ltr">
                          {positive ? "+" : "−"}
                          {formatMAD(Math.abs(t.amount))}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <p className="flex items-start gap-1.5 px-1 text-xs text-muted-foreground">
          <CircleDollarSign className="mt-0.5 size-3.5 shrink-0" />
          هذه محفظة داخلية نموذجية: لا بوابة دفع ولا تحويل بنكي حقيقي — الأرقام كلها قيود محاسبية داخل التطبيق.
        </p>
      </section>
    </div>
  );
}
