"use client"

import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { Loader2, MailCheck } from "lucide-react"
import { useTranslations } from "next-intl"

import { requestPasswordResetAction, type AuthState } from "@/lib/auth/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

function SubmitButton({ idle, busy }: { idle: string; busy: string }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending} className="mt-2 h-10 w-full">
      {pending ? (
        <>
          <Loader2 className="animate-spin" aria-hidden />
          {busy}
        </>
      ) : (
        idle
      )}
    </Button>
  )
}

export function ForgotPasswordForm({ locale }: { locale: string }) {
  const t = useTranslations("auth")
  const [state, formAction] = useActionState<AuthState, FormData>(
    requestPasswordResetAction,
    {}
  )

  if (state.needsConfirmation) {
    return (
      <div
        role="status"
        className="flex flex-col items-center gap-3 py-4 text-center"
      >
        <span className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
          <MailCheck className="size-5" aria-hidden />
        </span>
        <p className="font-medium">{t("resetSentTitle")}</p>
        <p className="text-sm text-muted-foreground">{t("resetSentBody")}</p>
      </div>
    )
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="locale" value={locale} />
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">{t("email")}</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
        />
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <SubmitButton idle={t("sendResetLink")} busy={t("sending")} />
    </form>
  )
}
