// ── اختيار المهنة: أول اختيار = المهنة الدائمة ─────────────────────────────────
// الحرّاف الجديد كيختار نوع خدمتو (ميداني / مهام إنترنت / شركات) مرة واحدة.
// الاختيار كيتقفل فالقاعدة — ما كيتبدّلش. منّو كيتحدّد شنو كيشوف فالمنصة.
import { useState } from "react";
import { AlertTriangle, Building2, Infinity as InfinityIcon, Laptop, Wrench } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/_core/trpc";
import { toast } from "@/lib/toast";
import { errorMessage } from "@/lib/format";
import { SERVICE_KINDS, SERVICE_KIND_META, type ServiceKind } from "@shared/constants";
import { cn } from "@/lib/utils";

const ICONS: Record<ServiceKind, LucideIcon> = {
  field: Wrench,
  digital: Laptop,
  b2b: Building2,
};

export function ProfessionLock() {
  const q = trpc.profile.me.useQuery(undefined, { staleTime: 5_000 });
  const lock = trpc.profile.lockProfession.useMutation();
  const utils = trpc.useUtils();
  const [picked, setPicked] = useState<ServiceKind | null>(null);
  const [confirming, setConfirming] = useState(false);

  if (q.isLoading || !q.data) return null;
  if (q.data.profile.role !== "provider") return null;
  // الحرّاف اللي اختار من قبل ما بقى ما يشوف هاد الشاشة.
  if (q.data.professionLocked) return null;

  async function confirm() {
    if (!picked) return;
    try {
      await lock.mutateAsync({ kind: picked });
      await utils.profile.me.invalidate();
      await utils.invalidate();
      toast.success("تثبّتت مهنتك — دابا كتشوف غير خدمات نوعك");
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  return (
    <div
      className="fixed inset-0 z-[95] grid place-items-center bg-black/60 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label="اختيار المهنة"
    >
      <div className="card-flat max-h-[92svh] w-full max-w-md overflow-y-auto p-4">
        <h2 className="text-[17px] font-black">شنو هي مهنتك؟</h2>
        <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
          اختار نوع خدمتك. <b className="text-foreground">الاختيار نهائي وما كيتبدّلش</b> — منّو كيتحدّد
          شنو غادي تشوف فالتطبيق.
        </p>

        <div className="mt-3 grid gap-2.5">
          {SERVICE_KINDS.map((k) => {
            const meta = SERVICE_KIND_META[k];
            const Icon = ICONS[k];
            const on = picked === k;
            return (
              <button
                key={k}
                type="button"
                onClick={() => {
                  setPicked(k);
                  setConfirming(false);
                }}
                className={cn(
                  "flex items-start gap-3 rounded-2xl border p-3.5 text-start transition-colors",
                  on ? "border-brand bg-brand/10" : "border-border bg-card active:bg-muted",
                )}
              >
                <span
                  className={cn(
                    "grid size-11 shrink-0 place-items-center rounded-2xl",
                    on ? "bg-brand text-brand-ink" : "bg-muted text-muted-foreground",
                  )}
                >
                  <Icon className="size-5" />
                </span>
                <span className="min-w-0">
                  <b className="block text-[14px]">{meta.labelAr}</b>
                  <span className="mt-0.5 block text-[11.5px] leading-relaxed text-muted-foreground">
                    {meta.hintAr}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        {picked && !confirming ? (
          <Button
            className="mt-4 w-full gap-2 rounded-2xl"
            onClick={() => setConfirming(true)}
            disabled={lock.isPending}
          >
            متابعة
          </Button>
        ) : null}

        {picked && confirming ? (
          <div className="mt-4 rounded-2xl border border-warn/30 bg-warn-soft p-3.5">
            <h3 className="flex items-center gap-1.5 text-[13px] font-black text-warn">
              <AlertTriangle className="size-4" />
              أكّد: «{SERVICE_KIND_META[picked].labelAr}» هي مهنتك النهائية
            </h3>
            <p className="mt-1 text-[11.5px] leading-relaxed text-muted-foreground">
              من بعد التأكيد ما غاديش تقدر تبدّلها، وغادي تشوف غير الخدمات والطلبات ديال داك النوع.
            </p>
            <div className="mt-3 flex gap-2">
              <Button
                className="flex-1 gap-2 rounded-2xl"
                onClick={() => void confirm()}
                disabled={lock.isPending}
              >
                <InfinityIcon className="size-4" />
                نعم، ثبّتها
              </Button>
              <Button
                variant="outline"
                className="flex-1 rounded-2xl"
                onClick={() => setConfirming(false)}
                disabled={lock.isPending}
              >
                رجوع
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
