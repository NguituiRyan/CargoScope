import "server-only"

import {
  mapManufacturer,
  mapVerification,
  type ManufacturerProfile,
  type SubscriptionTier,
  type VerificationRecord,
  type VerificationTier,
} from "@/lib/manufacturers/queries"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export interface VettingListItem {
  id: string
  companyName: string
  country: string | null
  city: string | null
  verificationStatus: VerificationTier
  subscriptionTier: SubscriptionTier
  isPublished: boolean
  createdAt: string
  pendingDocs: number
  totalDocs: number
}

const STATUS_ORDER: Record<VerificationTier, number> = {
  pending: 0,
  identity: 1,
  verified: 2,
  premium: 3,
  rejected: 4,
}

/** All manufacturers for the admin vetting queue, pending first. */
export async function listManufacturersForVetting(): Promise<VettingListItem[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("manufacturers")
    .select(
      "id, company_name, country, city, verification_status, subscription_tier, is_published, created_at, verifications(status)"
    )
    .order("created_at", { ascending: false })

  const rows = (data ?? []) as Array<{
    id: string
    company_name: string
    country: string | null
    city: string | null
    verification_status: VerificationTier
    subscription_tier: SubscriptionTier
    is_published: boolean
    created_at: string
    verifications: { status: VerificationRecord["status"] }[] | null
  }>

  return rows
    .map((row) => {
      const docs = row.verifications ?? []
      return {
        id: row.id,
        companyName: row.company_name,
        country: row.country,
        city: row.city,
        verificationStatus: row.verification_status,
        subscriptionTier: row.subscription_tier,
        isPublished: row.is_published,
        createdAt: row.created_at,
        pendingDocs: docs.filter((d) => d.status === "pending").length,
        totalDocs: docs.length,
      }
    })
    .sort(
      (a, b) =>
        STATUS_ORDER[a.verificationStatus] - STATUS_ORDER[b.verificationStatus] ||
        b.createdAt.localeCompare(a.createdAt)
    )
}

export interface ManufacturerReview {
  manufacturer: ManufacturerProfile
  ownerEmail: string | null
  verifications: VerificationRecord[]
}

const MANUFACTURER_COLUMNS =
  "id, owner_profile_id, company_name, slug, country, city, description, year_established, main_categories, certifications, logo_url, banner_url, verification_status, subscription_tier, is_published, member_since"

/** Full manufacturer detail + its verification submissions for admin review. */
export async function getManufacturerForReview(
  id: string
): Promise<ManufacturerReview | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("manufacturers")
    .select(MANUFACTURER_COLUMNS)
    .eq("id", id)
    .maybeSingle()
  if (!data) return null

  const manufacturer = mapManufacturer(data as Parameters<typeof mapManufacturer>[0])

  const { data: verificationRows } = await supabase
    .from("verifications")
    .select("id, type, status, documents, notes, reviewed_at, created_at")
    .eq("manufacturer_id", id)
    .order("created_at", { ascending: false })

  const verifications = (verificationRows ?? []).map((row) =>
    mapVerification(row as Parameters<typeof mapVerification>[0])
  )

  // Owner email lives in auth.users — only reachable via the service role.
  const admin = createAdminClient()
  const { data: authUser } = await admin.auth.admin.getUserById(
    manufacturer.ownerProfileId
  )

  return {
    manufacturer,
    ownerEmail: authUser?.user?.email ?? null,
    verifications,
  }
}

/** Short-lived signed URLs for private verification documents (admin only). */
export async function getSignedDocUrls(
  paths: string[]
): Promise<Record<string, string>> {
  if (paths.length === 0) return {}
  const admin = createAdminClient()
  const { data } = await admin.storage
    .from("verification-docs")
    .createSignedUrls(paths, 60 * 10)

  const map: Record<string, string> = {}
  for (const entry of data ?? []) {
    if (entry.signedUrl && entry.path) map[entry.path] = entry.signedUrl
  }
  return map
}
