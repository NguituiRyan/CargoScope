import { getTranslations } from "next-intl/server"
import {
  Calculator,
  Clock,
  Languages,
  Mail,
  MapPin,
  MessagesSquare,
  Phone,
  ShieldCheck,
} from "lucide-react"

import { LogoMark } from "@/components/brand/logo-mark"
import { Link } from "@/i18n/navigation"

const CONTACT_EMAIL = "info@shopbuddy.africa"

/**
 * Global footer. Rendered on every page (in the locale layout) so navigation,
 * trust, contact, and legal surfaces are always reachable.
 */
export async function SiteFooter() {
  const [t, tNav] = await Promise.all([
    getTranslations("footer"),
    getTranslations("nav"),
  ])
  const year = new Date().getFullYear()

  const columns = [
    {
      title: t("forBuyers"),
      links: [
        { href: "/products", label: tNav("products") },
        { href: "/manufacturers", label: tNav("manufacturers") },
        { href: "/how-it-works", label: tNav("howItWorks") },
        { href: "/buyer-protection", label: t("buyerProtection") },
      ],
    },
    {
      title: t("forSuppliers"),
      links: [
        { href: "/sign-up", label: t("becomeSupplier") },
        { href: "/pricing", label: tNav("pricing") },
        { href: "/supplier-verification", label: t("supplierVerification") },
        { href: "/supplier-standards", label: t("supplierStandards") },
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
        { href: "/refunds", label: t("refunds") },
        { href: "/disputes", label: t("disputes") },
      ],
    },
  ]

  const signals = [
    { icon: ShieldCheck, label: t("trustVerified") },
    { icon: MessagesSquare, label: t("trustSecure") },
    { icon: Calculator, label: t("trustLanded") },
    { icon: Languages, label: t("trustLangs") },
  ]

  return (
    <footer className="mt-auto border-t border-border bg-muted/30">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-8 px-4 py-12 sm:grid-cols-3 lg:grid-cols-6">
        <div className="col-span-2 flex flex-col gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 font-heading text-lg font-semibold tracking-tight"
          >
            <LogoMark className="size-6 shrink-0 text-primary" />
            {tNav("brand")}
          </Link>
          <p className="max-w-xs text-sm text-muted-foreground">{t("tagline")}</p>
          <ul className="flex flex-col gap-2.5 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <Mail className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="transition-colors hover:text-foreground"
              >
                {CONTACT_EMAIL}
              </a>
            </li>
            <li className="flex items-start gap-2">
              <Phone className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              <a
                href="tel:+8619750539767"
                className="transition-colors hover:text-foreground"
              >
                {t("phoneCn")}
              </a>
            </li>
            <li className="flex items-start gap-2">
              <MapPin className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              <span className="leading-normal">
                {t("addressCn")}
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Clock className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              {t("hours")}
            </li>
          </ul>
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
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-center gap-x-6 gap-y-2 px-4 py-4 sm:justify-between">
          {signals.map(({ icon: Icon, label }) => (
            <span
              key={label}
              className="inline-flex items-center gap-2 text-xs text-muted-foreground"
            >
              <Icon className="size-4 text-primary" aria-hidden />
              {label}
            </span>
          ))}
        </div>
      </div>

      <div className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-1 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            © {year} {tNav("brand")}. {t("rights")}
          </p>
          <p className="text-xs text-muted-foreground">{t("bottomLine")}</p>
        </div>
      </div>
    </footer>
  )
}
