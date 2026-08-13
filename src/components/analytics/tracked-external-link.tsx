"use client"

import { trackBusinessEvent } from "@/lib/analytics/client"

export function TrackedExternalLink({ event, metadata, children, ...props }: React.ComponentProps<"a"> & { event: string; metadata?: Record<string, string> }) {
  return <a {...props} onClick={(e) => { props.onClick?.(e); trackBusinessEvent(event, metadata) }}>{children}</a>
}
