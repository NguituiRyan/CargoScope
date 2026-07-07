/**
 * Shop Buddy demo seed — populates a Supabase project with §13 prototype data:
 * categories, 4 verified manufacturers, ~16 active products (tiered pricing +
 * media), one buyer, one admin, and one open RFQ.
 *
 * Run AFTER applying migrations (0000_init.sql + 0001_security.sql):
 *   npm run db:seed      # node --env-file=.env.local src/lib/db/seed.ts
 *
 * Uses the SERVICE-ROLE key, which bypasses RLS — server-side only, never the
 * client. Idempotent: re-running upserts reference data and replaces the demo
 * manufacturers' products and the demo buyer's RFQs.
 */
import { readFileSync } from "node:fs"

import { createClient, type User } from "@supabase/supabase-js"

import type { ProductSeed } from "./seed-types"

// Auto-generated demo products (catalog-products workflow), read at runtime so
// the raw-node seed needs no TypeScript module resolution.
const extraProducts = JSON.parse(
  readFileSync(new URL("./seed-extra-products.json", import.meta.url), "utf8")
) as ProductSeed[]

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const password = process.env.SEED_PASSWORD ?? "CargoScope123!"

if (!url || !serviceKey) {
  throw new Error(
    "Seed requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local"
  )
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const PLACEHOLDER = "/img/product-placeholder.svg"

/**
 * Per-product illustration art (intricate SVGs under public/products/), keyed by
 * product title. Falls back to PLACEHOLDER for any unmapped product.
 */
const PRODUCT_IMAGE: Record<string, string> = {
  "10,000mAh Slim Power Bank": "/products/power-bank.svg",
  "True Wireless Earbuds (ENC)": "/products/wireless-earbuds.svg",
  "RGB LED Strip 5m Kit": "/products/led-strip.svg",
  "USB-C 100W Braided Cable": "/products/usbc-cable.svg",
  '1.83" Bluetooth Smart Watch': "/products/smart-watch.svg",
  "5-Piece Nonstick Cookware Set": "/products/cookware-set.svg",
  "Glass Food Container Set (10pc)": "/products/glass-containers.svg",
  "750ml Insulated Steel Bottle": "/products/insulated-bottle.svg",
  "Digital Kitchen Scale 5kg": "/products/kitchen-scale.svg",
  "180gsm Cotton Crew T-Shirt": "/products/crew-tshirt.svg",
  "Fleece Pullover Hoodie": "/products/fleece-hoodie.svg",
  "High-Waist Sports Leggings": "/products/sports-leggings.svg",
  "6-Panel Cotton Cap": "/products/cotton-cap.svg",
  "Matte Liquid Lipstick Set (6)": "/products/liquid-lipstick.svg",
  "Vitamin C Facial Serum 30ml": "/products/vitamin-c-serum.svg",
  "12-Piece Makeup Brush Set": "/products/makeup-brushes.svg",
}

function ok(error: { message: string } | null, ctx: string) {
  if (error) throw new Error(`${ctx}: ${error.message}`)
}

/** Create the auth user if missing, otherwise return the existing id. */
async function ensureUser(
  email: string,
  meta: Record<string, unknown>
): Promise<string> {
  const created = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: meta,
  })
  if (!created.error && created.data.user) return created.data.user.id

  const msg = created.error?.message ?? ""
  if (!/already|registered|exists/i.test(msg)) {
    throw new Error(`create user ${email}: ${msg}`)
  }

  // Already exists — locate it by paging through the user list.
  for (let page = 1; page <= 25; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 200,
    })
    ok(error, `listUsers ${email}`)
    const found = data.users.find(
      (u: User) => u.email?.toLowerCase() === email.toLowerCase()
    )
    if (found) return found.id
    if (data.users.length < 200) break
  }
  throw new Error(`could not create or find user ${email}`)
}

/* ─────────────────────────── seed data ─────────────────────────── */

const ADMIN_EMAIL = "admin@shopbuddy.africa"
const BUYER_EMAIL = "buyer@shopbuddy.africa"
const MFR_EMAIL = "manufacturer@shopbuddy.africa"

const categorySeed = [
  { slug: "electronics", en: "Consumer Electronics", sw: "Vifaa vya Kielektroniki", zh: "消费电子", icon: "smartphone", sort: 1 },
  { slug: "home-kitchen", en: "Home & Garden", sw: "Nyumba na Bustani", zh: "家居园艺", icon: "home", sort: 2 },
  { slug: "apparel", en: "Apparel & Accessories", sw: "Mavazi na Vifaa", zh: "服装服饰", icon: "shirt", sort: 3 },
  { slug: "beauty", en: "Beauty", sw: "Urembo", zh: "美容", icon: "sparkles", sort: 4 },
  { slug: "industrial", en: "Industrial Machinery", sw: "Mashine za Viwandani", zh: "工业机械", icon: "cog", sort: 5 },
  { slug: "packaging", en: "Packaging & Printing", sw: "Ufungaji na Uchapishaji", zh: "包装与印刷", icon: "package", sort: 6 },
  { slug: "sports-entertainment", en: "Sports & Entertainment", sw: "Michezo na Burudani", zh: "运动娱乐", icon: "trophy", sort: 7 },
  { slug: "jewelry-eyewear-watches", en: "Jewelry, Eyewear & Watches", sw: "Vito, Miwani na Saa", zh: "珠宝、眼镜和手表", icon: "gem", sort: 8 },
  { slug: "sportswear-outdoor-apparel", en: "Sportswear & Outdoor Apparel", sw: "Mavazi ya Michezo na Nje", zh: "运动服和户外服装", icon: "activity", sort: 9 },
  { slug: "shoes-accessories", en: "Shoes & Accessories", sw: "Viatu na Vifaa", zh: "鞋及配件", icon: "footprints", sort: 10 },
  { slug: "luggage-bags-cases", en: "Luggage, Bags & Cases", sw: "Mizigo, Mifuko na Kesi", zh: "行李箱、包和保护套", icon: "briefcase", sort: 11 },
  { slug: "parents-kids-toys", en: "Parents, Kids & Toys", sw: "Wazazi, Watoto na Vichezeo", zh: "母婴、玩具", icon: "smile", sort: 12 },
  { slug: "personal-care-home-care", en: "Personal Care & Home Care", sw: "Huduma Binafsi na Huduma ya Nyumbani", zh: "个人护理及家居护理", icon: "heart", sort: 13 },
  { slug: "health-medical", en: "Health & Medical", sw: "Afya na Matibabu", zh: "健康与医疗", icon: "stethoscope", sort: 14 },
  { slug: "gifts-crafts", en: "Gifts & Crafts", sw: "Zawadi na Ufundi", zh: "礼品与工艺品", icon: "gift", sort: 15 },
  { slug: "pet-supplies", en: "Pet Supplies", sw: "Vifaa vya Kipenzi", zh: "宠物用品", icon: "dog", sort: 16 },
  { slug: "school-office-supplies", en: "School & Office Supplies", sw: "Vifaa vya Shule na Ofisi", zh: "学校及办公用品", icon: "pencil", sort: 17 },
  { slug: "commercial-equipment-machinery", en: "Commercial Equipment & Machinery", sw: "Vifaa vya Kibiashara na Mashine", zh: "商用设备与机械", icon: "store", sort: 18 },
  { slug: "construction-building-machinery", en: "Construction & Building Machinery", sw: "Mashine za Ujenzi na Majengo", zh: "建筑与工程机械", icon: "hammer", sort: 19 },
  { slug: "construction-real-estate", en: "Construction & Real Estate", sw: "Ujenzi na Majengo", zh: "建筑与房地产", icon: "building", sort: 20 },
  { slug: "furniture", en: "Furniture", sw: "Samani", zh: "家具", icon: "bed", sort: 21 },
  { slug: "lights-lighting", en: "Lights & Lighting", sw: "Taa na Mwangaza", zh: "灯具与照明", icon: "lightbulb", sort: 22 },
  { slug: "home-appliances", en: "Home Appliances", sw: "Vifaa vya Nyumbani", zh: "家用电器", icon: "tv", sort: 23 },
  { slug: "automotive-supplies-tools", en: "Automotive Supplies & Tools", sw: "Vifaa vya Magari na Zana", zh: "汽车用品与工具", icon: "car", sort: 24 },
  { slug: "vehicle-parts-accessories", en: "Vehicle Parts & Accessories", sw: "Vipuri vya Magari na Vifaa", zh: "车辆零件与配件", icon: "wrench", sort: 25 },
  { slug: "tools-hardware", en: "Tools & Hardware", sw: "Zana na Vifaa vya Chuma", zh: "工具与五金", icon: "wrench", sort: 26 },
  { slug: "renewable-energy", en: "Renewable Energy", sw: "Nishati Mbadala", zh: "可再生能源", icon: "sun", sort: 27 },
  { slug: "electrical-equipment-supplies", en: "Electrical Equipment & Supplies", sw: "Vifaa vya Umeme", zh: "电气设备与用品", icon: "plug", sort: 28 },
  { slug: "safety-security", en: "Safety & Security", sw: "Usalama", zh: "安全与防护", icon: "shield", sort: 29 },
  { slug: "material-handling", en: "Material Handling", sw: "Ubebaji wa Vifaa", zh: "物料搬运", icon: "truck", sort: 30 },
  { slug: "testing-instrument-equipment", en: "Testing Instrument & Equipment", sw: "Vyombo na Vifaa vya Kupima", zh: "测试仪器与设备", icon: "gauge", sort: 31 },
  { slug: "power-transmission", en: "Power Transmission", sw: "Uhamishaji wa Nguvu", zh: "动力传输", icon: "activity", sort: 32 },
  { slug: "electronic-components", en: "Electronic Components", sw: "Vipengele vya Kielektroniki", zh: "电子元器件", icon: "cpu", sort: 33 },
  { slug: "vehicles-transportation", en: "Vehicles & Transportation", sw: "Magari na Usafiri", zh: "车辆与运输", icon: "bus", sort: 34 },
  { slug: "agriculture-food-beverage", en: "Agriculture, Food & Beverage", sw: "Kilimo, Chakula na Vinywaji", zh: "农业、食品与饮料", icon: "carrot", sort: 35 },
  { slug: "raw-materials", en: "Raw Materials", sw: "Malighafi", zh: "原材料", icon: "boxes", sort: 36 },
  { slug: "fabrication-services", en: "Fabrication Services", sw: "Huduma za Utengenezaji", zh: "加工制造服务", icon: "scissors", sort: 37 },
  { slug: "service", en: "Service", sw: "Huduma", zh: "handshake", sort: 38 }
]

interface ManufacturerSeed {
  slug: string
  company: string
  ownerEmail: string
  city: string
  vstatus: "identity" | "verified" | "premium"
  tier: "basic" | "verified" | "premium"
  year: number
  cats: string[]
  certs: string[]
  responseRate: number
  desc: string
}

const manufacturerSeed: ManufacturerSeed[] = [
  {
    slug: "shenzhen-brighttech",
    company: "Shenzhen BrightTech Electronics Co., Ltd",
    ownerEmail: MFR_EMAIL,
    city: "Shenzhen",
    vstatus: "verified",
    tier: "verified",
    year: 2009,
    cats: ["Electronics"],
    certs: ["CE", "RoHS", "ISO 9001", "FCC"],
    responseRate: 98,
    desc: "OEM/ODM consumer electronics — power banks, audio and wearables. In-house SMT lines and a dedicated export team serving East African distributors.",
  },
  {
    slug: "guangzhou-homestyle",
    company: "Guangzhou HomeStyle Houseware Co., Ltd",
    ownerEmail: "owner.homestyle@shopbuddy.africa",
    city: "Guangzhou",
    vstatus: "verified",
    tier: "verified",
    year: 2013,
    cats: ["Home & Kitchen"],
    certs: ["ISO 9001", "BSCI", "LFGB"],
    responseRate: 92,
    desc: "Kitchen and household goods manufacturer with strong cookware and food-storage lines. Experienced with FOB Guangzhou container consolidation.",
  },
  {
    slug: "yiwu-fashionline",
    company: "Yiwu FashionLine Garments Co., Ltd",
    ownerEmail: "owner.fashionline@shopbuddy.africa",
    city: "Yiwu",
    vstatus: "verified",
    tier: "verified",
    year: 2016,
    cats: ["Apparel & Textiles"],
    certs: ["OEKO-TEX", "BSCI"],
    responseRate: 89,
    desc: "Knitwear and casual apparel with custom printing and embroidery. Low MOQs and fast sampling for new private-label buyers.",
  },
  {
    slug: "foshan-pureglow",
    company: "Foshan PureGlow Cosmetics Co., Ltd",
    ownerEmail: "owner.pureglow@shopbuddy.africa",
    city: "Foshan",
    vstatus: "identity",
    tier: "basic",
    year: 2019,
    cats: ["Beauty & Personal Care"],
    certs: ["GMPC", "ISO 22716"],
    responseRate: 85,
    desc: "Color cosmetics and skincare contract manufacturer. Private-label formulations with compliant ingredient documentation.",
  },
  {
    slug: "qingdao-irontools",
    company: "Qingdao IronTools Industrial Co., Ltd",
    ownerEmail: "owner.irontools@shopbuddy.africa",
    city: "Qingdao",
    vstatus: "verified",
    tier: "verified",
    year: 2011,
    cats: ["Industrial & Tools"],
    certs: ["ISO 9001", "CE"],
    responseRate: 90,
    desc: "Hand tools, power-tool accessories and industrial hardware. Bulk export experience supplying East African hardware distributors.",
  },
  {
    slug: "shenzhen-packpro",
    company: "Shenzhen PackPro Packaging Co., Ltd",
    ownerEmail: "owner.packpro@shopbuddy.africa",
    city: "Shenzhen",
    vstatus: "verified",
    tier: "verified",
    year: 2015,
    cats: ["Packaging"],
    certs: ["ISO 9001", "FSC"],
    responseRate: 93,
    desc: "Custom packaging — corrugated boxes, mailers, bottles, labels and pouches. Low-MOQ printing for retail and e-commerce brands.",
  },
]

const productSeed: ProductSeed[] = [
  // Shenzhen BrightTech — electronics
  { mfr: "shenzhen-brighttech", cat: "electronics", title: "10,000mAh Slim Power Bank", desc: "Dual-output USB-A/USB-C power bank with LED capacity indicator and over-charge protection. Custom logo printing available.", moq: 100, unit: "piece", lead: 20, hs: "8507.60", certs: ["CE", "RoHS", "FCC"], sample: "9.00", tiers: [[100, "8.50"], [500, "7.20"], [1000, "6.40"]] },
  { mfr: "shenzhen-brighttech", cat: "electronics", title: "True Wireless Earbuds (ENC)", desc: "Bluetooth 5.3 TWS earbuds with environmental noise cancellation and a 24-hour charging case.", moq: 200, unit: "piece", lead: 25, hs: "8518.30", certs: ["CE", "RoHS"], sample: "7.50", tiers: [[200, "6.80"], [1000, "5.50"], [5000, "4.90"]] },
  { mfr: "shenzhen-brighttech", cat: "electronics", title: "RGB LED Strip 5m Kit", desc: "App- and remote-controlled 5050 RGB LED strip kit with adhesive backing and 12V adapter.", moq: 300, unit: "set", lead: 18, hs: "9405.40", certs: ["CE", "RoHS"], sample: "4.00", tiers: [[300, "3.20"], [1000, "2.60"], [3000, "2.10"]] },
  { mfr: "shenzhen-brighttech", cat: "electronics", title: "USB-C 100W Braided Cable", desc: "1.5m nylon-braided USB-C to USB-C cable rated 100W PD with E-marker chip.", moq: 500, unit: "piece", lead: 15, hs: "8544.42", customizable: true, sample: "1.50", tiers: [[500, "1.10"], [2000, "0.85"], [10000, "0.62"]] },
  { mfr: "shenzhen-brighttech", cat: "electronics", title: '1.83" Bluetooth Smart Watch', desc: "Fitness smart watch with heart-rate and SpO2 sensors, IP67 rating and Bluetooth calling.", moq: 100, unit: "piece", lead: 30, hs: "8517.62", certs: ["CE", "RoHS"], sample: "13.50", tiers: [[100, "12.50"], [500, "10.80"], [1000, "9.40"]] },

  // Guangzhou HomeStyle — home & kitchen
  { mfr: "guangzhou-homestyle", cat: "home-kitchen", title: "5-Piece Nonstick Cookware Set", desc: "Forged aluminium cookware set with granite-effect nonstick coating and bakelite handles.", moq: 50, unit: "set", lead: 28, hs: "7615.10", certs: ["LFGB"], sample: "19.00", tiers: [[50, "18.00"], [200, "15.50"], [500, "13.20"]] },
  { mfr: "guangzhou-homestyle", cat: "home-kitchen", title: "Glass Food Container Set (10pc)", desc: "Borosilicate glass meal-prep containers with leak-proof snap-lock lids; oven and freezer safe.", moq: 100, unit: "set", lead: 22, hs: "7013.49", certs: ["LFGB"], sample: "7.00", tiers: [[100, "6.40"], [500, "5.30"], [1000, "4.60"]] },
  { mfr: "guangzhou-homestyle", cat: "home-kitchen", title: "750ml Insulated Steel Bottle", desc: "Double-wall 304 stainless steel vacuum bottle keeping drinks cold 24h / hot 12h.", moq: 200, unit: "piece", lead: 20, hs: "9617.00", customizable: true, sample: "4.50", tiers: [[200, "3.90"], [1000, "3.10"], [5000, "2.55"]] },
  { mfr: "guangzhou-homestyle", cat: "home-kitchen", title: "Digital Kitchen Scale 5kg", desc: "Tempered-glass digital kitchen scale, 1g precision, tare function and auto-off.", moq: 100, unit: "piece", lead: 18, hs: "8423.81", certs: ["CE"], sample: "4.80", tiers: [[100, "4.20"], [500, "3.40"], [2000, "2.80"]] },

  // Yiwu FashionLine — apparel
  { mfr: "yiwu-fashionline", cat: "apparel", title: "180gsm Cotton Crew T-Shirt", desc: "Combed-cotton unisex crew tee, pre-shrunk. Custom screen print or embroidery available.", moq: 300, unit: "piece", lead: 21, hs: "6109.10", customizable: true, sample: "2.80", tiers: [[300, "2.30"], [1000, "1.90"], [5000, "1.55"]] },
  { mfr: "yiwu-fashionline", cat: "apparel", title: "Fleece Pullover Hoodie", desc: "320gsm brushed-fleece pullover hoodie with kangaroo pocket and drawcord hood.", moq: 200, unit: "piece", lead: 25, hs: "6110.30", customizable: true, sample: "6.80", tiers: [[200, "6.10"], [1000, "5.00"], [3000, "4.30"]] },
  { mfr: "yiwu-fashionline", cat: "apparel", title: "High-Waist Sports Leggings", desc: "Four-way-stretch squat-proof leggings with hidden waistband pocket.", moq: 200, unit: "piece", lead: 24, hs: "6104.63", sample: "4.20", tiers: [[200, "3.80"], [1000, "3.10"], [5000, "2.60"]] },
  { mfr: "yiwu-fashionline", cat: "apparel", title: "6-Panel Cotton Cap", desc: "Structured 6-panel baseball cap with adjustable metal buckle. Custom embroidery available.", moq: 300, unit: "piece", lead: 18, hs: "6505.00", customizable: true, sample: "1.80", tiers: [[300, "1.60"], [1000, "1.25"], [5000, "0.98"]] },

  // Foshan PureGlow — beauty
  { mfr: "foshan-pureglow", cat: "beauty", title: "Matte Liquid Lipstick Set (6)", desc: "Long-wear matte liquid lipstick set of 6 shades. Private-label packaging and shade selection.", moq: 100, unit: "set", lead: 26, hs: "3304.10", customizable: true, sample: "5.00", tiers: [[100, "4.50"], [500, "3.70"], [2000, "3.05"]] },
  { mfr: "foshan-pureglow", cat: "beauty", title: "Vitamin C Facial Serum 30ml", desc: "Brightening 15% vitamin C serum with hyaluronic acid in a dropper bottle. Custom label.", moq: 100, unit: "piece", lead: 30, hs: "3304.99", customizable: true, sample: "3.60", tiers: [[100, "3.20"], [500, "2.60"], [2000, "2.15"]] },
  { mfr: "foshan-pureglow", cat: "beauty", title: "12-Piece Makeup Brush Set", desc: "Synthetic-bristle makeup brush set with vegan PU pouch. Custom handle colour.", moq: 150, unit: "set", lead: 22, hs: "9603.30", sample: "5.80", tiers: [[150, "5.40"], [600, "4.40"], [2400, "3.60"]] },
]

// Append the auto-generated demo products to the curated set above.
productSeed.push(...extraProducts)

/* ─────────────────────────── run ─────────────────────────── */

async function main() {
  console.log("Seeding Shop Buddy demo data…")

  // 1) Accounts (auth.users) ------------------------------------------------
  const adminId = await ensureUser(ADMIN_EMAIL, { full_name: "Shop Buddy Admin" })
  const buyerOwnerId = await ensureUser(BUYER_EMAIL, { full_name: "Amani Wanjiru" })

  const mfrOwnerIdByEmail = new Map<string, string>()
  for (const m of manufacturerSeed) {
    if (!mfrOwnerIdByEmail.has(m.ownerEmail)) {
      const id = await ensureUser(m.ownerEmail, { full_name: `${m.company} (owner)` })
      mfrOwnerIdByEmail.set(m.ownerEmail, id)
    }
  }
  console.log("  ✓ accounts ready")

  // 2) Profiles (role assignment) -------------------------------------------
  const profileRows = [
    { id: adminId, role: "admin", full_name: "Shop Buddy Admin", locale: "en", country: "KE" },
    { id: buyerOwnerId, role: "buyer", full_name: "Amani Wanjiru", locale: "en", country: "KE" },
    ...[...mfrOwnerIdByEmail.entries()].map(([, id]) => ({
      id,
      role: "manufacturer",
      locale: "zh",
      country: "CN",
    })),
  ]
  ok(
    (await supabase.from("profiles").upsert(profileRows, { onConflict: "id" })).error,
    "profiles"
  )
  console.log("  ✓ profiles")

  // 3) Buyer ----------------------------------------------------------------
  const existingBuyer = await supabase
    .from("buyers")
    .select("id")
    .eq("owner_profile_id", buyerOwnerId)
    .maybeSingle()
  ok(existingBuyer.error, "buyer lookup")

  let buyerId = existingBuyer.data?.id as string | undefined
  if (!buyerId) {
    const inserted = await supabase
      .from("buyers")
      .insert({
        owner_profile_id: buyerOwnerId,
        company_name: "Mombasa Road Traders Ltd",
        country: "KE",
        city: "Nairobi",
        sector: "Wholesale & distribution",
      })
      .select("id")
      .single()
    ok(inserted.error, "buyer insert")
    if (!inserted.data) throw new Error("buyer insert returned no row")
    buyerId = inserted.data.id as string
  }
  console.log("  ✓ buyer")

  // 4) Categories -----------------------------------------------------------
  const categoryRows = categorySeed.map((c) => ({
    name_en: c.en,
    name_sw: c.sw,
    name_zh: c.zh,
    slug: c.slug,
    icon: c.icon,
    sort: c.sort,
  }))
  const cats = await supabase
    .from("categories")
    .upsert(categoryRows, { onConflict: "slug" })
    .select("id,slug")
  ok(cats.error, "categories")
  const catIdBySlug = new Map<string, string>(
    (cats.data ?? []).map((c: { id: string; slug: string }) => [c.slug, c.id])
  )
  console.log(`  ✓ categories (${catIdBySlug.size})`)

  // 5) Manufacturers --------------------------------------------------------
  const manufacturerRows = manufacturerSeed.map((m) => ({
    owner_profile_id: mfrOwnerIdByEmail.get(m.ownerEmail),
    company_name: m.company,
    slug: m.slug,
    country: "CN",
    city: m.city,
    description: m.desc,
    year_established: m.year,
    main_categories: m.cats,
    certifications: m.certs,
    verification_status: m.vstatus,
    subscription_tier: m.tier,
    response_rate: m.responseRate,
    member_since: new Date(m.year, 0, 1).toISOString(),
    is_published: true,
  }))
  const mfrs = await supabase
    .from("manufacturers")
    .upsert(manufacturerRows, { onConflict: "slug" })
    .select("id,slug")
  ok(mfrs.error, "manufacturers")
  const mfrIdBySlug = new Map<string, string>(
    (mfrs.data ?? []).map((m: { id: string; slug: string }) => [m.slug, m.id])
  )
  console.log(`  ✓ manufacturers (${mfrIdBySlug.size})`)

  // 6) Products (+ price tiers, media) — replace demo manufacturers' products
  const mfrIds = [...mfrIdBySlug.values()]
  ok(
    (await supabase.from("products").delete().in("manufacturer_id", mfrIds)).error,
    "clear products"
  )

  const productRows = productSeed.map((p) => ({
    manufacturer_id: mfrIdBySlug.get(p.mfr),
    category_id: catIdBySlug.get(p.cat),
    title: p.title,
    description: p.desc,
    moq: p.moq,
    unit: p.unit,
    lead_time_days: p.lead,
    hs_code: p.hs,
    origin_country: "CN",
    certifications: p.certs ?? null,
    customizable: p.customizable ?? false,
    sample_available: p.sample !== null,
    sample_price: p.sample,
    primary_image_url: p.img ?? PRODUCT_IMAGE[p.title] ?? PLACEHOLDER,
    status: "active",
  }))
  const products = await supabase
    .from("products")
    .insert(productRows)
    .select("id,title")
  ok(products.error, "products")
  const idByTitle = new Map<string, string>(
    (products.data ?? []).map((p: { id: string; title: string }) => [p.title, p.id])
  )
  console.log(`  ✓ products (${idByTitle.size})`)

  const tierRows = productSeed.flatMap((p) =>
    p.tiers.map(([minQty, unitPrice]) => ({
      product_id: idByTitle.get(p.title),
      min_qty: minQty,
      unit_price: unitPrice,
      currency: "USD",
    }))
  )
  ok((await supabase.from("product_price_tiers").insert(tierRows)).error, "price tiers")

  const mediaRows = productSeed.map((p) => ({
    product_id: idByTitle.get(p.title),
    type: "image",
    url: p.img ?? PRODUCT_IMAGE[p.title] ?? PLACEHOLDER,
    sort: 0,
  }))
  ok((await supabase.from("product_media").insert(mediaRows)).error, "product media")
  console.log(`  ✓ price tiers (${tierRows.length}) + media (${mediaRows.length})`)

  // 6b) Reviewer buyers + orders + reviews (social proof) -------------------
  const reviewerOwnerId = await ensureUser("reviewers@shopbuddy.africa", {
    full_name: "Shop Buddy Buyers",
  })
  ok(
    (
      await supabase.from("profiles").upsert(
        [
          {
            id: reviewerOwnerId,
            role: "buyer",
            full_name: "Shop Buddy Buyers",
            locale: "en",
            country: "KE",
          },
        ],
        { onConflict: "id" }
      )
    ).error,
    "reviewer profile"
  )

  // Idempotent reset: drop this owner's prior orders (cascades their reviews)
  // then their buyer rows before re-creating the review authors.
  const prior = await supabase
    .from("buyers")
    .select("id")
    .eq("owner_profile_id", reviewerOwnerId)
  const priorIds = (prior.data ?? []).map((b) => b.id as string)
  if (priorIds.length > 0) {
    await supabase.from("orders").delete().in("buyer_id", priorIds)
    await supabase.from("buyers").delete().in("id", priorIds)
  }

  const reviewerCompanies = [
    "Nairobi Wholesale Hub",
    "Mombasa Bulk Traders",
    "Kampala Imports Co.",
    "Dar es Salaam Distributors",
    "Kigali Retail Group",
    "Eldoret Supply Co.",
    "Kisumu Trade House",
    "Arusha Merchants Ltd",
  ]
  const reviewerInsert = await supabase
    .from("buyers")
    .insert(
      reviewerCompanies.map((c) => ({
        owner_profile_id: reviewerOwnerId,
        company_name: c,
        country: "KE",
        sector: "Wholesale & retail",
      }))
    )
    .select("id")
  ok(reviewerInsert.error, "reviewer buyers")
  const reviewerBuyerIds = (reviewerInsert.data ?? []).map((b) => b.id as string)

  const COMMENTS = [
    "Exactly as described. Solid quality for the price.",
    "Fast response and samples reached Nairobi within a week.",
    "Reordered twice now — consistent quality and on-time shipping to Mombasa.",
    "Good communication throughout; custom logo printing came out clean.",
    "Sturdy packaging — nothing damaged in transit to Kenya.",
    "Competitive FOB pricing and flexible MOQ. Will order again.",
    "Sample matched the bulk order. Recommended supplier.",
    "Lead time was as promised. Smooth first order.",
    "Great value at the higher tier — margins work for our shops.",
    "Responsive team, handled our customisation request without fuss.",
    "Solid build quality and consistent sizing across the batch.",
    "Shipping to Dar was quick and the export docs were in order.",
    "Have sourced here for two seasons now. Reliable.",
    "Clear specs and honest lead times — no surprises at the port.",
    "Bulk discount made this very profitable for resale.",
    "Product matches the photos and our customers are happy.",
    "Easy to work with for private-label orders.",
    "Good after-sales support when we had a question.",
    "Arrived ahead of schedule. Impressed.",
    "Quality control is clearly taken seriously here.",
    "Fair pricing and quick quotes through the platform.",
    "Met our certification requirements without issues.",
    "Decent quality; communication could be a touch faster.",
    "Repeat supplier for us — dependable and fair.",
  ]

  const orderByPair = new Map<string, string>()
  async function ensureOrder(rb: string, mfrId: string): Promise<string | null> {
    const key = `${rb}:${mfrId}`
    const cached = orderByPair.get(key)
    if (cached) return cached
    const { data } = await supabase
      .from("orders")
      .insert({ buyer_id: rb, manufacturer_id: mfrId, currency: "USD" })
      .select("id")
      .single()
    const id = (data?.id as string | undefined) ?? null
    if (id) orderByPair.set(key, id)
    return id
  }

  const reviewRows: {
    order_id: string
    buyer_id: string
    manufacturer_id: string
    product_id: string
    rating: number
    comment: string
  }[] = []
  for (const p of productSeed) {
    const productId = idByTitle.get(p.title)
    const mfrId = mfrIdBySlug.get(p.mfr)
    if (!productId || !mfrId) continue
    const n = 2 + Math.floor(Math.random() * 5) // 2–6 reviews
    for (let k = 0; k < n; k++) {
      const rb = reviewerBuyerIds[Math.floor(Math.random() * reviewerBuyerIds.length)]
      const orderId = await ensureOrder(rb, mfrId)
      if (!orderId) continue
      const rating = Math.random() < 0.68 ? 5 : Math.random() < 0.7 ? 4 : 3
      reviewRows.push({
        order_id: orderId,
        buyer_id: rb,
        manufacturer_id: mfrId,
        product_id: productId,
        rating,
        comment: COMMENTS[Math.floor(Math.random() * COMMENTS.length)],
      })
    }
  }
  ok((await supabase.from("reviews").insert(reviewRows)).error, "reviews")
  console.log(`  ✓ reviews (${reviewRows.length}) from ${reviewerBuyerIds.length} buyers`)

  // 7) One open RFQ from the buyer ------------------------------------------
  ok((await supabase.from("rfqs").delete().eq("buyer_id", buyerId)).error, "clear rfqs")
  const deadline = new Date()
  deadline.setDate(deadline.getDate() + 21)
  ok(
    (
      await supabase.from("rfqs").insert({
        buyer_id: buyerId,
        category_id: catIdBySlug.get("electronics"),
        title: "Branded 10,000mAh power banks — 5,000 units",
        description:
          "Seeking CE/RoHS-certified 10,000mAh power banks with custom logo printing and retail box. Please quote FOB Shenzhen and confirm sample lead time.",
        quantity: 5000,
        unit: "piece",
        target_unit_price: "5.80",
        currency: "USD",
        destination_country: "KE",
        destination_city: "Nairobi",
        deadline: deadline.toISOString(),
        status: "open",
      })
    ).error,
    "rfq"
  )
  console.log("  ✓ open RFQ")

  console.log("\nDone. Demo logins (password: %s):", password)
  console.log("  admin        %s", ADMIN_EMAIL)
  console.log("  manufacturer %s", MFR_EMAIL)
  console.log("  buyer        %s", BUYER_EMAIL)
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\nSeed failed:", err)
    process.exit(1)
  })
