import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"

import { OnboardingForm } from "@/components/manufacturers/onboarding-form"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  getManufacturerContacts,
  getMyManufacturer,
} from "@/lib/manufacturers/queries"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("seller")
  return { title: t("onboardingTitle") }
}

export default async function OnboardingPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ welcome?: string }>
}) {
  const { locale } = await params
  const { welcome } = await searchParams
  setRequestLocale(locale)

  const t = await getTranslations("seller")
  const manufacturer = await getMyManufacturer()
  const contacts = manufacturer
    ? await getManufacturerContacts(manufacturer.id)
    : null

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("onboardingTitle")}</CardTitle>
        <CardDescription>{t("onboardingSubtitle")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {welcome ? (
          <div className="rounded-lg border border-verified/40 bg-verified/10 px-4 py-3 text-sm font-medium text-verified-foreground">
            {t("welcomeNew")}
          </div>
        ) : null}
        <OnboardingForm
          locale={locale}
          initial={manufacturer}
          contacts={contacts}
        />
      </CardContent>
    </Card>
  )
}
