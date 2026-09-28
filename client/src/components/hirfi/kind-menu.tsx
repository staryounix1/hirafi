// ── شريط منسدل لاختيار نوع الخدمة ─────────────────────────────────────────────
// كيبان فوق لائحة الخدمات فالرئيسية وفلوحة الحرّاف: خدمات قريبة (حرف مهنية،
// قضاء الأغراض، نقل أثاث) + رقمي + الشركات + إصلاح وصيانة + سيارات + منزل وعناية.
import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export const KIND_TABS = [
  { key: "field", labelAr: "خدمات قريبة" },
  { key: "crafts", labelAr: "حرف مهنية" },
  { key: "grocery", labelAr: "قضاء الأغراض" },
  { key: "moving", labelAr: "نقل أثاث" },
  { key: "field-repair", labelAr: "إصلاح وصيانة" },
  { key: "field-car", labelAr: "سيارات" },
  { key: "field-home", labelAr: "منزل وعناية" },
  { key: "digital", labelAr: "رقمي" },
  { key: "b2b", labelAr: "الشركات" },
] as const;

export type ServiceMenuKey = (typeof KIND_TABS)[number]["key"];

const SEPARATOR_AFTER = new Set(["field", "moving", "field-home"]);

export function KindMenu({
  value,
  onChange,
  onOpen,
  className,
}: {
  value: ServiceMenuKey;
  onChange: (key: ServiceMenuKey) => void;
  /** ينبّه الأب باش يوسّع اللوحة قبل ما ينسدل الشريط (باش القائمة ما تتقطعش). */
  onOpen?: () => void;
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
          setOpen((prev) => {
            if (!prev) onOpen?.();
            return !prev;
          });
        }}
        className="inline-flex items-center gap-1 rounded-full bg-brand px-2.5 py-1 text-[10px] font-black text-brand-ink"
      >
        {current.labelAr}
        <ChevronDown className={cn("size-3 transition-transform", open && "rotate-180")} />
      </button>

      {open ? (
        <div
          role="listbox"
          className="absolute end-0 z-30 mt-1.5 w-44 overflow-hidden rounded-2xl border border-border bg-card p-1"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          {KIND_TABS.map((tab) => (
            <div key={tab.key}>
              {SEPARATOR_AFTER.has(tab.key) ? <div className="mx-2 my-1 h-px bg-border" /> : null}
              <button
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
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
