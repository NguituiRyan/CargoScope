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
import { TrackedExternalLink } from "@/components/analytics/tracked-external-link"

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
              <TrackedExternalLink
                href={`mailto:${CONTACT_EMAIL}`}
                event="contact_click"
                metadata={{ channel: "email" }}
                className="transition-colors hover:text-foreground"
              >
                {CONTACT_EMAIL}
              </TrackedExternalLink>
            </li>
            <li className="flex items-start gap-2">
              <Phone className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              <a
                href="tel:+8619550539767"
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

          <div className="mt-5 flex flex-col gap-3.5">
            <TrackedExternalLink
              href="https://wa.me/8619550539767?text=Hello%20Shopbuddy%2C%20I%27m%20interested%20in%20sourcing%20products%20from%20China."
              event="whatsapp_click"
              metadata={{ placement: "footer" }}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 w-fit"
            >
              <WhatsappIcon className="size-4.5 shrink-0" />
              {t("chatWhatsapp")}
            </TrackedExternalLink>
            <div className="flex items-center gap-4 text-muted-foreground">
              <a
                href="https://www.tiktok.com/@shopbuddychinasourcing"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="TikTok"
                className="transition-colors hover:text-foreground"
              >
                <TiktokIcon className="size-5 shrink-0" />
              </a>
              <a
                href="https://www.youtube.com/@shopbuddychinasourcing"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="YouTube"
                className="transition-colors hover:text-foreground"
              >
                <YoutubeIcon className="size-5 shrink-0" />
              </a>
              <a
                href="https://www.instagram.com/shopbuddychinasourcing/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="transition-colors hover:text-foreground"
              >
                <InstagramIcon className="size-5 shrink-0" />
              </a>
              <a
                href="https://www.facebook.com/shopbuddychinasourcing/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="transition-colors hover:text-foreground"
              >
                <FacebookIcon className="size-5 shrink-0" />
              </a>
              <a
                href="https://x.com/shopbuddychina"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="X"
                className="transition-colors hover:text-foreground"
              >
                <XIcon className="size-4.5 shrink-0" />
              </a>
            </div>
          </div>
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

const TiktokIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
  </svg>
)

const YoutubeIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
    <polygon points="10 15 15 12 10 9" />
  </svg>
)

const InstagramIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
)

const FacebookIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
)

const XIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
)

const WhatsappIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M12.012 2c-5.506 0-9.989 4.478-9.99 9.984a9.96 9.96 0 0 0 1.333 4.993L2 22l5.13-1.347a9.96 9.96 0 0 0 4.88 1.277h.005c5.505 0 9.99-4.478 9.99-9.985C22.007 6.478 17.521 2 12.012 2zm5.72 14.158c-.235.662-1.362 1.258-1.9 1.314-.49.052-.973.24-3.136-.612-2.766-1.096-4.537-3.93-4.675-4.114-.136-.18-.1.43-.1-1.2 0-1.237.643-1.84.878-2.083.235-.243.52-.303.695-.303.175 0 .35.004.5.013.16.008.373-.06.583.45.215.52.736 1.793.8 1.93.063.136.105.295.012.482-.09.186-.137.303-.272.46-.135.16-.285.356-.41.478-.138.135-.282.28-.12.56.16.28.71 1.17 1.523 1.895.696.62 1.282.81 1.464.9.18.09.288.077.395-.047.108-.124.463-.538.587-.723.125-.185.25-.154.422-.09.173.063 1.096.516 1.284.61.187.093.312.14.358.218.046.077.046.45-.19 1.112z" />
  </svg>
)
