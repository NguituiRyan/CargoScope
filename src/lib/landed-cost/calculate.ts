/**
 * Landed-cost model for goods imported from China into Kenya (Mombasa → Nairobi).
 *
 * This is a transparent ESTIMATE, not a customs quote: rates are simplified and
 * the real figures depend on KRA's HS classification, the current Finance Act,
 * and the buyer's clearing agent. The UI surfaces a disclaimer to match.
 *
 * Pure + framework-free so it runs identically on the server and in the client
 * calculator (only the USD→KES rate is fetched server-side and passed in).
 */

export type ShippingMode = "sea" | "air"

export const DEFAULT_UNIT_WEIGHT_KG = 0.5
export const DEFAULT_UNIT_VOLUME_CBM = 0.01

export const LANDED_COST_RATES = {
  /** KRA standard VAT (applied to CIF + duty + levies). */
  vat: 0.16,
  /** Import Declaration Fee — 2.5% of customs value (CIF). */
  idf: 0.025,
  /** Railway Development Levy — 1.5% of customs value (CIF). */
  rdl: 0.015,
  /** KEBS PVoC conformity fee — ~0.6% of FOB, clamped per consignment. */
  pvoc: { rate: 0.006, minUsd: 265, maxUsd: 2700 },
  /** Flat clearing agent + handling estimate. */
  clearingFlatUsd: 120,
  /** Freight: sea is charged per CBM (volume), air per kg (weight). */
  freight: {
    sea: { perCbmUsd: 90, minUsd: 60 },
    air: { perKgUsd: 6.5, minUsd: 90 },
  },
} as const

/**
 * EAC Common External Tariff bands (0 / 10 / 25%) keyed by HS chapter, the first
 * two digits of the HS code. Finished consumer goods default to 25%.
 */
const DUTY_BY_HS_CHAPTER: Record<string, number> = {
  "33": 0.25, // cosmetics & beauty
  "39": 0.25, // plastics & articles
  "48": 0.1, // paper / packaging
  "61": 0.25, // knitted apparel
  "62": 0.25, // woven apparel
  "70": 0.25, // glassware
  "73": 0.25, // iron & steel articles
  "82": 0.25, // tools & cutlery
  "84": 0.1, // machinery & mechanical appliances
  "85": 0.25, // electrical & electronic goods
  "94": 0.25, // furniture & lighting
}

const DEFAULT_DUTY_RATE = 0.25

export function dutyRateForHsCode(hsCode: string | null): number {
  if (!hsCode) return DEFAULT_DUTY_RATE
  const chapter = hsCode.replace(/[^0-9]/g, "").slice(0, 2)
  return DUTY_BY_HS_CHAPTER[chapter] ?? DEFAULT_DUTY_RATE
}

export type LandedCostInput = {
  unitPriceUsd: number
  quantity: number
  unitWeightKg: number
  unitVolumeCbm?: number
  shippingMode: ShippingMode
  hsCode: string | null
}

export type LandedCostBreakdown = {
  goodsUsd: number
  freightUsd: number
  dutyUsd: number
  dutyRate: number
  vatUsd: number
  pvocUsd: number
  clearingUsd: number
  totalUsd: number
  totalKes: number
  perUnitKes: number
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function calculateLandedCost(
  input: LandedCostInput,
  fxRate: number
): LandedCostBreakdown {
  const quantity = Math.max(0, input.quantity)
  const unitWeightKg = Math.max(0, input.unitWeightKg)
  const unitVolumeCbm = Math.max(
    0,
    input.unitVolumeCbm ?? DEFAULT_UNIT_VOLUME_CBM
  )

  const goodsUsd = input.unitPriceUsd * quantity

  // Sea freight scales with volume (per CBM); air with weight (per kg).
  const freight = LANDED_COST_RATES.freight
  let freightUsd = 0
  if (quantity > 0) {
    freightUsd =
      input.shippingMode === "sea"
        ? Math.max(
            freight.sea.minUsd,
            freight.sea.perCbmUsd * unitVolumeCbm * quantity
          )
        : Math.max(
            freight.air.minUsd,
            freight.air.perKgUsd * unitWeightKg * quantity
          )
  }

  // Customs value (Cost + Insurance + Freight); insurance is folded into freight.
  const cifUsd = goodsUsd + freightUsd

  const dutyRate = dutyRateForHsCode(input.hsCode)
  const dutyUsd = cifUsd * dutyRate

  const idfUsd = cifUsd * LANDED_COST_RATES.idf
  const rdlUsd = cifUsd * LANDED_COST_RATES.rdl

  // Kenyan import VAT base = CIF + duty + import levies.
  const vatUsd =
    (cifUsd + dutyUsd + idfUsd + rdlUsd) * LANDED_COST_RATES.vat

  const pvocUsd =
    goodsUsd > 0
      ? clamp(
          goodsUsd * LANDED_COST_RATES.pvoc.rate,
          LANDED_COST_RATES.pvoc.minUsd,
          LANDED_COST_RATES.pvoc.maxUsd
        )
      : 0

  const clearingUsd =
    quantity > 0 ? idfUsd + rdlUsd + LANDED_COST_RATES.clearingFlatUsd : 0

  const totalUsd =
    goodsUsd + freightUsd + dutyUsd + vatUsd + pvocUsd + clearingUsd
  const totalKes = totalUsd * fxRate
  const perUnitKes = quantity > 0 ? totalKes / quantity : 0

  return {
    goodsUsd,
    freightUsd,
    dutyUsd,
    dutyRate,
    vatUsd,
    pvocUsd,
    clearingUsd,
    totalUsd,
    totalKes,
    perUnitKes,
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
