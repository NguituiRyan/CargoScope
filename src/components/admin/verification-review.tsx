"use client"

import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { useTranslations } from "next-intl"

import {
  reviewVerificationAction,
  type AdminActionState,
} from "@/lib/admin/actions"
import { buttonVariants } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

function ReviewButtons() {
  const { pending } = useFormStatus()
  const t = useTranslations("admin")
  return (
    <div className="flex gap-2">
      <button
        type="submit"
        name="decision"
        value="approve"
        disabled={pending}
        className={cn(buttonVariants({ size: "sm" }))}
      >
        {t("approve")}
      </button>
      <button
        type="submit"
        name="decision"
        value="reject"
        disabled={pending}
        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
      >
        {t("reject")}
      </button>
    </div>
  )
}

export function VerificationReview({
  verificationId,
  manufacturerId,
}: {
  verificationId: string
  manufacturerId: string
}) {
  const t = useTranslations("admin")
  const [state, formAction] = useActionState<AdminActionState, FormData>(
    reviewVerificationAction,
    {}
  )

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="verificationId" value={verificationId} />
      <input type="hidden" name="manufacturerId" value={manufacturerId} />
      <Textarea
        name="notes"
        rows={2}
        placeholder={t("reviewNotesPlaceholder")}
        className="text-sm"
      />
      {state.error ? (
        <p role="alert" className="text-xs text-destructive">
          {state.error}
        </p>
      ) : null}
      <ReviewButtons />
    </form>
  )
}
