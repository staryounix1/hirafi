// ── دخول: بريد + كلمة مرور، مع أزرار الحسابين التجريبيين ─────────────────
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
      navigate("/dashboard");
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
      navigate("/dashboard");
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
          <Link href="/register" className="font-semibold text-brand-dark hover:underline">
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
          <p className="rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2 text-sm font-medium text-destructive">
            {error}
          </p>
        ) : null}

        <Button type="submit" size="lg" className="gap-2" disabled={busy}>
          {busy ? <Spinner /> : <LogOut className="size-4" />}
          دخول
        </Button>
      </form>

      <div className="mt-6 grid gap-2.5 border-t border-border pt-5">
        <p className="text-center text-xs font-semibold text-muted-foreground">
          أو استعمل حساباً تجريبياً (كلمة المرور: <span className="font-mono">demo1234</span>)
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            onClick={() => demo("sara@hirfi.ma", "زبون")}
            disabled={demoBusy !== null}
          >
            {demoBusy === "sara@hirfi.ma" ? <Spinner /> : <UserCircle className="size-4" />}
            سارة — زبون
          </Button>
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            onClick={() => demo("karim@hirfi.ma", "حرّاف")}
            disabled={demoBusy !== null}
          >
            {demoBusy === "karim@hirfi.ma" ? <Spinner /> : <Briefcase className="size-4" />}
            كريم — حرّاف
          </Button>
        </div>
        <Link
          href="/"
          className="mt-1 inline-flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          العودة إلى الصفحة الرئيسية
        </Link>
      </div>
    </AuthShell>
  );
}
