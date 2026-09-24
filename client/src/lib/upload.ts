// ── رفع وسائط: رابط موقّع ← PUT مباشر من المتصفح ← تثبيت في السجل ──────────────
import { trpc } from "@/_core/trpc";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
const ACCEPTED_IMAGES = ["image/png", "image/jpeg", "image/webp"];
const ACCEPTED_VIDEOS = ["video/mp4", "video/webm", "video/quicktime"];

export interface UploadedImage {
  key: string;
  url: string;
  name: string;
}

export function validateImage(file: File): string | null {
  if (!ACCEPTED_IMAGES.includes(file.type)) return "صيغة غير مدعومة — استعمل PNG أو JPEG أو WebP";
  if (file.size > MAX_IMAGE_BYTES) return "حجم الصورة يتجاوز 5 ميغابايت";
  return null;
}

export function validateVideo(file: File): string | null {
  if (!ACCEPTED_VIDEOS.includes(file.type)) return "صيغة الفيديو غير مدعومة — استعمل MP4 أو WebM";
  if (file.size > MAX_VIDEO_BYTES) return "حجم الفيديو يتجاوز 50 ميغابايت";
  return null;
}

export function useMediaUpload() {
  const uploadUrl = trpc.files.uploadUrl.useMutation();
  const commit = trpc.files.commit.useMutation();

  async function upload(file: File): Promise<UploadedImage> {
    const invalid = file.type.startsWith("video/") ? validateVideo(file) : validateImage(file);
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
    if (!res.ok) throw new Error("فشل رفع الملف — تحقّق من الاتصال وأعد المحاولة");

    // التثبيت يسجّل الملف كارتِفاكت (ويقرأ الحجم/النوع من التخزين لا من المتصفح).
    await commit.mutateAsync({ key, name: file.name });
    // الرابط القابل للعرض هو مسار التطبيق نفسه، ولا يحتاج توقيعاً للقراءة.
    return { key, url: publicPath, name: file.name };
  }

  return { upload, isUploading: uploadUrl.isPending || commit.isPending };
}

export function useImageUpload() {
  const media = useMediaUpload();
  return media;
}
