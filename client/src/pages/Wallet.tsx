// ── المحفظة: رصيد الحرّاف + طلب شحن (يدوي عبر واتساب) + سجل العمولات ─────────
// المنصّة لا تحرّك مال الزبون ولا تستقبل مالاً آلياً: الزبون يدفع الحرّاف مباشرة،
// والحرّاف يشحن محفظته لتغطية **عمولة المنصّة**. الشحن **ليس آلياً**: الحرّاف يرسل
// طلب شحن → الإدارة تتفاوض معه على واتساب خارج المنصّة → بعد وصول المبلغ تؤكّد
// الإدارة الشحن فيُقيَّد الرصيد. لا يمكن للحرّاف أن يشحن نفسه.
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
  MessageCircle,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { SUPPORT_WHATSAPP } from "@shared/constants";
import {
  countAr,
  errorMessage,
  formatDateTimeAr,
  formatMAD,
  madNumber,
  topupStatusMeta,
  walletTypeMeta,
} from "@/lib/format";

const MIN_TOPUP = 10;
const QUICK = [50, 100, 200, 500];
const ACTIVE = ["pending", "contacted", "awaiting_payment"];

export default function Wallet() {
  const q = trpc.wallet.me.useQuery();
  const fee = trpc.wallet.feePercent.useQuery();
  const myTopups = trpc.wallet.myTopups.useQuery();
  const requestTopup = trpc.wallet.requestTopup.useMutation();
  const utils = trpc.useUtils();
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
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
  const topups = myTopups.data ?? [];
  const active = topups.find((t) => ACTIVE.includes(t.status));

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    const value = Math.round(num);
    if (!value || value < MIN_TOPUP) return toast.error(`أقل مبلغ للشحن ${formatMAD(MIN_TOPUP)}`);
    try {
      await requestTopup.mutateAsync({ amount: value, note: note.trim() || null });
      await utils.invalidate();
      toast.success("وصل طلبك للإدارة — سنتواصل معك على واتساب");
      setAmount("");
      setNote("");
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
        description="رصيدك لتغطية عمولة المنصّة. تُخصم العمولة لحظة قبول الزبون لعرضك. الشحن يتم بالتنسيق مع الإدارة عبر واتساب."
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
                ? "رصيدك سالب — اطلب شحناً لتستأنف إرسال العروض والتنفيذ"
                : balance === 0
                  ? "اطلب شحن رصيدك لتتمكّن من إرسال عرض"
                  : "رصيدك كافٍ لتقديم العروض"}
            </p>
            {!open && !active ? (
              <Button
                size="sm"
                variant="secondary"
                className="shrink-0 gap-1.5 rounded-full"
                onClick={() => setOpen(true)}
              >
                <Plus className="size-3.5" />
                طلب شحن
              </Button>
            ) : null}
          </div>
        </div>
      </section>


      {/* دليل الشحن — 4 خطوات واضحة + زر واتساب مباشر */}
      <section className="px-4 pt-3">
        <div className="card-flat p-4">
          <h2 className="flex items-center gap-1.5 text-[15px] font-black">
            <CircleDollarSign className="size-4 text-teal" />
            كيفاش تشحن محفظتك؟
          </h2>
          <ol className="mt-3 grid gap-2.5">
            {[
              { n: "1", t: "دخل المبلغ", d: "اختر المبلغ اللي بغيت تشحنه (10 درهم على الأقل) وصيفط الطلب." },
              { n: "2", t: "تواصل معنا على واتساب", d: "غادي نتواصلو معاك على الرقم المسجّل باش نتفقو على طريقة التحويل." },
              { n: "3", t: "خلّص المبلغ", d: "حوّل المبلغ المتفق عليه (تحويل بنكي ولا Cash Plus ولا Wafacash…)." },
              { n: "4", t: "تأكيد الإدارة", d: "بعد ما توصل الفلوس، كنأكّدو الشحن فيتزاد الرصيد فوراً فحسابك." },
            ].map((st) => (
              <li key={st.n} className="flex items-start gap-3">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-teal/15 text-[11px] font-black text-teal">
                  {st.n}
                </span>
                <div className="min-w-0">
                  <b className="text-[12.5px]">{st.t}</b>
                  <p className="mt-0.5 text-[11.5px] leading-relaxed text-muted-foreground">{st.d}</p>
                </div>
              </li>
            ))}
          </ol>
          {SUPPORT_WHATSAPP ? (
            <a
              href={`https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent("مرحبا، بغيت نشحن محفظتي فحِرْفي")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3.5 flex items-center justify-center gap-2 rounded-2xl bg-teal px-4 py-3 text-[13px] font-black text-white active:scale-[.99]"
            >
              <MessageCircle className="size-4" />
              تواصل معنا على واتساب دابا
            </a>
          ) : null}
          <p className="mt-2.5 flex items-start gap-1.5 rounded-2xl bg-muted px-3 py-2.5 text-[11px] leading-relaxed text-muted-foreground">
            <Info className="mt-0.5 size-3.5 shrink-0" />
            المنصّة ما كتحرّكش الفلوس: كتخلّص مباشرة، والإدارة غير كتأكّد وصول المبلغ. كل عملية كتتسجّل فالملف.
          </p>
        </div>
      </section>

      {/* طلب نشط — لا يُسمح بطلب ثانٍ حتى يُحسم */}
      {active ? (
        <section className="px-4 pt-3">
          <div className="rounded-3xl border border-border bg-card p-4">
            <div className="flex items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-info-soft text-info">
                <Clock className="size-4.5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <b className="text-[13.5px]">طلب شحن قيد المعالجة</b>
                  <Badge tone={topupStatusMeta(active.status).tone}>
                    {topupStatusMeta(active.status).label}
                  </Badge>
                </div>
                <p className="mt-1 text-[12px] leading-snug text-muted-foreground">
                  طلبت <b>{formatMAD(active.requestedAmount)}</b>
                  {active.agreedAmount ? ` — المبلغ المتفق عليه ${formatMAD(active.agreedAmount)}` : ""}.
                  ستتواصل معك الإدارة على <b>واتساب</b> على الرقم المسجّل في حسابك لترتيب التحويل.
                </p>
                {active.adminNote ? (
                  <p className="mt-2 rounded-lg bg-muted px-2.5 py-1.5 text-[11.5px] text-muted-foreground">
                    رسالة الإدارة: {active.adminNote}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* نموذج طلب الشحن */}
      {open && !active ? (
        <section className="px-4 pt-3">
          <form onSubmit={submit} className="card-flat grid gap-3 p-4">
            <h2 className="flex items-center gap-1.5 text-[15px] font-black">
              <Plus className="size-4 text-teal" />
              طلب شحن المحفظة
            </h2>
            <p className="flex items-start gap-1.5 rounded-2xl bg-muted px-3 py-2.5 text-[11.5px] leading-relaxed text-muted-foreground">
              <MessageCircle className="mt-0.5 size-4 shrink-0" />
              الدفع يتم بالتفاهم مع الإدارة على واتساب. بعد وصول المبلغ المتفق عليه تؤكّد الإدارة الشحن
              فيُضاف الرصيد تلقائياً.
            </p>
            <Field label="المبلغ المطلوب (درهم)" hint={`أقل مبلغ ${formatMAD(MIN_TOPUP)}`} required>
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
            <Field label="ملاحظة (اختياري)">
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                maxLength={500}
                placeholder="مثال: بغيت نخلّص قبل نهاية الأسبوع…"
                className="rounded-xl text-[13px]"
              />
            </Field>
            <div className="flex flex-wrap gap-2">
              <Button
                type="submit"
                className="gap-1.5 rounded-full"
                disabled={requestTopup.isPending || !num || num < MIN_TOPUP}
              >
                {requestTopup.isPending ? <Spinner /> : <Plus className="size-4" />}
                إرسال طلب الشحن
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
            رصيدك سالب بعد خصم العمولة — اطلب شحن حسابك لإكمال المراحل مع الزبون. لا يمكنك إرسال عروض جديدة
            حتى يغطّي الرصيد العمولة.
          </p>
        </section>
      ) : null}

      {/* طلبات الشحن */}
      {topups.length > 0 ? (
        <section className="grid gap-3 px-4 pt-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-[17px] font-black">
              <MessageCircle className="size-4.5 text-teal" />
              طلبات الشحن
            </h2>
            <Badge tone="muted">{countAr(topups.length, ["طلب", "طلبان", "طلبات"], "طلباً")}</Badge>
          </div>
          <ul className="grid gap-2">
            {topups.map((t) => {
              const meta = topupStatusMeta(t.status);
              return (
                <li key={t.id} className="card-flat flex items-start gap-3 p-3.5">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
                    <MessageCircle className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <b className="text-[13px]">
                        {formatMAD(t.agreedAmount ?? t.requestedAmount)}
                        {t.agreedAmount && t.agreedAmount !== t.requestedAmount ? (
                          <span className="ms-1 text-[10.5px] font-normal text-muted-foreground">
                            (طُلب {formatMAD(t.requestedAmount)})
                          </span>
                        ) : null}
                      </b>
                      <Badge tone={meta.tone}>{meta.label}</Badge>
                    </div>
                    {t.note ? (
                      <p className="mt-1 text-[11.5px] leading-snug text-muted-foreground">{t.note}</p>
                    ) : null}
                    {t.adminNote ? (
                      <p className="mt-1 rounded-lg bg-muted px-2 py-1 text-[11px] text-muted-foreground">
                        الإدارة: {t.adminNote}
                      </p>
                    ) : null}
                    <p className="mt-1 text-[10.5px] text-muted-foreground/80">
                      {formatDateTimeAr(t.createdAt)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
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
            description="اطلب شحن رصيدك لتقديم العروض. لحظة قبول الزبون لعرضك تُخصم عمولة المنصّة هنا، ويظهر الشحن كقيد موجب."
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
          المنصّة لا تدير أموال الزبون: الدفع للحرّاف يتم بينهما مباشرة. محفظتك هنا لتغطية عمولة المنصّة،
          وشحنها يتم بالتنسيق المباشر مع الإدارة على واتساب.
        </p>
      </section>
    </div>
  );
}
