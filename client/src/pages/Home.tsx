// ── الصفحة الرئيسية: خريطة بطول الشاشة + شريحة تعريف + دخول تجريبي ──────────────────
// نفس ترتيب شاشة inDrive الافتتاحية: خريطة تملأ الأعلى، ثم شريحة بيضاء بحواف علوية كبيرة
// تحمل العنوان والأزرار. الزائر يجرّب التطبيق فوراً بحسابين مُزروعين في البيانات التجريبية.
import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  UserCircle,
  Briefcase,
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DragHandle, MapCanvas, type MapPinSpec } from "@/components/hirfi/map";
import { LiveDot, Spinner } from "@/components/hirfi/primitives";
import { PROFESSIONAL_CRAFTS, SERVICE_MODES } from "@/components/hirfi/service-picker";
import { useAuth } from "@/_core/useAuth";
import { toast } from "@/lib/toast";
import { errorMessage } from "@/lib/format";

const DEMO_PASSWORD = "demo1234";

/** دبابيس عرضية ثابتة — تُرسم بنسب مئوية فلا تتغيّر مع المقاس. */
const HERO_PINS: MapPinSpec[] = [
  { id: "me", x: 30, y: 76, kind: "me" },
  { id: "p1", x: 55, y: 57, kind: "provider", label: "ك" },
  { id: "p2", x: 75, y: 38, kind: "provider", label: "ي" },
  { id: "p3", x: 41, y: 29, kind: "provider", label: "ح" },
];

const STEPS = [
  {
    icon: Send,
    title: "انشر مشكلتك",
    body: "صف الخدمة، حدّد ميزانيتك المقترحة وموقعك، وخلي الطلب يوصل لمقدمي الخدمة القريبين.",
  },
  {
    icon: CircleDollarSign,
    title: "استقبل العروض",
    body: "الحرّافون القريبون يقدّمون السعر والمدة والرسالة. تقارن العروض، وتردّ عليها، وتتفاوض على السعر النهائي.",
  },
  {
    icon: CheckCircle2,
    title: "اختر ونفّذ",
    body: "اقبل العرض الأنسب فيثبت السعر، ثم تتابع: مقبول → قيد التنفيذ → منتهي، وتقييم متبادل.",
  },
];

const FEATURES = [
  { icon: Search, title: "طلبات قريبة مصفّاة", body: "الحرّاف يفلتر الطلبات بالقرب والفئة والميزانية والاستعجال." },
  { icon: MessageSquare, title: "محادثة داخل الطلب", body: "خيط خاص بين الطرفين، يتحدّث تلقائياً." },
  { icon: Wallet, title: "محفظة وسجل مدفوعات", body: "دفع واستحقاق وعمولة منصّة 10%، كلها مسجّلة." },
  { icon: Star, title: "تقييم متبادل", body: "بعد الإتمام يقيّم الطرفان، ويظهر على الملف العام." },
  { icon: ShieldCheck, title: "شارة موثّق", body: "مع إنجازات الحرّاف وأعماله المنجزة ومتوسط تقييمه." },
  { icon: MapPin, title: "موقع مبسّط", body: "مدينة + حي من قائمة مغربية — بلا خرائط GPS معقّدة." },
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
    <div className="grid gap-1">
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
      <p className="text-center text-[11px] leading-snug text-muted-foreground">{hint}</p>
    </div>
  );
}

export default function Home() {
  const { user } = useAuth();
  const [craftsOpen, setCraftsOpen] = useState(false);

  return (
    <div className="app-stage min-h-svh">
      <div className="app-frame">
        {/* الخريطة البطلة — تملأ أعلى العمود كما في شاشة inDrive الافتتاحية */}
        <section className="relative">
          <MapCanvas pins={HERO_PINS} showRoute height="42svh" />

          {/* رمز التطبيق عائماً فوق الخريطة */}
          <div className="absolute inset-x-4 top-4 flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-2.5 rounded-full bg-background/95 py-2 ps-2 pe-4 shadow-md backdrop-blur">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand font-display text-base leading-none font-black text-brand-ink">
                ح
              </span>
              <span className="flex min-w-0 flex-col items-start gap-1 leading-none">
                <b className="font-display text-[15px] leading-none font-black tracking-tight">حِرفي</b>
                <span className="whitespace-nowrap text-[10px] leading-none font-medium text-muted-foreground">
                  خدمات وحرّافون قريبون
                </span>
              </span>
            </span>
            <LiveDot label="3 حرّافين قريبين" />
          </div>

          {/* الشريحة البيضاء — العنصر المميّز في كل شاشات inDrive */}
          <div className="sheet relative z-10 -mt-7 px-5 pt-3 pb-6">
            <DragHandle className="mb-4" />

            <h1 className="text-[30px] leading-[1.14] font-black text-balance">
              اختار الخدمة، اقترح الثمن، وخلي الحرّافين يتنافسو عليك
            </h1>
            <p className="mt-3 text-[13.5px] leading-relaxed text-muted-foreground">
              حِرفي كيجمعك بمقدمي خدمات قريبين منك. أنت كتشرح المطلوب وكتقترح ميزانيتك، وهما كيرسلو عروضهم بالثمن
              والمدة والتفاصيل.
            </p>

            <div className="mt-5 grid gap-3">
              {user ? (
                <>
                  <Button asChild size="lg" className="w-full gap-2">
                    <Link href="/dashboard">
                      ادخل إلى لوحتك
                      <ArrowLeft className="size-4.5" />
                    </Link>
                  </Button>
                  <p className="text-center text-[11px] text-muted-foreground">
                    أنت داخل بحساب {user.name ?? "مستخدم"} — الجلسة محفوظة في هذا المتصفح.
                  </p>
                </>
              ) : (
                <>
                  <DemoLogin
                    email="sara@hirfi.ma"
                    label="زبون"
                    icon={UserCircle}
                    hint="سارة — تنشر الطلبات وتقارن العروض وتتفاوض"
                    variant="primary"
                  />
                  <DemoLogin
                    email="karim@hirfi.ma"
                    label="حرّاف"
                    icon={Briefcase}
                    hint="كريم — كهربائي يقدّم العروض وينفّذ ويستلم"
                    variant="outline"
                  />
                  <p className="mt-1 text-center text-[11px] leading-relaxed text-muted-foreground">
                    الحسابان جاهزان ببيانات واقعية. كلمة المرور{" "}
                    <span className="font-mono font-bold text-foreground">{DEMO_PASSWORD}</span>
                    {" — "}
                    <Link href="/login" className="font-bold text-foreground underline">
                      أو ادخل بحسابك
                    </Link>
                    {" · "}
                    <Link href="/register" className="font-bold text-foreground underline">
                      حساب جديد
                    </Link>
                  </p>
                </>
              )}
            </div>
          </div>
        </section>

        {/* One app, many services — the service picker is the app's first real action. */}
        <section className="px-5 pt-2 pb-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="text-[17px] font-black">شنو بغيتي اليوم؟</h2>
              <p className="mt-1 text-[12px] text-muted-foreground">اختار نوع الخدمة وبدأ طلبك.</p>
            </div>
            <span className="rounded-full bg-brand px-2.5 py-1 text-[10px] font-black text-brand-ink">خدمات قريبة</span>
          </div>

          {craftsOpen ? (
            <>
              <button
                type="button"
                onClick={() => setCraftsOpen(false)}
                className="mt-3 rounded-full bg-muted px-3 py-1.5 text-[11px] font-black"
              >
                رجوع للخدمات
              </button>
              <div className="mt-3 grid grid-cols-2 gap-2.5">
                {PROFESSIONAL_CRAFTS.map((craft) => (
                  <Link
                    key={craft.slug}
                    href={`/requests/new?service=${craft.slug}`}
                    className="group rounded-3xl bg-card p-3.5 transition-transform active:scale-[0.98]"
                    style={{ boxShadow: "var(--shadow-card)" }}
                  >
                    <span className="grid size-10 place-items-center rounded-2xl bg-brand text-brand-ink transition-transform group-hover:scale-105">
                      <craft.icon className="size-5" />
                    </span>
                    <h3 className="mt-3 text-[13px] font-black">{craft.title}</h3>
                  </Link>
                ))}
              </div>
            </>
          ) : (
            <div className="mt-3 grid grid-cols-2 gap-2.5">
              {SERVICE_MODES.map((service) =>
                service.slug === "professional-crafts" ? (
                  <button
                    key={service.slug}
                    type="button"
                    onClick={() => setCraftsOpen(true)}
                    className="group rounded-3xl bg-card p-3.5 text-start transition-transform active:scale-[0.98]"
                    style={{ boxShadow: "var(--shadow-card)" }}
                  >
                    <span className="grid size-10 place-items-center rounded-2xl bg-brand text-brand-ink transition-transform group-hover:scale-105">
                      <service.icon className="size-5" />
                    </span>
                    <h3 className="mt-3 text-[13px] font-black">{service.title}</h3>
                    <p className="mt-1 text-[11px] text-muted-foreground">{service.description}</p>
                  </button>
                ) : (
                  <Link
                    key={service.slug}
                    href={`/requests/new?service=${service.slug}`}
                    className="group rounded-3xl bg-card p-3.5 transition-transform active:scale-[0.98]"
                    style={{ boxShadow: "var(--shadow-card)" }}
                  >
                    <span className="grid size-10 place-items-center rounded-2xl bg-brand text-brand-ink transition-transform group-hover:scale-105">
                      <service.icon className="size-5" />
                    </span>
                    <h3 className="mt-3 text-[13px] font-black">{service.title}</h3>
                    <p className="mt-1 text-[11px] text-muted-foreground">{service.description}</p>
                  </Link>
                ),
              )}
            </div>
          )}
        </section>

        {/* كيف يعمل */}
        <section className="px-5 pt-2 pb-4">
          <h2 className="text-[17px] font-black">كيف يعمل «حِرفي»؟</h2>
          <p className="mt-1 text-[13px] text-muted-foreground">ثلاث خطوات واضحة من الطلب حتى الاتفاق والتنفيذ.</p>

          <ol className="mt-4 grid gap-2.5">
            {STEPS.map((s, i) => (
              <li
                key={s.title}
                className="flex items-start gap-3 rounded-3xl bg-card p-4"
                style={{ boxShadow: "var(--shadow-card)" }}
              >
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand text-brand-ink">
                  <s.icon className="size-5" />
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-price text-[13px] text-muted-foreground">{i + 1}</span>
                    <h3 className="text-[15px] font-black">{s.title}</h3>
                  </div>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* ما يوجد داخل التطبيق */}
        <section className="px-5 pb-6">
          <h2 className="text-[17px] font-black">ماذا يوجد داخل التطبيق؟</h2>
          <div className="mt-3 grid grid-cols-2 gap-2.5">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-2xl bg-muted/70 p-3">
                <span className="grid size-8 place-items-center rounded-full bg-background">
                  <f.icon className="size-4" />
                </span>
                <h3 className="mt-2 text-[12.5px] leading-tight font-black">{f.title}</h3>
                <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        <footer className="mt-auto grid gap-3 border-t border-border px-5 py-6">
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            «حِرفي» نموذج تطبيقي تعليمي: محفظة داخلية بلا بوابة دفع حقيقية، وموقع مبسّط بلا خرائط GPS، وإشعارات
            داخل التطبيق فقط بلا بريد أو SMS. كل البيانات المعروضة تجريبية.
          </p>
          {!user ? (
            <div className="flex gap-2">
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
    </div>
  );
}
