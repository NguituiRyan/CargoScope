import "server-only"

import { getLocale } from "next-intl/server"

import { createClient } from "@/lib/supabase/server"
import { parseSpecs, type ProductSpec } from "@/lib/products/specs"

export type ProductStatus = "draft" | "active" | "paused"
export type MediaType = "image" | "video"

export interface PriceTier {
  id: string
  minQty: number
  unitPrice: string
  currency: string
}

export interface ProductMediaItem {
  id: string
  type: MediaType
  url: string
  sort: number
}

export interface ProductListItem {
  id: string
  title: string
  status: ProductStatus
  primaryImageUrl: string | null
  moq: number | null
  unit: string
  tierCount: number
  updatedAt: string
}

export interface ProductDetail {
  id: string
  title: string
  description: string | null
  categoryId: string | null
  moq: number | null
  unit: string
  leadTimeDays: number | null
  hsCode: string | null
  originCountry: string | null
  certifications: string[]
  customizable: boolean
  sampleAvailable: boolean
  samplePrice: string | null
  unitWeightKg: string | null
  unitVolumeCbm: string | null
  primaryImageUrl: string | null
  status: ProductStatus
  priceTiers: PriceTier[]
  media: ProductMediaItem[]
  specs: ProductSpec[]
}

export interface CategoryOption {
  id: string
  name: string
}

type CountAgg = { count: number }

type ProductListRow = {
  id: string
  title: string
  status: ProductStatus
  primary_image_url: string | null
  moq: number | null
  unit: string
  updated_at: string
  product_price_tiers: CountAgg[] | null
}

type PriceTierRow = {
  id: string
  min_qty: number
  unit_price: string
  currency: string
}

type ProductMediaRow = {
  id: string
  type: MediaType
  url: string
  sort: number
}

type ProductDetailRow = {
  id: string
  title: string
  description: string | null
  category_id: string | null
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
  status: ProductStatus
  attributes: unknown
  product_price_tiers: PriceTierRow[] | null
  product_media: ProductMediaRow[] | null
}

const LIST_COLUMNS =
  "id, title, status, primary_image_url, moq, unit, updated_at, product_price_tiers(count)"

const DETAIL_COLUMNS =
  "id, title, description, category_id, moq, unit, lead_time_days, hs_code, origin_country, certifications, customizable, sample_available, sample_price, unit_weight_kg, unit_volume_cbm, primary_image_url, status, attributes, product_price_tiers(id, min_qty, unit_price, currency), product_media(id, type, url, sort)"

function mapList(row: ProductListRow): ProductListItem {
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    primaryImageUrl: row.primary_image_url,
    moq: row.moq,
    unit: row.unit,
    tierCount: row.product_price_tiers?.[0]?.count ?? 0,
    updatedAt: row.updated_at,
  }
}

function mapDetail(row: ProductDetailRow): ProductDetail {
  const priceTiers = (row.product_price_tiers ?? [])
    .map((t) => ({
      id: t.id,
      minQty: t.min_qty,
      unitPrice: t.unit_price,
      currency: t.currency,
    }))
    .sort((a, b) => a.minQty - b.minQty)

  const media = (row.product_media ?? [])
    .map((m) => ({ id: m.id, type: m.type, url: m.url, sort: m.sort }))
    .sort((a, b) => a.sort - b.sort)

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    categoryId: row.category_id,
    moq: row.moq,
    unit: row.unit,
    leadTimeDays: row.lead_time_days,
    hsCode: row.hs_code,
    originCountry: row.origin_country,
    certifications: row.certifications ?? [],
    customizable: row.customizable,
    sampleAvailable: row.sample_available,
    samplePrice: row.sample_price,
    unitWeightKg: row.unit_weight_kg,
    unitVolumeCbm: row.unit_volume_cbm,
    primaryImageUrl: row.primary_image_url,
    status: row.status,
    priceTiers,
    media,
    specs: parseSpecs(row.attributes),
  }
}

/** Products owned by the given manufacturer, newest-updated first. */
export async function getMyProducts(
  manufacturerId: string
): Promise<ProductListItem[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("products")
    .select(LIST_COLUMNS)
    .eq("manufacturer_id", manufacturerId)
    .order("updated_at", { ascending: false })

  return (data ?? []).map((row) => mapList(row as ProductListRow))
}

/** A single product owned by the manufacturer, with tiers + media, or null. */
export async function getMyProduct(
  manufacturerId: string,
  productId: string
): Promise<ProductDetail | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("products")
    .select(DETAIL_COLUMNS)
    .eq("id", productId)
    .eq("manufacturer_id", manufacturerId)
    .maybeSingle()

  return data ? mapDetail(data as ProductDetailRow) : null
}

/** Categories as localized {id, name} options for the current locale. */
export async function getCategoryOptions(): Promise<CategoryOption[]> {
  const locale = await getLocale()
  const supabase = await createClient()
  const { data } = await supabase
    .from("categories")
    .select("id, name_en, name_sw, name_zh, sort")
    .order("sort", { ascending: true })

  type Row = {
    id: string
    name_en: string
    name_sw: string | null
    name_zh: string | null
  }
  return (data ?? []).map((row) => {
    const r = row as Row
    const localized =
      locale === "sw" ? r.name_sw : locale === "zh" ? r.name_zh : r.name_en
    return { id: r.id, name: localized || r.name_en }
  })
}
