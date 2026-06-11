import { redirect } from "next/navigation"
import { setRequestLocale } from "next-intl/server"

import { getSessionUser, localePath } from "@/lib/auth/session"
import { getOrCreateConversation } from "@/lib/messaging/queries"

type SearchParams = Record<string, string | string[] | undefined>

function str(value: string | string[] | undefined): string | undefined {
  const s = Array.isArray(value) ? value[0] : value
  const trimmed = s?.trim()
  return trimmed ? trimmed : undefined
}

/**
 * Completes a "contact supplier" inquiry — typically after the buyer signs up.
 * A logged-out shopper who taps "Message supplier" is sent to sign-up with
 * `?next` pointing here; once authenticated we open (or reuse) the conversation
 * and drop them straight into the thread, so the inquiry is never lost.
 */
export default async function StartConversationPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<SearchParams>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  const sp = await searchParams
  const manufacturerId = str(sp.manufacturerId)
  const productId = str(sp.productId) ?? null
  const draft = (str(sp.draft) ?? "").slice(0, 1200)
  if (!manufacturerId) redirect(localePath(locale, "/products"))

  const user = await getSessionUser()
  if (!user) {
    const qs = new URLSearchParams({ manufacturerId })
    if (productId) qs.set("productId", productId)
    if (draft) qs.set("draft", draft)
    const next = localePath(locale, `/messages/start?${qs.toString()}`)
    redirect(localePath(locale, `/sign-up?next=${encodeURIComponent(next)}`))
  }

  const { conversationId, selfOwned } = await getOrCreateConversation(
    user.id,
    manufacturerId,
    productId
  )
  if (selfOwned) redirect(localePath(locale, "/messages"))
  redirect(
    localePath(
      locale,
      conversationId
        ? `/messages/${conversationId}${draft ? `?draft=${encodeURIComponent(draft)}` : ""}`
        : "/products"
    )
  )
}
