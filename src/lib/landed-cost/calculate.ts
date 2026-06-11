/**
 * Indicative China→Kenya shipping estimates, following the freight partner's
 * approved model:
 *
 * - CONSOLIDATED ("non-declared") groupage — the business default — is one
 *   flat all-in rate: per kg by air, per CBM by sea. Customs clearance is
 *   handled by the consolidator, so there is no separate duty/VAT itemisation.
 * - DECLARED shipments (air, or sea FCL/LCL) are costed per customs entry
 *   (KEBS, duty, VAT, excise, RDL, freight, port handling, clearance) and are
 *   quoted after inquiry — never estimated up front. Mirrors Alibaba: full
 *   shipping costing happens in conversation with the supplier.
 *
 * The two rates below are indicative consolidation figures (June 2026,
 * cross-checked against market rates). Update them here when the freight
 * partner revises pricing — nothing else needs to change.
 */

export type ShippingMode = "air" | "sea"
export type ShippingChannel = "consolidated" | "declared"

/** All-in consolidated air rate, China → Nairobi (USD per kg). */
export const AIR_CONSOLIDATED_USD_PER_KG = 13
/** All-in consolidated sea rate, China → Nairobi (KES per CBM). */
export const SEA_CONSOLIDATED_KES_PER_CBM = 58_000

export const DEFAULT_UNIT_WEIGHT_KG = 0.5
export const DEFAULT_UNIT_VOLUME_CBM = 0.01

/** Unit price for a quantity given ascending price-break tiers (USD). */
export function unitPriceForQuantity(
  tiers: { minQty: number; unitPriceUsd: number }[],
  quantity: number
): number {
  if (tiers.length === 0) return 0
  const sorted = [...tiers].sort((a, b) => a.minQty - b.minQty)
  let price = sorted[0].unitPriceUsd
  for (const tier of sorted) {
    if (quantity >= tier.minQty) price = tier.unitPriceUsd
  }
  return price
}
