// ── إدارة المستخدمين: بحث/تصفية، توثيق حرّاف، وحظر مؤقت بسبب إلزامي ──────────
import { useState } from "react";
import { Users, BadgeCheck, ShieldOff, ShieldCheck, Ban, RefreshCw, Briefcase, LockOpen } from "lucide-react";
import { AdminShell, DataTable, Tr, Td } from "@/components/hirfi/admin-shell";
import { TableSkeleton } from "@/components/hirfi/admin-skeleton";
import { SearchBox, FilterChips, ReasonDialog, UserTags } from "@/components/hirfi/admin-ui";
import { ErrorState, Badge } from "@/components/hirfi/primitives";
import { Button } from "@/components/ui/button";
import { trpc } from "@/_core/trpc";
import { toast } from "@/lib/toast";
import { formatMAD, timeAgoAr, errorMessage } from "@/lib/format";
import type { AppRole } from "@shared/constants";

type RoleFilter = AppRole | "admin" | "";

export default function AdminUsers() {
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<RoleFilter>("");
  const [verified, setVerified] = useState<boolean | undefined>(undefined);
  const [blocked, setBlocked] = useState<boolean | undefined>(undefined);

  const [pendingBlock, setPendingBlock] = useState<{ id: string; name: string; on: boolean } | null>(null);
  const [profRow, setProfRow] = useState<null | {
    id: string;
    name: string;
    kind: string | null;
  }>(null);

  const utils = trpc.useUtils();
  const q = trpc.admin.users.list.useQuery({
    search: search || undefined,
    role: role && role !== "admin" ? role : undefined,
    verified,
    blocked,
    limit: 100,
  });

  const setBlockedM = trpc.admin.users.setBlocked.useMutation({
    onSuccess: (_r, v) => {
      toast.success(v.blocked ? "أُوقف الحساب ومنع من الدخول" : "أُعيد تفعيل الحساب");
      utils.admin.users.list.invalidate();
      utils.admin.overview.invalidate();
      setPendingBlock(null);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const setVerifiedM = trpc.admin.users.setVerified.useMutation({
    onSuccess: (_r, v) => {
      toast.success(v.verified ? "مُنحت شارة التوثيق" : "أُزيلت شارة التوثيق");
      utils.admin.users.list.invalidate();
      utils.admin.overview.invalidate();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const setProfM = trpc.admin.users.setProfession.useMutation({
    onSuccess: (_r, v) => {
      toast.success(v.action === "clear" ? "فُتح اختيار المهنة من جديد" : "غُيّرت المهنة");
      utils.admin.users.list.invalidate();
      setProfRow(null);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const KIND_LABEL: Record<string, string> = {
    field: "ميدانية",
    digital: "مهام إنترنت",
    b2b: "شركات",
  };

  const rows = q.data ?? [];

  return (
    <AdminShell
      section="users"
      title="المستخدمون"
      description="كل الحسابات المسجّلة. التوثيق يمنح الحرّاف شارة الثقة، والحظر يمنعه من الدخول ومن العروض دون حذف أي بيانات."
      action={
        <Button variant="secondary" className="gap-1.5 rounded-xl" onClick={() => q.refetch()}>
          <RefreshCw className="size-4" /> تحديث
        </Button>
      }
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <SearchBox value={search} onChange={setSearch} placeholder="ابحث بالاسم أو البريد أو الهاتف…" className="w-full max-w-sm" />
        <FilterChips
          options={[
            { value: "", label: "الكل" },
            { value: "customer", label: "زبائن" },
            { value: "provider", label: "حرّافون" },
            { value: "admin", label: "إداريون" },
          ]}
          value={role}
          onChange={(v) => {
            setRole(v as RoleFilter);
            setVerified(undefined);
          }}
        />
        <FilterChips
          options={[
            { value: "", label: "الحالة: الكل" },
            { value: "verified", label: "موثّق" },
            { value: "unverified", label: "غير موثّق" },
            { value: "blocked", label: "موقوف" },
          ]}
          value={verified === undefined && blocked === undefined ? "" : blocked ? "blocked" : verified ? "verified" : "unverified"}
          onChange={(v) => {
            setBlocked(v === "blocked" ? true : undefined);
            setVerified(v === "verified" ? true : v === "unverified" ? false : undefined);
          }}
        />
      </div>

      {q.isLoading ? (
        <TableSkeleton rows={8} />
      ) : q.error ? (
        <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />
      ) : (
        <DataTable
          columns={["المستخدم", "الدور", "المهنة", "المدينة", "الرصيد", "النشاط", "التقييم", "إجراءات"]}
          empty={rows.length === 0}
        >
          {rows.map((u) => {
            const avg = u.ratingCount && u.ratingSum != null ? u.ratingSum / u.ratingCount : null;
            const isAdmin = u.authRole === "admin";
            return (
              <Tr key={u.id}>
                <Td>
                  <div className="flex flex-col gap-1">
                    <span className="font-bold">{u.displayName ?? u.email.split("@")[0]}</span>
                    <span className="text-[11px] text-muted-foreground">{u.email}</span>
                    {u.blockedReason ? (
                      <span className="text-[11px] text-destructive">سبب الإيقاف: {u.blockedReason}</span>
                    ) : null}
                  </div>
                </Td>
                <Td>
                  <UserTags role={u.role ?? u.authRole} isVerified={u.isVerified} blocked={!!u.blockedAt} />
                </Td>
                <Td>
                  {u.role === "provider" ? (
                    u.primaryKind ? (
                      <Badge tone="brand">{KIND_LABEL[u.primaryKind] ?? u.primaryKind}</Badge>
                    ) : (
                      <Badge tone="warn">ما اختارش</Badge>
                    )
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </Td>
                <Td className="text-muted-foreground">
                  {u.city ?? "—"}
                  {u.district ? <span className="block text-[11px]">{u.district}</span> : null}
                </Td>
                <Td>
                  <span className={u.balance < 0 ? "font-black text-destructive" : "font-bold"}>
                    {u.role === "provider" ? formatMAD(u.balance) : "—"}
                  </span>
                </Td>
                <Td className="text-muted-foreground">
                  <div className="flex flex-col gap-0.5 text-[11.5px]">
                    <span>{u.requestsCount} طلب · {u.offersCount} عرض</span>
                    {u.completedJobs ? <span>{u.completedJobs} عمل منتهٍ</span> : null}
                    <span>سُجّل {timeAgoAr(u.createdAt)}</span>
                  </div>
                </Td>
                <Td>
                  {avg !== null ? (
                    <Badge tone={avg >= 4 ? "success" : avg >= 3 ? "warn" : "danger"}>
                      {avg.toFixed(1)} ({u.ratingCount})
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </Td>
                <Td>
                  <div className="flex flex-wrap gap-1.5">
                    {u.role === "provider" && !isAdmin ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-7 gap-1 rounded-lg px-2 text-[11px]"
                        onClick={() => setProfRow({ id: u.id, name: u.displayName ?? u.email, kind: u.primaryKind ?? null })}
                      >
                        <Briefcase className="size-3" /> المهنة
                      </Button>
                    ) : null}
                    {u.role === "provider" && !isAdmin ? (
                      <Button
                        size="sm"
                        variant={u.isVerified ? "ghost" : "default"}
                        className="h-7 gap-1 rounded-lg px-2 text-[11px]"
                        disabled={setVerifiedM.isPending}
                        onClick={() => setVerifiedM.mutate({ userId: u.id, verified: !u.isVerified })}
                      >
                        {u.isVerified ? <ShieldOff className="size-3" /> : <BadgeCheck className="size-3" />}
                        {u.isVerified ? "إلغاء التوثيق" : "توثيق"}
                      </Button>
                    ) : null}
                    {!isAdmin ? (
                      u.blockedAt ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-7 gap-1 rounded-lg px-2 text-[11px]"
                          disabled={setBlockedM.isPending}
                          onClick={() => setPendingBlock({ id: u.id, name: u.displayName ?? u.email, on: false })}
                        >
                          <ShieldCheck className="size-3" /> إعادة تفعيل
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-7 gap-1 rounded-lg px-2 text-[11px]"
                          disabled={setBlockedM.isPending}
                          onClick={() => setPendingBlock({ id: u.id, name: u.displayName ?? u.email, on: true })}
                        >
                          <Ban className="size-3" /> حظر
                        </Button>
                      )
                    ) : (
                      <span className="text-[11px] text-muted-foreground">—</span>
                    )}
                  </div>
                </Td>
              </Tr>
            );
          })}
        </DataTable>
      )}

      <p className="mt-3 flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
        <Users className="size-3.5" /> {rows.length} حساب معروض (بحدّ 100).
      </p>

      {profRow ? (
        <ProfessionDialog
          row={profRow}
          busy={setProfM.isPending}
          onCancel={() => setProfRow(null)}
          onConfirm={(action, kind) => setProfM.mutate({ userId: profRow.id, action, kind })}
        />
      ) : null}

      <ReasonDialog
        open={!!pendingBlock}
        busy={setBlockedM.isPending}
        title={pendingBlock?.on ? "حظر الحساب مؤقتاً" : "إعادة تفعيل الحساب"}
        description={
          pendingBlock?.on
            ? `سيُمنع «${pendingBlock?.name}» من الدخول ومن إنشاء الطلبات/العروض. لا تُحذف أي بيانات.`
            : `سيعود «${pendingBlock?.name}» للعمل بشكل طبيعي.`
        }
        confirmLabel={pendingBlock?.on ? "حظر" : "إعادة تفعيل"}
        minLength={pendingBlock?.on ? 4 : 2}
        onCancel={() => setPendingBlock(null)}
        onConfirm={(reason) =>
          pendingBlock && setBlockedM.mutate({ userId: pendingBlock.id, blocked: pendingBlock.on, reason })
        }
      />
    </AdminShell>
  );
}

// ── إدارة مهنة الحرّاف: فكّ القفل أو تبديل النوع مباشرة ─────────────────────────
function ProfessionDialog({
  row,
  busy,
  onCancel,
  onConfirm,
}: {
  row: { id: string; name: string; kind: string | null };
  busy: boolean;
  onCancel: () => void;
  onConfirm: (action: "clear" | "setKind", kind: "field" | "digital" | "b2b" | null) => void;
}) {
  const [mode, setMode] = useState<"clear" | "setKind">("clear");
  const [kind, setKind] = useState<"field" | "digital" | "b2b">(
    (row.kind as "field" | "digital" | "b2b") ?? "field",
  );

  const KIND_LABEL: Record<string, string> = {
    field: "خدمات ميدانية",
    digital: "مهام إنترنت",
    b2b: "خدمات الشركات",
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal>
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-xl">
        <h2 className="flex items-center gap-1.5 text-[16px] font-black">
          <Briefcase className="size-4 text-brand-dark" /> مهنة الحرّاف
        </h2>
        <p className="mt-1 text-[12.5px] leading-snug text-muted-foreground">
          <b>{row.name}</b> — المهنة الحالية:{" "}
          <b>{row.kind ? KIND_LABEL[row.kind] ?? row.kind : "ما اختارش"}</b>.
        </p>

        <div className="mt-4 grid gap-2">
          <button
            type="button"
            onClick={() => setMode("clear")}
            className={cnBox(mode === "clear")}
          >
            <LockOpen className="size-4" /> فكّ القفل — يختار من جديد
          </button>
          <button
            type="button"
            onClick={() => setMode("setKind")}
            className={cnBox(mode === "setKind")}
          >
            <Briefcase className="size-4" /> تبديل مباشر لنوع محدّد
          </button>
        </div>

        {mode === "setKind" ? (
          <div className="mt-3 grid grid-cols-3 gap-2">
            {(["field", "digital", "b2b"] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={cnBox(kind === k)}
              >
                {KIND_LABEL[k]}
              </button>
            ))}
          </div>
        ) : null}

        <p className="mt-3 rounded-xl bg-muted px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
          {mode === "clear"
            ? "غادي تمسح المهنة، وتظهر للحرّاف نافذة الاختيار من جديد."
            : "غادي تتبدّل المهنة فوراً بلا نافذة اختيار."}
        </p>

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" className="rounded-xl" onClick={onCancel} disabled={busy}>
            إلغاء
          </Button>
          <Button
            variant="default"
            className="rounded-xl"
            disabled={busy}
            onClick={() => onConfirm(mode, mode === "setKind" ? kind : null)}
          >
            {busy ? "…" : "تأكيد"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function cnBox(active: boolean) {
  return [
    "flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-[12px] font-bold transition-colors",
    active ? "border-brand bg-brand/15 text-brand-dark" : "border-border bg-card text-muted-foreground hover:bg-muted",
  ].join(" ");
}
