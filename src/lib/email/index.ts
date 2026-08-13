import "server-only"

import { Resend } from "resend"

import { createAdminClient } from "@/lib/supabase/admin"

/**
 * Transactional email (Resend). Strictly best-effort: with no RESEND_API_KEY,
 * every function short-circuits to a no-op BEFORE doing any work or lookups, so
 * the app stays fully functional in dev/preview/CI. A send failure never throws
 * to the caller — notifications must never block a user action.
 */

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
const FROM = process.env.RESEND_FROM_EMAIL || "Shopbuddy <noreply@shopbuddy.africa>"

function hasResend(): boolean {
  return Boolean(process.env.RESEND_API_KEY)
}

let cached: Resend | null = null
function getClient(): Resend | null {
  if (!hasResend()) return null
  if (!cached) cached = new Resend(process.env.RESEND_API_KEY!)
  return cached
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function layout(title: string, body: string): string {
  return `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f172a">
    <div style="font-size:18px;font-weight:700;color:#ff7700;margin-bottom:16px">Shopbuddy</div>
    <h1 style="font-size:20px;margin:0 0 12px">${title}</h1>
    ${body}
    <p style="margin-top:28px;font-size:12px;color:#64748b">Shopbuddy — verified China→Africa sourcing.</p>
  </div>`
}

function button(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:#ff7700;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600">${label}</a>`
}

async function send(
  to: string | string[],
  subject: string,
  html: string,
  options?: { cc?: string[]; replyTo?: string }
): Promise<void> {
  const client = getClient()
  if (!client) return
  try {
    await client.emails.send({
      from: FROM,
      to,
      cc: options?.cc,
      replyTo: options?.replyTo,
      subject,
      html,
    })
  } catch {
    // best-effort — never surface email failures to the user
  }
}

function sourcingRecipients(): { to: string | null; cc: string[] } {
  const to = process.env.SOURCING_TO_EMAIL?.trim() || null
  const cc = (process.env.INFO_CC_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean)
  return { to, cc }
}

export interface SourcingEmailDetails {
  reference: string
  productName: string
  quantity: number
  qualityPreference: string
  destination: string
  clientName: string
  businessName?: string | null
  whatsapp: string
  email: string
}

/** Confirmation sent only after the gateway-verified US$100 activation. */
export async function sendSourcingActivationConfirmation(
  details: SourcingEmailDetails
): Promise<void> {
  if (!hasResend()) return
  await send(
    details.email,
    `Sourcing request activated — ${details.reference}`,
    layout(
      "Your sourcing request is active",
      `<p style="font-size:14px;color:#334155">Payment of <strong>US$100</strong> was confirmed and request <strong>${escapeHtml(details.reference)}</strong> is now active.</p>
       <p style="font-size:14px;color:#334155">Your activation includes supplier research and comparison, China market search, initial price negotiation, MOQ comparison, supplier communications, and a shortlist of suitable suppliers.</p>
       <p style="font-size:14px;color:#334155"><strong>Product:</strong> ${escapeHtml(details.productName)}<br><strong>Quantity:</strong> ${details.quantity}<br><strong>Destination:</strong> ${escapeHtml(details.destination)}</p>
       <p style="font-size:14px;color:#334155">Keep this reference for all follow-up: <strong>${escapeHtml(details.reference)}</strong>.</p>`
    )
  )

  const recipients = sourcingRecipients()
  if (recipients.to) {
    await send(
      recipients.to,
      `PAID sourcing request ${details.reference}: ${details.productName}`,
      layout(
        "New paid sourcing request",
        `<p style="font-size:14px;color:#334155"><strong>RFQ:</strong> ${escapeHtml(details.reference)}<br><strong>Client:</strong> ${escapeHtml(details.clientName)}${details.businessName ? ` — ${escapeHtml(details.businessName)}` : ""}<br><strong>Email:</strong> ${escapeHtml(details.email)}<br><strong>WhatsApp:</strong> ${escapeHtml(details.whatsapp)}<br><strong>Product:</strong> ${escapeHtml(details.productName)}<br><strong>Quantity:</strong> ${details.quantity}<br><strong>Quality:</strong> ${escapeHtml(details.qualityPreference)}<br><strong>Destination:</strong> ${escapeHtml(details.destination)}</p>
         <p style="font-size:14px;color:#334155">The US$100 activation payment has been verified. Open the admin dashboard to begin sourcing.</p>`
      ),
      { cc: recipients.cc, replyTo: details.email }
    )
  }
}

export async function sendSourcingStatusEmail(
  toEmail: string,
  opts: { reference: string; status: string; note?: string }
): Promise<void> {
  if (!hasResend()) return
  const pretty = opts.status.replaceAll("_", " ")
  await send(
    toEmail,
    `Sourcing request ${opts.reference}: ${pretty}`,
    layout(
      `Request status: ${escapeHtml(pretty)}`,
      `<p style="font-size:14px;color:#334155">Your ShopBuddy sourcing request <strong>${escapeHtml(opts.reference)}</strong> has moved to <strong>${escapeHtml(pretty)}</strong>.</p>${opts.note ? `<p style="font-size:14px;color:#334155">${escapeHtml(opts.note)}</p>` : ""}`
    )
  )
}

export async function sendWeeklyMetricsReport(
  subject: string,
  html: string
): Promise<boolean> {
  if (!hasResend()) return false
  const recipients = sourcingRecipients()
  if (!recipients.to) return false
  await send(recipients.to, subject, layout("Weekly website metrics", html), {
    cc: recipients.cc,
  })
  return true
}

/** Confirm to the buyer that their RFQ is live. */
export async function sendRfqConfirmation(
  toEmail: string,
  opts: { rfqTitle: string; rfqId: string }
): Promise<void> {
  if (!hasResend()) return
  await send(
    toEmail,
    `RFQ posted: ${opts.rfqTitle}`,
    layout(
      "Your RFQ is live",
      `<p style="font-size:14px;color:#334155">Your request <strong>${escapeHtml(opts.rfqTitle)}</strong> is now visible to verified suppliers. We'll let you know as quotes arrive.</p>
       <p style="margin-top:16px">${button(`${SITE}/rfqs/${opts.rfqId}`, "View your RFQ")}</p>`
    )
  )
}

/** Notify the RFQ's buyer that a manufacturer submitted a quote. */
export async function notifyRfqBuyerOfQuote(
  rfqId: string,
  manufacturerId: string
): Promise<void> {
  if (!hasResend()) return
  try {
    const admin = createAdminClient()
    const { data: rfq } = await admin
      .from("rfqs")
      .select("title, buyer_id")
      .eq("id", rfqId)
      .maybeSingle()
    if (!rfq) return
    const { data: buyer } = await admin
      .from("buyers")
      .select("owner_profile_id")
      .eq("id", rfq.buyer_id)
      .maybeSingle()
    const { data: mfr } = await admin
      .from("manufacturers")
      .select("company_name")
      .eq("id", manufacturerId)
      .maybeSingle()
    const ownerId = buyer?.owner_profile_id as string | undefined
    if (!ownerId) return
    const { data: user } = await admin.auth.admin.getUserById(ownerId)
    const email = user?.user?.email
    if (!email) return
    const title = String(rfq.title)
    const supplier = String(mfr?.company_name ?? "A verified supplier")
    await send(
      email,
      `New quote on "${title}"`,
      layout(
        "You received a new quote",
        `<p style="font-size:14px;color:#334155">${escapeHtml(supplier)} submitted a quote on your request <strong>${escapeHtml(title)}</strong>.</p>
         <p style="margin-top:16px">${button(`${SITE}/rfqs/${rfqId}`, "Compare quotes")}</p>`
      )
    )
  } catch {
    // best-effort
  }
}

/** Notify the other party in a conversation of a new message. */
export async function notifyConversationRecipient(
  conversationId: string,
  senderUserId: string,
  preview: string
): Promise<void> {
  if (!hasResend()) return
  try {
    const admin = createAdminClient()
    const { data: convo } = await admin
      .from("conversations")
      .select(
        "buyer_id, manufacturer_id, buyers(owner_profile_id), manufacturers(owner_profile_id)"
      )
      .eq("id", conversationId)
      .maybeSingle()
    if (!convo) return
    const buyerOwner = (convo.buyers as { owner_profile_id?: string } | null)
      ?.owner_profile_id
    const mfrOwner = (
      convo.manufacturers as { owner_profile_id?: string } | null
    )?.owner_profile_id
    const recipientId = [buyerOwner, mfrOwner].find(
      (id) => id && id !== senderUserId
    )
    if (!recipientId) return

    const { data: sender } = await admin
      .from("profiles")
      .select("full_name")
      .eq("id", senderUserId)
      .maybeSingle()
    const fromName = String(sender?.full_name ?? "Someone")

    const { data: user } = await admin.auth.admin.getUserById(recipientId)
    const email = user?.user?.email
    if (!email) return
    const snippet = preview.slice(0, 160)
    await send(
      email,
      `New message from ${fromName}`,
      layout(
        "You have a new message",
        `<p style="font-size:14px;color:#334155">${escapeHtml(fromName)} sent you a message on Shopbuddy:</p>
         <blockquote style="border-left:3px solid #e2e8f0;margin:12px 0;padding:4px 12px;color:#475569;font-size:14px">${escapeHtml(snippet)}</blockquote>
         <p style="margin-top:16px">${button(`${SITE}/messages`, "Open messages")}</p>`
      )
    )
  } catch {
    // best-effort
  }
}
