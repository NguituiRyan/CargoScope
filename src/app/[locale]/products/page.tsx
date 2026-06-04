import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"

import { CatalogFilters } from "@/components/catalog/catalog-filters"
import { ProductCard } from "@/components/catalog/product-card"
import { Card, CardContent } from "@/components/ui/card"
import {
  getFilterCategories,
  searchProducts,
  type CatalogFilters as CatalogFilterValues,
  type CatalogSort,
} from "@/lib/catalog/queries"
import type { VerificationTier } from "@/lib/manufacturers/queries"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("catalog")
  return { title: t("title") }
}

type SearchParams = Record<string, string | string[] | undefined>

const SORTS: CatalogSort[] = ["recent", "priceAsc", "priceDesc"]
const TIERS: VerificationTier[] = ["identity", "verified", "premium"]

function str(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value
  const trimmed = raw?.trim()
  return trimmed ? trimmed : undefined
}

function num(value: string | string[] | undefined): number | undefined {
  const raw = str(value)
  if (raw === undefined) return undefined
  const parsed = Number(raw)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined
}

function parseFilters(params: SearchParams): CatalogFilterValues {
  const sort = str(params.sort)
  const tier = str(params.tier)
  return {
    q: str(params.q),
    category: str(params.category),
    tier: TIERS.includes(tier as VerificationTier)
      ? (tier as VerificationTier)
      : undefined,
    maxMoq: num(params.maxMoq),
    maxLeadTime: num(params.maxLeadTime),
    minPrice: num(params.minPrice),
    maxPrice: num(params.maxPrice),
    origin: str(params.origin),
    sort: SORTS.includes(sort as CatalogSort)
      ? (sort as CatalogSort)
      : undefined,
  }
}

export default async function ProductsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<SearchParams>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations("catalog")

  const filters = parseFilters(await searchParams)
  const [{ items, total }, categories] = await Promise.all([
    searchProducts(filters),
    getFilterCategories(),
  ])

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          {t("title")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <CatalogFilters categories={categories} />

      <p className="text-sm text-muted-foreground">
        {t("results", { count: total })}
      </p>

      {items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-1 py-12 text-center">
            <p className="text-sm font-medium">{t("empty")}</p>
            <p className="text-sm text-muted-foreground">{t("emptyHint")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {items.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  )
}
