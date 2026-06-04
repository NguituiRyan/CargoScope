# CargoScope — Product & Technical Specification

> **One-line:** The trusted bridge from verified Chinese factories to African businesses — a curated, trust-first B2B sourcing platform that solves the things that actually stop African wholesalers from buying directly from China.
>
> **Status:** Build spec for initial prototype. Hand this file to Claude Code.
> **Author context:** Solo technical founder building the platform; one team member sourcing/onboarding manufacturers in China; one team member acquiring wholesalers in Kenya.

---

## 1. The problem (why this exists)

African (initially Kenyan) wholesalers and retailers can cut costs 30–60% by buying directly from Chinese manufacturers instead of local middlemen — but the direct route is full of friction that kills most attempts:

- **Trust / scam / quality risk** — On open marketplaces, a buyer cannot tell a real factory from a fraudster, and pays in advance with no control over what actually ships.
- **Language & cultural barrier** — Most Chinese suppliers (especially the cheapest, on 1688) don't operate in English, let alone Swahili. Negotiation breaks down.
- **Blind advance payments** — T/T, Western Union and similar require paying up front with no recourse.
- **MOQ too high for one buyer** — Factory minimum order quantities are often larger than a single African wholesaler needs.
- **Hidden landed cost** — Buyers see a unit price but get ambushed by shipping, import duty, VAT, KEBS/PVoC conformity costs, and clearing fees. Nobody shows the *true* cost delivered to Nairobi.
- **FX volatility** — KES/USD can swing 5–10% in a quarter, wrecking margins on a deal priced weeks earlier.
- **Customs & compliance complexity** — KEBS standards, PVoC (Pre-Export Verification of Conformity), certificate of origin, import licences, HS classification.
- **Logistics** — Sea vs air, consolidation, Mombasa port, tracking.

The current workaround is hiring a **China-based sourcing agent**. CargoScope productizes that agent into a platform.

## 2. The solution & positioning

CargoScope is **not** trying to out-scale Alibaba. Its edge is the opposite of Alibaba's infinite directory: **a curated, verified, Africa-localized corridor.** Every differentiator below maps directly to a pain above and is something a global giant cannot easily replicate in a single trade lane.

| # | Differentiator | Pain it kills |
|---|----------------|---------------|
| 1 | **Curated & verified manufacturers** — every supplier vetted by the CargoScope China team before listing. Quality over quantity. | Scam / quality risk |
| 2 | **Landed-cost transparency** — total cost to Mombasa/Nairobi in KES (unit + freight + duty + VAT + KEBS/PVoC + clearing), shown before commitment. | Hidden fees, FX surprises |
| 3 | **Language bridge** — AI-translated listings and real-time translated messaging across 中文 ↔ English ↔ Kiswahili. | Language barrier |
| 4 | **MOQ pooling (group buy)** — wholesalers pool orders to hit a factory's minimum. | MOQ too high |
| 5 | **Escrow + on-ground inspection** — payment held until delivery confirmed; optional pre-shipment factory inspection by the China team. | Blind advance payment |
| 6 | **Built-in logistics to Africa** — freight consolidation to Mombasa, tracking, and customs-document support. | Logistics complexity |
| 7 | **M-Pesa-native buyer flow** — deposits, fees and escrow funded via M-Pesa. | Payment access |
| 8 | **In-region trust & support** — local Kenyan presence, dispute resolution in time zone and language. | Confidence gap |

## 3. Users / personas & roles

1. **Manufacturer (Supplier)** — Chinese factory or verified trading company. *Pays* (subscription). Lists products, manages a storefront, responds to inquiries and RFQs, sends quotes, fulfills orders.
2. **Buyer (Wholesaler / Retailer)** — African (initially Kenyan) business sourcing in bulk. *Free* to use. Browses, inquires, posts RFQs, joins group buys, places orders, tracks shipments, reviews.
3. **Admin / Curator (CargoScope team)** — Vets and verifies manufacturers, moderates listings, manages categories, oversees escrow & disputes, coordinates logistics, provides support. Sub-roles: *China ops* (sourcing/verification), *Kenya ops* (buyer success/logistics), *Platform/super-admin*.

Roles are enforced end-to-end via Supabase Row-Level Security (see §10).

## 4. Business model

- **Manufacturer subscription** (primary revenue), tiered:
  - **Basic** — limited active listings, standard placement, basic identity check.
  - **Verified** — more listings, "Verified Supplier" badge (passed document + business-identity verification), RFQ access, search boost.
  - **Premium** — unlimited listings, "Premium Verified" (passed on-site/video factory inspection), featured placement, priority RFQ, storefront customization, analytics.
- **Optional transaction commission** on facilitated/escrow orders (aligns revenue with real deals).
- **Buyer side is free** — demand is the scarce asset; never charge it early.
- **Value-added services** (later): paid inspection, freight, financing.

> Pricing should sit well below Alibaba's supplier tiers (~US$2,000+/yr) while still letting a small handful of paying manufacturers cover platform run-cost.

---

## 5. Feature set (full product)

Features are tagged by build priority: **[MVP]** = initial prototype, **[P2]** = phase 2, **[P3]** = later. The MVP must contain every *necessary* Alibaba-equivalent feature for the core loop (discover → trust → inquire → quote → transact); advanced/scale features are deferred but specified so the data model anticipates them.

### 5.1 Discovery & catalog
- **[MVP]** Category tree (hierarchical) and category landing pages.
- **[MVP]** Product listings with: title, rich description, image/video gallery, **MOQ**, **tiered pricing** (price breaks by quantity), lead time, unit, specifications/attributes, certifications (CE/RoHS/etc.), HS code, country of origin, customization options.
- **[MVP]** Product detail page with manufacturer trust panel, landed-cost estimate, "send inquiry", "request sample", "start/join group buy".
- **[MVP]** Search (keyword) with filters: category, price, MOQ, verification tier, lead time, location.
- **[MVP]** Manufacturer **storefront** page (company profile, verification badges, product grid, response rate, member-since, certifications).
- **[P2]** Saved products / favourites, recently viewed, comparison.
- **[P2]** Faceted/relevance search upgrade (Meilisearch/Typesense).
- **[P3]** AI-personalized recommendations.

### 5.2 RFQ (Request for Quotation) — core matchmaking
- **[MVP]** Buyer posts an RFQ: product description, category, quantity, target price, destination, attachments, deadline.
- **[MVP]** Matching manufacturers are notified; manufacturers submit **quotes** (price, MOQ, lead time, incoterm, validity, notes).
- **[MVP]** Buyer compares quotes side-by-side and opens a conversation / proceeds to order.
- **[P2]** AI smart-matching of RFQs to the best-fit verified manufacturers and existing products.
- **[P2]** RFQ quote credits tied to subscription tier.

### 5.3 Messaging & inquiries
- **[MVP]** Threaded conversations between buyer and manufacturer, scoped to a product/RFQ/order.
- **[MVP]** **AI real-time translation** (中文 ↔ EN ↔ SW): each message stored with original + translated text; recipient reads in their language.
- **[MVP]** File/image attachments in chat.
- **[MVP]** In-app + email notifications on new messages (Resend).
- **[P2]** Realtime presence/typing (Supabase Realtime), read receipts.
- **[P3]** Voice notes with transcription/translation.

### 5.4 Trust & verification (the core wedge)
- **[MVP]** Verification tiers & badges: *Identity-checked* → *Verified Supplier* → *Premium Verified (inspected)*.
- **[MVP]** Admin verification workflow: manufacturer submits documents (business licence, etc.); admin reviews, approves/rejects, sets tier; only approved manufacturers appear publicly.
- **[MVP]** Trust signals on listings & storefronts: badge, response rate, transaction count, member-since, ratings.
- **[P2]** On-site / video factory inspection record (uploaded walkthrough video, inspector, date) → Premium Verified.
- **[P2]** Third-party inspection booking (SGS/Intertek-style) as a paid service.
- **[P3]** Certification document verification & expiry tracking.

### 5.5 Trade Assurance / escrow & orders
- **[MVP, basic]** Order object: items, quantities, agreed unit prices, incoterm, total, currency, status timeline (pending → paid → in production → shipped → delivered → completed). *For prototype, payment can be stubbed/sandbox.*
- **[P2]** **Escrow**: buyer funds held (M-Pesa/card via Paystack/Flutterwave + MoR), released to manufacturer on delivery confirmation; partial/full refund on dispute.
- **[P2]** Dispute workflow with admin mediation and evidence upload.
- **[P3]** Milestone/staged payments.

### 5.6 MOQ pooling (group buy) — differentiator
- **[P2]** Manufacturer/admin opens a group buy for a product: target quantity, deadline, pooled unit price tiers.
- **[P2]** Buyers join with a committed quantity; progress bar to target; auto-confirm or refund at deadline.
- **[P2]** Group-buy order splits fulfilment/shipping logically per participant.

### 5.7 Logistics & landed cost — differentiator
- **[MVP, calculator]** **Landed-cost estimator**: given product, quantity, weight/volume, destination → unit price + freight estimate + import duty (HS-based %) + VAT (16%) + KEBS/PVoC + clearing → **total in KES**, with FX rate shown and dated.
- **[P2]** Freight options (sea/air) with quotes, consolidation to Mombasa.
- **[P2]** Shipment tracking + customs document checklist (CoO, BL/AWB, PVoC, import licence, packing list).
- **[P3]** Direct carrier/forwarder integrations.

### 5.8 Reviews & social proof
- **[P2]** Verified-purchase reviews & ratings on manufacturers and products.
- **[P3]** Buyer community / sourcing guides (Xiaohongshu-style), Q&A on listings.
- **[P3]** Live / video product demos by manufacturers (Douyin-style).

### 5.9 Subscriptions & billing (manufacturer)
- **[MVP]** Subscription tiers with feature gating (listing limits, RFQ access, placement, verification level).
- **[MVP]** Checkout & management via **Merchant-of-Record** (Paddle / Lemon Squeezy) — handles global cards + cross-border tax/VAT. *Prototype can stub with sandbox keys.*
- **[P2]** Usage metering (listing/RFQ credits), upgrade/downgrade, invoices.

### 5.10 Dashboards
- **[MVP] Buyer dashboard** — inquiries, RFQs & quotes received, orders, group buys, saved items.
- **[MVP] Manufacturer dashboard** — products, inquiries, RFQs received & quotes sent, orders, storefront editor, verification status, subscription, basic analytics (views, inquiries, response rate).
- **[MVP] Admin dashboard** — manufacturer vetting queue, verifications, category management, users, disputes (P2), logistics (P2), platform metrics.

### 5.11 Cross-cutting
- **[MVP]** **i18n**: English (default), Kiswahili, 中文 — UI strings + auto-translated content.
- **[MVP]** Email notifications (Resend) for: welcome/verification, new inquiry, new message, new RFQ match, quote received, order status.
- **[MVP]** In-app notification center.
- **[MVP]** Responsive, mobile-first UI (most Kenyan buyers are on Android phones).
- **[P2]** PWA / installable; push notifications.
- **[MVP]** Basic AI support assistant (sourcing FAQ, "how it works") via Claude API.

### 5.12 Feature parity vs Alibaba.com (necessary features check)

| Alibaba.com feature | CargoScope equivalent | Priority |
|---|---|---|
| Supplier storefronts & catalogs | Manufacturer storefront + products | MVP |
| Product showcases / premium placement | Tier-based featured placement | MVP/P2 |
| RFQ / Buying Request Hub | RFQ system + quotes | MVP |
| Buyer–supplier messaging | Conversations + **AI translation** | MVP |
| Verified Supplier (3rd-party inspection) | Tiered verification + inspection record | MVP/P2 |
| Business Identity verification | Admin document verification | MVP |
| Trade Assurance (escrow) | Escrow + dispute mediation | P2 |
| Ratings / response rate / history | Reviews + trust metrics | MVP(metrics)/P2(reviews) |
| Inspection services | Paid inspection booking | P2 |
| Logistics / freight / DDP | Freight + landed cost + tracking | MVP(calc)/P2 |
| Secure payment | M-Pesa/card + MoR | MVP(sub)/P2(escrow) |
| Trade intelligence/analytics | Manufacturer + admin analytics | MVP(basic)/P3 |
| AI sourcing tools (Accio) | AI matching + support assistant | MVP(support)/P2(matching) |
| MOQ / tiered pricing / samples | MOQ + price tiers + sample requests | MVP |
| Group/low-MOQ sourcing | **MOQ pooling (group buy)** | P2 |

---

## 6. Tech stack

Chosen for: solo-maintainability, managed/no-ops, excellent Claude-Code ergonomics, and a clean upgrade path. Everything below is "someone else runs the uptime."

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 15** (App Router, React Server Components, Server Actions), **TypeScript** | One codebase for SSR site + API; great DX; Vercel-native |
| UI | **Tailwind CSS** + **shadcn/ui** (Radix) + **lucide-react** | Fast, accessible, consistent; Claude Code builds these well |
| Backend / DB | **Supabase** — Postgres, Auth, Storage, Realtime, Edge Functions | Consolidates DB + auth + file storage + realtime in one managed service |
| Schema / migrations | **Drizzle ORM** (typed) over Supabase Postgres | Type-safe schema, versioned migrations |
| Hosting | **Vercel** (Pro) | Hosting + CDN + SSL + preview deploys; commercial tier required |
| Auth | Supabase Auth — email/password + email OTP; phone OTP (for KE buyers); optional Google | Phone/OTP suits the Kenyan market |
| Email | **Resend** + **React Email** | Transactional + inquiry alerts; great deliverability |
| Subscriptions | **Paddle** or **Lemon Squeezy** (Merchant of Record) | Collects global manufacturer subs + handles cross-border VAT/tax |
| Buyer payments / escrow | **Paystack** or **Flutterwave** (M-Pesa, cards) | Kenyan rails, M-Pesa support |
| Search | Postgres FTS (`tsvector` + `pg_trgm`) → **Meilisearch/Typesense** later | Zero extra infra at MVP; swap when catalog grows |
| AI | **Anthropic Claude API** | Translation, listing enhancement, RFQ matching, support, landed-cost explainer |
| i18n | **next-intl** | EN / SW / ZH routing + message catalogs |
| Media | Supabase Storage + Next/Image (or Cloudflare R2 + Images) | Product photos, videos, docs |
| Forms / validation | **React Hook Form** + **Zod** | Typed, shared client/server validation |
| Client data | React Server Components + **TanStack Query** for interactive bits | Minimal client JS |
| Monitoring | **Sentry** | Error tracking (solo operator needs alerts) |
| Analytics | **Vercel Analytics** + **Plausible/Umami** | Traffic + product analytics |
| CI/CD | Vercel Git integration | Push-to-deploy, preview per PR |

### Environment variables (initial)
```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
# Anthropic
ANTHROPIC_API_KEY=
# Resend
RESEND_API_KEY=
# Payments (sandbox to start)
PADDLE_API_KEY=            # or LEMONSQUEEZY_API_KEY
PADDLE_WEBHOOK_SECRET=
PAYSTACK_SECRET_KEY=       # or FLUTTERWAVE_SECRET_KEY
PAYSTACK_PUBLIC_KEY=
# FX (landed cost) — e.g. open exchange rates / a free FX API
FX_API_KEY=
# Misc
NEXT_PUBLIC_SITE_URL=
SENTRY_DSN=
```

---

## 7. Architecture overview

```
                 ┌─────────────────────────────────────────────┐
   Buyers (KE)   │            Next.js 15 (Vercel)              │
   Manufacturers │  RSC pages • Server Actions • Route Handlers │
   Admin team    │  Tailwind + shadcn/ui • next-intl (EN/SW/ZH) │
        │        └───────────────┬──────────────┬──────────────┘
        │ HTTPS                  │              │
        ▼                        ▼              ▼
┌──────────────┐        ┌────────────────┐  ┌──────────────────┐
│   Supabase   │        │  Anthropic     │  │  Resend (email)  │
│  Postgres+RLS│        │  Claude API    │  │  React Email     │
│  Auth        │        │ (translate,    │  └──────────────────┘
│  Storage     │        │  match, assist)│
│  Realtime    │        └────────────────┘
│  Edge Funcs  │
└──────┬───────┘
       │ webhooks / server-to-server
       ▼
┌───────────────────────┐   ┌──────────────────────────┐
│ Paddle / Lemon Squeezy │   │ Paystack / Flutterwave    │
│ (manufacturer subs,    │   │ (buyer deposits, escrow,  │
│  MoR, global VAT)      │   │  M-Pesa, cards)           │
└───────────────────────┘   └──────────────────────────┘
```

- **Server Actions / Route Handlers** hold business logic; the Supabase service-role key is used only server-side.
- **RLS** is the security backbone — every table has policies; the client uses the anon key and can only touch rows it's allowed to.
- **Webhooks** (subscription events, payment events) are verified Route Handlers that update Postgres.
- **AI calls** are server-side only (never expose `ANTHROPIC_API_KEY` to the client).

---

## 8. Data model (Postgres / Supabase)

Key entities (fields abbreviated; all tables get `id uuid pk`, `created_at`, `updated_at`).

```
profiles            (id→auth.users, role enum[buyer|manufacturer|admin], full_name, phone, locale, country)

manufacturers       (id, owner_profile_id, company_name, slug, country, city, description,
                     year_established, main_categories[], certifications[], logo_url, banner_url,
                     verification_status enum[pending|identity|verified|premium|rejected],
                     subscription_tier enum[none|basic|verified|premium],
                     response_rate, member_since, is_published bool)

buyers              (id, owner_profile_id, company_name, country, city, business_reg_no, sector)

verifications       (id, manufacturer_id, type enum[identity|business|inspection], status,
                     documents jsonb, video_url, inspector, reviewed_by, reviewed_at, notes)

categories          (id, parent_id nullable, name_en, name_sw, name_zh, slug, icon, sort)

products            (id, manufacturer_id, category_id, title, description, attributes jsonb,
                     moq, unit, lead_time_days, hs_code, origin_country, certifications[],
                     customizable bool, sample_available bool, sample_price,
                     primary_image_url, status enum[draft|active|paused],
                     search_vector tsvector)

product_price_tiers (id, product_id, min_qty, unit_price, currency)
product_media       (id, product_id, type enum[image|video], url, sort)

rfqs                (id, buyer_id, category_id, title, description, quantity, unit,
                     target_unit_price, currency, destination_country, destination_city,
                     attachments jsonb, deadline, status enum[open|quoting|closed])

quotes              (id, rfq_id, manufacturer_id, unit_price, currency, moq, lead_time_days,
                     incoterm, valid_until, notes, status enum[submitted|accepted|declined])

conversations       (id, buyer_id, manufacturer_id, product_id nullable, rfq_id nullable, order_id nullable)
messages            (id, conversation_id, sender_profile_id, body, body_translated jsonb,
                     source_lang, attachments jsonb, read_at)

orders              (id, buyer_id, manufacturer_id, currency, incoterm, subtotal, total,
                     status enum[pending|paid|in_production|shipped|delivered|completed|cancelled],
                     escrow_status enum[none|held|released|refunded], notes)
order_items         (id, order_id, product_id, title_snapshot, quantity, unit_price)

escrow_transactions (id, order_id, provider, provider_ref, amount, currency,
                     status enum[initiated|held|released|refunded], event_log jsonb)

group_buys          (id, product_id, manufacturer_id, target_quantity, current_quantity,
                     unit_price, currency, deadline, status enum[open|reached|fulfilled|failed])
group_buy_parts     (id, group_buy_id, buyer_id, quantity, status)

shipments           (id, order_id, mode enum[sea|air], carrier, tracking_no, origin_port,
                     dest_port, status, documents jsonb, eta)

reviews             (id, order_id, buyer_id, manufacturer_id, product_id, rating, comment)

subscriptions       (id, manufacturer_id, tier, status, provider, provider_subscription_id,
                     current_period_end, cancel_at_period_end bool)

landed_cost_estimates (id, product_id nullable, rfq_id nullable, inputs jsonb, breakdown jsonb,
                       fx_rate, fx_dated_at, total_kes)

notifications       (id, profile_id, type, title, body, link, read_at)
disputes            (id, order_id, opened_by, reason, evidence jsonb, status, resolution)
```

Indexes: `products.search_vector` (GIN), `products(category_id)`, `products(manufacturer_id)`, FKs, `quotes(rfq_id)`, `messages(conversation_id)`.

---

## 9. Route / page structure (App Router)

```
/                              Home (value prop, featured verified manufacturers, categories, how-it-works CTA)
/[locale]/...                  next-intl locale segment (en | sw | zh)

# Public
/products                      Browse + search + filters
/products/[id]                 Product detail (trust panel, landed-cost, inquire, sample, group-buy)
/manufacturers                 Directory (verified)
/manufacturers/[slug]          Storefront
/categories/[slug]             Category landing
/search                        Search results
/how-it-works                  Buyer trust story
/pricing                       Manufacturer subscription plans
/auth/(login|register|verify)  Auth (role chosen at register)

# Buyer (auth, role=buyer)
/dashboard                     Overview
/dashboard/rfqs                List + /new
/dashboard/inquiries           Conversations
/dashboard/orders              List + /[id]
/dashboard/group-buys
/dashboard/saved

# Manufacturer (auth, role=manufacturer)
/seller                        Overview + analytics
/seller/onboarding             Profile + verification submission
/seller/products               List + /new + /[id]/edit
/seller/rfqs                   Received RFQs + quote form
/seller/quotes                 Sent quotes
/seller/inquiries              Conversations
/seller/orders                 List + /[id]
/seller/storefront             Storefront editor
/seller/verification           Status + document upload
/seller/subscription           Plan + billing (MoR)

# Admin (auth, role=admin)
/admin                         Metrics
/admin/manufacturers           Vetting queue + detail
/admin/verifications           Review documents/inspections
/admin/categories              CRUD
/admin/users
/admin/disputes                (P2)
/admin/logistics               (P2)

# Shared
/messages, /messages/[id]      Conversation view (AI-translated)
/notifications

# API / Route Handlers
/api/webhooks/paddle           Subscription events (verified)
/api/webhooks/paystack         Payment/escrow events (verified)
/api/ai/translate              Server-only Claude translation
/api/ai/assist                 Support assistant
/api/landed-cost               Estimator (FX + duty + VAT)
```

---

## 10. Auth, roles & RLS

- **Auth:** Supabase Auth. Register flow asks role (buyer or manufacturer). Admin role granted manually (DB / admin panel).
- **Buyers (KE):** prefer phone OTP; **Manufacturers (CN):** email/password (+ optional Google). Locale captured at signup.
- **RLS policy summary:**
  - `profiles`: a user reads/writes only their own row; admins read all.
  - `manufacturers`/`products`: owner has full CRUD on own rows; **public read only where `is_published`/`status='active'` and verification approved**; admins full access.
  - `rfqs`: buyer CRUD own; manufacturers read RFQs matching their categories (or all open) to quote; admins all.
  - `quotes`: manufacturer CRUD own; the RFQ's buyer can read quotes on their RFQ; admins all.
  - `conversations`/`messages`: only the two participants (buyer + manufacturer) and admins.
  - `orders`/`order_items`/`escrow`: only the order's buyer + manufacturer + admins.
  - `verifications`/`disputes`: owner can read own + create; only admins update status.
- Service-role key used **only** in server actions / route handlers / webhooks — never shipped to client.

---

## 11. Security & compliance

- **Payments:** never store card data — tokenize via MoR (subs) and Paystack/Flutterwave (buyer). This keeps PCI scope minimal (SAQ-A-style).
- **Kenya Data Protection Act (2019):** register with ODPC as data controller; capture lawful basis & consent; support data subject rights (export/delete); breach process. Build consent + deletion into the data model from day one.
- **VAT / eTIMS:** below KES 5M turnover, don't charge VAT on sales (manufacturer subs to CN are export-of-services / zero-rated); foreign SaaS inputs carry non-reclaimable 16% VAT. From Jan 2026, issue eTIMS-compliant invoices — build invoicing structured for this.
- **KEBS / PVoC awareness:** surface conformity requirements in landed-cost & shipment docs (informational, not a guarantee).
- **App security:** RLS everywhere, server-side secrets only, signed Storage URLs for private docs, rate-limit auth + messaging + AI endpoints, input validation with Zod, audit-log admin actions.
- **Email deliverability:** dedicated sender (Resend) with SPF/DKIM/DMARC.

---

## 12. AI features (Claude API) — implementation notes

All server-side. Suggested usages:
- **Message translation** — on send, translate to recipient locale; store `{en, sw, zh}` in `body_translated`. Cache.
- **Listing translation & enhancement** — manufacturer writes in 中文; generate EN/SW + cleaned-up marketing copy (manufacturer approves before publish).
- **RFQ smart-matching (P2)** — rank verified manufacturers/products against an RFQ.
- **Landed-cost explainer / HS suggestion** — explain the cost breakdown in plain language; suggest HS code from product description (with disclaimer).
- **Buyer support assistant** — answers "how it works", sourcing basics, escrow/trust questions; never gives binding legal/tax advice.
- **Manufacturer listing-quality assistant** — flags missing specs/images, suggests improvements.

Guardrails: prompt-inject defense on user content, no exposure of other users' data, disclaimers on tax/customs outputs.

---

## 13. Prototype scope (build this first)

The MVP must demonstrate the **core trust loop** end-to-end:

1. **Auth + roles** (buyer / manufacturer / admin) with Supabase; locale at signup.
2. **Manufacturer onboarding** → profile + document upload → **admin vetting queue** → approve & set verification tier → manufacturer becomes publicly visible with badge.
3. **Product management** — manufacturer creates products (MOQ, price tiers, media, category, specs, HS code).
4. **Public catalog** — home, categories, search + filters, product detail, **manufacturer storefront**, with **trust signals/badges** prominent.
5. **Landed-cost calculator** on product detail (unit × qty + freight estimate + duty% + 16% VAT + clearing → KES, with FX rate shown). *The signature differentiator — must be in the prototype.*
6. **Inquiry / messaging** between buyer & manufacturer with **AI translation** (EN/SW/ZH).
7. **RFQ flow** — buyer posts RFQ → matching manufacturers notified → quotes → buyer compares.
8. **Manufacturer subscription tiers** with feature gating (MoR in sandbox; can stub the paywall).
9. **Three dashboards** (buyer, manufacturer, admin) covering the above.
10. **Email notifications** (Resend) for inquiry/message/quote/verification.
11. **i18n scaffolding** (EN default, SW, ZH) + mobile-first responsive UI.
12. **Sentry** wired; basic analytics.

**Explicitly deferred from prototype:** escrow/Trade Assurance payment flow (model the order object, stub payment), group buying, live freight/tracking integration, reviews, live/video commerce, advanced AI matching, dispute mediation. (All present in schema so nothing needs re-architecting later.)

Seed data: a few categories, 3–5 sample verified manufacturers, ~15 products with tiered pricing & media, one open RFQ, one buyer + one manufacturer + one admin account.

---

## 14. Build roadmap

- **Phase 1 — MVP (prototype):** §13 above. Goal: a clickable, trust-first sourcing loop a real buyer and a real manufacturer can use, in three languages, with landed-cost transparency.
- **Phase 2:** Escrow + M-Pesa/card payments, disputes, reviews & response metrics, MOQ group buy, freight options + shipment tracking + customs docs, AI RFQ matching, search upgrade (Meilisearch), inspection records → Premium Verified, PWA + push.
- **Phase 3:** Live/video product demos, buyer community/sourcing guides, financing, deeper logistics/carrier integrations, recommendations, multi-country expansion (beyond KE), advanced analytics/trade intelligence.

---

## 15. Notes for Claude Code

- Scaffold with `create-next-app` (TS, App Router, Tailwind), add `shadcn/ui`, `drizzle-orm` + `drizzle-kit`, `@supabase/supabase-js` + `@supabase/ssr`, `next-intl`, `react-hook-form` + `zod`, `@tanstack/react-query`, `resend` + `@react-email/components`, `@sentry/nextjs`, `lucide-react`.
- Generate the Drizzle schema from §8, then RLS policies from §10 as SQL migrations.
- Use **Server Actions** for mutations; **Route Handlers** for webhooks and AI endpoints.
- Keep all secrets server-side; expose only `NEXT_PUBLIC_*`.
- Mobile-first; assume Android phone as the primary buyer device.
- Build incrementally in the §13 order; commit per feature; seed data early so pages render.

---

## 16. Brand & design direction (for Beyond Canvas)

- **Name:** CargoScope — "scope" = both *inspect/see clearly* (trust, verification) and *reach/range* (breadth of supply). Lean into both in copy and logo.
- **Tone:** trustworthy, clear, in-region. Plainly localized for African buyers; professional enough for Chinese factories.
- **Visual language:** verification/clarity motifs (checkmarks, focus/lens, bridge). Trust-forward palette (deep navy or teal as base, a confident accent; gold sparingly for "verified/premium"). Clean, flat, mobile-first. Prominent trust badges and the landed-cost figure as hero UI moments.
- **Trust UI hierarchy:** verification badge → response/transaction metrics → landed-cost-in-KES are the three things a buyer must see immediately on every listing.

---

*End of spec. Build the §13 prototype first; the schema anticipates everything in Phase 2–3 so the trust loop can grow into the full Alibaba-parity product without re-architecting.*
