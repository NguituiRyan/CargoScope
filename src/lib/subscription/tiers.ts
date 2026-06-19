/**
 * Subscription tiers + feature gating. Pure config — safe to import from server
 * or client. Tier changes are admin-only (enforced by RLS); paid upgrades flow
 * through Paddle checkout, and the Paddle webhook sets the tier on success.
 */
export type SubscriptionTier = "none" | "basic" | "verified" | "premium"

export interface TierLimits {
  /** Max active product listings (Infinity = unlimited). */
  maxListings: number
  /** May submit quotes on buyer RFQs. */
  canQuoteRfq: boolean
  /** Eligible for featured placement on the home/category rails. */
  featured: boolean
  /** Catalog ranking boost (higher surfaces first). */
  searchBoost: number
}

export const TIER_LIMITS: Record<SubscriptionTier, TierLimits> = {
  none: { maxListings: 3, canQuoteRfq: false, featured: false, searchBoost: 0 },
  basic: { maxListings: 20, canQuoteRfq: false, featured: false, searchBoost: 0 },
  verified: {
    maxListings: 50,
    canQuoteRfq: true,
    featured: false,
    searchBoost: 1,
  },
  premium: {
    maxListings: 100,
    canQuoteRfq: true,
    featured: true,
    searchBoost: 2,
  },
}

export function tierLimits(tier: string | null | undefined): TierLimits {
  return TIER_LIMITS[(tier as SubscriptionTier) || "none"] ?? TIER_LIMITS.none
}

/** Paid tiers shown on the pricing page, cheapest → most expensive. */
export const PRICING_TIERS: {
  tier: Exclude<SubscriptionTier, "none">
  monthlyUsd: number
  recommended: boolean
}[] = [
  { tier: "basic", monthlyUsd: 0, recommended: false },
  { tier: "verified", monthlyUsd: 99, recommended: true },
  { tier: "premium", monthlyUsd: 299, recommended: false },
]
