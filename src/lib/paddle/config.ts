import "server-only"

/**
 * Paddle (Merchant of Record) configuration. Maps our paid tiers to the price
 * IDs created in the Paddle catalogue, and back. Secrets stay server-side; the
 * client token + environment are read directly from NEXT_PUBLIC_* in the
 * checkout button.
 */

export type PaddleTier = "verified" | "premium"

export const PADDLE_PRICE_IDS: Record<PaddleTier, string | undefined> = {
  verified: process.env.PADDLE_PRICE_VERIFIED,
  premium: process.env.PADDLE_PRICE_PREMIUM,
}

const PRICE_TO_TIER = new Map<string, PaddleTier>()
for (const [tier, priceId] of Object.entries(PADDLE_PRICE_IDS)) {
  if (priceId) PRICE_TO_TIER.set(priceId, tier as PaddleTier)
}

/** The tier a subscribed price grants, or null if the price is unknown. */
export function tierForPriceId(priceId: string | undefined): PaddleTier | null {
  return priceId ? (PRICE_TO_TIER.get(priceId) ?? null) : null
}

export const paddleEnvironment: "sandbox" | "production" =
  process.env.NEXT_PUBLIC_PADDLE_ENV === "production" ? "production" : "sandbox"

/** True once the webhook + API credentials are present. */
export const paddleConfigured = Boolean(
  process.env.PADDLE_API_KEY && process.env.PADDLE_WEBHOOK_SECRET
)
