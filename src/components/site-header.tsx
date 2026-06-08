import { MessageSquare } from "lucide-react"
import { getLocale, getTranslations } from "next-intl/server"

import { LogoMark } from "@/components/brand/logo-mark"
import { CurrencySelector } from "@/components/currency-selector"
import { LocaleSwitcher } from "@/components/locale-switcher"
import { MobileNav } from "@/components/mobile-nav"
import { Button, buttonVariants } from "@/components/ui/button"
import { Link } from "@/i18n/navigation"
import { signOutAction } from "@/lib/auth/actions"
import { getSessionUser } from "@/lib/auth/session"
import { getDisplayCurrency } from "@/lib/currency/server"
import { getUnreadMessageCount } from "@/lib/messaging/queries"
import { cn } from "@/lib/utils"

export async function SiteHeader() {
  const t = await getTranslations("nav")
  const locale = await getLocale()
  const [user, currency, unreadCount] = await Promise.all([
    getSessionUser(),
    getDisplayCurrency(),
    getUnreadMessageCount(),
  ])

  const dashboardHref =
    user?.role === "admin"
      ? "/admin"
      : user?.role === "manufacturer"
        ? "/seller"
        : user?.role === "buyer"
          ? "/dashboard"
          : null

  const navLinks = [
    { href: "/products", label: t("products") },
    { href: "/manufacturers", label: t("manufacturers") },
    { href: "/how-it-works", label: t("howItWorks") },
    { href: "/pricing", label: t("pricing") },
  ]

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
        <Link
          href="/"
          className="flex items-center gap-2 font-heading text-lg font-semibold tracking-tight"
        >
          <LogoMark className="size-6 shrink-0 text-primary" />
          <span className="hidden sm:inline">{t("brand")}</span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground lg:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop controls */}
        <div className="hidden items-center gap-2 lg:flex">
          <CurrencySelector current={currency} label={t("currency")} />
          <LocaleSwitcher />
          {user ? (
            <>
              {dashboardHref ? (
                <Link
                  href={dashboardHref}
                  className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
                >
                  {t("dashboard")}
                </Link>
              ) : null}
              {user.role === "buyer" ? (
                <Link
                  href="/rfqs"
                  className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
                >
                  {t("rfqs")}
                </Link>
              ) : null}
              <Link
                href="/messages"
                aria-label={t("messages")}
                className={cn(
                  buttonVariants({ variant: "ghost", size: "sm" }),
                  "gap-1.5"
                )}
              >
                <MessageSquare className="size-4" aria-hidden />
                {unreadCount > 0 ? (
                  <span className="grid min-w-5 place-items-center rounded-full bg-primary px-1.5 py-0.5 text-[11px] font-semibold leading-none text-primary-foreground">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                ) : null}
              </Link>
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

        {/* Mobile controls — currency, language, a prominent sign-up, + menu */}
        <div className="flex items-center gap-1.5 lg:hidden">
          <CurrencySelector current={currency} label={t("currency")} />
          <LocaleSwitcher />
          {user ? null : (
            <Link
              href="/sign-up"
              className={cn(buttonVariants({ variant: "default", size: "sm" }))}
            >
              {t("signUp")}
            </Link>
          )}
          <MobileNav
            links={navLinks}
            user={
              user
                ? {
                    label: user.fullName ?? user.email,
                    dashboardHref,
                    isBuyer: user.role === "buyer",
                  }
                : null
            }
            unreadCount={unreadCount}
            locale={locale}
            labels={{
              menu: t("menu"),
              signIn: t("signIn"),
              signOut: t("signOut"),
              dashboard: t("dashboard"),
              rfqs: t("rfqs"),
              messages: t("messages"),
            }}
          />
        </div>
      </div>
    </header>
  )
}
