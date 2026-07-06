import type { Metadata } from "next"
import { Be_Vietnam_Pro, Geist_Mono, Outfit } from "next/font/google"
import { notFound } from "next/navigation"
import { hasLocale, NextIntlClientProvider } from "next-intl"
import { setRequestLocale } from "next-intl/server"
import { Analytics } from "@vercel/analytics/next"

import { QueryProvider } from "@/components/query-provider"
import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"
import { routing } from "@/i18n/routing"
import { SITE_URL } from "@/lib/site"
import Script from "next/script"
import "../globals.css"

const sans = Be_Vietnam_Pro({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

// Display font for headings — geometric + bold, matching the brand kit.
const display = Outfit({
  variable: "--font-display",
  subsets: ["latin"],
})

const SITE_DESCRIPTION =
  "Trust-first B2B sourcing connecting verified Chinese manufacturers with African wholesale buyers."

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Shop Buddy",
    template: "%s · Shop Buddy",
  },
  description: SITE_DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: "Shop Buddy",
    title: "Shop Buddy",
    description: SITE_DESCRIPTION,
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "Shop Buddy",
    description: SITE_DESCRIPTION,
  },
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) {
    notFound()
  }
  setRequestLocale(locale)

  return (
    <html
      lang={locale}
      className={`${sans.variable} ${geistMono.variable} ${display.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-NXSP73BPZR"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-NXSP73BPZR');
          `}
        </Script>
      </head>
      <body className="flex min-h-full flex-col">
        <NextIntlClientProvider>
          <QueryProvider>
            <SiteHeader />
            <main className="flex flex-1 flex-col">{children}</main>
            <SiteFooter />
          </QueryProvider>
        </NextIntlClientProvider>
        <Analytics />
      </body>
    </html>
  )
}
