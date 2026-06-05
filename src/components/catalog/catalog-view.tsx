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

  const [categories, currency, displayRates] = await Promise.all([
    getFilterCategories(),
    getDisplayCurrency(),
    getDisplayRates(),
  ])
  const rate = displayRates.rates[currency] || 1
  const filters = parseFilters(sp, rate)
  const { items, total } = await searchProducts(filters)

  const activeCategory = filters.category ?? null
  const pillars = [
    { icon: ShieldCheck, label: tHome("pillars.verifiedTitle") },
    { icon: Calculator, label: tHome("pillars.landedTitle") },
    { icon: Languages, label: tHome("pillars.translateTitle") },
  ]

  return (
    <div className="flex flex-col">
      <section className="border-b border-border bg-gradient-to-b from-muted/50 to-background">
        <div className="mx-auto w-full max-w-6xl px-4 py-7 sm:py-9">
          <div className="flex max-w-2xl flex-col gap-3">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
              <span className="size-1.5 rounded-full bg-verified" aria-hidden />
              {tHome("badge")}
            </span>
            <h1 className="font-heading text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
              {tHome("title")}
            </h1>
            <p className="text-sm text-muted-foreground text-pretty sm:text-base">
              {tHome("subtitle")}
            </p>
            <ul className="flex flex-wrap gap-x-5 gap-y-2 pt-0.5">
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

      <div className="sticky top-14 z-30 border-b border-border bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex flex-col">
            <p className="text-sm font-medium">{t("results", { count: total })}</p>
            {currency !== "USD" && (
              <p className="text-xs text-muted-foreground">
                {t("indicativePrice", {
                  rate: formatDisplayPrice(1, currency, displayRates.rates),
                })}
              </p>
            )}
          </div>
          <CatalogFilters categories={categories} currency={currency} />
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
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
