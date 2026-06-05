"use client"

import { useEffect, useId, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import { useTranslations } from "next-intl"
import { Search, SlidersHorizontal, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { useRouter } from "@/i18n/navigation"
import type { FilterCategory } from "@/lib/catalog/queries"
import { currencyLabel, type DisplayCurrency } from "@/lib/currency/shared"

const TIERS = ["identity", "verified", "premium"] as const
const SORTS = ["recent", "popular", "priceAsc", "priceDesc"] as const
const SORT_LABELS: Record<(typeof SORTS)[number], string> = {
  recent: "sortRecent",
  popular: "sortPopular",
  priceAsc: "sortPriceAsc",
  priceDesc: "sortPriceDesc",
}

/** Filter fields the dropdown owns (sort lives in the always-visible toolbar). */
const FILTER_KEYS = [
  "q",
  "category",
  "tier",
  "maxMoq",
  "maxLeadTime",
  "origin",
  "minPrice",
  "maxPrice",
] as const

/**
 * Catalog toolbar: an always-visible sort control plus a "Filters" dropdown that
 * holds the rest of the controls, so the product grid stays the focus. Price
 * inputs are denominated in the shopper's active display currency.
 */
export function CatalogFilters({
  categories,
  currency,
}: {
  categories: FilterCategory[]
  currency: DisplayCurrency
}) {
  const t = useTranslations("catalog")
  const tv = useTranslations("verification")
  const router = useRouter()
  const params = useSearchParams()
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const panelId = useId()

  const current = (key: string) => params.get(key) ?? ""
  const activeCount = FILTER_KEYS.filter((k) => current(k)).length
  const ccy = currencyLabel(currency)

  // Close the dropdown on outside click or Escape.
  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", onClick)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onClick)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  function pushQuery(next: Record<string, string>) {
    const merged: Record<string, string> = {}
    params.forEach((value, key) => {
      if (value) merged[key] = value
    })
    for (const [key, value] of Object.entries(next)) {
      const trimmed = value.trim()
      if (trimmed) merged[key] = trimmed
      else delete merged[key]
    }
    router.push({ pathname: "/products", query: merged })
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const next: Record<string, string> = {}
    for (const key of FILTER_KEYS) next[key] = String(formData.get(key) ?? "")
    pushQuery(next)
    setOpen(false)
  }

  function handleClear() {
    router.push({ pathname: "/products" })
    setOpen(false)
  }

  return (
    <div className="flex items-center gap-2" ref={wrapRef}>
      <Select
        aria-label={t("sort")}
        value={current("sort") || "recent"}
        onChange={(e) => pushQuery({ sort: e.target.value })}
        className="h-9 w-auto text-sm md:text-sm"
      >
        {SORTS.map((sort) => (
          <option key={sort} value={sort}>
            {t(SORT_LABELS[sort])}
          </option>
        ))}
      </Select>

      <div className="relative">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls={panelId}
          className="gap-1.5"
        >
          <SlidersHorizontal className="size-4" aria-hidden />
          {t("filtersTitle")}
          {activeCount > 0 ? (
            <span className="grid min-w-5 place-items-center rounded-full bg-primary px-1.5 text-[11px] font-semibold leading-5 text-primary-foreground">
              {activeCount}
            </span>
          ) : null}
        </Button>

        {open ? (
          <div
            id={panelId}
            className="absolute right-0 z-30 mt-2 w-[min(92vw,28rem)] rounded-xl border border-border bg-card p-4 shadow-lg"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-medium">{t("filtersTitle")}</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t("clear")}
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                  <Select
                    id="filter-tier"
                    name="tier"
                    defaultValue={current("tier")}
                  >
                    <option value="">{t("anyTier")}</option>
                    {TIERS.map((tier) => (
                      <option key={tier} value={tier}>
                        {tv(`status.${tier}`)}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="filter-minPrice">
                    {t("minPrice", { currency: ccy })}
                  </Label>
                  <Input
                    id="filter-minPrice"
                    name="minPrice"
                    type="number"
                    min={0}
                    step="1"
                    inputMode="decimal"
                    defaultValue={current("minPrice")}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="filter-maxPrice">
                    {t("maxPrice", { currency: ccy })}
                  </Label>
                  <Input
                    id="filter-maxPrice"
                    name="maxPrice"
                    type="number"
                    min={0}
                    step="1"
                    inputMode="decimal"
                    defaultValue={current("maxPrice")}
                  />
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

                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <Label htmlFor="filter-origin">{t("origin")}</Label>
                  <Input
                    id="filter-origin"
                    name="origin"
                    defaultValue={current("origin")}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  <Search className="size-4" aria-hidden />
                  {t("apply")}
                </Button>
                <Button type="button" variant="outline" onClick={handleClear}>
                  {t("clear")}
                </Button>
              </div>
            </form>
          </div>
        ) : null}
      </div>
    </div>
  )
}
