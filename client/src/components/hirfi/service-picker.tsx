import { useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import { Link } from "wouter";
import { Hammer, PaintRoller, Scissors, ShoppingBag, Truck, Wrench, Zap } from "lucide-react";
import { DragHandle } from "@/components/hirfi/map";
import { cn } from "@/lib/utils";

export const SERVICE_MODES = [
  { slug: "professional-crafts", title: "حرف مهنية", description: "صباغة، جبس، بناء وأكثر", icon: Wrench },
  { slug: "grocery", title: "قضاء الأغراض", description: "شراء وتوصيل", icon: ShoppingBag },
  { slug: "moving", title: "نقل أثاث", description: "نقل وتركيب", icon: Truck },
] as const;

export const PROFESSIONAL_CRAFTS = [
  { slug: "painting", title: "صباغة", icon: PaintRoller },
  { slug: "plaster", title: "جبس", icon: Wrench },
  { slug: "construction", title: "بناء", icon: Hammer },
  { slug: "tiling", title: "زليج", icon: Hammer },
  { slug: "marble", title: "رخام", icon: Hammer },
  { slug: "electrician", title: "طريسيان", icon: Zap },
  { slug: "plumber", title: "بلومبي", icon: Wrench },
  { slug: "carpenter", title: "نجار", icon: Hammer },
  { slug: "aluminum", title: "المينيزم", icon: Wrench },
  { slug: "tailoring", title: "خياطة", icon: Scissors },
] as const;

export function ServicePickerSheet({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [craftsOpen, setCraftsOpen] = useState(false);
  const startY = useRef<number | null>(null);

  function closeSheet() {
    setOpen(false);
    setCraftsOpen(false);
  }

  function startDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    startY.current = event.clientY;
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function finishDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    const initialY = startY.current;
    if (initialY === null) return;

    const delta = event.clientY - initialY;
    startY.current = null;
    if (delta < -30) setOpen(true);
    else if (delta > 30) closeSheet();
    else if (open) closeSheet();
    else setOpen(true);
  }

  function openOnClick() {
    if (!open) setOpen(true);
  }

  function openOnKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!open && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      setOpen(true);
    }
  }

  return (
    <div
      className={cn(
        "sheet absolute inset-x-0 bottom-0 z-20 max-h-full overflow-y-auto px-3.5 pb-5 pt-3.5 transition-transform duration-300 ease-out",
        open && "min-h-full",
        className,
      )}
      style={{ transform: open ? "translateY(0)" : "translateY(calc(100% - 250px))" }}
      role={!open ? "button" : undefined}
      tabIndex={!open ? 0 : undefined}
      aria-label={!open ? "افتح نافذة الخدمات" : undefined}
      onClick={openOnClick}
      onKeyDown={openOnKeyDown}
    >
      <button
        type="button"
        aria-label={open ? "طي نافذة الخدمات" : "فتح نافذة الخدمات"}
        aria-expanded={open}
        className="mb-3 flex w-full cursor-grab touch-none justify-center active:cursor-grabbing"
        onPointerDown={startDrag}
        onPointerUp={finishDrag}
        onPointerCancel={() => {
          startY.current = null;
        }}
      >
        <DragHandle />
      </button>

      <div className="flex items-end justify-between gap-3 px-1">
        <div>
          <h2 className="text-[19px] font-black">{craftsOpen ? "اختار الحرفة" : "شنو بغيتي اليوم؟"}</h2>
          <p className="mt-1 text-[12px] text-muted-foreground">
            {craftsOpen ? "اختار المجال اللي محتاج" : "اضغط هنا باش تشوف الخدمات"}
          </p>
        </div>
        {craftsOpen ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setCraftsOpen(false);
            }}
            className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-black text-foreground"
          >
            رجوع
          </button>
        ) : (
          <span className="rounded-full bg-brand px-2.5 py-1 text-[10px] font-black text-brand-ink">خدمات قريبة</span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2.5 pt-3">
        {craftsOpen
          ? PROFESSIONAL_CRAFTS.map((craft) => {
              const Icon = craft.icon;
              return (
                <Link
                  key={craft.slug}
                  href={`/requests/new?service=${craft.slug}`}
                  className="group rounded-3xl bg-muted/65 p-3.5 transition-transform active:scale-[0.98]"
                >
                  <span className="grid size-10 place-items-center rounded-2xl bg-brand text-brand-ink transition-transform group-hover:scale-105">
                    <Icon className="size-5" />
                  </span>
                  <h3 className="mt-3 text-[13px] font-black">{craft.title}</h3>
                </Link>
              );
            })
          : SERVICE_MODES.map((service) => {
              const Icon = service.icon;
              if (service.slug === "professional-crafts") {
                return (
                  <button
                    key={service.slug}
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setOpen(true);
                      setCraftsOpen(true);
                    }}
                    className="group rounded-3xl bg-muted/65 p-3.5 text-start transition-transform active:scale-[0.98]"
                  >
                    <span className="grid size-10 place-items-center rounded-2xl bg-brand text-brand-ink transition-transform group-hover:scale-105">
                      <Icon className="size-5" />
                    </span>
                    <h3 className="mt-3 text-[13px] font-black">{service.title}</h3>
                    <p className="mt-1 text-[11px] text-muted-foreground">{service.description}</p>
                  </button>
                );
              }
              return (
                <Link
                  key={service.slug}
                  href={`/requests/new?service=${service.slug}`}
                  className="group rounded-3xl bg-muted/65 p-3.5 transition-transform active:scale-[0.98]"
                >
                  <span className="grid size-10 place-items-center rounded-2xl bg-brand text-brand-ink transition-transform group-hover:scale-105">
                    <Icon className="size-5" />
                  </span>
                  <h3 className="mt-3 text-[13px] font-black">{service.title}</h3>
                  <p className="mt-1 text-[11px] text-muted-foreground">{service.description}</p>
                </Link>
              );
            })}
      </div>
    </div>
  );
}
