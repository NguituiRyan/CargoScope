import { Calculator, Languages, ShieldCheck, Sparkles } from "lucide-react"
import { getTranslations } from "next-intl/server"

import { CatalogFilters } from "@/components/catalog/catalog-filters"
import { CatalogSearch } from "@/components/catalog/catalog-search"
import { HeroSearch } from "@/components/catalog/hero-search"
import { ProductCard } from "@/components/catalog/product-card"
import { Card, CardContent } from "@/components/ui/card"
import { Link } from "@/i18n/navigation"
import {
  getCatalogStats,
  getFeaturedProducts,
  getFilterCategories,
  getPriceCeilingUsd,
  searchProducts,
  type CatalogFilters as CatalogFilterValues,
  type CatalogSort,
} from "@/lib/catalog/queries"
import { getDisplayCurrency } from "@/lib/currency/server"
import { getDisplayRates } from "@/lib/fx"
import { getProductRatings } from "@/lib/reviews/queries"
import type { VerificationTier } from "@/lib/manufacturers/queries"
import { cn } from "@/lib/utils"

type SearchParams = Record<string, string | string[] | undefined>

const SORTS: CatalogSort[] = ["recent", "popular", "priceAsc", "priceDesc"]
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

/** Round up to a "nice" 1/2/5×10ⁿ value, for the price-slider ceiling and step. */
function niceCeil(value: number): number {
  if (!(value > 0)) return 0
  const mag = 10 ** Math.floor(Math.log10(value))
  const norm = value / mag
  const niceNorm = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10
  return niceNorm * mag
}

/**
 * Catalogue prices are stored in USD, but the price filter is denominated in the
 * shopper's display currency. `rate` is units of display currency per 1 USD, so
 * we divide the entered value back to USD for the query.
 */
function parseFilters(params: SearchParams, rate: number): CatalogFilterValues {
  const sort = str(params.sort)
  const tier = str(params.tier)
  const toUsd = (v: number | undefined) =>
    v === undefined ? undefined : v / (rate > 0 ? rate : 1)
  return {
    q: str(params.q),
    category: str(params.category),
    tier: TIERS.includes(tier as VerificationTier)
      ? (tier as VerificationTier)
      : undefined,
    maxMoq: num(params.maxMoq),
    maxLeadTime: num(params.maxLeadTime),
    minPrice: toUsd(num(params.minPrice)),
    maxPrice: toUsd(num(params.maxPrice)),
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
        "shrink-0 rounded-full border px-3.5 py-1.5 text-sm whitespace-nowrap transition-colors",
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
 * The product catalogue — also the site landing page. A compact trust hero sits
 * above a sticky filter/sort toolbar and a product-forward grid.
 */
export async function CatalogView({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const [t, tHome, sp] = await Promise.all([
    getTranslations("catalog"),
    getTranslations("home"),
    searchParams,
  ])

  const [categories, currency, displayRates, priceCeilingUsd, stats] =
    await Promise.all([
      getFilterCategories(),
      getDisplayCurrency(),
      getDisplayRates(),
      getPriceCeilingUsd(),
      getCatalogStats(),
    ])
  const rate = displayRates.rates[currency] || 1
  const priceMax = niceCeil((priceCeilingUsd > 0 ? priceCeilingUsd : 1000) * rate)
  const priceStep = niceCeil(priceMax / 100) || 1
  const filters = parseFilters(sp, rate)
  const { items } = await searchProducts(filters)
  const ratings = await getProductRatings(items.map((i) => i.id))

  if (filters.sort === "popular") {
    items.sort((a, b) => {
      const ra = ratings.get(a.id)
      const rb = ratings.get(b.id)
      return (rb?.count ?? 0) - (ra?.count ?? 0) || (rb?.avg ?? 0) - (ra?.avg ?? 0)
    })
  }

  // Featured "Top picks" rail only on the unfiltered landing view.
  const noFilters =
    !filters.q &&
    !filters.category &&
    !filters.tier &&
    filters.minPrice === undefined &&
    filters.maxPrice === undefined &&
    filters.maxMoq === undefined &&
    filters.maxLeadTime === undefined &&
    !filters.origin
  const featured = noFilters ? await getFeaturedProducts(6) : []
  const featuredRatings = featured.length
    ? await getProductRatings(featured.map((p) => p.id))
    : new Map<string, { avg: number; count: number }>()

  const activeCategory = filters.category ?? null
  const pillars = [
    { icon: ShieldCheck, label: tHome("pillars.verifiedTitle") },
    { icon: Calculator, label: tHome("pillars.landedTitle") },
    { icon: Languages, label: tHome("pillars.translateTitle") },
  ]
  const popular = categories.slice(0, 5).map((c) => ({
    label: c.name,
    href: `/products?category=${c.slug}`,
  }))

  return (
    <div className="flex flex-col">
      <section className="border-b border-border bg-gradient-to-b from-[#ffd166]/25 to-background">
        <div className="mx-auto w-full max-w-6xl px-4 py-7 sm:py-9">
          <div className="mx-auto flex max-w-2xl flex-col items-center gap-3 text-center">
            <h1 className="font-heading text-3xl font-bold tracking-tight text-balance sm:text-4xl">
              {tHome("title")}
            </h1>
            <p className="text-sm text-muted-foreground text-pretty sm:text-base">
              {tHome("subtitle")}
            </p>
            <div className="w-full pt-1">
              <HeroSearch defaultValue={filters.q} popular={popular} />
            </div>
            <ul className="flex flex-wrap justify-center gap-x-5 gap-y-2 pt-0.5">
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

      <div className="border-b border-border bg-muted/30">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-3 gap-4 px-4 py-5 text-center">
          {[
            { value: stats.suppliers, label: tHome("statsSuppliers") },
            { value: stats.products, label: tHome("statsProducts") },
            { value: stats.categories, label: tHome("statsCategories") },
          ].map((stat) => (
            <div key={stat.label} className="flex flex-col">
              <span className="font-heading text-2xl font-bold tabular-nums text-primary">
                {stat.value.toLocaleString()}
              </span>
              <span className="text-xs text-muted-foreground">{stat.label}</span>
            </div>
          ))}
        </div>
      </div>

      {categories.length > 0 && (
        <div className="mx-auto w-full max-w-6xl px-4 pt-5">
          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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

      {featured.length > 0 ? (
        <div className="mx-auto w-full max-w-6xl px-4 pt-6">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="size-4 text-primary" aria-hidden />
            <h2 className="font-heading text-lg font-semibold">
              {t("featuredTitle")}
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
            {featured.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                currency={currency}
                rates={displayRates.rates}
                rating={featuredRatings.get(p.id)}
              />
            ))}
          </div>
        </div>
      ) : null}

      <div className="sticky top-14 z-30 border-b border-border bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
          <CatalogSearch />
          <CatalogFilters
            categories={categories}
            currency={currency}
            priceMax={priceMax}
            priceStep={priceStep}
          />
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl px-4 py-6">
        {items.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-1 py-12 text-center">
              <p className="text-sm font-medium">{t("empty")}</p>
              <p className="text-sm text-muted-foreground">{t("emptyHint")}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
            {items.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                currency={currency}
                rates={displayRates.rates}
                rating={ratings.get(product.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
