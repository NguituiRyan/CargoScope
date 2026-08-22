import { and, gte, isNotNull } from "drizzle-orm"

import { sendWeeklyMetricsReport } from "@/lib/email"
import { db } from "@/lib/db"
import { analyticsEvents, sourcingRequests } from "@/lib/db/schema"

export const dynamic = "force-dynamic"
export const maxDuration = 60

function escape(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
}

function top(values: Array<string | null | undefined>, limit = 8): Array<[string, number]> {
  const counts = new Map<string, number>()
  values.filter(Boolean).forEach((value) => counts.set(value!, (counts.get(value!) ?? 0) + 1))
  return [...counts].sort((a, b) => b[1] - a[1]).slice(0, limit)
}

function list(items: Array<[string, number]>): string {
  return items.length ? `<ul>${items.map(([name, count]) => `<li>${escape(name)}: <strong>${count}</strong></li>`).join("")}</ul>` : "<p>No data this week.</p>"
}

export async function GET(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }
  const end = new Date()
  const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000)
  const [events, requests, paidRequests] = await Promise.all([
    db.select().from(analyticsEvents).where(gte(analyticsEvents.createdAt, start)).limit(100_000),
    db.select().from(sourcingRequests).where(gte(sourcingRequests.createdAt, start)),
    db.select().from(sourcingRequests).where(and(gte(sourcingRequests.paidAt, start), isNotNull(sourcingRequests.paidAt))),
  ])
  const count = (event: string) => events.filter((item) => item.event === event).length
  const visitors = new Set(events.map((item) => item.visitorId).filter(Boolean)).size
  const referrers = top(events.filter((e) => e.event === "page_view").map((event) => {
    if (!event.referrer) return "Direct / unknown"
    try { return new URL(event.referrer).hostname.replace(/^www\./, "") } catch { return event.referrer }
  }))
  const countries = top(events.filter((e) => e.event === "page_view").map((event) => event.country || "Unknown"))
  const productViews = top(events.filter((e) => e.event === "product_view").map((event) => String((event.metadata as Record<string, unknown> | null)?.productName ?? "Unknown product")))
  const html = `
    <p style="font-size:14px;color:#334155">Reporting period: <strong>${start.toISOString().slice(0, 10)}</strong> to <strong>${end.toISOString().slice(0, 10)}</strong></p>
    <table style="border-collapse:collapse;width:100%;font-size:14px"><tbody>
      ${[
        ["Visitors", visitors], ["Page views", count("page_view")], ["Product searches", count("product_search")],
        ["Image-search requests", count("image_search_uploaded")], ["Sourcing requests", requests.length],
        ["Verified sourcing payments", paidRequests.length], ["Subscription purchases", count("subscription_purchase")],
        ["Contact clicks", count("contact_click")], ["WhatsApp clicks", count("whatsapp_click")],
      ].map(([label, value]) => `<tr><td style="padding:8px;border-bottom:1px solid #e2e8f0">${label}</td><td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:right"><strong>${value}</strong></td></tr>`).join("")}
    </tbody></table>
    <h2 style="font-size:16px;margin-top:24px">Top traffic sources</h2>${list(referrers)}
    <h2 style="font-size:16px;margin-top:24px">Visitor countries</h2>${list(countries)}
    <h2 style="font-size:16px;margin-top:24px">Most-viewed products</h2>${list(productViews)}
  `
  const sent = await sendWeeklyMetricsReport(`Shopbuddy weekly metrics — ${end.toISOString().slice(0, 10)}`, html)
  return Response.json({ ok: true, sent, start: start.toISOString(), end: end.toISOString() })
}
