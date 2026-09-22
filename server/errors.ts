// ── مُصنَّفة أخطاء المجال — ملف ورقة بلا أي استيراد ───────────────────────────
// تُستهلك في server/db.ts (يُطلقها) وفي server/routers.ts (يترجمها إلى TRPCError).
// مفصولة في ملفها الخاص كي يبقى هذا التصنيف حقيقياً حين يُستَبْدَل ./db بالكامل
// في الاختبارات — لو عُرِفت داخل db.ts لأصبحت `undefined` وانهارت المطابقة.
export class NotFoundError extends Error {}
export class ForbiddenError extends Error {}
export class ConflictError extends Error {}
export class InvalidStateError extends Error {}
