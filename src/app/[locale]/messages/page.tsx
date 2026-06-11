import type { Metadata } from "next"
import Image from "next/image"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { MessageSquare } from "lucide-react"

import { MessageTime } from "@/components/messaging/message-time"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Link } from "@/i18n/navigation"
import { requireUser } from "@/lib/auth/session"
import { listConversations } from "@/lib/messaging/queries"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("messages")
  return { title: t("title") }
}

function ConversationAvatar({
  name,
  logoUrl,
}: {
  name: string | null
  logoUrl: string | null
}) {
  if (logoUrl) {
    return (
      <span className="relative size-11 shrink-0 overflow-hidden rounded-full border border-border bg-muted">
        <Image src={logoUrl} alt="" fill unoptimized sizes="44px" className="object-cover" />
      </span>
    )
  }
  const initial = name?.trim().charAt(0).toUpperCase() || "?"
  return (
    <span className="grid size-11 shrink-0 place-items-center rounded-full border border-border bg-muted text-sm font-medium text-muted-foreground">
      {initial}
    </span>
  )
}

export default async function MessagesInboxPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  const user = await requireUser()
  const t = await getTranslations("messages")
  const conversations = await listConversations(user)

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
      <h1 className="font-heading text-2xl font-semibold tracking-tight">
        {t("title")}
      </h1>

      {conversations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <MessageSquare className="size-8 text-muted-foreground" aria-hidden />
            <p className="text-sm font-medium">{t("empty")}</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              {t("emptyHint")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent>
            <ul className="flex flex-col divide-y divide-border">
              {conversations.map((c) => {
                const name =
                  c.otherParty.name ??
                  (c.viewerIsManufacturer ? t("buyer") : t("supplier"))
                // Multi-line messages (e.g. structured inquiries) collapse into
                // a readable one-line preview instead of a run-on sentence.
                const preview = (
                  c.lastMessage ??
                  (c.productTitle
                    ? t("aboutProduct", { product: c.productTitle })
                    : "")
                ).replace(/\s*\n+\s*/g, " · ")
                return (
                  <li key={c.id}>
                    <Link
                      href={`/messages/${c.id}`}
                      className="flex items-center gap-3.5 py-4 transition-colors hover:bg-muted/40"
                    >
                      <ConversationAvatar name={name} logoUrl={c.otherParty.logoUrl} />
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate font-medium">{name}</p>
                          {c.lastMessageAt ? (
                            <MessageTime
                              iso={c.lastMessageAt}
                              className="shrink-0 text-xs text-muted-foreground"
                            />
                          ) : null}
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm text-muted-foreground">
                            {preview}
                          </p>
                          {c.unreadCount > 0 ? (
                            <Badge variant="default" className="shrink-0">
                              {c.unreadCount}
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
