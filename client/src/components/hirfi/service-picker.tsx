import { useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import { Link } from "wouter";
import { DragHandle } from "@/components/hirfi/map";
import { ErrorState } from "@/components/hirfi/primitives";
import { useCategories } from "@/lib/hooks";
import { categoryIcon, errorMessage } from "@/lib/format";
import { cn } from "@/lib/utils";

export function ServicePickerSheet({ className }: { className?: string }) {
  const categories = useCategories();
  const [open, setOpen] = useState(false);
  const startY = useRef<number | null>(null);

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
    else if (delta > 30) setOpen(false);
    else setOpen((value) => !value);
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
        className,
      )}
      style={{ transform: open ? "translateY(0)" : "translateY(calc(100% - 126px))" }}
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
          <h2 className="text-[19px] font-black">شنو بغيتي اليوم؟</h2>
          <p className="mt-1 text-[12px] text-muted-foreground">اضغط هنا باش تشوف الخدمات</p>
        </div>
        <span className="rounded-full bg-brand px-2.5 py-1 text-[10px] font-black text-brand-ink">
          {categories.data?.length ?? 15} خدمة
        </span>
      </div>

      {categories.isLoading ? (
        <div className="grid grid-cols-3 gap-2.5 pt-3">
          {Array.from({ length: 15 }).map((_, index) => (
            <div key={index} className="hirfi-skeleton min-h-28 rounded-[2.25rem]" />
          ))}
        </div>
      ) : categories.isError ? (
        <div className="pt-3">
          <ErrorState message={errorMessage(categories.error)} onRetry={() => void categories.refetch()} />
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2.5 pt-3">
          {(categories.data ?? []).map((category) => {
            const Icon = categoryIcon(category.icon);
            return (
              <Link
                key={category.id}
                href={`/requests/new?service=${category.slug}`}
                className="grid min-h-28 place-items-center rounded-[2.25rem] bg-muted/65 px-2 py-4 text-center transition-transform active:scale-[0.98]"
              >
                <Icon className="size-8 stroke-[1.8]" />
                <span className="mt-2 text-[13px] leading-tight font-black">{category.nameAr}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
