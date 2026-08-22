/**
 * Shared Google Shopping / Schema.org helpers for the product detail page and
 * the Merchant Center feed. Both must quote the SAME converted price a shopper
 * sees on the landing page — Google disapproves items on price mismatch.
 */

import {
  displayAmount,
  type DisplayCurrency,
  type DisplayRates,
} from "@/lib/currency/shared"
import { SITE_URL } from "@/lib/site"

// Mirrors the display precision in currency/shared, so the structured price is
// the same rounded amount formatDisplayPrice renders.
const PRICE_DECIMALS: Record<DisplayCurrency, number> = { KES: 0, USD: 2, CNY: 2 }

/** Plain numeric price string — no symbol, no thousands separators, no exponent. */
export function structuredPrice(
  amountUsd: number,
  currency: DisplayCurrency,
  rates: DisplayRates["rates"]
): string {
  return displayAmount(amountUsd, currency, rates).toFixed(PRICE_DECIMALS[currency])
}

/** Absolute URL for a stored media path; already-absolute URLs pass through. */
export function absoluteUrl(path: string | null | undefined): string | null {
  const trimmed = path?.trim()
  if (!trimmed) return null
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `${SITE_URL}${trimmed.startsWith("/") ? "" : "/"}${trimmed}`
}

/** Canonical landing page — default locale is unprefixed (localePrefix "as-needed"). */
export function productUrl(id: string): string {
  return `${SITE_URL}/products/${id}`
}

/** Absolute, de-duplicated image URLs: primary first, then image media. */
export function productImageUrls(input: {
  primaryImageUrl?: string | null
  media?: { type: "image" | "video"; url: string }[]
}): string[] {
  const candidates = [
    input.primaryImageUrl,
    ...(input.media ?? []).filter((m) => m.type === "image").map((m) => m.url),
  ]
  const urls: string[] = []
  for (const candidate of candidates) {
    const abs = absoluteUrl(candidate)
    if (abs && !urls.includes(abs)) urls.push(abs)
  }
  return urls
}

export interface ProductJsonLdInput {
  id: string
  title: string
  description?: string | null
  primaryImageUrl?: string | null
  media?: { type: "image" | "video"; url: string }[]
  /** Manufacturer company name, used as the Brand. */
  brand?: string | null
  /** Entry-tier unit price in USD — null when the product is price-on-request. */
  priceUsd?: number | null
  currency: DisplayCurrency
  rates: DisplayRates["rates"]
  /** Only pass when the page actually renders the rating. */
  rating?: { avg: number; count: number } | null
  reviews?: {
    id: string
    rating: number
    comment: string | null
    author: string | null
    createdAt: string
  }[]
}

/** Schema.org Product object. Fields with no value are omitted, never blanked. */
export function buildProductJsonLd(
  input: ProductJsonLdInput
): Record<string, unknown> {
  const images = productImageUrls(input)
  const url = productUrl(input.id)
  const description = input.description?.trim()
  const brand = input.brand?.trim()

  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: input.title,
    url,
    sku: input.id,
  }
  // No GTIN/MPN exists for these wholesale listings; the HS code is a customs
  // tariff class, not a part number, so we never pass it off as one.
  if (description) data.description = description
  if (images.length) data.image = images
  if (brand) data.brand = { "@type": "Brand", name: brand }

  if (typeof input.priceUsd === "number" && Number.isFinite(input.priceUsd)) {
    data.offers = {
      "@type": "Offer",
      url,
      price: structuredPrice(input.priceUsd, input.currency, input.rates),
      priceCurrency: input.currency,
      availability: "https://schema.org/InStock",
      itemCondition: "https://schema.org/NewCondition",
    }
  }

  const rating = input.rating
  if (rating && rating.count > 0) {
    data.aggregateRating = {
      "@type": "AggregateRating",
      // toFixed(1) matches the average the Stars component prints.
      ratingValue: Number(rating.avg.toFixed(1)),
      reviewCount: rating.count,
      bestRating: 5,
      worstRating: 1,
    }
    const named = (input.reviews ?? []).filter((r) => r.author?.trim()).slice(0, 5)
    if (named.length) {
      data.review = named.map((r) => {
        const review: Record<string, unknown> = {
          "@type": "Review",
          author: { "@type": "Organization", name: r.author!.trim() },
          reviewRating: {
            "@type": "Rating",
            ratingValue: r.rating,
            bestRating: 5,
            worstRating: 1,
          },
        }
        const date = r.createdAt?.slice(0, 10)
        if (date) review.datePublished = date
        if (r.comment?.trim()) review.reviewBody = r.comment.trim()
        return review
      })
    }
  }

  return data
}

/** Script-tag-safe JSON: "<" escaped so the payload can't close the element. */
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c")
}

/** Escape a value for XML text/attribute content. */
export function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

/** Collapse whitespace and hard-cap length (Google rejects overlong fields). */
export function truncate(value: string, max: number): string {
  const clean = value.replace(/\s+/g, " ").trim()
  return clean.length <= max ? clean : clean.slice(0, max - 1).trimEnd() + "…"
}
