"use client"

import { useTranslations } from "next-intl"

import { Link, usePathname } from "@/i18n/navigation"
import { cn } from "@/lib/utils"

const tabs = [
  { href: "/seller/onboarding", key: "navProfile" },
  { href: "/seller/verification", key: "navVerification" },
] as const

export function SellerNav() {
  const t = useTranslations("seller")
  const pathname = usePathname()

  return (
    <nav className="flex gap-1 rounded-lg border border-border bg-card p-1 text-sm">
      {tabs.map((tab) => {
        const active = pathname === tab.href
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "flex-1 rounded-md px-3 py-1.5 text-center font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t(tab.key)}
          </Link>
        )
      })}
    </nav>
  )
}
