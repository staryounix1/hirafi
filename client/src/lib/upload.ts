// ── رفع صورة: رابط موقّع ← PUT مباشر من المتصفح ← تثبيت في السجل ──────────────
// ثلاث خطوات لا رابعة: `_core/storage` يوقّع، والمتصفح يرفع، والـ commit يسجّل
// الملف كارتِفاكت. لا تمرّ الصورة عبر خادم التطبيق.
import { trpc } from "@/_core/trpc";

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED = ["image/png", "image/jpeg", "image/webp"];

export interface UploadedImage {
  key: string;
  url: string;
  name: string;
}

export function validateImage(file: File): string | null {
  if (!ACCEPTED.includes(file.type)) return "صيغة غير مدعومة — استعمل PNG أو JPEG أو WebP";
  if (file.size > MAX_BYTES) return "حجم الصورة يتجاوز 5 ميغابايت";
  return null;
}

/** خطّاف يعيد دالة رفع واحدة تُعيد `{key,url,name}` أو ترفع خطأً مقروءاً. */
export function useImageUpload() {
  const uploadUrl = trpc.files.uploadUrl.useMutation();
  const commit = trpc.files.commit.useMutation();

  async function upload(file: File): Promise<UploadedImage> {
    const invalid = validateImage(file);
    if (invalid) throw new Error(invalid);

    const { uploadUrl: signed, key, publicPath } = await uploadUrl.mutateAsync({
      name: file.name,
      contentType: file.type,
    });

    const res = await fetch(signed, {
      method: "PUT",
      body: file,
      headers: { "Content-Type": file.type },
    });
    if (!res.ok) throw new Error("فشل رفع الصورة — تحقّق من الاتصال وأعد المحاولة");

    // التثبيت يسجّل الملف كارتِفاكت (ويقرأ الحجم/النوع من التخزين لا من المتصفح).
    await commit.mutateAsync({ key, name: file.name });
    // الرابط القابل للعرض هو مسار التطبيق نفسه، ولا يحتاج توقيعاً للقراءة.
    return { key, url: publicPath, name: file.name };
  }

  return { upload, isUploading: uploadUrl.isPending || commit.isPending };
}
