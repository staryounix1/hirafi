// ── زر و نموذج التبليغ (من المستخدم العادي) ──────────────────────────────────
// يُستعمل في صفحة الطلب (تبليغ عن طلب) وفي الملف العام (تبليغ عن مستخدم).
// الإرسال يمرّ عبر reports.create، والبلاغات تصل للمشرف في لوحة الإدارة.
import { useState } from "react";
import { Flag, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/_core/trpc";
import { toast } from "@/lib/toast";
import { errorMessage } from "@/lib/format";
import { cn } from "@/lib/utils";

const CATEGORIES: { value: ReportCategory; label: string }[] = [
  { value: "no_show", label: "عدم حضور / تأخّر" },
  { value: "fraud", label: "غش أو نصب" },
  { value: "abuse", label: "تعامل سيئ أو إساءة" },
  { value: "quality", label: "رداءة الخدمة" },
  { value: "spam", label: "إزعاج أو رسائل متكررة" },
  { value: "other", label: "سبب آخر" },
];

type ReportCategory = "no_show" | "fraud" | "abuse" | "quality" | "spam" | "other";

export function ReportButton({
  targetType,
  targetUserId,
  requestId,
  label = "تبليغ",
  className,
}: {
  targetType: "user" | "request";
  targetUserId?: string;
  requestId?: string;
  label?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-[11.5px] font-bold text-muted-foreground transition-colors hover:border-destructive/40 hover:bg-destructive/8 hover:text-destructive",
          className,
        )}
      >
        <Flag className="size-3.5" />
        {label}
      </button>
      {open ? (
        <ReportDialog
          targetType={targetType}
          targetUserId={targetUserId}
          requestId={requestId}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

function ReportDialog({
  targetType,
  targetUserId,
  requestId,
  onClose,
}: {
  targetType: "user" | "request";
  targetUserId?: string;
  requestId?: string;
  onClose: () => void;
}) {
  const [category, setCategory] = useState<ReportCategory>("other");
  const [body, setBody] = useState("");
  const utils = trpc.useUtils();
  const m = trpc.reports.create.useMutation({
    onSuccess: () => {
      toast.success("وصل بلاغك للإدارة. سنراجعه قريباً.");
      utils.reports.mine.invalidate();
      onClose();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const valid = body.trim().length >= 10;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal>
      <div className="w-full max-w-md rounded-2xl border border-border bg-background p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-destructive/12 text-destructive">
              <Flag className="size-4.5" />
            </span>
            <div>
              <h2 className="text-[16px] font-black">
                {targetType === "request" ? "التبليغ عن هذا الطلب" : "التبليغ عن هذا المستخدم"}
              </h2>
              <p className="mt-1 text-[12px] leading-snug text-muted-foreground">
                بلاغك يصل للمشرفين سرّاً. لا يظهر لصاحب الطلب أو المستخدم.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-muted"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-4">
          <span className="text-[11px] font-bold text-muted-foreground">نوع المشكلة</span>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {CATEGORIES.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setCategory(c.value)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-[11.5px] font-bold transition-colors",
                  category === c.value ? "bg-brand text-brand-ink" : "bg-muted text-muted-foreground hover:text-foreground",
                )}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <label className="mt-3 block">
          <span className="text-[11px] font-bold text-muted-foreground">التفاصيل (10 أحرف على الأقل)</span>
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            placeholder="اشرح المشكلة: شنو وقع، وإمتى…"
            className="mt-1.5 rounded-xl text-[13px]"
          />
        </label>

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" className="rounded-xl" onClick={onClose} disabled={m.isPending}>
            إلغاء
          </Button>
          <Button
            variant="destructive"
            className="gap-1.5 rounded-xl"
            disabled={!valid || m.isPending}
            onClick={() =>
              m.mutate({
                targetType,
                targetUserId: targetType === "user" ? targetUserId : null,
                requestId: targetType === "request" ? requestId : null,
                category,
                body: body.trim(),
              })
            }
          >
            {m.isPending ? <Loader2 className="size-4 animate-spin" /> : <Flag className="size-4" />}
            إرسال البلاغ
          </Button>
        </div>
      </div>
    </div>
  );
}
