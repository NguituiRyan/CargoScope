"use client"

import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { Loader2, Send } from "lucide-react"
import { useTranslations } from "next-intl"

import {
  createRfqAction,
  updateRfqAction,
  type RfqActionState,
} from "@/lib/rfq/actions"
import { draftRfqDescriptionAction } from "@/lib/ai/actions"
import { ATTACHMENT_ACCEPT } from "@/lib/messaging/attachments"
import type { CategoryOption } from "@/lib/products/queries"
import type { RfqEditValues } from "@/lib/rfq/queries"
import { AiDraftButton } from "@/components/ai-draft-button"
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
  suppliers = [],
  rfq,
}: {
  locale: string
  categories: CategoryOption[]
  /** Verified suppliers offered in the optional invite picker (create only). */
  suppliers?: { id: string; name: string }[]
  /** When present the form edits this RFQ instead of creating a new one. */
  rfq?: RfqEditValues
}) {
  const t = useTranslations("rfq")
  const editing = Boolean(rfq)
  const [state, formAction] = useActionState<RfqActionState, FormData>(
    editing ? updateRfqAction : createRfqAction,
    {}
  )

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="locale" value={locale} />
      {rfq ? <input type="hidden" name="rfqId" value={rfq.id} /> : null}

      <div className="flex flex-col gap-2">
        <Label htmlFor="title">{t("fTitle")}</Label>
        <Input
          id="title"
          name="title"
          required
          minLength={3}
          maxLength={160}
          defaultValue={rfq?.title}
          placeholder={t("fTitlePlaceholder")}
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="description">{t("fDescription")}</Label>
          <AiDraftButton
            label={t("aiDraft")}
            errorLabel={t("aiDraftError")}
            onGenerate={() =>
              draftRfqDescriptionAction({
                title:
                  (document.getElementById("title") as HTMLInputElement | null)
                    ?.value ?? "",
                notes:
                  (
                    document.getElementById(
                      "description"
                    ) as HTMLTextAreaElement | null
                  )?.value ?? "",
              })
            }
            onResult={(text) => {
              const el = document.getElementById(
                "description"
              ) as HTMLTextAreaElement | null
              if (el) el.value = text
            }}
          />
        </div>
        <Textarea
          id="description"
          name="description"
          rows={5}
          maxLength={4000}
          defaultValue={rfq?.description ?? ""}
          placeholder={t("fDescriptionPlaceholder")}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="attachments">{t("fAttachments")}</Label>
        <Input
          id="attachments"
          type="file"
          name="attachments"
          multiple
          accept={ATTACHMENT_ACCEPT}
          className="h-auto py-2 file:mr-3 file:rounded-md file:bg-secondary file:px-2.5 file:py-1 file:text-secondary-foreground"
        />
        <p className="text-xs text-muted-foreground">{t("fAttachmentsHint")}</p>
      </div>

      {!editing && suppliers.length > 0 ? (
        <div className="flex flex-col gap-2">
          <Label>{t("fInvite")}</Label>
          <div className="flex max-h-44 flex-col gap-2 overflow-y-auto rounded-lg border border-border p-3">
            {suppliers.map((s) => (
              <label key={s.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="inviteSuppliers"
                  value={s.id}
                  className="size-4 shrink-0 accent-primary"
                />
                {s.name}
              </label>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">{t("fInviteHint")}</p>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="categoryId">{t("fCategory")}</Label>
          <Select
            id="categoryId"
            name="categoryId"
            defaultValue={rfq?.categoryId ?? ""}
          >
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
          <Input
            id="unit"
            name="unit"
            maxLength={24}
            defaultValue={rfq?.unit ?? "piece"}
          />
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
            defaultValue={rfq?.quantity ?? undefined}
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
            defaultValue={rfq?.targetUnitPrice ?? undefined}
            placeholder="5.80"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="currency">{t("fCurrency")}</Label>
          <Select id="currency" name="currency" defaultValue={rfq?.currency ?? "USD"}>
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
            defaultValue={rfq?.destinationCountry ?? "KE"}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="destinationCity">{t("fDestinationCity")}</Label>
          <Input
            id="destinationCity"
            name="destinationCity"
            maxLength={120}
            defaultValue={rfq?.destinationCity ?? ""}
            placeholder="Nairobi"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="deadline">{t("fDeadline")}</Label>
          <Input
            id="deadline"
            name="deadline"
            type="date"
            defaultValue={rfq?.deadline ? rfq.deadline.slice(0, 10) : undefined}
          />
        </div>
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <SubmitButton
        idle={editing ? t("saveCta") : t("createCta")}
        busy={editing ? t("saving") : t("posting")}
      />
    </form>
  )
}
