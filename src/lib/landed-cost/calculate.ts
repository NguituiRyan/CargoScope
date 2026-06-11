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

/** Standard courier volumetric convention: 1 CBM is charged as ~167 kg. */
export const VOLUMETRIC_KG_PER_CBM = 167

/** Fallback per-unit weight when the supplier hasn't declared packaging. */
export const DEFAULT_UNIT_WEIGHT_KG = 0.5

/**
 * Per-unit packaging figures for shipping estimates. Supplier-declared values
 * win; a missing one is derived from the other via the volumetric convention;
 * with neither, standard courier-packaging defaults apply. Buyers never enter
 * these.
 */
export function packagingPerUnit(
  supplierWeightKg: number | null | undefined,
  supplierVolumeCbm: number | null | undefined
): { weightKg: number; volumeCbm: number; supplierDeclared: boolean } {
  const w =
    supplierWeightKg && supplierWeightKg > 0 ? supplierWeightKg : null
  const v =
    supplierVolumeCbm && supplierVolumeCbm > 0 ? supplierVolumeCbm : null
  if (w && v) return { weightKg: w, volumeCbm: v, supplierDeclared: true }
  if (w)
    return {
      weightKg: w,
      volumeCbm: w / VOLUMETRIC_KG_PER_CBM,
      supplierDeclared: true,
    }
  if (v)
    return {
      weightKg: v * VOLUMETRIC_KG_PER_CBM,
      volumeCbm: v,
      supplierDeclared: true,
    }
  return {
    weightKg: DEFAULT_UNIT_WEIGHT_KG,
    volumeCbm: DEFAULT_UNIT_WEIGHT_KG / VOLUMETRIC_KG_PER_CBM,
    supplierDeclared: false,
  }
}

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
