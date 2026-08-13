"use client"

import { track } from "@vercel/analytics"

type Metadata = Record<string, string | number | boolean | null | undefined>

function id(key: string): string {
  try {
    const current = window.localStorage.getItem(key)
    if (current) return current
    const next = crypto.randomUUID()
    window.localStorage.setItem(key, next)
    return next
  } catch {
    return crypto.randomUUID()
  }
}

export function getVisitorId(): string {
  return id("shopbuddy_visitor_id")
}

export function trackBusinessEvent(event: string, metadata: Metadata = {}): void {
  if (typeof window === "undefined") return
  track(event, metadata)
  const gtag = (window as typeof window & { gtag?: (...args: unknown[]) => void }).gtag
  gtag?.("event", event, metadata)
  void fetch("/api/analytics/event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    keepalive: true,
    body: JSON.stringify({
      event,
      metadata,
      visitorId: getVisitorId(),
      sessionId: id("shopbuddy_session_id"),
      path: window.location.pathname + window.location.search,
      referrer: document.referrer || null,
    }),
  }).catch(() => {})
}
