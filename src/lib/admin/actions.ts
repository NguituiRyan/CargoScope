"use server"

import { revalidatePath } from "next/cache"
import { getLocale } from "next-intl/server"

import { localePath, requireRole } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"

export interface AdminActionState {
  error?: string
  ok?: boolean
}

const TIERS = new Set([
  "pending",
  "identity",
  "verified",
  "premium",
  "rejected",
])

export async function reviewVerificationAction(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const user = await requireRole("admin")

  const verificationId = String(formData.get("verificationId") ?? "")
  const manufacturerId = String(formData.get("manufacturerId") ?? "")
  const decision = String(formData.get("decision") ?? "")
  const notes = String(formData.get("notes") ?? "").trim()
  if (!verificationId) return { error: "Missing verification." }
  if (decision !== "approve" && decision !== "reject") {
    return { error: "Invalid decision." }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from("verifications")
    .update({
      status: decision === "approve" ? "approved" : "rejected",
      notes: notes || null,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", verificationId)
  if (error) return { error: "Could not update the verification." }

  const locale = await getLocale()
  if (manufacturerId) {
    revalidatePath(localePath(locale, `/admin/manufacturers/${manufacturerId}`))
  }
  return { ok: true }
}

export async function setManufacturerVerificationAction(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  await requireRole("admin")

  const manufacturerId = String(formData.get("manufacturerId") ?? "")
  const status = String(formData.get("status") ?? "")
  const publish =
    formData.get("publish") === "on" || formData.get("publish") === "true"
  if (!manufacturerId) return { error: "Missing manufacturer." }
  if (!TIERS.has(status)) return { error: "Invalid status." }

  const supabase = await createClient()
  const update: Record<string, unknown> = {
    verification_status: status,
    is_published: publish,
  }

  // Stamp member_since the first time a manufacturer clears verification.
  if (status === "identity" || status === "verified" || status === "premium") {
    const { data: current } = await supabase
      .from("manufacturers")
      .select("member_since")
      .eq("id", manufacturerId)
      .maybeSingle()
    if (current && !current.member_since) {
      update.member_since = new Date().toISOString()
    }
  }

  const { error } = await supabase
    .from("manufacturers")
    .update(update)
    .eq("id", manufacturerId)
  if (error) return { error: "Could not update the manufacturer." }

  const locale = await getLocale()
  revalidatePath(localePath(locale, "/admin/manufacturers"))
  revalidatePath(localePath(locale, `/admin/manufacturers/${manufacturerId}`))
  return { ok: true }
}
