// ── AGENT-OWNED: tRPC API surface ─────────────────────────────────────────────
// Thin procedures only: validate with zod, delegate to server/db.ts, translate
// domain errors into TRPCErrors whose messages are written FOR THE USER.
// Auth comes from _core — never reimplement sessions here.
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, protectedProcedure } from "./_core/trpc";
import { authProvider, registerLocalUser, AuthError, EmailTakenError } from "./_core/auth";
import {
  storageCommit,
  storageDeleteOwned,
  storageListByOwner,
  storagePutUrl,
  StorageError,
} from "./_core/storage";
import * as q from "./db";
import {
  APP_ROLES,
  URGENCIES,
  MOROCCAN_CITIES,
  PLATFORM_FEE_PERCENT,
} from "../shared/constants";

/** كل خطأ مجال مُصنَّف يُترجَم هنا إلى رمز مفهوم ورسالة عربية قابلة للتنفيذ. */
function toTRPCError(e: unknown): never {
  if (e instanceof q.NotFoundError) throw new TRPCError({ code: "NOT_FOUND", message: e.message });
  if (e instanceof q.ForbiddenError) throw new TRPCError({ code: "FORBIDDEN", message: e.message });
  if (e instanceof q.ConflictError) throw new TRPCError({ code: "CONFLICT", message: e.message });
  if (e instanceof q.InvalidStateError) throw new TRPCError({ code: "BAD_REQUEST", message: e.message });
  if (q.isUniqueViolation(e)) {
    throw new TRPCError({ code: "CONFLICT", message: "هذه القيمة مستعملة من قبل" });
  }
  throw e;
}

/** ينفّذ منطق المجال ويترجم أخطاءه المُصنَّفة — فلا تتسرّب أخطاء SQL كخطأ 500 مبهم. */
function guarded<R>(fn: () => Promise<R>): Promise<R> {
  return fn().catch((e: unknown) => toTRPCError(e));
}

/** يرفع خطأ tRPC برسالة عربية جاهزة للعرض. */
function fail(code: "BAD_REQUEST" | "FORBIDDEN" | "NOT_FOUND" | "CONFLICT" | "UNAUTHORIZED", message: string): never {
  throw new TRPCError({ code, message });
}

// ── المصادقة ────────────────────────────────────────────────────────────────
const authRouter = router({
  me: publicProcedure.query(({ ctx }) => ctx.user),

  signup: publicProcedure
    .input(
      z.object({
        email: z.email(),
        password: z.string().min(8),
        name: z.string().min(2).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const user = await registerLocalUser(input.email, input.password, input.name);
        await q.ensureProfile({
          userId: user.id,
          displayName: input.name ?? user.email.split("@")[0],
          city: MOROCCAN_CITIES[0],
        });
        await authProvider().login(ctx.c, input.email, input.password);
        return user;
      } catch (e: unknown) {
        if (e instanceof EmailTakenError) return fail("CONFLICT", e.message);
        throw e;
      }
    }),

  login: publicProcedure
    .input(z.object({ email: z.email(), password: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const user = await authProvider().login(ctx.c, input.email, input.password);
        // ملف ناقص/قديم يُستدرَك عند أول دخول (حساب أُنشئ قبل الـ seed مثلاً).
        await q.ensureProfile({
          userId: user.id,
          displayName: user.name ?? user.email.split("@")[0],
          city: MOROCCAN_CITIES[0],
        });
        return user;
      } catch (e) {
        if (e instanceof AuthError) return fail("UNAUTHORIZED", e.message);
        throw e;
      }
    }),

  logout: publicProcedure.mutation(async ({ ctx }) => {
    await authProvider().logout(ctx.c);
    return { ok: true };
  }),
});

// ── الفئات ──────────────────────────────────────────────────────────────────
const categoriesRouter = router({
  list: publicProcedure.query(() => q.listCategories()),
});

// ── الملف الشخصي ─────────────────────────────────────────────────────────────
const profileRouter = router({
  /** ملفي + مهاراتي + أعمالي (يُنشَأ الملف تلقائياً إن لم يوجد). */
  me: protectedProcedure.query(async ({ ctx }) => {
    const profile = await q.ensureProfile({
      userId: ctx.user.id,
      displayName: ctx.user.name ?? ctx.user.email.split("@")[0],
      city: MOROCCAN_CITIES[0],
    });
    const [skills, works, wallet] = await Promise.all([
      q.listMySkills(ctx.user.id),
      q.listWorks(ctx.user.id),
      q.listWallet(ctx.user.id),
    ]);
    return {
      profile,
      skillIds: skills.map((s) => s.categoryId),
      works,
      balance: wallet.balance,
    };
  }),

  update: protectedProcedure
    .input(
      z.object({
        displayName: z.string().min(2).optional(),
        phone: z.string().max(20).nullable().optional(),
        bio: z.string().max(600).nullable().optional(),
        city: z.enum(MOROCCAN_CITIES).optional(),
        district: z.string().max(60).nullable().optional(),
        yearsExperience: z.number().int().min(0).max(60).optional(),
        hourlyNote: z.string().max(160).nullable().optional(),
        isVerified: z.boolean().optional(),
      }),
    )
    .mutation(({ ctx, input }) => guarded(() => q.updateProfile(ctx.user.id, input))),

  setRole: protectedProcedure
    .input(z.object({ role: z.enum(APP_ROLES) }))
    .mutation(({ ctx, input }) => guarded(() => q.setRole(ctx.user.id, input.role))),

  setSkills: protectedProcedure
    .input(z.object({ categoryIds: z.array(z.uuid()).max(12) }))
    .mutation(({ ctx, input }) =>
      guarded(async () => {
        await q.setSkills(ctx.user.id, input.categoryIds);
        return { ok: true, count: input.categoryIds.length };
      }),
    ),

  addWork: protectedProcedure
    .input(z.object({ imageUrl: z.string().min(1), caption: z.string().max(160).nullable().optional() }))
    .mutation(({ ctx, input }) => guarded(() => q.addWork({ providerUserId: ctx.user.id, ...input }))),

  removeWork: protectedProcedure
    .input(z.object({ id: z.uuid() }))
    .mutation(({ ctx, input }) => guarded(() => q.removeWork(input.id, ctx.user.id))),

  /** الملف العام لأي مستخدم. */
  public: protectedProcedure
    .input(z.object({ userId: z.uuid() }))
    .query(({ input }) => guarded(() => q.getPublicProvider(input.userId))),

  /** المراجعات المستلمة على ملفي. */
  reviews: protectedProcedure.query(({ ctx }) => q.listReviewsForUser(ctx.user.id)),
});

// ── الطلبات ──────────────────────────────────────────────────────────────────
const requestsRouter = router({
  mine: protectedProcedure.query(({ ctx }) => q.listMyRequests(ctx.user.id)),

  create: protectedProcedure
    .input(
      z.object({
        categoryId: z.uuid(),
        title: z.string().min(6).max(120),
        description: z.string().min(15).max(2000),
        budgetAmount: z.number().int().min(0).max(200000),
        city: z.enum(MOROCCAN_CITIES),
        district: z.string().min(1).max(60),
        urgency: z.enum(URGENCIES),
        scheduledFor: z.date().nullable().optional(),
        imageUrls: z.array(z.string().min(1)).max(4).default([]),
      }),
    )
    .mutation(({ ctx, input }) =>
      guarded(() =>
        q.createRequest({
          customerId: ctx.user.id,
          ...input,
          scheduledFor: input.scheduledFor ?? null,
          imageUrls: input.imageUrls,
        }),
      ),
    ),

  detail: protectedProcedure
    .input(z.object({ id: z.uuid() }))
    .query(({ ctx, input }) =>
      guarded(async () => {
        const d = await q.getRequestDetail(input.id, ctx.user.id);
        if (!d) return fail("FORBIDDEN", "لا تملك صلاحية الوصول إلى هذا الطلب");
        return d;
      }),
    ),

  browse: protectedProcedure
    .input(
      z.object({
        categoryId: z.uuid().optional(),
        city: z.string().optional(),
        district: z.string().optional(),
        distance: z.enum(["near", "medium", "far", "all"]).default("all"),
        budgetMin: z.number().int().min(0).optional(),
        budgetMax: z.number().int().min(0).optional(),
        urgency: z.enum(URGENCIES).optional(),
        search: z.string().max(80).optional(),
        excludeOwnOffers: z.boolean().default(false),
        sort: z.enum(["newest", "budget_desc", "budget_asc"]).default("newest"),
      }),
    )
    .query(({ ctx, input }) =>
      guarded(async () => {
        const me = await q.getProfile(ctx.user.id);
        return q.browseOpenRequests({
          providerUserId: ctx.user.id,
          providerCity: me?.city ?? MOROCCAN_CITIES[0],
          providerDistrict: me?.district ?? null,
          ...input,
        });
      }),
    ),

  setStatus: protectedProcedure
    .input(
      z.object({
        id: z.uuid(),
        next: z.enum(["in_progress", "completed", "cancelled"]),
      }),
    )
    .mutation(({ ctx, input }) =>
      guarded(() => q.updateRequestStatus({ requestId: input.id, viewerId: ctx.user.id, next: input.next })),
    ),
});

// ── العروض ──────────────────────────────────────────────────────────────────
const offersRouter = router({
  mine: protectedProcedure.query(({ ctx }) => q.listMyOffers(ctx.user.id)),

  myJobs: protectedProcedure.query(({ ctx }) => q.listMyAcceptedJobs(ctx.user.id)),

  create: protectedProcedure
    .input(
      z.object({
        requestId: z.uuid(),
        price: z.number().int().min(20).max(200000),
        durationMinutes: z.number().int().min(15).max(10080),
        message: z.string().min(10).max(800),
      }),
    )
    .mutation(({ ctx, input }) => guarded(() => q.createOffer({ providerUserId: ctx.user.id, ...input }))),

  withdraw: protectedProcedure
    .input(z.object({ id: z.uuid() }))
    .mutation(({ ctx, input }) => guarded(() => q.withdrawOffer(input.id, ctx.user.id))),

  accept: protectedProcedure
    .input(z.object({ id: z.uuid() }))
    .mutation(({ ctx, input }) => guarded(() => q.acceptOffer(input.id, ctx.user.id))),

  reject: protectedProcedure
    .input(z.object({ id: z.uuid() }))
    .mutation(({ ctx, input }) => guarded(() => q.rejectOffer(input.id, ctx.user.id))),

  counter: protectedProcedure
    .input(
      z.object({
        id: z.uuid(),
        price: z.number().int().min(20).max(200000),
        durationMinutes: z.number().int().min(15).max(10080),
        message: z.string().min(5).max(600),
      }),
    )
    .mutation(({ ctx, input }) =>
      guarded(() => q.counterOffer({ offerId: input.id, customerId: ctx.user.id, ...input })),
    ),

  respondCounter: protectedProcedure
    .input(
      z.object({
        id: z.uuid(),
        accept: z.boolean(),
        price: z.number().int().min(20).max(200000).optional(),
      }),
    )
    .mutation(({ ctx, input }) =>
      guarded(() =>
        q.respondToCounter({
          counterId: input.id,
          providerUserId: ctx.user.id,
          accept: input.accept,
          price: input.price,
        }),
      ),
    ),
});

// ── المحادثة ─────────────────────────────────────────────────────────────────
const messagesRouter = router({
  list: protectedProcedure
    .input(z.object({ requestId: z.uuid() }))
    .query(({ ctx, input }) => guarded(() => q.listMessages(input.requestId, ctx.user.id))),

  send: protectedProcedure
    .input(z.object({ requestId: z.uuid(), body: z.string().min(1).max(1000) }))
    .mutation(({ ctx, input }) =>
      guarded(() => q.sendMessage({ requestId: input.requestId, senderId: ctx.user.id, body: input.body })),
    ),
});

// ── التقييمات ────────────────────────────────────────────────────────────────
const reviewsRouter = router({
  create: protectedProcedure
    .input(
      z.object({
        requestId: z.uuid(),
        rating: z.number().int().min(1).max(5),
        comment: z.string().max(600).nullable().optional(),
      }),
    )
    .mutation(({ ctx, input }) =>
      guarded(() =>
        q.createReview({
          requestId: input.requestId,
          authorId: ctx.user.id,
          rating: input.rating,
          comment: input.comment ?? null,
        }),
      ),
    ),

  forUser: protectedProcedure
    .input(z.object({ userId: z.uuid() }))
    .query(({ input }) => q.listReviewsForUser(input.userId)),
});

// ── المحفظة ──────────────────────────────────────────────────────────────────
const walletRouter = router({
  me: protectedProcedure.query(({ ctx }) => q.listWallet(ctx.user.id)),

  /** شحن رصيد الحرّاف — يغطّي به عمولة المنصّة ويسمح له بإرسال العروض. */
  topup: protectedProcedure
    .input(z.object({ amount: z.number().int().min(10).max(100000) }))
    .mutation(({ ctx, input }) => guarded(() => q.topupWallet(ctx.user.id, input.amount))),

  feePercent: publicProcedure.query(() => PLATFORM_FEE_PERCENT),
});

// ── الإشعارات ────────────────────────────────────────────────────────────────
const notificationsRouter = router({
  list: protectedProcedure.query(({ ctx }) => q.listNotifications(ctx.user.id)),

  unreadCount: protectedProcedure.query(({ ctx }) => q.unreadNotificationCount(ctx.user.id)),

  markRead: protectedProcedure
    .input(z.object({ id: z.uuid() }))
    .mutation(({ ctx, input }) => guarded(() => q.markNotificationRead(input.id, ctx.user.id))),

  markAllRead: protectedProcedure.mutation(({ ctx }) => q.markAllNotificationsRead(ctx.user.id)),
});

// ── لوحات التحكم ─────────────────────────────────────────────────────────────
const dashboardRouter = router({
  customer: protectedProcedure.query(({ ctx }) => q.customerDashboard(ctx.user.id)),
  provider: protectedProcedure.query(({ ctx }) => q.providerDashboard(ctx.user.id)),
});

// ── رفع الصور ────────────────────────────────────────────────────────────────
/** يجرّد الاسم إلى basename آمن (يمنع اجتياز المسار ورؤوس HTTP غير المتوقّعة). */
export function sanitizeBasename(name: string): string {
  const last = name.split(/[/\\]/).pop() ?? "";
  const dot = last.lastIndexOf(".");
  const rawStem = dot > 0 ? last.slice(0, dot) : last;
  const rawExt = dot > 0 ? last.slice(dot + 1) : "";
  const stem = rawStem.replace(/[^A-Za-z0-9._-]/g, "").replace(/^\.+/, "") || "upload";
  const ext = rawExt.replace(/[^A-Za-z0-9]/g, "").slice(0, 10);
  return ext ? `${stem}.${ext}` : stem;
}

const filesRouter = router({
  uploadUrl: protectedProcedure
    .input(z.object({ name: z.string().min(1), contentType: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const key = `${crypto.randomUUID()}-${sanitizeBasename(input.name)}`;
      try {
        const { uploadUrl, publicPath } = await storagePutUrl(key, input.contentType, {
          ownerId: ctx.user.id,
        });
        return { key, uploadUrl, publicPath };
      } catch (e) {
        if (e instanceof StorageError) {
          if (e.code === "failed") {
            return fail("BAD_REQUEST", "تعذّر تخزين الملف — أعد المحاولة بعد لحظات");
          }
          if (e.code === "not_configured") {
            return fail("BAD_REQUEST", "رفع الملفات غير مفعّل حالياً");
          }
        }
        throw e;
      }
    }),

  commit: protectedProcedure
    .input(z.object({ key: z.string().min(1), name: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await storageCommit(input.key, { ownerId: ctx.user.id, name: input.name });
      } catch (e) {
        if (e instanceof StorageError && e.code === "not_found") {
          return fail("NOT_FOUND", "لم يكتمل رفع الملف");
        }
        if (e instanceof StorageError && e.code === "forbidden") {
          return fail("FORBIDDEN", "هذا الملف يخصّ مستخدماً آخر");
        }
        throw e;
      }
    }),

  list: protectedProcedure.query(({ ctx }) => storageListByOwner(ctx.user.id)),

  remove: protectedProcedure
    .input(z.object({ key: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await storageDeleteOwned(ctx.user.id, input.key);
      } catch (e) {
        if (e instanceof StorageError && e.code === "forbidden") {
          return fail("BAD_REQUEST", "مفتاح ملف غير صالح");
        }
        throw e;
      }
    }),
});

export const appRouter = router({
  auth: authRouter,
  categories: categoriesRouter,
  profile: profileRouter,
  requests: requestsRouter,
  offers: offersRouter,
  messages: messagesRouter,
  reviews: reviewsRouter,
  wallet: walletRouter,
  notifications: notificationsRouter,
  dashboard: dashboardRouter,
  files: filesRouter,
});

export type AppRouter = typeof appRouter;
