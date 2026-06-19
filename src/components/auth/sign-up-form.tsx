"use client"

import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { Loader2, MailCheck } from "lucide-react"
import { useTranslations } from "next-intl"

import { signUpAction, type AuthState } from "@/lib/auth/actions"
import { PasswordInput } from "@/components/auth/password-input"
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

const roleClasses =
  "flex cursor-pointer flex-col gap-1 rounded-lg border border-input bg-background p-3 text-sm transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50"

export function SignUpForm({
  locale,
  next,
}: {
  locale: string
  next?: string
}) {
  const t = useTranslations("auth")
  const [state, formAction] = useActionState<AuthState, FormData>(
    signUpAction,
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
        <p className="font-medium">{t("checkEmailTitle")}</p>
        <p className="text-sm text-muted-foreground">{t("checkEmailBody")}</p>
      </div>
    )
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="locale" value={locale} />
      {next ? <input type="hidden" name="next" value={next} /> : null}

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">{t("accountType")}</legend>
        <div className="grid grid-cols-2 gap-3">
          <label className={roleClasses}>
            <input
              type="radio"
              name="role"
              value="buyer"
              defaultChecked
              className="sr-only"
            />
            <span className="font-medium">{t("buyer")}</span>
            <span className="text-xs text-muted-foreground">{t("buyerHint")}</span>
          </label>
          <label className={roleClasses}>
            <input
              type="radio"
              name="role"
              value="manufacturer"
              className="sr-only"
            />
            <span className="font-medium">{t("supplier")}</span>
            <span className="text-xs text-muted-foreground">
              {t("supplierHint")}
            </span>
          </label>
        </div>
      </fieldset>

      <div className="flex flex-col gap-2">
        <Label htmlFor="fullName">{t("fullName")}</Label>
        <Input
          id="fullName"
          name="fullName"
          type="text"
          autoComplete="name"
          required
          maxLength={120}
        />
      </div>

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
        <PasswordInput
          id="password"
          name="password"
          autoComplete="new-password"
          required
          minLength={8}
        />
        <p className="text-xs text-muted-foreground">{t("passwordHint")}</p>
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <SubmitButton idle={t("signUpCta")} busy={t("creatingAccount")} />
    </form>
  )
}
