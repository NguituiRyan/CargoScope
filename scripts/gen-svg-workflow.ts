/**
 * Throwaway: emit a self-contained SVG-generation workflow (scripts/svg-workflow.mjs)
 * with the product jobs + shared style spec embedded, so the SVGs come out cohesive.
 *   node scripts/gen-svg-workflow.ts
 * Then: Workflow({ scriptPath: ".../scripts/svg-workflow.mjs" })
 */
import { readFileSync, writeFileSync } from "node:fs"

const jobs = JSON.parse(readFileSync("scripts/svg-jobs.json", "utf8"))

const REFERENCE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" role="img" aria-label="reference">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#eef2ff"/><stop offset="1" stop-color="#e0e7ff"/></linearGradient>
    <linearGradient id="body" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6366f1"/><stop offset="1" stop-color="#4338ca"/></linearGradient>
    <linearGradient id="sheen" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffffff" stop-opacity="0.5"/><stop offset="0.55" stop-color="#ffffff" stop-opacity="0"/></linearGradient>
  </defs>
  <rect width="400" height="400" rx="28" fill="url(#bg)"/>
  <circle cx="322" cy="80" r="48" fill="#6366f1" opacity="0.10"/>
  <circle cx="76" cy="118" r="26" fill="#6366f1" opacity="0.08"/>
  <ellipse cx="200" cy="326" rx="94" ry="16" fill="#1e1b4b" opacity="0.12"/>
  <g>
    <rect x="150" y="92" width="100" height="212" rx="22" fill="url(#body)"/>
    <rect x="150" y="92" width="42" height="212" rx="22" fill="url(#sheen)"/>
    <rect x="166" y="116" width="68" height="42" rx="9" fill="#1e1b4b" opacity="0.55"/>
    <g fill="#a5b4fc"><circle cx="178" cy="192" r="5"/><circle cx="194" cy="192" r="5"/><circle cx="210" cy="192" r="5"/></g>
  </g>
</svg>`

const SPEC = `You are an expert SVG illustrator creating product artwork for a premium B2B e-commerce catalog (Shop Buddy). Produce ONE self-contained SVG illustration of the given product.

HARD RULES (a violation makes the output unusable):
- Root: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" role="img" aria-label="PRODUCT NAME">. Do NOT set width/height.
- Only vector primitives (rect, circle, ellipse, path, polygon, line, g, text) plus a <defs> with linearGradient/radialGradient. NO <image>, <foreignObject>, <script>, <style>, <filter>, external URLs, or base64 data.
- Composition MUST match the REFERENCE structure: (1) a rounded background rect rx=28 filled with a vertical gradient using the two BACKGROUND colors; (2) exactly two faint decorative circles in the ACCENT color at 0.08-0.12 opacity (top-right large, left small); (3) a soft floor shadow ellipse near cx=200 cy=326 in the DEEP color at ~0.12 opacity; (4) the product centered within x:110-290, y:85-305, built from a BODY gradient (BODY -> BODY_DARK) with at least one white "sheen" highlight overlay and finer details in the LIGHT and DEEP colors.
- Intricate but clean and modern: roughly 10-22 shapes, real depth via gradients, crisp geometry. Not flat, not childish. Minimal or no text.
- Clearly recognizable as the SPECIFIC product described. Well-formed XML: every tag closed, gradient ids referenced correctly.

REFERENCE (match this exact style; change only the product motif and substitute the palette):
${REFERENCE}

Return ONLY the raw SVG markup, nothing else.`

const PALETTES = {
  electronics: { bg: "#eef2ff -> #e0e7ff", body: "#6366f1", bodyDark: "#4338ca", deep: "#1e1b4b", accent: "#6366f1", light: "#c7d2fe" },
  home: { bg: "#ecfdf5 -> #d1fae5", body: "#10b981", bodyDark: "#047857", deep: "#064e3b", accent: "#10b981", light: "#a7f3d0" },
  apparel: { bg: "#fff7ed -> #ffedd5", body: "#f59e0b", bodyDark: "#b45309", deep: "#7c2d12", accent: "#f59e0b", light: "#fde68a" },
  beauty: { bg: "#fdf2f8 -> #fce7f3", body: "#ec4899", bodyDark: "#be185d", deep: "#831843", accent: "#ec4899", light: "#fbcfe8" },
  industrial: { bg: "#f8fafc -> #e2e8f0", body: "#64748b", bodyDark: "#334155", deep: "#0f172a", accent: "#f59e0b", light: "#cbd5e1" },
  packaging: { bg: "#faf6ef -> #efe6d8", body: "#b08968", bodyDark: "#7f5539", deep: "#3a2614", accent: "#d4a373", light: "#e7d3bd" },
}

const PAL_BY_CAT = {
  electronics: "electronics",
  "home-kitchen": "home",
  apparel: "apparel",
  beauty: "beauty",
  industrial: "industrial",
  packaging: "packaging",
}

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    slug: { type: "string" },
    svg: { type: "string", description: "complete self-contained SVG, starting with <svg and ending with </svg>" },
  },
  required: ["slug", "svg"],
}

const body = [
  `export const meta = {\n  name: 'product-svgs-bulk',\n  description: 'Generate cohesive intricate product SVGs for the expanded Shop Buddy catalog',\n  phases: [{ title: 'Generate', detail: 'one agent per product' }],\n}`,
  `const JOBS = ${JSON.stringify(jobs)}`,
  `const SPEC = ${JSON.stringify(SPEC)}`,
  `const PALETTES = ${JSON.stringify(PALETTES)}`,
  `const PAL_BY_CAT = ${JSON.stringify(PAL_BY_CAT)}`,
  `const SCHEMA = ${JSON.stringify(SCHEMA)}`,
  `phase('Generate')`,
  `const results = await parallel(JOBS.map((j) => () => {\n  const pal = PALETTES[PAL_BY_CAT[j.cat] || 'electronics']\n  const prompt = SPEC + '\\n\\nPRODUCT: ' + j.title + '\\nMOTIF: ' + j.motif + '\\nSLUG: ' + j.slug + '\\nPALETTE - BACKGROUND ' + pal.bg + '; BODY ' + pal.body + '; BODY_DARK ' + pal.bodyDark + '; DEEP ' + pal.deep + '; ACCENT ' + pal.accent + '; LIGHT ' + pal.light + '.'\n  return agent(prompt, { label: 'svg:' + j.slug, phase: 'Generate', schema: SCHEMA }).then((r) => (r ? { slug: j.slug, svg: r.svg } : null))\n}))`,
  `const ok = results.filter(Boolean).filter((r) => typeof r.svg === 'string' && r.svg.trim().startsWith('<svg') && r.svg.includes('viewBox'))`,
  `log('generated ' + ok.length + '/' + JOBS.length + ' svgs')`,
  `return ok`,
].join("\n\n")

writeFileSync("scripts/svg-workflow.mjs", body, "utf8")
console.log(`wrote scripts/svg-workflow.mjs for ${jobs.length} jobs`)
