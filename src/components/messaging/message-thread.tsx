"use client"

import Image from "next/image"
import { useState } from "react"
import { FileText } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"

import type { ThreadAttachment, ThreadMessage } from "@/lib/messaging/queries"
import { cn } from "@/lib/utils"
import { MessageTime } from "@/components/messaging/message-time"

function Attachment({
  attachment,
  fallback,
}: {
  attachment: ThreadAttachment
  fallback: string
}) {
  const label = attachment.name || fallback
  const isImage = attachment.contentType.startsWith("image/")

  if (isImage && attachment.url) {
    return (
      <a
        href={attachment.url}
        target="_blank"
        rel="noreferrer"
        className="block w-fit overflow-hidden rounded-lg border border-border/60"
      >
        <Image
          src={attachment.url}
          alt={label}
          width={240}
          height={240}
          unoptimized
          className="h-auto max-h-60 w-auto object-contain"
        />
      </a>
    )
  }

  return (
    <a
      href={attachment.url ?? undefined}
      target="_blank"
      rel="noreferrer"
      className="inline-flex max-w-full items-center gap-2 rounded-lg border border-border/60 bg-background/70 px-3 py-2 text-xs text-foreground transition-colors hover:bg-background"
    >
      <FileText className="size-4 shrink-0" aria-hidden />
      <span className="truncate">{label}</span>
    </a>
  )
}

function MessageBubble({ message }: { message: ThreadMessage }) {
  const t = useTranslations("messages")
  const locale = useLocale()
  const [showOriginal, setShowOriginal] = useState(false)

  const translation = message.body ? message.bodyTranslated[locale] : undefined
  const canToggle =
    !!translation &&
    !!message.sourceLang &&
    message.sourceLang !== locale &&
    translation !== message.body

  const shownBody = canToggle && !showOriginal ? translation : message.body

  return (
    <div
      className={cn(
        "flex flex-col gap-1",
        message.isMine ? "items-end" : "items-start"
      )}
    >
      <div
        className={cn(
          "flex max-w-[85%] flex-col gap-2 rounded-2xl px-3.5 py-2 text-sm sm:max-w-[75%]",
          message.isMine
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground"
        )}
      >
        {shownBody ? (
          <p className="whitespace-pre-wrap break-words">{shownBody}</p>
        ) : null}
        {message.attachments.length > 0 ? (
          <div className="flex flex-col gap-2">
            {message.attachments.map((attachment, index) => (
              <Attachment
                key={index}
                attachment={attachment}
                fallback={t("attachmentFallback")}
              />
            ))}
          </div>
        ) : null}
      </div>

      <div className="flex items-center gap-2 px-1 text-[11px] text-muted-foreground">
        <MessageTime iso={message.createdAt} withTime />
        {canToggle ? (
          <>
            {!showOriginal ? <span>{t("translated")}</span> : null}
            <button
              type="button"
              onClick={() => setShowOriginal((value) => !value)}
              className="font-medium underline-offset-2 hover:underline"
            >
              {showOriginal ? t("showTranslation") : t("showOriginal")}
            </button>
          </>
        ) : null}
      </div>
    </div>
  )
}

export function MessageThread({ messages }: { messages: ThreadMessage[] }) {
  const t = useTranslations("messages")

  if (messages.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        {t("noMessages")}
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
    </div>
  )
}
