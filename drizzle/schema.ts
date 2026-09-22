import {
  pgTable,
  uuid,
  text,
  timestamp,
  index,
  bigint,
  integer,
  boolean,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// ─────────────────────────────────────────────────────────────────────────────────
// SYSTEM TABLES — managed by the scaffold. The Agent MUST NOT redefine or drop
// the auth columns here, and MUST NOT rename/drop `files` (server/_core writes
// both). Kept in THIS file (not a sibling module) on purpose: drizzle-kit reads
// the module named by drizzle.config.ts as the schema source, and a re-export
// would hide these tables from it — it would then generate a migration that
// DROPS them.
// ─────────────────────────────────────────────────────────────────────────────────
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"), // null for SSO-linked users (future)
  name: text("name"),
  role: text("role").notNull().default("user"), // 'user' | 'admin'
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const files = pgTable(
  "files",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    key: text("key").notNull().unique(),
    ownerId: uuid("owner_id").references(() => users.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    size: bigint("size", { mode: "number" }).notNull(),
    contentType: text("content_type"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("files_owner_idx").on(t.ownerId), index("files_created_idx").on(t.createdAt)],
);

// ─────────────────────────────────────────────────────────────────────────────────
// BUSINESS TABLES — تطبيق «حِرْفي»
// منطق inDrive (اقتراح سعر ← بثّ ← عروض مضادة ← اختيار ← تنفيذ ← تقييم) لكن في
// مجال الخدمات: زبون ↔ حرّاف. كل جدول مملوك لمستخدم عبر FK إلى users.id.
// ─────────────────────────────────────────────────────────────────────────────────

/** فئات الخدمة — تُزرع في الـ seed، تُقرأ للجميع. */
export const serviceCategories = pgTable(
  "service_categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    nameAr: text("name_ar").notNull(),
    icon: text("icon").notNull(), // اسم أيقونة lucide
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("service_categories_sort_idx").on(t.sortOrder)],
);

/** ملف مقدّم الخدمة + الملف العام للزبون (صف واحد لكل مستخدم). */
export const providerProfiles = pgTable(
  "provider_profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("customer"), // 'customer' | 'provider'
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
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("provider_profiles_role_idx").on(t.role),
    index("provider_profiles_city_idx").on(t.city),
  ],
);

/** مهارات الحرّاف (فئة ← حرّاف). */
export const providerCategories = pgTable(
  "provider_categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    providerUserId: uuid("provider_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => serviceCategories.id, { onDelete: "cascade" }),
  },
  (t) => [
    uniqueIndex("provider_categories_unique").on(t.providerUserId, t.categoryId),
    index("provider_categories_cat_idx").on(t.categoryId),
  ],
);

/** صور الأعمال السابقة للحرّاف. */
export const providerWorks = pgTable(
  "provider_works",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    providerUserId: uuid("provider_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    imageUrl: text("image_url").notNull(),
    caption: text("caption"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("provider_works_provider_idx").on(t.providerUserId)],
);

/** الطلبات — الزبون ينشر مشكلته بميزانية مقترحة. */
export const requests = pgTable(
  "requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => serviceCategories.id),
    title: text("title").notNull(),
    description: text("description").notNull(),
    budgetAmount: integer("budget_amount").notNull(), // بالدرهم، بلا كسور
    city: text("city").notNull(),
    district: text("district").notNull(),
    urgency: text("urgency").notNull().default("flexible"), // flexible | today | urgent
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
    status: text("status").notNull().default("open"), // open | accepted | in_progress | completed | cancelled
    acceptedOfferId: uuid("accepted_offer_id"),
    agreedAmount: integer("agreed_amount"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("requests_customer_idx").on(t.customerId),
    index("requests_status_idx").on(t.status),
    index("requests_city_cat_idx").on(t.city, t.categoryId),
    index("requests_created_idx").on(t.createdAt),
  ],
);

/** صور الطلب (حتى 4). */
export const requestImages = pgTable(
  "request_images",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    requestId: uuid("request_id")
      .notNull()
      .references(() => requests.id, { onDelete: "cascade" }),
    imageUrl: text("image_url").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("request_images_request_idx").on(t.requestId)],
);

/** العروض — الحرّاف يقدّم سعراً + مدة + رسالة. */
export const offers = pgTable(
  "offers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    requestId: uuid("request_id")
      .notNull()
      .references(() => requests.id, { onDelete: "cascade" }),
    providerUserId: uuid("provider_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    price: integer("price").notNull(),
    durationMinutes: integer("duration_minutes").notNull(),
    message: text("message").notNull(),
    status: text("status").notNull().default("pending"), // pending | accepted | rejected | withdrawn | countered
    parentOfferId: uuid("parent_offer_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("offers_request_idx").on(t.requestId),
    index("offers_provider_idx").on(t.providerUserId),
    index("offers_status_idx").on(t.status),
  ],
);

/** المحادثة داخل كل طلب. */
export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    requestId: uuid("request_id")
      .notNull()
      .references(() => requests.id, { onDelete: "cascade" }),
    senderId: uuid("sender_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("messages_request_idx").on(t.requestId, t.createdAt)],
);

/** التقييمات المتبادلة بعد الإتمام. */
export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    requestId: uuid("request_id")
      .notNull()
      .references(() => requests.id, { onDelete: "cascade" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    targetId: uuid("target_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(), // 1..5
    comment: text("comment"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("reviews_request_author_unique").on(t.requestId, t.authorId),
    index("reviews_target_idx").on(t.targetId),
  ],
);

/** المحفظة — سجلّ داخلي لا بوابة دفع. */
export const walletTransactions = pgTable(
  "wallet_transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    requestId: uuid("request_id").references(() => requests.id, { onDelete: "set null" }),
    type: text("type").notNull(), // payment | payout | fee | refund | topup
    amount: integer("amount").notNull(), // موجب/سالب بالدرهم
    description: text("description").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("wallet_user_idx").on(t.userId, t.createdAt)],
);

/** الإشعارات — داخل التطبيق فقط. */
export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    requestId: uuid("request_id").references(() => requests.id, { onDelete: "set null" }),
    isRead: boolean("is_read").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("notifications_user_idx").on(t.userId, t.createdAt)],
);
