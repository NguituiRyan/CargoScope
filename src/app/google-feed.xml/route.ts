import { and, asc, eq, inArray, ne } from "drizzle-orm"

import { db } from "@/lib/db"
import {
  manufacturers,
  productMedia,
  productPriceTiers,
  products,
} from "@/lib/db/schema"
import { DEFAULT_CURRENCY } from "@/lib/currency/shared"
import { getDisplayRates } from "@/lib/fx"
import { SITE_URL } from "@/lib/site"
import {
  absoluteUrl,
  productUrl,
  structuredPrice,
  truncate,
  xmlEscape,
} from "@/lib/seo/product-jsonld"

/**
 * Google Merchant Center product feed (RSS 2.0 + g: namespace).
 *
 * Googlebot arrives with no currency cookie, so it lands on the KES page —
 * the feed therefore quotes the same DEFAULT_CURRENCY conversion the landing
 * page renders, or the item is disapproved for a price mismatch.
 */

// Hourly so catalogue edits reach Merchant Center without a redeploy.
export const revalidate = 3600

const FEED_LIMIT = 5000
const TITLE_MAX = 150
const DESCRIPTION_MAX = 5000

type FeedItem = {
  id: string
  title: string
  description: string
  link: string
  imageLink: string
  price: string
  brand: string | null
}

function tag(name: string, value: string): string {
  return `<${name}>${xmlEscape(value)}</${name}>`
}

function renderFeed(items: FeedItem[]): string {
  const body = items
    .map((item) =>
      [
        "<item>",
        tag("g:id", item.id),
        tag("title", item.title),
        tag("description", item.description),
        tag("link", item.link),
        tag("g:image_link", item.imageLink),
        tag("g:price", item.price),
        tag("g:availability", "in stock"),
        tag("g:condition", "new"),
        item.brand ? tag("g:brand", item.brand) : "",
        // Wholesale listings carry no GTIN/MPN; Google requires this flag
        // rather than a fabricated identifier.
        tag("g:identifier_exists", "no"),
        "</item>",
      ]
        .filter(Boolean)
        .join("")
    )
    .join("")

  const channel =
    tag("title", "Shopbuddy product feed") +
    tag("link", `${SITE_URL}/products`) +
    tag("description", "Verified China-to-Africa wholesale products on Shopbuddy.")
  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:g="http://base.google.com/ns/1.0"><channel>${channel}${body}</channel></rss>`
}

async function loadItems(): Promise<FeedItem[]> {
  // Same visibility filter as the sitemap, plus the rejected-supplier exclusion
  // getPublicProduct applies — a feed item whose landing page 404s is rejected.
  const rows = await db
    .select({
      id: products.id,
      title: products.title,
      description: products.description,
      primaryImageUrl: products.primaryImageUrl,
      brand: manufacturers.companyName,
    })
    .from(products)
    .innerJoin(manufacturers, eq(manufacturers.id, products.manufacturerId))
    .where(
      and(
        eq(products.status, "active"),
        eq(manufacturers.isPublished, true),
        ne(manufacturers.verificationStatus, "rejected")
      )
    )
    .limit(FEED_LIMIT)

  if (rows.length === 0) return []
  const ids = rows.map((r) => r.id)

  // Entry tier (lowest min_qty) — the price the detail page lists first.
  const entryPriceUsd = new Map<string, { minQty: number; price: number }>()
  const tiers = await db
    .select({
      productId: productPriceTiers.productId,
      minQty: productPriceTiers.minQty,
      unitPrice: productPriceTiers.unitPrice,
    })
    .from(productPriceTiers)
    .where(inArray(productPriceTiers.productId, ids))
  for (const t of tiers) {
    const price = Number(t.unitPrice)
    if (!Number.isFinite(price)) continue
    const current = entryPriceUsd.get(t.productId)
    if (!current || t.minQty < current.minQty) {
      entryPriceUsd.set(t.productId, { minQty: t.minQty, price })
    }
  }

  const missingImage = rows.filter((r) => !r.primaryImageUrl).map((r) => r.id)
  const fallbackImage = new Map<string, string>()
  if (missingImage.length > 0) {
    const media = await db
      .select({ productId: productMedia.productId, url: productMedia.url })
      .from(productMedia)
      .where(
        and(
          inArray(productMedia.productId, missingImage),
          eq(productMedia.type, "image")
        )
      )
      .orderBy(asc(productMedia.sort))
    for (const item of media) {
      if (!fallbackImage.has(item.productId)) {
        fallbackImage.set(item.productId, item.url)
      }
    }
  }

  const { rates } = await getDisplayRates()
  const items: FeedItem[] = []
  for (const row of rows) {
    const tier = entryPriceUsd.get(row.id)
    const imageLink = absoluteUrl(row.primaryImageUrl ?? fallbackImage.get(row.id))
    // Price and image are both required by Google; skip rather than fake them.
    if (!tier || !imageLink) continue
    items.push({
      id: row.id,
      title: truncate(row.title, TITLE_MAX),
      description: truncate(row.description || row.title, DESCRIPTION_MAX),
      link: productUrl(row.id),
      imageLink,
      price: `${structuredPrice(tier.price, DEFAULT_CURRENCY, rates)} ${DEFAULT_CURRENCY}`,
      brand: row.brand?.trim() || null,
    })
  }
  return items
}

export async function GET(): Promise<Response> {
  let items: FeedItem[] = []
  try {
    items = await loadItems()
  } catch {
    // DB unreachable — serve a valid empty feed so Merchant Center retries
    // instead of recording a fetch failure.
  }

  return new Response(renderFeed(items), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  })
}
