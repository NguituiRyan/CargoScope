"use client"

import { Search } from "lucide-react"
import { useSearchParams } from "next/navigation"
import { useTranslations } from "next-intl"

import { Input } from "@/components/ui/input"
import { useRouter } from "@/i18n/navigation"
import { trackBusinessEvent } from "@/lib/analytics/client"

/**
 * Compact search that lives in the sticky catalog toolbar, so a shopper can keep
 * searching after the hero has scrolled away. Preserves the other active query
 * params (category, sort, filters) and just sets/clears `q`.
 */
export function CatalogSearch() {
  const t = useTranslations("catalog")
  const router = useRouter()
  const params = useSearchParams()

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const q = String(new FormData(event.currentTarget).get("q") ?? "").trim()
    const merged: Record<string, string> = {}
    params.forEach((value, key) => {
      if (value) merged[key] = value
    })
    if (q) merged.q = q
    else delete merged.q
    trackBusinessEvent("product_search", { query: q || "(cleared)" })
    router.push({ pathname: "/products", query: merged })
  }

  return (
    <form onSubmit={handleSubmit} className="relative min-w-[10rem] flex-1">
      <Search
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        key={params.get("q") ?? ""}
        type="search"
        name="q"
        defaultValue={params.get("q") ?? ""}
        placeholder={t("searchPlaceholder")}
        aria-label={t("searchPlaceholder")}
        className="h-9 rounded-full pl-9"
      />
    </form>
  )
}
