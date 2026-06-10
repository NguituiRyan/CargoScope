"use client"

import { useActionState, useRef, useState } from "react"
import { useFormStatus } from "react-dom"
import { Check, Loader2, Plus, Trash2 } from "lucide-react"
import { useTranslations } from "next-intl"

import {
  saveProductAction,
  type ProductActionState,
} from "@/lib/products/actions"
import { generateProductDescriptionAction } from "@/lib/ai/actions"
import type { CategoryOption, ProductDetail } from "@/lib/products/queries"
import { AiDraftButton } from "@/components/ai-draft-button"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

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
        idle
      )}
    </Button>
  )
}

type TierRow = { key: number; minQty: string; unitPrice: string }
type SpecRow = { key: number; name: string; value: string }

export function ProductForm({
  locale,
  categories,
  initial,
}: {
  locale: string
  categories: CategoryOption[]
  initial: ProductDetail | null
}) {
  const t = useTranslations("product")
  const [state, formAction] = useActionState<ProductActionState, FormData>(
    saveProductAction,
    {}
  )

  const [tiers, setTiers] = useState<TierRow[]>(() =>
    initial && initial.priceTiers.length > 0
      ? initial.priceTiers.map((tier, i) => ({
          key: i,
          minQty: String(tier.minQty),
          unitPrice: tier.unitPrice,
        }))
      : [{ key: 0, minQty: "", unitPrice: "" }]
  )
  const nextKey = useRef(tiers.length)

  const [specs, setSpecs] = useState<SpecRow[]>(() =>
    initial && initial.specs.length > 0
      ? initial.specs.map((s, i) => ({ key: i, name: s.name, value: s.value }))
      : [
          { key: 0, name: "", value: "" },
          { key: 1, name: "", value: "" },
          { key: 2, name: "", value: "" },
        ]
  )
  const nextSpecKey = useRef(specs.length)

  function addTier() {
    setTiers((rows) => [
      ...rows,
      { key: nextKey.current++, minQty: "", unitPrice: "" },
    ])
  }
  function removeTier(key: number) {
    setTiers((rows) => rows.filter((row) => row.key !== key))
  }
  function updateTier(key: number, field: "minQty" | "unitPrice", value: string) {
    setTiers((rows) =>
      rows.map((row) => (row.key === key ? { ...row, [field]: value } : row))
    )
  }

  function addSpec() {
    setSpecs((rows) => [
      ...rows,
      { key: nextSpecKey.current++, name: "", value: "" },
    ])
  }
  function removeSpec(key: number) {
    setSpecs((rows) => rows.filter((row) => row.key !== key))
  }
  function updateSpec(key: number, field: "name" | "value", value: string) {
    setSpecs((rows) =>
      rows.map((row) => (row.key === key ? { ...row, [field]: value } : row))
    )
  }

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="locale" value={locale} />
      {initial ? (
        <input type="hidden" name="productId" value={initial.id} />
      ) : null}

      <div className="flex flex-col gap-2">
        <Label htmlFor="title">{t("title")}</Label>
        <Input
          id="title"
          name="title"
          type="text"
          required
          minLength={3}
          maxLength={160}
          defaultValue={initial?.title ?? ""}
          placeholder={t("titlePlaceholder")}
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="description">{t("description")}</Label>
          <AiDraftButton
            label={t("aiDraft")}
            errorLabel={t("aiDraftError")}
            onGenerate={() =>
              generateProductDescriptionAction({
                title:
                  (document.getElementById("title") as HTMLInputElement | null)
                    ?.value ?? "",
                specs: specs
                  .filter((s) => s.name.trim() && s.value.trim())
                  .map((s) => `${s.name}: ${s.value}`)
                  .join("; "),
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
          defaultValue={initial?.description ?? ""}
          placeholder={t("descriptionPlaceholder")}
        />
      </div>

      {!initial ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor="media">{t("media")}</Label>
          <Input
            id="media"
            name="media"
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
            className="h-auto py-2 file:mr-3 file:rounded-md file:bg-secondary file:px-2.5 file:py-1 file:text-secondary-foreground"
          />
          <p className="text-xs text-muted-foreground">{t("mediaHint")}</p>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="categoryId">{t("category")}</Label>
          <Select
            id="categoryId"
            name="categoryId"
            defaultValue={initial?.categoryId ?? ""}
          >
            <option value="">{t("categoryNone")}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="status">{t("statusLabel")}</Label>
          <Select
            id="status"
            name="status"
            defaultValue={initial?.status ?? "draft"}
          >
            <option value="draft">{t("status.draft")}</option>
            <option value="active">{t("status.active")}</option>
            <option value="paused">{t("status.paused")}</option>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="moq">{t("moq")}</Label>
          <Input
            id="moq"
            name="moq"
            type="number"
            inputMode="numeric"
            min={1}
            defaultValue={initial?.moq ?? ""}
            placeholder="100"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="unit">{t("unit")}</Label>
          <Input
            id="unit"
            name="unit"
            type="text"
            maxLength={24}
            defaultValue={initial?.unit ?? "piece"}
            placeholder={t("unitPlaceholder")}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="leadTimeDays">{t("leadTime")}</Label>
          <Input
            id="leadTimeDays"
            name="leadTimeDays"
            type="number"
            inputMode="numeric"
            min={0}
            max={3650}
            defaultValue={initial?.leadTimeDays ?? ""}
            placeholder="20"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="hsCode">{t("hsCode")}</Label>
          <Input
            id="hsCode"
            name="hsCode"
            type="text"
            maxLength={20}
            defaultValue={initial?.hsCode ?? ""}
            placeholder="8507.60"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="originCountry">{t("originCountry")}</Label>
          <Input
            id="originCountry"
            name="originCountry"
            type="text"
            maxLength={80}
            defaultValue={initial?.originCountry ?? ""}
            placeholder="China"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="certifications">{t("certifications")}</Label>
        <Input
          id="certifications"
          name="certifications"
          type="text"
          defaultValue={initial?.certifications.join(", ") ?? ""}
          placeholder="CE, RoHS, FCC"
        />
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
        <div>
          <p className="text-sm font-medium">{t("specifications")}</p>
          <p className="text-xs text-muted-foreground">
            {t("specificationsHint")}
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex gap-2 text-xs text-muted-foreground">
            <span className="flex-1">{t("specName")}</span>
            <span className="flex-1">{t("specValue")}</span>
            <span className="w-9" aria-hidden />
          </div>
          {specs.map((spec) => (
            <div key={spec.key} className="flex items-center gap-2">
              <Input
                name="specName"
                type="text"
                maxLength={60}
                value={spec.name}
                onChange={(e) => updateSpec(spec.key, "name", e.target.value)}
                placeholder={t("specNamePlaceholder")}
                className="flex-1"
              />
              <Input
                name="specValue"
                type="text"
                maxLength={300}
                value={spec.value}
                onChange={(e) => updateSpec(spec.key, "value", e.target.value)}
                placeholder={t("specValuePlaceholder")}
                className="flex-1"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeSpec(spec.key)}
                aria-label={t("removeSpec")}
              >
                <Trash2 className="size-4" aria-hidden />
              </Button>
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addSpec}
          className="self-start"
        >
          <Plus className="size-4" aria-hidden />
          {t("addSpec")}
        </Button>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            name="customizable"
            defaultChecked={initial?.customizable ?? false}
            className="size-4 accent-primary"
          />
          {t("customizable")}
        </label>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            name="sampleAvailable"
            defaultChecked={initial?.sampleAvailable ?? false}
            className="size-4 accent-primary"
          />
          {t("sampleAvailable")}
        </label>
        <div className="flex flex-col gap-2 sm:max-w-48">
          <Label htmlFor="samplePrice">{t("samplePrice")}</Label>
          <Input
            id="samplePrice"
            name="samplePrice"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            defaultValue={initial?.samplePrice ?? ""}
            placeholder="9.00"
          />
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
        <div>
          <p className="text-sm font-medium">{t("priceTiers")}</p>
          <p className="text-xs text-muted-foreground">{t("priceTiersHint")}</p>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex gap-2 text-xs text-muted-foreground">
            <span className="flex-1">{t("minQty")}</span>
            <span className="flex-1">{t("unitPrice")}</span>
            <span className="w-9" aria-hidden />
          </div>
          {tiers.map((tier) => (
            <div key={tier.key} className="flex items-center gap-2">
              <Input
                name="tierMinQty"
                type="number"
                inputMode="numeric"
                min={1}
                value={tier.minQty}
                onChange={(e) => updateTier(tier.key, "minQty", e.target.value)}
                placeholder="100"
                className="flex-1"
              />
              <Input
                name="tierUnitPrice"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={tier.unitPrice}
                onChange={(e) =>
                  updateTier(tier.key, "unitPrice", e.target.value)
                }
                placeholder="8.50"
                className="flex-1"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeTier(tier.key)}
                aria-label={t("removeTier")}
              >
                <Trash2 className="size-4" aria-hidden />
              </Button>
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addTier}
          className="self-start"
        >
          <Plus className="size-4" aria-hidden />
          {t("addTier")}
        </Button>
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
          {t("saved")}
        </p>
      ) : null}

      <SubmitButton
        idle={initial ? t("save") : t("createCta")}
        busy={t("saving")}
      />
    </form>
  )
}
