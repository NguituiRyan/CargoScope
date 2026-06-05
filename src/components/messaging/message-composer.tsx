"use client"

import { useActionState, useEffect, useRef } from "react"
import { useFormStatus } from "react-dom"
import { Loader2, Paperclip, Send } from "lucide-react"
import { useTranslations } from "next-intl"

import {
  sendMessageAction,
  type MessagingActionState,
} from "@/lib/messaging/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

function SendButton({ idle, busy }: { idle: string; busy: string }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin" aria-hidden />
          {busy}
        </>
      ) : (
        <>
          <Send className="size-4" aria-hidden />
          {idle}
        </>
      )}
    </Button>
  )
}

export function MessageComposer({
  conversationId,
  locale,
}: {
  conversationId: string
  locale: string
}) {
  const t = useTranslations("messages")
  const [state, formAction] = useActionState<MessagingActionState, FormData>(
    sendMessageAction,
    {}
  )
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state.ok) formRef.current?.reset()
  }, [state.ok])

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm"
    >
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="conversationId" value={conversationId} />

      <Textarea
        name="body"
        rows={3}
        maxLength={4000}
        placeholder={t("placeholder")}
        aria-label={t("placeholder")}
      />

      <div className="flex flex-col gap-1.5">
        <span className="inline-flex items-center gap-1.5 text-sm font-medium">
          <Paperclip className="size-4 text-muted-foreground" aria-hidden />
          {t("attachLabel")}
        </span>
        <Input
          type="file"
          name="attachments"
          multiple
          accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
          className="h-auto py-2 file:mr-3 file:rounded-md file:bg-secondary file:px-2.5 file:py-1 file:text-secondary-foreground"
        />
        <p className="text-xs text-muted-foreground">{t("attachHint")}</p>
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <div className="flex justify-end">
        <SendButton idle={t("send")} busy={t("sending")} />
      </div>
    </form>
  )
}
