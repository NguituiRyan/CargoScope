import "server-only"

/**
 * USD→KES foreign-exchange rate for the landed-cost calculator.
 *
 * Live rate comes from Open Exchange Rates when OPENEXCHANGERATES_APP_ID is set;
 * the response is cached in Next's Data Cache for a day so we never hit the API
 * per request. With no key (or on any API failure) we fall back to a configured
 * constant so the calculator is fully functional in CI/preview/local dev.
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
const FX_TAG = "fx-usd-kes"
const FX_FALLBACK_DEFAULT = 129

function fallbackUsdKes(): number {
  const parsed = Number(process.env.FX_FALLBACK_USD_KES)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : FX_FALLBACK_DEFAULT
}

/**
 * A provider returns a raw USD→KES rate and the date it applies to. Keeping this
 * boundary thin lets us swap Open Exchange Rates for another FX source later
 * without touching the calculator or the public getFxRate() contract.
 */
type FxProvider = () => Promise<{ rate: number; datedAt: string }>

const openExchangeRates: FxProvider = async () => {
  const appId = process.env.OPENEXCHANGERATES_APP_ID
  if (!appId) throw new Error("OPENEXCHANGERATES_APP_ID is not set")

  // The free plan is locked to a USD base and rejects the `symbols` filter, so
  // we request the full latest set and read KES out of it.
  const url = `https://openexchangerates.org/api/latest.json?app_id=${encodeURIComponent(appId)}`
  const res = await fetch(url, {
    next: { revalidate: DAY_SECONDS, tags: [FX_TAG] },
  })
  if (!res.ok) {
    throw new Error(`Open Exchange Rates responded ${res.status}`)
  }

  const data = (await res.json()) as {
    timestamp?: number
    rates?: Record<string, number>
  }
  const rate = data.rates?.KES
  if (typeof rate !== "number" || !Number.isFinite(rate) || rate <= 0) {
    throw new Error("Open Exchange Rates returned no USD→KES rate")
  }

  const datedAt = data.timestamp
    ? new Date(data.timestamp * 1000).toISOString()
    : new Date().toISOString()
  return { rate, datedAt }
}

export async function getFxRate(): Promise<FxRate> {
  if (process.env.OPENEXCHANGERATES_APP_ID) {
    try {
      const { rate, datedAt } = await openExchangeRates()
      return { rate, datedAt, source: "live" }
    } catch {
      // Any provider error degrades gracefully to the fallback constant.
    }
  }
  return {
    rate: fallbackUsdKes(),
    datedAt: new Date().toISOString(),
    source: "fallback",
  }
}
