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
const FROM = process.env.RESEND_FROM_EMAIL || "Shop Buddy <noreply@cargoscope.app>"

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
    <div style="font-size:18px;font-weight:700;color:#ff7700;margin-bottom:16px">Shop Buddy</div>
    <h1 style="font-size:20px;margin:0 0 12px">${title}</h1>
    ${body}
    <p style="margin-top:28px;font-size:12px;color:#64748b">Shop Buddy — verified China→Africa sourcing.</p>
  </div>`
}

function button(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:#ff7700;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600">${label}</a>`
}

async function send(to: string, subject: string, html: string): Promise<void> {
  const client = getClient()
  if (!client) return
  try {
    await client.emails.send({ from: FROM, to, subject, html })
  } catch {
    // best-effort — never surface email failures to the user
  }
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
        `<p style="font-size:14px;color:#334155">${escapeHtml(fromName)} sent you a message on Shop Buddy:</p>
         <blockquote style="border-left:3px solid #e2e8f0;margin:12px 0;padding:4px 12px;color:#475569;font-size:14px">${escapeHtml(snippet)}</blockquote>
         <p style="margin-top:16px">${button(`${SITE}/messages`, "Open messages")}</p>`
      )
    )
  } catch {
    // best-effort
  }
}
