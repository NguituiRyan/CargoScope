import "server-only"

import type { DisplayRates } from "@/lib/currency/shared"

/**
 * Foreign-exchange rates from Open Exchange Rates (USD base).
 *
 * `getFxRate()` powers the landed-cost calculator (USD→KES); `getDisplayRates()`
 * powers catalogue price display (USD→KES/USD/CNY). Both share a single daily-
 * cached fetch, so we never hit the API per request. With no key (or on any API
 * failure) they fall back to configured constants so everything stays functional
 * in CI/preview/local dev.
 */

export type FxRate = {
  /** Units of KES per 1 USD. */
  rate: number
  /** ISO timestamp the rate is dated to. */
  datedAt: string
  /** "live" = fetched from the provider; "fallback" = configured constant. */
  source: "live" | "fallback"
}

const DAY_SECONDS = 86_400
const FX_TAG = "fx-usd"
const FALLBACK_USD_KES = 129
const FALLBACK_USD_CNY = 7.2

function positive(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0
}

function envRate(name: string, fallback: number): number {
  const parsed = Number(process.env[name])
  return positive(parsed) ? parsed : fallback
}

type OxrRates = { kes: number; cny: number; datedAt: string }

/**
 * A single Open Exchange Rates fetch, cached in Next's Data Cache for a day.
 * Keeping the provider behind this thin function lets us swap OXR for another
 * FX source later without touching the calculator or the public contracts.
 */
async function fetchOxr(): Promise<OxrRates> {
  const appId = process.env.OPENEXCHANGERATES_APP_ID
  if (!appId) throw new Error("OPENEXCHANGERATES_APP_ID is not set")

  // The free plan is locked to a USD base and rejects the `symbols` filter, so
  // we request the full latest set and read the currencies we need out of it.
  const url = `https://openexchangerates.org/api/latest.json?app_id=${encodeURIComponent(appId)}`
  const res = await fetch(url, { next: { revalidate: DAY_SECONDS, tags: [FX_TAG] } })
  if (!res.ok) throw new Error(`Open Exchange Rates responded ${res.status}`)

  const data = (await res.json()) as {
    timestamp?: number
    rates?: Record<string, number>
  }
  const kes = data.rates?.KES
  const cny = data.rates?.CNY
  if (!positive(kes) || !positive(cny)) {
    throw new Error("Open Exchange Rates returned no USD→KES/CNY rate")
  }

  const datedAt = data.timestamp
    ? new Date(data.timestamp * 1000).toISOString()
    : new Date().toISOString()
  return { kes, cny, datedAt }
}

/** USD→KES for the landed-cost calculator. */
export async function getFxRate(): Promise<FxRate> {
  if (process.env.OPENEXCHANGERATES_APP_ID) {
    try {
      const { kes, datedAt } = await fetchOxr()
      return { rate: kes, datedAt, source: "live" }
    } catch {
      // Degrade gracefully to the fallback constant below.
    }
  }
  return {
    rate: envRate("FX_FALLBACK_USD_KES", FALLBACK_USD_KES),
    datedAt: new Date().toISOString(),
    source: "fallback",
  }
}

/** USD→{KES,USD,CNY} for catalogue price display. */
export async function getDisplayRates(): Promise<DisplayRates> {
  if (process.env.OPENEXCHANGERATES_APP_ID) {
    try {
      const { kes, cny, datedAt } = await fetchOxr()
      return { rates: { USD: 1, KES: kes, CNY: cny }, datedAt, source: "live" }
    } catch {
      // Degrade gracefully to the fallback constants below.
    }
  }
  return {
    rates: {
      USD: 1,
      KES: envRate("FX_FALLBACK_USD_KES", FALLBACK_USD_KES),
      CNY: envRate("FX_FALLBACK_USD_CNY", FALLBACK_USD_CNY),
    },
    datedAt: new Date().toISOString(),
    source: "fallback",
  }
}
