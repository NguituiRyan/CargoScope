import "server-only"

import { desc, eq, inArray, sql } from "drizzle-orm"

import { db } from "@/lib/db"
import { buyers, products, reviews } from "@/lib/db/schema"

/**
 * Review / rating reads. Reviews are public (reviews_select RLS = true), so these
 * use the trusted Drizzle connection for aggregation and reviewer-name joins.
 */

export interface Rating {
  avg: number
  count: number
}

export interface ReviewItem {
  id: string
  rating: number
  comment: string | null
  author: string | null
  productTitle: string | null
  createdAt: string
}

function toIso(value: Date | string | null): string {
  if (!value) return ""
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString()
}

/** Per-product { avg, count }, keyed by product id — one grouped query (no N+1). */
export async function getProductRatings(
  productIds: string[]
): Promise<Map<string, Rating>> {
  const map = new Map<string, Rating>()
  if (productIds.length === 0) return map
  const rows = await db
    .select({
      productId: reviews.productId,
      avg: sql<number>`avg(${reviews.rating})::float`,
      count: sql<number>`count(*)::int`,
    })
    .from(reviews)
    .where(inArray(reviews.productId, productIds))
    .groupBy(reviews.productId)
  for (const r of rows) {
    if (r.productId) {
      map.set(r.productId, { avg: Number(r.avg) || 0, count: Number(r.count) || 0 })
    }
  }
  return map
}

/** Per-manufacturer { avg, count }, keyed by manufacturer id. */
export async function getManufacturerRatings(
  manufacturerIds: string[]
): Promise<Map<string, Rating>> {
  const map = new Map<string, Rating>()
  if (manufacturerIds.length === 0) return map
  const rows = await db
    .select({
      manufacturerId: reviews.manufacturerId,
      avg: sql<number>`avg(${reviews.rating})::float`,
      count: sql<number>`count(*)::int`,
    })
    .from(reviews)
    .where(inArray(reviews.manufacturerId, manufacturerIds))
    .groupBy(reviews.manufacturerId)
  for (const r of rows) {
    map.set(r.manufacturerId, { avg: Number(r.avg) || 0, count: Number(r.count) || 0 })
  }
  return map
}

export async function getManufacturerRating(
  manufacturerId: string
): Promise<Rating> {
  const [r] = await db
    .select({
      avg: sql<number>`coalesce(avg(${reviews.rating}), 0)::float`,
      count: sql<number>`count(*)::int`,
    })
    .from(reviews)
    .where(eq(reviews.manufacturerId, manufacturerId))
  return { avg: Number(r?.avg) || 0, count: Number(r?.count) || 0 }
}

/** Aggregate + recent reviews for a product. */
export async function getProductReviews(
  productId: string,
  limit = 12
): Promise<{ rating: Rating; items: ReviewItem[] }> {
  const [agg] = await db
    .select({
      avg: sql<number>`coalesce(avg(${reviews.rating}), 0)::float`,
      count: sql<number>`count(*)::int`,
    })
    .from(reviews)
    .where(eq(reviews.productId, productId))

  const rows = await db
    .select({
      id: reviews.id,
      rating: reviews.rating,
      comment: reviews.comment,
      createdAt: reviews.createdAt,
      author: buyers.companyName,
    })
    .from(reviews)
    .leftJoin(buyers, eq(buyers.id, reviews.buyerId))
    .where(eq(reviews.productId, productId))
    .orderBy(desc(reviews.createdAt))
    .limit(limit)

  return {
    rating: { avg: Number(agg?.avg) || 0, count: Number(agg?.count) || 0 },
    items: rows.map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      author: r.author,
      productTitle: null,
      createdAt: toIso(r.createdAt),
    })),
  }
}

/** Aggregate + recent reviews for a manufacturer (across products). */
export async function getManufacturerReviews(
  manufacturerId: string,
  limit = 12
): Promise<{ rating: Rating; items: ReviewItem[] }> {
  const [agg] = await db
    .select({
      avg: sql<number>`coalesce(avg(${reviews.rating}), 0)::float`,
      count: sql<number>`count(*)::int`,
    })
    .from(reviews)
    .where(eq(reviews.manufacturerId, manufacturerId))

  const rows = await db
    .select({
      id: reviews.id,
      rating: reviews.rating,
      comment: reviews.comment,
      createdAt: reviews.createdAt,
      author: buyers.companyName,
      productTitle: products.title,
    })
    .from(reviews)
    .leftJoin(buyers, eq(buyers.id, reviews.buyerId))
    .leftJoin(products, eq(products.id, reviews.productId))
    .where(eq(reviews.manufacturerId, manufacturerId))
    .orderBy(desc(reviews.createdAt))
    .limit(limit)

  return {
    rating: { avg: Number(agg?.avg) || 0, count: Number(agg?.count) || 0 },
    items: rows.map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      author: r.author,
      productTitle: r.productTitle,
      createdAt: toIso(r.createdAt),
    })),
  }
}
