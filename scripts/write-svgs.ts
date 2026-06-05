/**
 * Throwaway: read an SVG workflow output (JSON {result:[{slug,svg}]}) and write
 * each SVG to public/products/<slug>.svg.
 *   node scripts/write-svgs.ts "<output.json>"
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs"

const path = process.argv[2]
if (!path) throw new Error("usage: node write-svgs.ts <output.json>")

const parsed = JSON.parse(readFileSync(path, "utf8"))
const items: { slug: string; svg: string }[] = Array.isArray(parsed)
  ? parsed
  : parsed.result

mkdirSync("public/products", { recursive: true })

let count = 0
for (const it of items) {
  let svg = String(it.svg).trim()
  svg = svg.replace(/^```(?:svg|xml|html)?/i, "").replace(/```$/, "").trim()
  if (svg.startsWith("&lt;")) {
    svg = svg
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, "&")
  }
  if (!svg.startsWith("<svg") || !svg.includes("</svg>")) {
    console.warn(`  ! SKIP invalid svg: ${it.slug}`)
    continue
  }
  writeFileSync(`public/products/${it.slug}.svg`, svg + "\n", "utf8")
  count++
}
console.log(`wrote ${count}/${items.length} SVGs to public/products/`)
