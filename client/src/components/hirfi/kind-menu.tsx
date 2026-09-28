// ── شريط منسدل لاختيار نوع الخدمة: قريبة / رقمية / شركات ─────────────────────
// كيبان فوق لائحة الخدمات فالرئيسية وفلوحة الحرّاف، وكيبدّل المجموعة المعروضة.
import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type ServiceKindTab = "field" | "digital" | "b2b";

export const KIND_TABS = [
  { key: "field", labelAr: "خدمات قريبة" },
  { key: "digital", labelAr: "رقمي" },
  { key: "b2b", labelAr: "الشركات" },
] as const;

export function KindMenu({
  value,
  onChange,
  className,
}: {
  value: ServiceKindTab;
  onChange: (kind: ServiceKindTab) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDown(event: PointerEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, []);

  const current = KIND_TABS.find((tab) => tab.key === value) ?? KIND_TABS[0];

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((prev) => !prev);
        }}
        className="inline-flex items-center gap-1 rounded-full bg-brand px-2.5 py-1 text-[10px] font-black text-brand-ink"
      >
        {current.labelAr}
        <ChevronDown className={cn("size-3 transition-transform", open && "rotate-180")} />
      </button>

      {open ? (
        <div
          role="listbox"
          className="absolute end-0 z-30 mt-1.5 w-40 overflow-hidden rounded-2xl border border-border bg-card p-1"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          {KIND_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="option"
              aria-selected={value === tab.key}
              onClick={(event) => {
                event.stopPropagation();
                onChange(tab.key);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center justify-between rounded-xl px-3 py-2 text-[12px] font-bold transition-colors",
                value === tab.key ? "bg-brand text-brand-ink" : "text-foreground hover:bg-muted",
              )}
            >
              {tab.labelAr}
              {value === tab.key ? <span className="size-1.5 rounded-full bg-brand-ink" /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
