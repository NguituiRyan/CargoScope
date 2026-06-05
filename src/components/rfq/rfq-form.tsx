"use client"

import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { Loader2, Send } from "lucide-react"
import { useTranslations } from "next-intl"

import { createRfqAction, type RfqActionState } from "@/lib/rfq/actions"
import type { CategoryOption } from "@/lib/products/queries"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

const CURRENCIES = ["USD", "KES", "CNY"] as const

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

export function RfqForm({
  locale,
  categories,
}: {
  locale: string
  categories: CategoryOption[]
}) {
  const t = useTranslations("rfq")
  const [state, formAction] = useActionState<RfqActionState, FormData>(
    createRfqAction,
    {}
  )

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="locale" value={locale} />

      <div className="flex flex-col gap-2">
        <Label htmlFor="title">{t("fTitle")}</Label>
        <Input
          id="title"
          name="title"
          required
          minLength={3}
          maxLength={160}
          placeholder={t("fTitlePlaceholder")}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="description">{t("fDescription")}</Label>
        <Textarea
          id="description"
          name="description"
          rows={5}
          maxLength={4000}
          placeholder={t("fDescriptionPlaceholder")}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="categoryId">{t("fCategory")}</Label>
          <Select id="categoryId" name="categoryId" defaultValue="">
            <option value="">{t("fCategoryNone")}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="unit">{t("fUnit")}</Label>
          <Input id="unit" name="unit" maxLength={24} defaultValue="piece" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="quantity">{t("fQuantity")}</Label>
          <Input
            id="quantity"
            name="quantity"
            type="number"
            inputMode="numeric"
            min={1}
            placeholder="5000"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="targetUnitPrice">{t("fTargetPrice")}</Label>
          <Input
            id="targetUnitPrice"
            name="targetUnitPrice"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            placeholder="5.80"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="currency">{t("fCurrency")}</Label>
          <Select id="currency" name="currency" defaultValue="USD">
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="destinationCountry">{t("fDestinationCountry")}</Label>
          <Input
            id="destinationCountry"
            name="destinationCountry"
            maxLength={80}
            defaultValue="KE"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="destinationCity">{t("fDestinationCity")}</Label>
          <Input
            id="destinationCity"
            name="destinationCity"
            maxLength={120}
            placeholder="Nairobi"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="deadline">{t("fDeadline")}</Label>
          <Input id="deadline" name="deadline" type="date" />
        </div>
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <SubmitButton idle={t("createCta")} busy={t("posting")} />
    </form>
  )
}
