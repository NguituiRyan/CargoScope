"use server"

import { redirect } from "next/navigation"
import { z } from "zod"

import { createSourcingHostedPayment } from "@/lib/flutterwave"
import { passesSpamChecks } from "@/lib/spam"
import { createAdminClient } from "@/lib/supabase/admin"
import { paymentReference, publicReference } from "@/lib/sourcing/references"
import {
  parseSourcingAttachments,
  storeSourcingAttachments,
} from "@/lib/sourcing/storage"
import type { SourcingAttachmentMetadata } from "@/lib/sourcing/storage-shared"

function parsePreUploaded(value: FormDataEntryValue | null): SourcingAttachmentMetadata[] {
  if (typeof value !== "string" || value.length > 20_000) return []
  try {
    const items = JSON.parse(value) as unknown
    if (!Array.isArray(items)) return []
    return items.slice(0, 4).filter((item): item is SourcingAttachmentMetadata =>
      Boolean(item) && typeof item === "object" &&
      typeof (item as SourcingAttachmentMetadata).path === "string" &&
      (item as SourcingAttachmentMetadata).path.startsWith("pending/") &&
      typeof (item as SourcingAttachmentMetadata).name === "string" &&
      typeof (item as SourcingAttachmentMetadata).contentType === "string" &&
      typeof (item as SourcingAttachmentMetadata).size === "number"
    )
  } catch {
    return []
  }
}

const optionalText = z.string().trim().max(2000).optional().or(z.literal(""))
const schema = z.object({
  productName: z.string().trim().min(2).max(180),
  productLink: z.string().trim().max(1000).optional().or(z.literal("")),
  quantity: z.coerce.number().int().min(1).max(100_000_000),
  unit: z.string().trim().min(1).max(30),
  qualityPreference: z.enum(["premium", "standard", "budget"]),
  targetBudget: z.string().trim().max(30).optional().or(z.literal("")),
  targetBudgetCurrency: z.enum(["USD", "KES", "CNY"]),
  destinationCountry: z.string().trim().min(2).max(100),
  destinationCity: z.string().trim().max(120).optional().or(z.literal("")),
  destinationPort: z.string().trim().max(120).optional().or(z.literal("")),
  brandName: z.string().trim().max(160).optional().or(z.literal("")),
  specialRequirements: optionalText,
  clientName: z.string().trim().min(2).max(160),
  businessName: z.string().trim().max(180).optional().or(z.literal("")),
  whatsapp: z.string().trim().min(7).max(40),
  email: z.email().max(254),
  imageSearchId: z.string().uuid().optional().or(z.literal("")),
})

export interface SourcingActionState {
  error?: string
  reference?: string
}

export async function startSourcingPaymentAction(
  _state: SourcingActionState,
  formData: FormData
): Promise<SourcingActionState> {
  if (!(await passesSpamChecks(formData))) {
    return { error: "We could not verify this submission. Please refresh and try again." }
  }
  const parsed = schema.safeParse({
    productName: formData.get("productName"),
    productLink: formData.get("productLink"),
    quantity: formData.get("quantity"),
    unit: formData.get("unit"),
    qualityPreference: formData.get("qualityPreference"),
    targetBudget: formData.get("targetBudget"),
    targetBudgetCurrency: formData.get("targetBudgetCurrency"),
    destinationCountry: formData.get("destinationCountry"),
    destinationCity: formData.get("destinationCity"),
    destinationPort: formData.get("destinationPort"),
    brandName: formData.get("brandName"),
    specialRequirements: formData.get("specialRequirements"),
    clientName: formData.get("clientName"),
    businessName: formData.get("businessName"),
    whatsapp: formData.get("whatsapp"),
    email: formData.get("email"),
    imageSearchId: formData.get("imageSearchId"),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Please check the form." }
  }
  const d = parsed.data
  const id = crypto.randomUUID()
  const reference = publicReference("SRC")
  const txRef = paymentReference()
  const admin = createAdminClient()

  const files = formData
    .getAll("attachments")
    .filter((value): value is File => value instanceof File && value.size > 0)
  const uploaded = await storeSourcingAttachments(id, files)
  const preUploaded = parsePreUploaded(formData.get("preUploadedAttachments"))
  let inherited: ReturnType<typeof parseSourcingAttachments> = []
  if (d.imageSearchId) {
    const { data: imageRequest } = await admin
      .from("image_search_requests")
      .select("attachments")
      .eq("id", d.imageSearchId)
      .maybeSingle()
    inherited = parseSourcingAttachments(imageRequest?.attachments)
  }
  if (!uploaded.length && !preUploaded.length && !inherited.length && !d.productLink) {
    return { error: "Attach a product image/video or provide a product link." }
  }

  const targetBudget = d.targetBudget ? Number(d.targetBudget) : null
  if (targetBudget !== null && (!Number.isFinite(targetBudget) || targetBudget < 0)) {
    return { error: "Enter a valid target budget." }
  }
  const { error: insertError } = await admin.from("sourcing_requests").insert({
    id,
    reference,
    image_search_request_id: d.imageSearchId || null,
    status: "payment_pending",
    product_name: d.productName,
    product_link: d.productLink || null,
    quantity: d.quantity,
    unit: d.unit,
    quality_preference: d.qualityPreference,
    target_budget: targetBudget,
    target_budget_currency: d.targetBudgetCurrency,
    destination_country: d.destinationCountry,
    destination_city: d.destinationCity || null,
    destination_port: d.destinationPort || null,
    private_labeling: Boolean(formData.get("privateLabeling")),
    brand_name: d.brandName || null,
    special_requirements: d.specialRequirements || null,
    client_name: d.clientName,
    business_name: d.businessName || null,
    whatsapp: d.whatsapp,
    email: d.email,
    attachments: [...inherited, ...preUploaded, ...uploaded],
    activation_fee: 100,
    activation_currency: "USD",
    payment_provider: "flutterwave",
    payment_reference: txRef,
    payment_status: "pending",
  })
  if (insertError) {
    return { error: "Could not save your request. Please try again." }
  }

  let paymentUrl: string
  try {
    paymentUrl = await createSourcingHostedPayment({
      txRef,
      email: d.email,
      name: d.clientName,
      phone: d.whatsapp,
      requestReference: reference,
    })
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Could not start payment.",
      reference,
    }
  }
  redirect(paymentUrl)
}

export interface ImageSearchActionState {
  error?: string
}

export async function createImageSearchAction(
  _state: ImageSearchActionState,
  formData: FormData
): Promise<ImageSearchActionState> {
  if (!(await passesSpamChecks(formData))) {
    return { error: "We could not verify this upload. Please refresh and try again." }
  }
  const file = formData.get("image")
  const preUploaded = parsePreUploaded(formData.get("preUploadedAttachments"))
  if (!preUploaded.length && (!(file instanceof File) || !file.size || !file.type.startsWith("image/"))) {
    return { error: "Choose a JPG, PNG, WebP or GIF product image." }
  }
  const id = crypto.randomUUID()
  const reference = publicReference("IMG")
  const attachments = preUploaded.length ? preUploaded : await storeSourcingAttachments(id, [file as File])
  if (!attachments.length) return { error: "The image could not be uploaded." }
  const admin = createAdminClient()
  const { error } = await admin.from("image_search_requests").insert({
    id,
    reference,
    attachments,
    source_path: String(formData.get("sourcePath") ?? "").slice(0, 500),
    visitor_id: String(formData.get("visitorId") ?? "").slice(0, 100) || null,
  })
  if (error) return { error: "The image could not be saved." }
  redirect(`/sourcing?imageSearch=${encodeURIComponent(id)}`)
}
