"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { after } from "next/server"
import { getLocale } from "next-intl/server"

import { translateMessage } from "@/lib/ai/translate"
import { notifyConversationRecipient } from "@/lib/email"
import { getSessionUser, localePath, requireUser } from "@/lib/auth/session"
import { resolveViewerParties, type StoredAttachment } from "@/lib/messaging/queries"
import { createClient } from "@/lib/supabase/server"

export interface MessagingActionState {
  error?: string
  ok?: boolean
}

const ATTACHMENTS_BUCKET = "chat-attachments"
const ALLOWED_ATTACHMENT_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
])
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024
const MAX_ATTACHMENTS = 5
const MAX_BODY_CHARS = 4000

function safeName(name: string, fallback: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80) || fallback
}

/**
 * Open (or reuse) the current user's conversation with a manufacturer and send
 * them to the thread. The initiator is always the buyer side, so we find-or-
 * create their buyer row first (RLS allows owner_profile_id = auth.uid()).
 */
export async function startConversationAction(formData: FormData): Promise<void> {
  const locale = await getLocale()
  const user = await getSessionUser()
  if (!user) redirect(localePath(locale, "/sign-in"))

  const manufacturerId = String(formData.get("manufacturerId") ?? "").trim()
  const productId = String(formData.get("productId") ?? "").trim() || null
  if (!manufacturerId) redirect(localePath(locale, "/products"))

  // A manufacturer cannot message their own storefront.
  const parties = await resolveViewerParties(user.id)
  if (parties.manufacturerId && parties.manufacturerId === manufacturerId) {
    redirect(localePath(locale, "/messages"))
  }

  const supabase = await createClient()

  let buyerId = parties.buyerId
  if (!buyerId) {
    const { data: createdBuyer } = await supabase
      .from("buyers")
      .insert({ owner_profile_id: user.id })
      .select("id")
      .single()
    buyerId = (createdBuyer?.id as string | undefined) ?? null
  }
  if (!buyerId) redirect(localePath(locale, "/products"))

  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("buyer_id", buyerId)
    .eq("manufacturer_id", manufacturerId)
    .maybeSingle()

  let conversationId = existing?.id as string | undefined
  if (!conversationId) {
    const { data: createdConvo } = await supabase
      .from("conversations")
      .insert({
        buyer_id: buyerId,
        manufacturer_id: manufacturerId,
        product_id: productId,
      })
      .select("id")
      .single()
    conversationId = createdConvo?.id as string | undefined
  }
  if (!conversationId) redirect(localePath(locale, "/products"))

  redirect(localePath(locale, `/messages/${conversationId}`))
}

/** Send a message (optional text + attachments) into a conversation. */
export async function sendMessageAction(
  _prev: MessagingActionState,
  formData: FormData
): Promise<MessagingActionState> {
  const user = await requireUser()
  const supabase = await createClient()

  const conversationId = String(formData.get("conversationId") ?? "").trim()
  if (!conversationId) return { error: "Conversation not found." }

  const body = String(formData.get("body") ?? "").trim()
  if (body.length > MAX_BODY_CHARS) {
    return { error: "Message is too long." }
  }

  const files = formData
    .getAll("attachments")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0)
  if (!body && files.length === 0) {
    return { error: "Type a message or attach a file." }
  }
  if (files.length > MAX_ATTACHMENTS) {
    return { error: `Attach at most ${MAX_ATTACHMENTS} files.` }
  }
  for (const file of files) {
    if (!ALLOWED_ATTACHMENT_MIME.has(file.type)) {
      return { error: "Attachments must be JPG, PNG, WebP, GIF, or PDF." }
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
      return { error: "Each attachment must be 10 MB or smaller." }
    }
  }

  // RLS returns no row for non-participants, so this both confirms the
  // conversation exists and authorises uploads into its folder.
  const { data: convo } = await supabase
    .from("conversations")
    .select("id")
    .eq("id", conversationId)
    .maybeSingle()
  if (!convo) return { error: "Conversation not found." }

  const stored: StoredAttachment[] = []
  for (const file of files) {
    const path = `${conversationId}/${crypto.randomUUID()}-${safeName(file.name, "file")}`
    const buffer = await file.arrayBuffer()
    const { error: uploadError } = await supabase.storage
      .from(ATTACHMENTS_BUCKET)
      .upload(path, buffer, { contentType: file.type, upsert: false })
    if (uploadError) {
      if (stored.length > 0) {
        await supabase.storage
          .from(ATTACHMENTS_BUCKET)
          .remove(stored.map((s) => s.path))
      }
      return { error: "Upload failed. Please try again." }
    }
    stored.push({
      path,
      name: file.name,
      contentType: file.type,
      size: file.size,
    })
  }

  // Best-effort translation; a failure must never block the message.
  const { sourceLang, translations } = body
    ? await translateMessage(body)
    : { sourceLang: null, translations: {} }

  const { error: insertError } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_profile_id: user.id,
    body,
    body_translated: translations,
    source_lang: sourceLang,
    attachments: stored,
  })
  if (insertError) {
    if (stored.length > 0) {
      await supabase.storage
        .from(ATTACHMENTS_BUCKET)
        .remove(stored.map((s) => s.path))
    }
    return { error: "Could not send the message. Please try again." }
  }

  after(() => notifyConversationRecipient(conversationId, user.id, body))
  const locale = await getLocale()
  revalidatePath(localePath(locale, `/messages/${conversationId}`))
  revalidatePath(localePath(locale, "/messages"))
  return { ok: true }
}

/** Mark the other party's unread messages in a conversation as read. */
export async function markConversationReadAction(
  conversationId: string
): Promise<void> {
  const id = conversationId.trim()
  if (!id) return
  const user = await getSessionUser()
  if (!user) return

  const supabase = await createClient()
  await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("conversation_id", id)
    .is("read_at", null)
    .neq("sender_profile_id", user.id)

  const locale = await getLocale()
  revalidatePath(localePath(locale, "/messages"))
  revalidatePath(localePath(locale, `/messages/${id}`))
}
