import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { notFound } from "next/navigation"
import { hasLocale, NextIntlClientProvider } from "next-intl"
import { setRequestLocale } from "next-intl/server"
import { Analytics } from "@vercel/analytics/next"

import { QueryProvider } from "@/components/query-provider"
import { SiteHeader } from "@/components/site-header"
import { routing } from "@/i18n/routing"
import "../globals.css"

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: {
    default: "CargoScope",
    template: "%s · CargoScope",
  },
  description:
    "Trust-first B2B sourcing connecting verified Chinese manufacturers with African wholesale buyers.",
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        <NextIntlClientProvider>
          <QueryProvider>
            <SiteHeader />
            <main className="flex flex-1 flex-col">{children}</main>
          </QueryProvider>
        </NextIntlClientProvider>
        <Analytics />
      </body>
    </html>
  )
}
