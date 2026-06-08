/**
 * Display-currency helpers — pure and safe to import from client OR server.
 *
 * Catalogue prices are stored in USD; buyers browse in their own currency.
 * KES is the default because the primary audience is Kenyan wholesale buyers.
 * Conversion is for display only — the landed-cost calculator stays in KES.
 */

export const DISPLAY_CURRENCIES = ["KES", "USD", "CNY"] as const
export type DisplayCurrency = (typeof DISPLAY_CURRENCIES)[number]

/** KES first: the platform's primary market is Kenya. */
export const DEFAULT_CURRENCY: DisplayCurrency = "KES"

/** Cookie that persists the buyer's chosen display currency across the site. */
export const CURRENCY_COOKIE = "cs_currency"

export type DisplayRates = {
  /** Units of each currency per 1 USD (USD is always 1). */
  rates: Record<DisplayCurrency, number>
  /** ISO timestamp the rates are dated to. */
  datedAt: string
  /** "live" = fetched from the FX provider; "fallback" = configured constant. */
  source: "live" | "fallback"
}

export function isDisplayCurrency(value: unknown): value is DisplayCurrency {
  return value === "KES" || value === "USD" || value === "CNY"
}

const META: Record<DisplayCurrency, { symbol: string; decimals: number }> = {
  KES: { symbol: "KSh ", decimals: 0 },
  USD: { symbol: "$", decimals: 2 },
  CNY: { symbol: "¥", decimals: 2 },
}

/**
 * The numeric amount shown for a USD price in the given display currency,
 * rounded to that currency's displayed precision. Use this (not the raw
 * converted value) when deriving things like discount percentages, so the maths
 * stays consistent with the rounded prices the shopper actually sees.
 */
export function displayAmount(
  amountUsd: number,
  currency: DisplayCurrency,
  rates: DisplayRates["rates"]
): number {
  const factor = 10 ** META[currency].decimals
  return Math.round(amountUsd * (rates[currency] ?? 1) * factor) / factor
}

/** Convert a USD amount into the target currency and format it with its symbol. */
export function formatDisplayPrice(
  amountUsd: number,
  currency: DisplayCurrency,
  rates: DisplayRates["rates"]
): string {
  const meta = META[currency]
  const number = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: meta.decimals,
    maximumFractionDigits: meta.decimals,
  }).format(displayAmount(amountUsd, currency, rates))
  return `${meta.symbol}${number}`
}

/** Short label for the currency switcher (e.g. "KSh", "USD", "CNY"). */
export function currencyLabel(currency: DisplayCurrency): string {
  return { KES: "KSh", USD: "USD", CNY: "CNY" }[currency]
}

/**
 * Format a money amount in its own stored currency (no FX conversion) — used for
 * RFQ target prices and manufacturer quotes, which are quoted in a fixed
 * currency rather than the shopper's display currency.
 */
export function formatMoney(amount: number | string, currency: string): string {
  const n = typeof amount === "string" ? Number(amount) : amount
  if (!Number.isFinite(n)) return "—"
  const symbol =
    currency === "USD"
      ? "$"
      : currency === "CNY"
        ? "¥"
        : currency === "KES"
          ? "KSh "
          : `${currency} `
  const decimals = currency === "KES" ? 0 : 2
  const number = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n)
  return `${symbol}${number}`
}
