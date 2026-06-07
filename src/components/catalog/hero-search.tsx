"use client"

import { useState } from "react"
import { Search } from "lucide-react"
import { useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Link, useRouter } from "@/i18n/navigation"

/**
 * Prominent landing search — the primary CTA for a marketplace. Navigates to the
 * catalog with a `q` query so the existing full-text search handles results.
 */
export function HeroSearch({
  defaultValue,
  popular,
}: {
  defaultValue?: string
  popular?: { label: string; href: string }[]
}) {
  const t = useTranslations("catalog")
  const router = useRouter()
  const [q, setQ] = useState(defaultValue ?? "")

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = q.trim()
    router.push({ pathname: "/products", query: trimmed ? { q: trimmed } : {} })
  }

  return (
    <div className="flex w-full max-w-2xl flex-col gap-2.5">
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("heroSearchPlaceholder")}
            aria-label={t("heroSearchPlaceholder")}
            className="h-12 rounded-full border-2 pl-11 text-base shadow-sm"
          />
        </div>
        <Button type="submit" size="lg" className="h-12 rounded-full px-6 brand-gradient-02 text-white">
          <Search className="size-4 sm:hidden" aria-hidden />
          <span className="hidden sm:inline">{t("search")}</span>
        </Button>
      </form>
      {popular && popular.length > 0 ? (
        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <span>{t("popular")}</span>
          {popular.map((p) => (
            <Link
              key={p.href}
              href={p.href}
              className="rounded-full bg-muted px-2.5 py-0.5 transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              {p.label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  )
}
