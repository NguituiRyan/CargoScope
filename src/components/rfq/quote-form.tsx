"use client"

import { useActionState, useEffect } from "react"
import { useFormStatus } from "react-dom"
import { Check, Loader2, Send } from "lucide-react"
import { useTranslations } from "next-intl"

import { submitQuoteAction, type RfqActionState } from "@/lib/rfq/actions"
import { useRouter } from "@/i18n/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

const CURRENCIES = ["USD", "KES", "CNY"] as const

export interface QuoteFormInitial {
  unitPrice: string
  currency: string
  moq: number | null
  leadTimeDays: number | null
  incoterm: string | null
  validUntil: string | null
  notes: string | null
}

function SubmitButton({ idle, busy }: { idle: string; busy: string }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending} className="h-10 self-start">
      {pending ? (
        <Loader2 className="size-4 animate-spin" aria-hidden />
      ) : (
        <Send className="size-4" aria-hidden />
      )}
      {pending ? busy : idle}
    </Button>
  )
}

export function QuoteForm({
  rfqId,
  initial,
}: {
  rfqId: string
  initial: QuoteFormInitial | null
}) {
  const t = useTranslations("rfq")
  const router = useRouter()
  const [state, formAction] = useActionState<RfqActionState, FormData>(
    submitQuoteAction,
    {}
  )

  useEffect(() => {
    if (state.ok) router.refresh()
  }, [state.ok, router])

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="rfqId" value={rfqId} />

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="unitPrice">{t("fUnitPrice")}</Label>
          <Input
            id="unitPrice"
            name="unitPrice"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            required
            defaultValue={initial?.unitPrice ?? ""}
            placeholder="5.50"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="currency">{t("fCurrency")}</Label>
          <Select
            id="currency"
            name="currency"
            defaultValue={initial?.currency ?? "USD"}
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="moq">{t("fMoq")}</Label>
          <Input
            id="moq"
            name="moq"
            type="number"
            inputMode="numeric"
            min={1}
            defaultValue={initial?.moq ?? ""}
            placeholder="500"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="leadTimeDays">{t("fLeadTime")}</Label>
          <Input
            id="leadTimeDays"
            name="leadTimeDays"
            type="number"
            inputMode="numeric"
            min={0}
            max={3650}
            defaultValue={initial?.leadTimeDays ?? ""}
            placeholder="25"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="incoterm">{t("fIncoterm")}</Label>
          <Input
            id="incoterm"
            name="incoterm"
            maxLength={24}
            defaultValue={initial?.incoterm ?? ""}
            placeholder="FOB Shenzhen"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="validUntil">{t("fValidUntil")}</Label>
          <Input
            id="validUntil"
            name="validUntil"
            type="date"
            defaultValue={initial?.validUntil ? initial.validUntil.slice(0, 10) : ""}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="notes">{t("fNotes")}</Label>
        <Textarea
          id="notes"
          name="notes"
          rows={3}
          maxLength={2000}
          defaultValue={initial?.notes ?? ""}
          placeholder={t("fNotesPlaceholder")}
        />
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
          {t("quoteSaved")}
        </p>
      ) : null}

      <SubmitButton
        idle={initial ? t("updateQuote") : t("submitQuote")}
        busy={t("submittingQuote")}
      />
    </form>
  )
}
