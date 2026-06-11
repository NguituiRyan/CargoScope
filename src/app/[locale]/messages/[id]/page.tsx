import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { ArrowLeft } from "lucide-react"

import { MarkConversationRead } from "@/components/messaging/mark-read"
import { MessageComposer } from "@/components/messaging/message-composer"
import { MessageThread } from "@/components/messaging/message-thread"
import { Link } from "@/i18n/navigation"
import { requireUser } from "@/lib/auth/session"
import { getConversationThread } from "@/lib/messaging/queries"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("messages")
  return { title: t("title") }
}

export default async function ConversationPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>
  searchParams: Promise<{ draft?: string | string[] }>
}) {
  const { locale, id } = await params
  setRequestLocale(locale)
  const sp = await searchParams
  const rawDraft = Array.isArray(sp.draft) ? sp.draft[0] : sp.draft
  const draft = (rawDraft ?? "").trim().slice(0, 1200)

  const user = await requireUser()
  const thread = await getConversationThread(id, user)
  if (!thread) notFound()

  const t = await getTranslations("messages")
  const otherName =
    thread.otherParty.name ??
    (thread.viewerIsManufacturer ? t("buyer") : t("supplier"))

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-8">
      <MarkConversationRead conversationId={thread.id} />

      <div className="flex flex-col gap-2">
        <Link
          href="/messages"
          className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          {t("backToInbox")}
        </Link>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="font-heading text-xl font-semibold tracking-tight">
            {otherName}
          </h1>
          {thread.productTitle ? (
            thread.productId ? (
              <Link
                href={`/products/${thread.productId}`}
                className="text-sm text-muted-foreground hover:text-foreground hover:underline"
              >
                {t("aboutProduct", { product: thread.productTitle })}
              </Link>
            ) : (
              <span className="text-sm text-muted-foreground">
                {t("aboutProduct", { product: thread.productTitle })}
              </span>
            )
          ) : null}
        </div>
      </div>

      <MessageThread messages={thread.messages} />

      <MessageComposer
        conversationId={thread.id}
        locale={locale}
        initialBody={draft || undefined}
      />
    </div>
  )
}
