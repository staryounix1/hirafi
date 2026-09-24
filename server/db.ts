// ── AGENT-OWNED: business data-access ──────────────────────────────────────────
// All Drizzle/raw SQL lives here so routers stay thin. Every user-scoped query
// is filtered by an owner column — no procedure ever reads another user's rows.
import { and, desc, eq, ne, or, sql, inArray, gte, lte, notInArray } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import type { AppDB } from "./_core/db";
import { db, atomic as atomicRaw, isUniqueViolation } from "./_core/db";
import {
  serviceCategories,
  providerProfiles,
  providerCategories,
  providerWorks,
  requests,
  requestImages,
  offers,
  messages,
  reviews,
  walletTransactions,
  notifications,
} from "../drizzle/schema";
import { NotFoundError, ForbiddenError, ConflictError, InvalidStateError } from "./errors";
import { PLATFORM_FEE_PERCENT, type AppRole, type RequestStatus } from "../shared/constants";

// ── أخطاء مُصنَّفة (يترجمها الراوتر إلى TRPCError مفهومة) ─────────────────────
// مُعرَّفة في server/errors.ts (ورقة بلا أي استيراد) وأُعيد تصديرها هنا ليستوردها
// الراوتر من مكان واحد. الفصل ضروري: routers.test.ts يستبدل ./db بالكامل، فلو
// عُرِفت في هذا الملف لأصبحت `undefined` هناك وانهارت كل مطابقة.
export { NotFoundError, ForbiddenError, ConflictError, InvalidStateError } from "./errors";
export { isUniqueViolation };

/**
 * غلاف حول `atomic`.
 *
 * `atomic` تطلب tuple مُعرَّفة وقت الترجمة، لكن قوائم الشرطات تُبنى وقت التشغيل
 * (فرع اختياري يزيد عنصراً أو ينقصه)، والتوبل لا يمكن إثباته هناك — ولذلك كانت
 * كل محاولة لتمرير مصفوفة غير متجانسة تنهار عند الترجمة. هذا الغلاف يوسّع المُدخل
 * إلى `unknown[]` ويُبقي التحويل الصامت موسوماً في مكان واحد بدل تكراره في كل موضع.
 */
function atomic(build: (d: AppDB) => unknown[]): Promise<unknown> {
  return atomicRaw((d) => build(d) as unknown as [BatchItem<"pg">, ...BatchItem<"pg">[]]);
}

/** هوية صرفية للقراءة: يوضّح أن المصفوفة قائمة شرطات متسلسلة، لا قيم مُجمَّعة. */
function asBatch(items: unknown[]): unknown[] {
  return items;
}

// ── الفئات ─────────────────────────────────────────────────────────────────────
export async function listCategories() {
  return db.select().from(serviceCategories).orderBy(serviceCategories.sortOrder);
}

// ── الملفات الشخصية ───────────────────────────────────────────────────────────
export async function getProfile(userId: string) {
  const [row] = await db.select().from(providerProfiles).where(eq(providerProfiles.userId, userId)).limit(1);
  return row ?? null;
}

/** ينشئ الملف إن لم يكن موجوداً (يُستدعى عند التسجيل/الدخول التجريبي). */
export async function ensureProfile(input: {
  userId: string;
  displayName: string;
  city: string;
  role?: AppRole;
}) {
  const existing = await getProfile(input.userId);
  if (existing) return existing;
  const [row] = await db
    .insert(providerProfiles)
    .values({
      userId: input.userId,
      displayName: input.displayName,
      city: input.city,
      role: input.role ?? "customer",
    })
    .onConflictDoNothing()
    .returning();
  return row ?? (await getProfile(input.userId));
}

export async function updateProfile(
  userId: string,
  patch: {
    displayName?: string;
    phone?: string | null;
    bio?: string | null;
    city?: string;
    district?: string | null;
    yearsExperience?: number;
    hourlyNote?: string | null;
    role?: AppRole;
    isVerified?: boolean;
  },
) {
  const [row] = await db
    .update(providerProfiles)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(providerProfiles.userId, userId))
    .returning();
  if (!row) throw new NotFoundError("الملف غير موجود");
  return row;
}

/** يبدّل الدور التجاري (زبون ↔ حرّاف) — لا يمسّ مصادقة المستخدم. */
export async function setRole(userId: string, role: AppRole) {
  const [row] = await db
    .update(providerProfiles)
    .set({ role, updatedAt: new Date() })
    .where(eq(providerProfiles.userId, userId))
    .returning();
  if (!row) throw new NotFoundError("الملف غير موجود");
  return row;
}

export async function listMySkills(userId: string) {
  return db
    .select({ categoryId: providerCategories.categoryId })
    .from(providerCategories)
    .where(eq(providerCategories.providerUserId, userId));
}

/** يستبدل مهارات الحرّاف كاملةً (set semantics). */
export async function setSkills(userId: string, categoryIds: string[]) {
  const rows = categoryIds.map((categoryId) => ({ providerUserId: userId, categoryId }));
  return atomic((d) =>
    asBatch([
      d.delete(providerCategories).where(eq(providerCategories.providerUserId, userId)),
      ...(rows.length
        ? [d.insert(providerCategories).values(rows).onConflictDoNothing().returning()]
        : []),
    ]),
  );
}

export async function listWorks(userId: string) {
  return db
    .select()
    .from(providerWorks)
    .where(eq(providerWorks.providerUserId, userId))
    .orderBy(desc(providerWorks.createdAt));
}

export async function addWork(input: { providerUserId: string; imageUrl: string; caption?: string | null }) {
  const [row] = await db
    .insert(providerWorks)
    .values({ providerUserId: input.providerUserId, imageUrl: input.imageUrl, caption: input.caption ?? null })
    .returning();
  return row;
}

export async function removeWork(id: string, userId: string) {
  const deleted = await db
    .delete(providerWorks)
    .where(and(eq(providerWorks.id, id), eq(providerWorks.providerUserId, userId)))
    .returning();
  if (!deleted.length) throw new NotFoundError("العمل غير موجود");
  return { ok: true };
}

/** الملف العام لمقدّم خدمة: الملف + المهارات + الأعمال + المراجعات. */
export async function getPublicProvider(userId: string) {
  const profile = await getProfile(userId);
  if (!profile) throw new NotFoundError("الحرّاف غير موجود");
  const [skills, works, revs] = await Promise.all([
    db
      .select({ id: serviceCategories.id, nameAr: serviceCategories.nameAr, icon: serviceCategories.icon })
      .from(providerCategories)
      .innerJoin(serviceCategories, eq(serviceCategories.id, providerCategories.categoryId))
      .where(eq(providerCategories.providerUserId, userId)),
    listWorks(userId),
    db
      .select({
        id: reviews.id,
        rating: reviews.rating,
        comment: reviews.comment,
        createdAt: reviews.createdAt,
        authorName: providerProfiles.displayName,
        requestTitle: requests.title,
      })
      .from(reviews)
      .innerJoin(providerProfiles, eq(providerProfiles.userId, reviews.authorId))
      .innerJoin(requests, eq(requests.id, reviews.requestId))
      .where(eq(reviews.targetId, userId))
      .orderBy(desc(reviews.createdAt))
      .limit(20),
  ]);
  return { profile, skills, works, reviews: revs };
}

// ── الطلبات ───────────────────────────────────────────────────────────────────
const requestListColumns = {
  id: requests.id,
  customerId: requests.customerId,
  categoryId: requests.categoryId,
  categoryName: serviceCategories.nameAr,
  categoryIcon: serviceCategories.icon,
  title: requests.title,
  description: requests.description,
  budgetAmount: requests.budgetAmount,
  city: requests.city,
  district: requests.district,
  urgency: requests.urgency,
  scheduledFor: requests.scheduledFor,
  status: requests.status,
  acceptedOfferId: requests.acceptedOfferId,
  agreedAmount: requests.agreedAmount,
  createdAt: requests.createdAt,
  updatedAt: requests.updatedAt,
};

/** عدد العروض المعلّقة لكل طلب في قائمة واحدة (grouped)، بدل استعلام لكل صف. */
async function offerCountsByRequest(requestIds: string[]) {
  if (!requestIds.length) return new Map<string, number>();
  const rows = await db
    .select({ requestId: offers.requestId, count: sql<number>`count(*)::int` })
    .from(offers)
    .where(and(inArray(offers.requestId, requestIds), ne(offers.status, "withdrawn")))
    .groupBy(offers.requestId);
  return new Map(rows.map((r) => [r.requestId, Number(r.count)]));
}

export async function listMyRequests(customerId: string) {
  const rows = await db
    .select(requestListColumns)
    .from(requests)
    .innerJoin(serviceCategories, eq(serviceCategories.id, requests.categoryId))
    .where(eq(requests.customerId, customerId))
    .orderBy(desc(requests.createdAt));
  const counts = await offerCountsByRequest(rows.map((r) => r.id));
  return rows.map((r) => ({ ...r, offerCount: counts.get(r.id) ?? 0 }));
}

/**
 * تصفّح الحرّاف: الطلبات المفتوحة فقط، مع فلترة الفئة والمدينة والحي والميزانية
 * والمسافة (تقديرية من المدينة/الحي) + بحث نصّي. `excludeOwnOffers` يخفي ما قدّم
 * عليه عرضاً بالفعل عند الطلب.
 */
export async function browseOpenRequests(input: {
  providerUserId: string;
  providerCity: string;
  providerDistrict?: string | null;
  categoryId?: string;
  city?: string;
  district?: string;
  distance?: "near" | "medium" | "far" | "all";
  budgetMin?: number;
  budgetMax?: number;
  urgency?: "flexible" | "today" | "urgent";
  search?: string;
  excludeOwnOffers?: boolean;
  sort?: "newest" | "budget_desc" | "budget_asc";
  limit?: number;
}) {
  const conds = [eq(requests.status, "open")];
  if (input.categoryId) conds.push(eq(requests.categoryId, input.categoryId));
  if (input.city) conds.push(eq(requests.city, input.city));
  if (input.district) conds.push(eq(requests.district, input.district));
  if (input.urgency) conds.push(eq(requests.urgency, input.urgency));
  if (typeof input.budgetMin === "number") conds.push(gte(requests.budgetAmount, input.budgetMin));
  if (typeof input.budgetMax === "number") conds.push(lte(requests.budgetAmount, input.budgetMax));
  if (input.search) {
    const like = `%${input.search}%`;
    conds.push(or(sql`${requests.title} ILIKE ${like}`, sql`${requests.description} ILIKE ${like}`)!);
  }
  // المسافة: قريب = نفس الحي؛ متوسط = نفس المدينة؛ بعيد = مدينة أخرى.
  const band = input.distance ?? "all";
  if (band === "near") {
    conds.push(eq(requests.city, input.providerCity));
    if (input.providerDistrict) conds.push(eq(requests.district, input.providerDistrict));
    else conds.push(sql`false`);
  } else if (band === "medium") {
    conds.push(eq(requests.city, input.providerCity));
    if (input.providerDistrict) conds.push(ne(requests.district, input.providerDistrict));
  } else if (band === "far") {
    conds.push(ne(requests.city, input.providerCity));
  }

  if (input.excludeOwnOffers) {
    conds.push(
      notInArray(
        requests.id,
        db.select({ id: offers.requestId }).from(offers).where(eq(offers.providerUserId, input.providerUserId)),
      ),
    );
  }

  const order =
    input.sort === "budget_desc"
      ? [desc(requests.budgetAmount)]
      : input.sort === "budget_asc"
        ? [requests.budgetAmount]
        : [desc(requests.createdAt)];

  const rows = await db
    .select(requestListColumns)
    .from(requests)
    .innerJoin(serviceCategories, eq(serviceCategories.id, requests.categoryId))
    .where(and(...conds))
    .orderBy(...order)
    .limit(input.limit ?? 60);
  const counts = await offerCountsByRequest(rows.map((r) => r.id));
  return rows.map((r) => ({ ...r, offerCount: counts.get(r.id) ?? 0 }));
}

/** عدد الطلبات المفتوحة المتاحة (للوحة التحكم). */
export async function countOpenRequestsNear(providerCity: string) {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(requests)
    .where(and(eq(requests.status, "open"), eq(requests.city, providerCity)));
  return Number(row?.count ?? 0);
}

export async function createRequest(input: {
  customerId: string;
  categoryId: string;
  title: string;
  description: string;
  budgetAmount: number;
  city: string;
  district: string;
  urgency: "flexible" | "today" | "urgent";
  scheduledFor?: Date | null;
  imageUrls: string[];
}) {
  const id = crypto.randomUUID();
  await atomic((d) => [
    d.insert(requests).values({
      id,
      customerId: input.customerId,
      categoryId: input.categoryId,
      title: input.title,
      description: input.description,
      budgetAmount: input.budgetAmount,
      city: input.city,
      district: input.district,
      urgency: input.urgency,
      scheduledFor: input.scheduledFor ?? null,
    }),
    ...(input.imageUrls.length
      ? [d.insert(requestImages).values(input.imageUrls.map((imageUrl) => ({ requestId: id, imageUrl })))]
      : []),
  ] as unknown[]);
  const created = await getRequestDetail(id, input.customerId);
  if (!created) throw new NotFoundError("فشل إنشاء الطلب");
  return created;
}

export type RequestDetail = Awaited<ReturnType<typeof getRequestDetail>>;

/**
 * تفاصيل الطلب — مرئية لصنفين فقط: الزبون صاحب الطلب، أو حرّاف قدّم عرضاً عليه.
 * يُرجع `null` لغير المصرّح (الراوتر يترجمه إلى FORBIDDEN/NOT_FOUND).
 */
export async function getRequestDetail(requestId: string, viewerId: string) {
  const [row] = await db
    .select({
      ...requestListColumns,
      customerName: providerProfiles.displayName,
      customerCity: providerProfiles.city,
      customerRatingSum: providerProfiles.ratingSum,
      customerRatingCount: providerProfiles.ratingCount,
    })
    .from(requests)
    .innerJoin(serviceCategories, eq(serviceCategories.id, requests.categoryId))
    .innerJoin(providerProfiles, eq(providerProfiles.userId, requests.customerId))
    .where(eq(requests.id, requestId))
    .limit(1);
  if (!row) return null;

  const images = await db.select().from(requestImages).where(eq(requestImages.requestId, requestId));

  const myOfferRow = await db
    .select({ id: offers.id })
    .from(offers)
    .where(and(eq(offers.requestId, requestId), eq(offers.providerUserId, viewerId)))
    .limit(1);

  const isOwner = row.customerId === viewerId;
  const hasOffered = myOfferRow.length > 0;
  // حرّاف يطلع على طلب مفتوح لقراءته وتقدير سعر — قبل أن يقدّم عرضاً. بلا هذا
  // لا يستطيع قرار العرض أصلاً. أما الطلبات المغلقة فتبقى للطرفين المتعاقدين.
  const mayPreview = row.status === "open" && (await isProviderUser(viewerId));
  if (!isOwner && !hasOffered && !mayPreview) return null;

  const offerRows = await db
    .select({
      id: offers.id,
      requestId: offers.requestId,
      providerUserId: offers.providerUserId,
      price: offers.price,
      durationMinutes: offers.durationMinutes,
      message: offers.message,
      status: offers.status,
      parentOfferId: offers.parentOfferId,
      createdAt: offers.createdAt,
      providerName: providerProfiles.displayName,
      providerCity: providerProfiles.city,
      providerDistrict: providerProfiles.district,
      providerIsVerified: providerProfiles.isVerified,
      providerRatingSum: providerProfiles.ratingSum,
      providerRatingCount: providerProfiles.ratingCount,
      providerCompletedJobs: providerProfiles.completedJobs,
      providerAvatarUrl: providerProfiles.avatarUrl,
    })
    .from(offers)
    .innerJoin(providerProfiles, eq(providerProfiles.userId, offers.providerUserId))
    .where(eq(offers.requestId, requestId))
    .orderBy(desc(offers.createdAt));

  const accepted = row.acceptedOfferId ? offerRows.find((o) => o.id === row.acceptedOfferId) : undefined;

  // خصوصية العروض: الزبون يرى كل العروض (هذا جوهر المقارنة)، والحرّاف يرى عرضه
  // والعرض المقبول فقط — فلا يتكشّف سعر منافسه قبل الاختيار.
  // العرض المضاد يُنشَأ باسم الزبون (providerUserId = customerId) ويُربَط بالأصل عبر parentOfferId،
  // فلولا الشرط الثالث لما رآه الحرّاف الذي وُجّه إليه أصلاً — وبقيت التفاوض أحادياً.
  const myOfferIds = new Set(offerRows.filter((o) => o.providerUserId === viewerId).map((o) => o.id));
  const visibleOffers = isOwner
    ? offerRows
    : offerRows.filter(
        (o) =>
          o.providerUserId === viewerId ||
          o.id === row.acceptedOfferId ||
          (!!o.parentOfferId && myOfferIds.has(o.parentOfferId)),
      );

  // المحادثة: الزبون، أو الحرّاف المقبول إن وُجد، أو حرّاف قدّم عرضاً قبل الاختيار.
  const canWrite = isOwner || (accepted ? accepted.providerUserId === viewerId : hasOffered);
  const myOffers = offerRows.filter((o) => o.providerUserId === viewerId);

  const myReview = await db
    .select({ id: reviews.id, rating: reviews.rating })
    .from(reviews)
    .where(and(eq(reviews.requestId, requestId), eq(reviews.authorId, viewerId)))
    .limit(1);

  // للحرّاف المعني بالطلب: هل يغطّي رصيده العمولة؟ يقرّر الواجهة إظهار تنبيه
  // «اشحن» ومنع الإجراءات، بدل أن يرتدّ الخادم بالخطأ فقط.
  const viewerIsProvider = !isOwner;
  const viewerBalance = viewerIsProvider ? await walletBalance(viewerId) : 0;
  const commissionDue =
    accepted && accepted.providerUserId === viewerId
      ? commissionFor(row.agreedAmount ?? accepted.price)
      : null;

  return {
    request: row,
    images,
    offers: visibleOffers,
    myOffers,
    acceptedOffer: accepted ?? null,
    isOwner,
    hasOffered,
    canWriteMessages: canWrite,
    iReviewed: myReview.length > 0,
    /** رصيد الحرّاف الحالي (0 للزبون) — لتحديد حاجز الشحن في الواجهة. */
    viewerBalance,
    /** عمولة الطلب المستحقّة على الحرّاف المقبول، أو null. */
    commissionDue,
    /** هل تمنع حالة الرصيد الحرّاف من إرسال عرض أو بدء التنفيذ؟ */
    needsTopup: viewerIsProvider && viewerBalance < 0,
    canOffer: viewerIsProvider && viewerBalance > 0,
    /** الطرف الآخر في الطلب (للتقييم/العرض). */
    counterpartId: isOwner ? (accepted?.providerUserId ?? null) : row.customerId,
  };
}

/** هل هذا المستخدم حرّاف (يحمل دور مقدّم خدمة على ملفه)؟ */
async function isProviderUser(userId: string): Promise<boolean> {
  const [p] = await db
    .select({ role: providerProfiles.role })
    .from(providerProfiles)
    .where(eq(providerProfiles.userId, userId))
    .limit(1);
  return p?.role === "provider";
}

export async function updateRequestStatus(input: {
  requestId: string;
  viewerId: string;
  next: Extract<RequestStatus, "in_progress" | "completed" | "cancelled">;
}) {
  const detail = await getRequestDetail(input.requestId, input.viewerId);
  if (!detail) throw new ForbiddenError("لا تملك صلاحية على هذا الطلب");
  const { request, isOwner, acceptedOffer } = detail;
  const isAcceptedProvider = !!acceptedOffer && acceptedOffer.providerUserId === input.viewerId;
  if (!isOwner && !isAcceptedProvider) throw new ForbiddenError("لا تملك صلاحية على هذا الطلب");

  if (input.next === "cancelled") {
    if (!isOwner) throw new ForbiddenError("إلغاء الطلب من حق الزبون فقط");
    if (request.status !== "open") throw new InvalidStateError("لا يمكن إلغاء طلب تجاوز مرحلة العروض");
  } else if (input.next === "in_progress") {
    if (request.status !== "accepted") throw new InvalidStateError("الطلب ليس في مرحلة «مقبول»");
    // لا يبدأ التنفيذ وحرّاف الطلب مدين بعمولة لم يغطّها رصيده بعد.
    if (!isOwner && acceptedOffer) await assertProviderCanProceed(acceptedOffer.providerUserId);
  } else if (input.next === "completed") {
    if (request.status !== "in_progress") throw new InvalidStateError("الطلب ليس قيد التنفيذ");
    if (!isOwner && acceptedOffer) await assertProviderCanProceed(acceptedOffer.providerUserId);
  }

  // حاجز SQL على الحالة المقروءة — صفر صفوف = سبقنا أحد.
  const updated = await db
    .update(requests)
    .set({ status: input.next, updatedAt: new Date() })
    .where(and(eq(requests.id, input.requestId), eq(requests.status, request.status)))
    .returning();
  if (!updated.length) throw new ConflictError("تغيّرت حالة الطلب، حدّث الصفحة");

  // عند الإتمام: عدّاد أعمال الحرّاف + إشعارات. لا حركة مالية هنا: العمولة
  // خُصمت سلفاً لحظة القبول، ودفع الزبون للحرّاف يتم بينهما مباشرة بعد الخدمة.
  if (input.next === "completed" && acceptedOffer) {
    await atomic((d) => [
      d
        .update(providerProfiles)
        .set({ completedJobs: sql`${providerProfiles.completedJobs} + 1`, updatedAt: new Date() })
        .where(eq(providerProfiles.userId, acceptedOffer.providerUserId)),
      d.insert(notifications).values({
        userId: request.customerId,
        type: "completed",
        title: "تم إتمام الطلب",
        body: `أُنجز «${request.title}». لا تنسَ تقييم الحرّاف.`,
        requestId: request.id,
      }),
      d.insert(notifications).values({
        userId: acceptedOffer.providerUserId,
        type: "completed",
        title: "أُنجز العمل",
        body: `تم إنجاز «${request.title}». حصّل أجرك من الزبون مباشرة.`,
        requestId: request.id,
      }),
    ] as unknown as [ReturnType<typeof d.insert>, ...ReturnType<typeof d.insert>[]]);
  } else {
    await notifyOtherParty({
      requestId: request.id,
      requestTitle: request.title,
      recipientId: isOwner ? (acceptedOffer?.providerUserId ?? request.customerId) : request.customerId,
      type: "status",
      title: input.next === "in_progress" ? "بدأ تنفيذ الطلب" : "أُلغي الطلب",
    });
  }

  const fresh = await getRequestDetail(input.requestId, input.viewerId);
  if (!fresh) throw new NotFoundError("الطلب غير موجود");
  return fresh;
}

async function notifyOtherParty(input: {
  requestId: string;
  requestTitle: string;
  recipientId: string;
  type: string;
  title: string;
  body?: string;
}) {
  await db.insert(notifications).values({
    userId: input.recipientId,
    type: input.type,
    title: input.title,
    body: input.body ?? `الطلب: «${input.requestTitle}»`,
    requestId: input.requestId,
  });
}

// ── العروض ────────────────────────────────────────────────────────────────────
const offerColumns = {
  id: offers.id,
  requestId: offers.requestId,
  providerUserId: offers.providerUserId,
  price: offers.price,
  durationMinutes: offers.durationMinutes,
  message: offers.message,
  status: offers.status,
  parentOfferId: offers.parentOfferId,
  createdAt: offers.createdAt,
  requestTitle: requests.title,
  requestStatus: requests.status,
  budgetAmount: requests.budgetAmount,
  city: requests.city,
  district: requests.district,
  categoryName: serviceCategories.nameAr,
  categoryIcon: serviceCategories.icon,
  customerName: providerProfiles.displayName,
};

/** عروض الحرّاف المرسلة — مع سياق الطلب. */
export async function listMyOffers(providerUserId: string) {
  return db
    .select(offerColumns)
    .from(offers)
    .innerJoin(requests, eq(requests.id, offers.requestId))
    .innerJoin(serviceCategories, eq(serviceCategories.id, requests.categoryId))
    .innerJoin(providerProfiles, eq(providerProfiles.userId, requests.customerId))
    .where(eq(offers.providerUserId, providerUserId))
    .orderBy(desc(offers.createdAt));
}

/** الطلبات التي قُبل عرض هذا الحرّاف عليها (شغله الحالي). */
export async function listMyAcceptedJobs(providerUserId: string) {
  const rows = await db
    .select(requestListColumns)
    .from(requests)
    .innerJoin(serviceCategories, eq(serviceCategories.id, requests.categoryId))
    .innerJoin(offers, eq(offers.id, requests.acceptedOfferId))
    .where(and(eq(offers.providerUserId, providerUserId), inArray(requests.status, ["accepted", "in_progress", "completed"])))
    .orderBy(desc(requests.updatedAt));
  // بلا هذا العدّاد تعرض البطاقة «لا عروض بعد» على عمل مُسند بالفعل — تناقض ظاهر.
  const counts = await offerCountsByRequest(rows.map((r) => r.id));
  return rows.map((r) => ({ ...r, offerCount: counts.get(r.id) ?? 0 }));
}

export async function createOffer(input: {
  requestId: string;
  providerUserId: string;
  price: number;
  durationMinutes: number;
  message: string;
}) {
  const [req] = await db.select().from(requests).where(eq(requests.id, input.requestId)).limit(1);
  if (!req) throw new NotFoundError("الطلب غير موجود");
  if (req.customerId === input.providerUserId) throw new ForbiddenError("لا يمكنك العرض على طلبك");
  if (req.status !== "open") throw new InvalidStateError("الطلب لم يعد يستقبل عروضاً");
  // لا عرض بلا رصيد: العمولة تُخصم من محفظة الحرّاف عند القبول، فيجب أن يكون
  // قادراً على تغطيتها قبل أن يُسمح له بالتنافس. الرسالة تُعرض كتنبيه «اشحن».
  if (!(await providerCanOffer(input.providerUserId))) {
    throw new InvalidStateError("اشحن حسابك لإرسال العرض");
  }

  const [existing] = await db
    .select()
    .from(offers)
    .where(and(eq(offers.requestId, input.requestId), eq(offers.providerUserId, input.providerUserId)))
    .limit(1);

  try {
    if (existing) {
      // عرض واحد فعّال لكل حرّاف لكل طلب — التعديل يستبدل القيم ويُعيد الحالة معلّقة.
      const [row] = await db
        .update(offers)
        .set({
          price: input.price,
          durationMinutes: input.durationMinutes,
          message: input.message,
          status: "pending",
          updatedAt: new Date(),
        })
        .where(eq(offers.id, existing.id))
        .returning();
      await notifyOtherParty({
        requestId: input.requestId,
        requestTitle: req.title,
        recipientId: req.customerId,
        type: "offer",
        title: "عرض محدَّث على طلبك",
        body: `«${req.title}»: عرض جديد بـ ${input.price} درهم.`,
      });
      return row;
    }
    const [row] = await db
      .insert(offers)
      .values({
        requestId: input.requestId,
        providerUserId: input.providerUserId,
        price: input.price,
        durationMinutes: input.durationMinutes,
        message: input.message,
      })
      .returning();
    await notifyOtherParty({
      requestId: input.requestId,
      requestTitle: req.title,
      recipientId: req.customerId,
      type: "offer",
      title: "وصل عرض جديد على طلبك",
      body: `«${req.title}»: عرض بـ ${input.price} درهم.`,
    });
    return row;
  } catch (e) {
    if (isUniqueViolation(e)) throw new ConflictError("قدّمت عرضاً على هذا الطلب بالفعل");
    throw e;
  }
}

export async function withdrawOffer(offerId: string, providerUserId: string) {
  const [row] = await db
    .update(offers)
    .set({ status: "withdrawn", updatedAt: new Date() })
    .where(and(eq(offers.id, offerId), eq(offers.providerUserId, providerUserId), eq(offers.status, "pending")))
    .returning();
  if (!row) throw new InvalidStateError("لا يمكن سحب هذا العرض (ليس معلّقاً أو ليس لك)");
  return row;
}

/** قبول عرض — قرار الزبون صاحب الطلب وحده، وحاجزه الحالة `open`. */
export async function acceptOffer(offerId: string, customerId: string) {
  const [row] = await db
    .select({
      id: offers.id,
      requestId: offers.requestId,
      providerUserId: offers.providerUserId,
      price: offers.price,
      message: offers.message,
      status: offers.status,
      customerId: requests.customerId,
      requestTitle: requests.title,
      requestStatus: requests.status,
    })
    .from(offers)
    .innerJoin(requests, eq(requests.id, offers.requestId))
    .where(eq(offers.id, offerId))
    .limit(1);
  if (!row) throw new NotFoundError("العرض غير موجود");
  if (row.customerId !== customerId) throw new ForbiddenError("القبول من حق صاحب الطلب فقط");
  if (row.requestStatus !== "open") throw new InvalidStateError("الطلب لم يعد مفتوحاً");
  if (row.status !== "pending") throw new InvalidStateError("هذا العرض لم يعد معلّقاً");

  const otherPending = await db
    .select({ id: offers.id, providerUserId: offers.providerUserId })
    .from(offers)
    .where(and(eq(offers.requestId, row.requestId), eq(offers.status, "pending"), ne(offers.id, offerId)));

  const winner = await db
    .update(offers)
    .set({ status: "accepted", updatedAt: new Date() })
    .where(and(eq(offers.id, offerId), eq(offers.status, "pending")))
    .returning();
  if (!winner.length) throw new ConflictError("سبقك تغيير على العروض، حدّث الصفحة");

  const updatedReq = await db
    .update(requests)
    .set({
      status: "accepted",
      acceptedOfferId: offerId,
      agreedAmount: row.price,
      updatedAt: new Date(),
    })
    .where(and(eq(requests.id, row.requestId), eq(requests.status, "open")))
    .returning();
  if (!updatedReq.length) throw new ConflictError("سبقك تغيير على الطلب، حدّث الصفحة");

  // العمولة تُخصم من محفظة الحرّاف لحظة القبول نفسها (داخل معاملة القبول).
  const commission = await chargeCommission(
    row.providerUserId,
    row.requestId,
    row.requestTitle,
    row.price,
  );

  await atomic((d) =>
    asBatch([
      d
        .update(offers)
        .set({ status: "rejected", updatedAt: new Date() })
        .where(and(eq(offers.requestId, row.requestId), eq(offers.status, "pending"))),
      d.insert(notifications).values({
        userId: row.providerUserId,
        type: "accepted",
        title: "تم قبول عرضك 🎉",
        body: `قبل الزبون عرضك على «${row.requestTitle}» بـ ${row.price} درهم. تواصل معه لتحديد موعد التنفيذ.`,
        requestId: row.requestId,
      }),
      d.insert(notifications).values({
        userId: row.customerId,
        type: "accepted",
        title: "تم تثبيت السعر المقبول",
        body: `اتفقت على «${row.requestTitle}» بـ ${row.price} درهم.`,
        requestId: row.requestId,
      }),
      ...(commission.charged
        ? [
            d.insert(notifications).values({
              userId: row.providerUserId,
              type: "fee",
              title: "خُصمت عمولة المنصّة",
              body: `خُصمت ${commission.fee} درهم عمولةً على «${row.requestTitle}». رصيدك المتبقّي ${commission.balanceAfter} درهم.`,
              requestId: row.requestId,
            }),
          ]
        : [
            d.insert(notifications).values({
              userId: row.providerUserId,
              type: "fee",
              title: "اشحن رصيدك لإكمال المراحل مع الزبون",
              body: `عمولة «${row.requestTitle}» هي ${commission.fee} درهم ورصيدك لا يكفي (${commission.balanceAfter} درهم). اشحن حسابك لبدء التنفيذ.`,
              requestId: row.requestId,
            }),
          ]),
      ...(otherPending.length
        ? [
            d.insert(notifications).values(
              otherPending.map((o) => ({
                userId: o.providerUserId,
                type: "rejected",
                title: "اعتذار عن عرضك",
                body: `اختار الزبون عرضاً آخر على «${row.requestTitle}».`,
                requestId: row.requestId,
              })),
            ),
          ]
        : []),
    ]),
  );

  return {
    ok: true,
    requestId: row.requestId,
    commissionFee: commission.fee,
    balanceAfter: commission.balanceAfter,
    needsTopup: !commission.charged,
  };
}

export async function rejectOffer(offerId: string, customerId: string) {
  const [row] = await db
    .select({ id: offers.id, requestId: offers.requestId, providerUserId: offers.providerUserId, customerId: requests.customerId, title: requests.title })
    .from(offers)
    .innerJoin(requests, eq(requests.id, offers.requestId))
    .where(eq(offers.id, offerId))
    .limit(1);
  if (!row) throw new NotFoundError("العرض غير موجود");
  if (row.customerId !== customerId) throw new ForbiddenError("الرفض من حق صاحب الطلب فقط");
  const [out] = await db
    .update(offers)
    .set({ status: "rejected", updatedAt: new Date() })
    .where(and(eq(offers.id, offerId), eq(offers.status, "pending")))
    .returning();
  if (!out) throw new InvalidStateError("هذا العرض لم يعد معلّقاً");
  await notifyOtherParty({
    requestId: row.requestId,
    requestTitle: row.title,
    recipientId: row.providerUserId,
    type: "rejected",
    title: "اعتذار عن عرضك",
    body: `رفض الزبون عرضك على «${row.title}».`,
  });
  return { ok: true };
}

/**
 * تفاوض الزبون: عرض مضاد يُنشَأ باسم الزبون على نفس الطلب (parentOfferId يشير
 * للعرض الأصلي) وحالة الأصل تصير `countered`.
 */
export async function counterOffer(input: {
  offerId: string;
  customerId: string;
  price: number;
  durationMinutes: number;
  message: string;
}) {
  const [row] = await db
    .select({
      id: offers.id,
      requestId: offers.requestId,
      providerUserId: offers.providerUserId,
      customerId: requests.customerId,
      title: requests.title,
      status: offers.status,
      requestStatus: requests.status,
    })
    .from(offers)
    .innerJoin(requests, eq(requests.id, offers.requestId))
    .where(eq(offers.id, input.offerId))
    .limit(1);
  if (!row) throw new NotFoundError("العرض غير موجود");
  if (row.customerId !== input.customerId) throw new ForbiddenError("التفاوض من حق صاحب الطلب فقط");
  if (row.requestStatus !== "open") throw new InvalidStateError("الطلب لم يعد مفتوحاً");
  if (row.status !== "pending") throw new InvalidStateError("هذا العرض لم يعد معلّقاً");

  const counterId = crypto.randomUUID();
  await atomic((d) => [
    d.insert(offers).values({
      id: counterId,
      requestId: row.requestId,
      providerUserId: row.customerId, // الطرف المقترِح هو الزبون
      price: input.price,
      durationMinutes: input.durationMinutes,
      message: input.message,
      status: "countered",
      parentOfferId: input.offerId,
    }),
    d
      .update(offers)
      .set({ status: "countered", updatedAt: new Date() })
      .where(and(eq(offers.id, input.offerId), eq(offers.status, "pending"))),
    d.insert(notifications).values({
      userId: row.providerUserId,
      type: "counter",
      title: "عرض مضاد من الزبون",
      body: `«${row.title}»: الزبون يقترح ${input.price} درهم / ${input.durationMinutes} دقيقة.`,
      requestId: row.requestId,
    }),
  ] as unknown as [ReturnType<typeof d.insert>, ...ReturnType<typeof d.insert>[]]);
  return { ok: true };
}

/**
 * ردّ الحرّاف على العرض المضاد: يوافق (فُيقلب للقبول النهائي باسمه) أو يرفض.
 * الموافقة تُنشئ عرضاً جديداً معلّقاً بالاسم الأصلي، ليبقى «القبول» قرار الزبون
 * النهائي في شاشة واحدة — مع نقل السعر المتفاوض عليه كما هو.
 */
export async function respondToCounter(input: {
  counterId: string;
  providerUserId: string;
  accept: boolean;
  price?: number;
}) {
  const [counter] = await db.select().from(offers).where(eq(offers.id, input.counterId)).limit(1);
  if (!counter || counter.status !== "countered") throw new InvalidStateError("العرض المضاد غير متاح");
  const [req] = await db.select().from(requests).where(eq(requests.id, counter.requestId)).limit(1);
  if (!req) throw new NotFoundError("الطلب غير موجود");
  if (req.customerId !== counter.providerUserId) throw new ForbiddenError("ليس عرضاً مضاداً لك");

  const parentId = counter.parentOfferId;
  const [original] = parentId
    ? await db.select().from(offers).where(eq(offers.id, parentId)).limit(1)
    : [undefined];
  if (!original || original.providerUserId !== input.providerUserId) {
    throw new ForbiddenError("العرض المضاد ليس موجّهاً إليك");
  }

  if (!input.accept) {
    const [out] = await db
      .update(offers)
      .set({ status: "rejected", updatedAt: new Date() })
      .where(and(eq(offers.id, counter.id), eq(offers.status, "countered")))
      .returning();
    if (!out) throw new ConflictError("تغيّرت حالة العرض المضاد");
    await notifyOtherParty({
      requestId: req.id,
      requestTitle: req.title,
      recipientId: req.customerId,
      type: "rejected",
      title: "رفض الحرّاف العرض المضاد",
      body: `«${req.title}» ما زال مفتوحاً — يمكنك انتظار عرض آخر.`,
    });
    return { ok: true, accepted: false };
  }

  const agreedPrice = input.price ?? counter.price;
  // العمولة تُخصم من محفظة الحرّاف لحظة قبول العرض المضاد — نفس منطق acceptOffer.
  const commission = await chargeCommission(input.providerUserId, req.id, req.title, agreedPrice);
  // `acceptedOfferId` يجب أن يشير دائماً إلى صفّ يملكه الحرّاف، لا إلى صفّ العرض المضاد
  // (فالعرض المضاد مُنشأ باسم الزبون providerUserId = customerId). ولو أشرنا إليه لذهب
  // الاستحقاق وعدّاد الأعمال المنجزة إلى الزبون بدل الحرّاف في updateRequestStatus.
  await atomic((d) => [
    d.update(offers).set({ status: "accepted", updatedAt: new Date() }).where(eq(offers.id, counter.id)),
    d.update(offers).set({ status: "accepted", updatedAt: new Date() }).where(eq(offers.id, original.id)),
    d
      .update(offers)
      .set({ status: "rejected", updatedAt: new Date() })
      .where(
        and(
          eq(offers.requestId, req.id),
          ne(offers.id, counter.id),
          ne(offers.id, original.id),
          eq(offers.status, "pending"),
        ),
      ),
    d
      .update(requests)
      .set({
        status: "accepted",
        acceptedOfferId: original.id,
        agreedAmount: agreedPrice,
        updatedAt: new Date(),
      })
      .where(and(eq(requests.id, req.id), eq(requests.status, "open"))),
    d.insert(notifications).values({
      userId: req.customerId,
      type: "accepted",
      title: "وافق الحرّاف على عرضك المضاد",
      body: `اتفقتما على ${agreedPrice} درهم لـ «${req.title}».`,
      requestId: req.id,
    }),
    d.insert(notifications).values({
      userId: input.providerUserId,
      type: "accepted",
      title: "تم الاتفاق",
      body: `تم إسناد «${req.title}» إليك بـ ${agreedPrice} درهم.`,
      requestId: req.id,
    }),
    d.insert(notifications).values({
      userId: input.providerUserId,
      type: commission.charged ? "fee" : "topup",
      title: commission.charged ? "خُصمت عمولة المنصّة" : "اشحن رصيدك لإكمال المراحل مع الزبون",
      body: commission.charged
        ? `خُصمت ${commission.fee} درهم عمولةً على «${req.title}». رصيدك المتبقّي ${commission.balanceAfter} درهم.`
        : `عمولة «${req.title}» هي ${commission.fee} درهم ورصيدك لا يكفي (${commission.balanceAfter} درهم). اشحن حسابك لبدء التنفيذ.`,
      requestId: req.id,
    }),
  ] as unknown[]);
  return {
    ok: true,
    accepted: true,
    agreedAmount: agreedPrice,
    commissionFee: commission.fee,
    balanceAfter: commission.balanceAfter,
    needsTopup: !commission.charged,
  };
}

// ── المحادثة ──────────────────────────────────────────────────────────────────
export async function listMessages(requestId: string, viewerId: string) {
  const detail = await getRequestDetail(requestId, viewerId);
  if (!detail) throw new ForbiddenError("لا تملك صلاحية على هذه المحادثة");
  // الخيط مقصور على الطرفين: الزبون يرى كل الرسائل في طلبه، والحرّاف يرى ما
  // بينه وبين الزبون فقط — فلا تُقرأ محادثة منافس عرض على نفس الطلب.
  const conds = [eq(messages.requestId, requestId)];
  if (!detail.isOwner) {
    conds.push(inArray(messages.senderId, [viewerId, detail.request.customerId]));
  }
  return db
    .select({
      id: messages.id,
      requestId: messages.requestId,
      senderId: messages.senderId,
      body: messages.body,
      createdAt: messages.createdAt,
      senderName: providerProfiles.displayName,
    })
    .from(messages)
    .innerJoin(providerProfiles, eq(providerProfiles.userId, messages.senderId))
    .where(and(...conds))
    .orderBy(messages.createdAt);
}

export async function sendMessage(input: { requestId: string; senderId: string; body: string }) {
  const detail = await getRequestDetail(input.requestId, input.senderId);
  if (!detail) throw new ForbiddenError("لا تملك صلاحية على هذه المحادثة");
  if (!detail.canWriteMessages) throw new ForbiddenError("المحادثة متاحة للطرفين المتعاقدين");
  const [row] = await db
    .insert(messages)
    .values({ requestId: input.requestId, senderId: input.senderId, body: input.body })
    .returning();
  const recipientId = detail.isOwner
    ? (detail.acceptedOffer?.providerUserId ?? detail.offers.find((o) => o.providerUserId !== input.senderId)?.providerUserId)
    : detail.request.customerId;
  if (recipientId && recipientId !== input.senderId) {
    await db.insert(notifications).values({
      userId: recipientId,
      type: "message",
      title: "رسالة جديدة",
      body: `رسالة على «${detail.request.title}».`,
      requestId: input.requestId,
    });
  }
  return row;
}

// ── التقييمات ────────────────────────────────────────────────────────────────
export async function createReview(input: {
  requestId: string;
  authorId: string;
  rating: number;
  comment?: string | null;
}) {
  const detail = await getRequestDetail(input.requestId, input.authorId);
  if (!detail) throw new ForbiddenError("لا تملك صلاحية على هذا الطلب");
  if (detail.request.status !== "completed") throw new InvalidStateError("التقييم بعد إتمام الطلب فقط");
  const isOwner = detail.isOwner;
  const accepted = detail.acceptedOffer;
  if (!isOwner && accepted?.providerUserId !== input.authorId) {
    throw new ForbiddenError("التقييم للطرفين المتعاقدين فقط");
  }
  const targetId = isOwner ? accepted?.providerUserId : detail.request.customerId;
  if (!targetId) throw new InvalidStateError("لا يوجد طرف مقابل للتقييم");
  if (targetId === input.authorId) throw new ForbiddenError("لا يمكنك تقييم نفسك");

  try {
    const [row] = await db
      .insert(reviews)
      .values({
        requestId: input.requestId,
        authorId: input.authorId,
        targetId,
        rating: input.rating,
        comment: input.comment ?? null,
      })
      .returning();

    // تحديث المعدّل على الملف المُقيَّم (زائد لا مقروء-ثم-مكتوب).
    await db
      .update(providerProfiles)
      .set({
        ratingSum: sql`${providerProfiles.ratingSum} + ${input.rating}`,
        ratingCount: sql`${providerProfiles.ratingCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(providerProfiles.userId, targetId));

    await notifyOtherParty({
      requestId: input.requestId,
      requestTitle: detail.request.title,
      recipientId: targetId,
      type: "review",
      title: "تقييم جديد",
      body: `حصلت على ${input.rating}/5 على «${detail.request.title}».`,
    });
    return row;
  } catch (e) {
    if (isUniqueViolation(e)) throw new ConflictError("قيّمت هذا الطلب بالفعل");
    throw e;
  }
}

export async function listReviewsForUser(userId: string) {
  return db
    .select({
      id: reviews.id,
      rating: reviews.rating,
      comment: reviews.comment,
      createdAt: reviews.createdAt,
      authorName: providerProfiles.displayName,
      requestTitle: requests.title,
    })
    .from(reviews)
    .innerJoin(providerProfiles, eq(providerProfiles.userId, reviews.authorId))
    .innerJoin(requests, eq(requests.id, reviews.requestId))
    .where(eq(reviews.targetId, userId))
    .orderBy(desc(reviews.createdAt));
}

// ── المحفظة ──────────────────────────────────────────────────────────────────
export async function listWallet(userId: string) {
  const rows = await db
    .select({
      id: walletTransactions.id,
      requestId: walletTransactions.requestId,
      type: walletTransactions.type,
      amount: walletTransactions.amount,
      description: walletTransactions.description,
      createdAt: walletTransactions.createdAt,
      requestTitle: requests.title,
    })
    .from(walletTransactions)
    .leftJoin(requests, eq(requests.id, walletTransactions.requestId))
    .where(eq(walletTransactions.userId, userId))
    .orderBy(desc(walletTransactions.createdAt))
    .limit(200);
  const balance = rows.reduce((sum, r) => sum + r.amount, 0);
  const earnings = rows.filter((r) => r.amount > 0).reduce((s, r) => s + r.amount, 0);
  const spend = rows.filter((r) => r.amount < 0).reduce((s, r) => s + r.amount, 0);
  return { rows, balance, earnings, spend };
}

/**
 * رصيد المستخدم الحالي (مجموع كل معاملات محفظته).
 *
 * الرصيد هنا هو ما شحنه الحرّاف مسبقاً، وتُخصم منه عمولة المنصة. الزبون لا يملك
 * رصيداً يُصرَف — دفعُه للحرّاف يتم خارح المنصة مباشرة بعد إتمام الخدمة.
 */
export async function walletBalance(userId: string): Promise<number> {
  const [row] = await db
    .select({ total: sql<number>`coalesce(sum(${walletTransactions.amount}), 0)::int` })
    .from(walletTransactions)
    .where(eq(walletTransactions.userId, userId));
  return Number(row?.total ?? 0);
}

/** عمولة المنصة المستحقّة على مبلغ اتفاق (بالدرهم، بلا كسور). */
export function commissionFor(agreedAmount: number): number {
  return Math.round((agreedAmount * PLATFORM_FEE_PERCENT) / 100);
}

/**
 * يخصم عمولة المنصة من محفظة الحرّاف عند قبول عرضه.
 *
 * يُستدعى داخل معاملة القبول نفسها (atomic) حتى لا يبقى اتفاق بلا عمولة.
 * لا يرمي خطأً عند نقص الرصيد: يسجّل السالب على المحفظة (فيصبح الحرّاف مديناً)
 * ويُعيد `{ charged, fee, balanceAfter }`. حالة «مدين» تُمنع لاحقاً من بدء أي
 * إجراء على الطلب عبر `assertProviderCanProceed`، فلا يظهر تنبيه الشحن فقط بل
 * يتوقّف التنفيذ فعلاً حتى يغطّي الرصيد العمولة.
 */
export async function chargeCommission(
  providerUserId: string,
  requestId: string,
  requestTitle: string,
  agreedAmount: number,
): Promise<{ fee: number; balanceAfter: number; charged: boolean }> {
  const fee = commissionFor(agreedAmount);
  const before = await walletBalance(providerUserId);
  const balanceAfter = before - fee;
  const charged = balanceAfter >= 0;
  await db.insert(walletTransactions).values({
    userId: providerUserId,
    requestId,
    type: "fee",
    amount: -fee,
    description: charged
      ? `عمولة المنصّة ${PLATFORM_FEE_PERCENT}% على «${requestTitle}»`
      : `عمولة المنصّة ${PLATFORM_FEE_PERCENT}% على «${requestTitle}» — الرصيد ناقص، اشحن حسابك`,
  });
  return { fee, balanceAfter, charged };
}

/**
 * يتحقق من أن الحرّاف يمكنه المتابعة على الطلب: رصيده غير سالب.
 * يُرمى `InvalidStateError` برسالة عربية مباشرة عندما يكون مديناً — وهي الرسالة
 * التي تُعرض فوراً في الواجهة كتنبيه «اشحن» مع أيقونة.
 */
export async function assertProviderCanProceed(providerUserId: string): Promise<void> {
  const balance = await walletBalance(providerUserId);
  if (balance < 0) {
    throw new InvalidStateError("اشحن رصيدك لإكمال المراحل مع الزبون");
  }
}

/** هل يملك الحرّاف رصيداً يسمح بتقديم عرض؟ (شرط إرسال العرض). */
export async function providerCanOffer(providerUserId: string): Promise<boolean> {
  return (await walletBalance(providerUserId)) > 0;
}

/**
 * شحن محفظة الحرّاف — نقطة إيداع رصيد تغطّي به عمولة المنصّة.
 *
 * المنصّة لا تحرّك مالاً حقيقياً هنا: هذا تسجيل داخلي يُستعمل لمحاكاة الشحن في
 * هذه النسخة. المعاملات الحقيقية (بطاقة/تحويل) تُضاف لاحقاً عند تفعيل بوابة دفع
 * خاصة بالعمولة؛ بقية الدورة تعتمد على هذا الرصيد كحاجز.
 */
export async function topupWallet(userId: string, amount: number) {
  if (amount <= 0) throw new InvalidStateError("المبلغ يجب أن يكون أكبر من صفر");
  const [row] = await db
    .insert(walletTransactions)
    .values({
      userId,
      type: "topup",
      amount,
      description: "شحن المحفظة",
    })
    .returning();
  const balance = await walletBalance(userId);
  if (balance >= 0) {
    await db.insert(notifications).values({
      userId,
      type: "topup",
      title: "تم شحن حسابك",
      body: `أُضيف ${amount} درهم إلى رصيدك. يمكنك الآن إرسال العروض.`,
    });
  }
  return { ...row, balance };
}

// ── الإشعارات ────────────────────────────────────────────────────────────────
export async function listNotifications(userId: string, limit = 60) {
  const rows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
  const unread = rows.filter((r) => !r.isRead).length;
  return { rows, unread };
}

export async function unreadNotificationCount(userId: string) {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
  return Number(row?.count ?? 0);
}

export async function markNotificationRead(id: string, userId: string) {
  const [row] = await db
    .update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
    .returning();
  if (!row) throw new NotFoundError("الإشعار غير موجود");
  return row;
}

export async function markAllNotificationsRead(userId: string) {
  await db.update(notifications).set({ isRead: true }).where(eq(notifications.userId, userId));
  return { ok: true };
}

// ── لوحات التحكم ─────────────────────────────────────────────────────────────
export async function customerDashboard(userId: string) {
  const [counts] = await db
    .select({
      total: sql<number>`count(*)::int`,
      open: sql<number>`count(*) filter (where ${requests.status} = 'open')::int`,
      accepted: sql<number>`count(*) filter (where ${requests.status} in ('accepted','in_progress'))::int`,
      completed: sql<number>`count(*) filter (where ${requests.status} = 'completed')::int`,
    })
    .from(requests)
    .where(eq(requests.customerId, userId));

  const pendingOffers = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(offers)
    .innerJoin(requests, eq(requests.id, offers.requestId))
    .where(and(eq(requests.customerId, userId), eq(offers.status, "pending")));

  const recent = await listMyRequests(userId);
  const wallet = await listWallet(userId);
  const unread = await unreadNotificationCount(userId);
  return {
    counts: {
      total: Number(counts?.total ?? 0),
      open: Number(counts?.open ?? 0),
      active: Number(counts?.accepted ?? 0),
      completed: Number(counts?.completed ?? 0),
      pendingOffers: Number(pendingOffers[0]?.count ?? 0),
      walletBalance: wallet.balance,
      unread,
    },
    recent: recent.slice(0, 5),
  };
}

export async function providerDashboard(userId: string) {
  const profile = await getProfile(userId);
  const city = profile?.city ?? "الدار البيضاء";
  const open = await countOpenRequestsNear(city);
  const [offerStats] = await db
    .select({
      total: sql<number>`count(*)::int`,
      pending: sql<number>`count(*) filter (where ${offers.status} = 'pending')::int`,
      accepted: sql<number>`count(*) filter (where ${offers.status} = 'accepted')::int`,
      rejected: sql<number>`count(*) filter (where ${offers.status} = 'rejected')::int`,
    })
    .from(offers)
    .where(eq(offers.providerUserId, userId));

  const jobs = await listMyAcceptedJobs(userId);
  const wallet = await listWallet(userId);
  const unread = await unreadNotificationCount(userId);
  const fresh = await browseOpenRequests({
    providerUserId: userId,
    providerCity: city,
    providerDistrict: profile?.district ?? null,
    city,
    limit: 5,
  });

  return {
    profile,
    counts: {
      openNear: open,
      offersTotal: Number(offerStats?.total ?? 0),
      offersPending: Number(offerStats?.pending ?? 0),
      offersAccepted: Number(offerStats?.accepted ?? 0),
      offersRejected: Number(offerStats?.rejected ?? 0),
      activeJobs: jobs.filter((j) => j.status !== "completed").length,
      completedJobs: profile?.completedJobs ?? 0,
      walletBalance: wallet.balance,
      earnings: wallet.earnings,
      unread,
    },
    fresh,
    jobs: jobs.slice(0, 5),
  };
}
