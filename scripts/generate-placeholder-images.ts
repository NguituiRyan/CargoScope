/**
 * ONE-TIME demo helper — generates placeholder product photos for the SEED
 * products only and stores them in Supabase Storage. Run it MANUALLY:
 *
 *   npm run seed:images   # node --env-file=.env.local scripts/generate-placeholder-images.ts
 *
 * For each demo product it asks Gemini (gemini-2.5-flash-image, "Nano Banana")
 * for a 1024² studio photo, uploads it to the public `product-media` bucket,
 * and points the product's primary_image_url at the stored file. If a single
 * generation fails the product keeps the existing SVG placeholder, so the demo
 * never breaks. Requests are serialised with a delay to respect the free tier.
 *
 * DEMO PLACEHOLDERS ONLY. Real listings get real manufacturer uploads through
 * the product-creation flow — this script must never touch non-seed products,
 * and the image API is never called at request time (no page / server action).
 *
 * Uses the SERVICE-ROLE key (bypasses RLS): CLI / server-side only.
 */
import { createClient } from "@supabase/supabase-js"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const geminiKey = process.env.GEMINI_API_KEY

if (!url || !serviceKey) {
  throw new Error(
    "Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local"
  )
}
if (!geminiKey) {
  throw new Error("Requires GEMINI_API_KEY in .env.local")
}

const BUCKET = "product-media"
const PLACEHOLDER = "/img/product-placeholder.svg"
const GEMINI_MODEL = "gemini-2.5-flash-image"
const DELAY_MS = Number(process.env.SEED_IMAGE_DELAY_MS) || 6000

/** Only these demo manufacturers' products ever get generated images. */
const DEMO_MANUFACTURER_SLUGS = [
  "shenzhen-brighttech",
  "guangzhou-homestyle",
  "yiwu-fashionline",
  "foshan-pureglow",
]

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

type CategoryRef = { name_en: string | null }
type ProductRow = {
  id: string
  title: string
  manufacturer_id: string
  category: CategoryRef | CategoryRef[] | null
}

function categoryName(category: ProductRow["category"]): string | null {
  const row = Array.isArray(category) ? category[0] : category
  return row?.name_en ?? null
}

function buildPrompt(title: string, category: string | null): string {
  const cat = category ? ` in the ${category} category` : ""
  return (
    `Professional e-commerce product photo of ${title}${cat}: a single product ` +
    `centered on a plain seamless white background, soft even studio lighting, ` +
    `subtle natural shadow, sharp focus, photorealistic, square 1:1 framing. ` +
    `No text, no watermark, no logos, no people.`
  )
}

/** Ask Gemini for an image; returns the bytes + mime, or null on any failure. */
async function generateImage(
  prompt: string,
  attempt = 1
): Promise<{ buffer: Buffer; mime: string } | null> {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

  let res: Response
  try {
    res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": geminiKey as string,
      },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    })
  } catch (err) {
    console.warn(`    ! network error: ${(err as Error).message}`)
    return null
  }

  // Free-tier throttling — back off and retry a few times before giving up.
  if ((res.status === 429 || res.status === 503) && attempt <= 3) {
    const backoff = 15_000 * attempt
    console.warn(`    ! ${res.status} (rate limit), retrying in ${backoff / 1000}s…`)
    await sleep(backoff)
    return generateImage(prompt, attempt + 1)
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "")
    console.warn(`    ! Gemini ${res.status}: ${detail.slice(0, 180)}`)
    return null
  }

  const data = (await res.json()) as {
    candidates?: {
      content?: { parts?: { inlineData?: { data?: string; mimeType?: string } }[] }
    }[]
  }
  const parts = data.candidates?.[0]?.content?.parts ?? []
  const image = parts.find((p) => p.inlineData?.data)?.inlineData
  if (!image?.data) {
    console.warn("    ! no image in Gemini response")
    return null
  }
  return { buffer: Buffer.from(image.data, "base64"), mime: image.mimeType || "image/png" }
}

async function main() {
  console.log("Generating placeholder images for demo products…\n")

  // 1) Resolve the demo manufacturers.
  const mfrs = await supabase
    .from("manufacturers")
    .select("id,slug")
    .in("slug", DEMO_MANUFACTURER_SLUGS)
  if (mfrs.error) throw new Error(`manufacturers: ${mfrs.error.message}`)
  const mfrIds = (mfrs.data ?? []).map((m) => m.id as string)
  if (mfrIds.length === 0) {
    throw new Error("No demo manufacturers found — run `npm run db:seed` first.")
  }

  // 2) Their products (+ category name for the prompt).
  const products = await supabase
    .from("products")
    .select("id,title,manufacturer_id,category:categories(name_en)")
    .in("manufacturer_id", mfrIds)
    .order("title")
  if (products.error) throw new Error(`products: ${products.error.message}`)
  const rows = (products.data ?? []) as unknown as ProductRow[]
  console.log(`Found ${rows.length} demo products.\n`)

  let generated = 0
  let skipped = 0

  for (const [i, p] of rows.entries()) {
    const last = i === rows.length - 1
    console.log(`[${i + 1}/${rows.length}] ${p.title}`)

    const image = await generateImage(buildPrompt(p.title, categoryName(p.category)))
    if (!image) {
      console.log("    → keeping SVG placeholder\n")
      skipped++
      if (!last) await sleep(DELAY_MS)
      continue
    }

    const ext = image.mime.includes("jpeg") ? "jpg" : image.mime.includes("webp") ? "webp" : "png"
    const path = `${p.manufacturer_id}/${p.id}/seed.${ext}`

    const uploaded = await supabase.storage
      .from(BUCKET)
      .upload(path, image.buffer, { contentType: image.mime, upsert: true })
    if (uploaded.error) {
      console.warn(`    ! upload failed: ${uploaded.error.message} → keeping placeholder\n`)
      skipped++
      if (!last) await sleep(DELAY_MS)
      continue
    }

    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path)
    const publicUrl = `${pub.publicUrl}?v=${Date.now()}`

    const updated = await supabase
      .from("products")
      .update({ primary_image_url: publicUrl })
      .eq("id", p.id)
    if (updated.error) {
      console.warn(`    ! db update failed: ${updated.error.message}\n`)
      skipped++
      if (!last) await sleep(DELAY_MS)
      continue
    }

    // Keep the product's first gallery image (sort 0) in sync with the primary.
    await supabase
      .from("product_media")
      .update({ url: publicUrl })
      .eq("product_id", p.id)
      .eq("sort", 0)

    console.log(`    ✓ ${path}\n`)
    generated++
    if (!last) await sleep(DELAY_MS)
  }

  console.log(`Done. ${generated} generated, ${skipped} kept the placeholder.`)
  if (skipped > 0) console.log(`(${PLACEHOLDER} remains for any that failed.)`)
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\nImage seed failed:", err)
    process.exit(1)
  })
