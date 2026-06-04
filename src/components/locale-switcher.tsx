"use client"

import { useLocale } from "next-intl"

import { Link, usePathname } from "@/i18n/navigation"
import { locales, type Locale } from "@/i18n/routing"
import { cn } from "@/lib/utils"

const labels: Record<Locale, string> = {
  en: "EN",
  sw: "SW",
  zh: "中文",
}

export function LocaleSwitcher() {
  const pathname = usePathname()
  const active = useLocale()

  return (
    <div
      className="flex items-center gap-0.5"
      role="group"
      aria-label="Language"
    >
      {locales.map((locale) => (
        <Link
          key={locale}
          href={pathname}
          locale={locale}
          aria-current={locale === active ? "true" : undefined}
          className={cn(
            "rounded-md px-2 py-1 text-xs font-medium transition-colors",
            locale === active
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {labels[locale]}
        </Link>
      ))}
    </div>
  )
}
