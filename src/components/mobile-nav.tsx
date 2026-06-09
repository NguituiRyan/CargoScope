"use client"

import { useEffect, useState } from "react"
import { Menu, MessageSquare, X } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import { Link } from "@/i18n/navigation"
import { signOutAction } from "@/lib/auth/actions"
import { cn } from "@/lib/utils"

export interface MobileNavUser {
  /** Display name or email shown on the account row. */
  label: string
  dashboardHref: string | null
  isBuyer: boolean
}

/**
 * Mobile header menu. The desktop nav is hidden below `sm`, so on phones a
 * hamburger toggles a dropdown that holds the nav links, the currency/locale
 * switchers (passed as `children`), and the auth actions — keeping the header
 * row itself uncluttered.
 */
export function MobileNav({
  links,
  user,
  unreadCount,
  locale,
  labels,
  children,
}: {
  links: { href: string; label: string }[]
  user: MobileNavUser | null
  unreadCount: number
  locale: string
  labels: {
    menu: string
    signIn: string
    signOut: string
    dashboard: string
    rfqs: string
    messages: string
  }
  /** Currency + locale switchers, rendered inside the menu on mobile. */
  children?: React.ReactNode
}) {
  const [open, setOpen] = useState(false)

  // Close on Escape for keyboard users.
  useEffect(() => {
    if (!open) return
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false)
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open])

  const itemClass =
    "flex items-center justify-between rounded-md px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
  const close = () => setOpen(false)

  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-label={labels.menu}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }))}
      >
        {open ? (
          <X className="size-5" aria-hidden />
        ) : (
          <Menu className="size-5" aria-hidden />
        )}
      </button>

      {open ? (
        <>
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            onClick={close}
            className="fixed inset-0 top-14 z-40 bg-foreground/20"
          />
          <div className="fixed inset-x-0 top-14 z-40 max-h-[calc(100dvh-3.5rem)] overflow-y-auto border-b border-border bg-background shadow-lg">
            <nav className="mx-auto flex max-w-6xl flex-col gap-0.5 px-4 py-3">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={close}
                  className={itemClass}
                >
                  {link.label}
                </Link>
              ))}

              {children ? (
                <div className="mt-2 flex items-center gap-2 border-t border-border px-1 pt-3">
                  {children}
                </div>
              ) : null}

              <div className="mt-2 flex flex-col gap-0.5 border-t border-border pt-3">
                {user ? (
                  <>
                    {user.dashboardHref ? (
                      <Link
                        href={user.dashboardHref}
                        onClick={close}
                        className={itemClass}
                      >
                        {labels.dashboard}
                      </Link>
                    ) : null}
                    {user.isBuyer ? (
                      <Link href="/rfqs" onClick={close} className={itemClass}>
                        {labels.rfqs}
                      </Link>
                    ) : null}
                    <Link href="/messages" onClick={close} className={itemClass}>
                      <span className="inline-flex items-center gap-2">
                        <MessageSquare className="size-4" aria-hidden />
                        {labels.messages}
                      </span>
                      {unreadCount > 0 ? (
                        <span className="grid min-w-5 place-items-center rounded-full bg-primary px-1.5 py-0.5 text-[11px] font-semibold leading-none text-primary-foreground">
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                      ) : null}
                    </Link>
                    <Link
                      href="/account"
                      onClick={close}
                      className={cn(itemClass, "text-muted-foreground")}
                    >
                      {user.label}
                    </Link>
                    <form action={signOutAction} className="px-1 pt-2">
                      <input type="hidden" name="locale" value={locale} />
                      <button
                        type="submit"
                        className={cn(
                          buttonVariants({ variant: "outline", size: "sm" }),
                          "w-full"
                        )}
                      >
                        {labels.signOut}
                      </button>
                    </form>
                  </>
                ) : (
                  <Link
                    href="/sign-in"
                    onClick={close}
                    className={cn(
                      buttonVariants({ variant: "default", size: "sm" }),
                      "w-full"
                    )}
                  >
                    {labels.signIn}
                  </Link>
                )}
              </div>
            </nav>
          </div>
        </>
      ) : null}
    </div>
  )
}
