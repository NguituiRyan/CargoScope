import { Ship } from "lucide-react"
import { getLocale, getTranslations } from "next-intl/server"

import { CurrencySelector } from "@/components/currency-selector"
import { LocaleSwitcher } from "@/components/locale-switcher"
import { Button, buttonVariants } from "@/components/ui/button"
import { Link } from "@/i18n/navigation"
import { signOutAction } from "@/lib/auth/actions"
import { getSessionUser } from "@/lib/auth/session"
import { getDisplayCurrency } from "@/lib/currency/server"
import { cn } from "@/lib/utils"

export async function SiteHeader() {
  const t = await getTranslations("nav")
  const locale = await getLocale()
  const [user, currency] = await Promise.all([
    getSessionUser(),
    getDisplayCurrency(),
  ])

  const dashboardHref =
    user?.role === "admin"
      ? "/admin"
      : user?.role === "manufacturer"
        ? "/seller/products"
        : null

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
        <Link
          href="/"
          className="flex items-center gap-2 font-heading text-lg font-semibold tracking-tight"
        >
          <Ship className="size-5 text-primary" aria-hidden />
          <span>{t("brand")}</span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground sm:flex">
          <Link href="/products" className="transition-colors hover:text-foreground">
            {t("products")}
          </Link>
          <Link
            href="/manufacturers"
            className="transition-colors hover:text-foreground"
          >
            {t("manufacturers")}
          </Link>
          <Link
            href="/how-it-works"
            className="transition-colors hover:text-foreground"
          >
            {t("howItWorks")}
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <CurrencySelector current={currency} label={t("currency")} />
          <LocaleSwitcher />
          {user ? (
            <>
              {dashboardHref ? (
                <Link
                  href={dashboardHref}
                  className={cn(
                    buttonVariants({ variant: "ghost", size: "sm" }),
                    "hidden sm:inline-flex"
                  )}
                >
                  {t("dashboard")}
                </Link>
              ) : null}
              <Link
                href="/account"
                className={cn(
                  buttonVariants({ variant: "ghost", size: "sm" }),
                  "max-w-[10rem] truncate"
                )}
              >
                {user.fullName ?? user.email}
              </Link>
              <form action={signOutAction}>
                <input type="hidden" name="locale" value={locale} />
                <Button type="submit" variant="outline" size="sm">
                  {t("signOut")}
                </Button>
              </form>
            </>
          ) : (
            <Link
              href="/sign-in"
              className={cn(buttonVariants({ variant: "default", size: "sm" }))}
            >
              {t("signIn")}
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
