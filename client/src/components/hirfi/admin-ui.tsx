// ── قطع واجهة مشتركة لأقسام الإدارة: بحث، نافذة تأكيد بسبب، شارات حالة ───────
import { useEffect, useState, type ReactNode } from "react";
import { Search, X, AlertTriangle, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/hirfi/primitives";
import { cn } from "@/lib/utils";
import type { Tone } from "@/lib/format";

/** حقل بحث بسيط مع مهلة (debounce) — يقلّل الاستعلامات أثناء الكتابة. */
export function SearchBox({
  value,
  onChange,
  placeholder = "ابحث…",
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [local, setLocal] = useState(value);
  useEffect(() => setLocal(value), [value]);
  useEffect(() => {
    const t = setTimeout(() => {
      if (local !== value) onChange(local);
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [local]);

  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        placeholder={placeholder}
        className="h-10 rounded-xl pe-9 ps-9 text-[13px]"
      />
      {local ? (
        <button
          type="button"
          onClick={() => {
            setLocal("");
            onChange("");
          }}
          aria-label="مسح"
          className="absolute end-2.5 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-muted"
        >
          <X className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
}

/** أزرار تصفية سريعة (chips) بصف واحد — تُستخدم لحالات الطلب/العرض. */
export function FilterChips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T | ""; label: string; count?: number }[];
  value: T | "";
  onChange: (v: T | "") => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.value || "all"}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-full px-3 py-1.5 text-[12px] font-bold transition-colors",
            value === o.value ? "bg-brand text-brand-ink" : "bg-muted text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
          {typeof o.count === "number" ? <span className="opacity-60"> ({o.count})</span> : null}
        </button>
      ))}
    </div>
  );
}

/**
 * نافذة تأكيد بسبب إلزامي — كل فعل إداري مدمِّر يمرّ من هنا، فالسبب يُعرض على
 * المستخدم المتأثّر ويُحفظ في السجل. لا زر تأكيد قبل كتابة سبب كافٍ.
 */
export function ReasonDialog({
  open,
  title,
  description,
  confirmLabel = "تأكيد",
  minLength = 4,
  busy,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  minLength?: number;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  useEffect(() => {
    if (open) setReason("");
  }, [open]);

  if (!open) return null;
  const valid = reason.trim().length >= minLength;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal>
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-xl">
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-destructive/12 text-destructive">
            <AlertTriangle className="size-4.5" />
          </span>
          <div className="min-w-0">
            <h2 className="text-[16px] font-black">{title}</h2>
            {description ? (
              <p className="mt-1 text-[12.5px] leading-snug text-muted-foreground">{description}</p>
            ) : null}
          </div>
        </div>
        <label className="mt-4 block">
          <span className="text-[11px] font-bold text-muted-foreground">
            السبب (يُحفظ في السجل ويُرسل للمعنيّ)
          </span>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder={`اكتب ${minLength} أحرف على الأقل…`}
            className="mt-1.5 rounded-xl text-[13px]"
          />
        </label>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel} disabled={busy} className="rounded-xl">
            إلغاء
          </Button>
          <Button
            variant="destructive"
            onClick={() => onConfirm(reason.trim())}
            disabled={!valid || busy}
            className="rounded-xl"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : null}
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

const BLOCK_TONE: Record<string, Tone> = {
  blocked: "danger",
  verified: "success",
  unverified: "muted",
  admin: "info",
  provider: "teal",
  customer: "muted",
  owing: "danger",
  ok: "success",
};

export function Tag({ kind, children }: { kind: keyof typeof BLOCK_TONE | string; children: ReactNode }) {
  return <Badge tone={BLOCK_TONE[kind] ?? "muted"}>{children}</Badge>;
}

/** صف حالة المستخدم: دور + توثيق + حظر. */
export function UserTags({
  role,
  isVerified,
  blocked,
}: {
  role?: string | null;
  isVerified?: boolean | null;
  blocked?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {role === "admin" ? (
        <Tag kind="admin">إداري</Tag>
      ) : role === "provider" ? (
        <Tag kind="provider">حرّاف</Tag>
      ) : (
        <Tag kind="customer">زبون</Tag>
      )}
      {role === "provider" ? (
        isVerified ? <Tag kind="verified">موثّق</Tag> : <Tag kind="unverified">غير موثّق</Tag>
      ) : null}
      {blocked ? <Tag kind="blocked">موقوف</Tag> : null}
    </div>
  );
}
