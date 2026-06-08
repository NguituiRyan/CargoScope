"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { getLocale } from "next-intl/server"

import { localePath, requireRole } from "@/lib/auth/session"
import type { VerificationDoc } from "@/lib/manufacturers/queries"
import { createClient } from "@/lib/supabase/server"
import { slugify } from "@/lib/utils"

export interface ManufacturerActionState {
  error?: string
  ok?: boolean
}

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
])
const MAX_FILE_BYTES = 10 * 1024 * 1024
const MAX_FILES = 5

function splitList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 12)
}

function randomSuffix(length: number): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, length)
}

const ALLOWED_IMAGE_MIME = new Set(["image/jpeg", "image/png", "image/webp"])
const MAX_IMAGE_BYTES = 5 * 1024 * 1024
// Logos/banners live in the public product-media bucket; its RLS only allows a
// manufacturer to write under a folder whose first segment is their own id.
const BRAND_BUCKET = "product-media"

function safeName(name: string, fallback: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80) || fallback
}

async function uploadBrandImage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  manufacturerId: string,
  kind: "logo" | "banner",
  file: File
): Promise<{ url: string } | { error: string }> {
  if (!ALLOWED_IMAGE_MIME.has(file.type)) {
    return { error: "Logo and banner must be a JPG, PNG, or WebP image." }
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { error: "Logo and banner images must be 5 MB or smaller." }
  }
  const path = `${manufacturerId}/brand/${kind}-${crypto.randomUUID()}-${safeName(file.name, kind)}`
  const buffer = await file.arrayBuffer()
  const { error } = await supabase.storage
    .from(BRAND_BUCKET)
    .upload(path, buffer, { contentType: file.type, upsert: false })
  if (error) return { error: "Image upload failed. Please try again." }
  const { data } = supabase.storage.from(BRAND_BUCKET).getPublicUrl(path)
  return { url: data.publicUrl }
}

export async function saveManufacturerProfileAction(
  _prev: ManufacturerActionState,
  formData: FormData
): Promise<ManufacturerActionState> {
  const user = await requireRole("manufacturer")

  const companyName = String(formData.get("companyName") ?? "").trim()
  if (companyName.length < 2) {
    return { error: "Enter your company name." }
  }

  const country = String(formData.get("country") ?? "").trim()
  const city = String(formData.get("city") ?? "").trim()
  const description = String(formData.get("description") ?? "").trim()
  const yearRaw = String(formData.get("yearEstablished") ?? "").trim()
  const mainCategories = splitList(String(formData.get("mainCategories") ?? ""))
  const certifications = splitList(String(formData.get("certifications") ?? ""))

  let yearEstablished: number | null = null
  if (yearRaw) {
    const parsed = Number(yearRaw)
    const maxYear = new Date().getFullYear() + 1
    if (!Number.isInteger(parsed) || parsed < 1900 || parsed > maxYear) {
      return { error: "Enter a valid year established." }
    }
    yearEstablished = parsed
  }

  const supabase = await createClient()
  const payload = {
    company_name: companyName,
    country: country || null,
    city: city || null,
    description: description || null,
    year_established: yearEstablished,
    main_categories: mainCategories,
    certifications,
  }

  const logoFile = formData.get("logo")
  const bannerFile = formData.get("banner")
  const logo = logoFile instanceof File && logoFile.size > 0 ? logoFile : null
  const banner =
    bannerFile instanceof File && bannerFile.size > 0 ? bannerFile : null

  const { data: existing } = await supabase
    .from("manufacturers")
    .select("id")
    .eq("owner_profile_id", user.id)
    .maybeSingle()

  let manufacturerId: string
  let isNew = false

  if (existing) {
    manufacturerId = existing.id as string
    const { error } = await supabase
      .from("manufacturers")
      .update(payload)
      .eq("id", manufacturerId)
    if (error) return { error: "Could not save your profile. Please try again." }
  } else {
    // Generate the id client-side and insert it explicitly. We must NOT chain
    // .select() onto the insert: the manufacturers SELECT policy uses a STABLE
    // security-definer function that can't see the just-inserted row during
    // INSERT…RETURNING, so Postgres raises an RLS error (PGRST/42501).
    const newId = crypto.randomUUID()
    const base = slugify(companyName) || "manufacturer"
    const slugCandidates = [
      base,
      `${base}-${randomSuffix(4)}`,
      `${base}-${randomSuffix(8)}`,
    ]
    let created = false
    for (const slug of slugCandidates) {
      const { error } = await supabase
        .from("manufacturers")
        .insert({ id: newId, ...payload, slug, owner_profile_id: user.id })
      if (!error) {
        created = true
        break
      }
      if (error.code !== "23505") break
    }
    if (!created) {
      return { error: "Could not create your profile. Please try again." }
    }
    manufacturerId = newId
    isNew = true
  }

  const branding: { logo_url?: string; banner_url?: string } = {}
  if (logo) {
    const result = await uploadBrandImage(supabase, manufacturerId, "logo", logo)
    if ("error" in result) return { error: result.error }
    branding.logo_url = result.url
  }
  if (banner) {
    const result = await uploadBrandImage(
      supabase,
      manufacturerId,
      "banner",
      banner
    )
    if ("error" in result) return { error: result.error }
    branding.banner_url = result.url
  }
  if (Object.keys(branding).length > 0) {
    await supabase
      .from("manufacturers")
      .update(branding)
      .eq("id", manufacturerId)
  }

  // Private contact details — owner + admin only (RLS); never shown to buyers.
  await supabase.from("manufacturer_contacts").upsert(
    {
      manufacturer_id: manufacturerId,
      wechat: String(formData.get("wechat") ?? "").trim() || null,
      whatsapp: String(formData.get("whatsapp") ?? "").trim() || null,
      phone: String(formData.get("phone") ?? "").trim() || null,
      contact_email: String(formData.get("contactEmail") ?? "").trim() || null,
      website: String(formData.get("website") ?? "").trim() || null,
    },
    { onConflict: "manufacturer_id" }
  )

  const locale = await getLocale()
  if (isNew) {
    redirect(localePath(locale, "/seller/verification"))
  }
  revalidatePath(localePath(locale, "/seller/onboarding"))
  return { ok: true }
}

export async function submitVerificationAction(
  _prev: ManufacturerActionState,
  formData: FormData
): Promise<ManufacturerActionState> {
  const user = await requireRole("manufacturer")
  const supabase = await createClient()

  const { data: mfr } = await supabase
    .from("manufacturers")
    .select("id")
    .eq("owner_profile_id", user.id)
    .maybeSingle()
  if (!mfr) return { error: "Create your company profile first." }
  const manufacturerId = mfr.id as string

  const type = String(formData.get("type") ?? "")
  if (type !== "identity" && type !== "business") {
    return { error: "Choose a document type." }
  }

  const files = formData
    .getAll("documents")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0)
  if (files.length === 0) return { error: "Attach at least one document." }
  if (files.length > MAX_FILES) {
    return { error: `Attach at most ${MAX_FILES} documents.` }
  }
  for (const file of files) {
    if (!ALLOWED_MIME.has(file.type)) {
      return { error: "Only JPG, PNG, WebP, or PDF files are allowed." }
    }
    if (file.size > MAX_FILE_BYTES) {
      return { error: "Each file must be 10 MB or smaller." }
    }
  }

  const group = crypto.randomUUID()
  const docs: VerificationDoc[] = []
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const safeName =
      file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80) || `document-${i}`
    const path = `${manufacturerId}/${group}/${i}-${safeName}`
    const buffer = await file.arrayBuffer()
    const { error } = await supabase.storage
      .from("verification-docs")
      .upload(path, buffer, { contentType: file.type, upsert: false })
    if (error) return { error: "Upload failed. Please try again." }
    docs.push({
      path,
      name: file.name,
      size: file.size,
      contentType: file.type,
    })
  }

  const { error } = await supabase.from("verifications").insert({
    manufacturer_id: manufacturerId,
    type,
    status: "pending",
    documents: docs,
  })
  if (error) {
    return { error: "Could not submit your documents. Please try again." }
  }

  const locale = await getLocale()
  revalidatePath(localePath(locale, "/seller/verification"))
  return { ok: true }
}
