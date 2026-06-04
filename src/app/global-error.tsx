"use client"

import * as Sentry from "@sentry/nextjs"
import { useEffect } from "react"

import "./globals.css"

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string }
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
        <h1 className="text-lg font-semibold">Something went wrong</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          An unexpected error occurred. Please refresh the page and try again.
        </p>
      </body>
    </html>
  )
}
