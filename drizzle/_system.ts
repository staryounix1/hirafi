import { pgTable, uuid, text, timestamp, index, bigint } from "drizzle-orm/pg-core";

// ─────────────────────────────────────────────────────────────────────────────
// SYSTEM TABLES — managed by the scaffold. The Agent MUST NOT redefine or drop
// the auth columns, and MUST NOT rename/drop `files` (`_core` writes both).
// Split into its own module ONLY so the business schema file stays readable;
// `drizzle/schema.ts` re-exports both symbols, so every existing import path
// (`drizzle/schema`) keeps working unchanged.
// ─────────────────────────────────────────────────────────────────────────────
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
