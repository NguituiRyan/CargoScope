"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { getLocale } from "next-intl/server"

import { localePath, requireRole } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"
import { parseSpecInputs } from "@/lib/products/specs"
import { tierLimits } from "@/lib/subscription/tiers"
import type { SupabaseClient } from "@supabase/supabase-js"

export interface ProductActionState {
  error?: string
  ok?: boolean
}

const ALLOWED_IMAGE_MIME = new Set(["image/jpeg", "image/png", "image/webp"])
const ALLOWED_VIDEO_MIME = new Set(["video/mp4", "video/webm"])
const MAX_IMAGE_BYTES = 10 * 1024 * 1024
const MAX_VIDEO_BYTES = 50 * 1024 * 1024
const MAX_MEDIA_FILES = 8
const MAX_TIERS = 8
const PRODUCT_STATUSES = new Set(["draft", "active", "paused"])
const BUCKET = "product-media"
const PUBLIC_MARKER = "/storage/v1/object/public/product-media/"

function splitList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 12)
}

function safeName(name: string, fallback: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80) || fallback
}

async function myManufacturerId(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("manufacturers")
    .select("id")
    .eq("owner_profile_id", userId)
    .maybeSingle()
  return (data?.id as string | undefined) ?? null
}

interface TierInput {
  min_qty: number
  unit_price: string
  currency: string
}

/** Parse repeated tierMinQty/tierUnitPrice fields into validated rows. */
function parseTiers(formData: FormData): TierInput[] | { error: string } {
  const minQtys = formData.getAll("tierMinQty").map((v) => String(v).trim())
  const prices = formData.getAll("tierUnitPrice").map((v) => String(v).trim())
  const rows: TierInput[] = []

  for (let i = 0; i < Math.max(minQtys.length, prices.length); i++) {
    const q = minQtys[i] ?? ""
    const p = prices[i] ?? ""
    if (!q && !p) continue // skip blank rows
    const qty = Number(q)
    const price = Number(p)
    if (!Number.isInteger(qty) || qty < 1) {
      return { error: "Each price tier needs a whole minimum quantity of 1 or more." }
    }
    if (!Number.isFinite(price) || price < 0) {
      return { error: "Each price tier needs a valid unit price." }
    }
    rows.push({ min_qty: qty, unit_price: price.toFixed(2), currency: "USD" })
  }
  if (rows.length > MAX_TIERS) {
    return { error: `Add at most ${MAX_TIERS} price tiers.` }
  }
  return rows
}

export async function saveProductAction(
  _prev: ProductActionState,
  formData: FormData
): Promise<ProductActionState> {
  const user = await requireRole("manufacturer")
  const supabase = await createClient()

  const manufacturerId = await myManufacturerId(supabase, user.id)
  if (!manufacturerId) return { error: "Create your company profile first." }

  const productId = String(formData.get("productId") ?? "").trim()

  const title = String(formData.get("title") ?? "").trim()
  if (title.length < 3) return { error: "Enter a product title." }

  const description = String(formData.get("description") ?? "").trim()
  const categoryId = String(formData.get("categoryId") ?? "").trim()
  const unit = String(formData.get("unit") ?? "").trim() || "piece"
  const hsCode = String(formData.get("hsCode") ?? "").trim()
  const originCountry = String(formData.get("originCountry") ?? "").trim()
  const certifications = splitList(String(formData.get("certifications") ?? ""))
  const customizable = formData.get("customizable") === "on"
  const sampleAvailable = formData.get("sampleAvailable") === "on"

  const status = String(formData.get("status") ?? "draft")
  if (!PRODUCT_STATUSES.has(status)) return { error: "Choose a listing status." }

  const moqRaw = String(formData.get("moq") ?? "").trim()
  let moq: number | null = null
  if (moqRaw) {
    const parsed = Number(moqRaw)
    if (!Number.isInteger(parsed) || parsed < 1) {
      return { error: "Enter a whole minimum order quantity of 1 or more." }
    }
    moq = parsed
  }

  const leadRaw = String(formData.get("leadTimeDays") ?? "").trim()
  let leadTimeDays: number | null = null
  if (leadRaw) {
    const parsed = Number(leadRaw)
    if (!Number.isInteger(parsed) || parsed < 0 || parsed > 3650) {
      return { error: "Enter a valid lead time in days." }
    }
    leadTimeDays = parsed
  }

  const samplePriceRaw = String(formData.get("samplePrice") ?? "").trim()
  let samplePrice: string | null = null
  if (sampleAvailable && samplePriceRaw) {
    const parsed = Number(samplePriceRaw)
    if (!Number.isFinite(parsed) || parsed < 0) {
      return { error: "Enter a valid sample price." }
    }
    samplePrice = parsed.toFixed(2)
  }

  // Packaging per unit — powers buyer shipping estimates (kg for air, CBM for sea).
  const unitWeightRaw = String(formData.get("unitWeightKg") ?? "").trim()
  let unitWeightKg: string | null = null
  if (unitWeightRaw) {
    const parsed = Number(unitWeightRaw)
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 10000) {
      return { error: "Enter a valid packaging weight in kg." }
    }
    unitWeightKg = parsed > 0 ? parsed.toFixed(3) : null
  }
  const unitVolumeRaw = String(formData.get("unitVolumeCbm") ?? "").trim()
  let unitVolumeCbm: string | null = null
  if (unitVolumeRaw) {
    const parsed = Number(unitVolumeRaw)
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
      return { error: "Enter a valid packaging volume in CBM." }
    }
    unitVolumeCbm = parsed > 0 ? parsed.toFixed(4) : null
  }

  const tiers = parseTiers(formData)
  if (!Array.isArray(tiers)) return { error: tiers.error }

  const specs = parseSpecInputs(
    formData.getAll("specName").map((v) => String(v)),
    formData.getAll("specValue").map((v) => String(v))
  )

  const payload = {
    title,
    description: description || null,
    category_id: categoryId || null,
    moq,
    unit,
    lead_time_days: leadTimeDays,
    hs_code: hsCode || null,
    origin_country: originCountry || null,
    certifications,
    customizable,
    sample_available: sampleAvailable,
    sample_price: samplePrice,
    unit_weight_kg: unitWeightKg,
    unit_volume_cbm: unitVolumeCbm,
    attributes: specs.length > 0 ? { specs } : {},
    status,
  }

  const locale = await getLocale()

  if (productId) {
    const { data: existing } = await supabase
      .from("products")
      .select("id")
      .eq("id", productId)
      .eq("manufacturer_id", manufacturerId)
      .maybeSingle()
    if (!existing) return { error: "Product not found." }

    const { error: updateError } = await supabase
      .from("products")
      .update(payload)
      .eq("id", productId)
    if (updateError) return { error: "Could not save the product. Please try again." }

    await supabase.from("product_price_tiers").delete().eq("product_id", productId)
    if (tiers.length > 0) {
      const { error: tierError } = await supabase
        .from("product_price_tiers")
        .insert(tiers.map((t) => ({ ...t, product_id: productId })))
      if (tierError) return { error: "Could not save the price tiers. Please try again." }
    }

    revalidatePath(localePath(locale, `/seller/products/${productId}/edit`))
    revalidatePath(localePath(locale, "/seller/products"))
    return { ok: true }
  }

  // Listing-limit gating by subscription tier (new products only).
  const { data: mfrRow } = await supabase
    .from("manufacturers")
    .select("subscription_tier")
    .eq("id", manufacturerId)
    .maybeSingle()
  const { count: listingCount } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("manufacturer_id", manufacturerId)
  const limits = tierLimits(mfrRow?.subscription_tier as string | undefined)
  if ((listingCount ?? 0) >= limits.maxListings) {
    return {
      error: `Your plan allows ${limits.maxListings} active listings. Upgrade your plan to add more.`,
    }
  }

  // Explicit client-side id (no .select() after insert — the products SELECT
  // policy is a STABLE security-definer fn that can't see the new row during
  // INSERT…RETURNING, which would raise an RLS error).
  const newId = crypto.randomUUID()
  const { error: insertError } = await supabase
    .from("products")
    .insert({ id: newId, ...payload, manufacturer_id: manufacturerId })
  if (insertError) {
    return { error: "Could not create the product. Please try again." }
  }

  if (tiers.length > 0) {
    await supabase
      .from("product_price_tiers")
      .insert(tiers.map((t) => ({ ...t, product_id: newId })))
  }

  // Optional photos/videos uploaded in the create step. Best-effort: if it
  // fails the product still exists and media can be added on the edit page.
  const mediaFiles = formData
    .getAll("media")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0)
  await storeProductMedia(supabase, manufacturerId, newId, mediaFiles, null)

  revalidatePath(localePath(locale, "/seller/products"))
  redirect(localePath(locale, `/seller/products/${newId}/edit`))
}

/**
 * Validate + upload media files for a product, then set the primary image if it
 * isn't set yet. Shared by product create and the edit-page media manager.
 * Returns {} on success (and a no-op for an empty file list).
 */
async function storeProductMedia(
  supabase: SupabaseClient,
  manufacturerId: string,
  productId: string,
  files: File[],
  currentPrimaryImageUrl: string | null
): Promise<{ error?: string }> {
  if (files.length === 0) return {}
  if (files.length > MAX_MEDIA_FILES) {
    return { error: `Upload at most ${MAX_MEDIA_FILES} files at a time.` }
  }
  for (const file of files) {
    const isImage = ALLOWED_IMAGE_MIME.has(file.type)
    const isVideo = ALLOWED_VIDEO_MIME.has(file.type)
    if (!isImage && !isVideo) {
      return { error: "Only JPG, PNG, WebP images or MP4/WebM video are allowed." }
    }
    if (isImage && file.size > MAX_IMAGE_BYTES) {
      return { error: "Each image must be 10 MB or smaller." }
    }
    if (isVideo && file.size > MAX_VIDEO_BYTES) {
      return { error: "Each video must be 50 MB or smaller." }
    }
  }

  const { data: lastMedia } = await supabase
    .from("product_media")
    .select("sort")
    .eq("product_id", productId)
    .order("sort", { ascending: false })
    .limit(1)
    .maybeSingle()
  let nextSort = ((lastMedia?.sort as number | undefined) ?? -1) + 1

  let firstImageUrl: string | null = null
  const rows: {
    product_id: string
    type: "image" | "video"
    url: string
    sort: number
  }[] = []

  for (const file of files) {
    const type = ALLOWED_IMAGE_MIME.has(file.type) ? "image" : "video"
    const path = `${manufacturerId}/${productId}/${crypto.randomUUID()}-${safeName(file.name, "media")}`
    const buffer = await file.arrayBuffer()
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, buffer, { contentType: file.type, upsert: false })
    if (uploadError) return { error: "Upload failed. Please try again." }

    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path)
    const url = pub.publicUrl
    if (type === "image" && !firstImageUrl) firstImageUrl = url
    rows.push({ product_id: productId, type, url, sort: nextSort++ })
  }

  const { error: insertError } = await supabase.from("product_media").insert(rows)
  if (insertError) return { error: "Could not save the media. Please try again." }

  if (!currentPrimaryImageUrl && firstImageUrl) {
    await supabase
      .from("products")
      .update({ primary_image_url: firstImageUrl })
      .eq("id", productId)
  }
  return {}
}

export async function addProductMediaAction(
  _prev: ProductActionState,
  formData: FormData
): Promise<ProductActionState> {
  const user = await requireRole("manufacturer")
  const supabase = await createClient()

  const manufacturerId = await myManufacturerId(supabase, user.id)
  if (!manufacturerId) return { error: "Create your company profile first." }

  const productId = String(formData.get("productId") ?? "").trim()
  if (!productId) return { error: "Product not found." }

  const { data: product } = await supabase
    .from("products")
    .select("id, primary_image_url")
    .eq("id", productId)
    .eq("manufacturer_id", manufacturerId)
    .maybeSingle()
  if (!product) return { error: "Product not found." }

  const files = formData
    .getAll("media")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0)
  if (files.length === 0) return { error: "Choose at least one file." }

  const result = await storeProductMedia(
    supabase,
    manufacturerId,
    productId,
    files,
    (product.primary_image_url as string | null) ?? null
  )
  if (result.error) return { error: result.error }

  const locale = await getLocale()
  revalidatePath(localePath(locale, `/seller/products/${productId}/edit`))
  revalidatePath(localePath(locale, "/seller/products"))
  return { ok: true }
}

function storagePathFromUrl(url: string): string | null {
  const idx = url.indexOf(PUBLIC_MARKER)
  if (idx === -1) return null
  return decodeURIComponent(url.slice(idx + PUBLIC_MARKER.length))
}

export async function deleteProductMediaAction(formData: FormData): Promise<void> {
  const user = await requireRole("manufacturer")
  const supabase = await createClient()

  const manufacturerId = await myManufacturerId(supabase, user.id)
  if (!manufacturerId) return

  const productId = String(formData.get("productId") ?? "").trim()
  const mediaId = String(formData.get("mediaId") ?? "").trim()
  if (!productId || !mediaId) return

  const { data: product } = await supabase
    .from("products")
    .select("id, primary_image_url")
    .eq("id", productId)
    .eq("manufacturer_id", manufacturerId)
    .maybeSingle()
  if (!product) return

  const { data: media } = await supabase
    .from("product_media")
    .select("url")
    .eq("id", mediaId)
    .eq("product_id", productId)
    .maybeSingle()
  if (!media) return
  const removedUrl = media.url as string

  const path = storagePathFromUrl(removedUrl)
  if (path) await supabase.storage.from(BUCKET).remove([path])
  await supabase.from("product_media").delete().eq("id", mediaId)

  if (product.primary_image_url === removedUrl) {
    const { data: nextImage } = await supabase
      .from("product_media")
      .select("url")
      .eq("product_id", productId)
      .eq("type", "image")
      .order("sort", { ascending: true })
      .limit(1)
      .maybeSingle()
    await supabase
      .from("products")
      .update({ primary_image_url: (nextImage?.url as string | undefined) ?? null })
      .eq("id", productId)
  }

  const locale = await getLocale()
  revalidatePath(localePath(locale, `/seller/products/${productId}/edit`))
  revalidatePath(localePath(locale, "/seller/products"))
}

export async function deleteProductAction(formData: FormData): Promise<void> {
  const user = await requireRole("manufacturer")
  const supabase = await createClient()

  const manufacturerId = await myManufacturerId(supabase, user.id)
  const productId = String(formData.get("productId") ?? "").trim()
  const locale = await getLocale()

  if (manufacturerId && productId) {
    const { data: product } = await supabase
      .from("products")
      .select("id")
      .eq("id", productId)
      .eq("manufacturer_id", manufacturerId)
      .maybeSingle()
    if (product) {
      const prefix = `${manufacturerId}/${productId}`
      const { data: objects } = await supabase.storage.from(BUCKET).list(prefix)
      if (objects && objects.length > 0) {
        await supabase.storage
          .from(BUCKET)
          .remove(objects.map((o) => `${prefix}/${o.name}`))
      }
      await supabase.from("products").delete().eq("id", productId)
      revalidatePath(localePath(locale, "/seller/products"))
    }
  }

  redirect(localePath(locale, "/seller/products"))
}
