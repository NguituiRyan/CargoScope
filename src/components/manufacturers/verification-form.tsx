"use client"

import { useActionState, useEffect, useRef } from "react"
import { useFormStatus } from "react-dom"
import { Check, Loader2, Upload } from "lucide-react"
import { useTranslations } from "next-intl"

import {
  submitVerificationAction,
  type ManufacturerActionState,
} from "@/lib/manufacturers/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"

function SubmitButton({ idle, busy }: { idle: string; busy: string }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending} className="h-10">
      {pending ? (
        <>
          <Loader2 className="animate-spin" aria-hidden />
          {busy}
        </>
      ) : (
        <>
          <Upload className="size-4" aria-hidden />
          {idle}
        </>
      )}
    </Button>
  )
}

export function VerificationForm({ locale }: { locale: string }) {
  const t = useTranslations("seller")
  const tv = useTranslations("verification")
  const [state, formAction] = useActionState<ManufacturerActionState, FormData>(
    submitVerificationAction,
    {}
  )
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state.ok) formRef.current?.reset()
  }, [state.ok])

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="locale" value={locale} />

      <div className="flex flex-col gap-2">
        <Label htmlFor="type">{t("docType")}</Label>
        <Select id="type" name="type" defaultValue="business">
          <option value="business">{tv("type.business")}</option>
          <option value="identity">{tv("type.identity")}</option>
          <option value="inspection">{tv("type.inspection")}</option>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="documents">{t("documents")}</Label>
        <Input
          id="documents"
          name="documents"
          type="file"
          multiple
          required
          accept="image/jpeg,image/png,image/webp,application/pdf"
          className="h-auto py-2 file:mr-3 file:rounded-md file:bg-secondary file:px-2.5 file:py-1 file:text-secondary-foreground"
        />
        <p className="text-xs text-muted-foreground">{t("documentsHint")}</p>
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      {state.ok ? (
        <p
          role="status"
          className="flex items-center gap-1.5 text-sm text-verified-foreground"
        >
          <Check className="size-4" aria-hidden />
          {t("docsSubmitted")}
        </p>
      ) : null}

      <SubmitButton idle={t("submitDocs")} busy={t("uploading")} />
    </form>
  )
}
