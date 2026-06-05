"use client"

import { useLocale } from "next-intl"

/**
 * Locale-aware timestamp. Formatting runs with the browser's timezone, so the
 * SSR output (server tz) and the hydrated output (user tz) can differ — that is
 * expected here, hence suppressHydrationWarning on the rendered text.
 */
export function MessageTime({
  iso,
  withTime = false,
  className,
}: {
  iso: string
  withTime?: boolean
  className?: string
}) {
  const locale = useLocale()
  const options: Intl.DateTimeFormatOptions = withTime
    ? { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }
    : { month: "short", day: "numeric" }
  const label = new Intl.DateTimeFormat(locale, options).format(new Date(iso))

  return (
    <time dateTime={iso} className={className} suppressHydrationWarning>
      {label}
    </time>
  )
}
