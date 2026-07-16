import Link from "next/link"

import { LogoMark } from "@/components/brand/logo-mark"
import "./globals.css"

/**
 * Root not-found — catches paths that fall outside the [locale] tree (e.g. an
 * unknown top-level URL, where the locale layout's notFound() bubbles to here).
 * Self-contained html/body because there is no root layout above it. In-locale
 * notFound() calls still render the localised, header-wrapped [locale]/not-found.
 */
export default function GlobalNotFound() {
  return (
    <html lang="en">
      <body className="bg-background text-foreground antialiased">
        <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
          <Link
            href="/"
            className="flex items-center gap-2 text-lg font-semibold tracking-tight"
          >
            <LogoMark className="size-7 shrink-0 text-primary" />
            Shopbuddy
          </Link>
          <p className="text-5xl font-bold text-muted-foreground">404</p>
          <h1 className="text-2xl font-semibold">Page not found</h1>
          <p className="text-muted-foreground">
            The page you are looking for does not exist or has moved.
          </p>
          <Link
            href="/"
            className="mt-2 inline-flex h-11 items-center justify-center rounded-lg bg-primary px-6 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Back to home
          </Link>
        </main>
      </body>
    </html>
  )
}
