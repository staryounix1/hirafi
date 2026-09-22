// ── تنبيهات خفيفة بلا مكتبة: مزوّد واحد + صفّان من الرسائل ────────────────────
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Kind = "success" | "error" | "info";
type Item = { id: number; kind: Kind; text: string };

interface ToastApi {
  success: (text: string) => void;
  error: (text: string) => void;
  info: (text: string) => void;
}

const ToastCtx = createContext<ToastApi | null>(null);

// مخزن على مستوى الوحدة: يُسمح لشيفرة الخادم/الخطّافات بالاستدعاء بلا مرور JSX.
let push: ((kind: Kind, text: string) => void) | null = null;
export const toast: ToastApi = {
  success: (t) => push?.("success", t),
  error: (t) => push?.("error", t),
  info: (t) => push?.("info", t),
};

/** حاوية التنبيهات — تُركَّب مرّة واحدة في main.tsx فوق كل الصفحات. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Item[]>([]);

  const add = useCallback((kind: Kind, text: string) => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev.slice(-3), { id, kind, text }]);
    window.setTimeout(() => setItems((prev) => prev.filter((i) => i.id !== id)), 4200);
  }, []);

  push = add;
  const api = useMemo<ToastApi>(
    () => ({ success: (t) => add("success", t), error: (t) => add("error", t), info: (t) => add("info", t) }),
    [add],
  );

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[100] flex flex-col items-center gap-2 px-4 md:bottom-6">
        {items.map((i) => (
          <div
            key={i.id}
            className={cn(
              "pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm shadow-lg backdrop-blur",
              "animate-in fade-in slide-in-from-bottom-2",
              i.kind === "success" && "border-success/30 bg-success-soft text-success",
              i.kind === "error" && "border-destructive/30 bg-destructive/10 text-destructive",
              i.kind === "info" && "border-teal/25 bg-teal-soft text-teal",
            )}
          >
            {i.kind === "success" ? (
              <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
            ) : i.kind === "error" ? (
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
            ) : (
              <Info className="mt-0.5 size-4 shrink-0" />
            )}
            <span className="flex-1 font-medium">{i.text}</span>
            <button
              type="button"
              onClick={() => setItems((prev) => prev.filter((x) => x.id !== i.id))}
              className="opacity-60 transition-opacity hover:opacity-100"
              aria-label="إغلاق"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast(): ToastApi {
  return useContext(ToastCtx) ?? toast;
}
