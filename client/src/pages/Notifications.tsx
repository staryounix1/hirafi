// ── الإشعارات: داخل التطبيق فقط (لا بريد ولا Push في هذا النطاق) ──────────────────
import { useMemo, useState } from "react";
import { Link } from "wouter";
import {
  Bell,
  BellRing,
  Check,
  CheckCheck,
  Send,
  CircleDollarSign,
  MessageSquare,
  Star,
  Info,
  CircleCheck,
  XCircle,
  ArrowDownToLine,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Badge,
  Chip,
  EmptyState,
  ErrorState,
  ListSkeleton,
  PageHeader,
  Spinner,
} from "@/components/hirfi/primitives";
import { trpc } from "@/_core/trpc";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { errorMessage, timeAgoAr } from "@/lib/format";

/** نوع الإشعار ← أيقونة + لون، بحسب ما يكتبه الخادم في notifications.type. */
const TYPE_META: Record<
  string,
  { label: string; tone: "brand" | "teal" | "success" | "warn" | "danger" | "muted" | "info"; icon: typeof Bell }
> = {
  offer: { label: "عرض جديد", tone: "brand", icon: Send },
  counter: { label: "عرض مضاد", tone: "warn", icon: CircleDollarSign },
  accepted: { label: "قبول", tone: "success", icon: CircleCheck },
  rejected: { label: "اعتذار عن عرض", tone: "muted", icon: XCircle },
  message: { label: "رسالة", tone: "info", icon: MessageSquare },
  review: { label: "تقييم", tone: "warn", icon: Star },
  status: { label: "حالة الطلب", tone: "teal", icon: Info },
  completed: { label: "إتمام", tone: "success", icon: CircleCheck },
  payout: { label: "سحب", tone: "teal", icon: ArrowDownToLine },
};

export default function Notifications() {
  const q = trpc.notifications.list.useQuery();
  const utils = trpc.useUtils();
  const markRead = trpc.notifications.markRead.useMutation();
  const markAll = trpc.notifications.markAllRead.useMutation();
  const [onlyUnread, setOnlyUnread] = useState(false);

  const rows = q.data?.rows ?? [];
  const unread = q.data?.unread ?? 0;
  const shown = useMemo(() => (onlyUnread ? rows.filter((r) => !r.isRead) : rows), [rows, onlyUnread]);

  async function readOne(id: string) {
    try {
      await markRead.mutateAsync({ id });
      await utils.invalidate();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  async function readAll() {
    try {
      await markAll.mutateAsync();
      await utils.invalidate();
      toast.success("عُلّمت كل الإشعارات كمقروءة");
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  return (
    <div className="grid">
      <PageHeader
        icon={BellRing}
        title="الإشعارات"
        description="كل ما يحدث على طلباتك وعروضك في مكان واحد: عرض جديد، عرض مضاد، قبول، رسالة، تقييم، أو إتمام."
        action={
          unread > 0 ? (
            <Button size="sm" variant="outline" className="gap-1.5 rounded-full" disabled={markAll.isPending} onClick={() => void readAll()}>
              {markAll.isPending ? <Spinner /> : <CheckCheck className="size-3.5" />}
              علّم الكل
            </Button>
          ) : null
        }
      />

      {/* فلتر بسيط */}
      <div className="scrollbar-none mt-4 flex gap-2 overflow-x-auto px-4 pb-1">
        <Chip active={!onlyUnread} onClick={() => setOnlyUnread(false)}>
          الكل
          <span className={cn("rounded-full px-1.5 text-[10px] font-black", !onlyUnread ? "bg-background/25" : "bg-background")}>
            {rows.length}
          </span>
        </Chip>
        <Chip
          active={onlyUnread}
          icon={Bell}
          onClick={() => setOnlyUnread(true)}
        >
          غير المقروء
          {unread > 0 ? (
            <span className={cn("rounded-full px-1.5 text-[10px] font-black", onlyUnread ? "bg-background/25" : "bg-brand text-brand-ink")}>
              {unread}
            </span>
          ) : null}
        </Chip>
      </div>

      <div className="grid gap-2.5 px-4 pt-3 pb-6">
        {q.isLoading ? (
          <ListSkeleton count={5} lines={2} />
        ) : q.isError ? (
          <ErrorState message={errorMessage(q.error)} onRetry={() => void q.refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="لا إشعارات بعد"
            description="أول ما ينشر زبون طلباً أو يقدّم حرف عرضاً على طلبك، سيظهر الإشعار هنا مع رابط مباشر إلى الطلب."
            actionLabel="عُد إلى لوحة التحكم"
            actionHref="/dashboard"
          />
        ) : shown.length === 0 ? (
          <EmptyState
            icon={CheckCheck}
            title="لا إشعارات غير مقروءة"
            description="قرأت كل شيء — أحسنت. أزل الفلتر لعرض السجل الكامل."
            actionLabel="اعرض الكل"
            onAction={() => setOnlyUnread(false)}
          />
        ) : (
          <div className="grid gap-2.5">
            {shown.map((n) => {
              const meta = TYPE_META[n.type] ?? { label: n.type, tone: "muted" as const, icon: Bell };
              const Icon = meta.icon;
              const body = (
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      "grid size-10 shrink-0 place-items-center rounded-2xl",
                      n.isRead ? "bg-muted text-muted-foreground" : "bg-brand text-brand-ink",
                    )}
                  >
                    <Icon className="size-4.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <b className={cn("text-[13.5px] leading-snug", !n.isRead && "text-brand-dark")}>
                        {n.title}
                      </b>
                      {!n.isRead ? (
                        <span className="mt-1.5 size-2 shrink-0 rounded-full bg-brand" aria-label="غير مقروء" />
                      ) : null}
                    </div>
                    <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{n.body}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge tone={meta.tone}>{meta.label}</Badge>
                      <span className="text-[10.5px] text-muted-foreground">{timeAgoAr(n.createdAt)}</span>
                    </div>
                  </div>
                </div>
              );

              return (
                <article
                  key={n.id}
                  className={cn("card-flat p-3.5", !n.isRead && "ring-1 ring-brand/30")}
                >
                  {n.requestId ? (
                    <Link
                      href={`/requests/${n.requestId}`}
                      className="block"
                      onClick={() => {
                        if (!n.isRead) void readOne(n.id);
                      }}
                    >
                      {body}
                    </Link>
                  ) : (
                    body
                  )}

                  {!n.isRead ? (
                    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-1.5 rounded-full"
                        disabled={markRead.isPending}
                        onClick={() => void readOne(n.id)}
                      >
                        {markRead.isPending ? <Spinner /> : <Check className="size-3.5" />}
                        علّم كمقروء
                      </Button>
                      {n.requestId ? (
                        <Button asChild size="sm" variant="ghost" className="gap-1.5 rounded-full">
                          <Link href={`/requests/${n.requestId}`}>افتح الطلب</Link>
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
