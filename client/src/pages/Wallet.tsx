// ── المحفظة: رصيد الحرّاف + شحن + سجل العمولات ─────────────────────────────────
// المنصّة لا تحرّك مال الزبون: الزبون يدفع الحرّاف مباشرة بعد إتمام الخدمة.
// محفظة الحرّاف هنا رصيد يغطّي به **عمولة المنصّة** (تُخصم لحظة قبول عرضه)،
// وبدونه لا يمكنه إرسال عروض ولا بدء التنفيذ. الشحن في هذه النسخة تسجيل داخلي.
import { useState } from "react";
import {
  Wallet as WalletIcon,
  TrendingUp,
  TrendingDown,
  Plus,
  CircleDollarSign,
  Receipt,
  Info,
  AlertTriangle,
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

const MIN_TOPUP = 10;
const QUICK = [50, 100, 200, 500];

export default function Wallet() {
  const q = trpc.wallet.me.useQuery();
  const fee = trpc.wallet.feePercent.useQuery();
  const topup = trpc.wallet.topup.useMutation();
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
  const insufficient = balance < 0;

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!num || num < MIN_TOPUP) return toast.error(`أقل مبلغ للشحن ${formatMAD(MIN_TOPUP)}`);
    try {
      await topup.mutateAsync({ amount: Math.round(num) });
      await utils.invalidate();
      toast.success("تم شحن حسابك — يمكنك الآن إرسال العروض");
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
        title="محفظة الحرّاف"
        description="رصيدك لتغطية عمولة المنصّة. تُخصم العمولة لحظة قبول الزبون لعرضك. الزبون يدفع لك مباشرة بعد إتمام الخدمة."
      />

      {/* بطاقة الرصيد */}
      <section className="px-4 pt-4">
        <div className="rounded-3xl bg-foreground p-5 text-background">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-background/70">الرصيد المتاح</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-background/15 px-2.5 py-1 text-[10.5px] font-bold text-background/80">
              <Info className="size-3" />
              عمولة المنصّة {fee.data ?? 15}%
            </span>
          </div>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-price text-[40px] leading-none">{madNumber(balance)}</span>
            <span className="text-[13px] font-bold text-background/70">درهم</span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-background/10 px-3 py-2.5">
              <div className="text-[10px] font-bold text-background/60">إجمالي المشحون</div>
              <div className="text-price mt-1 flex items-baseline gap-1 text-[17px] leading-none">
                {madNumber(earnings)}
                <span className="text-[10px] font-bold text-background/60">درهم</span>
              </div>
            </div>
            <div className="rounded-2xl bg-background/10 px-3 py-2.5">
              <div className="text-[10px] font-bold text-background/60">العمولات المخصومة</div>
              <div className="text-price mt-1 flex items-baseline gap-1 text-[17px] leading-none">
                {madNumber(Math.abs(spend))}
                <span className="text-[10px] font-bold text-background/60">درهم</span>
              </div>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-[10.5px] leading-snug text-background/60">
              {insufficient
                ? "رصيدك سالب — اشحن لتستأنف إرسال العروض والتنفيذ"
                : balance === 0
                  ? "اشحن رصيدك لتتمكّن من إرسال عرض"
                  : "رصيدك كافٍ لتقديم العروض"}
            </p>
            {!open ? (
              <Button
                size="sm"
                variant="secondary"
                className="shrink-0 gap-1.5 rounded-full"
                onClick={() => setOpen(true)}
              >
                <Plus className="size-3.5" />
                اشحن حسابك
              </Button>
            ) : null}
          </div>
        </div>
      </section>

      {/* نموذج الشحن */}
      {open ? (
        <section className="px-4 pt-3">
          <form onSubmit={submit} className="card-flat grid gap-3 p-4">
            <h2 className="flex items-center gap-1.5 text-[15px] font-black">
              <Plus className="size-4 text-teal" />
              شحن المحفظة
            </h2>
            <Field label="المبلغ (درهم)" hint={`أقل مبلغ ${formatMAD(MIN_TOPUP)}`} required>
              <Input
                type="number"
                min={MIN_TOPUP}
                step={10}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="100"
              />
            </Field>
            <div className="flex flex-wrap gap-2">
              {QUICK.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setAmount(String(v))}
                  className="rounded-full bg-muted px-3.5 py-1.5 text-[12px] font-black active:scale-95"
                >
                  +{v}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="submit"
                className="gap-1.5 rounded-full"
                disabled={topup.isPending || !num || num < MIN_TOPUP}
              >
                {topup.isPending ? <Spinner /> : <Plus className="size-4" />}
                تأكيد الشحن
              </Button>
              <Button type="button" variant="ghost" className="rounded-full" onClick={() => setOpen(false)}>
                إلغاء
              </Button>
            </div>
          </form>
        </section>
      ) : null}

      {insufficient ? (
        <section className="px-4 pt-3">
          <p className="flex items-start gap-2 rounded-3xl bg-destructive/10 px-3.5 py-3 text-[12px] leading-relaxed text-destructive">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            رصيدك سالب بعد خصم العمولة — اشحن حسابك لإكمال المراحل مع الزبون. لا يمكنك إرسال عروض جديدة حتى يغطّي الرصيد العمولة.
          </p>
        </section>
      ) : null}

      {/* السجل */}
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
            description="اشحن رصيدك لتقديم العروض. لحظة قبول الزبون لعرضك تُخصم عمولة المنصّة هنا، ويظهر الشحن كقيد موجب."
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
          المنصّة لا تدير أموال الزبون: الدفع للحرّاف يتم بينهما مباشرة بعد إتمام الخدمة. محفظتك هنا لتغطية عمولة المنصّة فقط.
        </p>
      </section>
    </div>
  );
}
