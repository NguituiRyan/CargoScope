"use client"

import { useEffect } from "react"
import { usePathname, useSearchParams } from "next/navigation"

import { trackBusinessEvent } from "@/lib/analytics/client"

export function PageTracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  useEffect(() => {
    trackBusinessEvent("page_view", {
      path: `${pathname}${searchParams.size ? `?${searchParams.toString()}` : ""}`,
    })
  }, [pathname, searchParams])
  return null
}
