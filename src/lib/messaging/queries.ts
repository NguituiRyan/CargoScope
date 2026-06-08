import "server-only"

import { and, desc, eq, isNull, or, sql, type SQL } from "drizzle-orm"

import { getSessionUser, type SessionUser } from "@/lib/auth/session"
import { db } from "@/lib/db"
import {
  buyers,
  conversations,
  manufacturers,
  messages,
  products,
} from "@/lib/db/schema"
import { createClient } from "@/lib/supabase/server"

/**
 * Buyer↔manufacturer messaging reads.
 *
 * Inbox and unread-badge counts use the trusted Drizzle connection for their
 * per-conversation aggregation (sanctioned "aggregate reads" — see
 * src/lib/db/index.ts) and are always scoped to the viewer's own buyer /
 * manufacturer id. The single-thread read goes through the RLS-bound Supabase
 * client instead, so participant RLS independently guards both the rows and the
 * signed attachment URLs.
 */

const ATTACHMENTS_BUCKET = "chat-attachments"
const SIGNED_URL_TTL_SECONDS = 600

/** Attachment metadata as stored on messages.attachments (jsonb). */
export interface StoredAttachment {
  path: string
  name: string
  contentType: string
  size: number
}

export interface ConversationListItem {
  id: string
  productTitle: string | null
  viewerIsManufacturer: boolean
  otherParty: { name: string | null; logoUrl: string | null }
  lastMessage: string | null
  lastMessageAt: string | null
  unreadCount: number
}

export interface ThreadAttachment {
  name: string
  url: string | null
  contentType: string
  size: number
}

export interface ThreadMessage {
  id: string
  body: string
  bodyTranslated: Record<string, string>
  sourceLang: string | null
  senderProfileId: string | null
  isMine: boolean
  attachments: ThreadAttachment[]
  createdAt: string
  readAt: string | null
}

export interface ConversationThread {
  id: string
  productId: string | null
  productTitle: string | null
  viewerIsManufacturer: boolean
  otherParty: { name: string | null; logoUrl: string | null; slug: string | null }
  messages: ThreadMessage[]
}

export interface ViewerParties {
  buyerId: string | null
  manufacturerId: string | null
}

/** Resolve the buyer / manufacturer rows owned by a profile (either may be null). */
export async function resolveViewerParties(
  profileId: string
): Promise<ViewerParties> {
  const [manufacturerRow] = await db
    .select({ id: manufacturers.id })
    .from(manufacturers)
    .where(eq(manufacturers.ownerProfileId, profileId))
    .limit(1)
  const [buyerRow] = await db
    .select({ id: buyers.id })
    .from(buyers)
    .where(eq(buyers.ownerProfileId, profileId))
    .limit(1)
  return {
    manufacturerId: manufacturerRow?.id ?? null,
    buyerId: buyerRow?.id ?? null,
  }
}

/**
 * Find or reuse the user's (buyer-side) conversation with a manufacturer.
 * Shared by the contact action and the post-sign-up `/messages/start` route.
 * Uses explicit client-side ids and no chained `.select()` to avoid the RLS
 * insert+select pitfall on the buyers/conversations tables.
 */
export async function getOrCreateConversation(
  userId: string,
  manufacturerId: string,
  productId: string | null
): Promise<{ conversationId: string | null; selfOwned: boolean }> {
  const parties = await resolveViewerParties(userId)
  // A manufacturer cannot start a conversation with their own storefront.
  if (parties.manufacturerId && parties.manufacturerId === manufacturerId) {
    return { conversationId: null, selfOwned: true }
  }

  const supabase = await createClient()

  let buyerId = parties.buyerId
  if (!buyerId) {
    const newBuyerId = crypto.randomUUID()
    const { error } = await supabase
      .from("buyers")
      .insert({ id: newBuyerId, owner_profile_id: userId })
    buyerId = error ? null : newBuyerId
  }
  if (!buyerId) return { conversationId: null, selfOwned: false }

  const { data: existing } = await supabase
    .from("conversations")
    .select("id, product_id")
    .eq("buyer_id", buyerId)
    .eq("manufacturer_id", manufacturerId)
    .maybeSingle()

  const conversationId = (existing?.id as string | undefined) ?? undefined
  if (conversationId) {
    // One thread per buyer↔supplier: reuse it, but refresh its product context
    // to whatever the buyer is inquiring about now, so the thread header never
    // shows a stale/unrelated product when they contact about a different item.
    if (productId && existing?.product_id !== productId) {
      await supabase
        .from("conversations")
        .update({ product_id: productId })
        .eq("id", conversationId)
    }
    return { conversationId, selfOwned: false }
  }

  const newConvoId = crypto.randomUUID()
  const { error } = await supabase.from("conversations").insert({
    id: newConvoId,
    buyer_id: buyerId,
    manufacturer_id: manufacturerId,
    product_id: productId,
  })
  return { conversationId: error ? null : newConvoId, selfOwned: false }
}

function partyScope(parties: ViewerParties): SQL | null {
  const conds: SQL[] = []
  if (parties.manufacturerId) {
    conds.push(eq(conversations.manufacturerId, parties.manufacturerId))
  }
  if (parties.buyerId) {
    conds.push(eq(conversations.buyerId, parties.buyerId))
  }
  if (conds.length === 0) return null
  return conds.length === 1 ? conds[0] : or(...conds)!
}

/** Conversations for the current user, most recently active first. */
export async function listConversations(
  user: SessionUser
): Promise<ConversationListItem[]> {
  const parties = await resolveViewerParties(user.id)
  const scope = partyScope(parties)
  if (!scope) return []

  const lastBody = sql<string | null>`(
    select ${messages.body} from ${messages}
    where ${messages.conversationId} = ${conversations.id}
    order by ${messages.createdAt} desc
    limit 1
  )`
  // Drizzle's date codec only applies to mapped columns, so this raw aggregate
  // comes back as a timestamptz string; it's normalised to ISO below.
  const lastAt = sql<string | null>`(
    select max(${messages.createdAt}) from ${messages}
    where ${messages.conversationId} = ${conversations.id}
  )`
  const unread = sql<number>`(
    select count(*)::int from ${messages}
    where ${messages.conversationId} = ${conversations.id}
      and ${messages.readAt} is null
      and ${messages.senderProfileId} is distinct from ${user.id}::uuid
  )`

  const rows = await db
    .select({
      id: conversations.id,
      manufacturerId: conversations.manufacturerId,
      productTitle: products.title,
      manufacturerName: manufacturers.companyName,
      manufacturerLogo: manufacturers.logoUrl,
      buyerName: buyers.companyName,
      lastBody,
      lastAt,
      unread,
    })
    .from(conversations)
    .leftJoin(manufacturers, eq(manufacturers.id, conversations.manufacturerId))
    .leftJoin(buyers, eq(buyers.id, conversations.buyerId))
    .leftJoin(products, eq(products.id, conversations.productId))
    .where(scope)
    .orderBy(desc(sql`coalesce(${lastAt}, ${conversations.createdAt})`))

  return rows.map((row) => {
    const viewerIsManufacturer = row.manufacturerId === parties.manufacturerId
    return {
      id: row.id,
      productTitle: row.productTitle,
      viewerIsManufacturer,
      otherParty: viewerIsManufacturer
        ? { name: row.buyerName, logoUrl: null }
        : { name: row.manufacturerName, logoUrl: row.manufacturerLogo },
      lastMessage: row.lastBody,
      lastMessageAt: row.lastAt ? new Date(row.lastAt).toISOString() : null,
      unreadCount: row.unread,
    }
  })
}

/** Total unread messages for the current user (header badge). */
export async function getUnreadMessageCount(): Promise<number> {
  const user = await getSessionUser()
  if (!user) return 0
  const parties = await resolveViewerParties(user.id)
  const scope = partyScope(parties)
  if (!scope) return 0

  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(messages)
    .innerJoin(conversations, eq(conversations.id, messages.conversationId))
    .where(
      and(
        isNull(messages.readAt),
        sql`${messages.senderProfileId} is distinct from ${user.id}::uuid`,
        scope
      )
    )
  return row?.count ?? 0
}

type ConvoRow = {
  id: string
  product_id: string | null
  buyer_id: string
  manufacturer_id: string
  manufacturers: {
    company_name: string
    slug: string
    logo_url: string | null
    owner_profile_id: string
  } | null
  buyers: { company_name: string | null; owner_profile_id: string } | null
  products: { title: string } | null
}

type MessageRow = {
  id: string
  body: string
  body_translated: Record<string, string> | null
  source_lang: string | null
  sender_profile_id: string | null
  attachments: StoredAttachment[] | null
  read_at: string | null
  created_at: string
}

/**
 * Full thread for a conversation, or null when the user is not a participant
 * (RLS returns no row). Attachment paths are exchanged for short-lived signed
 * URLs minted through the same RLS-bound client.
 */
export async function getConversationThread(
  conversationId: string,
  user: SessionUser
): Promise<ConversationThread | null> {
  const supabase = await createClient()

  const { data: convoData } = await supabase
    .from("conversations")
    .select(
      "id, product_id, buyer_id, manufacturer_id, manufacturers(company_name, slug, logo_url, owner_profile_id), buyers(company_name, owner_profile_id), products(title)"
    )
    .eq("id", conversationId)
    .maybeSingle()
  if (!convoData) return null
  const convo = convoData as unknown as ConvoRow

  const { data: messageData } = await supabase
    .from("messages")
    .select(
      "id, body, body_translated, source_lang, sender_profile_id, attachments, read_at, created_at"
    )
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
  const messageRows = (messageData ?? []) as unknown as MessageRow[]

  const paths = messageRows.flatMap((m) =>
    (m.attachments ?? []).map((a) => a.path)
  )
  const signed: Record<string, string> = {}
  if (paths.length > 0) {
    const { data: signedData } = await supabase.storage
      .from(ATTACHMENTS_BUCKET)
      .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS)
    for (const entry of signedData ?? []) {
      if (entry.path && entry.signedUrl) signed[entry.path] = entry.signedUrl
    }
  }

  const threadMessages: ThreadMessage[] = messageRows.map((m) => ({
    id: m.id,
    body: m.body,
    bodyTranslated: m.body_translated ?? {},
    sourceLang: m.source_lang,
    senderProfileId: m.sender_profile_id,
    isMine: m.sender_profile_id === user.id,
    attachments: (m.attachments ?? []).map((a) => ({
      name: a.name,
      contentType: a.contentType,
      size: a.size,
      url: signed[a.path] ?? null,
    })),
    createdAt: m.created_at,
    readAt: m.read_at,
  }))

  const viewerIsManufacturer = convo.manufacturers?.owner_profile_id === user.id

  // buyers is owner-private under RLS, so the embedded join above returns null
  // for the manufacturer's view. The viewer is a confirmed participant (RLS
  // returned the conversation), so resolve the counterpart buyer's name through
  // the trusted connection — mirroring the inbox query.
  let otherParty: ConversationThread["otherParty"]
  if (viewerIsManufacturer) {
    let name = convo.buyers?.company_name ?? null
    if (!name) {
      const [buyerRow] = await db
        .select({ companyName: buyers.companyName })
        .from(buyers)
        .where(eq(buyers.id, convo.buyer_id))
        .limit(1)
      name = buyerRow?.companyName ?? null
    }
    otherParty = { name, logoUrl: null, slug: null }
  } else {
    otherParty = {
      name: convo.manufacturers?.company_name ?? null,
      logoUrl: convo.manufacturers?.logo_url ?? null,
      slug: convo.manufacturers?.slug ?? null,
    }
  }

  return {
    id: convo.id,
    productId: convo.product_id,
    productTitle: convo.products?.title ?? null,
    viewerIsManufacturer,
    otherParty,
    messages: threadMessages,
  }
}
