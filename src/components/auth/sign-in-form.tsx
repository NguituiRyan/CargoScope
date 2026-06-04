"use client"

import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { Loader2 } from "lucide-react"
import { useTranslations } from "next-intl"

import { signInAction, type AuthState } from "@/lib/auth/actions"
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

export function SignInForm({ locale }: { locale: string }) {
  const t = useTranslations("auth")
  const [state, formAction] = useActionState<AuthState, FormData>(
    signInAction,
    {}
  )

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

      <div className="flex flex-col gap-2">
        <Label htmlFor="password">{t("password")}</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <SubmitButton idle={t("signInCta")} busy={t("signingIn")} />
    </form>
  )
}
