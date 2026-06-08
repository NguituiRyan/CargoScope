import { getTranslations } from "next-intl/server"

import { LogoMark } from "@/components/brand/logo-mark"
import { Link } from "@/i18n/navigation"

/**
 * Global footer with marketplace, company, and legal links. Rendered on every
 * page (in the locale layout) so trust/legal surfaces are always reachable.
 */
export async function SiteFooter() {
  const [t, tNav] = await Promise.all([
    getTranslations("footer"),
    getTranslations("nav"),
  ])
  const year = new Date().getFullYear()

  const columns = [
    {
      title: t("marketplace"),
      links: [
        { href: "/products", label: tNav("products") },
        { href: "/manufacturers", label: tNav("manufacturers") },
        { href: "/pricing", label: tNav("pricing") },
        { href: "/how-it-works", label: tNav("howItWorks") },
      ],
    },
    {
      title: t("company"),
      links: [
        { href: "/about", label: t("about") },
        { href: "/contact", label: t("contact") },
      ],
    },
    {
      title: t("legal"),
      links: [
        { href: "/terms", label: t("terms") },
        { href: "/privacy", label: t("privacy") },
      ],
    },
  ]

  return (
    <footer className="mt-auto border-t border-border bg-muted/30">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-8 px-4 py-10 sm:grid-cols-4">
        <div className="col-span-2 flex flex-col gap-2 sm:col-span-1">
          <Link
            href="/"
            className="flex items-center gap-2 font-heading text-lg font-semibold tracking-tight"
          >
            <LogoMark className="size-6 shrink-0 text-primary" />
            {tNav("brand")}
          </Link>
          <p className="text-sm text-muted-foreground">{t("tagline")}</p>
        </div>

        {columns.map((column) => (
          <nav key={column.title} className="flex flex-col gap-2.5">
            <h2 className="text-sm font-semibold">{column.title}</h2>
            <ul className="flex flex-col gap-2">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="border-t border-border">
        <div className="mx-auto w-full max-w-6xl px-4 py-4">
          <p className="text-xs text-muted-foreground">
            © {year} {tNav("brand")}. {t("rights")}
          </p>
        </div>
      </div>
    </footer>
  )
}
