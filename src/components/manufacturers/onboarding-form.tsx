"use client"

import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import Image from "next/image"
import { Check, Loader2 } from "lucide-react"
import { useTranslations } from "next-intl"

import {
  saveManufacturerProfileAction,
  type ManufacturerActionState,
} from "@/lib/manufacturers/actions"
import type { ManufacturerProfile } from "@/lib/manufacturers/queries"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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

export function OnboardingForm({
  locale,
  initial,
}: {
  locale: string
  initial: ManufacturerProfile | null
}) {
  const t = useTranslations("seller")
  const [state, formAction] = useActionState<ManufacturerActionState, FormData>(
    saveManufacturerProfileAction,
    {}
  )

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="locale" value={locale} />

      <div className="flex flex-col gap-2">
        <Label htmlFor="companyName">{t("companyName")}</Label>
        <Input
          id="companyName"
          name="companyName"
          type="text"
          required
          minLength={2}
          maxLength={160}
          defaultValue={initial?.companyName ?? ""}
          placeholder={t("companyNamePlaceholder")}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="country">{t("country")}</Label>
          <Input
            id="country"
            name="country"
            type="text"
            maxLength={80}
            defaultValue={initial?.country ?? ""}
            placeholder="China"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="city">{t("city")}</Label>
          <Input
            id="city"
            name="city"
            type="text"
            maxLength={80}
            defaultValue={initial?.city ?? ""}
            placeholder="Shenzhen"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="yearEstablished">{t("yearEstablished")}</Label>
        <Input
          id="yearEstablished"
          name="yearEstablished"
          type="number"
          inputMode="numeric"
          min={1900}
          max={new Date().getFullYear() + 1}
          defaultValue={initial?.yearEstablished ?? ""}
          placeholder="2015"
          className="sm:max-w-40"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="mainCategories">{t("mainCategories")}</Label>
        <Input
          id="mainCategories"
          name="mainCategories"
          type="text"
          defaultValue={initial?.mainCategories.join(", ") ?? ""}
          placeholder={t("mainCategoriesPlaceholder")}
        />
        <p className="text-xs text-muted-foreground">{t("listHint")}</p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="certifications">{t("certifications")}</Label>
        <Input
          id="certifications"
          name="certifications"
          type="text"
          defaultValue={initial?.certifications.join(", ") ?? ""}
          placeholder="CE, RoHS, ISO 9001"
        />
        <p className="text-xs text-muted-foreground">{t("listHint")}</p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="description">{t("description")}</Label>
        <Textarea
          id="description"
          name="description"
          rows={5}
          maxLength={2000}
          defaultValue={initial?.description ?? ""}
          placeholder={t("descriptionPlaceholder")}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="logo">{t("logo")}</Label>
          {initial?.logoUrl ? (
            <div className="relative size-16 overflow-hidden rounded-md border border-border bg-muted">
              <Image
                src={initial.logoUrl}
                alt=""
                fill
                unoptimized
                sizes="64px"
                className="object-cover"
              />
            </div>
          ) : null}
          <Input
            id="logo"
            name="logo"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="h-auto py-2 file:mr-3 file:rounded-md file:bg-secondary file:px-2.5 file:py-1 file:text-secondary-foreground"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="banner">{t("banner")}</Label>
          {initial?.bannerUrl ? (
            <div className="relative aspect-[4/1] w-full overflow-hidden rounded-md border border-border bg-muted">
              <Image
                src={initial.bannerUrl}
                alt=""
                fill
                unoptimized
                sizes="(min-width: 640px) 50vw, 100vw"
                className="object-cover"
              />
            </div>
          ) : null}
          <Input
            id="banner"
            name="banner"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="h-auto py-2 file:mr-3 file:rounded-md file:bg-secondary file:px-2.5 file:py-1 file:text-secondary-foreground"
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{t("brandingHint")}</p>

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
          {t("profileSaved")}
        </p>
      ) : null}

      <SubmitButton
        idle={initial ? t("saveProfile") : t("continueCta")}
        busy={t("saving")}
      />
    </form>
  )
}
