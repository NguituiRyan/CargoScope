"use client"

import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { Check, Loader2 } from "lucide-react"
import { useTranslations } from "next-intl"

import {
  setManufacturerVerificationAction,
  type AdminActionState,
} from "@/lib/admin/actions"
import type { VerificationTier } from "@/lib/manufacturers/queries"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"

function SaveButton({ idle, busy }: { idle: string; busy: string }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending} className="h-10">
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

export function ManufacturerStatusForm({
  manufacturerId,
  status,
  isPublished,
}: {
  manufacturerId: string
  status: VerificationTier
  isPublished: boolean
}) {
  const t = useTranslations("admin")
  const tv = useTranslations("verification")
  const [state, formAction] = useActionState<AdminActionState, FormData>(
    setManufacturerVerificationAction,
    {}
  )

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="manufacturerId" value={manufacturerId} />

      <div className="flex flex-col gap-2">
        <Label htmlFor="status">{t("setTier")}</Label>
        <Select id="status" name="status" defaultValue={status}>
          <option value="pending">{tv("status.pending")}</option>
          <option value="identity">{tv("status.identity")}</option>
          <option value="verified">{tv("status.verified")}</option>
          <option value="premium">{tv("status.premium")}</option>
          <option value="rejected">{tv("status.rejected")}</option>
        </Select>
      </div>

      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          name="publish"
          defaultChecked={isPublished}
          className="size-4 rounded border-input accent-primary"
        />
        {t("publish")}
      </label>
      <p className="-mt-2 text-xs text-muted-foreground">{t("publishHint")}</p>

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
          {t("statusSaved")}
        </p>
      ) : null}

      <SaveButton idle={t("saveStatus")} busy={t("saving")} />
    </form>
  )
}
