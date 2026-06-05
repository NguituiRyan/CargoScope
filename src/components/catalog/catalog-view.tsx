import { Calculator, Languages, ShieldCheck } from "lucide-react"
import { getTranslations } from "next-intl/server"

import { CatalogFilters } from "@/components/catalog/catalog-filters"
import { ProductCard } from "@/components/catalog/product-card"
import { Card, CardContent } from "@/components/ui/card"
import { Link } from "@/i18n/navigation"
import {
  getFilterCategories,
  searchProducts,
  type CatalogFilters as CatalogFilterValues,
  type CatalogSort,
} from "@/lib/catalog/queries"
import { getDisplayCurrency } from "@/lib/currency/server"
import { formatDisplayPrice } from "@/lib/currency/shared"
import { getDisplayRates } from "@/lib/fx"
import type { VerificationTier } from "@/lib/manufacturers/queries"
import { cn } from "@/lib/utils"

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
    sort: SORTS.includes(sort as CatalogSort) ? (sort as CatalogSort) : undefined,
  }
}

function CategoryChip({
  href,
  label,
  active,
}: {
  href: string
  label: string
  active: boolean
}) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-full border px-3 py-1 text-sm transition-colors",
        active
          ? "border-primary bg-primary/10 font-medium text-primary"
          : "border-border text-muted-foreground hover:border-ring hover:text-foreground"
      )}
    >
      {label}
    </Link>
  )
}

/**
 * The product catalogue — also used as the site landing page. A trust hero sits
 * above category chips, filters, and the price-aware product grid.
 */
export async function CatalogView({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const [t, tHome] = await Promise.all([
    getTranslations("catalog"),
    getTranslations("home"),
  ])

  const filters = parseFilters(await searchParams)
  const [{ items, total }, categories, currency, displayRates] =
    await Promise.all([
      searchProducts(filters),
      getFilterCategories(),
      getDisplayCurrency(),
      getDisplayRates(),
    ])

  const activeCategory = filters.category ?? null
  const pillars = [
    { icon: ShieldCheck, label: tHome("pillars.verifiedTitle") },
    { icon: Calculator, label: tHome("pillars.landedTitle") },
    { icon: Languages, label: tHome("pillars.translateTitle") },
  ]

  return (
    <div className="flex flex-col">
      <section className="border-b border-border bg-muted/30">
        <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:py-14">
          <div className="flex max-w-2xl flex-col gap-4">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
              <span className="size-1.5 rounded-full bg-verified" aria-hidden />
              {tHome("badge")}
            </span>
            <h1 className="font-heading text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              {tHome("title")}
            </h1>
            <p className="text-base text-muted-foreground text-pretty">
              {tHome("subtitle")}
            </p>
            <ul className="flex flex-wrap gap-x-5 gap-y-2 pt-1">
              {pillars.map(({ icon: Icon, label }) => (
                <li
                  key={label}
                  className="inline-flex items-center gap-2 text-sm text-muted-foreground"
                >
                  <Icon className="size-4 text-primary" aria-hidden />
                  {label}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
        {categories.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t("browseByCategory")}
            </span>
            <div className="flex flex-wrap gap-2">
              <CategoryChip
                href="/products"
                label={t("allProducts")}
                active={!activeCategory}
              />
              {categories.map((category) => (
                <CategoryChip
                  key={category.id}
                  href={`/products?category=${category.slug}`}
                  label={category.name}
                  active={activeCategory === category.slug}
                />
              ))}
            </div>
          </div>
        )}

        <CatalogFilters categories={categories} />

        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <p className="text-sm text-muted-foreground">
            {t("results", { count: total })}
          </p>
          {currency !== "USD" && (
            <p className="text-xs text-muted-foreground">
              {t("indicativePrice", {
                rate: formatDisplayPrice(1, currency, displayRates.rates),
              })}
            </p>
          )}
        </div>

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
              <ProductCard
                key={product.id}
                product={product}
                currency={currency}
                rates={displayRates.rates}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
