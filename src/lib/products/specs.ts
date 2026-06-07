/**
 * Structured product specifications.
 *
 * Suppliers enter free-form attribute/value pairs (Material, Dimensions, Weight,
 * Packaging, Warranty, …) that are stored on `products.attributes.specs` (jsonb)
 * and rendered as a spec table on the product page — so buyers get the detail
 * they need without having to ask. This module is the single source of truth for
 * the shape + safe parsing, shared by the seller and public query layers.
 */

export interface ProductSpec {
  name: string
  value: string
}

/** Hard caps so a malformed/oversized attributes blob can't bloat a page. */
export const MAX_SPECS = 30
const MAX_SPEC_NAME = 60
const MAX_SPEC_VALUE = 300

/** Defensively read `attributes.specs` (unknown jsonb) into a clean spec list. */
export function parseSpecs(attributes: unknown): ProductSpec[] {
  if (!attributes || typeof attributes !== "object") return []
  const raw = (attributes as Record<string, unknown>).specs
  if (!Array.isArray(raw)) return []
  const specs: ProductSpec[] = []
  for (const item of raw) {
    if (!item || typeof item !== "object") continue
    const name = String((item as Record<string, unknown>).name ?? "")
      .trim()
      .slice(0, MAX_SPEC_NAME)
    const value = String((item as Record<string, unknown>).value ?? "")
      .trim()
      .slice(0, MAX_SPEC_VALUE)
    if (name && value) specs.push({ name, value })
    if (specs.length >= MAX_SPECS) break
  }
  return specs
}

/** Build a validated spec list from repeated specName/specValue form fields. */
export function parseSpecInputs(
  names: string[],
  values: string[]
): ProductSpec[] {
  const specs: ProductSpec[] = []
  for (let i = 0; i < Math.max(names.length, values.length); i++) {
    const name = (names[i] ?? "").trim().slice(0, MAX_SPEC_NAME)
    const value = (values[i] ?? "").trim().slice(0, MAX_SPEC_VALUE)
    if (name && value) specs.push({ name, value })
    if (specs.length >= MAX_SPECS) break
  }
  return specs
}
