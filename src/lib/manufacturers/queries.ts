import "server-only"

import { getSessionUser } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"

export type VerificationTier =
  | "pending"
  | "identity"
  | "verified"
  | "premium"
  | "rejected"

export type SubscriptionTier = "none" | "basic" | "verified" | "premium"

export interface ManufacturerProfile {
  id: string
  ownerProfileId: string
  companyName: string
  slug: string
  country: string | null
  city: string | null
  description: string | null
  yearEstablished: number | null
  mainCategories: string[]
  certifications: string[]
  logoUrl: string | null
  bannerUrl: string | null
  verificationStatus: VerificationTier
  subscriptionTier: SubscriptionTier
  isPublished: boolean
  memberSince: string | null
}

export interface ManufacturerContacts {
  wechat: string | null
  whatsapp: string | null
  phone: string | null
  contactEmail: string | null
  website: string | null
  notes: string | null
}

export interface VerificationDoc {
  path: string
  name: string
  size: number
  contentType: string
}

export interface VerificationRecord {
  id: string
  type: "identity" | "business" | "inspection"
  status: "pending" | "approved" | "rejected"
  documents: VerificationDoc[]
  notes: string | null
  reviewedAt: string | null
  createdAt: string
}

const MANUFACTURER_COLUMNS =
  "id, owner_profile_id, company_name, slug, country, city, description, year_established, main_categories, certifications, logo_url, banner_url, verification_status, subscription_tier, is_published, member_since"

type ManufacturerRow = {
  id: string
  owner_profile_id: string
  company_name: string
  slug: string
  country: string | null
  city: string | null
  description: string | null
  year_established: number | null
  main_categories: string[] | null
  certifications: string[] | null
  logo_url: string | null
  banner_url: string | null
  verification_status: VerificationTier
  subscription_tier: SubscriptionTier
  is_published: boolean
  member_since: string | null
}

export function mapManufacturer(row: ManufacturerRow): ManufacturerProfile {
  return {
    id: row.id,
    ownerProfileId: row.owner_profile_id,
    companyName: row.company_name,
    slug: row.slug,
    country: row.country,
    city: row.city,
    description: row.description,
    yearEstablished: row.year_established,
    mainCategories: row.main_categories ?? [],
    certifications: row.certifications ?? [],
    logoUrl: row.logo_url,
    bannerUrl: row.banner_url,
    verificationStatus: row.verification_status,
    subscriptionTier: row.subscription_tier,
    isPublished: row.is_published,
    memberSince: row.member_since,
  }
}

type VerificationRow = {
  id: string
  type: VerificationRecord["type"]
  status: VerificationRecord["status"]
  documents: VerificationDoc[] | null
  notes: string | null
  reviewed_at: string | null
  created_at: string
}

export function mapVerification(row: VerificationRow): VerificationRecord {
  return {
    id: row.id,
    type: row.type,
    status: row.status,
    documents: Array.isArray(row.documents) ? row.documents : [],
    notes: row.notes,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
  }
}

/** The manufacturer record owned by the current user, or null. */
export async function getMyManufacturer(): Promise<ManufacturerProfile | null> {
  const user = await getSessionUser()
  if (!user) return null

  const supabase = await createClient()
  const { data } = await supabase
    .from("manufacturers")
    .select(MANUFACTURER_COLUMNS)
    .eq("owner_profile_id", user.id)
    .maybeSingle()

  return data ? mapManufacturer(data as ManufacturerRow) : null
}

/**
 * Private contact details for a manufacturer. RLS restricts reads to the owning
 * manufacturer + admins, so buyers can never see these — they reach suppliers
 * only through the in-app chat.
 */
export async function getManufacturerContacts(
  manufacturerId: string
): Promise<ManufacturerContacts | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("manufacturer_contacts")
    .select("wechat, whatsapp, phone, contact_email, website, notes")
    .eq("manufacturer_id", manufacturerId)
    .maybeSingle()
  if (!data) return null
  return {
    wechat: (data.wechat as string | null) ?? null,
    whatsapp: (data.whatsapp as string | null) ?? null,
    phone: (data.phone as string | null) ?? null,
    contactEmail: (data.contact_email as string | null) ?? null,
    website: (data.website as string | null) ?? null,
    notes: (data.notes as string | null) ?? null,
  }
}

/** Verification submissions for a manufacturer, newest first. */
export async function getVerifications(
  manufacturerId: string
): Promise<VerificationRecord[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("verifications")
    .select("id, type, status, documents, notes, reviewed_at, created_at")
    .eq("manufacturer_id", manufacturerId)
    .order("created_at", { ascending: false })

  return (data ?? []).map((row) => mapVerification(row as VerificationRow))
}
