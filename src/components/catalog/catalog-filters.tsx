"use client"

import { useSearchParams } from "next/navigation"
import { useTranslations } from "next-intl"
import { Search, SlidersHorizontal } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { useRouter } from "@/i18n/navigation"
import type { FilterCategory } from "@/lib/catalog/queries"

const TIERS = ["identity", "verified", "premium"] as const
const SORTS = ["recent", "priceAsc", "priceDesc"] as const

export function CatalogFilters({
  categories,
}: {
  categories: FilterCategory[]
}) {
  const t = useTranslations("catalog")
  const tv = useTranslations("verification")
  const router = useRouter()
  const params = useSearchParams()

  const current = (key: string) => params.get(key) ?? ""

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const query: Record<string, string> = {}
    for (const [key, value] of formData.entries()) {
      const trimmed = String(value).trim()
      if (trimmed) query[key] = trimmed
    }
    router.push({ pathname: "/products", query })
  }

  function handleClear() {
    router.push({ pathname: "/products" })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4"
    >
      <div className="flex items-center gap-2 text-sm font-medium">
        <SlidersHorizontal className="size-4" aria-hidden />
        {t("filtersTitle")}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="filter-q">{t("searchPlaceholder")}</Label>
        <Input
          id="filter-q"
          name="q"
          type="search"
          defaultValue={current("q")}
          placeholder={t("searchPlaceholder")}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="filter-category">{t("category")}</Label>
          <Select
            id="filter-category"
            name="category"
            defaultValue={current("category")}
          >
            <option value="">{t("allCategories")}</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.slug}>
                {cat.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="filter-tier">{t("tier")}</Label>
          <Select id="filter-tier" name="tier" defaultValue={current("tier")}>
            <option value="">{t("anyTier")}</option>
            {TIERS.map((tier) => (
              <option key={tier} value={tier}>
                {tv(`status.${tier}`)}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="filter-sort">{t("sort")}</Label>
          <Select
            id="filter-sort"
            name="sort"
            defaultValue={current("sort") || "recent"}
          >
            {SORTS.map((sort) => (
              <option key={sort} value={sort}>
                {t(
                  sort === "recent"
                    ? "sortRecent"
                    : sort === "priceAsc"
                      ? "sortPriceAsc"
                      : "sortPriceDesc"
                )}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="filter-maxMoq">{t("maxMoq")}</Label>
          <Input
            id="filter-maxMoq"
            name="maxMoq"
            type="number"
            min={0}
            inputMode="numeric"
            defaultValue={current("maxMoq")}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="filter-maxLeadTime">{t("maxLeadTime")}</Label>
          <Input
            id="filter-maxLeadTime"
            name="maxLeadTime"
            type="number"
            min={0}
            inputMode="numeric"
            defaultValue={current("maxLeadTime")}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="filter-origin">{t("origin")}</Label>
          <Input
            id="filter-origin"
            name="origin"
            defaultValue={current("origin")}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="filter-minPrice">{t("minPrice")}</Label>
          <Input
            id="filter-minPrice"
            name="minPrice"
            type="number"
            min={0}
            step="0.01"
            inputMode="decimal"
            defaultValue={current("minPrice")}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="filter-maxPrice">{t("maxPrice")}</Label>
          <Input
            id="filter-maxPrice"
            name="maxPrice"
            type="number"
            min={0}
            step="0.01"
            inputMode="decimal"
            defaultValue={current("maxPrice")}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="lg">
          <Search className="size-4" aria-hidden />
          {t("apply")}
        </Button>
        <Button type="button" variant="outline" size="lg" onClick={handleClear}>
          {t("clear")}
        </Button>
      </div>
    </form>
  )
}
