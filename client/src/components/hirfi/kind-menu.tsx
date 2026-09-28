// ── شريط منسدل لاختيار نوع الخدمة ─────────────────────────────────────────────
// العناصر كتجي من الإدارة (`home_menu_items`) — الأدمن كيزيد/كيمسح/كيرتّب
// الخيارات اللي كتبان فوق لائحة الخدمات فالرئيسية ولوحة الحرّاف.
import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useHomeMenu } from "@/lib/hooks";
import { categoryIcon } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface MenuItem {
  id: string;
  labelAr: string;
  slug: string;
  kindFilter: string | null;
  subSlugs: string | null;
  icon: string | null;
  sortOrder: number;
}

/** عناصر افتراضية إلا ما تحمّلتش قائمة الإدارة — التطبيق يبقى صالحاً. */
export const FALLBACK_MENU: MenuItem[] = [
  { id: "f1", labelAr: "خدمات قريبة", slug: "field", kindFilter: "field", subSlugs: null, icon: "Wrench", sortOrder: 0 },
  { id: "f2", labelAr: "رقمي", slug: "digital", kindFilter: "digital", subSlugs: null, icon: "Laptop", sortOrder: 1 },
  { id: "f3", labelAr: "الشركات", slug: "b2b", kindFilter: "b2b", subSlugs: null, icon: "Building2", sortOrder: 2 },
];

export function KindMenu({
  value,
  onChange,
  onOpen,
  className,
}: {
  value: string;
  onChange: (item: MenuItem) => void;
  /** ينبّه الأب باش يوسّع اللوحة قبل ما ينسدل الشريط (باش القائمة ما تتقطعش). */
  onOpen?: () => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const q = useHomeMenu();
  const items: MenuItem[] = q.data && q.data.length > 0 ? (q.data as MenuItem[]) : FALLBACK_MENU;

  useEffect(() => {
    function onDown(event: PointerEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, []);

  const current = items.find((item) => item.slug === value) ?? items[0];
  const CurrentIcon = categoryIcon(current?.icon ?? "");

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
        <CurrentIcon className="size-3" />
        {current?.labelAr}
        <ChevronDown className={cn("size-3 transition-transform", open && "rotate-180")} />
      </button>

      {open ? (
        <div
          role="listbox"
          className="absolute end-0 z-30 mt-1.5 max-h-[60svh] w-48 overflow-y-auto rounded-2xl border border-border bg-card p-1"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          {items.map((item) => {
            const Icon = categoryIcon(item.icon ?? "");
            return (
              <button
                key={item.id}
                type="button"
                role="option"
                aria-selected={value === item.slug}
                onClick={(event) => {
                  event.stopPropagation();
                  onChange(item);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-[12px] font-bold transition-colors",
                  value === item.slug ? "bg-brand text-brand-ink" : "text-foreground hover:bg-muted",
                )}
              >
                <Icon className="size-3.5 shrink-0" />
                <span className="flex-1 text-start">{item.labelAr}</span>
                {value === item.slug ? <span className="size-1.5 rounded-full bg-brand-ink" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
