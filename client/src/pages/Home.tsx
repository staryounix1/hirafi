// ── الصفحة الرئيسية: تشرح الفكرة + دخول تجريبي بضغطة لِحسابين جاهزين ───────
// الزائر يقدر يجرّب التطبيق فوراً بلا تسجيل: زر لكل دور، وكلمة المرور مثبّتة
// لحسابين مُزروعين في البيانات التجريبية.
import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Send,
  CircleDollarSign,
  CheckCircle2,
  Search,
  MessageSquare,
  Wallet,
  Star,
  ShieldCheck,
  MapPin,
  ArrowLeft,
  UserCircle,
  Briefcase,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/hirfi/primitives";
import { useAuth } from "@/_core/useAuth";
import { toast } from "@/lib/toast";
import { errorMessage } from "@/lib/format";

const DEMO_PASSWORD = "demo1234";

const STEPS = [
  {
    icon: Send,
    title: "١. انشر مشكلتك",
    body: "صف العطل أو الخدمة التي تحتاجها، حدّد ميزانيتك المقترحة وموقعك والوقت المناسب — مثلما يقترح راكب inDrive سعره.",
  },
  {
    icon: CircleDollarSign,
    title: "٢. استقبل العروض",
    body: "الحرّافون القريبون يقرأون طلبك ويقدّمون عروضهم: سعر + مدة + رسالة. تقارن وتردّ وتتفاوض على السعر النهائي.",
  },
  {
    icon: CheckCircle2,
    title: "٣. اختر ونفّذ",
    body: "تقبل العرض الأنسب، يثبت السعر، وتتابع الحالة: مقبول → قيد التنفيذ → منتهي. ثم تقييم متبادل وشارة موثّق.",
  },
];

const FEATURES = [
  { icon: Search, title: "طلبات قريبة مصفّاة", body: "الحرّاف يرى الطلبات المفتوحة ويفلترها بالفئة والمسافة (قريب/متوسط/بعيد) والميزانية والاستعجال." },
  { icon: MessageSquare, title: "محادثة داخل كل طلب", body: "خيط محادثة خاص بين الطرفين على الطلب نفسه — يتحدّث تلقائياً وأنت تعمل." },
  { icon: Wallet, title: "محفظة وسجل مدفوعات", body: "تثبيت السعر عند القبول، ثم دفع واستحقاق وعمولة منصّة مسجّلة وشفافة لكل طلب." },
  { icon: Star, title: "تقييم متبادل ومراجعات", body: "بعد الإتمام يقيّم الطرفان بعضهما: نجوم + تعليق يظهر على الملف العام." },
  { icon: ShieldCheck, title: "شارة موثّق", body: "حرّافون موثّقون بجانب إنجازاتهم وعدد أعمالهم المنجزة ومتوسّط تقييمهم." },
  { icon: MapPin, title: "موقع مبسّط", body: "مدينة + حي من قائمة مغربية (الدار البيضاء، الرباط، مراكش، طنجة…) بدل خرائط معقّدة." },
];

/** زر دخول تجريبي — يشرح مَن ستدخل به ثم ينقل إلى لوحة التحكم. */
function DemoLogin({
  email,
  label,
  icon: Icon,
  hint,
  variant,
}: {
  email: string;
  label: string;
  icon: typeof UserCircle;
  hint: string;
  variant: "primary" | "outline";
}) {
  const { login } = useAuth();
  const [, navigate] = useLocation();
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      await login(email, DEMO_PASSWORD);
      toast.success(`مرحباً بك — دخلت كـ${label}`);
      navigate("/dashboard");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Button
        size="lg"
        variant={variant === "primary" ? "default" : "outline"}
        className="w-full gap-2"
        onClick={run}
        disabled={busy}
      >
        {busy ? <Spinner /> : <Icon className="size-4.5" />}
        دخول تجريبي — {label}
      </Button>
      <p className="text-center text-[11px] text-muted-foreground">{hint}</p>
    </div>
  );
}

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* ترويسة الصفحة العامة */}
      <header className="shell flex h-16 items-center justify-between py-3">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-brand-gradient font-display text-lg leading-none font-extrabold text-white">
            ح
          </span>
          <b className="font-display text-lg font-extrabold tracking-tight">حِرْفي</b>
        </div>
        <div className="flex items-center gap-2">
          {user ? (
            <Button asChild size="sm" className="gap-1.5">
              <Link href="/dashboard">
                لوحة التحكم
                <ArrowLeft className="size-3.5" />
              </Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">دخول</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/register">حساب جديد</Link>
              </Button>
            </>
          )}
        </div>
      </header>

      {/* القسم البطل */}
      <section className="bg-brand-gradient relative overflow-hidden text-white">
        <div className="shell grid items-center gap-10 py-14 lg:grid-cols-2 lg:py-20">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">
              <Briefcase className="size-3.5" />
              منصة الخدمات والحرفيين في المغرب
            </span>
            <h1 className="mt-5 font-display text-3xl leading-tight font-extrabold text-balance sm:text-4xl lg:text-5xl">
              انشر مشكلتك بميزانيتك…
              <br />
              والحرّافون يتنافسون عليك
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-white/90">
              نفس فكرة inDrive — السعر يقترحه صاحب الطلب لا مقدّم الخدمة — لكن في مجال
              الحِرَف والخدمات الصغيرة: سباكة، كهرباء، نجارة، صباغة، تكييف، تنظيف، نقل
              أثاث، إصلاح إلكترونيات، خياطة، تصوير، دروس خصوصية وأكثر.
            </p>

            <div className="mt-7 grid max-w-md gap-3 sm:grid-cols-2">
              {user ? (
                <Button asChild size="lg" variant="secondary" className="sm:col-span-2">
                  <Link href="/dashboard">
                    ادخل إلى لوحتك
                    <ArrowLeft className="size-4" />
                  </Link>
                </Button>
              ) : (
                <>
                  <DemoLogin
                    email="sara@hirfi.ma"
                    label="زبون"
                    icon={UserCircle}
                    hint="سارة — تنشر الطلبات وتقارن العروض"
                    variant="primary"
                  />
                  <DemoLogin
                    email="karim@hirfi.ma"
                    label="حرّاف"
                    icon={Briefcase}
                    hint="كريم — كهربائي يقدّم العروض"
                    variant="outline"
                  />
                </>
              )}
            </div>

            {!user ? (
              <p className="mt-4 text-xs text-white/75">
                الحسابان جاهزان ببيانات تجريبية واقعية (طلبات، عروض، محادثات، تقييمات).
                كلمة المرور: <span className="font-mono">{DEMO_PASSWORD}</span>
              </p>
            ) : null}
          </div>

          {/* معاينة مصغّرة توضّح جوهر التطبيق: طلب + عرضان */}
          <div className="rounded-2xl bg-white/95 p-4 text-foreground shadow-2xl backdrop-blur lg:p-5">
            <div className="flex items-center justify-between gap-2 border-b border-border pb-3">
              <span className="text-sm font-bold">تسريب ماء تحت حوض المطبخ</span>
              <span className="rounded-full bg-brand/12 px-2.5 py-0.5 text-xs font-semibold text-brand-dark">
                ميزانية 300 درهم
              </span>
            </div>
            <div className="mt-3 grid gap-2">
              {[
                { n: "كريم — كهربائي", p: "280 درهم", d: "ساعتان", s: "موثّق" },
                { n: "يوسف — سبّاك", p: "320 درهم", d: "ساعة", s: "★ 4.8" },
                { n: "حمزة — سبّاك", p: "260 درهم", d: "٣ ساعات", s: "★ 4.5" },
              ].map((o) => (
                <div
                  key={o.n}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-3 py-2.5"
                >
                  <div>
                    <div className="text-sm font-semibold">{o.n}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {o.d} — {o.s}
                    </div>
                  </div>
                  <span className="font-display text-sm font-extrabold text-brand-dark">{o.p}</span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-center text-[11px] text-muted-foreground">
              ثلاثة عروض على طلب واحد — الزبون يقارن ويقبل أو يفاوض.
            </p>
          </div>
        </div>
      </section>

      {/* كيف يعمل */}
      <section className="shell py-14">
        <h2 className="text-center font-display text-2xl font-extrabold sm:text-3xl">
          كيف يعمل «حِرْفي»؟
        </h2>
        <p className="mx-auto mt-2 max-w-2xl text-center text-sm text-muted-foreground">
          ثلاث خطوات فقط، بنفس منطق التفاوض الذي جعل inDrive يعمل — لكن بين زبون وحرّاف.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.title} className="card-warm rounded-xl border border-border bg-card p-5">
              <span className="grid size-11 place-items-center rounded-xl bg-brand/10 text-brand-dark">
                <s.icon className="size-5.5" />
              </span>
              <h3 className="mt-3.5 text-base font-bold">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* الميزات */}
      <section className="border-y border-border bg-card/50 py-14">
        <div className="shell">
          <h2 className="text-center font-display text-2xl font-extrabold sm:text-3xl">
            ماذا يوجد داخل التطبيق؟
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="flex gap-3 rounded-xl border border-border bg-card p-4">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-teal-soft text-teal">
                  <f.icon className="size-4.5" />
                </span>
                <div>
                  <h3 className="text-sm font-bold">{f.title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{f.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="shell flex flex-col items-center gap-3 py-10 text-center">
        <span className="grid size-10 place-items-center rounded-xl bg-brand-gradient font-display text-lg font-extrabold text-white">
          ح
        </span>
        <p className="max-w-xl text-xs leading-relaxed text-muted-foreground">
          «حِرْفي» نموذج تطبيقي تعليمي — محفظة داخلية بلا بوابة دفع حقيقية، ولا خرائط GPS،
          ولا إشعارات خارج التطبيق. جميع البيانات المعروضة تجريبية.
        </p>
        {!user ? (
          <div className="mt-1 flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/login">دخول</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/register">أنشئ حساباً</Link>
            </Button>
          </div>
        ) : null}
      </footer>
    </div>
  );
}
