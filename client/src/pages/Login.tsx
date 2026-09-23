// ── دخول: بريد + كلمة مرور، مع أزرار الحسابين التجريبيين ──────────────────────
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { LogOut, UserCircle, Briefcase, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, Spinner } from "@/components/hirfi/primitives";
import { useAuth } from "@/_core/useAuth";
import { toast } from "@/lib/toast";
import { errorMessage } from "@/lib/format";
import { AuthShell } from "@/pages/Register";

export default function Login() {
  const { login } = useAuth();
  const [, navigate] = useLocation();
  const requestedPath =
    typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("next") ?? "";
  const destination = requestedPath.startsWith("/") && !requestedPath.startsWith("//") ? requestedPath : "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [demoBusy, setDemoBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError("أدخل البريد وكلمة المرور");
      return;
    }
    setBusy(true);
    try {
      await login(email.trim(), password);
      toast.success("تم الدخول");
      navigate(destination);
    } catch (e2) {
      setError(errorMessage(e2));
    } finally {
      setBusy(false);
    }
  }

  async function demo(demoEmail: string, label: string) {
    setDemoBusy(demoEmail);
    setError(null);
    try {
      await login(demoEmail, "demo1234");
      toast.success(`دخلت كـ${label}`);
      navigate(destination);
    } catch (e2) {
      setError(errorMessage(e2));
    } finally {
      setDemoBusy(null);
    }
  }

  return (
    <AuthShell
      title="تسجيل الدخول"
      subtitle="أدخل بياناتك، أو استعمل أحد الحسابين التجريبيين لتجربة التطبيق فوراً."
      footer={
        <>
          ليس لديك حساب؟{" "}
          <Link href="/register" className="font-bold text-brand-dark underline">
            أنشئ حساباً جديداً
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="grid gap-4">
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
        <Field label="كلمة المرور" required>
          <Input
            type="password"
            dir="ltr"
            autoComplete="current-password"
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
          {busy ? <Spinner /> : <LogOut className="size-4" />}
          دخول
        </Button>
      </form>

      <div className="mt-5 grid gap-2.5 border-t border-border pt-5">
        <p className="text-center text-[11.5px] font-bold text-muted-foreground">
          أو استعمل حساباً تجريبياً (كلمة المرور:{" "}
          <span className="font-mono">demo1234</span>)
        </p>
        <div className="grid gap-2">
          <Button
            type="button"
            variant="outline"
            className="justify-start gap-2.5 rounded-2xl py-5"
            onClick={() => demo("sara@hirfi.ma", "زبون")}
            disabled={demoBusy !== null}
          >
            {demoBusy === "sara@hirfi.ma" ? <Spinner /> : <UserCircle className="size-4.5 text-brand-dark" />}
            <span className="flex flex-col items-start leading-tight">
              <b className="text-[13px]">سارة — زبون</b>
              <span className="text-[10.5px] font-normal text-muted-foreground">
                تنشر طلبات وتقارن العروض
              </span>
            </span>
          </Button>
          <Button
            type="button"
            variant="outline"
            className="justify-start gap-2.5 rounded-2xl py-5"
            onClick={() => demo("karim@hirfi.ma", "حرّاف")}
            disabled={demoBusy !== null}
          >
            {demoBusy === "karim@hirfi.ma" ? <Spinner /> : <Briefcase className="size-4.5 text-teal" />}
            <span className="flex flex-col items-start leading-tight">
              <b className="text-[13px]">كريم — حرّاف</b>
              <span className="text-[10.5px] font-normal text-muted-foreground">
                يقدّم عروضاً وينفّذ الأعمال
              </span>
            </span>
          </Button>
        </div>
        <Link
          href="/"
          className="mt-1 inline-flex items-center justify-center gap-1 text-[12px] font-bold text-muted-foreground"
        >
          <ArrowLeft className="size-3.5" />
          العودة إلى الصفحة الرئيسية
        </Link>
      </div>
    </AuthShell>
  );
}
