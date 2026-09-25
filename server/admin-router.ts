// ── AGENT-OWNED: tRPC admin surface ────────────────────────────────────────────
// كل إجراء هنا محميّ بـ adminProcedure (role === 'admin')، ويستدعي admin-db ثم
// يسجّل أثراً في سجل الإدارة. الأفعال المدمِّرة ممنوعة عن قصد: لا حذف نهائي
// لمستخدم أو طلب — الحظر/الإلغاء/السحب فقط، فتبقى البيانات قابلة للمراجعة.
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, adminProcedure, publicProcedure } from "./_core/trpc";
import { APP_ROLES, MOROCCAN_CITIES, PLATFORM_FEE_PERCENT, REQUEST_STATUSES, OFFER_STATUSES } from "../shared/constants";
import * as a from "./admin-db";

/** ترجمة أخطاء المجال الإدارية إلى أخطاء tRPC برسائل عربية جاهزة. */
function guarded<R>(fn: () => Promise<R>): Promise<R> {
  return fn().catch((e: unknown) => {
    if (e instanceof a.NotFoundError) throw new TRPCError({ code: "NOT_FOUND", message: e.message });
    if (e instanceof a.InvalidStateError) throw new TRPCError({ code: "BAD_REQUEST", message: e.message });
    if (a.isUniqueViolation(e)) throw new TRPCError({ code: "CONFLICT", message: "هذه القيمة مستعملة من قبل" });
    throw e;
  });
}

const overviewRouter = router({
  stats: adminProcedure.query(() => guarded(() => a.adminOverview())),
  queues: adminProcedure.query(() => guarded(() => a.adminWorkQueues())),
  feePercent: publicProcedure.query(() => PLATFORM_FEE_PERCENT),
});

const usersRouter = router({
  list: adminProcedure
    .input(
      z.object({
        search: z.string().max(80).optional(),
        role: z.enum(APP_ROLES).optional(),
        verified: z.boolean().optional(),
        blocked: z.boolean().optional(),
        limit: z.number().int().min(1).max(200).optional(),
      }),
    )
    .query(({ input }) => guarded(() => a.adminListUsers(input))),

  setBlocked: adminProcedure
    .input(
      z.object({
        userId: z.uuid(),
        blocked: z.boolean(),
        reason: z.string().max(400).optional(),
      }),
    )
    .mutation(({ ctx, input }) =>
      guarded(() =>
        a.adminSetBlocked({
          userId: input.userId,
          blocked: input.blocked,
          reason: input.reason ?? null,
          adminId: ctx.user.id,
        }),
      ),
    ),

  setVerified: adminProcedure
    .input(z.object({ userId: z.uuid(), verified: z.boolean() }))
    .mutation(({ ctx, input }) =>
      guarded(() => a.adminSetVerified({ userId: input.userId, verified: input.verified, adminId: ctx.user.id })),
    ),
});

const requestsRouter = router({
  list: adminProcedure
    .input(
      z.object({
        search: z.string().max(80).optional(),
        status: z.enum(REQUEST_STATUSES).optional(),
        city: z.enum(MOROCCAN_CITIES).optional(),
        limit: z.number().int().min(1).max(200).optional(),
      }),
    )
    .query(({ input }) => guarded(() => a.adminListRequests(input))),

  cancel: adminProcedure
    .input(z.object({ requestId: z.uuid(), reason: z.string().min(5).max(400) }))
    .mutation(({ ctx, input }) =>
      guarded(() => a.adminCancelRequest({ ...input, adminId: ctx.user.id })),
    ),
});

const offersRouter = router({
  list: adminProcedure
    .input(
      z.object({
        status: z.enum(OFFER_STATUSES).optional(),
        search: z.string().max(80).optional(),
        limit: z.number().int().min(1).max(200).optional(),
      }),
    )
    .query(({ input }) => guarded(() => a.adminListOffers(input))),

  withdraw: adminProcedure
    .input(z.object({ offerId: z.uuid(), reason: z.string().min(5).max(400) }))
    .mutation(({ ctx, input }) => guarded(() => a.adminWithdrawOffer({ ...input, adminId: ctx.user.id }))),
});

const walletsRouter = router({
  list: adminProcedure
    .input(
      z.object({
        onlyOwing: z.boolean().optional(),
        search: z.string().max(80).optional(),
        limit: z.number().int().min(1).max(200).optional(),
      }),
    )
    .query(({ input }) => guarded(() => a.adminListWallets(input))),

  ledger: adminProcedure
    .input(z.object({ userId: z.uuid(), limit: z.number().int().min(1).max(300).optional() }))
    .query(({ input }) => guarded(() => a.adminWalletLedger(input.userId, input.limit ?? 100))),

  adjust: adminProcedure
    .input(
      z.object({
        userId: z.uuid(),
        amount: z.number().int().min(-100000).max(100000).refine((v) => v !== 0, "المبلغ لا يكون صفراً"),
        reason: z.string().min(4).max(400),
      }),
    )
    .mutation(({ ctx, input }) => guarded(() => a.adminAdjustWallet({ ...input, adminId: ctx.user.id }))),
});

const reviewsRouter = router({
  list: adminProcedure
    .input(
      z.object({
        minRating: z.number().int().min(1).max(5).optional(),
        maxRating: z.number().int().min(1).max(5).optional(),
        search: z.string().max(80).optional(),
        limit: z.number().int().min(1).max(200).optional(),
      }),
    )
    .query(({ input }) => guarded(() => a.adminListReviews(input))),

  remove: adminProcedure
    .input(z.object({ reviewId: z.uuid(), reason: z.string().min(4).max(400) }))
    .mutation(({ ctx, input }) => guarded(() => a.adminDeleteReview({ ...input, adminId: ctx.user.id }))),
});

const categoriesRouter = router({
  list: adminProcedure.query(() => guarded(() => a.adminListCategories())),

  save: adminProcedure
    .input(
      z.object({
        id: z.uuid().optional(),
        slug: z.string().min(2).max(60),
        nameAr: z.string().min(2).max(60),
        icon: z.string().min(2).max(60),
        sortOrder: z.number().int().min(0).max(999),
      }),
    )
    .mutation(({ ctx, input }) => guarded(() => a.adminSaveCategory({ ...input, adminId: ctx.user.id }))),

  remove: adminProcedure
    .input(z.object({ id: z.uuid() }))
    .mutation(({ ctx, input }) => guarded(() => a.adminDeleteCategory({ id: input.id, adminId: ctx.user.id }))),
});

const auditRouter = router({
  list: adminProcedure
    .input(z.object({ limit: z.number().int().min(1).max(300).optional() }).optional())
    .query(({ input }) => guarded(() => a.listAuditLog(input?.limit ?? 100))),
});

export const adminRouter = router({
  overview: overviewRouter,
  users: usersRouter,
  requests: requestsRouter,
  offers: offersRouter,
  wallets: walletsRouter,
  reviews: reviewsRouter,
  categories: categoriesRouter,
  audit: auditRouter,
});
