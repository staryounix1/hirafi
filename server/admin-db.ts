// ── AGENT-OWNED: قاعدة بيانات لوحة الإدارة ─────────────────────────────────────
// منفصلة عن server/db.ts عن قصد: هذا السطح يُقرأ منه الأدمن فقط ولا يمر بفلترة
// المالك، فالفصل يجعل «كل استعلام إداري» قابلاً للمراجعة في ملف واحد (وهو ما
// تتوقّعه مراجعة أمنية). كل دالة تُستدعى من procedures محميّة بـ adminProcedure.
import { and, desc, eq, gte, or, sql, type SQL } from "drizzle-orm";
import { db, isUniqueViolation } from "./_core/db";
import {
  adminAuditLog,
  messages,
  notifications,
  offers,
  providerCategories,
  providerProfiles,
  requests,
  reviews,
  serviceCategories,
  users,
  walletTransactions,
} from "../drizzle/schema";
import { NotFoundError, InvalidStateError } from "./errors";
import { PLATFORM_FEE_PERCENT } from "../shared/constants";

export { NotFoundError, InvalidStateError };
export { isUniqueViolation };

// ── سجل الإدارة ──────────────────────────────────────────────────────────────
/** يكتب صفّ تدقيق واحد — يُستدعى مع كل إجراء إداري، داخل نفس اللحظة. */
export async function recordAdminAction(input: {
  adminId: string;
  action: string;
  targetType: "user" | "request" | "offer" | "review" | "category" | "wallet";
  targetId?: string | null;
  detail?: string | null;
}) {
  await db.insert(adminAuditLog).values({
    adminId: input.adminId,
    action: input.action,
    targetType: input.targetType,
    targetId: input.targetId ?? null,
    detail: input.detail ?? null,
  });
}

export async function listAuditLog(limit = 100) {
  const rows = await db
    .select({
      id: adminAuditLog.id,
      action: adminAuditLog.action,
      targetType: adminAuditLog.targetType,
      targetId: adminAuditLog.targetId,
      detail: adminAuditLog.detail,
      createdAt: adminAuditLog.createdAt,
      adminName: users.name,
      adminEmail: users.email,
    })
    .from(adminAuditLog)
    .leftJoin(users, eq(users.id, adminAuditLog.adminId))
    .orderBy(desc(adminAuditLog.createdAt))
    .limit(limit);
  return rows;
}

// ── النظرة العامة ────────────────────────────────────────────────────────────
/** أرقام لوحة القيادة: كل عدّاد استعلام واحد حتى لا تبطؤ الصفحة الأولى. */
export async function adminOverview() {
  const [counts] = await db
    .select({
      usersTotal: sql<number>`(select count(*) from ${users})::int`,
      customers: sql<number>`(select count(*) from ${providerProfiles} where role = 'customer')::int`,
      providers: sql<number>`(select count(*) from ${providerProfiles} where role = 'provider')::int`,
      blocked: sql<number>`(select count(*) from ${users} where blocked_at is not null)::int`,
      verified: sql<number>`(select count(*) from ${providerProfiles} where is_verified)::int`,
      requestsTotal: sql<number>`(select count(*) from ${requests})::int`,
      requestsOpen: sql<number>`(select count(*) from ${requests} where status = 'open')::int`,
      requestsActive: sql<number>`(select count(*) from ${requests} where status in ('accepted','in_progress'))::int`,
      requestsCompleted: sql<number>`(select count(*) from ${requests} where status = 'completed')::int`,
      requestsCancelled: sql<number>`(select count(*) from ${requests} where status = 'cancelled')::int`,
      offersTotal: sql<number>`(select count(*) from ${offers})::int`,
      offersPending: sql<number>`(select count(*) from ${offers} where status = 'pending')::int`,
      offersAccepted: sql<number>`(select count(*) from ${offers} where status = 'accepted')::int`,
      offersRejected: sql<number>`(select count(*) from ${offers} where status = 'rejected')::int`,
      reviewsTotal: sql<number>`(select count(*) from ${reviews})::int`,
      messagesTotal: sql<number>`(select count(*) from ${messages})::int`,
      // العمولة مُسجَّلة بالسالب على المحفظة، فنأخذ القيمة المطلقة.
      commissionCollected: sql<number>`(select coalesce(-sum(amount),0) from ${walletTransactions} where type = 'fee')::int`,
      topupsTotal: sql<number>`(select coalesce(sum(amount),0) from ${walletTransactions} where type = 'topup')::int`,
      walletsOwing: sql<number>`(
        select count(*) from (
          select user_id from ${walletTransactions} group by user_id having coalesce(sum(amount),0) < 0
        ) d
      )::int`,
      walletsNegativeSum: sql<number>`(
        select coalesce(sum(bal),0)::int from (
          select coalesce(sum(amount),0) as bal from ${walletTransactions} group by user_id
        ) b where bal < 0
      )`,
      requestsNoOffers: sql<number>`(
        select count(*) from ${requests} r
        where r.status = 'open'
          and not exists (select 1 from ${offers} o where o.request_id = r.id)
      )::int`,
      providersUnverified: sql<number>`(
        select count(*) from ${providerProfiles} where role = 'provider' and not is_verified
      )::int`,
    })
    .from(sql`(select 1) as x`);

  // الطلبات على مدى 14 يوماً — رسم بسيط كافٍ للاتجاه العام.
  const daily = await db
    .select({
      day: sql<string>`to_char(date_trunc('day', created_at), 'YYYY-MM-DD')`,
      count: sql<number>`count(*)::int`,
    })
    .from(requests)
    .where(gte(requests.createdAt, sql`now() - interval '14 days'`))
    .groupBy(sql`date_trunc('day', created_at)`)
    .orderBy(sql`date_trunc('day', created_at)`);

  const byCategory = await db
    .select({
      name: serviceCategories.nameAr,
      icon: serviceCategories.icon,
      count: sql<number>`count(${requests.id})::int`,
    })
    .from(serviceCategories)
    .leftJoin(requests, eq(requests.categoryId, serviceCategories.id))
    .groupBy(serviceCategories.id, serviceCategories.nameAr, serviceCategories.icon, serviceCategories.sortOrder)
    .orderBy(desc(sql`count(${requests.id})`))
    .limit(8);

  return { counts, daily, byCategory };
}

// ── المستخدمون ───────────────────────────────────────────────────────────────
export async function adminListUsers(input: {
  search?: string;
  role?: "customer" | "provider" | "admin";
  verified?: boolean;
  blocked?: boolean;
  limit?: number;
}) {
  const conds: SQL[] = [];
  if (input.search) {
    const like = `%${input.search}%`;
    conds.push(
      or(
        sql`${users.email} ilike ${like}`,
        sql`${users.name} ilike ${like}`,
        sql`${providerProfiles.displayName} ilike ${like}`,
        sql`${providerProfiles.phone} ilike ${like}`,
      )!,
    );
  }
  if (input.role) conds.push(eq(providerProfiles.role, input.role));
  if (typeof input.verified === "boolean") conds.push(eq(providerProfiles.isVerified, input.verified));
  if (typeof input.blocked === "boolean") {
    conds.push(input.blocked ? sql`${users.blockedAt} is not null` : sql`${users.blockedAt} is null`);
  }

  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      authRole: users.role,
      blockedAt: users.blockedAt,
      blockedReason: users.blockedReason,
      createdAt: users.createdAt,
      displayName: providerProfiles.displayName,
      role: providerProfiles.role,
      city: providerProfiles.city,
      district: providerProfiles.district,
      phone: providerProfiles.phone,
      isVerified: providerProfiles.isVerified,
      ratingSum: providerProfiles.ratingSum,
      ratingCount: providerProfiles.ratingCount,
      completedJobs: providerProfiles.completedJobs,
      balance: sql<number>`coalesce((select sum(amount) from ${walletTransactions} w where w.user_id = ${users.id}),0)::int`,
      requestsCount: sql<number>`coalesce((select count(*) from ${requests} r where r.customer_id = ${users.id}),0)::int`,
      offersCount: sql<number>`coalesce((select count(*) from ${offers} o where o.provider_user_id = ${users.id}),0)::int`,
    })
    .from(users)
    .leftJoin(providerProfiles, eq(providerProfiles.userId, users.id))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(users.createdAt))
    .limit(input.limit ?? 100);
  return rows;
}

/** حظر/إرجاع حساب — لا يحذف أي بيانات، يمنع الدخول والعروض فقط. */
export async function adminSetBlocked(input: {
  userId: string;
  blocked: boolean;
  reason?: string | null;
  adminId: string;
}) {
  const [target] = await db.select({ id: users.id, role: users.role, email: users.email }).from(users).where(eq(users.id, input.userId)).limit(1);
  if (!target) throw new NotFoundError("المستخدم غير موجود");
  if (target.role === "admin" && input.blocked) throw new InvalidStateError("لا يمكن حظر حساب إداري");

  const [row] = await db
    .update(users)
    .set({
      blockedAt: input.blocked ? new Date() : null,
      blockedReason: input.blocked ? (input.reason?.trim() || "بلا سبب مسجّل") : null,
    })
    .where(eq(users.id, input.userId))
    .returning();

  if (input.blocked) {
    await db.insert(notifications).values({
      userId: input.userId,
      type: "blocked",
      title: "أُوقف حسابك مؤقتاً",
      body: input.reason?.trim()
        ? `أوقفت الإدارة حسابك: ${input.reason.trim()}`
        : "أوقفت الإدارة حسابك مؤقتاً. تواصل مع الدعم للمزيد.",
    });
  }
  await recordAdminAction({
    adminId: input.adminId,
    action: input.blocked ? "BLOCK_USER" : "UNBLOCK_USER",
    targetType: "user",
    targetId: input.userId,
    detail: input.reason ?? null,
  });
  return row;
}

/** توثيق/إلغاء توثيق حرّاف — الشارة كانت تُفعَّل ذاتياً، والآن هي قرار إداري. */
export async function adminSetVerified(input: {
  userId: string;
  verified: boolean;
  adminId: string;
}) {
  const [row] = await db
    .update(providerProfiles)
    .set({ isVerified: input.verified, updatedAt: new Date() })
    .where(eq(providerProfiles.userId, input.userId))
    .returning();
  if (!row) throw new NotFoundError("الملف غير موجود");
  await db.insert(notifications).values({
    userId: input.userId,
    type: "verification",
    title: input.verified ? "تم توثيق حسابك ✓" : "أُزيلت شارة التوثيق",
    body: input.verified
      ? "راجعت الإدارة ملفك ومنحتك شارة «موثّق»."
      : "أزالت الإدارة شارة التوثيق من ملفك. تواصل مع الدعم للمراجعة.",
  });
  await recordAdminAction({
    adminId: input.adminId,
    action: input.verified ? "VERIFY_PROVIDER" : "UNVERIFY_PROVIDER",
    targetType: "user",
    targetId: input.userId,
  });
  return row;
}

// ── الطلبات ──────────────────────────────────────────────────────────────────
export async function adminListRequests(input: {
  search?: string;
  status?: string;
  city?: string;
  limit?: number;
}) {
  const conds: SQL[] = [];
  if (input.status) conds.push(eq(requests.status, input.status));
  if (input.city) conds.push(eq(requests.city, input.city));
  if (input.search) {
    const like = `%${input.search}%`;
    conds.push(or(sql`${requests.title} ilike ${like}`, sql`${requests.description} ilike ${like}`)!);
  }

  const rows = await db
    .select({
      id: requests.id,
      title: requests.title,
      status: requests.status,
      city: requests.city,
      district: requests.district,
      urgency: requests.urgency,
      budgetAmount: requests.budgetAmount,
      agreedAmount: requests.agreedAmount,
      createdAt: requests.createdAt,
      categoryName: serviceCategories.nameAr,
      categoryIcon: serviceCategories.icon,
      customerId: requests.customerId,
      customerName: providerProfiles.displayName,
      offerCount: sql<number>`(select count(*) from ${offers} o where o.request_id = ${requests.id})::int`,
    })
    .from(requests)
    .innerJoin(serviceCategories, eq(serviceCategories.id, requests.categoryId))
    .innerJoin(providerProfiles, eq(providerProfiles.userId, requests.customerId))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(requests.createdAt))
    .limit(input.limit ?? 100);
  return rows;
}

/** إلغاء قسري — بسبب إلزامي يُحفظ fsجلّ الإدارة ويُرسل للطرفين. */
export async function adminCancelRequest(input: {
  requestId: string;
  reason: string;
  adminId: string;
}) {
  const [before] = await db
    .select({ id: requests.id, title: requests.title, status: requests.status, customerId: requests.customerId })
    .from(requests)
    .where(eq(requests.id, input.requestId))
    .limit(1);
  if (!before) throw new NotFoundError("الطلب غير موجود");
  if (before.status === "cancelled") throw new InvalidStateError("الطلب ملغى أصلاً");
  if (before.status === "completed") throw new InvalidStateError("لا يمكن إلغاء طلب منتهٍ");

  const [row] = await db
    .update(requests)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(eq(requests.id, input.requestId))
    .returning();

  await db.insert(notifications).values({
    userId: before.customerId,
    type: "admin_cancel",
    title: "ألغت الإدارة طلبك",
    body: `أُلغي «${before.title}» من الإدارة: ${input.reason}`,
    requestId: before.id,
  });
  await recordAdminAction({
    adminId: input.adminId,
    action: "CANCEL_REQUEST",
    targetType: "request",
    targetId: input.requestId,
    detail: input.reason,
  });
  return row;
}

// ── العروض ───────────────────────────────────────────────────────────────────
export async function adminListOffers(input: {
  status?: string;
  search?: string;
  limit?: number;
}) {
  const conds: SQL[] = [];
  if (input.status) conds.push(eq(offers.status, input.status));
  if (input.search) {
    const like = `%${input.search}%`;
    conds.push(or(sql`${requests.title} ilike ${like}`, sql`${providerProfiles.displayName} ilike ${like}`)!);
  }
  return db
    .select({
      id: offers.id,
      requestId: offers.requestId,
      requestTitle: requests.title,
      requestStatus: requests.status,
      price: offers.price,
      durationMinutes: offers.durationMinutes,
      status: offers.status,
      createdAt: offers.createdAt,
      providerUserId: offers.providerUserId,
      providerName: providerProfiles.displayName,
      providerVerified: providerProfiles.isVerified,
    })
    .from(offers)
    .innerJoin(requests, eq(requests.id, offers.requestId))
    .innerJoin(providerProfiles, eq(providerProfiles.userId, offers.providerUserId))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(offers.createdAt))
    .limit(input.limit ?? 100);
}

export async function adminWithdrawOffer(input: { offerId: string; reason: string; adminId: string }) {
  const [before] = await db
    .select({ id: offers.id, status: offers.status, providerUserId: offers.providerUserId, requestId: offers.requestId })
    .from(offers)
    .where(eq(offers.id, input.offerId))
    .limit(1);
  if (!before) throw new NotFoundError("العرض غير موجود");
  if (before.status !== "pending") throw new InvalidStateError("لا يمكن سحب عرض غير معلّق");

  const [row] = await db
    .update(offers)
    .set({ status: "withdrawn", updatedAt: new Date() })
    .where(eq(offers.id, input.offerId))
    .returning();

  await db.insert(notifications).values({
    userId: before.providerUserId,
    type: "admin_withdraw",
    title: "سُحب عرضك من الإدارة",
    body: `سحبت الإدارة عرضك: ${input.reason}`,
    requestId: before.requestId,
  });
  await recordAdminAction({
    adminId: input.adminId,
    action: "WITHDRAW_OFFER",
    targetType: "offer",
    targetId: input.offerId,
    detail: input.reason,
  });
  return row;
}

// ── المحافظ والعمولات ────────────────────────────────────────────────────────
/** أرصدة كل من له حركة على محفظة — الأعلى أولاً، والسالبون في المقدمة دائماً. */
export async function adminListWallets(input: { onlyOwing?: boolean; search?: string; limit?: number }) {
  const conds: SQL[] = [];
  if (input.search) {
    const like = `%${input.search}%`;
    conds.push(or(sql`${users.email} ilike ${like}`, sql`${providerProfiles.displayName} ilike ${like}`)!);
  }
  const rows = await db
    .select({
      userId: users.id,
      email: users.email,
      displayName: providerProfiles.displayName,
      role: providerProfiles.role,
      balance: sql<number>`coalesce(sum(${walletTransactions.amount}),0)::int`,
      topups: sql<number>`coalesce(sum(case when ${walletTransactions.type} = 'topup' then ${walletTransactions.amount} else 0 end),0)::int`,
      fees: sql<number>`coalesce(-sum(case when ${walletTransactions.type} = 'fee' then ${walletTransactions.amount} else 0 end),0)::int`,
      lastAt: sql<string>`max(${walletTransactions.createdAt})`,
    })
    .from(walletTransactions)
    .innerJoin(users, eq(users.id, walletTransactions.userId))
    .leftJoin(providerProfiles, eq(providerProfiles.userId, users.id))
    .where(conds.length ? and(...conds) : undefined)
    .groupBy(users.id, users.email, providerProfiles.displayName, providerProfiles.role)
    .having(input.onlyOwing ? sql`coalesce(sum(${walletTransactions.amount}),0) < 0` : undefined)
    .orderBy(sql`coalesce(sum(${walletTransactions.amount}),0) asc`)
    .limit(input.limit ?? 100);
  return rows;
}

export async function adminWalletLedger(userId: string, limit = 100) {
  const [user] = await db
    .select({ id: users.id, email: users.email, displayName: providerProfiles.displayName })
    .from(users)
    .leftJoin(providerProfiles, eq(providerProfiles.userId, users.id))
    .where(eq(users.id, userId))
    .limit(1);
  if (!user) throw new NotFoundError("المستخدم غير موجود");
  const entries = await db
    .select({
      id: walletTransactions.id,
      type: walletTransactions.type,
      amount: walletTransactions.amount,
      description: walletTransactions.description,
      requestId: walletTransactions.requestId,
      requestTitle: requests.title,
      createdAt: walletTransactions.createdAt,
    })
    .from(walletTransactions)
    .leftJoin(requests, eq(requests.id, walletTransactions.requestId))
    .where(eq(walletTransactions.userId, userId))
    .orderBy(desc(walletTransactions.createdAt))
    .limit(limit);
  const balance = entries.reduce((s, e) => s + e.amount, 0);
  return { user, entries, balance };
}

/**
 * تعديل رصيد يدوي — يُسجَّل كحركة `refund` موقّعة (لا نلمس حركة سابقة).
 * السبب إلزامي لأنه يظهر للمستخدم في المحفظة وفي سجل الإدارة.
 */
export async function adminAdjustWallet(input: {
  userId: string;
  amount: number;
  reason: string;
  adminId: string;
}) {
  if (input.amount === 0) throw new InvalidStateError("المبلغ يجب ألا يكون صفراً");
  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.id, input.userId)).limit(1);
  if (!user) throw new NotFoundError("المستخدم غير موجود");

  const [row] = await db
    .insert(walletTransactions)
    .values({
      userId: input.userId,
      type: input.amount > 0 ? "topup" : "refund",
      amount: input.amount,
      description: `تعديل إداري: ${input.reason}`,
    })
    .returning();

  await db.insert(notifications).values({
    userId: input.userId,
    type: "wallet",
    title: input.amount > 0 ? "أُضيف رصيد لمحفظتك" : "خُصم رصيد من محفظتك",
    body: `${input.amount > 0 ? "+" : ""}${input.amount} درهم — ${input.reason}`,
  });
  await recordAdminAction({
    adminId: input.adminId,
    action: input.amount > 0 ? "CREDIT_WALLET" : "DEBIT_WALLET",
    targetType: "wallet",
    targetId: input.userId,
    detail: `${input.amount} درهم — ${input.reason}`,
  });

  const balance = (await adminWalletLedger(input.userId, 500)).balance;
  return { ...row, balance };
}

// ── التقييمات ────────────────────────────────────────────────────────────────
export async function adminListReviews(input: { minRating?: number; maxRating?: number; search?: string; limit?: number }) {
  const conds: SQL[] = [];
  if (typeof input.minRating === "number") conds.push(gte(reviews.rating, input.minRating));
  if (typeof input.maxRating === "number") conds.push(sql`${reviews.rating} <= ${input.maxRating}`);
  if (input.search) {
    const like = `%${input.search}%`;
    conds.push(or(sql`${reviews.comment} ilike ${like}`, sql`${requests.title} ilike ${like}`)!);
  }
  return db
    .select({
      id: reviews.id,
      requestId: reviews.requestId,
      requestTitle: requests.title,
      rating: reviews.rating,
      comment: reviews.comment,
      createdAt: reviews.createdAt,
      authorName: sql<string>`(select coalesce(p.display_name, u.email) from ${providerProfiles} p right join ${users} u on u.id = p.user_id where u.id = ${reviews.authorId})`,
      targetName: sql<string>`(select coalesce(p.display_name, u.email) from ${providerProfiles} p right join ${users} u on u.id = p.user_id where u.id = ${reviews.targetId})`,
      targetId: reviews.targetId,
    })
    .from(reviews)
    .innerJoin(requests, eq(requests.id, reviews.requestId))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(reviews.createdAt))
    .limit(input.limit ?? 100);
}

/** حذف تقييم مسيء وإعادة حساب مجاميع المُقيَّم فوراً. */
export async function adminDeleteReview(input: { reviewId: string; reason: string; adminId: string }) {
  const [before] = await db
    .select({ id: reviews.id, targetId: reviews.targetId, rating: reviews.rating })
    .from(reviews)
    .where(eq(reviews.id, input.reviewId))
    .limit(1);
  if (!before) throw new NotFoundError("التقييم غير موجود");

  await db.delete(reviews).where(eq(reviews.id, input.reviewId));
  await db
    .update(providerProfiles)
    .set({
      ratingSum: sql`greatest(${providerProfiles.ratingSum} - ${before.rating}, 0)`,
      ratingCount: sql`greatest(${providerProfiles.ratingCount} - 1, 0)`,
      updatedAt: new Date(),
    })
    .where(eq(providerProfiles.userId, before.targetId));

  await db.insert(notifications).values({
    userId: before.targetId,
    type: "review",
    title: "حُذف تقييم من ملفك",
    body: `حذفت الإدارة تقييماً: ${input.reason}`,
  });
  await recordAdminAction({
    adminId: input.adminId,
    action: "DELETE_REVIEW",
    targetType: "review",
    targetId: input.reviewId,
    detail: input.reason,
  });
  return { ok: true };
}

// ── التصنيفات ────────────────────────────────────────────────────────────────
export async function adminListCategories() {
  return db
    .select({
      id: serviceCategories.id,
      slug: serviceCategories.slug,
      nameAr: serviceCategories.nameAr,
      icon: serviceCategories.icon,
      sortOrder: serviceCategories.sortOrder,
      requestsCount: sql<number>`(select count(*) from ${requests} r where r.category_id = ${serviceCategories.id})::int`,
      providersCount: sql<number>`(select count(*) from ${providerCategories} pc where pc.category_id = ${serviceCategories.id})::int`,
    })
    .from(serviceCategories)
    .orderBy(serviceCategories.sortOrder);
}

export async function adminSaveCategory(input: {
  id?: string;
  slug: string;
  nameAr: string;
  icon: string;
  sortOrder: number;
  adminId: string;
}) {
  const values = {
    slug: input.slug.trim(),
    nameAr: input.nameAr.trim(),
    icon: input.icon.trim(),
    sortOrder: input.sortOrder,
  };
  if (!values.slug || !values.nameAr || !values.icon) {
    throw new InvalidStateError("الاسم والـ slug والأيقونة مطلوبة");
  }

  let row;
  if (input.id) {
    [row] = await db
      .update(serviceCategories)
      .set(values)
      .where(eq(serviceCategories.id, input.id))
      .returning();
    if (!row) throw new NotFoundError("الفئة غير موجودة");
  } else {
    const nextOrder = input.sortOrder || 0;
    const [created] = await db
      .insert(serviceCategories)
      .values({ ...values, sortOrder: nextOrder })
      .returning();
    row = created;
  }

  await recordAdminAction({
    adminId: input.adminId,
    action: input.id ? "UPDATE_CATEGORY" : "CREATE_CATEGORY",
    targetType: "category",
    targetId: row.id,
    detail: `${row.nameAr} (${row.slug})`,
  });
  return row;
}

/** حذف فئة — مرفوض إن كانت مستعملة في أي طلب أو مهارة حرّاف. */
export async function adminDeleteCategory(input: { id: string; adminId: string }) {
  const [used] = await db
    .select({
      requests: sql<number>`(select count(*) from ${requests} r where r.category_id = ${input.id})::int`,
      providers: sql<number>`(select count(*) from ${providerCategories} pc where pc.category_id = ${input.id})::int`,
    })
    .from(sql`(select 1) as x`);
  if ((used?.requests ?? 0) > 0 || (used?.providers ?? 0) > 0) {
    throw new InvalidStateError("لا يمكن حذف فئة مستعملة في طلبات أو مهارات حرّافين — عطّلها بدل ذلك");
  }
  const [row] = await db.delete(serviceCategories).where(eq(serviceCategories.id, input.id)).returning();
  if (!row) throw new NotFoundError("الفئة غير موجودة");
  await recordAdminAction({
    adminId: input.adminId,
    action: "DELETE_CATEGORY",
    targetType: "category",
    targetId: input.id,
    detail: row.nameAr,
  });
  return { ok: true };
}

// ── مساعدات ─────────────────────────────────────────────────────────────────
/** نسبة القبول = العروض المقبولة ÷ كل العروض المنتهية قرارها (مقبولة/مرفوضة). */
export function acceptanceRate(accepted: number, rejected: number): number {
  const decided = accepted + rejected;
  if (decided <= 0) return 0;
  return Math.round((accepted / decided) * 100);
}

export const ADMIN_FEE_PERCENT = PLATFORM_FEE_PERCENT;

// ── لوحة الصحة ───────────────────────────────────────────────────────────────
/** صفوف تحتاج تدخّلاً فورياً — تُعرض كطوابير عمل في النظرة العامة. */
export async function adminWorkQueues() {
  const owing = await adminListWallets({ onlyOwing: true, limit: 10 });
  const noOffers = await db
    .select({
      id: requests.id,
      title: requests.title,
      city: requests.city,
      createdAt: requests.createdAt,
      customerName: providerProfiles.displayName,
    })
    .from(requests)
    .innerJoin(providerProfiles, eq(providerProfiles.userId, requests.customerId))
    .where(
      and(
        eq(requests.status, "open"),
        sql`not exists (select 1 from ${offers} o where o.request_id = ${requests.id})`,
      ),
    )
    .orderBy(desc(requests.createdAt))
    .limit(10);
  const unverified = await db
    .select({
      userId: providerProfiles.userId,
      displayName: providerProfiles.displayName,
      city: providerProfiles.city,
      completedJobs: providerProfiles.completedJobs,
      ratingSum: providerProfiles.ratingSum,
      ratingCount: providerProfiles.ratingCount,
    })
    .from(providerProfiles)
    .where(and(eq(providerProfiles.role, "provider"), eq(providerProfiles.isVerified, false)))
    .orderBy(desc(providerProfiles.completedJobs))
    .limit(10);
  const staleOffers = await db
    .select({
      id: offers.id,
      requestId: offers.requestId,
      requestTitle: requests.title,
      price: offers.price,
      createdAt: offers.createdAt,
      providerName: providerProfiles.displayName,
    })
    .from(offers)
    .innerJoin(requests, eq(requests.id, offers.requestId))
    .innerJoin(providerProfiles, eq(providerProfiles.userId, offers.providerUserId))
    .where(
      and(
        eq(offers.status, "pending"),
        sql`${offers.createdAt} < now() - interval '3 days'`,
      ),
    )
    .orderBy(offers.createdAt)
    .limit(10);
  return { owing, noOffers, unverified, staleOffers };
}
