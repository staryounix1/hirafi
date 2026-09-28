import { useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import { Link, useLocation } from "wouter";
import { Hammer, PaintRoller, Scissors, ShoppingBag, Truck, Wrench, Zap } from "lucide-react";
import { DragHandle } from "@/components/hirfi/map";
import { KindMenu, type ServiceMenuKey } from "@/components/hirfi/kind-menu";
import { CATALOG_BY_SLUG, SERVICE_CATALOG } from "@shared/catalog";
import { categoryIcon } from "@/lib/format";
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
  const [kind, setKind] = useState<ServiceMenuKey>("field");
  const startY = useRef<number | null>(null);
  const [, navigate] = useLocation();

  const isField = kind === "field";
  const isCrafts = kind === "crafts";
  const isSubgroup = kind.startsWith("field-");
  // المجموعة الفرعية (إصلاح/سيارات/منزل) كتعرض مجموعات مسمّاة داخل نفس النوع الميداني.
  const subgroupSlugs: Record<string, string[]> = {
    "field-repair": [
      "appliance-repair", "gas-heating", "cctv-security", "device-repair",
      "pest-control", "cctv", "extermination", "handyman",
    ],
    "field-car": ["car-wash", "car-mechanic", "car-bodywork"],
    "field-home": [
      "gardening", "home-care", "babysitting", "catering", "beauty",
      "health-care", "laundry", "cleaning", "post-construction-cleaning",
      "insulation", "terrace-waterproof", "pool-cleaning",
    ],
  };
  const subgroupCats = isSubgroup
    ? (subgroupSlugs[kind] ?? []).map((slug) => CATALOG_BY_SLUG.get(slug)).filter(Boolean)
    : [];
  const kindCats = SERVICE_CATALOG.filter((c) => c.kind === kind);

  function closeSheet() {
    setOpen(false);
    setKind("field");
  }

  function selectKind(next: ServiceMenuKey) {
    if (next === "grocery") return void navigate("/requests/new?service=grocery");
    if (next === "moving") return void navigate("/requests/new?service=moving");
    setKind(next);
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
          <h2 className="text-[19px] font-black">
            {isCrafts
              ? "اختار الحرفة"
              : isSubgroup
                ? kind === "field-repair"
                  ? "إصلاح وصيانة"
                  : kind === "field-car"
                    ? "خدمات السيارات"
                    : "منزل وعناية"
                : isField
                  ? "شنو بغيتي اليوم؟"
                  : kind === "digital"
                    ? "خدمات رقمية"
                    : "خدمات الشركات"}
          </h2>
          <p className="mt-1 text-[12px] text-muted-foreground">
            {isCrafts
              ? "اختار المجال اللي محتاج"
              : isSubgroup
                ? kind === "field-repair"
                  ? "أجهزة، كاميرات، مكافحة حشرات وأكثر"
                  : kind === "field-car"
                    ? "غسيل، ميكانيك وسمكرة فالمكان"
                    : "بستنة، طبخ، جليسة، تنظيف وأكثر"
                : isField
                  ? "اضغط هنا باش تشوف الخدمات"
                  : kind === "digital"
                    ? "فريلانس وتسليم عن بُعد — بلا موقع"
                    : "خدمات ومشاريع لفائدة المقاولات"}
          </p>
        </div>
        {isCrafts ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setKind("field");
            }}
            className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-black text-foreground"
          >
            رجوع
          </button>
        ) : (
          <KindMenu value={kind} onChange={selectKind} />
        )}
      </div>

      <div className="grid grid-cols-2 gap-2.5 pt-3">
        {isCrafts ? (
          PROFESSIONAL_CRAFTS.map((craft) => {
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
        ) : isSubgroup ? (
          subgroupCats.map((cat) => {
            const Icon = categoryIcon(cat!.icon);
            return (
              <Link
                key={cat!.slug}
                href={`/requests/new?service=${cat!.slug}`}
                className="group rounded-3xl bg-muted/65 p-3.5 transition-transform active:scale-[0.98]"
              >
                <span className="grid size-10 place-items-center rounded-2xl bg-brand text-brand-ink transition-transform group-hover:scale-105">
                  <Icon className="size-5" />
                </span>
                <h3 className="mt-3 text-[13px] font-black">{cat!.nameAr}</h3>
                <p className="mt-1 text-[11px] text-muted-foreground">{cat!.description}</p>
              </Link>
            );
          })
        ) : isField ? (
          SERVICE_MODES.map((service) => {
            const Icon = service.icon;
            if (service.slug === "professional-crafts") {
              return (
                <button
                  key={service.slug}
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setOpen(true);
                    setKind("crafts");
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
          })
        ) : (
          kindCats.map((cat) => {
            const Icon = categoryIcon(cat.icon);
            return (
              <Link
                key={cat.slug}
                href={`/requests/new?service=${cat.slug}`}
                className="group rounded-3xl bg-muted/65 p-3.5 transition-transform active:scale-[0.98]"
              >
                <span className="grid size-10 place-items-center rounded-2xl bg-brand text-brand-ink transition-transform group-hover:scale-105">
                  <Icon className="size-5" />
                </span>
                <h3 className="mt-3 text-[13px] font-black">{cat.nameAr}</h3>
                <p className="mt-1 text-[11px] text-muted-foreground">{cat.description}</p>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
