"use client"

import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { Loader2 } from "lucide-react"
import { useTranslations } from "next-intl"

import { updatePasswordAction, type AuthState } from "@/lib/auth/actions"
import { PasswordInput } from "@/components/auth/password-input"
import { Button } from "@/components/ui/button"
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

export function ResetPasswordForm({ locale }: { locale: string }) {
  const t = useTranslations("auth")
  const [state, formAction] = useActionState<AuthState, FormData>(
    updatePasswordAction,
    {}
  )

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="locale" value={locale} />
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">{t("newPassword")}</Label>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="new-password"
          required
          minLength={8}
        />
        <p className="text-xs text-muted-foreground">{t("passwordHint")}</p>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="confirm">{t("confirmPassword")}</Label>
        <PasswordInput
          id="confirm"
          name="confirm"
          autoComplete="new-password"
          required
          minLength={8}
        />
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <SubmitButton idle={t("updatePassword")} busy={t("updating")} />
    </form>
  )
}
