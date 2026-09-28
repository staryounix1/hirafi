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
  /** "" = شبكة التصنيفات؛ وإلا slug التصنيف المفتوح. */
  const [key, setKey] = useState<string>("");
  const startY = useRef<number | null>(null);
  const [, navigate] = useLocation();
  const q = useHomeMenu();

  const items = (q.data ?? []) as MenuItem[];
  const current = key ? items.find((i) => i.slug === key) : undefined;
  const cats = resolveItemCats(current);
  const isDirect = Boolean(current && !current.kindFilter && !current.subSlugs);

  function closeSheet() {
    setOpen(false);
    setKey("");
  }

  /** كليك على بطاقة تصنيف: فئة واحدة → توجيه مباشر؛ تصنيف → فتح مهنه. */
  function openItem(item: MenuItem) {
    if (!item.kindFilter && !item.subSlugs) {
      if (CATALOG_BY_SLUG.get(item.slug)) return void navigate(`/requests/new?service=${item.slug}`);
      return void navigate("/requests/new");
    }
    setKey(item.slug);
    setOpen(true);
  }

  function goBackToCategories() {
    setKey("");
  }

  function selectKind(next: MenuItem) {
    openItem(next);
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
        <div className="min-w-0">
          <h2 className="truncate text-[19px] font-black">
            {current ? current.labelAr : "شنو بغيتي اليوم؟"}
          </h2>
          <p className="mt-1 text-[12px] text-muted-foreground">
            {current ? (isDirect ? "اضغط باش تبدا طلبك" : "اختار المهنة اللي محتاج") : "اختار التصنيف اللي محتاج"}
          </p>
        </div>
        {current ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              goBackToCategories();
            }}
            className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-[10px] font-black text-foreground"
          >
            كل التصنيفات
          </button>
        ) : (
          <KindMenu value="" onChange={selectKind} onOpen={() => setOpen(true)} className="hidden" />
        )}
      </div>

      {/* الشبكة: التصنيفات أولاً، ثم مهن التصنيف المفتوح */}
      {!current ? (
        <div className="grid grid-cols-2 gap-2.5 pt-3">
          {items.map((item) => {
            const Icon = categoryIcon(item.icon ?? "");
            const count = resolveItemCats(item).length;
            return (
              <button
                key={item.id}
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  openItem(item);
                }}
                className="group rounded-3xl bg-muted/65 p-3.5 text-start transition-transform active:scale-[0.98]"
              >
                <span className="grid size-10 place-items-center rounded-2xl bg-brand text-brand-ink transition-transform group-hover:scale-105">
                  <Icon className="size-5" />
                </span>
                <h3 className="mt-3 text-[13px] font-black">{item.labelAr}</h3>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {count > 0 ? `${count} مهنة` : "خدمة مباشرة"}
                </p>
              </button>
            );
          })}
          {items.length === 0 ? (
            <p className="col-span-2 rounded-2xl bg-muted/60 p-4 text-center text-[12px] text-muted-foreground">
              لا تصنيفات بعد — زيدها من لوحة الإدارة ← خدمات الواجهة.
            </p>
          ) : null}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5 pt-3">
          {cats.length === 0 ? (
            <p className="col-span-2 rounded-2xl bg-muted/60 p-4 text-center text-[12px] text-muted-foreground">
              لا مهن فهاد التصنيف دابا — رجع واختار تصنيفاً آخر.
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
      )}
    </div>
  );
}
