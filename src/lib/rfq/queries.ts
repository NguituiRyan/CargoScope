import "server-only"

import { and, desc, eq, inArray, sql } from "drizzle-orm"
import { getLocale } from "next-intl/server"

import type { SessionUser } from "@/lib/auth/session"
import { db } from "@/lib/db"
import { buyers, categories, manufacturers, quotes, rfqs } from "@/lib/db/schema"
import { resolveViewerParties } from "@/lib/messaging/queries"
import type { VerificationTier } from "@/lib/manufacturers/queries"
import { parseRfqAttachments, type RfqAttachment } from "@/lib/rfq/attachments"

/**
 * RFQ / quote reads.
 *
 * These use the trusted Drizzle connection and are always explicitly scoped to
 * the viewer's own buyer id (their RFQs) or to open/quoting RFQs that any
 * manufacturer may quote — mirroring the catalog/inbox "sanctioned aggregate
 * read" pattern. RLS independently guards the mutation paths in actions.ts.
 */

export type RfqStatus = "open" | "quoting" | "closed"
export type QuoteStatus = "submitted" | "accepted" | "declined"

export interface RfqListItem {
  id: string
  title: string
  status: RfqStatus
  categoryName: string | null
  quantity: number | null
  unit: string
  targetUnitPrice: string | null
  currency: string
  destinationCountry: string | null
  destinationCity: string | null
  deadline: string | null
  createdAt: string
  quoteCount: number
}

export interface OpenRfqListItem extends RfqListItem {
  /** Status of *this manufacturer's* quote on the RFQ, if they have quoted. */
  myQuoteStatus: QuoteStatus | null
}

export interface QuoteItem {
  id: string
  manufacturerName: string | null
  manufacturerSlug: string | null
  manufacturerStatus: VerificationTier
  unitPrice: string
  currency: string
  moq: number | null
  leadTimeDays: number | null
  incoterm: string | null
  validUntil: string | null
  notes: string | null
  status: QuoteStatus
  createdAt: string
}

export interface BuyerRfqDetail extends RfqListItem {
  description: string | null
  attachments: RfqAttachment[]
  quotes: QuoteItem[]
}

export interface QuotingRfqDetail extends RfqListItem {
  description: string | null
  attachments: RfqAttachment[]
  buyerCompanyName: string | null
  myQuote: {
    id: string
    unitPrice: string
    currency: string
    moq: number | null
    leadTimeDays: number | null
    incoterm: string | null
    validUntil: string | null
    notes: string | null
    status: QuoteStatus
  } | null
}

function toIso(value: Date | string | null): string | null {
  if (!value) return null
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString()
}

function categoryName(
  row: { en: string | null; sw: string | null; zh: string | null },
  locale: string
): string | null {
  if (!row.en) return null
  if (locale === "sw" && row.sw) return row.sw
  if (locale === "zh" && row.zh) return row.zh
  return row.en
}

const quoteCountSql = sql<number>`(
  select count(*)::int from ${quotes} where ${quotes.rfqId} = ${rfqs.id}
)`

const RFQ_COLUMNS = {
  id: rfqs.id,
  title: rfqs.title,
  description: rfqs.description,
  status: rfqs.status,
  quantity: rfqs.quantity,
  unit: rfqs.unit,
  targetUnitPrice: rfqs.targetUnitPrice,
  currency: rfqs.currency,
  destinationCountry: rfqs.destinationCountry,
  destinationCity: rfqs.destinationCity,
  deadline: rfqs.deadline,
  createdAt: rfqs.createdAt,
  attachments: rfqs.attachments,
  catEn: categories.nameEn,
  catSw: categories.nameSw,
  catZh: categories.nameZh,
} as const

type RfqRow = {
  id: string
  title: string
  description: string | null
  status: RfqStatus
  quantity: number | null
  unit: string
  targetUnitPrice: string | null
  currency: string
  destinationCountry: string | null
  destinationCity: string | null
  deadline: Date | string | null
  createdAt: Date | string
  catEn: string | null
  catSw: string | null
  catZh: string | null
}

function mapListItem(row: RfqRow, locale: string, quoteCount: number): RfqListItem {
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    categoryName: categoryName({ en: row.catEn, sw: row.catSw, zh: row.catZh }, locale),
    quantity: row.quantity,
    unit: row.unit,
    targetUnitPrice: row.targetUnitPrice,
    currency: row.currency,
    destinationCountry: row.destinationCountry,
    destinationCity: row.destinationCity,
    deadline: toIso(row.deadline),
    createdAt: toIso(row.createdAt) ?? "",
    quoteCount,
  }
}

/** The current buyer's RFQs, most recent first. */
export async function listBuyerRfqs(user: SessionUser): Promise<RfqListItem[]> {
  const { buyerId } = await resolveViewerParties(user.id)
  if (!buyerId) return []
  const locale = await getLocale()

  const rows = await db
    .select({ ...RFQ_COLUMNS, quoteCount: quoteCountSql })
    .from(rfqs)
    .leftJoin(categories, eq(categories.id, rfqs.categoryId))
    .where(eq(rfqs.buyerId, buyerId))
    .orderBy(desc(rfqs.createdAt))

  return rows.map((r) => mapListItem(r, locale, Number(r.quoteCount) || 0))
}

/** A single RFQ owned by the current buyer, with all quotes received. */
export async function getBuyerRfqDetail(
  id: string,
  user: SessionUser
): Promise<BuyerRfqDetail | null> {
  const { buyerId } = await resolveViewerParties(user.id)
  if (!buyerId) return null
  const locale = await getLocale()

  const [row] = await db
    .select({ ...RFQ_COLUMNS, quoteCount: quoteCountSql })
    .from(rfqs)
    .leftJoin(categories, eq(categories.id, rfqs.categoryId))
    .where(and(eq(rfqs.id, id), eq(rfqs.buyerId, buyerId)))
    .limit(1)
  if (!row) return null

  const quoteRows = await db
    .select({
      id: quotes.id,
      unitPrice: quotes.unitPrice,
      currency: quotes.currency,
      moq: quotes.moq,
      leadTimeDays: quotes.leadTimeDays,
      incoterm: quotes.incoterm,
      validUntil: quotes.validUntil,
      notes: quotes.notes,
      status: quotes.status,
      createdAt: quotes.createdAt,
      mName: manufacturers.companyName,
      mSlug: manufacturers.slug,
      mStatus: manufacturers.verificationStatus,
    })
    .from(quotes)
    .leftJoin(manufacturers, eq(manufacturers.id, quotes.manufacturerId))
    .where(eq(quotes.rfqId, id))
    .orderBy(desc(quotes.createdAt))

  const quoteItems: QuoteItem[] = quoteRows.map((q) => ({
    id: q.id,
    manufacturerName: q.mName,
    manufacturerSlug: q.mSlug,
    manufacturerStatus: (q.mStatus as VerificationTier) ?? "identity",
    unitPrice: q.unitPrice,
    currency: q.currency,
    moq: q.moq,
    leadTimeDays: q.leadTimeDays,
    incoterm: q.incoterm,
    validUntil: toIso(q.validUntil),
    notes: q.notes,
    status: q.status,
    createdAt: toIso(q.createdAt) ?? "",
  }))

  return {
    ...mapListItem(row, locale, Number(row.quoteCount) || 0),
    description: row.description,
    attachments: parseRfqAttachments(row.attachments),
    quotes: quoteItems,
  }
}

export interface RfqEditValues {
  id: string
  title: string
  description: string | null
  categoryId: string | null
  quantity: number | null
  unit: string
  targetUnitPrice: string | null
  currency: string
  destinationCountry: string | null
  destinationCity: string | null
  deadline: string | null
  status: RfqStatus
}

/** Raw editable fields of one RFQ owned by the current buyer (for the edit form). */
export async function getRfqForEdit(
  id: string,
  user: SessionUser
): Promise<RfqEditValues | null> {
  const { buyerId } = await resolveViewerParties(user.id)
  if (!buyerId) return null

  const [row] = await db
    .select({
      id: rfqs.id,
      title: rfqs.title,
      description: rfqs.description,
      categoryId: rfqs.categoryId,
      quantity: rfqs.quantity,
      unit: rfqs.unit,
      targetUnitPrice: rfqs.targetUnitPrice,
      currency: rfqs.currency,
      destinationCountry: rfqs.destinationCountry,
      destinationCity: rfqs.destinationCity,
      deadline: rfqs.deadline,
      status: rfqs.status,
    })
    .from(rfqs)
    .where(and(eq(rfqs.id, id), eq(rfqs.buyerId, buyerId)))
    .limit(1)
  if (!row) return null

  return { ...row, deadline: toIso(row.deadline) }
}

/** Open / quoting RFQs any manufacturer may quote, with this seller's status. */
export async function listOpenRfqs(user: SessionUser): Promise<OpenRfqListItem[]> {
  const { manufacturerId } = await resolveViewerParties(user.id)
  if (!manufacturerId) return []
  const locale = await getLocale()

  const rows = await db
    .select({
      ...RFQ_COLUMNS,
      quoteCount: quoteCountSql,
      myQuoteStatus: sql<QuoteStatus | null>`(
        select ${quotes.status} from ${quotes}
        where ${quotes.rfqId} = ${rfqs.id}
          and ${quotes.manufacturerId} = ${manufacturerId}::uuid
        limit 1
      )`,
    })
    .from(rfqs)
    .leftJoin(categories, eq(categories.id, rfqs.categoryId))
    .where(inArray(rfqs.status, ["open", "quoting"]))
    .orderBy(desc(rfqs.createdAt))

  return rows.map((r) => ({
    ...mapListItem(r, locale, Number(r.quoteCount) || 0),
    myQuoteStatus: r.myQuoteStatus ?? null,
  }))
}

/** An open/quoting RFQ for the quote form, plus this seller's existing quote. */
export async function getRfqForQuoting(
  id: string,
  user: SessionUser
): Promise<QuotingRfqDetail | null> {
  const { manufacturerId } = await resolveViewerParties(user.id)
  if (!manufacturerId) return null
  const locale = await getLocale()

  const [row] = await db
    .select({
      ...RFQ_COLUMNS,
      quoteCount: quoteCountSql,
      buyerCompanyName: buyers.companyName,
    })
    .from(rfqs)
    .leftJoin(categories, eq(categories.id, rfqs.categoryId))
    .leftJoin(buyers, eq(buyers.id, rfqs.buyerId))
    .where(and(eq(rfqs.id, id), inArray(rfqs.status, ["open", "quoting"])))
    .limit(1)
  if (!row) return null

  const [mine] = await db
    .select({
      id: quotes.id,
      unitPrice: quotes.unitPrice,
      currency: quotes.currency,
      moq: quotes.moq,
      leadTimeDays: quotes.leadTimeDays,
      incoterm: quotes.incoterm,
      validUntil: quotes.validUntil,
      notes: quotes.notes,
      status: quotes.status,
    })
    .from(quotes)
    .where(and(eq(quotes.rfqId, id), eq(quotes.manufacturerId, manufacturerId)))
    .limit(1)

  return {
    ...mapListItem(row, locale, Number(row.quoteCount) || 0),
    description: row.description,
    attachments: parseRfqAttachments(row.attachments),
    buyerCompanyName: row.buyerCompanyName ?? null,
    myQuote: mine
      ? {
          id: mine.id,
          unitPrice: mine.unitPrice,
          currency: mine.currency,
          moq: mine.moq,
          leadTimeDays: mine.leadTimeDays,
          incoterm: mine.incoterm,
          validUntil: toIso(mine.validUntil),
          notes: mine.notes,
          status: mine.status,
        }
      : null,
  }
}
