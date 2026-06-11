import {
  type AnyPgColumn,
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core"
import { authUsers } from "drizzle-orm/supabase"

/* ───────────────────────── helpers ───────────────────────── */

// Fresh builders per table — Drizzle column builders are stateful and
// must not be shared across table definitions.
const timestamps = () => ({
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
})

const pk = () => uuid("id").primaryKey().defaultRandom()

/* ───────────────────────── enums ───────────────────────── */

export const userRole = pgEnum("user_role", [
  "buyer",
  "manufacturer",
  "admin",
])

export const manufacturerVerificationStatus = pgEnum(
  "manufacturer_verification_status",
  ["pending", "identity", "verified", "premium", "rejected"]
)

export const subscriptionTier = pgEnum("subscription_tier", [
  "none",
  "basic",
  "verified",
  "premium",
])

export const verificationType = pgEnum("verification_type", [
  "identity",
  "business",
  "inspection",
])

export const verificationStatus = pgEnum("verification_status", [
  "pending",
  "approved",
  "rejected",
])

export const productStatus = pgEnum("product_status", [
  "draft",
  "active",
  "paused",
])

export const mediaType = pgEnum("media_type", ["image", "video"])

export const rfqStatus = pgEnum("rfq_status", ["open", "quoting", "closed"])

export const quoteStatus = pgEnum("quote_status", [
  "submitted",
  "accepted",
  "declined",
])

export const orderStatus = pgEnum("order_status", [
  "pending",
  "paid",
  "in_production",
  "shipped",
  "delivered",
  "completed",
  "cancelled",
])

export const orderEscrowStatus = pgEnum("order_escrow_status", [
  "none",
  "held",
  "released",
  "refunded",
])

export const escrowTransactionStatus = pgEnum("escrow_transaction_status", [
  "initiated",
  "held",
  "released",
  "refunded",
])

export const groupBuyStatus = pgEnum("group_buy_status", [
  "open",
  "reached",
  "fulfilled",
  "failed",
])

export const shipmentMode = pgEnum("shipment_mode", ["sea", "air"])

/* ───────────────────────── profiles ───────────────────────── */

export const profiles = pgTable("profiles", {
  // Mirrors auth.users.id — created at signup.
  id: uuid("id")
    .primaryKey()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  role: userRole("role").notNull().default("buyer"),
  fullName: text("full_name"),
  phone: text("phone"),
  locale: text("locale").notNull().default("en"),
  country: text("country"),
  ...timestamps(),
})

/* ───────────────────────── manufacturers ───────────────────────── */

export const manufacturers = pgTable(
  "manufacturers",
  {
    id: pk(),
    ownerProfileId: uuid("owner_profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    companyName: text("company_name").notNull(),
    slug: text("slug").notNull().unique(),
    country: text("country"),
    city: text("city"),
    description: text("description"),
    yearEstablished: integer("year_established"),
    mainCategories: text("main_categories").array(),
    certifications: text("certifications").array(),
    logoUrl: text("logo_url"),
    bannerUrl: text("banner_url"),
    verificationStatus: manufacturerVerificationStatus("verification_status")
      .notNull()
      .default("pending"),
    subscriptionTier: subscriptionTier("subscription_tier")
      .notNull()
      .default("none"),
    paddleCustomerId: text("paddle_customer_id"),
    paddleSubscriptionId: text("paddle_subscription_id"),
    subscriptionStatus: text("subscription_status"),
    responseRate: integer("response_rate"),
    memberSince: timestamp("member_since", { withTimezone: true }),
    isPublished: boolean("is_published").notNull().default(false),
    ...timestamps(),
  },
  (t) => [
    index("manufacturers_owner_idx").on(t.ownerProfileId),
    index("manufacturers_published_idx").on(t.isPublished),
  ]
)

/* ───────────────────────── buyers ───────────────────────── */

export const buyers = pgTable(
  "buyers",
  {
    id: pk(),
    ownerProfileId: uuid("owner_profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    companyName: text("company_name"),
    country: text("country").default("KE"),
    city: text("city"),
    businessRegNo: text("business_reg_no"),
    sector: text("sector"),
    ...timestamps(),
  },
  (t) => [index("buyers_owner_idx").on(t.ownerProfileId)]
)

/* ───────────────────────── verifications ───────────────────────── */

export const verifications = pgTable(
  "verifications",
  {
    id: pk(),
    manufacturerId: uuid("manufacturer_id")
      .notNull()
      .references(() => manufacturers.id, { onDelete: "cascade" }),
    type: verificationType("type").notNull(),
    status: verificationStatus("status").notNull().default("pending"),
    documents: jsonb("documents").$type<unknown[]>().default([]),
    videoUrl: text("video_url"),
    inspector: text("inspector"),
    reviewedBy: uuid("reviewed_by").references(() => profiles.id, {
      onDelete: "set null",
    }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    notes: text("notes"),
    ...timestamps(),
  },
  (t) => [index("verifications_manufacturer_idx").on(t.manufacturerId)]
)

/* ───────────────────────── categories ───────────────────────── */

export const categories = pgTable("categories", {
  id: pk(),
  parentId: uuid("parent_id").references((): AnyPgColumn => categories.id, {
    onDelete: "set null",
  }),
  nameEn: text("name_en").notNull(),
  nameSw: text("name_sw"),
  nameZh: text("name_zh"),
  slug: text("slug").notNull().unique(),
  icon: text("icon"),
  sort: integer("sort").notNull().default(0),
  ...timestamps(),
})

/* ───────────────────────── products ───────────────────────── */
// NOTE: `search_vector tsvector` + its GIN index are added in the
// hand-authored security/search migration (generated columns of custom
// types are clearer in raw SQL). Queried via Supabase `.textSearch`.

export const products = pgTable(
  "products",
  {
    id: pk(),
    manufacturerId: uuid("manufacturer_id")
      .notNull()
      .references(() => manufacturers.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    description: text("description"),
    attributes: jsonb("attributes")
      .$type<Record<string, unknown>>()
      .default({}),
    moq: integer("moq"),
    unit: text("unit").notNull().default("piece"),
    leadTimeDays: integer("lead_time_days"),
    hsCode: text("hs_code"),
    originCountry: text("origin_country"),
    certifications: text("certifications").array(),
    customizable: boolean("customizable").notNull().default(false),
    sampleAvailable: boolean("sample_available").notNull().default(false),
    samplePrice: numeric("sample_price", { precision: 12, scale: 2 }),
    unitWeightKg: numeric("unit_weight_kg", { precision: 10, scale: 3 }),
    unitVolumeCbm: numeric("unit_volume_cbm", { precision: 10, scale: 4 }),
    primaryImageUrl: text("primary_image_url"),
    status: productStatus("status").notNull().default("draft"),
    ...timestamps(),
  },
  (t) => [
    index("products_category_idx").on(t.categoryId),
    index("products_manufacturer_idx").on(t.manufacturerId),
    index("products_status_idx").on(t.status),
  ]
)

export const productPriceTiers = pgTable(
  "product_price_tiers",
  {
    id: pk(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    minQty: integer("min_qty").notNull(),
    unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
    currency: text("currency").notNull().default("USD"),
    ...timestamps(),
  },
  (t) => [index("price_tiers_product_idx").on(t.productId)]
)

export const productMedia = pgTable(
  "product_media",
  {
    id: pk(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    type: mediaType("type").notNull(),
    url: text("url").notNull(),
    sort: integer("sort").notNull().default(0),
    ...timestamps(),
  },
  (t) => [index("product_media_product_idx").on(t.productId)]
)

/* ───────────────────────── rfqs / quotes ───────────────────────── */

export const rfqs = pgTable(
  "rfqs",
  {
    id: pk(),
    buyerId: uuid("buyer_id")
      .notNull()
      .references(() => buyers.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    description: text("description"),
    quantity: integer("quantity"),
    unit: text("unit").notNull().default("piece"),
    targetUnitPrice: numeric("target_unit_price", { precision: 12, scale: 2 }),
    currency: text("currency").notNull().default("USD"),
    destinationCountry: text("destination_country").default("KE"),
    destinationCity: text("destination_city"),
    attachments: jsonb("attachments").$type<unknown[]>().default([]),
    deadline: timestamp("deadline", { withTimezone: true }),
    status: rfqStatus("status").notNull().default("open"),
    ...timestamps(),
  },
  (t) => [
    index("rfqs_buyer_idx").on(t.buyerId),
    index("rfqs_category_idx").on(t.categoryId),
    index("rfqs_status_idx").on(t.status),
  ]
)

export const quotes = pgTable(
  "quotes",
  {
    id: pk(),
    rfqId: uuid("rfq_id")
      .notNull()
      .references(() => rfqs.id, { onDelete: "cascade" }),
    manufacturerId: uuid("manufacturer_id")
      .notNull()
      .references(() => manufacturers.id, { onDelete: "cascade" }),
    unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
    currency: text("currency").notNull().default("USD"),
    moq: integer("moq"),
    leadTimeDays: integer("lead_time_days"),
    incoterm: text("incoterm"),
    validUntil: timestamp("valid_until", { withTimezone: true }),
    notes: text("notes"),
    status: quoteStatus("status").notNull().default("submitted"),
    ...timestamps(),
  },
  (t) => [
    index("quotes_rfq_idx").on(t.rfqId),
    index("quotes_manufacturer_idx").on(t.manufacturerId),
  ]
)

export const rfqInvites = pgTable(
  "rfq_invites",
  {
    rfqId: uuid("rfq_id")
      .notNull()
      .references(() => rfqs.id, { onDelete: "cascade" }),
    manufacturerId: uuid("manufacturer_id")
      .notNull()
      .references(() => manufacturers.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.rfqId, t.manufacturerId] }),
    index("rfq_invites_manufacturer_idx").on(t.manufacturerId),
  ]
)

/* ───────────────────────── orders ───────────────────────── */
// Phase 2 builds the payment/escrow flow; the object is fully modelled now.

export const orders = pgTable(
  "orders",
  {
    id: pk(),
    buyerId: uuid("buyer_id")
      .notNull()
      .references(() => buyers.id, { onDelete: "restrict" }),
    manufacturerId: uuid("manufacturer_id")
      .notNull()
      .references(() => manufacturers.id, { onDelete: "restrict" }),
    currency: text("currency").notNull().default("USD"),
    incoterm: text("incoterm"),
    subtotal: numeric("subtotal", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),
    total: numeric("total", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),
    status: orderStatus("status").notNull().default("pending"),
    escrowStatus: orderEscrowStatus("escrow_status")
      .notNull()
      .default("none"),
    notes: text("notes"),
    ...timestamps(),
  },
  (t) => [
    index("orders_buyer_idx").on(t.buyerId),
    index("orders_manufacturer_idx").on(t.manufacturerId),
  ]
)

export const orderItems = pgTable(
  "order_items",
  {
    id: pk(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: uuid("product_id").references(() => products.id, {
      onDelete: "set null",
    }),
    titleSnapshot: text("title_snapshot"),
    quantity: integer("quantity").notNull(),
    unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
    ...timestamps(),
  },
  (t) => [index("order_items_order_idx").on(t.orderId)]
)

/* ───────────────────────── conversations / messages ───────────────────────── */

export const conversations = pgTable(
  "conversations",
  {
    id: pk(),
    buyerId: uuid("buyer_id")
      .notNull()
      .references(() => buyers.id, { onDelete: "cascade" }),
    manufacturerId: uuid("manufacturer_id")
      .notNull()
      .references(() => manufacturers.id, { onDelete: "cascade" }),
    productId: uuid("product_id").references(() => products.id, {
      onDelete: "set null",
    }),
    rfqId: uuid("rfq_id").references(() => rfqs.id, { onDelete: "set null" }),
    orderId: uuid("order_id").references(() => orders.id, {
      onDelete: "set null",
    }),
    ...timestamps(),
  },
  (t) => [
    index("conversations_buyer_idx").on(t.buyerId),
    index("conversations_manufacturer_idx").on(t.manufacturerId),
  ]
)

export const messages = pgTable(
  "messages",
  {
    id: pk(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    senderProfileId: uuid("sender_profile_id").references(() => profiles.id, {
      onDelete: "set null",
    }),
    body: text("body").notNull(),
    // AI translations keyed by locale: { en, sw, zh }
    bodyTranslated: jsonb("body_translated")
      .$type<Record<string, string>>()
      .default({}),
    sourceLang: text("source_lang"),
    attachments: jsonb("attachments").$type<unknown[]>().default([]),
    readAt: timestamp("read_at", { withTimezone: true }),
    ...timestamps(),
  },
  (t) => [index("messages_conversation_idx").on(t.conversationId)]
)

/* ───────────────────────── escrow (Phase 2) ───────────────────────── */

export const escrowTransactions = pgTable(
  "escrow_transactions",
  {
    id: pk(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    provider: text("provider"),
    providerRef: text("provider_ref"),
    amount: numeric("amount", { precision: 14, scale: 2 }),
    currency: text("currency").notNull().default("USD"),
    status: escrowTransactionStatus("status").notNull().default("initiated"),
    eventLog: jsonb("event_log").$type<unknown[]>().default([]),
    ...timestamps(),
  },
  (t) => [index("escrow_order_idx").on(t.orderId)]
)

/* ───────────────────────── group buy (Phase 2) ───────────────────────── */

export const groupBuys = pgTable("group_buys", {
  id: pk(),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  manufacturerId: uuid("manufacturer_id")
    .notNull()
    .references(() => manufacturers.id, { onDelete: "cascade" }),
  targetQuantity: integer("target_quantity").notNull(),
  currentQuantity: integer("current_quantity").notNull().default(0),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }),
  currency: text("currency").notNull().default("USD"),
  deadline: timestamp("deadline", { withTimezone: true }),
  status: groupBuyStatus("status").notNull().default("open"),
  ...timestamps(),
})

export const groupBuyParts = pgTable("group_buy_parts", {
  id: pk(),
  groupBuyId: uuid("group_buy_id")
    .notNull()
    .references(() => groupBuys.id, { onDelete: "cascade" }),
  buyerId: uuid("buyer_id")
    .notNull()
    .references(() => buyers.id, { onDelete: "cascade" }),
  quantity: integer("quantity").notNull(),
  status: text("status").notNull().default("pending"),
  ...timestamps(),
})

/* ───────────────────────── shipments (Phase 2) ───────────────────────── */

export const shipments = pgTable("shipments", {
  id: pk(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  mode: shipmentMode("mode"),
  carrier: text("carrier"),
  trackingNo: text("tracking_no"),
  originPort: text("origin_port"),
  destPort: text("dest_port"),
  status: text("status").notNull().default("preparing"),
  documents: jsonb("documents").$type<unknown[]>().default([]),
  eta: timestamp("eta", { withTimezone: true }),
  ...timestamps(),
})

/* ───────────────────────── reviews (Phase 2) ───────────────────────── */

export const reviews = pgTable("reviews", {
  id: pk(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  buyerId: uuid("buyer_id")
    .notNull()
    .references(() => buyers.id, { onDelete: "cascade" }),
  manufacturerId: uuid("manufacturer_id")
    .notNull()
    .references(() => manufacturers.id, { onDelete: "cascade" }),
  productId: uuid("product_id").references(() => products.id, {
    onDelete: "set null",
  }),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  ...timestamps(),
})

/* ───────────────────────── subscriptions ───────────────────────── */

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: pk(),
    manufacturerId: uuid("manufacturer_id")
      .notNull()
      .references(() => manufacturers.id, { onDelete: "cascade" }),
    tier: subscriptionTier("tier").notNull().default("none"),
    status: text("status"),
    provider: text("provider"),
    providerSubscriptionId: text("provider_subscription_id"),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    cancelAtPeriodEnd: boolean("cancel_at_period_end")
      .notNull()
      .default(false),
    ...timestamps(),
  },
  (t) => [index("subscriptions_manufacturer_idx").on(t.manufacturerId)]
)

/* ───────────────────────── landed cost ───────────────────────── */

export const landedCostEstimates = pgTable("landed_cost_estimates", {
  id: pk(),
  // Owner of the estimate (null = computed anonymously on a public page).
  profileId: uuid("profile_id").references(() => profiles.id, {
    onDelete: "set null",
  }),
  productId: uuid("product_id").references(() => products.id, {
    onDelete: "set null",
  }),
  rfqId: uuid("rfq_id").references(() => rfqs.id, { onDelete: "set null" }),
  inputs: jsonb("inputs").$type<Record<string, unknown>>().default({}),
  breakdown: jsonb("breakdown").$type<Record<string, unknown>>().default({}),
  fxRate: numeric("fx_rate", { precision: 14, scale: 6 }),
  fxDatedAt: timestamp("fx_dated_at", { withTimezone: true }),
  totalKes: numeric("total_kes", { precision: 14, scale: 2 }),
  ...timestamps(),
})

/* ───────────────────────── notifications ───────────────────────── */

export const notifications = pgTable(
  "notifications",
  {
    id: pk(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    title: text("title"),
    body: text("body"),
    link: text("link"),
    readAt: timestamp("read_at", { withTimezone: true }),
    ...timestamps(),
  },
  (t) => [index("notifications_profile_idx").on(t.profileId)]
)

/* ───────────────────────── disputes (Phase 2) ───────────────────────── */

export const disputes = pgTable("disputes", {
  id: pk(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  openedBy: uuid("opened_by").references(() => profiles.id, {
    onDelete: "set null",
  }),
  reason: text("reason"),
  evidence: jsonb("evidence").$type<unknown[]>().default([]),
  status: text("status").notNull().default("open"),
  resolution: text("resolution"),
  ...timestamps(),
})
