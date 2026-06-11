import "server-only"

import { count, eq } from "drizzle-orm"
import { getLocale } from "next-intl/server"

import { db } from "@/lib/db"
import { categories, manufacturers, products } from "@/lib/db/schema"
import { createClient } from "@/lib/supabase/server"
import { parseSpecs, type ProductSpec } from "@/lib/products/specs"
import type { VerificationTier } from "@/lib/manufacturers/queries"

const PUBLIC_TIERS = ["identity", "verified", "premium"] as const

export type CatalogSort = "recent" | "popular" | "priceAsc" | "priceDesc"

export interface CatalogFilters {
  q?: string
  category?: string // category slug
  tier?: VerificationTier
  maxMoq?: number
  maxLeadTime?: number
  minPrice?: number
  maxPrice?: number
  origin?: string
  sort?: CatalogSort
}

export interface CatalogManufacturerRef {
  companyName: string
  slug: string
  country: string | null
  verificationStatus: VerificationTier
}

export interface ProductCard {
  id: string
  title: string
  primaryImageUrl: string | null
  moq: number | null
  unit: string
  leadTimeDays: number | null
  originCountry: string | null
  minPrice: number | null
  currency: string
  manufacturer: CatalogManufacturerRef
}

export interface PublicPriceTier {
  id: string
  minQty: number
  unitPrice: string
  currency: string
}

export interface PublicMediaItem {
  id: string
  type: "image" | "video"
  url: string
  sort: number
}

export interface StorefrontManufacturer {
  id: string
  companyName: string
  slug: string
  country: string | null
  city: string | null
  description: string | null
  yearEstablished: number | null
  certifications: string[]
  mainCategories: string[]
  verificationStatus: VerificationTier
  responseRate: number | null
  memberSince: string | null
  logoUrl: string | null
  bannerUrl: string | null
}

export interface PublicProductDetail {
  id: string
  title: string
  description: string | null
  moq: number | null
  unit: string
  leadTimeDays: number | null
  hsCode: string | null
  originCountry: string | null
  certifications: string[]
  customizable: boolean
  sampleAvailable: boolean
  samplePrice: string | null
  unitWeightKg: number | null
  unitVolumeCbm: number | null
  primaryImageUrl: string | null
  categoryId: string | null
  priceTiers: PublicPriceTier[]
  media: PublicMediaItem[]
  specs: ProductSpec[]
  manufacturer: StorefrontManufacturer
}

export interface FilterCategory {
  id: string
  slug: string
  name: string
}

// Kept as single string literals (not concatenated) so supabase-js infers the
// query result type instead of falling back to GenericStringError.
const CARD_SELECT =
  "id, title, primary_image_url, moq, unit, lead_time_days, origin_country, created_at, manufacturers!inner(company_name, slug, country, verification_status, is_published), product_price_tiers(unit_price, currency)"

const DETAIL_SELECT =
  "id, title, description, moq, unit, lead_time_days, hs_code, origin_country, certifications, customizable, sample_available, sample_price, unit_weight_kg, unit_volume_cbm, primary_image_url, category_id, attributes, manufacturers!inner(id, company_name, slug, country, city, description, year_established, certifications, main_categories, verification_status, response_rate, member_since, logo_url, banner_url, is_published), product_price_tiers(id, min_qty, unit_price, currency), product_media(id, type, url, sort)"

const MANUFACTURER_CARD_SELECT =
  "id, company_name, slug, country, city, verification_status, year_established, member_since, response_rate, certifications, main_categories, logo_url, banner_url, description"

// PostgREST returns a to-one embed as an object, but can surface it as a
// single-element array depending on relationship inference. Normalise both.
function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

function localizedCategoryName(
  row: { name_en: string; name_sw: string | null; name_zh: string | null },
  locale: string
): string {
  if (locale === "sw" && row.name_sw) return row.name_sw
  if (locale === "zh" && row.name_zh) return row.name_zh
  return row.name_en
}

function minTierPrice(
  tiers: { unit_price: string; currency: string }[] | null
): { price: number | null; currency: string } {
  let price: number | null = null
  let currency = "USD"
  for (const tier of tiers ?? []) {
    const value = Number(tier.unit_price)
    if (!Number.isNaN(value) && (price === null || value < price)) {
      price = value
      currency = tier.currency
    }
  }
  return { price, currency }
}

type CardManufacturer = {
  company_name: string
  slug: string
  country: string | null
  verification_status: VerificationTier
}

type CardRow = {
  id: string
  title: string
  primary_image_url: string | null
  moq: number | null
  unit: string
  lead_time_days: number | null
  origin_country: string | null
  manufacturers: CardManufacturer | CardManufacturer[]
  product_price_tiers: { unit_price: string; currency: string }[] | null
}

function mapCard(row: CardRow): ProductCard | null {
  const m = one(row.manufacturers)
  if (!m) return null
  const { price, currency } = minTierPrice(row.product_price_tiers)
  return {
    id: row.id,
    title: row.title,
    primaryImageUrl: row.primary_image_url,
    moq: row.moq,
    unit: row.unit,
    leadTimeDays: row.lead_time_days,
    originCountry: row.origin_country,
    minPrice: price,
    currency,
    manufacturer: {
      companyName: m.company_name,
      slug: m.slug,
      country: m.country,
      verificationStatus: m.verification_status,
    },
  }
}

function mapStorefrontManufacturer(m: {
  id: string
  company_name: string
  slug: string
  country: string | null
  city: string | null
  description: string | null
  year_established: number | null
  certifications: string[] | null
  main_categories: string[] | null
  verification_status: VerificationTier
  response_rate: number | null
  member_since: string | null
  logo_url: string | null
  banner_url: string | null
}): StorefrontManufacturer {
  return {
    id: m.id,
    companyName: m.company_name,
    slug: m.slug,
    country: m.country,
    city: m.city,
    description: m.description,
    yearEstablished: m.year_established,
    certifications: m.certifications ?? [],
    mainCategories: m.main_categories ?? [],
    verificationStatus: m.verification_status,
    responseRate: m.response_rate,
    memberSince: m.member_since,
    logoUrl: m.logo_url,
    bannerUrl: m.banner_url,
  }
}

/** Localised category list (id, slug, name) for the catalog filter. */
export async function getFilterCategories(): Promise<FilterCategory[]> {
  const locale = await getLocale()
  const supabase = await createClient()
  const { data } = await supabase
    .from("categories")
    .select("id, slug, name_en, name_sw, name_zh")
    .order("sort", { ascending: true })

  return (data ?? []).map((row) => ({
    id: row.id,
    slug: row.slug,
    name: localizedCategoryName(row, locale),
  }))
}

/**
 * Public catalog browse. Only active products from published, verified
 * manufacturers are returned — independent of who is viewing, so the catalog
 * is consistent for anon, buyer, and a manufacturer browsing competitors.
 * Price-range and price sort are applied in memory over the fetched page.
 */
export async function searchProducts(
  filters: CatalogFilters
): Promise<{ items: ProductCard[]; total: number }> {
  const supabase = await createClient()

  let categoryId: string | null = null
  if (filters.category) {
    const { data: cat } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", filters.category)
      .maybeSingle()
    if (!cat) return { items: [], total: 0 }
    categoryId = cat.id
  }

  let query = supabase
    .from("products")
    .select(CARD_SELECT)
    .eq("status", "active")
    .eq("manufacturers.is_published", true)
    .in("manufacturers.verification_status", [...PUBLIC_TIERS])

  if (filters.tier) {
    query = query.eq("manufacturers.verification_status", filters.tier)
  }
  if (categoryId) query = query.eq("category_id", categoryId)
  if (filters.q) {
    query = query.textSearch("search_vector", filters.q, {
      type: "websearch",
      config: "simple",
    })
  }
  if (typeof filters.maxMoq === "number") {
    query = query.lte("moq", filters.maxMoq)
  }
  if (typeof filters.maxLeadTime === "number") {
    query = query.lte("lead_time_days", filters.maxLeadTime)
  }
  if (filters.origin) {
    query = query.ilike("origin_country", `%${filters.origin}%`)
  }

  const { data } = await query
    .order("created_at", { ascending: false })
    .limit(120)

  let items = (data ?? [])
    .map((row) => mapCard(row as CardRow))
    .filter((item): item is ProductCard => item !== null)

  if (typeof filters.minPrice === "number") {
    const min = filters.minPrice
    items = items.filter((p) => p.minPrice !== null && p.minPrice >= min)
  }
  if (typeof filters.maxPrice === "number") {
    const max = filters.maxPrice
    items = items.filter((p) => p.minPrice !== null && p.minPrice <= max)
  }

  if (filters.sort === "priceAsc" || filters.sort === "priceDesc") {
    const dir = filters.sort === "priceAsc" ? 1 : -1
    items = [...items].sort((a, b) => {
      if (a.minPrice === null) return 1
      if (b.minPrice === null) return -1
      return (a.minPrice - b.minPrice) * dir
    })
  }

  return { items, total: items.length }
}

/**
 * Highest catalogue "from" price (USD) across published products — the upper
 * bound for the price-range slider. Pulls only price tiers so it stays light.
 */
export async function getPriceCeilingUsd(): Promise<number> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("products")
    .select(
      "product_price_tiers(unit_price, currency), manufacturers!inner(is_published, verification_status)"
    )
    .eq("status", "active")
    .eq("manufacturers.is_published", true)
    .in("manufacturers.verification_status", [...PUBLIC_TIERS])
    .limit(1000)

  let max = 0
  for (const row of data ?? []) {
    const { price } = minTierPrice(
      (
        row as {
          product_price_tiers: { unit_price: string; currency: string }[] | null
        }
      ).product_price_tiers
    )
    if (price !== null && price > max) max = price
  }
  return max
}

/** Headline catalogue counts for the homepage social-proof strip. */
export async function getCatalogStats(): Promise<{
  suppliers: number
  products: number
  categories: number
}> {
  const [sup, prod, cat] = await Promise.all([
    db
      .select({ c: count() })
      .from(manufacturers)
      .where(eq(manufacturers.isPublished, true)),
    db.select({ c: count() }).from(products).where(eq(products.status, "active")),
    db.select({ c: count() }).from(categories),
  ])
  return {
    suppliers: sup[0]?.c ?? 0,
    products: prod[0]?.c ?? 0,
    categories: cat[0]?.c ?? 0,
  }
}

type ManufacturerRow = Parameters<typeof mapStorefrontManufacturer>[0]

type DetailRow = {
  id: string
  title: string
  description: string | null
  moq: number | null
  unit: string
  lead_time_days: number | null
  hs_code: string | null
  origin_country: string | null
  certifications: string[] | null
  customizable: boolean
  sample_available: boolean
  sample_price: string | null
  unit_weight_kg: string | null
  unit_volume_cbm: string | null
  primary_image_url: string | null
  category_id: string | null
  attributes: unknown
  manufacturers: ManufacturerRow | ManufacturerRow[]
  product_price_tiers:
    | { id: string; min_qty: number; unit_price: string; currency: string }[]
    | null
  product_media:
    | { id: string; type: "image" | "video"; url: string; sort: number }[]
    | null
}

/** A single publicly visible product with its manufacturer trust panel. */
export async function getPublicProduct(
  id: string
): Promise<PublicProductDetail | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("products")
    .select(DETAIL_SELECT)
    .eq("id", id)
    .eq("status", "active")
    .eq("manufacturers.is_published", true)
    .in("manufacturers.verification_status", [...PUBLIC_TIERS])
    .maybeSingle()

  if (!data) return null
  const row = data as DetailRow
  const m = one(row.manufacturers)
  if (!m) return null

  const priceTiers = (row.product_price_tiers ?? [])
    .map((t) => ({
      id: t.id,
      minQty: t.min_qty,
      unitPrice: t.unit_price,
      currency: t.currency,
    }))
    .sort((a, b) => a.minQty - b.minQty)

  const media = (row.product_media ?? [])
    .map((mi) => ({ id: mi.id, type: mi.type, url: mi.url, sort: mi.sort }))
    .sort((a, b) => a.sort - b.sort)

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    moq: row.moq,
    unit: row.unit,
    leadTimeDays: row.lead_time_days,
    hsCode: row.hs_code,
    originCountry: row.origin_country,
    certifications: row.certifications ?? [],
    customizable: Boolean(row.customizable),
    sampleAvailable: Boolean(row.sample_available),
    samplePrice: row.sample_price,
    unitWeightKg: row.unit_weight_kg ? Number(row.unit_weight_kg) : null,
    unitVolumeCbm: row.unit_volume_cbm ? Number(row.unit_volume_cbm) : null,
    primaryImageUrl: row.primary_image_url,
    categoryId: row.category_id,
    priceTiers,
    media,
    specs: parseSpecs(row.attributes),
    manufacturer: mapStorefrontManufacturer(m),
  }
}

/** Directory of published, verified manufacturers. */
export async function getVerifiedManufacturers(
  q?: string
): Promise<StorefrontManufacturer[]> {
  const supabase = await createClient()
  let query = supabase
    .from("manufacturers")
    .select(MANUFACTURER_CARD_SELECT)
    .eq("is_published", true)
    .in("verification_status", [...PUBLIC_TIERS])

  if (q) query = query.ilike("company_name", `%${q}%`)

  const { data } = await query.order("company_name", { ascending: true })
  return (data ?? []).map((row) =>
    mapStorefrontManufacturer(
      row as Parameters<typeof mapStorefrontManufacturer>[0]
    )
  )
}

/** A manufacturer storefront (public profile + its active products). */
export async function getManufacturerStorefront(
  slug: string
): Promise<{ manufacturer: StorefrontManufacturer; products: ProductCard[] } | null> {
  const supabase = await createClient()
  const { data: m } = await supabase
    .from("manufacturers")
    .select(MANUFACTURER_CARD_SELECT)
    .eq("slug", slug)
    .eq("is_published", true)
    .in("verification_status", [...PUBLIC_TIERS])
    .maybeSingle()

  if (!m) return null
  const manufacturer = mapStorefrontManufacturer(
    m as Parameters<typeof mapStorefrontManufacturer>[0]
  )

  const { data: productRows } = await supabase
    .from("products")
    .select(CARD_SELECT)
    .eq("status", "active")
    .eq("manufacturer_id", manufacturer.id)
    .eq("manufacturers.is_published", true)
    .order("created_at", { ascending: false })

  const products = (productRows ?? [])
    .map((row) => mapCard(row as CardRow))
    .filter((item): item is ProductCard => item !== null)

  return { manufacturer, products }
}

/** Featured products from Premium-tier suppliers — home "Top picks" rail. */
export async function getFeaturedProducts(limit = 8): Promise<ProductCard[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("products")
    .select(CARD_SELECT)
    .eq("status", "active")
    .eq("manufacturers.is_published", true)
    .eq("manufacturers.subscription_tier", "premium")
    .order("created_at", { ascending: false })
    .limit(limit * 2)
  return (data ?? [])
    .map((row) => mapCard(row as CardRow))
    .filter((item): item is ProductCard => item !== null)
    .slice(0, limit)
}

/** "You may also like" — active products in the same category, excluding self. */
export async function getRelatedProducts(opts: {
  productId: string
  categoryId: string | null
  limit?: number
}): Promise<ProductCard[]> {
  const supabase = await createClient()
  let query = supabase
    .from("products")
    .select(CARD_SELECT)
    .eq("status", "active")
    .eq("manufacturers.is_published", true)
    .in("manufacturers.verification_status", [...PUBLIC_TIERS])
    .neq("id", opts.productId)
  if (opts.categoryId) query = query.eq("category_id", opts.categoryId)

  const { data } = await query.order("created_at", { ascending: false }).limit(24)
  return (data ?? [])
    .map((row) => mapCard(row as CardRow))
    .filter((item): item is ProductCard => item !== null)
    .slice(0, opts.limit ?? 6)
}
