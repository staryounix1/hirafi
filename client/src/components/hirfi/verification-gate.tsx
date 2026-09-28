// ── تفعيل حساب الحرّاف: نافذة إلزامية ─────────────────────────────────────────
// قرار المنتج: **أي** حرّاف غير موثّق (isVerified=false) ما كيقدرش يستعمل المنصة.
// النافذة كتغطّي التطبيق كامل، بلا زر إغلاق وبلا كليك برّا — الحيد الوحيد هو
// موافقة الإدارة. الرفع كيمرّ عبر files.uploadUrl/commit الموجودين.
import { useRef, useState } from "react";
import { Link } from "wouter";
import {
  BadgeCheck,
  Camera,
  CreditCard,
  FileUp,
  IdCard,
  Loader2,
  ShieldAlert,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useImageUpload } from "@/lib/upload";
import { trpc } from "@/_core/trpc";
import { toast } from "@/lib/toast";
import { errorMessage } from "@/lib/format";

type DocKey = "idFront" | "idBack" | "license" | "selfie";

interface Doc {
  key: string;
  url: string;
  name: string;
}

const DOC_LABELS: Record<DocKey, string> = {
  idFront: "البطاقة الوطنية — الوجه",
  idBack: "البطاقة الوطنية — الظهر",
  license: "رخصة السياقة",
  selfie: "صورة سيلفي مع البطاقة",
};

/** خانة وثيقة واحدة: رفع من الملفات أو التقاط صورة بالكاميرا. */
function DocSlot({
  docKey,
  required,
  value,
  onChange,
}: {
  docKey: DocKey;
  required: boolean;
  value: Doc | null;
  onChange: (d: Doc | null) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);
  const { upload, isUploading } = useImageUpload();
  const [busy, setBusy] = useState(false);

  async function handle(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      const res = await upload(file);
      onChange(res);
      toast.success("رُفعت الوثيقة");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
      if (camRef.current) camRef.current.value = "";
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[12.5px] font-black">
          {DOC_LABELS[docKey]}
          {required ? <span className="text-destructive"> *</span> : null}
        </span>
        {value ? <BadgeCheck className="size-4 text-teal" /> : null}
      </div>

      {value ? (
        <div className="mt-2 flex items-center gap-2">
          <img src={value.url} alt="" className="size-14 rounded-xl object-cover ring-1 ring-border" />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[11px] font-bold text-muted-foreground"
          >
            <X className="size-3" /> حيّد
          </button>
        </div>
      ) : (
        <div className="mt-2 flex gap-2" dir="ltr">
          <button
            type="button"
            disabled={busy || isUploading}
            onClick={() => fileRef.current?.click()}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-muted px-3 py-2.5 text-[12px] font-bold disabled:opacity-50"
          >
            {busy ? <Loader2 className="size-3.5 animate-spin" /> : <FileUp className="size-3.5" />}
            من الملفات
          </button>
          <button
            type="button"
            disabled={busy || isUploading}
            onClick={() => camRef.current?.click()}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-muted px-3 py-2.5 text-[12px] font-bold disabled:opacity-50"
          >
            <Camera className="size-3.5" />
            صوّر
          </button>
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => void handle(e.target.files?.[0])}
      />
      <input
        ref={camRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => void handle(e.target.files?.[0])}
      />
    </div>
  );
}

export function VerificationGate() {
  const { data, isLoading } = trpc.profile.me.useQuery(undefined, { staleTime: 5_000 });
  const submit = trpc.profile.submitVerification.useMutation();
  const utils = trpc.useUtils();

  const [docs, setDocs] = useState<Record<DocKey, Doc | null>>({
    idFront: null,
    idBack: null,
    license: null,
    selfie: null,
  });
  const [driver, setDriver] = useState(false);

  // ما كتعرضش والو إلا: تحمّل، زبون، ولا حرّاف موثّق.
  if (isLoading || !data) return null;
  if (data.profile.role !== "provider") return null;
  if (data.profile.isVerified) return null;

  // الحرّاف سائق (كيقدر يعرض على النقل والتوصيل) → الرخصة إلزامية.
  const requiresLicense = data.requiresLicense || driver;
  const status = data.verification?.status ?? data.profile.verificationStatus;
  const rejected = status === "rejected";
  const pending = status === "pending";

  const ready =
    docs.idFront && docs.idBack && docs.selfie && (!requiresLicense || docs.license);

  async function send() {
    if (!docs.idFront || !docs.idBack || !docs.selfie) {
      toast.error("خاصك ترفع البطاقة (وجه + ظهر) وصورة سيلفي مع البطاقة");
      return;
    }
    if (requiresLicense && !docs.license) {
      toast.error("رخصة السياقة إلزامية — ارفعها باش نكمّلو التفعيل");
      return;
    }
    try {
      await submit.mutateAsync({
        idFrontKey: docs.idFront.key,
        idFrontUrl: docs.idFront.url,
        idBackKey: docs.idBack.key,
        idBackUrl: docs.idBack.url,
        selfieKey: docs.selfie.key,
        selfieUrl: docs.selfie.url,
        licenseKey: docs.license?.key ?? null,
        licenseUrl: docs.license?.url ?? null,
      });
      await utils.profile.me.invalidate();
      toast.success("توصل بطلبك — الإدارة غادي تراجع الوثائق");
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-black/60 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label="تفعيل الحساب"
    >
      <div className="card-flat max-h-[92svh] w-full max-w-md overflow-y-auto p-4">
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-warn/15 text-warn">
            <ShieldAlert className="size-5" />
          </span>
          <div className="min-w-0">
            <h2 className="text-[16px] font-black">{pending ? "طلبك قيد المراجعة" : "فعّل حسابك"}</h2>
            <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
              {pending
                ? "توصلنا بوثائقك والإدارة كتراجعها. ما تقدرش تستعمل المنصة حتى تتم الموافقة."
                : "حساب الحرّاف خاصو تفعيل قبل استعمال المنصة. ارفع الوثائق والإدارة غادي توافق."}
            </p>
          </div>
        </div>

        {rejected && data.verification?.adminNote ? (
          <div className="mt-3 rounded-2xl border border-destructive/25 bg-destructive/8 p-3 text-[12px] text-destructive">
            سبب الرفض: {data.verification.adminNote}
          </div>
        ) : null}

        <div className="mt-3 grid gap-2.5">
          <DocSlot docKey="idFront" required value={docs.idFront} onChange={(d) => setDocs((s) => ({ ...s, idFront: d }))} />
          <DocSlot docKey="idBack" required value={docs.idBack} onChange={(d) => setDocs((s) => ({ ...s, idBack: d }))} />
          <DocSlot docKey="selfie" required value={docs.selfie} onChange={(d) => setDocs((s) => ({ ...s, selfie: d }))} />

          <label className="flex items-center gap-2.5 rounded-2xl border border-border bg-card p-3">
            <input
              type="checkbox"
              checked={requiresLicense}
              disabled={data.requiresLicense}
              onChange={(e) => setDriver(e.target.checked)}
              className="size-4 accent-[color:var(--brand)]"
            />
            <span className="text-[12.5px] font-bold">أنا سائق (نقل، توصيل، مناديب)</span>
          </label>

          {requiresLicense ? (
            <DocSlot docKey="license" required value={docs.license} onChange={(d) => setDocs((s) => ({ ...s, license: d }))} />
          ) : null}
        </div>

        <Button
          className="mt-4 w-full gap-2 rounded-2xl"
          disabled={!ready || submit.isPending}
          onClick={() => void send()}
        >
          {submit.isPending ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          {rejected || pending ? "أعد إرسال الوثائق" : "أرسل طلب التفعيل"}
        </Button>

        <p className="mt-2.5 flex items-center justify-center gap-1.5 text-center text-[11px] text-muted-foreground">
          <CreditCard className="size-3.5" />
          وثائقك كتشفّط غير للإدارة وما كتّعرضش للزبناء.
        </p>
        <p className="mt-1 flex items-center justify-center gap-1.5 text-center text-[11px] text-muted-foreground">
          <IdCard className="size-3.5" />
          إلا بغيتي تبدّل مهاراتك لاحقاً، <Link href="/profile" className="font-bold underline">سير لحسابي</Link>.
        </p>
      </div>
    </div>
  );
}
