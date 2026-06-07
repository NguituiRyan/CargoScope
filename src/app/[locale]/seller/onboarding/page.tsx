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
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
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
      <CardContent>
        <OnboardingForm
          locale={locale}
          initial={manufacturer}
          contacts={contacts}
        />
      </CardContent>
    </Card>
  )
}
