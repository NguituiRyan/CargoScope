import { createAdminClient } from "@/lib/supabase/admin"

const ALLOWED = new Set([
  "page_view",
  "product_search",
  "image_search_started",
  "image_search_uploaded",
  "sourcing_started",
  "sourcing_request_submitted",
  "sourcing_payment_clicked",
  "sourcing_payment_success",
  "subscription_checkout_started",
  "subscription_purchase",
  "product_view",
  "contact_click",
  "whatsapp_click",
])

export async function POST(request: Request): Promise<Response> {
  const length = Number(request.headers.get("content-length") ?? 0)
  if (length > 12_000) return Response.json({ error: "Too large" }, { status: 413 })
  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 })
  }
  const event = typeof body.event === "string" ? body.event : ""
  if (!ALLOWED.has(event)) return Response.json({ error: "Invalid event" }, { status: 400 })
  const country =
    request.headers.get("x-vercel-ip-country") ||
    request.headers.get("cf-ipcountry") ||
    null
  const clean = (value: unknown, max: number) =>
    typeof value === "string" ? value.slice(0, max) : null
  const metadata =
    body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata)
      ? body.metadata
      : {}
  try {
    await createAdminClient().from("analytics_events").insert({
      event,
      visitor_id: clean(body.visitorId, 100),
      session_id: clean(body.sessionId, 100),
      path: clean(body.path, 1000),
      referrer: clean(body.referrer, 1000),
      country,
      metadata,
    })
  } catch {
    // Analytics must never interrupt the customer journey.
  }
  return Response.json({ ok: true })
}
