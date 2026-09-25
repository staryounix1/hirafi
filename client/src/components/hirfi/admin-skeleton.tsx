// ── هيكل تحميل صفوف للجداول الإدارية (لا يوجد TableSkeleton في primitives) ──
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="hirfi-skeleton h-11 border-b border-border/60 last:border-0"
          style={{ opacity: 1 - i * 0.12 }}
        />
      ))}
    </div>
  );
}
