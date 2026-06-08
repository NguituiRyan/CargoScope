"use client"

import { useTranslations } from "next-intl"

import { Link, usePathname } from "@/i18n/navigation"
import { cn } from "@/lib/utils"

const tabs = [
  { href: "/seller", key: "navOverview" },
  { href: "/seller/products", key: "navProducts" },
  { href: "/seller/rfqs", key: "navRfqs" },
  { href: "/seller/onboarding", key: "navProfile" },
  { href: "/seller/verification", key: "navVerification" },
] as const

export function SellerNav() {
  const t = useTranslations("seller")
  const pathname = usePathname()

  return (
    <nav className="flex flex-wrap gap-1 rounded-lg border border-border bg-card p-1 text-sm">
      {tabs.map((tab) => {
        const active =
          tab.href === "/seller"
            ? pathname === "/seller"
            : pathname === tab.href || pathname.startsWith(`${tab.href}/`)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "flex-1 min-w-fit whitespace-nowrap rounded-md px-3 py-1.5 text-center font-medium transition-colors",
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
