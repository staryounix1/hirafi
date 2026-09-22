// ── تسجيل حساب جديد + الحاوية البصرية المشتركة لصفحتي الدخول والتسجيل ──────────
import { useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { UserPlus, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, Spinner } from "@/components/hirfi/primitives";
import { useAuth } from "@/_core/useAuth";
import { toast } from "@/lib/toast";
import { errorMessage } from "@/lib/format";

/** إطار موحّد لصفحتي الدخول والتسجيل: بطاقة مركّزة بعرض الجوال على خلفية كريمية. */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-10">
      <Link href="/" className="mb-6 flex items-center gap-3">
        <span className="grid size-12 place-items-center rounded-3xl bg-brand font-display text-2xl leading-none font-black text-brand-ink">
          ح
        </span>
        <span className="flex flex-col leading-none">
          <b className="font-display text-[22px] font-black tracking-tight">حِرفي</b>
          <span className="mt-1 text-[11.5px] text-muted-foreground">
            حرفيّون وخدمات قريبة منك
          </span>
        </span>
      </Link>

      <div className="card-flat w-full max-w-md p-5 sm:p-6">
        <h1 className="font-display text-[24px] leading-tight font-black">{title}</h1>
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{subtitle}</p>
        <div className="mt-5">{children}</div>
      </div>

      <div className="mt-5 max-w-md text-center text-[13px] text-muted-foreground">{footer}</div>
    </div>
  );
}

export default function Register() {
  const { signup } = useAuth();
  const [, navigate] = useLocation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (name.trim().length < 2) return setError("أدخل اسمك (حرفان على الأقل)");
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError("أدخل بريداً إلكترونياً صحيحاً");
    if (password.length < 8) return setError("كلمة المرور يجب أن تكون 8 أحرف على الأقل");

    setBusy(true);
    try {
      await signup(email.trim(), password, name.trim());
      toast.success("أُنشئ حسابك — اختر دورك الآن");
      navigate("/onboarding");
    } catch (e2) {
      setError(errorMessage(e2));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title="حساب جديد"
      subtitle="ثوانٍ وتصير داخل التطبيق — تختار دورك (زبون أو حرّاف) في الخطوة التالية."
      footer={
        <>
          لديك حساب بالفعل؟{" "}
          <Link href="/login" className="font-bold text-brand-dark underline">
            سجّل الدخول
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="grid gap-4">
        <Field label="الاسم الكامل" required>
          <Input
            autoComplete="name"
            placeholder="مثال: سارة العلوي"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field label="البريد الإلكتروني" required>
          <Input
            type="email"
            dir="ltr"
            autoComplete="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field label="كلمة المرور" hint="8 أحرف على الأقل" required>
          <Input
            type="password"
            dir="ltr"
            autoComplete="new-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>

        {error ? (
          <p className="rounded-2xl bg-destructive/10 px-3.5 py-3 text-[12.5px] font-bold text-destructive">
            {error}
          </p>
        ) : null}

        <Button type="submit" size="lg" className="w-full gap-2 rounded-full" disabled={busy}>
          {busy ? <Spinner /> : <UserPlus className="size-4" />}
          أنشئ الحساب
        </Button>

        <Link
          href="/"
          className="inline-flex items-center justify-center gap-1 text-[12px] font-bold text-muted-foreground"
        >
          <ArrowLeft className="size-3.5" />
          العودة إلى الصفحة الرئيسية
        </Link>
      </form>
    </AuthShell>
  );
}
