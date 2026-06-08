"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { after } from "next/server"
import { getLocale } from "next-intl/server"
import { z } from "zod"

import { logAudit } from "@/lib/audit/log"
import { localePath, requireUser } from "@/lib/auth/session"
import { notifyRfqBuyerOfQuote, sendRfqConfirmation } from "@/lib/email"
import { resolveViewerParties } from "@/lib/messaging/queries"
import { tierLimits } from "@/lib/subscription/tiers"
import { createClient } from "@/lib/supabase/server"

export interface RfqActionState {
  error?: string
  ok?: boolean
}

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : null))

const rfqSchema = z.object({
  title: z.string().trim().min(3, { message: "Add a short title." }).max(160),
  description: optionalText(4000),
  categoryId: z.string().uuid().optional().or(z.literal("")).transform((v) => v || null),
  quantity: z.coerce.number().int().positive().max(100_000_000).optional().catch(undefined),
  unit: z.string().trim().min(1).max(24).default("piece"),
  targetUnitPrice: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,2})?$/)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  currency: z.enum(["USD", "KES", "CNY"]).default("USD"),
  destinationCountry: z.string().trim().max(80).default("KE"),
  destinationCity: optionalText(120),
  deadline: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? new Date(`${v}T00:00:00Z`).toISOString() : null)),
})

const quoteSchema = z.object({
  rfqId: z.string().uuid(),
  unitPrice: z.string().trim().regex(/^\d+(\.\d{1,2})?$/, {
    message: "Enter a unit price.",
  }),
  currency: z.enum(["USD", "KES", "CNY"]).default("USD"),
  moq: z.coerce.number().int().positive().max(100_000_000).optional().catch(undefined),
  leadTimeDays: z.coerce.number().int().min(0).max(3650).optional().catch(undefined),
  incoterm: optionalText(24),
  validUntil: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? new Date(`${v}T00:00:00Z`).toISOString() : null)),
  notes: optionalText(2000),
})

/** Buyer posts a new RFQ; manufacturers in-scope can then quote it. */
export async function createRfqAction(
  _prev: RfqActionState,
  formData: FormData
): Promise<RfqActionState> {
  const user = await requireUser()
  const locale = await getLocale()

  const parsed = rfqSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    categoryId: formData.get("categoryId"),
    quantity: formData.get("quantity") || undefined,
    unit: formData.get("unit") || undefined,
    targetUnitPrice: formData.get("targetUnitPrice"),
    currency: formData.get("currency") || undefined,
    destinationCountry: formData.get("destinationCountry") || undefined,
    destinationCity: formData.get("destinationCity"),
    deadline: formData.get("deadline"),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form." }
  }

  const supabase = await createClient()

  // Find-or-create the buyer row this RFQ belongs to (RLS: owner = auth.uid()).
  const parties = await resolveViewerParties(user.id)
  let buyerId = parties.buyerId
  if (!buyerId) {
    const newBuyerId = crypto.randomUUID()
    const { error: buyerError } = await supabase
      .from("buyers")
      .insert({ id: newBuyerId, owner_profile_id: user.id })
    buyerId = buyerError ? null : newBuyerId
  }
  if (!buyerId) return { error: "Could not start the RFQ. Please try again." }

  const d = parsed.data
  const rfqId = crypto.randomUUID()
  const { error } = await supabase.from("rfqs").insert({
    id: rfqId,
    buyer_id: buyerId,
    category_id: d.categoryId,
    title: d.title,
    description: d.description,
    quantity: d.quantity ?? null,
    unit: d.unit,
    target_unit_price: d.targetUnitPrice,
    currency: d.currency,
    destination_country: d.destinationCountry,
    destination_city: d.destinationCity,
    deadline: d.deadline,
    status: "open",
  })
  if (error) {
    return { error: "Could not post the RFQ. Please try again." }
  }

  after(() => sendRfqConfirmation(user.email, { rfqTitle: d.title, rfqId }))
  revalidatePath(localePath(locale, "/rfqs"))
  redirect(localePath(locale, `/rfqs/${rfqId}`))
}

/** Manufacturer submits (or updates) their single quote on an open RFQ. */
export async function submitQuoteAction(
  _prev: RfqActionState,
  formData: FormData
): Promise<RfqActionState> {
  const user = await requireUser()
  const locale = await getLocale()

  const parties = await resolveViewerParties(user.id)
  if (!parties.manufacturerId) {
    return { error: "Only manufacturers can submit quotes." }
  }

  const parsed = quoteSchema.safeParse({
    rfqId: formData.get("rfqId"),
    unitPrice: formData.get("unitPrice"),
    currency: formData.get("currency") || undefined,
    moq: formData.get("moq") || undefined,
    leadTimeDays: formData.get("leadTimeDays") || undefined,
    incoterm: formData.get("incoterm"),
    validUntil: formData.get("validUntil"),
    notes: formData.get("notes"),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form." }
  }
  const d = parsed.data

  const supabase = await createClient()

  // Tier gating: only Verified/Premium suppliers may quote RFQs.
  const { data: mfrRow } = await supabase
    .from("manufacturers")
    .select("subscription_tier")
    .eq("id", parties.manufacturerId)
    .maybeSingle()
  if (!tierLimits(mfrRow?.subscription_tier as string | undefined).canQuoteRfq) {
    return { error: "Quoting RFQs requires a Verified or Premium plan." }
  }

  // RLS only returns open/quoting RFQs to manufacturers, so this confirms the
  // RFQ is quotable.
  const { data: rfq } = await supabase
    .from("rfqs")
    .select("id, status")
    .eq("id", d.rfqId)
    .maybeSingle()
  if (!rfq) return { error: "This RFQ is no longer open for quotes." }

  const row = {
    rfq_id: d.rfqId,
    manufacturer_id: parties.manufacturerId,
    unit_price: d.unitPrice,
    currency: d.currency,
    moq: d.moq ?? null,
    lead_time_days: d.leadTimeDays ?? null,
    incoterm: d.incoterm,
    valid_until: d.validUntil,
    notes: d.notes,
    status: "submitted" as const,
  }

  const { data: existing } = await supabase
    .from("quotes")
    .select("id")
    .eq("rfq_id", d.rfqId)
    .eq("manufacturer_id", parties.manufacturerId)
    .maybeSingle()

  const result = existing
    ? await supabase.from("quotes").update(row).eq("id", existing.id)
    : await supabase.from("quotes").insert(row)
  if (result.error) {
    return { error: "Could not submit the quote. Please try again." }
  }

  after(() => notifyRfqBuyerOfQuote(d.rfqId, parties.manufacturerId!))
  revalidatePath(localePath(locale, "/seller/rfqs"))
  revalidatePath(localePath(locale, `/seller/rfqs/${d.rfqId}`))
  return { ok: true }
}

/** Buyer accepts one quote on their RFQ; the rest are declined and it closes. */
export async function acceptQuoteAction(
  _prev: RfqActionState,
  formData: FormData
): Promise<RfqActionState> {
  const user = await requireUser()
  const locale = await getLocale()

  const rfqId = String(formData.get("rfqId") ?? "").trim()
  const quoteId = String(formData.get("quoteId") ?? "").trim()
  if (!rfqId || !quoteId) return { error: "Missing quote reference." }

  const supabase = await createClient()

  // RLS (is_my_buyer) ensures only the RFQ's owner can read it here.
  const { data: rfq } = await supabase
    .from("rfqs")
    .select("id")
    .eq("id", rfqId)
    .maybeSingle()
  if (!rfq) return { error: "This RFQ is no longer available." }

  // owns_rfq() lets the buyer update quotes on their own RFQ.
  const declined = await supabase
    .from("quotes")
    .update({ status: "declined" })
    .eq("rfq_id", rfqId)
    .neq("id", quoteId)
  const accepted = await supabase
    .from("quotes")
    .update({ status: "accepted" })
    .eq("id", quoteId)
  const closed = await supabase
    .from("rfqs")
    .update({ status: "closed" })
    .eq("id", rfqId)
  if (declined.error || accepted.error || closed.error) {
    return { error: "Could not accept the quote. Please try again." }
  }

  await logAudit({
    actorProfileId: user.id,
    action: "quote.accept",
    targetType: "rfq",
    targetId: rfqId,
    metadata: { quoteId },
  })

  revalidatePath(localePath(locale, "/rfqs"))
  revalidatePath(localePath(locale, `/rfqs/${rfqId}`))
  return { ok: true }
}
