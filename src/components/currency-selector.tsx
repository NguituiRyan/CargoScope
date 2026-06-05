"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import {
  CURRENCY_COOKIE,
  DISPLAY_CURRENCIES,
  currencyLabel,
  isDisplayCurrency,
  type DisplayCurrency,
} from "@/lib/currency/shared"

/**
 * Switches the catalogue display currency. The choice is stored in a cookie and
 * read server-side, so prices re-render in the new currency after router.refresh.
 */
export function CurrencySelector({
  current,
  label,
}: {
  current: DisplayCurrency
  label: string
}) {
  const router = useRouter()
  const [value, setValue] = useState<DisplayCurrency>(current)

  function onChange(next: string) {
    if (!isDisplayCurrency(next) || next === value) return
    setValue(next)
    document.cookie = `${CURRENCY_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`
    router.refresh()
  }

  return (
    <select
      aria-label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="rounded-md border border-input bg-background px-2 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
    >
      {DISPLAY_CURRENCIES.map((currency) => (
        <option key={currency} value={currency}>
          {currencyLabel(currency)}
        </option>
      ))}
    </select>
  )
}
