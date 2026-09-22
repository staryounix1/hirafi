// ── المحفظة: رصيد + سجل المعاملات + طلب سحب داخلي ──────────────────────────────
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
} from "@/components/hirfi/primitives";
import { trpc } from "@/_core/trpc";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import {
  countAr,
  errorMessage,
  formatDateTimeAr,
  formatMAD,
  madNumber,
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
      <div className="grid">
        <div className="hirfi-skeleton h-20 rounded-3xl" />
        <ListSkeleton count={3} />
      </div>
    );
  }
  if (q.isError) {
    return (
      <div className="p-4">
        <ErrorState message={errorMessage(q.error)} onRetry={() => void q.refetch()} />
      </div>
    );
  }
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
    <div className="grid">
      <PageHeader
        icon={WalletIcon}
        title="المحفظة"
        description="رصيدك الداخلي وكل حركة عليه: دفع مقابل طلب، استحقاق حرّاف، عمولة المنصّة، وطلبات السحب."
      />

      {/* بطاقة الرصيد — الرقم الضخم أولاً كما في بطاقات inDrive */}
      <section className="px-4 pt-4">
        <div className="rounded-3xl bg-foreground p-5 text-background">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-background/70">الرصيد المتاح</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-background/15 px-2.5 py-1 text-[10.5px] font-bold text-background/80">
              <Info className="size-3" />
              عمولة المنصّة {fee.data ?? 10}%
            </span>
          </div>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-price text-[40px] leading-none">{madNumber(balance)}</span>
            <span className="text-[13px] font-bold text-background/70">درهم</span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-background/10 px-3 py-2.5">
              <div className="text-[10px] font-bold text-background/60">إجمالي الداخل</div>
              <div className="text-price mt-1 flex items-baseline gap-1 text-[17px] leading-none">
                {madNumber(earnings)}
                <span className="text-[10px] font-bold text-background/60">درهم</span>
              </div>
            </div>
            <div className="rounded-2xl bg-background/10 px-3 py-2.5">
              <div className="text-[10px] font-bold text-background/60">إجمالي الخارج</div>
              <div className="text-price mt-1 flex items-baseline gap-1 text-[17px] leading-none">
                {madNumber(Math.abs(spend))}
                <span className="text-[10px] font-bold text-background/60">درهم</span>
              </div>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-[10.5px] leading-snug text-background/60">
              {canPayOut
                ? "يمكنك طلب سحب الآن"
                : `الحد الأدنى للسحب ${formatMAD(MIN_PAYOUT)}`}
            </p>
            {canPayOut && !open ? (
              <Button
                size="sm"
                variant="secondary"
                className="shrink-0 gap-1.5 rounded-full"
                onClick={() => setOpen(true)}
              >
                <ArrowDownToLine className="size-3.5" />
                اطلب سحباً
              </Button>
            ) : null}
          </div>
        </div>
      </section>

      {/* نموذج السحب */}
      {open ? (
        <section className="px-4 pt-3">
          <form onSubmit={submit} className="card-flat grid gap-3 p-4">
            <h2 className="flex items-center gap-1.5 text-[15px] font-black">
              <ArrowDownToLine className="size-4 text-teal" />
              طلب سحب
            </h2>
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
                className="gap-1.5 rounded-full"
                disabled={payout.isPending || !num || num > balance || num < MIN_PAYOUT}
              >
                {payout.isPending ? <Spinner /> : <ArrowDownToLine className="size-4" />}
                تأكيد طلب السحب
              </Button>
              <Button type="button" variant="ghost" className="rounded-full" onClick={() => setOpen(false)}>
                إلغاء
              </Button>
            </div>
          </form>
        </section>
      ) : null}

      {!canPayOut ? (
        <section className="px-4 pt-3">
          <p className="flex items-start gap-2 rounded-3xl bg-muted/70 px-3.5 py-3 text-[12px] leading-relaxed text-muted-foreground">
            <Ban className="mt-0.5 size-4 shrink-0" />
            رصيدك أقل من الحد الأدنى للسحب ({formatMAD(MIN_PAYOUT)}) — أكمل طلباً أو انتظر استحقاقاً.
          </p>
        </section>
      ) : null}

      {/* السجل — صفوف مكدّسة تناسب الجوال بدل جدول عريض */}
      <section className="grid gap-3 px-4 pt-4 pb-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-[17px] font-black">
            <Receipt className="size-4.5 text-brand-dark" />
            سجل المعاملات
          </h2>
          <Badge tone="muted">{countAr(rows.length, ["حركة", "حركتان", "حركات"], "حركة")}</Badge>
        </div>

        {rows.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="لا حركات على محفظتك"
            description="عندما يُتمّ طلبٌ يقبل عرضك، يُقيَّد استحقاقك هنا، وتُقيَّد عمولة المنصّة منفصلة وواضحة. وعندما تُتمّ طلباً نشرته، يُقيَّد الدفع مقابل الخدمة."
          />
        ) : (
          <ul className="grid gap-2">
            {rows.map((t) => {
              const meta = walletTypeMeta(t.type);
              const positive = t.amount > 0;
              return (
                <li key={t.id} className="card-flat flex items-start gap-3 p-3.5">
                  <span
                    className={cn(
                      "grid size-9 shrink-0 place-items-center rounded-full",
                      positive ? "bg-success/12 text-success" : "bg-destructive/12 text-destructive",
                    )}
                  >
                    {positive ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <b className="text-[13px]">{meta.label}</b>
                      <span
                        dir="ltr"
                        className={cn(
                          "text-price shrink-0 text-[15px] leading-none whitespace-nowrap",
                          positive ? "text-success" : "text-destructive",
                        )}
                      >
                        {positive ? "+" : "−"}
                        {formatMAD(Math.abs(t.amount))}
                      </span>
                    </div>
                    <p className="mt-1 text-[11.5px] leading-snug text-muted-foreground">{t.description}</p>
                    <p className="mt-1 text-[10.5px] text-muted-foreground/80">
                      {t.requestTitle ?? "—"} · {formatDateTimeAr(t.createdAt)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <p className="flex items-start gap-1.5 px-1 text-[11px] leading-relaxed text-muted-foreground">
          <CircleDollarSign className="mt-0.5 size-3.5 shrink-0" />
          هذه محفظة داخلية نموذجية: لا بوابة دفع ولا تحويل بنكي حقيقي — الأرقام كلها قيود محاسبية داخل التطبيق.
        </p>
      </section>
    </div>
  );
}
