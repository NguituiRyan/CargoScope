/**
 * Throwaway: turn the catalog-products workflow output into
 * src/lib/db/seed-extra-products.ts (typed ProductSeed[]) + scripts/svg-jobs.json
 * (slug/title/motif/cat for the SVG workflow).
 *   node scripts/process-products.ts "<workflow-output.json>"
 */
import { readFileSync, writeFileSync } from "node:fs"

const path = process.argv[2]
if (!path) throw new Error("usage: node process-products.ts <output.json>")

const parsed = JSON.parse(readFileSync(path, "utf8"))
const groups = Array.isArray(parsed) ? parsed : parsed.result

const seen = new Set<string>()
type Entry = Record<string, unknown>
const entries: Entry[] = []
const svgJobs: { slug: string; cat: string; title: string; motif: string }[] = []

for (const g of groups) {
  for (const p of g.products ?? []) {
    let slug = String(p.slug || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
    if (!slug || seen.has(slug)) slug = `${g.cat}-${slug || "item"}-${seen.size}`
    seen.add(slug)

    const tiers = (p.tiers ?? []).map((t: { minQty: number; unitPrice: string }) => [
      Number(t.minQty),
      String(t.unitPrice),
    ])
    const certs =
      Array.isArray(p.certifications) && p.certifications.length
        ? p.certifications.map(String)
        : undefined

    entries.push({
      mfr: g.mfr,
      cat: g.cat,
      title: String(p.title),
      desc: String(p.description ?? ""),
      moq: Number(p.moq) || 1,
      unit: String(p.unit || "piece"),
      lead: Number(p.leadTimeDays) || 15,
      hs: String(p.hsCode ?? ""),
      certs,
      customizable: Boolean(p.customizable),
      sample: p.samplePrice == null ? null : String(p.samplePrice),
      tiers,
      img: `/products/${slug}.svg`,
    })
    svgJobs.push({ slug, cat: g.cat, title: String(p.title), motif: String(p.motif ?? p.title) })
  }
}

// Emit JSON (read at runtime by the seed) so raw node needs no .ts resolution.
writeFileSync("src/lib/db/seed-extra-products.json", JSON.stringify(entries), "utf8")
writeFileSync("scripts/svg-jobs.json", JSON.stringify(svgJobs), "utf8")
console.log(`wrote ${entries.length} products to seed-extra-products.json + ${svgJobs.length} svg jobs`)
