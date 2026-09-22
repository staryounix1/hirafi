// ── طلباتي (الزبون): قائمة كاملة مع تصفية بالحالة ────────────────────────────────
import { useMemo, useState } from "react";
import { Link } from "wouter";
import { ClipboardList, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Chip,
  EmptyState,
  ErrorState,
  ListSkeleton,
  PageHeader,
  Spinner,
} from "@/components/hirfi/primitives";
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
    <div className="grid">
      <PageHeader
        icon={ClipboardList}
        title="طلباتي"
        description="كل ما نشرته، وحالة كل طلب في دورته من النشر إلى الإتمام."
        action={
          <Button asChild size="icon" className="rounded-full" aria-label="طلب جديد">
            <Link href="/requests/new">
              <Plus className="size-5" />
            </Link>
          </Button>
        }
      />

      {/* تبويبات الحالة — شريط أفقي قابل للسحب كما في inDrive */}
      <div className="scrollbar-none mt-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <Chip key={t.key} active={active} onClick={() => setTab(t.key)}>
              {t.label}
              <span
                className={cn(
                  "rounded-full px-1.5 text-[10px] font-black",
                  active ? "bg-background/25" : "bg-background",
                )}
              >
                {counts[t.key] ?? 0}
              </span>
            </Chip>
          );
        })}
      </div>

      <div className="grid gap-3 px-4 pt-3 pb-6">
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
    </div>
  );
}
