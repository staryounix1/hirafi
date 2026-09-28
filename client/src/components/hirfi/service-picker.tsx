import { useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import { Link, useLocation } from "wouter";
import { Hammer, PaintRoller, Scissors, ShoppingBag, Truck, Wrench, Zap } from "lucide-react";
import { DragHandle } from "@/components/hirfi/map";
import { KindMenu, type MenuItem } from "@/components/hirfi/kind-menu";
import { useHomeMenu } from "@/lib/hooks";
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

/** كتحوّل عنصر الشريط لقائمة الفئات اللي كتعرضه (مجموعة مسطّحة أو فئات نوع). */
export function resolveItemCats(item: MenuItem | undefined) {
  if (!item) return [];
  if (item.subSlugs) {
    return item.subSlugs
      .split(",")
      .map((s) => CATALOG_BY_SLUG.get(s.trim())!)
      .filter((c): c is NonNullable<typeof c> => Boolean(c));
  }
  if (item.kindFilter) return SERVICE_CATALOG.filter((c) => c.kind === item.kindFilter);
  const single = CATALOG_BY_SLUG.get(item.slug);
  return single ? [single] : [];
}

export function ServicePickerSheet({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState<string>("");
  const startY = useRef<number | null>(null);
  const [, navigate] = useLocation();
  const q = useHomeMenu();

  const items = (q.data ?? []) as MenuItem[];
  const current = items.find((i) => i.slug === key) ?? items[0];
  const cats = resolveItemCats(current);
  // عنصر بلا مجموعة ولا نوع = فئة واحدة → كليك كيودّي مباشرة لصفحة الطلب.
  const isDirect = Boolean(current && !current.kindFilter && !current.subSlugs);

  function closeSheet() {
    setOpen(false);
  }

  function selectKind(next: MenuItem) {
    if (!next.kindFilter && !next.subSlugs) {
      if (CATALOG_BY_SLUG.get(next.slug)) return void navigate(`/requests/new?service=${next.slug}`);
      return void navigate("/requests/new");
    }
    setKey(next.slug);
    setOpen(true);
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
          <h2 className="text-[19px] font-black">{current?.labelAr ?? "شنو بغيتي اليوم؟"}</h2>
          <p className="mt-1 text-[12px] text-muted-foreground">
            {isDirect ? "اضغط باش تبدا طلبك" : "اختار الخدمة اللي محتاج"}
          </p>
        </div>
        <KindMenu value={current?.slug ?? ""} onChange={selectKind} onOpen={() => setOpen(true)} />
      </div>

      <div className="grid grid-cols-2 gap-2.5 pt-3">
        {cats.length === 0 ? (
          <p className="col-span-2 rounded-2xl bg-muted/60 p-4 text-center text-[12px] text-muted-foreground">
            لا خدمات فهاد الخيار دابا — اختار خياراً آخر من الشريط.
          </p>
        ) : (
          cats.map((cat) => {
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
