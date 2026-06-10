import type { MetadataRoute } from "next"
import { and, eq } from "drizzle-orm"

import { db } from "@/lib/db"
import { manufacturers, products } from "@/lib/db/schema"
import { SITE_URL } from "@/lib/site"

// Public, indexable routes (default locale — localized variants share content).
const STATIC_PATHS = [
  "",
  "/products",
  "/manufacturers",
  "/pricing",
  "/how-it-works",
  "/about",
  "/contact",
  "/buyer-protection",
  "/supplier-verification",
  "/supplier-standards",
  "/disputes",
  "/refunds",
  "/terms",
  "/privacy",
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = STATIC_PATHS.map((path) => ({
    url: `${SITE_URL}${path}`,
    changeFrequency: path === "" || path === "/products" ? "daily" : "weekly",
    priority: path === "" ? 1 : path === "/products" ? 0.9 : 0.6,
  }))

  // Append live product + storefront URLs. Uses the trusted (non-RLS) Drizzle
  // connection, scoped to published manufacturers' active products only.
  try {
    const liveProducts = await db
      .select({ id: products.id })
      .from(products)
      .innerJoin(manufacturers, eq(manufacturers.id, products.manufacturerId))
      .where(and(eq(products.status, "active"), eq(manufacturers.isPublished, true)))
      .limit(5000)
    for (const p of liveProducts) {
      entries.push({
        url: `${SITE_URL}/products/${p.id}`,
        changeFrequency: "weekly",
        priority: 0.7,
      })
    }

    const liveManufacturers = await db
      .select({ slug: manufacturers.slug })
      .from(manufacturers)
      .where(eq(manufacturers.isPublished, true))
      .limit(2000)
    for (const m of liveManufacturers) {
      entries.push({
        url: `${SITE_URL}/manufacturers/${m.slug}`,
        changeFrequency: "weekly",
        priority: 0.6,
      })
    }
  } catch {
    // DB unreachable at build time — the static routes above still ship.
  }

  return entries
}
