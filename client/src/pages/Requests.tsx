// ── طلباتي (الزبون): قائمة كاملة مع تصفية بالحالة ───────────────────────
import { useMemo, useState } from "react";
import { Link } from "wouter";
import { ClipboardList, Plus, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, ListSkeleton, PageHeader, Spinner } from "@/components/hirfi/primitives";
import { RequestCard } from "@/components/hirfi/cards";
import { trpc } from "@/_core/trpc";
import { cn } from "@/lib/utils";
import { errorMessage } from "@/lib/format";

const TABS = [
  { key: "all", label: "الكل" },
  { key: "open", label: "منشورة" },
  { key: "accepted", label: "مقبولة" },
  { key: "in_progress", label: "قيد التنفيذ" },
  { key: "completed", label: "منتهية" },
  { key: "cancelled", label: "ملغاة" },
] as const;

export default function Requests() {
  const q = trpc.requests.mine.useQuery();
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("all");

  const rows = useMemo(() => {
    const all = q.data ?? [];
    return tab === "all" ? all : all.filter((r) => r.status === tab);
  }, [q.data, tab]);

  const counts = useMemo(() => {
    const all = q.data ?? [];
    return {
      all: all.length,
      open: all.filter((r) => r.status === "open").length,
      accepted: all.filter((r) => r.status === "accepted").length,
      in_progress: all.filter((r) => r.status === "in_progress").length,
      completed: all.filter((r) => r.status === "completed").length,
      cancelled: all.filter((r) => r.status === "cancelled").length,
    } as Record<string, number>;
  }, [q.data]);

  return (
    <div className="grid gap-5">
      <PageHeader
        icon={ClipboardList}
        title="طلباتي"
        description="كل ما نشرته، وحالة كل طلب في دورة حياته من النشر إلى الإتمام."
        action={
          <Button asChild className="gap-1.5">
            <Link href="/requests/new">
              <Plus className="size-4" />
              طلب جديد
            </Link>
          </Button>
        }
      />

      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <Filter className="size-4 shrink-0 text-muted-foreground" />
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "border-brand bg-brand text-white"
                  : "border-border bg-card text-muted-foreground hover:border-brand/40 hover:text-foreground",
              )}
            >
              {t.label}
              <span
                className={cn(
                  "rounded-full px-1.5 text-[10px] font-bold",
                  active ? "bg-white/25" : "bg-muted",
                )}
              >
                {counts[t.key] ?? 0}
              </span>
            </button>
          );
        })}
      </div>

      {q.isLoading ? (
        <ListSkeleton count={4} />
      ) : q.isError ? (
        <ErrorState message={errorMessage(q.error)} onRetry={() => void q.refetch()} />
      ) : rows.length === 0 ? (
        (q.data ?? []).length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="لم تنشر أي طلب بعد"
            description="ابدأ بوصف ما تحتاجه: السباكة، الكهرباء، النجارة، الصباغة، التكييف، النقل… حدّد ميزانيتك المقترحة وسيتنافس الحرّافون القريبون على تنفيذه."
            actionLabel="انشر أول طلب"
            actionHref="/requests/new"
          />
        ) : (
          <EmptyState
            icon={ClipboardList}
            title={`لا طلبات بحالة «${TABS.find((t) => t.key === tab)?.label}»`}
            description="جرّب تبويباً آخر لعرض بقية طلباتك، أو انشر طلباً جديداً."
            actionLabel="عرض كل الطلبات"
            onAction={() => setTab("all")}
          />
        )
      ) : (
        <div className="grid gap-3">
          {rows.map((r) => (
            <RequestCard key={r.id} request={r} href={`/requests/${r.id}`} />
          ))}
        </div>
      )}

      {q.isFetching && !q.isLoading ? (
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Spinner className="size-3" />
          تحديث…
        </div>
      ) : null}
    </div>
  );
}
