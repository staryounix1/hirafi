import { createRequire as __cr } from "node:module";
const require = __cr(import.meta.url);
var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/vercel/entry.ts
import { Hono } from "hono";
import { trpcServer } from "@hono/trpc-server";

// server/routers.ts
import { z } from "zod";
import { TRPCError as TRPCError2 } from "@trpc/server";

// server/_core/trpc.ts
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
var OPAQUE_SERVER_ERROR = "Something went wrong. Please try again.";
var t = initTRPC.context().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    if (error.code !== "INTERNAL_SERVER_ERROR") return shape;
    console.error("[trpc] unhandled error", error.cause ?? error);
    const { stack: _stack, ...data } = shape.data;
    return { ...shape, message: OPAQUE_SERVER_ERROR, data };
  }
});
var router = t.router;
var middleware = t.middleware;
var publicProcedure = t.procedure;
var protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
  return next({ ctx: { ...ctx, user: ctx.user } });
});
var adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
  return next({ ctx });
});

// server/_core/auth.ts
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { SignJWT, jwtVerify } from "jose";
import { compare, hash as bcryptHash } from "bcryptjs";
import { eq } from "drizzle-orm";

// server/_core/db.ts
import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleHttp } from "drizzle-orm/neon-http";
import { drizzle as drizzleTcp } from "drizzle-orm/node-postgres";
import pg from "pg";

// drizzle/schema.ts
var schema_exports = {};
__export(schema_exports, {
  files: () => files,
  messages: () => messages,
  notifications: () => notifications,
  offers: () => offers,
  providerCategories: () => providerCategories,
  providerProfiles: () => providerProfiles,
  providerWorks: () => providerWorks,
  requestImages: () => requestImages,
  requests: () => requests,
  reviews: () => reviews,
  serviceCategories: () => serviceCategories,
  users: () => users,
  walletTransactions: () => walletTransactions
});
import {
  pgTable,
  uuid,
  text,
  timestamp,
  index,
  bigint,
  integer,
  boolean,
  uniqueIndex
} from "drizzle-orm/pg-core";
var users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  // null for SSO-linked users (future)
  name: text("name"),
  role: text("role").notNull().default("user"),
  // 'user' | 'admin'
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});
var files = pgTable(
  "files",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    key: text("key").notNull().unique(),
    ownerId: uuid("owner_id").references(() => users.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    size: bigint("size", { mode: "number" }).notNull(),
    contentType: text("content_type"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (t2) => [index("files_owner_idx").on(t2.ownerId), index("files_created_idx").on(t2.createdAt)]
);
var serviceCategories = pgTable(
  "service_categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    nameAr: text("name_ar").notNull(),
    icon: text("icon").notNull(),
    // اسم أيقونة lucide
    sortOrder: integer("sort_order").notNull().default(0)
  },
  (t2) => [index("service_categories_sort_idx").on(t2.sortOrder)]
);
var providerProfiles = pgTable(
  "provider_profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("customer"),
    // 'customer' | 'provider'
    displayName: text("display_name").notNull(),
    phone: text("phone"),
    bio: text("bio"),
    city: text("city").notNull(),
    district: text("district"),
    yearsExperience: integer("years_experience").notNull().default(0),
    hourlyNote: text("hourly_note"),
    isVerified: boolean("is_verified").notNull().default(false),
    ratingSum: integer("rating_sum").notNull().default(0),
    ratingCount: integer("rating_count").notNull().default(0),
    completedJobs: integer("completed_jobs").notNull().default(0),
    avatarUrl: text("avatar_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (t2) => [
    index("provider_profiles_role_idx").on(t2.role),
    index("provider_profiles_city_idx").on(t2.city)
  ]
);
var providerCategories = pgTable(
  "provider_categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    providerUserId: uuid("provider_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id").notNull().references(() => serviceCategories.id, { onDelete: "cascade" })
  },
  (t2) => [
    uniqueIndex("provider_categories_unique").on(t2.providerUserId, t2.categoryId),
    index("provider_categories_cat_idx").on(t2.categoryId)
  ]
);
var providerWorks = pgTable(
  "provider_works",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    providerUserId: uuid("provider_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    imageUrl: text("image_url").notNull(),
    caption: text("caption"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (t2) => [index("provider_works_provider_idx").on(t2.providerUserId)]
);
var requests = pgTable(
  "requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    customerId: uuid("customer_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id").notNull().references(() => serviceCategories.id),
    title: text("title").notNull(),
    description: text("description").notNull(),
    budgetAmount: integer("budget_amount").notNull(),
    // بالدرهم، بلا كسور
    city: text("city").notNull(),
    district: text("district").notNull(),
    urgency: text("urgency").notNull().default("flexible"),
    // flexible | today | urgent
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
    status: text("status").notNull().default("open"),
    // open | accepted | in_progress | completed | cancelled
    acceptedOfferId: uuid("accepted_offer_id"),
    agreedAmount: integer("agreed_amount"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (t2) => [
    index("requests_customer_idx").on(t2.customerId),
    index("requests_status_idx").on(t2.status),
    index("requests_city_cat_idx").on(t2.city, t2.categoryId),
    index("requests_created_idx").on(t2.createdAt)
  ]
);
var requestImages = pgTable(
  "request_images",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    requestId: uuid("request_id").notNull().references(() => requests.id, { onDelete: "cascade" }),
    imageUrl: text("image_url").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (t2) => [index("request_images_request_idx").on(t2.requestId)]
);
var offers = pgTable(
  "offers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    requestId: uuid("request_id").notNull().references(() => requests.id, { onDelete: "cascade" }),
    providerUserId: uuid("provider_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    price: integer("price").notNull(),
    durationMinutes: integer("duration_minutes").notNull(),
    message: text("message").notNull(),
    status: text("status").notNull().default("pending"),
    // pending | accepted | rejected | withdrawn | countered
    parentOfferId: uuid("parent_offer_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (t2) => [
    index("offers_request_idx").on(t2.requestId),
    index("offers_provider_idx").on(t2.providerUserId),
    index("offers_status_idx").on(t2.status)
  ]
);
var messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    requestId: uuid("request_id").notNull().references(() => requests.id, { onDelete: "cascade" }),
    senderId: uuid("sender_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (t2) => [index("messages_request_idx").on(t2.requestId, t2.createdAt)]
);
var reviews = pgTable(
  "reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    requestId: uuid("request_id").notNull().references(() => requests.id, { onDelete: "cascade" }),
    authorId: uuid("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    targetId: uuid("target_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(),
    // 1..5
    comment: text("comment"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (t2) => [
    uniqueIndex("reviews_request_author_unique").on(t2.requestId, t2.authorId),
    index("reviews_target_idx").on(t2.targetId)
  ]
);
var walletTransactions = pgTable(
  "wallet_transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    requestId: uuid("request_id").references(() => requests.id, { onDelete: "set null" }),
    type: text("type").notNull(),
    // payment | payout | fee | refund | topup
    amount: integer("amount").notNull(),
    // موجب/سالب بالدرهم
    description: text("description").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (t2) => [index("wallet_user_idx").on(t2.userId, t2.createdAt)]
);
var notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    requestId: uuid("request_id").references(() => requests.id, { onDelete: "set null" }),
    isRead: boolean("is_read").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (t2) => [index("notifications_user_idx").on(t2.userId, t2.createdAt)]
);

// server/_core/env.ts
function required(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}
var isProd = process.env.NODE_ENV === "production";
var env = {
  isProd,
  databaseUrl: required("DATABASE_URL"),
  // DB driver select (see db.ts). "tcp" = node-postgres pool (default, portable,
  // right for a resident process); "http" = Neon serverless HTTP (Neon DSN +
  // scale-to-zero only). Absent ⇒ "tcp" so the template works on any Postgres.
  dbDriver: process.env.DB_DRIVER ?? "tcp",
  // Max TCP connections this app's pool may hold. Only the "tcp" driver has a
  // pool; "http" opens a connection per request and ignores this.
  //
  // 5, not node-postgres' default of 10: that default suits an app that owns its
  // database server. On the platform every app gets its own database on ONE
  // SHARED cluster, so the number that matters is (apps under active iteration
  // x max), and a handful of idle-but-open pools can exhaust the cluster's
  // connection slots long before any single app needs ten.
  //
  // `|| 5` also catches a non-numeric value: `Number("八")` is NaN, and a pool
  // built with max: NaN is a subtle production fault rather than a startup error.
  dbPoolMax: Math.max(1, Number(process.env.DB_POOL_MAX) || 5),
  jwtSecret: required("JWT_SECRET"),
  authProvider: process.env.AUTH_PROVIDER ?? "local",
  appSlug: process.env.APP_SLUG ?? "app",
  port: Number(process.env.PORT ?? 3e3),
  apiPort: Number(process.env.API_PORT ?? 3001),
  storage: {
    presignUrl: process.env.APP_STORAGE_PRESIGN_URL ?? "",
    token: process.env.APP_STORAGE_TOKEN ?? ""
  },
  // Supabase Storage is the deployable fallback when the platform presign
  // service is not available (for example, on a standalone Vercel project).
  supabase: {
    url: process.env.SUPABASE_URL ?? "",
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    bucket: process.env.SUPABASE_STORAGE_BUCKET ?? "hirafi-media"
  }
};

// server/_core/db-errors.ts
var UNIQUE_VIOLATION = "23505";
var UNIQUE_VIOLATION_TEXT = /duplicate key value violates unique constraint(?: "([^"]+)")?/i;
function isUniqueViolation(e, constraint) {
  const seen = /* @__PURE__ */ new Set();
  for (let err = e; err && typeof err === "object" && !seen.has(err); ) {
    seen.add(err);
    const { code, constraint: name, message, cause } = err;
    const text2 = typeof message === "string" ? message : "";
    const matched = UNIQUE_VIOLATION_TEXT.exec(text2);
    if (String(code) === UNIQUE_VIOLATION || matched) {
      const violated = typeof name === "string" ? name : matched?.[1] ?? "";
      if (!constraint || violated === constraint) return true;
    }
    err = cause;
  }
  return false;
}

// server/_core/db.ts
function makeTcp() {
  const pool = new pg.Pool({ connectionString: env.databaseUrl, max: env.dbPoolMax });
  pool.on("error", (err) => console.error("[db] idle client error", err));
  return drizzleTcp(pool, { schema: schema_exports });
}
var driver = env.dbDriver === "http" ? drizzleHttp(neon(env.databaseUrl), { schema: schema_exports }) : makeTcp();
var db = driver;
async function atomic(build) {
  if (env.dbDriver === "http") {
    return driver.batch(build(db));
  }
  const out = [];
  await driver.transaction(async (tx) => {
    for (const q of build(tx)) out.push(await q);
  });
  return out;
}

// shared/constants.ts
function sessionCookieName(slug) {
  return `app_session_${slug}`;
}
var APP_ROLES = ["customer", "provider"];
var URGENCIES = ["flexible", "today", "urgent"];
var PLATFORM_FEE_PERCENT = 15;
var MOROCCAN_CITIES = [
  "\u0627\u0644\u062F\u0627\u0631 \u0627\u0644\u0628\u064A\u0636\u0627\u0621",
  "\u0627\u0644\u0631\u0628\u0627\u0637",
  "\u0633\u0644\u0627",
  "\u0645\u0631\u0627\u0643\u0634",
  "\u0637\u0646\u062C\u0629",
  "\u0641\u0627\u0633",
  "\u0623\u0643\u0627\u062F\u064A\u0631",
  "\u0645\u0643\u0646\u0627\u0633",
  "\u0648\u062C\u062F\u0629"
];
var BUDGET_BANDS = [
  { key: "b1", labelAr: "\u0623\u0642\u0644 \u0645\u0646 200 \u062F\u0631\u0647\u0645", min: 0, max: 199 },
  { key: "b2", labelAr: "200 \u2013 500 \u062F\u0631\u0647\u0645", min: 200, max: 500 },
  { key: "b3", labelAr: "500 \u2013 1500 \u062F\u0631\u0647\u0645", min: 501, max: 1500 },
  { key: "b4", labelAr: "\u0623\u0643\u062B\u0631 \u0645\u0646 1500 \u062F\u0631\u0647\u0645", min: 1501, max: Number.MAX_SAFE_INTEGER }
];

// server/_core/session-cookie.ts
var SESSION_MAX_AGE = 60 * 60 * 24 * 30;
var HTTPS_HOST_SUFFIXES = [
  ".teamily.run",
  ".chainopera.run",
  // Retired apps roots, kept while anything may still answer on them:
  // chainopera.io still resolves; teamily.site is under a registry serverHold.
  ".chainopera.io"
];
function sessionCookieOptions(https) {
  if (https) {
    return {
      httpOnly: true,
      path: "/",
      maxAge: SESSION_MAX_AGE,
      sameSite: "None",
      secure: true,
      partitioned: true
      // Hono 会写成 ; Partitioned
    };
  }
  return {
    httpOnly: true,
    path: "/",
    maxAge: SESSION_MAX_AGE,
    sameSite: "Lax",
    secure: false
  };
}
function sessionCookieClearOptions() {
  return [
    { path: "/", sameSite: "None", secure: true, partitioned: true },
    { path: "/", sameSite: "None", secure: true },
    { path: "/", sameSite: "Lax", secure: true },
    { path: "/", sameSite: "Lax", secure: false }
  ];
}
function requestIsSecure(c) {
  if (urlIsHttps(c.req.url)) return true;
  const forwardedHost = firstHop(c.req.header("x-forwarded-host"));
  const host = firstHop(c.req.header("host"));
  if (hostIsHttpsApp(forwardedHost) || hostIsHttpsApp(host)) return true;
  if (firstHop(c.req.header("x-forwarded-proto"))?.toLowerCase() === "https") return true;
  if ((c.req.header("x-forwarded-ssl") ?? "").trim().toLowerCase() === "on") return true;
  if (urlIsHttps(c.req.header("origin")) || urlIsHttps(c.req.header("referer"))) return true;
  return false;
}
function firstHop(raw) {
  const hop = raw?.split(",")[0]?.trim();
  return hop || void 0;
}
function hostIsHttpsApp(host) {
  if (!host) return false;
  const hostname = host.split(":")[0]?.trim().toLowerCase() ?? "";
  return HTTPS_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix));
}
function urlIsHttps(raw) {
  if (!raw || !raw.includes("://")) return false;
  try {
    return new URL(raw).protocol === "https:";
  } catch {
    return false;
  }
}

// server/_core/auth.ts
var COOKIE = sessionCookieName(env.appSlug);
var secretKey = new TextEncoder().encode(env.jwtSecret);
function toSessionUser(row) {
  return { id: row.id, email: row.email, name: row.name, role: row.role };
}
var LocalAuthProvider = class {
  async getSession(c) {
    const token = getCookie(c, COOKIE);
    if (!token) return null;
    try {
      const { payload } = await jwtVerify(token, secretKey);
      const userId = payload.sub;
      if (!userId) return null;
      const [row] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      return row ? toSessionUser(row) : null;
    } catch {
      return null;
    }
  }
  async login(c, email, password) {
    const [row] = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
    const hash = row?.passwordHash ?? "$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinv";
    const ok = await compare(password, hash);
    if (!row || !row.passwordHash || !ok) throw new AuthError("Invalid email or password");
    await this.#setSession(c, row.id);
    return toSessionUser(row);
  }
  async logout(c) {
    for (const opt of sessionCookieClearOptions()) {
      deleteCookie(c, COOKIE, opt);
    }
  }
  async #setSession(c, userId) {
    const token = await new SignJWT({}).setProtectedHeader({ alg: "HS256" }).setSubject(userId).setIssuedAt().setExpirationTime("30d").sign(secretKey);
    setCookie(c, COOKIE, token, sessionCookieOptions(env.isProd || requestIsSecure(c)));
  }
};
var SsoAuthProvider = class {
  async getSession() {
    throw new Error("SsoAuthProvider not implemented (reserved seam \u2014 DESIGN \xA75.1).");
  }
  async login() {
    throw new Error("SsoAuthProvider not implemented (reserved seam \u2014 DESIGN \xA75.1).");
  }
  async logout() {
    throw new Error("SsoAuthProvider not implemented (reserved seam \u2014 DESIGN \xA75.1).");
  }
};
var AuthError = class extends Error {
};
var EmailTakenError = class extends AuthError {
};
var _provider;
function authProvider() {
  if (!_provider) _provider = env.authProvider === "sso" ? new SsoAuthProvider() : new LocalAuthProvider();
  return _provider;
}
async function registerLocalUser(email, password, name) {
  const passwordHash = await bcryptHash(password, 10);
  try {
    const [row] = await db.insert(users).values({ email: email.toLowerCase(), passwordHash, name: name ?? null }).returning();
    return { id: row.id, email: row.email, name: row.name, role: row.role };
  } catch (e) {
    if (isUniqueViolation(e)) {
      throw new EmailTakenError("That email is already registered \u2014 try logging in instead.");
    }
    throw e;
  }
}

// server/_core/storage.ts
import { and, count, desc, eq as eq2, isNull } from "drizzle-orm";
var StorageError = class extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
    this.name = "StorageError";
  }
  code;
};
function canonicalKey(relKey) {
  const stripped = relKey.replace(/^\/+/, "");
  if (!stripped) throw new StorageError("empty storage key", "forbidden");
  for (const segment of stripped.split("/")) {
    if (segment === "" || segment === "." || segment === "..") {
      throw new StorageError(`unsafe storage key (diverges from platform normalization): ${relKey}`, "forbidden");
    }
  }
  return stripped;
}
async function callStorage(op, path2, contentType) {
  if (env.storage.presignUrl && env.storage.token) {
    const res = await fetch(env.storage.presignUrl, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${env.storage.token}` },
      body: JSON.stringify({ op, path: path2, contentType })
    });
    if (res.status === 404) throw new StorageError(`no such object: ${path2}`, "not_found");
    if (!res.ok) throw new StorageError(`storage ${op} failed: ${res.status}`, "failed");
    const body = await res.json();
    if (typeof body.path === "string" && body.path !== path2) {
      throw new StorageError(
        `storage key normalization disagrees with the platform: sent ${path2}, platform used ${body.path}`,
        "forbidden"
      );
    }
    return body;
  }
  if (env.supabase?.url && env.supabase.serviceRoleKey) {
    return callSupabaseStorage(op, path2, contentType);
  }
  throw new StorageError(
    "App storage not configured (APP_STORAGE_PRESIGN_URL / APP_STORAGE_TOKEN or Supabase storage).",
    "not_configured"
  );
}
function encodedPath(path2) {
  return path2.split("/").map(encodeURIComponent).join("/");
}
function supabaseHeaders(contentType) {
  const headers = {
    apikey: env.supabase.serviceRoleKey,
    authorization: `Bearer ${env.supabase.serviceRoleKey}`
  };
  if (contentType) headers["content-type"] = contentType;
  return headers;
}
async function callSupabaseStorage(op, path2, contentType) {
  const root = `${env.supabase.url.replace(/\/+$/, "")}/storage/v1`;
  const bucket = encodeURIComponent(env.supabase.bucket);
  const objectPath = encodedPath(path2);
  const headers = supabaseHeaders(contentType);
  let res;
  if (op === "put") {
    res = await fetch(`${root}/object/upload/sign/${bucket}/${objectPath}`, {
      method: "POST",
      headers
    });
    if (res.status === 404) throw new StorageError(`no such object: ${path2}`, "not_found");
    if (!res.ok) throw new StorageError(`storage ${op} failed: ${res.status}`, "failed");
    const body = await res.json();
    if (!body.token) throw new StorageError("storage put returned no signed token", "failed");
    return {
      url: `${root}/object/upload/sign/${bucket}/${objectPath}?token=${encodeURIComponent(body.token)}`,
      path: body.path ?? path2
    };
  }
  if (op === "head") {
    res = await fetch(`${root}/object/${bucket}/${objectPath}`, { method: "HEAD", headers });
    if (res.status === 404) throw new StorageError(`no such object: ${path2}`, "not_found");
    if (!res.ok) throw new StorageError(`storage ${op} failed: ${res.status}`, "failed");
    return {
      size: Number(res.headers.get("content-length") ?? 0),
      contentType: res.headers.get("content-type"),
      path: path2
    };
  }
  if (op === "get") {
    res = await fetch(`${root}/object/sign/${bucket}/${objectPath}`, {
      method: "POST",
      headers: { ...headers, "content-type": "application/json" },
      body: JSON.stringify({ expiresIn: 3600 })
    });
    if (res.status === 404) throw new StorageError(`no such object: ${path2}`, "not_found");
    if (!res.ok) throw new StorageError(`storage ${op} failed: ${res.status}`, "failed");
    const body = await res.json();
    const signedPath = body.signedURL ?? body.signedUrl;
    if (!signedPath) throw new StorageError("storage get returned no signed URL", "failed");
    return { url: signedPath.startsWith("http") ? signedPath : `${root}${signedPath}` };
  }
  res = await fetch(`${root}/object/${bucket}`, {
    method: "DELETE",
    headers: { ...headers, "content-type": "application/json" },
    body: JSON.stringify({ prefixes: [path2] })
  });
  if (res.status === 404) throw new StorageError(`no such object: ${path2}`, "not_found");
  if (!res.ok) throw new StorageError(`storage ${op} failed: ${res.status}`, "failed");
  return { deleted: true, path: path2 };
}
async function storageGet(relKey) {
  const [row] = await db.select().from(files).where(eq2(files.key, canonicalKey(relKey))).limit(1);
  return row ?? null;
}
async function assertNotOwnedByOther(relKey, ownerId) {
  if (!ownerId) return;
  const existing = await storageGet(relKey);
  if (existing?.ownerId && existing.ownerId !== ownerId) {
    throw new StorageError(`key already owned by another user: ${canonicalKey(relKey)}`, "forbidden");
  }
}
async function storageCommit(relKey, opts = {}) {
  const key = canonicalKey(relKey);
  await assertNotOwnedByOther(key, opts.ownerId);
  const meta = await callStorage("head", key);
  const values = {
    key,
    ownerId: opts.ownerId ?? null,
    name: opts.name ?? key.split("/").pop() ?? key,
    size: meta.size,
    contentType: meta.contentType
  };
  const [row] = await db.insert(files).values(values).onConflictDoUpdate({
    target: files.key,
    set: { name: values.name, size: values.size, contentType: values.contentType }
  }).returning();
  return row;
}
var MAX_LIMIT = 200;
function page(opts) {
  return {
    limit: Math.max(1, Math.min(opts.limit ?? 50, MAX_LIMIT)),
    offset: Math.max(0, opts.offset ?? 0)
  };
}
async function storageListByOwner(ownerId, opts = {}) {
  const { limit, offset } = page(opts);
  return db.select().from(files).where(eq2(files.ownerId, ownerId)).orderBy(desc(files.createdAt)).limit(limit).offset(offset);
}
async function deleteRowThenObject(key, where) {
  const removed = await db.delete(files).where(where).returning();
  if (removed.length === 0) return false;
  await callStorage("delete", key);
  return true;
}
async function storageDeleteOwned(ownerId, relKey) {
  const key = canonicalKey(relKey);
  return deleteRowThenObject(key, and(eq2(files.key, key), eq2(files.ownerId, ownerId)));
}
async function storagePutUrl(relKey, contentType, opts = {}) {
  const key = canonicalKey(relKey);
  await assertNotOwnedByOther(key, opts.ownerId);
  const { url } = await callStorage("put", key, contentType);
  return { uploadUrl: url, publicPath: `/app-storage/${key}` };
}
async function serveAppStorage(c) {
  const raw = c.req.path.replace(/^\/app-storage\//, "");
  try {
    const key = canonicalKey(raw);
    const { url } = await callStorage("get", key);
    c.header("Cache-Control", "no-store");
    return c.redirect(url, 307);
  } catch {
    return c.text("Not found", 404);
  }
}

// server/db.ts
import { and as and2, desc as desc2, eq as eq3, ne, or, sql, inArray, gte, lte, notInArray } from "drizzle-orm";

// server/errors.ts
var NotFoundError = class extends Error {
};
var ForbiddenError = class extends Error {
};
var ConflictError = class extends Error {
};
var InvalidStateError = class extends Error {
};

// server/db.ts
function atomic2(build) {
  return atomic((d) => build(d));
}
function asBatch(items) {
  return items;
}
async function listCategories() {
  return db.select().from(serviceCategories).orderBy(serviceCategories.sortOrder);
}
async function getProfile(userId) {
  const [row] = await db.select().from(providerProfiles).where(eq3(providerProfiles.userId, userId)).limit(1);
  return row ?? null;
}
async function ensureProfile(input) {
  const existing = await getProfile(input.userId);
  if (existing) return existing;
  const [row] = await db.insert(providerProfiles).values({
    userId: input.userId,
    displayName: input.displayName,
    city: input.city,
    role: input.role ?? "customer"
  }).onConflictDoNothing().returning();
  return row ?? await getProfile(input.userId);
}
async function updateProfile(userId, patch) {
  const [row] = await db.update(providerProfiles).set({ ...patch, updatedAt: /* @__PURE__ */ new Date() }).where(eq3(providerProfiles.userId, userId)).returning();
  if (!row) throw new NotFoundError("\u0627\u0644\u0645\u0644\u0641 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F");
  return row;
}
async function setRole(userId, role) {
  const [row] = await db.update(providerProfiles).set({ role, updatedAt: /* @__PURE__ */ new Date() }).where(eq3(providerProfiles.userId, userId)).returning();
  if (!row) throw new NotFoundError("\u0627\u0644\u0645\u0644\u0641 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F");
  return row;
}
async function listMySkills(userId) {
  return db.select({ categoryId: providerCategories.categoryId }).from(providerCategories).where(eq3(providerCategories.providerUserId, userId));
}
async function setSkills(userId, categoryIds) {
  const rows = categoryIds.map((categoryId) => ({ providerUserId: userId, categoryId }));
  return atomic2(
    (d) => asBatch([
      d.delete(providerCategories).where(eq3(providerCategories.providerUserId, userId)),
      ...rows.length ? [d.insert(providerCategories).values(rows).onConflictDoNothing().returning()] : []
    ])
  );
}
async function listWorks(userId) {
  return db.select().from(providerWorks).where(eq3(providerWorks.providerUserId, userId)).orderBy(desc2(providerWorks.createdAt));
}
async function addWork(input) {
  const [row] = await db.insert(providerWorks).values({ providerUserId: input.providerUserId, imageUrl: input.imageUrl, caption: input.caption ?? null }).returning();
  return row;
}
async function removeWork(id, userId) {
  const deleted = await db.delete(providerWorks).where(and2(eq3(providerWorks.id, id), eq3(providerWorks.providerUserId, userId))).returning();
  if (!deleted.length) throw new NotFoundError("\u0627\u0644\u0639\u0645\u0644 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F");
  return { ok: true };
}
async function getPublicProvider(userId) {
  const profile = await getProfile(userId);
  if (!profile) throw new NotFoundError("\u0627\u0644\u062D\u0631\u0651\u0627\u0641 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F");
  const [skills, works, revs] = await Promise.all([
    db.select({ id: serviceCategories.id, nameAr: serviceCategories.nameAr, icon: serviceCategories.icon }).from(providerCategories).innerJoin(serviceCategories, eq3(serviceCategories.id, providerCategories.categoryId)).where(eq3(providerCategories.providerUserId, userId)),
    listWorks(userId),
    db.select({
      id: reviews.id,
      rating: reviews.rating,
      comment: reviews.comment,
      createdAt: reviews.createdAt,
      authorName: providerProfiles.displayName,
      requestTitle: requests.title
    }).from(reviews).innerJoin(providerProfiles, eq3(providerProfiles.userId, reviews.authorId)).innerJoin(requests, eq3(requests.id, reviews.requestId)).where(eq3(reviews.targetId, userId)).orderBy(desc2(reviews.createdAt)).limit(20)
  ]);
  return { profile, skills, works, reviews: revs };
}
var requestListColumns = {
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
  updatedAt: requests.updatedAt
};
async function offerCountsByRequest(requestIds) {
  if (!requestIds.length) return /* @__PURE__ */ new Map();
  const rows = await db.select({ requestId: offers.requestId, count: sql`count(*)::int` }).from(offers).where(and2(inArray(offers.requestId, requestIds), ne(offers.status, "withdrawn"))).groupBy(offers.requestId);
  return new Map(rows.map((r) => [r.requestId, Number(r.count)]));
}
async function listMyRequests(customerId) {
  const rows = await db.select(requestListColumns).from(requests).innerJoin(serviceCategories, eq3(serviceCategories.id, requests.categoryId)).where(eq3(requests.customerId, customerId)).orderBy(desc2(requests.createdAt));
  const counts = await offerCountsByRequest(rows.map((r) => r.id));
  return rows.map((r) => ({ ...r, offerCount: counts.get(r.id) ?? 0 }));
}
async function browseOpenRequests(input) {
  const conds = [eq3(requests.status, "open")];
  if (input.categoryId) conds.push(eq3(requests.categoryId, input.categoryId));
  if (input.city) conds.push(eq3(requests.city, input.city));
  if (input.district) conds.push(eq3(requests.district, input.district));
  if (input.urgency) conds.push(eq3(requests.urgency, input.urgency));
  if (typeof input.budgetMin === "number") conds.push(gte(requests.budgetAmount, input.budgetMin));
  if (typeof input.budgetMax === "number") conds.push(lte(requests.budgetAmount, input.budgetMax));
  if (input.search) {
    const like = `%${input.search}%`;
    conds.push(or(sql`${requests.title} ILIKE ${like}`, sql`${requests.description} ILIKE ${like}`));
  }
  const band = input.distance ?? "all";
  if (band === "near") {
    conds.push(eq3(requests.city, input.providerCity));
    if (input.providerDistrict) conds.push(eq3(requests.district, input.providerDistrict));
    else conds.push(sql`false`);
  } else if (band === "medium") {
    conds.push(eq3(requests.city, input.providerCity));
    if (input.providerDistrict) conds.push(ne(requests.district, input.providerDistrict));
  } else if (band === "far") {
    conds.push(ne(requests.city, input.providerCity));
  }
  if (input.excludeOwnOffers) {
    conds.push(
      notInArray(
        requests.id,
        db.select({ id: offers.requestId }).from(offers).where(eq3(offers.providerUserId, input.providerUserId))
      )
    );
  }
  const order = input.sort === "budget_desc" ? [desc2(requests.budgetAmount)] : input.sort === "budget_asc" ? [requests.budgetAmount] : [desc2(requests.createdAt)];
  const rows = await db.select(requestListColumns).from(requests).innerJoin(serviceCategories, eq3(serviceCategories.id, requests.categoryId)).where(and2(...conds)).orderBy(...order).limit(input.limit ?? 60);
  const counts = await offerCountsByRequest(rows.map((r) => r.id));
  return rows.map((r) => ({ ...r, offerCount: counts.get(r.id) ?? 0 }));
}
async function countOpenRequestsNear(providerCity) {
  const [row] = await db.select({ count: sql`count(*)::int` }).from(requests).where(and2(eq3(requests.status, "open"), eq3(requests.city, providerCity)));
  return Number(row?.count ?? 0);
}
async function createRequest(input) {
  const id = crypto.randomUUID();
  await atomic2((d) => [
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
      scheduledFor: input.scheduledFor ?? null
    }),
    ...input.imageUrls.length ? [d.insert(requestImages).values(input.imageUrls.map((imageUrl) => ({ requestId: id, imageUrl })))] : []
  ]);
  const created = await getRequestDetail(id, input.customerId);
  if (!created) throw new NotFoundError("\u0641\u0634\u0644 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0637\u0644\u0628");
  return created;
}
async function getRequestDetail(requestId, viewerId) {
  const [row] = await db.select({
    ...requestListColumns,
    customerName: providerProfiles.displayName,
    customerCity: providerProfiles.city,
    customerRatingSum: providerProfiles.ratingSum,
    customerRatingCount: providerProfiles.ratingCount
  }).from(requests).innerJoin(serviceCategories, eq3(serviceCategories.id, requests.categoryId)).innerJoin(providerProfiles, eq3(providerProfiles.userId, requests.customerId)).where(eq3(requests.id, requestId)).limit(1);
  if (!row) return null;
  const images = await db.select().from(requestImages).where(eq3(requestImages.requestId, requestId));
  const myOfferRow = await db.select({ id: offers.id }).from(offers).where(and2(eq3(offers.requestId, requestId), eq3(offers.providerUserId, viewerId))).limit(1);
  const isOwner = row.customerId === viewerId;
  const hasOffered = myOfferRow.length > 0;
  const mayPreview = row.status === "open" && await isProviderUser(viewerId);
  if (!isOwner && !hasOffered && !mayPreview) return null;
  const offerRows = await db.select({
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
    providerAvatarUrl: providerProfiles.avatarUrl
  }).from(offers).innerJoin(providerProfiles, eq3(providerProfiles.userId, offers.providerUserId)).where(eq3(offers.requestId, requestId)).orderBy(desc2(offers.createdAt));
  const accepted = row.acceptedOfferId ? offerRows.find((o) => o.id === row.acceptedOfferId) : void 0;
  const myOfferIds = new Set(offerRows.filter((o) => o.providerUserId === viewerId).map((o) => o.id));
  const visibleOffers = isOwner ? offerRows : offerRows.filter(
    (o) => o.providerUserId === viewerId || o.id === row.acceptedOfferId || !!o.parentOfferId && myOfferIds.has(o.parentOfferId)
  );
  const canWrite = isOwner || (accepted ? accepted.providerUserId === viewerId : hasOffered);
  const myOffers = offerRows.filter((o) => o.providerUserId === viewerId);
  const myReview = await db.select({ id: reviews.id, rating: reviews.rating }).from(reviews).where(and2(eq3(reviews.requestId, requestId), eq3(reviews.authorId, viewerId))).limit(1);
  const viewerIsProvider = !isOwner;
  const viewerBalance = viewerIsProvider ? await walletBalance(viewerId) : 0;
  const commissionDue = accepted && accepted.providerUserId === viewerId ? commissionFor(row.agreedAmount ?? accepted.price) : null;
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
    counterpartId: isOwner ? accepted?.providerUserId ?? null : row.customerId
  };
}
async function isProviderUser(userId) {
  const [p] = await db.select({ role: providerProfiles.role }).from(providerProfiles).where(eq3(providerProfiles.userId, userId)).limit(1);
  return p?.role === "provider";
}
async function updateRequestStatus(input) {
  const detail = await getRequestDetail(input.requestId, input.viewerId);
  if (!detail) throw new ForbiddenError("\u0644\u0627 \u062A\u0645\u0644\u0643 \u0635\u0644\u0627\u062D\u064A\u0629 \u0639\u0644\u0649 \u0647\u0630\u0627 \u0627\u0644\u0637\u0644\u0628");
  const { request, isOwner, acceptedOffer } = detail;
  const isAcceptedProvider = !!acceptedOffer && acceptedOffer.providerUserId === input.viewerId;
  if (!isOwner && !isAcceptedProvider) throw new ForbiddenError("\u0644\u0627 \u062A\u0645\u0644\u0643 \u0635\u0644\u0627\u062D\u064A\u0629 \u0639\u0644\u0649 \u0647\u0630\u0627 \u0627\u0644\u0637\u0644\u0628");
  if (input.next === "cancelled") {
    if (!isOwner) throw new ForbiddenError("\u0625\u0644\u063A\u0627\u0621 \u0627\u0644\u0637\u0644\u0628 \u0645\u0646 \u062D\u0642 \u0627\u0644\u0632\u0628\u0648\u0646 \u0641\u0642\u0637");
    if (request.status !== "open") throw new InvalidStateError("\u0644\u0627 \u064A\u0645\u0643\u0646 \u0625\u0644\u063A\u0627\u0621 \u0637\u0644\u0628 \u062A\u062C\u0627\u0648\u0632 \u0645\u0631\u062D\u0644\u0629 \u0627\u0644\u0639\u0631\u0648\u0636");
  } else if (input.next === "in_progress") {
    if (request.status !== "accepted") throw new InvalidStateError("\u0627\u0644\u0637\u0644\u0628 \u0644\u064A\u0633 \u0641\u064A \u0645\u0631\u062D\u0644\u0629 \xAB\u0645\u0642\u0628\u0648\u0644\xBB");
    if (!isOwner && acceptedOffer) await assertProviderCanProceed(acceptedOffer.providerUserId);
  } else if (input.next === "completed") {
    if (request.status !== "in_progress") throw new InvalidStateError("\u0627\u0644\u0637\u0644\u0628 \u0644\u064A\u0633 \u0642\u064A\u062F \u0627\u0644\u062A\u0646\u0641\u064A\u0630");
    if (!isOwner && acceptedOffer) await assertProviderCanProceed(acceptedOffer.providerUserId);
  }
  const updated = await db.update(requests).set({ status: input.next, updatedAt: /* @__PURE__ */ new Date() }).where(and2(eq3(requests.id, input.requestId), eq3(requests.status, request.status))).returning();
  if (!updated.length) throw new ConflictError("\u062A\u063A\u064A\u0651\u0631\u062A \u062D\u0627\u0644\u0629 \u0627\u0644\u0637\u0644\u0628\u060C \u062D\u062F\u0651\u062B \u0627\u0644\u0635\u0641\u062D\u0629");
  if (input.next === "completed" && acceptedOffer) {
    await atomic2((d) => [
      d.update(providerProfiles).set({ completedJobs: sql`${providerProfiles.completedJobs} + 1`, updatedAt: /* @__PURE__ */ new Date() }).where(eq3(providerProfiles.userId, acceptedOffer.providerUserId)),
      d.insert(notifications).values({
        userId: request.customerId,
        type: "completed",
        title: "\u062A\u0645 \u0625\u062A\u0645\u0627\u0645 \u0627\u0644\u0637\u0644\u0628",
        body: `\u0623\u064F\u0646\u062C\u0632 \xAB${request.title}\xBB. \u0644\u0627 \u062A\u0646\u0633\u064E \u062A\u0642\u064A\u064A\u0645 \u0627\u0644\u062D\u0631\u0651\u0627\u0641.`,
        requestId: request.id
      }),
      d.insert(notifications).values({
        userId: acceptedOffer.providerUserId,
        type: "completed",
        title: "\u0623\u064F\u0646\u062C\u0632 \u0627\u0644\u0639\u0645\u0644",
        body: `\u062A\u0645 \u0625\u0646\u062C\u0627\u0632 \xAB${request.title}\xBB. \u062D\u0635\u0651\u0644 \u0623\u062C\u0631\u0643 \u0645\u0646 \u0627\u0644\u0632\u0628\u0648\u0646 \u0645\u0628\u0627\u0634\u0631\u0629.`,
        requestId: request.id
      })
    ]);
  } else {
    await notifyOtherParty({
      requestId: request.id,
      requestTitle: request.title,
      recipientId: isOwner ? acceptedOffer?.providerUserId ?? request.customerId : request.customerId,
      type: "status",
      title: input.next === "in_progress" ? "\u0628\u062F\u0623 \u062A\u0646\u0641\u064A\u0630 \u0627\u0644\u0637\u0644\u0628" : "\u0623\u064F\u0644\u063A\u064A \u0627\u0644\u0637\u0644\u0628"
    });
  }
  const fresh = await getRequestDetail(input.requestId, input.viewerId);
  if (!fresh) throw new NotFoundError("\u0627\u0644\u0637\u0644\u0628 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F");
  return fresh;
}
async function notifyOtherParty(input) {
  await db.insert(notifications).values({
    userId: input.recipientId,
    type: input.type,
    title: input.title,
    body: input.body ?? `\u0627\u0644\u0637\u0644\u0628: \xAB${input.requestTitle}\xBB`,
    requestId: input.requestId
  });
}
var offerColumns = {
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
  customerName: providerProfiles.displayName
};
async function listMyOffers(providerUserId) {
  return db.select(offerColumns).from(offers).innerJoin(requests, eq3(requests.id, offers.requestId)).innerJoin(serviceCategories, eq3(serviceCategories.id, requests.categoryId)).innerJoin(providerProfiles, eq3(providerProfiles.userId, requests.customerId)).where(eq3(offers.providerUserId, providerUserId)).orderBy(desc2(offers.createdAt));
}
async function listMyAcceptedJobs(providerUserId) {
  const rows = await db.select(requestListColumns).from(requests).innerJoin(serviceCategories, eq3(serviceCategories.id, requests.categoryId)).innerJoin(offers, eq3(offers.id, requests.acceptedOfferId)).where(and2(eq3(offers.providerUserId, providerUserId), inArray(requests.status, ["accepted", "in_progress", "completed"]))).orderBy(desc2(requests.updatedAt));
  const counts = await offerCountsByRequest(rows.map((r) => r.id));
  return rows.map((r) => ({ ...r, offerCount: counts.get(r.id) ?? 0 }));
}
async function createOffer(input) {
  const [req] = await db.select().from(requests).where(eq3(requests.id, input.requestId)).limit(1);
  if (!req) throw new NotFoundError("\u0627\u0644\u0637\u0644\u0628 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F");
  if (req.customerId === input.providerUserId) throw new ForbiddenError("\u0644\u0627 \u064A\u0645\u0643\u0646\u0643 \u0627\u0644\u0639\u0631\u0636 \u0639\u0644\u0649 \u0637\u0644\u0628\u0643");
  if (req.status !== "open") throw new InvalidStateError("\u0627\u0644\u0637\u0644\u0628 \u0644\u0645 \u064A\u0639\u062F \u064A\u0633\u062A\u0642\u0628\u0644 \u0639\u0631\u0648\u0636\u0627\u064B");
  if (!await providerCanOffer(input.providerUserId)) {
    throw new InvalidStateError("\u0627\u0634\u062D\u0646 \u062D\u0633\u0627\u0628\u0643 \u0644\u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0639\u0631\u0636");
  }
  const [existing] = await db.select().from(offers).where(and2(eq3(offers.requestId, input.requestId), eq3(offers.providerUserId, input.providerUserId))).limit(1);
  try {
    if (existing) {
      const [row2] = await db.update(offers).set({
        price: input.price,
        durationMinutes: input.durationMinutes,
        message: input.message,
        status: "pending",
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq3(offers.id, existing.id)).returning();
      await notifyOtherParty({
        requestId: input.requestId,
        requestTitle: req.title,
        recipientId: req.customerId,
        type: "offer",
        title: "\u0639\u0631\u0636 \u0645\u062D\u062F\u064E\u0651\u062B \u0639\u0644\u0649 \u0637\u0644\u0628\u0643",
        body: `\xAB${req.title}\xBB: \u0639\u0631\u0636 \u062C\u062F\u064A\u062F \u0628\u0640 ${input.price} \u062F\u0631\u0647\u0645.`
      });
      return row2;
    }
    const [row] = await db.insert(offers).values({
      requestId: input.requestId,
      providerUserId: input.providerUserId,
      price: input.price,
      durationMinutes: input.durationMinutes,
      message: input.message
    }).returning();
    await notifyOtherParty({
      requestId: input.requestId,
      requestTitle: req.title,
      recipientId: req.customerId,
      type: "offer",
      title: "\u0648\u0635\u0644 \u0639\u0631\u0636 \u062C\u062F\u064A\u062F \u0639\u0644\u0649 \u0637\u0644\u0628\u0643",
      body: `\xAB${req.title}\xBB: \u0639\u0631\u0636 \u0628\u0640 ${input.price} \u062F\u0631\u0647\u0645.`
    });
    return row;
  } catch (e) {
    if (isUniqueViolation(e)) throw new ConflictError("\u0642\u062F\u0651\u0645\u062A \u0639\u0631\u0636\u0627\u064B \u0639\u0644\u0649 \u0647\u0630\u0627 \u0627\u0644\u0637\u0644\u0628 \u0628\u0627\u0644\u0641\u0639\u0644");
    throw e;
  }
}
async function withdrawOffer(offerId, providerUserId) {
  const [row] = await db.update(offers).set({ status: "withdrawn", updatedAt: /* @__PURE__ */ new Date() }).where(and2(eq3(offers.id, offerId), eq3(offers.providerUserId, providerUserId), eq3(offers.status, "pending"))).returning();
  if (!row) throw new InvalidStateError("\u0644\u0627 \u064A\u0645\u0643\u0646 \u0633\u062D\u0628 \u0647\u0630\u0627 \u0627\u0644\u0639\u0631\u0636 (\u0644\u064A\u0633 \u0645\u0639\u0644\u0651\u0642\u0627\u064B \u0623\u0648 \u0644\u064A\u0633 \u0644\u0643)");
  return row;
}
async function acceptOffer(offerId, customerId) {
  const [row] = await db.select({
    id: offers.id,
    requestId: offers.requestId,
    providerUserId: offers.providerUserId,
    price: offers.price,
    message: offers.message,
    status: offers.status,
    customerId: requests.customerId,
    requestTitle: requests.title,
    requestStatus: requests.status
  }).from(offers).innerJoin(requests, eq3(requests.id, offers.requestId)).where(eq3(offers.id, offerId)).limit(1);
  if (!row) throw new NotFoundError("\u0627\u0644\u0639\u0631\u0636 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F");
  if (row.customerId !== customerId) throw new ForbiddenError("\u0627\u0644\u0642\u0628\u0648\u0644 \u0645\u0646 \u062D\u0642 \u0635\u0627\u062D\u0628 \u0627\u0644\u0637\u0644\u0628 \u0641\u0642\u0637");
  if (row.requestStatus !== "open") throw new InvalidStateError("\u0627\u0644\u0637\u0644\u0628 \u0644\u0645 \u064A\u0639\u062F \u0645\u0641\u062A\u0648\u062D\u0627\u064B");
  if (row.status !== "pending") throw new InvalidStateError("\u0647\u0630\u0627 \u0627\u0644\u0639\u0631\u0636 \u0644\u0645 \u064A\u0639\u062F \u0645\u0639\u0644\u0651\u0642\u0627\u064B");
  const otherPending = await db.select({ id: offers.id, providerUserId: offers.providerUserId }).from(offers).where(and2(eq3(offers.requestId, row.requestId), eq3(offers.status, "pending"), ne(offers.id, offerId)));
  const winner = await db.update(offers).set({ status: "accepted", updatedAt: /* @__PURE__ */ new Date() }).where(and2(eq3(offers.id, offerId), eq3(offers.status, "pending"))).returning();
  if (!winner.length) throw new ConflictError("\u0633\u0628\u0642\u0643 \u062A\u063A\u064A\u064A\u0631 \u0639\u0644\u0649 \u0627\u0644\u0639\u0631\u0648\u0636\u060C \u062D\u062F\u0651\u062B \u0627\u0644\u0635\u0641\u062D\u0629");
  const updatedReq = await db.update(requests).set({
    status: "accepted",
    acceptedOfferId: offerId,
    agreedAmount: row.price,
    updatedAt: /* @__PURE__ */ new Date()
  }).where(and2(eq3(requests.id, row.requestId), eq3(requests.status, "open"))).returning();
  if (!updatedReq.length) throw new ConflictError("\u0633\u0628\u0642\u0643 \u062A\u063A\u064A\u064A\u0631 \u0639\u0644\u0649 \u0627\u0644\u0637\u0644\u0628\u060C \u062D\u062F\u0651\u062B \u0627\u0644\u0635\u0641\u062D\u0629");
  const commission = await chargeCommission(
    row.providerUserId,
    row.requestId,
    row.requestTitle,
    row.price
  );
  await atomic2(
    (d) => asBatch([
      d.update(offers).set({ status: "rejected", updatedAt: /* @__PURE__ */ new Date() }).where(and2(eq3(offers.requestId, row.requestId), eq3(offers.status, "pending"))),
      d.insert(notifications).values({
        userId: row.providerUserId,
        type: "accepted",
        title: "\u062A\u0645 \u0642\u0628\u0648\u0644 \u0639\u0631\u0636\u0643 \u{1F389}",
        body: `\u0642\u0628\u0644 \u0627\u0644\u0632\u0628\u0648\u0646 \u0639\u0631\u0636\u0643 \u0639\u0644\u0649 \xAB${row.requestTitle}\xBB \u0628\u0640 ${row.price} \u062F\u0631\u0647\u0645. \u062A\u0648\u0627\u0635\u0644 \u0645\u0639\u0647 \u0644\u062A\u062D\u062F\u064A\u062F \u0645\u0648\u0639\u062F \u0627\u0644\u062A\u0646\u0641\u064A\u0630.`,
        requestId: row.requestId
      }),
      d.insert(notifications).values({
        userId: row.customerId,
        type: "accepted",
        title: "\u062A\u0645 \u062A\u062B\u0628\u064A\u062A \u0627\u0644\u0633\u0639\u0631 \u0627\u0644\u0645\u0642\u0628\u0648\u0644",
        body: `\u0627\u062A\u0641\u0642\u062A \u0639\u0644\u0649 \xAB${row.requestTitle}\xBB \u0628\u0640 ${row.price} \u062F\u0631\u0647\u0645.`,
        requestId: row.requestId
      }),
      ...commission.charged ? [
        d.insert(notifications).values({
          userId: row.providerUserId,
          type: "fee",
          title: "\u062E\u064F\u0635\u0645\u062A \u0639\u0645\u0648\u0644\u0629 \u0627\u0644\u0645\u0646\u0635\u0651\u0629",
          body: `\u062E\u064F\u0635\u0645\u062A ${commission.fee} \u062F\u0631\u0647\u0645 \u0639\u0645\u0648\u0644\u0629\u064B \u0639\u0644\u0649 \xAB${row.requestTitle}\xBB. \u0631\u0635\u064A\u062F\u0643 \u0627\u0644\u0645\u062A\u0628\u0642\u0651\u064A ${commission.balanceAfter} \u062F\u0631\u0647\u0645.`,
          requestId: row.requestId
        })
      ] : [
        d.insert(notifications).values({
          userId: row.providerUserId,
          type: "fee",
          title: "\u0627\u0634\u062D\u0646 \u0631\u0635\u064A\u062F\u0643 \u0644\u0625\u0643\u0645\u0627\u0644 \u0627\u0644\u0645\u0631\u0627\u062D\u0644 \u0645\u0639 \u0627\u0644\u0632\u0628\u0648\u0646",
          body: `\u0639\u0645\u0648\u0644\u0629 \xAB${row.requestTitle}\xBB \u0647\u064A ${commission.fee} \u062F\u0631\u0647\u0645 \u0648\u0631\u0635\u064A\u062F\u0643 \u0644\u0627 \u064A\u0643\u0641\u064A (${commission.balanceAfter} \u062F\u0631\u0647\u0645). \u0627\u0634\u062D\u0646 \u062D\u0633\u0627\u0628\u0643 \u0644\u0628\u062F\u0621 \u0627\u0644\u062A\u0646\u0641\u064A\u0630.`,
          requestId: row.requestId
        })
      ],
      ...otherPending.length ? [
        d.insert(notifications).values(
          otherPending.map((o) => ({
            userId: o.providerUserId,
            type: "rejected",
            title: "\u0627\u0639\u062A\u0630\u0627\u0631 \u0639\u0646 \u0639\u0631\u0636\u0643",
            body: `\u0627\u062E\u062A\u0627\u0631 \u0627\u0644\u0632\u0628\u0648\u0646 \u0639\u0631\u0636\u0627\u064B \u0622\u062E\u0631 \u0639\u0644\u0649 \xAB${row.requestTitle}\xBB.`,
            requestId: row.requestId
          }))
        )
      ] : []
    ])
  );
  return {
    ok: true,
    requestId: row.requestId,
    commissionFee: commission.fee,
    balanceAfter: commission.balanceAfter,
    needsTopup: !commission.charged
  };
}
async function rejectOffer(offerId, customerId) {
  const [row] = await db.select({ id: offers.id, requestId: offers.requestId, providerUserId: offers.providerUserId, customerId: requests.customerId, title: requests.title }).from(offers).innerJoin(requests, eq3(requests.id, offers.requestId)).where(eq3(offers.id, offerId)).limit(1);
  if (!row) throw new NotFoundError("\u0627\u0644\u0639\u0631\u0636 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F");
  if (row.customerId !== customerId) throw new ForbiddenError("\u0627\u0644\u0631\u0641\u0636 \u0645\u0646 \u062D\u0642 \u0635\u0627\u062D\u0628 \u0627\u0644\u0637\u0644\u0628 \u0641\u0642\u0637");
  const [out] = await db.update(offers).set({ status: "rejected", updatedAt: /* @__PURE__ */ new Date() }).where(and2(eq3(offers.id, offerId), eq3(offers.status, "pending"))).returning();
  if (!out) throw new InvalidStateError("\u0647\u0630\u0627 \u0627\u0644\u0639\u0631\u0636 \u0644\u0645 \u064A\u0639\u062F \u0645\u0639\u0644\u0651\u0642\u0627\u064B");
  await notifyOtherParty({
    requestId: row.requestId,
    requestTitle: row.title,
    recipientId: row.providerUserId,
    type: "rejected",
    title: "\u0627\u0639\u062A\u0630\u0627\u0631 \u0639\u0646 \u0639\u0631\u0636\u0643",
    body: `\u0631\u0641\u0636 \u0627\u0644\u0632\u0628\u0648\u0646 \u0639\u0631\u0636\u0643 \u0639\u0644\u0649 \xAB${row.title}\xBB.`
  });
  return { ok: true };
}
async function counterOffer(input) {
  const [row] = await db.select({
    id: offers.id,
    requestId: offers.requestId,
    providerUserId: offers.providerUserId,
    customerId: requests.customerId,
    title: requests.title,
    status: offers.status,
    requestStatus: requests.status
  }).from(offers).innerJoin(requests, eq3(requests.id, offers.requestId)).where(eq3(offers.id, input.offerId)).limit(1);
  if (!row) throw new NotFoundError("\u0627\u0644\u0639\u0631\u0636 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F");
  if (row.customerId !== input.customerId) throw new ForbiddenError("\u0627\u0644\u062A\u0641\u0627\u0648\u0636 \u0645\u0646 \u062D\u0642 \u0635\u0627\u062D\u0628 \u0627\u0644\u0637\u0644\u0628 \u0641\u0642\u0637");
  if (row.requestStatus !== "open") throw new InvalidStateError("\u0627\u0644\u0637\u0644\u0628 \u0644\u0645 \u064A\u0639\u062F \u0645\u0641\u062A\u0648\u062D\u0627\u064B");
  if (row.status !== "pending") throw new InvalidStateError("\u0647\u0630\u0627 \u0627\u0644\u0639\u0631\u0636 \u0644\u0645 \u064A\u0639\u062F \u0645\u0639\u0644\u0651\u0642\u0627\u064B");
  const counterId = crypto.randomUUID();
  await atomic2((d) => [
    d.insert(offers).values({
      id: counterId,
      requestId: row.requestId,
      providerUserId: row.customerId,
      // الطرف المقترِح هو الزبون
      price: input.price,
      durationMinutes: input.durationMinutes,
      message: input.message,
      status: "countered",
      parentOfferId: input.offerId
    }),
    d.update(offers).set({ status: "countered", updatedAt: /* @__PURE__ */ new Date() }).where(and2(eq3(offers.id, input.offerId), eq3(offers.status, "pending"))),
    d.insert(notifications).values({
      userId: row.providerUserId,
      type: "counter",
      title: "\u0639\u0631\u0636 \u0645\u0636\u0627\u062F \u0645\u0646 \u0627\u0644\u0632\u0628\u0648\u0646",
      body: `\xAB${row.title}\xBB: \u0627\u0644\u0632\u0628\u0648\u0646 \u064A\u0642\u062A\u0631\u062D ${input.price} \u062F\u0631\u0647\u0645 / ${input.durationMinutes} \u062F\u0642\u064A\u0642\u0629.`,
      requestId: row.requestId
    })
  ]);
  return { ok: true };
}
async function respondToCounter(input) {
  const [counter] = await db.select().from(offers).where(eq3(offers.id, input.counterId)).limit(1);
  if (!counter || counter.status !== "countered") throw new InvalidStateError("\u0627\u0644\u0639\u0631\u0636 \u0627\u0644\u0645\u0636\u0627\u062F \u063A\u064A\u0631 \u0645\u062A\u0627\u062D");
  const [req] = await db.select().from(requests).where(eq3(requests.id, counter.requestId)).limit(1);
  if (!req) throw new NotFoundError("\u0627\u0644\u0637\u0644\u0628 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F");
  if (req.customerId !== counter.providerUserId) throw new ForbiddenError("\u0644\u064A\u0633 \u0639\u0631\u0636\u0627\u064B \u0645\u0636\u0627\u062F\u0627\u064B \u0644\u0643");
  const parentId = counter.parentOfferId;
  const [original] = parentId ? await db.select().from(offers).where(eq3(offers.id, parentId)).limit(1) : [void 0];
  if (!original || original.providerUserId !== input.providerUserId) {
    throw new ForbiddenError("\u0627\u0644\u0639\u0631\u0636 \u0627\u0644\u0645\u0636\u0627\u062F \u0644\u064A\u0633 \u0645\u0648\u062C\u0651\u0647\u0627\u064B \u0625\u0644\u064A\u0643");
  }
  if (!input.accept) {
    const [out] = await db.update(offers).set({ status: "rejected", updatedAt: /* @__PURE__ */ new Date() }).where(and2(eq3(offers.id, counter.id), eq3(offers.status, "countered"))).returning();
    if (!out) throw new ConflictError("\u062A\u063A\u064A\u0651\u0631\u062A \u062D\u0627\u0644\u0629 \u0627\u0644\u0639\u0631\u0636 \u0627\u0644\u0645\u0636\u0627\u062F");
    await notifyOtherParty({
      requestId: req.id,
      requestTitle: req.title,
      recipientId: req.customerId,
      type: "rejected",
      title: "\u0631\u0641\u0636 \u0627\u0644\u062D\u0631\u0651\u0627\u0641 \u0627\u0644\u0639\u0631\u0636 \u0627\u0644\u0645\u0636\u0627\u062F",
      body: `\xAB${req.title}\xBB \u0645\u0627 \u0632\u0627\u0644 \u0645\u0641\u062A\u0648\u062D\u0627\u064B \u2014 \u064A\u0645\u0643\u0646\u0643 \u0627\u0646\u062A\u0638\u0627\u0631 \u0639\u0631\u0636 \u0622\u062E\u0631.`
    });
    return { ok: true, accepted: false };
  }
  const agreedPrice = input.price ?? counter.price;
  const commission = await chargeCommission(input.providerUserId, req.id, req.title, agreedPrice);
  await atomic2((d) => [
    d.update(offers).set({ status: "accepted", updatedAt: /* @__PURE__ */ new Date() }).where(eq3(offers.id, counter.id)),
    d.update(offers).set({ status: "accepted", updatedAt: /* @__PURE__ */ new Date() }).where(eq3(offers.id, original.id)),
    d.update(offers).set({ status: "rejected", updatedAt: /* @__PURE__ */ new Date() }).where(
      and2(
        eq3(offers.requestId, req.id),
        ne(offers.id, counter.id),
        ne(offers.id, original.id),
        eq3(offers.status, "pending")
      )
    ),
    d.update(requests).set({
      status: "accepted",
      acceptedOfferId: original.id,
      agreedAmount: agreedPrice,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(and2(eq3(requests.id, req.id), eq3(requests.status, "open"))),
    d.insert(notifications).values({
      userId: req.customerId,
      type: "accepted",
      title: "\u0648\u0627\u0641\u0642 \u0627\u0644\u062D\u0631\u0651\u0627\u0641 \u0639\u0644\u0649 \u0639\u0631\u0636\u0643 \u0627\u0644\u0645\u0636\u0627\u062F",
      body: `\u0627\u062A\u0641\u0642\u062A\u0645\u0627 \u0639\u0644\u0649 ${agreedPrice} \u062F\u0631\u0647\u0645 \u0644\u0640 \xAB${req.title}\xBB.`,
      requestId: req.id
    }),
    d.insert(notifications).values({
      userId: input.providerUserId,
      type: "accepted",
      title: "\u062A\u0645 \u0627\u0644\u0627\u062A\u0641\u0627\u0642",
      body: `\u062A\u0645 \u0625\u0633\u0646\u0627\u062F \xAB${req.title}\xBB \u0625\u0644\u064A\u0643 \u0628\u0640 ${agreedPrice} \u062F\u0631\u0647\u0645.`,
      requestId: req.id
    }),
    d.insert(notifications).values({
      userId: input.providerUserId,
      type: commission.charged ? "fee" : "topup",
      title: commission.charged ? "\u062E\u064F\u0635\u0645\u062A \u0639\u0645\u0648\u0644\u0629 \u0627\u0644\u0645\u0646\u0635\u0651\u0629" : "\u0627\u0634\u062D\u0646 \u0631\u0635\u064A\u062F\u0643 \u0644\u0625\u0643\u0645\u0627\u0644 \u0627\u0644\u0645\u0631\u0627\u062D\u0644 \u0645\u0639 \u0627\u0644\u0632\u0628\u0648\u0646",
      body: commission.charged ? `\u062E\u064F\u0635\u0645\u062A ${commission.fee} \u062F\u0631\u0647\u0645 \u0639\u0645\u0648\u0644\u0629\u064B \u0639\u0644\u0649 \xAB${req.title}\xBB. \u0631\u0635\u064A\u062F\u0643 \u0627\u0644\u0645\u062A\u0628\u0642\u0651\u064A ${commission.balanceAfter} \u062F\u0631\u0647\u0645.` : `\u0639\u0645\u0648\u0644\u0629 \xAB${req.title}\xBB \u0647\u064A ${commission.fee} \u062F\u0631\u0647\u0645 \u0648\u0631\u0635\u064A\u062F\u0643 \u0644\u0627 \u064A\u0643\u0641\u064A (${commission.balanceAfter} \u062F\u0631\u0647\u0645). \u0627\u0634\u062D\u0646 \u062D\u0633\u0627\u0628\u0643 \u0644\u0628\u062F\u0621 \u0627\u0644\u062A\u0646\u0641\u064A\u0630.`,
      requestId: req.id
    })
  ]);
  return {
    ok: true,
    accepted: true,
    agreedAmount: agreedPrice,
    commissionFee: commission.fee,
    balanceAfter: commission.balanceAfter,
    needsTopup: !commission.charged
  };
}
async function listMessages(requestId, viewerId) {
  const detail = await getRequestDetail(requestId, viewerId);
  if (!detail) throw new ForbiddenError("\u0644\u0627 \u062A\u0645\u0644\u0643 \u0635\u0644\u0627\u062D\u064A\u0629 \u0639\u0644\u0649 \u0647\u0630\u0647 \u0627\u0644\u0645\u062D\u0627\u062F\u062B\u0629");
  const conds = [eq3(messages.requestId, requestId)];
  if (!detail.isOwner) {
    conds.push(inArray(messages.senderId, [viewerId, detail.request.customerId]));
  }
  return db.select({
    id: messages.id,
    requestId: messages.requestId,
    senderId: messages.senderId,
    body: messages.body,
    createdAt: messages.createdAt,
    senderName: providerProfiles.displayName
  }).from(messages).innerJoin(providerProfiles, eq3(providerProfiles.userId, messages.senderId)).where(and2(...conds)).orderBy(messages.createdAt);
}
async function sendMessage(input) {
  const detail = await getRequestDetail(input.requestId, input.senderId);
  if (!detail) throw new ForbiddenError("\u0644\u0627 \u062A\u0645\u0644\u0643 \u0635\u0644\u0627\u062D\u064A\u0629 \u0639\u0644\u0649 \u0647\u0630\u0647 \u0627\u0644\u0645\u062D\u0627\u062F\u062B\u0629");
  if (!detail.canWriteMessages) throw new ForbiddenError("\u0627\u0644\u0645\u062D\u0627\u062F\u062B\u0629 \u0645\u062A\u0627\u062D\u0629 \u0644\u0644\u0637\u0631\u0641\u064A\u0646 \u0627\u0644\u0645\u062A\u0639\u0627\u0642\u062F\u064A\u0646");
  const [row] = await db.insert(messages).values({ requestId: input.requestId, senderId: input.senderId, body: input.body }).returning();
  const recipientId = detail.isOwner ? detail.acceptedOffer?.providerUserId ?? detail.offers.find((o) => o.providerUserId !== input.senderId)?.providerUserId : detail.request.customerId;
  if (recipientId && recipientId !== input.senderId) {
    await db.insert(notifications).values({
      userId: recipientId,
      type: "message",
      title: "\u0631\u0633\u0627\u0644\u0629 \u062C\u062F\u064A\u062F\u0629",
      body: `\u0631\u0633\u0627\u0644\u0629 \u0639\u0644\u0649 \xAB${detail.request.title}\xBB.`,
      requestId: input.requestId
    });
  }
  return row;
}
async function createReview(input) {
  const detail = await getRequestDetail(input.requestId, input.authorId);
  if (!detail) throw new ForbiddenError("\u0644\u0627 \u062A\u0645\u0644\u0643 \u0635\u0644\u0627\u062D\u064A\u0629 \u0639\u0644\u0649 \u0647\u0630\u0627 \u0627\u0644\u0637\u0644\u0628");
  if (detail.request.status !== "completed") throw new InvalidStateError("\u0627\u0644\u062A\u0642\u064A\u064A\u0645 \u0628\u0639\u062F \u0625\u062A\u0645\u0627\u0645 \u0627\u0644\u0637\u0644\u0628 \u0641\u0642\u0637");
  const isOwner = detail.isOwner;
  const accepted = detail.acceptedOffer;
  if (!isOwner && accepted?.providerUserId !== input.authorId) {
    throw new ForbiddenError("\u0627\u0644\u062A\u0642\u064A\u064A\u0645 \u0644\u0644\u0637\u0631\u0641\u064A\u0646 \u0627\u0644\u0645\u062A\u0639\u0627\u0642\u062F\u064A\u0646 \u0641\u0642\u0637");
  }
  const targetId = isOwner ? accepted?.providerUserId : detail.request.customerId;
  if (!targetId) throw new InvalidStateError("\u0644\u0627 \u064A\u0648\u062C\u062F \u0637\u0631\u0641 \u0645\u0642\u0627\u0628\u0644 \u0644\u0644\u062A\u0642\u064A\u064A\u0645");
  if (targetId === input.authorId) throw new ForbiddenError("\u0644\u0627 \u064A\u0645\u0643\u0646\u0643 \u062A\u0642\u064A\u064A\u0645 \u0646\u0641\u0633\u0643");
  try {
    const [row] = await db.insert(reviews).values({
      requestId: input.requestId,
      authorId: input.authorId,
      targetId,
      rating: input.rating,
      comment: input.comment ?? null
    }).returning();
    await db.update(providerProfiles).set({
      ratingSum: sql`${providerProfiles.ratingSum} + ${input.rating}`,
      ratingCount: sql`${providerProfiles.ratingCount} + 1`,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq3(providerProfiles.userId, targetId));
    await notifyOtherParty({
      requestId: input.requestId,
      requestTitle: detail.request.title,
      recipientId: targetId,
      type: "review",
      title: "\u062A\u0642\u064A\u064A\u0645 \u062C\u062F\u064A\u062F",
      body: `\u062D\u0635\u0644\u062A \u0639\u0644\u0649 ${input.rating}/5 \u0639\u0644\u0649 \xAB${detail.request.title}\xBB.`
    });
    return row;
  } catch (e) {
    if (isUniqueViolation(e)) throw new ConflictError("\u0642\u064A\u0651\u0645\u062A \u0647\u0630\u0627 \u0627\u0644\u0637\u0644\u0628 \u0628\u0627\u0644\u0641\u0639\u0644");
    throw e;
  }
}
async function listReviewsForUser(userId) {
  return db.select({
    id: reviews.id,
    rating: reviews.rating,
    comment: reviews.comment,
    createdAt: reviews.createdAt,
    authorName: providerProfiles.displayName,
    requestTitle: requests.title
  }).from(reviews).innerJoin(providerProfiles, eq3(providerProfiles.userId, reviews.authorId)).innerJoin(requests, eq3(requests.id, reviews.requestId)).where(eq3(reviews.targetId, userId)).orderBy(desc2(reviews.createdAt));
}
async function listWallet(userId) {
  const rows = await db.select({
    id: walletTransactions.id,
    requestId: walletTransactions.requestId,
    type: walletTransactions.type,
    amount: walletTransactions.amount,
    description: walletTransactions.description,
    createdAt: walletTransactions.createdAt,
    requestTitle: requests.title
  }).from(walletTransactions).leftJoin(requests, eq3(requests.id, walletTransactions.requestId)).where(eq3(walletTransactions.userId, userId)).orderBy(desc2(walletTransactions.createdAt)).limit(200);
  const balance = rows.reduce((sum, r) => sum + r.amount, 0);
  const earnings = rows.filter((r) => r.amount > 0).reduce((s, r) => s + r.amount, 0);
  const spend = rows.filter((r) => r.amount < 0).reduce((s, r) => s + r.amount, 0);
  return { rows, balance, earnings, spend };
}
async function walletBalance(userId) {
  const [row] = await db.select({ total: sql`coalesce(sum(${walletTransactions.amount}), 0)::int` }).from(walletTransactions).where(eq3(walletTransactions.userId, userId));
  return Number(row?.total ?? 0);
}
function commissionFor(agreedAmount) {
  return Math.round(agreedAmount * PLATFORM_FEE_PERCENT / 100);
}
async function chargeCommission(providerUserId, requestId, requestTitle, agreedAmount) {
  const fee = commissionFor(agreedAmount);
  const before = await walletBalance(providerUserId);
  const balanceAfter = before - fee;
  const charged = balanceAfter >= 0;
  await db.insert(walletTransactions).values({
    userId: providerUserId,
    requestId,
    type: "fee",
    amount: -fee,
    description: charged ? `\u0639\u0645\u0648\u0644\u0629 \u0627\u0644\u0645\u0646\u0635\u0651\u0629 ${PLATFORM_FEE_PERCENT}% \u0639\u0644\u0649 \xAB${requestTitle}\xBB` : `\u0639\u0645\u0648\u0644\u0629 \u0627\u0644\u0645\u0646\u0635\u0651\u0629 ${PLATFORM_FEE_PERCENT}% \u0639\u0644\u0649 \xAB${requestTitle}\xBB \u2014 \u0627\u0644\u0631\u0635\u064A\u062F \u0646\u0627\u0642\u0635\u060C \u0627\u0634\u062D\u0646 \u062D\u0633\u0627\u0628\u0643`
  });
  return { fee, balanceAfter, charged };
}
async function assertProviderCanProceed(providerUserId) {
  const balance = await walletBalance(providerUserId);
  if (balance < 0) {
    throw new InvalidStateError("\u0627\u0634\u062D\u0646 \u0631\u0635\u064A\u062F\u0643 \u0644\u0625\u0643\u0645\u0627\u0644 \u0627\u0644\u0645\u0631\u0627\u062D\u0644 \u0645\u0639 \u0627\u0644\u0632\u0628\u0648\u0646");
  }
}
async function providerCanOffer(providerUserId) {
  return await walletBalance(providerUserId) > 0;
}
async function topupWallet(userId, amount) {
  if (amount <= 0) throw new InvalidStateError("\u0627\u0644\u0645\u0628\u0644\u063A \u064A\u062C\u0628 \u0623\u0646 \u064A\u0643\u0648\u0646 \u0623\u0643\u0628\u0631 \u0645\u0646 \u0635\u0641\u0631");
  const [row] = await db.insert(walletTransactions).values({
    userId,
    type: "topup",
    amount,
    description: "\u0634\u062D\u0646 \u0627\u0644\u0645\u062D\u0641\u0638\u0629"
  }).returning();
  const balance = await walletBalance(userId);
  if (balance >= 0) {
    await db.insert(notifications).values({
      userId,
      type: "topup",
      title: "\u062A\u0645 \u0634\u062D\u0646 \u062D\u0633\u0627\u0628\u0643",
      body: `\u0623\u064F\u0636\u064A\u0641 ${amount} \u062F\u0631\u0647\u0645 \u0625\u0644\u0649 \u0631\u0635\u064A\u062F\u0643. \u064A\u0645\u0643\u0646\u0643 \u0627\u0644\u0622\u0646 \u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0639\u0631\u0648\u0636.`
    });
  }
  return { ...row, balance };
}
async function listNotifications(userId, limit = 60) {
  const rows = await db.select().from(notifications).where(eq3(notifications.userId, userId)).orderBy(desc2(notifications.createdAt)).limit(limit);
  const unread = rows.filter((r) => !r.isRead).length;
  return { rows, unread };
}
async function unreadNotificationCount(userId) {
  const [row] = await db.select({ count: sql`count(*)::int` }).from(notifications).where(and2(eq3(notifications.userId, userId), eq3(notifications.isRead, false)));
  return Number(row?.count ?? 0);
}
async function markNotificationRead(id, userId) {
  const [row] = await db.update(notifications).set({ isRead: true }).where(and2(eq3(notifications.id, id), eq3(notifications.userId, userId))).returning();
  if (!row) throw new NotFoundError("\u0627\u0644\u0625\u0634\u0639\u0627\u0631 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F");
  return row;
}
async function markAllNotificationsRead(userId) {
  await db.update(notifications).set({ isRead: true }).where(eq3(notifications.userId, userId));
  return { ok: true };
}
async function customerDashboard(userId) {
  const [counts] = await db.select({
    total: sql`count(*)::int`,
    open: sql`count(*) filter (where ${requests.status} = 'open')::int`,
    accepted: sql`count(*) filter (where ${requests.status} in ('accepted','in_progress'))::int`,
    completed: sql`count(*) filter (where ${requests.status} = 'completed')::int`
  }).from(requests).where(eq3(requests.customerId, userId));
  const pendingOffers = await db.select({ count: sql`count(*)::int` }).from(offers).innerJoin(requests, eq3(requests.id, offers.requestId)).where(and2(eq3(requests.customerId, userId), eq3(offers.status, "pending")));
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
      unread
    },
    recent: recent.slice(0, 5)
  };
}
async function providerDashboard(userId) {
  const profile = await getProfile(userId);
  const city = profile?.city ?? "\u0627\u0644\u062F\u0627\u0631 \u0627\u0644\u0628\u064A\u0636\u0627\u0621";
  const open = await countOpenRequestsNear(city);
  const [offerStats] = await db.select({
    total: sql`count(*)::int`,
    pending: sql`count(*) filter (where ${offers.status} = 'pending')::int`,
    accepted: sql`count(*) filter (where ${offers.status} = 'accepted')::int`,
    rejected: sql`count(*) filter (where ${offers.status} = 'rejected')::int`
  }).from(offers).where(eq3(offers.providerUserId, userId));
  const jobs = await listMyAcceptedJobs(userId);
  const wallet = await listWallet(userId);
  const unread = await unreadNotificationCount(userId);
  const fresh = await browseOpenRequests({
    providerUserId: userId,
    providerCity: city,
    providerDistrict: profile?.district ?? null,
    city,
    limit: 5
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
      unread
    },
    fresh,
    jobs: jobs.slice(0, 5)
  };
}

// server/routers.ts
function toTRPCError(e) {
  if (e instanceof NotFoundError) throw new TRPCError2({ code: "NOT_FOUND", message: e.message });
  if (e instanceof ForbiddenError) throw new TRPCError2({ code: "FORBIDDEN", message: e.message });
  if (e instanceof ConflictError) throw new TRPCError2({ code: "CONFLICT", message: e.message });
  if (e instanceof InvalidStateError) throw new TRPCError2({ code: "BAD_REQUEST", message: e.message });
  if (isUniqueViolation(e)) {
    throw new TRPCError2({ code: "CONFLICT", message: "\u0647\u0630\u0647 \u0627\u0644\u0642\u064A\u0645\u0629 \u0645\u0633\u062A\u0639\u0645\u0644\u0629 \u0645\u0646 \u0642\u0628\u0644" });
  }
  throw e;
}
function guarded(fn) {
  return fn().catch((e) => toTRPCError(e));
}
function fail(code, message) {
  throw new TRPCError2({ code, message });
}
var authRouter = router({
  me: publicProcedure.query(({ ctx }) => ctx.user),
  signup: publicProcedure.input(
    z.object({
      email: z.email(),
      password: z.string().min(8),
      name: z.string().min(2).optional()
    })
  ).mutation(async ({ ctx, input }) => {
    try {
      const user = await registerLocalUser(input.email, input.password, input.name);
      await ensureProfile({
        userId: user.id,
        displayName: input.name ?? user.email.split("@")[0],
        city: MOROCCAN_CITIES[0]
      });
      await authProvider().login(ctx.c, input.email, input.password);
      return user;
    } catch (e) {
      if (e instanceof EmailTakenError) return fail("CONFLICT", e.message);
      throw e;
    }
  }),
  login: publicProcedure.input(z.object({ email: z.email(), password: z.string() })).mutation(async ({ ctx, input }) => {
    try {
      const user = await authProvider().login(ctx.c, input.email, input.password);
      await ensureProfile({
        userId: user.id,
        displayName: user.name ?? user.email.split("@")[0],
        city: MOROCCAN_CITIES[0]
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
  })
});
var categoriesRouter = router({
  list: publicProcedure.query(() => listCategories())
});
var profileRouter = router({
  /** ملفي + مهاراتي + أعمالي (يُنشَأ الملف تلقائياً إن لم يوجد). */
  me: protectedProcedure.query(async ({ ctx }) => {
    const profile = await ensureProfile({
      userId: ctx.user.id,
      displayName: ctx.user.name ?? ctx.user.email.split("@")[0],
      city: MOROCCAN_CITIES[0]
    });
    const [skills, works, wallet] = await Promise.all([
      listMySkills(ctx.user.id),
      listWorks(ctx.user.id),
      listWallet(ctx.user.id)
    ]);
    return {
      profile,
      skillIds: skills.map((s) => s.categoryId),
      works,
      balance: wallet.balance
    };
  }),
  update: protectedProcedure.input(
    z.object({
      displayName: z.string().min(2).optional(),
      phone: z.string().max(20).nullable().optional(),
      bio: z.string().max(600).nullable().optional(),
      city: z.enum(MOROCCAN_CITIES).optional(),
      district: z.string().max(60).nullable().optional(),
      yearsExperience: z.number().int().min(0).max(60).optional(),
      hourlyNote: z.string().max(160).nullable().optional(),
      isVerified: z.boolean().optional()
    })
  ).mutation(({ ctx, input }) => guarded(() => updateProfile(ctx.user.id, input))),
  setRole: protectedProcedure.input(z.object({ role: z.enum(APP_ROLES) })).mutation(({ ctx, input }) => guarded(() => setRole(ctx.user.id, input.role))),
  setSkills: protectedProcedure.input(z.object({ categoryIds: z.array(z.uuid()).max(12) })).mutation(
    ({ ctx, input }) => guarded(async () => {
      await setSkills(ctx.user.id, input.categoryIds);
      return { ok: true, count: input.categoryIds.length };
    })
  ),
  addWork: protectedProcedure.input(z.object({ imageUrl: z.string().min(1), caption: z.string().max(160).nullable().optional() })).mutation(({ ctx, input }) => guarded(() => addWork({ providerUserId: ctx.user.id, ...input }))),
  removeWork: protectedProcedure.input(z.object({ id: z.uuid() })).mutation(({ ctx, input }) => guarded(() => removeWork(input.id, ctx.user.id))),
  /** الملف العام لأي مستخدم. */
  public: protectedProcedure.input(z.object({ userId: z.uuid() })).query(({ input }) => guarded(() => getPublicProvider(input.userId))),
  /** المراجعات المستلمة على ملفي. */
  reviews: protectedProcedure.query(({ ctx }) => listReviewsForUser(ctx.user.id))
});
var requestsRouter = router({
  mine: protectedProcedure.query(({ ctx }) => listMyRequests(ctx.user.id)),
  create: protectedProcedure.input(
    z.object({
      categoryId: z.uuid(),
      title: z.string().min(6).max(120),
      description: z.string().min(15).max(2e3),
      budgetAmount: z.number().int().min(0).max(2e5),
      city: z.enum(MOROCCAN_CITIES),
      district: z.string().min(1).max(60),
      urgency: z.enum(URGENCIES),
      scheduledFor: z.date().nullable().optional(),
      imageUrls: z.array(z.string().min(1)).max(4).default([])
    })
  ).mutation(
    ({ ctx, input }) => guarded(
      () => createRequest({
        customerId: ctx.user.id,
        ...input,
        scheduledFor: input.scheduledFor ?? null,
        imageUrls: input.imageUrls
      })
    )
  ),
  detail: protectedProcedure.input(z.object({ id: z.uuid() })).query(
    ({ ctx, input }) => guarded(async () => {
      const d = await getRequestDetail(input.id, ctx.user.id);
      if (!d) return fail("FORBIDDEN", "\u0644\u0627 \u062A\u0645\u0644\u0643 \u0635\u0644\u0627\u062D\u064A\u0629 \u0627\u0644\u0648\u0635\u0648\u0644 \u0625\u0644\u0649 \u0647\u0630\u0627 \u0627\u0644\u0637\u0644\u0628");
      return d;
    })
  ),
  browse: protectedProcedure.input(
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
      sort: z.enum(["newest", "budget_desc", "budget_asc"]).default("newest")
    })
  ).query(
    ({ ctx, input }) => guarded(async () => {
      const me = await getProfile(ctx.user.id);
      return browseOpenRequests({
        providerUserId: ctx.user.id,
        providerCity: me?.city ?? MOROCCAN_CITIES[0],
        providerDistrict: me?.district ?? null,
        ...input
      });
    })
  ),
  setStatus: protectedProcedure.input(
    z.object({
      id: z.uuid(),
      next: z.enum(["in_progress", "completed", "cancelled"])
    })
  ).mutation(
    ({ ctx, input }) => guarded(() => updateRequestStatus({ requestId: input.id, viewerId: ctx.user.id, next: input.next }))
  )
});
var offersRouter = router({
  mine: protectedProcedure.query(({ ctx }) => listMyOffers(ctx.user.id)),
  myJobs: protectedProcedure.query(({ ctx }) => listMyAcceptedJobs(ctx.user.id)),
  create: protectedProcedure.input(
    z.object({
      requestId: z.uuid(),
      price: z.number().int().min(20).max(2e5),
      durationMinutes: z.number().int().min(15).max(10080),
      message: z.string().min(10).max(800)
    })
  ).mutation(({ ctx, input }) => guarded(() => createOffer({ providerUserId: ctx.user.id, ...input }))),
  withdraw: protectedProcedure.input(z.object({ id: z.uuid() })).mutation(({ ctx, input }) => guarded(() => withdrawOffer(input.id, ctx.user.id))),
  accept: protectedProcedure.input(z.object({ id: z.uuid() })).mutation(({ ctx, input }) => guarded(() => acceptOffer(input.id, ctx.user.id))),
  reject: protectedProcedure.input(z.object({ id: z.uuid() })).mutation(({ ctx, input }) => guarded(() => rejectOffer(input.id, ctx.user.id))),
  counter: protectedProcedure.input(
    z.object({
      id: z.uuid(),
      price: z.number().int().min(20).max(2e5),
      durationMinutes: z.number().int().min(15).max(10080),
      message: z.string().min(5).max(600)
    })
  ).mutation(
    ({ ctx, input }) => guarded(() => counterOffer({ offerId: input.id, customerId: ctx.user.id, ...input }))
  ),
  respondCounter: protectedProcedure.input(
    z.object({
      id: z.uuid(),
      accept: z.boolean(),
      price: z.number().int().min(20).max(2e5).optional()
    })
  ).mutation(
    ({ ctx, input }) => guarded(
      () => respondToCounter({
        counterId: input.id,
        providerUserId: ctx.user.id,
        accept: input.accept,
        price: input.price
      })
    )
  )
});
var messagesRouter = router({
  list: protectedProcedure.input(z.object({ requestId: z.uuid() })).query(({ ctx, input }) => guarded(() => listMessages(input.requestId, ctx.user.id))),
  send: protectedProcedure.input(z.object({ requestId: z.uuid(), body: z.string().min(1).max(1e3) })).mutation(
    ({ ctx, input }) => guarded(() => sendMessage({ requestId: input.requestId, senderId: ctx.user.id, body: input.body }))
  )
});
var reviewsRouter = router({
  create: protectedProcedure.input(
    z.object({
      requestId: z.uuid(),
      rating: z.number().int().min(1).max(5),
      comment: z.string().max(600).nullable().optional()
    })
  ).mutation(
    ({ ctx, input }) => guarded(
      () => createReview({
        requestId: input.requestId,
        authorId: ctx.user.id,
        rating: input.rating,
        comment: input.comment ?? null
      })
    )
  ),
  forUser: protectedProcedure.input(z.object({ userId: z.uuid() })).query(({ input }) => listReviewsForUser(input.userId))
});
var walletRouter = router({
  me: protectedProcedure.query(({ ctx }) => listWallet(ctx.user.id)),
  /** شحن رصيد الحرّاف — يغطّي به عمولة المنصّة ويسمح له بإرسال العروض. */
  topup: protectedProcedure.input(z.object({ amount: z.number().int().min(10).max(1e5) })).mutation(({ ctx, input }) => guarded(() => topupWallet(ctx.user.id, input.amount))),
  feePercent: publicProcedure.query(() => PLATFORM_FEE_PERCENT)
});
var notificationsRouter = router({
  list: protectedProcedure.query(({ ctx }) => listNotifications(ctx.user.id)),
  unreadCount: protectedProcedure.query(({ ctx }) => unreadNotificationCount(ctx.user.id)),
  markRead: protectedProcedure.input(z.object({ id: z.uuid() })).mutation(({ ctx, input }) => guarded(() => markNotificationRead(input.id, ctx.user.id))),
  markAllRead: protectedProcedure.mutation(({ ctx }) => markAllNotificationsRead(ctx.user.id))
});
var dashboardRouter = router({
  customer: protectedProcedure.query(({ ctx }) => customerDashboard(ctx.user.id)),
  provider: protectedProcedure.query(({ ctx }) => providerDashboard(ctx.user.id))
});
function sanitizeBasename(name) {
  const last = name.split(/[/\\]/).pop() ?? "";
  const dot = last.lastIndexOf(".");
  const rawStem = dot > 0 ? last.slice(0, dot) : last;
  const rawExt = dot > 0 ? last.slice(dot + 1) : "";
  const stem = rawStem.replace(/[^A-Za-z0-9._-]/g, "").replace(/^\.+/, "") || "upload";
  const ext = rawExt.replace(/[^A-Za-z0-9]/g, "").slice(0, 10);
  return ext ? `${stem}.${ext}` : stem;
}
var filesRouter = router({
  uploadUrl: protectedProcedure.input(z.object({ name: z.string().min(1), contentType: z.string().min(1) })).mutation(async ({ ctx, input }) => {
    const key = `${crypto.randomUUID()}-${sanitizeBasename(input.name)}`;
    try {
      const { uploadUrl, publicPath } = await storagePutUrl(key, input.contentType, {
        ownerId: ctx.user.id
      });
      return { key, uploadUrl, publicPath };
    } catch (e) {
      if (e instanceof StorageError) {
        if (e.code === "failed") {
          return fail("BAD_REQUEST", "\u062A\u0639\u0630\u0651\u0631 \u062A\u062E\u0632\u064A\u0646 \u0627\u0644\u0645\u0644\u0641 \u2014 \u0623\u0639\u062F \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629 \u0628\u0639\u062F \u0644\u062D\u0638\u0627\u062A");
        }
        if (e.code === "not_configured") {
          return fail("BAD_REQUEST", "\u0631\u0641\u0639 \u0627\u0644\u0645\u0644\u0641\u0627\u062A \u063A\u064A\u0631 \u0645\u0641\u0639\u0651\u0644 \u062D\u0627\u0644\u064A\u0627\u064B");
        }
      }
      throw e;
    }
  }),
  commit: protectedProcedure.input(z.object({ key: z.string().min(1), name: z.string().min(1) })).mutation(async ({ ctx, input }) => {
    try {
      return await storageCommit(input.key, { ownerId: ctx.user.id, name: input.name });
    } catch (e) {
      if (e instanceof StorageError && e.code === "not_found") {
        return fail("NOT_FOUND", "\u0644\u0645 \u064A\u0643\u062A\u0645\u0644 \u0631\u0641\u0639 \u0627\u0644\u0645\u0644\u0641");
      }
      if (e instanceof StorageError && e.code === "forbidden") {
        return fail("FORBIDDEN", "\u0647\u0630\u0627 \u0627\u0644\u0645\u0644\u0641 \u064A\u062E\u0635\u0651 \u0645\u0633\u062A\u062E\u062F\u0645\u0627\u064B \u0622\u062E\u0631");
      }
      throw e;
    }
  }),
  list: protectedProcedure.query(({ ctx }) => storageListByOwner(ctx.user.id)),
  remove: protectedProcedure.input(z.object({ key: z.string().min(1) })).mutation(async ({ ctx, input }) => {
    try {
      return await storageDeleteOwned(ctx.user.id, input.key);
    } catch (e) {
      if (e instanceof StorageError && e.code === "forbidden") {
        return fail("BAD_REQUEST", "\u0645\u0641\u062A\u0627\u062D \u0645\u0644\u0641 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D");
      }
      throw e;
    }
  })
});
var appRouter = router({
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
  files: filesRouter
});

// server/_core/context.ts
async function createContext(c) {
  const user = await authProvider().getSession(c);
  return { c, db, user };
}

// server/_core/jobs.ts
var registry = /* @__PURE__ */ new Map();
function getJob(name) {
  return registry.get(name);
}

// server/_core/serve.ts
import { serveStatic } from "@hono/node-server/serve-static";
import { readFile } from "node:fs/promises";
import path from "node:path";
var PUBLIC_DIR = "dist/public";
function mountClient(app2) {
  if (!env.isProd && process.env.VERCEL !== "1") return;
  app2.use("/*", serveStatic({ root: `./${PUBLIC_DIR}` }));
  app2.get("*", async (c) => {
    const html = await readFile(path.resolve(PUBLIC_DIR, "index.html"), "utf-8");
    return c.html(html);
  });
}

// server/vercel/entry.ts
var app = new Hono();
app.get("/api/health", (c) => c.json({ ok: true }));
app.use(
  "/trpc/*",
  trpcServer({
    router: appRouter,
    createContext: (_opts, c) => createContext(c)
  })
);
app.all("/app-storage/*", (c) => serveAppStorage(c));
app.post("/api/_jobs/:name", async (c) => {
  const signature = c.req.header("x-platform-signature");
  if (!signature) {
    return c.text("unauthorized (job callback signature required)", 401);
  }
  const handler2 = getJob(c.req.param("name"));
  if (!handler2) return c.text("no such job", 404);
  try {
    await handler2();
    return c.json({ ok: true });
  } catch (err) {
    console.error(`[jobs] "${c.req.param("name")}" failed`, err);
    return c.text("job failed", 500);
  }
});
mountClient(app);
async function toWebRequest(req) {
  const host = req.headers["x-forwarded-host"] ?? req.headers.host ?? "localhost";
  const proto = req.headers["x-forwarded-proto"] ?? "https";
  const url = new URL(req.url ?? "/", `${proto}://${host}`);
  const method = req.method ?? "GET";
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) {
    if (v === void 0) continue;
    if (Array.isArray(v)) for (const item of v) headers.append(k, item);
    else headers.set(k, v);
  }
  let body;
  if (method !== "GET" && method !== "HEAD") {
    const chunks = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    const buf = Buffer.concat(chunks);
    if (buf.length) body = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  }
  return new Request(url, { method, headers, body });
}
async function __entry(req, res) {
  try {
    await handler(req, res);
  } catch (err) {
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("content-type", "text/plain; charset=utf-8");
    }
    res.end("INVOKE ERROR:\n" + (err instanceof Error ? err.stack : String(err)));
  }
}
async function handler(req, res) {
  try {
    const response = await app.fetch(await toWebRequest(req));
    res.statusCode = response.status;
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() === "set-cookie") res.appendHeader(key, value);
      else res.setHeader(key, value);
    });
    const buf = Buffer.from(await response.arrayBuffer());
    res.setHeader("content-length", String(buf.byteLength));
    res.end(buf);
  } catch (err) {
    console.error("[vercel] invocation failed", err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("content-type", "text/plain; charset=utf-8");
    }
    res.end("internal error");
  }
}
export {
  __entry as default
};
