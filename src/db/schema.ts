import { relations, sql } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

const timestamps = {
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .$onUpdate(() => new Date()),
};

/* -------------------------------------------------------------------------- */
/* Authentication (Better Auth core schema + role)                            */
/* -------------------------------------------------------------------------- */

export const user = sqliteTable(
  "user",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: integer("email_verified", { mode: "boolean" }).notNull().default(false),
    image: text("image"),
    role: text("role", { enum: ["customer", "admin"] }).notNull().default("customer"),
    ...timestamps,
  },
  (t) => [index("user_role_idx").on(t.role)],
);

export const session = sqliteTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    token: text("token").notNull().unique(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (t) => [index("session_user_idx").on(t.userId)],
);

export const account = sqliteTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: integer("access_token_expires_at", { mode: "timestamp_ms" }),
    refreshTokenExpiresAt: integer("refresh_token_expires_at", { mode: "timestamp_ms" }),
    scope: text("scope"),
    password: text("password"),
    ...timestamps,
  },
  (t) => [index("account_user_idx").on(t.userId)],
);

export const verification = sqliteTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    ...timestamps,
  },
  (t) => [index("verification_identifier_idx").on(t.identifier)],
);

/* -------------------------------------------------------------------------- */
/* Catalogue                                                                  */
/* -------------------------------------------------------------------------- */

export const category = sqliteTable("category", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  sortOrder: integer("sort_order").notNull().default(0),
  ...timestamps,
});

export const TAG_KINDS = ["technology", "style", "topic"] as const;
export type TagKind = (typeof TAG_KINDS)[number];

export const tag = sqliteTable(
  "tag",
  {
    id: text("id").primaryKey(),
    kind: text("kind", { enum: TAG_KINDS }).notNull(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    ...timestamps,
  },
  (t) => [uniqueIndex("tag_kind_slug_uq").on(t.kind, t.slug)],
);

export const PRODUCT_STATUSES = ["draft", "published", "archived"] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export const product = sqliteTable(
  "product",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    tagline: text("tagline").notNull().default(""),
    /** Plain text with blank-line separated paragraphs. */
    description: text("description").notNull().default(""),
    categoryId: text("category_id")
      .notNull()
      .references(() => category.id, { onDelete: "restrict" }),
    status: text("status", { enum: PRODUCT_STATUSES }).notNull().default("draft"),
    /** Minor units in the store currency. 0 = free. */
    priceCents: integer("price_cents").notNull().default(0),
    isFeatured: integer("is_featured", { mode: "boolean" }).notNull().default(false),
    featuredRank: integer("featured_rank").notNull().default(0),
    /** Starter inventory shipped with the project, flagged in the admin. */
    isDemoContent: integer("is_demo_content", { mode: "boolean" }).notNull().default(false),
    licenceType: text("licence_type", { enum: ["free", "standard"] }).notNull().default("standard"),
    licenceSummary: text("licence_summary").notNull().default(""),
    currentVersionId: text("current_version_id"),
    publishedAt: integer("published_at", { mode: "timestamp_ms" }),
    ...timestamps,
  },
  (t) => [
    index("product_status_published_idx").on(t.status, t.publishedAt),
    index("product_status_price_idx").on(t.status, t.priceCents),
    index("product_category_status_idx").on(t.categoryId, t.status),
    index("product_featured_idx").on(t.isFeatured, t.featuredRank),
  ],
);

export const productTag = sqliteTable(
  "product_tag",
  {
    productId: text("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    tagId: text("tag_id")
      .notNull()
      .references(() => tag.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.productId, t.tagId] }), index("product_tag_tag_idx").on(t.tagId)],
);

export type ArchiveManifest = {
  fileCount: number;
  files: string[];
  hasReadme: boolean;
  hasLicence: boolean;
  hasEnvExample: boolean;
  hasPackageJson: boolean;
};

export type Dependency = { name: string; version: string; dev?: boolean };

export const productVersion = sqliteTable(
  "product_version",
  {
    id: text("id").primaryKey(),
    productId: text("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    version: text("version").notNull(),
    changelog: text("changelog").notNull().default(""),
    /** Protected deliverable. Never selected by public queries. */
    prompt: text("prompt").notNull().default(""),
    /** Public metadata about the prompt, maintained whenever it is saved. */
    promptWords: integer("prompt_words").notNull().default(0),
    /** Private storage key of the source archive, if this version ships code. */
    archiveKey: text("archive_key"),
    archiveFileName: text("archive_file_name"),
    archiveSize: integer("archive_size"),
    archiveSha256: text("archive_sha256"),
    archiveManifest: text("archive_manifest", { mode: "json" }).$type<ArchiveManifest>(),
    /** Unguessable folder name of the extracted static demo bundle. */
    demoKey: text("demo_key"),
    dependencies: text("dependencies", { mode: "json" }).$type<Dependency[]>().notNull().default(sql`'[]'`),
    requirements: text("requirements", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
    technologyNotes: text("technology_notes").notNull().default(""),
    releasedAt: integer("released_at", { mode: "timestamp_ms" }),
    ...timestamps,
  },
  (t) => [uniqueIndex("product_version_uq").on(t.productId, t.version)],
);

export const MEDIA_KINDS = ["poster", "screenshot"] as const;

export const productMedia = sqliteTable(
  "product_media",
  {
    id: text("id").primaryKey(),
    productId: text("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: MEDIA_KINDS }).notNull(),
    /** Base key; renditions live at `${key}-{width}.webp` plus `${key}-og.jpg`. */
    storageKey: text("storage_key").notNull(),
    widths: text("widths", { mode: "json" }).$type<number[]>().notNull(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    alt: text("alt").notNull().default(""),
    sortOrder: integer("sort_order").notNull().default(0),
    ...timestamps,
  },
  (t) => [index("product_media_product_idx").on(t.productId, t.kind, t.sortOrder)],
);

export const favourite = sqliteTable(
  "favourite",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    productId: text("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    createdAt: timestamps.createdAt,
  },
  (t) => [primaryKey({ columns: [t.userId, t.productId] }), index("favourite_product_idx").on(t.productId)],
);

/* -------------------------------------------------------------------------- */
/* Commerce                                                                   */
/* -------------------------------------------------------------------------- */

export const ORDER_STATUSES = ["pending", "paid", "failed", "cancelled", "expired", "refunded"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const order = sqliteTable(
  "order",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    status: text("status", { enum: ORDER_STATUSES }).notNull().default("pending"),
    kind: text("kind", { enum: ["product", "all_access"] }).notNull(),
    provider: text("provider", { enum: ["stripe", "simulated"] }).notNull(),
    providerSessionId: text("provider_session_id").unique(),
    providerPaymentId: text("provider_payment_id"),
    currency: text("currency").notNull(),
    totalCents: integer("total_cents").notNull(),
    statusReason: text("status_reason"),
    paidAt: integer("paid_at", { mode: "timestamp_ms" }),
    refundedAt: integer("refunded_at", { mode: "timestamp_ms" }),
    ...timestamps,
  },
  (t) => [
    index("order_user_idx").on(t.userId, t.createdAt),
    index("order_status_idx").on(t.status, t.createdAt),
    index("order_payment_idx").on(t.providerPaymentId),
  ],
);

export const orderItem = sqliteTable(
  "order_item",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id")
      .notNull()
      .references(() => order.id, { onDelete: "cascade" }),
    productId: text("product_id").references(() => product.id, { onDelete: "set null" }),
    kind: text("kind", { enum: ["product", "all_access"] }).notNull(),
    titleSnapshot: text("title_snapshot").notNull(),
    unitPriceCents: integer("unit_price_cents").notNull(),
  },
  (t) => [index("order_item_order_idx").on(t.orderId), index("order_item_product_idx").on(t.productId)],
);

export const entitlement = sqliteTable(
  "entitlement",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    scope: text("scope", { enum: ["product", "all_access"] }).notNull(),
    productId: text("product_id").references(() => product.id, { onDelete: "cascade" }),
    source: text("source", { enum: ["purchase", "free", "admin"] }).notNull(),
    orderId: text("order_id").references(() => order.id, { onDelete: "set null" }),
    revokedAt: integer("revoked_at", { mode: "timestamp_ms" }),
    revokedReason: text("revoked_reason"),
    ...timestamps,
  },
  (t) => [
    index("entitlement_user_product_idx").on(t.userId, t.productId),
    index("entitlement_user_scope_idx").on(t.userId, t.scope),
    // One grant per (order, scope, product) keeps webhook retries from duplicating access.
    uniqueIndex("entitlement_order_product_uq")
      .on(t.orderId, t.productId)
      .where(sql`${t.orderId} is not null and ${t.scope} = 'product'`),
    uniqueIndex("entitlement_order_all_access_uq")
      .on(t.orderId)
      .where(sql`${t.orderId} is not null and ${t.scope} = 'all_access'`),
    // A free product is added to a library at most once.
    uniqueIndex("entitlement_free_uq").on(t.userId, t.productId).where(sql`${t.source} = 'free'`),
  ],
);

/** Every provider webhook event we have seen. The primary key gives idempotency. */
export const paymentEvent = sqliteTable(
  "payment_event",
  {
    id: text("id").primaryKey(),
    provider: text("provider", { enum: ["stripe", "simulated"] }).notNull(),
    type: text("type").notNull(),
    orderId: text("order_id"),
    outcome: text("outcome").notNull(),
    receivedAt: integer("received_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`),
  },
  (t) => [index("payment_event_order_idx").on(t.orderId)],
);

export const downloadEvent = sqliteTable(
  "download_event",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    productVersionId: text("product_version_id")
      .notNull()
      .references(() => productVersion.id, { onDelete: "cascade" }),
    createdAt: timestamps.createdAt,
  },
  (t) => [index("download_event_version_idx").on(t.productVersionId, t.createdAt)],
);

/** Small key/value table for admin-editable store settings. */
export const setting = sqliteTable("setting", {
  key: text("key").primaryKey(),
  value: text("value", { mode: "json" }).notNull(),
  ...timestamps,
});

/* -------------------------------------------------------------------------- */
/* Relations                                                                  */
/* -------------------------------------------------------------------------- */

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, { fields: [account.userId], references: [user.id] }),
}));
