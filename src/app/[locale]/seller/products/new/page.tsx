import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { getTranslations, setRequestLocale } from "next-intl/server"

import { ProductForm } from "@/components/products/product-form"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { localePath } from "@/lib/auth/session"
import { getMyManufacturer } from "@/lib/manufacturers/queries"
import { getCategoryOptions } from "@/lib/products/queries"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("product")
  return { title: t("newTitle") }
}

export default async function NewProductPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  const manufacturer = await getMyManufacturer()
  if (!manufacturer) redirect(localePath(locale, "/seller/onboarding"))

  const t = await getTranslations("product")
  const categories = await getCategoryOptions()

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("newTitle")}</CardTitle>
        <CardDescription>{t("newSubtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        <ProductForm locale={locale} categories={categories} initial={null} />
      </CardContent>
    </Card>
  )
}
