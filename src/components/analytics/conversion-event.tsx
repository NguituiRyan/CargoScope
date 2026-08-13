"use client"

import { useEffect } from "react"
import { trackBusinessEvent } from "@/lib/analytics/client"

export function ConversionEvent({ event, metadata = {} }: { event: string; metadata?: Record<string, string | number | boolean> }) {
  useEffect(() => trackBusinessEvent(event, metadata), [event, metadata])
  return null
}
