"use client"

import { useEffect, useRef } from "react"

import { markConversationReadAction } from "@/lib/messaging/actions"
import { useRouter } from "@/i18n/navigation"

/**
 * Marks the other party's messages read on mount, then refreshes server data so
 * the read receipts and the header unread badge update without a navigation.
 * Guarded by a ref so router.refresh() can't retrigger the effect.
 */
export function MarkConversationRead({
  conversationId,
}: {
  conversationId: string
}) {
  const router = useRouter()
  const handledFor = useRef<string | null>(null)

  useEffect(() => {
    if (handledFor.current === conversationId) return
    handledFor.current = conversationId

    let active = true
    void (async () => {
      await markConversationReadAction(conversationId)
      if (active) router.refresh()
    })()

    return () => {
      active = false
    }
  }, [conversationId, router])

  return null
}
